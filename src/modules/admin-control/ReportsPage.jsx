import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapPin, Calendar, Clock, FileSpreadsheet, FileText, Filter, 
  Camera, User, HardHat, UserCog, Loader2, Search, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  BarChart3, TrendingUp, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFull from '../../assets/images/logo-lk-full.png';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import StatusModal from '../../components/common/StatusModal';

const ReportsPage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [activeTab, setActiveTab] = useState('workers'); 
  const [loading, setLoading] = useState(true);

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; 

  // --- Filtros de Fecha ---
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    const date = new Date(d.setDate(diff));
    return date.toISOString().split('T')[0];
  };

  const getEndOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; 
    const date = new Date(d.setDate(diff));
    return date.toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({
    start: getStartOfWeek(),
    end: getEndOfWeek()
  });

  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });

  // --- Carga Inicial de Proyectos ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await supabase.from('projects').select('name');
        if (data) setProjects(data.map(p => p.name));
      } catch (error) { console.error("Error proyectos:", error); }
    };
    fetchProjects();
  }, []);

  // --- Cargar Asistencia ---
  const fetchAttendance = async () => {
    setLoading(true);
    setCurrentPage(1);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          workers ( id, full_name, category, document_number, start_date ),
          employees ( id, full_name, position, document_number, entry_date ),
          profiles ( id, full_name, role )
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
        .order('check_in_time', { ascending: true });

      if (selectedProject !== 'Todos') {
        query = query.eq('project_name', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAttendanceData(data || []);

    } catch (error) {
      console.error('Error reportes:', error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron cargar los registros.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedProject, dateRange]);

  // --- HELPER: Datos Usuario ---
  const getUserData = (item) => {
    if (item.workers) return { id: item.workers.id, name: item.workers.full_name, role: item.workers.category, doc: item.workers.document_number, date: item.workers.start_date, type: 'worker' };
    if (item.employees) return { id: item.employees.id, name: item.employees.full_name, role: item.employees.position, doc: item.employees.document_number, date: item.employees.entry_date, type: 'staff' };
    if (item.profiles) return { id: item.profiles.id, name: item.profiles.full_name, role: item.profiles.role || 'Admin', doc: '-', date: null, type: 'staff' };
    return { id: 'N/A', name: 'Desconocido', role: '-', doc: '-', date: null, type: 'unknown' };
  };

  // --- FILTRO Y PROCESAMIENTO DE DATOS ---
  const filteredData = useMemo(() => {
    return attendanceData.filter(item => {
      const user = getUserData(item);
      if (activeTab === 'workers') return user.type === 'worker';
      if (activeTab === 'staff') return user.type === 'staff';
      return false;
    });
  }, [attendanceData, activeTab]);

  // --- DATOS PARA EL GRÁFICO (CSS PURO) ---
  const chartData = useMemo(() => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const counts = { 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0 };
    
    filteredData.forEach(item => {
        const datePart = item.date.split('-');
        const date = new Date(datePart[0], datePart[1] - 1, datePart[2]);
        let dayIndex = date.getDay(); 
        let adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
        const dayName = days[adjustedIndex];
        if (counts[dayName] !== undefined) counts[dayName]++;
    });

    const maxVal = Math.max(...Object.values(counts));

    return Object.keys(counts).map(day => ({
        name: day.substring(0, 3), 
        fullName: day,
        asistencias: counts[day],
        heightPct: maxVal > 0 ? (counts[day] / maxVal) * 100 : 0
    }));
  }, [filteredData]);

  // --- KPIS ---
  const totalAttendance = filteredData.length;
  const uniquePersonnel = new Set(filteredData.map(item => getUserData(item).id)).size;
  const avgDaily = chartData.length > 0 ? Math.round(totalAttendance / 6) : 0; 

  // --- LÓGICA DE PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getMapLink = (loc) => (!loc || loc.includes('Panel')) ? '#' : `https://www.google.com/maps/search/?api=1&query=${loc}`;

  // =========================================================
  //  LÓGICA ORIGINAL DE EXPORTACIÓN EXCEL (SENATI)
  // =========================================================
  const calculateTareoValues = (checkOutTime) => {
    if (!checkOutTime) return { n: 1, he60: 0, he100: 0 }; 
    const exitDate = new Date(checkOutTime);
    const limitDate = new Date(exitDate);
    limitDate.setHours(17, 30, 0, 0);
    const graceLimit = new Date(limitDate);
    graceLimit.setMinutes(45);

    if (exitDate < graceLimit) return { n: 1, he60: 0, he100: 0 };

    const diffMs = exitDate - limitDate;
    const extraHours = Math.floor(diffMs / (1000 * 60 * 60));
    let val60 = 0, val100 = 0;

    if (extraHours > 0) {
        val60 = Math.min(extraHours, 2);
        if (extraHours > 2) val100 = extraHours - 2;
    }
    return { n: 1, he60: val60, he100: val100 };
  };

  const generateWeeklyTareo = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tareo Semanal');

        const daysInRange = [];
        let currDate = new Date(dateRange.start);
        currDate.setMinutes(currDate.getMinutes() + currDate.getTimezoneOffset());
        
        for (let i = 0; i < 7; i++) {
            daysInRange.push(new Date(currDate));
            currDate.setDate(currDate.getDate() + 1);
        }

        const borderAll = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const alignCenter = { vertical: 'middle', horizontal: 'center' };
        const fontTitle = { name: 'Arial', size: 14, bold: true, underline: true };
        const fontHeader = { name: 'Arial', size: 8, bold: true };
        const fontData = { name: 'Arial', size: 8 };
        const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
        const fillSunday = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; 
        const fillNormal = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };

        worksheet.mergeCells('A1:AA1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `TAREO SEMANAL PERSONAL ${activeTab === 'workers' ? 'OBRERO' : 'STAFF'}`;
        titleCell.font = fontTitle;
        titleCell.alignment = alignCenter;

        worksheet.getCell('B3').value = 'CC:';
        worksheet.getCell('C3').value = 'PC - 25033'; 
        worksheet.getCell('Q3').value = 'RESPONSABLE:';
        worksheet.getCell('T3').value = 'ADMINISTRACIÓN DE OBRA';
        worksheet.getCell('B5').value = 'OBRA:';
        worksheet.getCell('C5').value = selectedProject.toUpperCase();
        worksheet.getCell('B7').value = 'PERIODO:';
        worksheet.getCell('C7').value = `DEL ${daysInRange[0].toLocaleDateString()} AL ${daysInRange[6].toLocaleDateString()}`;
        ['B3','Q3','B5','B7'].forEach(c => worksheet.getCell(c).font = fontHeader);

        const startRow = 9;
        const fixedHeaders = [
            { col: 'A', label: 'ITEM', width: 5 },
            { col: 'B', label: 'DNI', width: 12 },
            { col: 'C', label: 'APELLIDOS Y NOMBRES', width: 40 },
            { col: 'D', label: 'CATEGORIA', width: 15 },
            { col: 'E', label: 'FECHA ING.', width: 12 },
        ];

        fixedHeaders.forEach(h => {
            worksheet.mergeCells(`${h.col}${startRow}:${h.col}${startRow+2}`);
            const cell = worksheet.getCell(`${h.col}${startRow}`);
            cell.value = h.label;
            cell.alignment = alignCenter;
            cell.font = fontHeader;
            cell.border = borderAll;
            cell.fill = fillHeader;
            worksheet.getColumn(h.col).width = h.width;
        });

        let colIdx = 6; 
        daysInRange.forEach(date => {
            const dateStr = date.toLocaleDateString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const dayName = date.toLocaleDateString('es-PE', { weekday: 'long' });
            
            const c1 = worksheet.getColumn(colIdx).letter;
            const c3 = worksheet.getColumn(colIdx+2).letter;
            worksheet.mergeCells(`${c1}${startRow}:${c3}${startRow}`);
            
            const cellDate = worksheet.getCell(`${c1}${startRow}`);
            cellDate.value = dateStr;
            cellDate.alignment = alignCenter;
            cellDate.font = fontHeader;
            cellDate.border = borderAll;
            
            worksheet.mergeCells(`${c1}${startRow+1}:${c3}${startRow+1}`);
            const cellDay = worksheet.getCell(`${c1}${startRow+1}`);
            cellDay.value = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            cellDay.alignment = alignCenter;
            cellDay.font = fontHeader;
            cellDay.border = borderAll;

            if (date.getDay() === 0) {
                cellDate.fill = fillSunday;
                cellDay.fill = fillSunday;
            } else {
                cellDate.fill = fillHeader;
                cellDay.fill = fillHeader;
            }

            const subCols = ['N', '0.6', '1'];
            subCols.forEach((sub, k) => {
                const cellSub = worksheet.getCell(startRow + 2, colIdx + k);
                cellSub.value = sub;
                cellSub.alignment = alignCenter;
                cellSub.font = { name: 'Arial', size: 7, bold: true };
                cellSub.border = borderAll;
                cellSub.fill = (date.getDay() === 0) ? fillSunday : fillNormal;
                worksheet.getColumn(colIdx + k).width = 4;
            });
            colIdx += 3;
        });

        const totalStartCol = colIdx;
        const totalColLetter = worksheet.getColumn(totalStartCol).letter;
        const totalEndColLetter = worksheet.getColumn(totalStartCol + 2).letter;

        worksheet.mergeCells(`${totalColLetter}${startRow}:${totalEndColLetter}${startRow+1}`);
        const cellTotal = worksheet.getCell(`${totalColLetter}${startRow}`);
        cellTotal.value = 'TOTAL';
        cellTotal.fill = fillHeader;
        cellTotal.border = borderAll;
        cellTotal.alignment = alignCenter;
        cellTotal.font = fontHeader;

        const totalSubCols = ['N', '0.6', '1'];
        totalSubCols.forEach((sub, k) => {
            const cellSub = worksheet.getCell(startRow + 2, totalStartCol + k);
            cellSub.value = sub;
            cellSub.alignment = alignCenter;
            cellSub.font = { name: 'Arial', size: 7, bold: true };
            cellSub.border = borderAll;
            cellSub.fill = fillHeader;
            worksheet.getColumn(totalStartCol + k).width = 5;
        });

        const obsCol = worksheet.getColumn(totalStartCol + 3).letter;
        worksheet.mergeCells(`${obsCol}${startRow}:${obsCol}${startRow+2}`);
        const cellObs = worksheet.getCell(`${obsCol}${startRow}`);
        cellObs.value = 'OBSERVACION';
        cellObs.fill = fillHeader;
        cellObs.border = borderAll;
        cellObs.alignment = alignCenter;
        cellObs.font = fontHeader;
        worksheet.getColumn(totalStartCol + 3).width = 25;

        const uniqueUsersMap = new Map();
        filteredData.forEach(item => {
            const u = getUserData(item);
            if (!uniqueUsersMap.has(u.id)) uniqueUsersMap.set(u.id, u);
        });
        
        let usersToPrint = Array.from(uniqueUsersMap.values());
        if (usersToPrint.length === 0) {
             const table = activeTab === 'staff' ? 'employees' : 'workers';
             const { data: allUsers } = await supabase.from(table).select('*').eq('status', 'Activo');
             if(allUsers) {
                 usersToPrint = allUsers.map(u => ({
                     id: u.id,
                     name: u.full_name,
                     role: u.category || u.position,
                     doc: u.document_number,
                     date: u.start_date || u.entry_date
                 }));
             }
        }

        let currentRow = startRow + 3;

        usersToPrint.forEach((user, idx) => {
            worksheet.getCell(`A${currentRow}`).value = idx + 1;
            worksheet.getCell(`B${currentRow}`).value = user.doc;
            worksheet.getCell(`C${currentRow}`).value = user.name;
            worksheet.getCell(`D${currentRow}`).value = user.role;
            worksheet.getCell(`E${currentRow}`).value = user.date ? new Date(user.date).toLocaleDateString() : '-';

            ['A','B','C','D','E'].forEach(c => {
                const cell = worksheet.getCell(`${c}${currentRow}`);
                cell.border = borderAll;
                cell.font = fontData;
                cell.alignment = { vertical: 'middle', horizontal: c === 'C' ? 'left' : 'center' };
            });

            let currentDayCol = 6; 
            let sumN = 0;
            let sum60 = 0;
            let sum100 = 0;

            daysInRange.forEach(day => {
                const dateStr = day.toISOString().split('T')[0];
                const record = attendanceData.find(a => {
                    const au = getUserData(a);
                    return au.id === user.id && a.date === dateStr;
                });

                let nVal = '', he60 = '', he100 = '';
                if (record) {
                    const calc = calculateTareoValues(record.check_out_time);
                    nVal = calc.n;
                    he60 = calc.he60 > 0 ? calc.he60 : '';
                    he100 = calc.he100 > 0 ? calc.he100 : '';
                    sumN += calc.n;
                    sum60 += calc.he60;
                    sum100 += calc.he100;
                }

                const cellN = worksheet.getCell(currentRow, currentDayCol);
                const cell60 = worksheet.getCell(currentRow, currentDayCol + 1);
                const cell100 = worksheet.getCell(currentRow, currentDayCol + 2);

                cellN.value = nVal;
                cell60.value = he60;
                cell100.value = he100;

                [cellN, cell60, cell100].forEach(cell => {
                    cell.border = borderAll;
                    cell.alignment = alignCenter;
                    cell.font = fontData;
                    if (day.getDay() === 0) cell.fill = fillSunday;
                });

                currentDayCol += 3;
            });

            const cellSumN = worksheet.getCell(currentRow, totalStartCol);
            const cellSum60 = worksheet.getCell(currentRow, totalStartCol + 1);
            const cellSum100 = worksheet.getCell(currentRow, totalStartCol + 2);

            cellSumN.value = sumN > 0 ? sumN : '';
            cellSum60.value = sum60 > 0 ? sum60 : '';
            cellSum100.value = sum100 > 0 ? sum100 : '';

            [cellSumN, cellSum60, cellSum100].forEach(cell => {
                cell.border = borderAll;
                cell.alignment = alignCenter;
                cell.font = { ...fontData, bold: true };
            });

            const obsCell = worksheet.getCell(currentRow, totalStartCol + 3);
            obsCell.value = '';
            obsCell.border = borderAll;

            currentRow++;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Tareo_${activeTab.toUpperCase()}_${dateRange.start}.xlsx`);
        
    } catch (error) {
        setNotification({ isOpen: true, type: 'error', title: 'Error Excel', message: 'No se pudo generar el tareo.' });
    }
  };

  // =========================================================
  //  LÓGICA ORIGINAL EXPORTACIÓN PDF
  // =========================================================
  const exportToPDF = () => {
    try {
        const doc = new jsPDF('l', 'mm', 'a4');
        const img = new Image();
        img.src = logoFull;
        
        img.onload = () => {
            const daysInRange = [];
            let currDate = new Date(dateRange.start);
            currDate.setMinutes(currDate.getMinutes() + currDate.getTimezoneOffset());
            const lastDate = new Date(dateRange.end);
            lastDate.setMinutes(lastDate.getMinutes() + lastDate.getTimezoneOffset());

            while (currDate <= lastDate) {
                daysInRange.push(new Date(currDate));
                currDate.setDate(currDate.getDate() + 1);
            }

            daysInRange.forEach((day, index) => {
                if (index > 0) doc.addPage();

                doc.addImage(img, 'PNG', 14, 10, 35, 12);
                doc.setFontSize(14);
                doc.setTextColor(0, 51, 102);
                
                const dateStr = day.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                
                doc.text(`ASISTENCIA DIARIA - ${activeTab === 'workers' ? 'OBREROS' : 'STAFF'}`, 280, 18, { align: 'right' });
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Fecha: ${dateStr.toUpperCase()}`, 280, 24, { align: 'right' });
                doc.text(`Proyecto: ${selectedProject}`, 280, 28, { align: 'right' });

                const dayIso = day.toISOString().split('T')[0];
                const dayRecords = filteredData.filter(item => item.date === dayIso);

                if (dayRecords.length === 0) {
                    doc.setFontSize(12);
                    doc.setTextColor(150);
                    doc.text("No se registraron asistencias en este día.", 148, 50, { align: 'center' });
                } else {
                    const tableColumn = ["PERSONAL", "CARGO", "ENTRADA", "SALIDA", "UBICACIÓN"];
                    const tableRows = dayRecords.map((item) => {
                        const user = getUserData(item);
                        return [
                            user.name.toUpperCase(),
                            user.role,
                            item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
                            item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'En turno',
                            item.check_in_location?.includes('Panel') ? 'Web' : 'GPS'
                        ];
                    });

                    autoTable(doc, {
                        head: [tableColumn],
                        body: tableRows,
                        startY: 35,
                        theme: 'striped',
                        styles: { fontSize: 9, cellPadding: 3 },
                        headStyles: { fillColor: [0, 51, 102] }
                    });
                }
            });

            doc.save(`Reporte_Diario_${activeTab}_${dateRange.start}.pdf`);
        };
    } catch (error) {
        setNotification({ isOpen: true, type: 'error', title: 'Error PDF', message: 'Error generando PDF.' });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER + CONTROLES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="text-[#003366]"/> Reportes de Asistencia
          </h2>
          <p className="text-slate-500 text-sm">Control visual y detallado de personal.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            {/* TABS */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => { setActiveTab('workers'); setCurrentPage(1); }} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'workers' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    <HardHat size={18}/> Obreros
                </button>
                <button onClick={() => { setActiveTab('staff'); setCurrentPage(1); }} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'staff' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                    <UserCog size={18}/> Staff
                </button>
            </div>

            {/* FILTROS */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                <div className="relative"><input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="pl-2 pr-1 py-2 bg-transparent text-sm font-medium text-slate-700 focus:outline-none w-28" /></div>
                <span className="text-slate-300">|</span>
                <div className="relative"><input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="pl-1 pr-2 py-2 bg-transparent text-sm font-medium text-slate-700 focus:outline-none w-28" /></div>
                <button onClick={fetchAttendance} className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 text-[#003366]"><Search size={16}/></button>
            </div>

            <div className="relative group flex-1 sm:flex-none">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors">
                    <option value="Todos">Todas las Obras</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* --- SECCIÓN VISUAL (KPIS + GRÁFICO CSS PURO) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPI CARDS */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Total Asistencias</p>
                      <h3 className="text-2xl font-bold text-slate-800">{totalAttendance}</h3>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24}/></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Personal Único</p>
                      <h3 className="text-2xl font-bold text-slate-800">{uniquePersonnel}</h3>
                  </div>
                  <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><UserCog size={24}/></div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                  <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Promedio Diario</p>
                      <h3 className="text-2xl font-bold text-slate-800">~{avgDaily}</h3>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={24}/></div>
              </div>
          </div>

          {/* GRÁFICO DE BARRAS (SIN RECHARTS) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[280px] flex flex-col">
              <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#003366]"/> Asistencia por Día de la Semana
              </h3>
              <div className="flex-1 flex items-end justify-between gap-2 px-2">
                  {chartData.map((data, index) => (
                      <div key={index} className="flex flex-col items-center justify-end w-full h-full group relative">
                          <div 
                            className="w-full max-w-[50px] bg-[#003366] rounded-t-md transition-all duration-500 hover:bg-[#0ea5e9] relative"
                            style={{ height: `${data.heightPct}%` }}
                          >
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-bold">
                                {data.asistencias} Asistencias
                             </div>
                          </div>
                          <span className="text-[10px] sm:text-xs font-medium text-slate-500 mt-2">{data.name}</span>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* --- BOTONES EXPORTAR --- */}
      <div className="flex justify-end gap-3 mt-4">
          <button onClick={generateWeeklyTareo} className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-sm flex items-center gap-2 font-bold text-sm">
              <FileSpreadsheet size={18} /> Exportar Excel
          </button>
          <button onClick={exportToPDF} className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-sm flex items-center gap-2 font-bold text-sm">
              <FileText size={18} /> Exportar PDF
          </button>
      </div>

      {/* TABLA PRINCIPAL CON PAGINACIÓN CENTRADA */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 gap-3">
             <Loader2 className="animate-spin text-[#003366]" size={36}/> <p className="font-bold">Cargando registros...</p>
          </div>
        ) : filteredData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 gap-4">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><Calendar size={32} className="opacity-40" /></div>
               <div className="text-center"><h3 className="font-bold text-slate-700">Sin registros</h3><p className="text-sm">No hay asistencia registrada.</p></div>
            </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Personal</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Ubicación / Obra</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Entrada</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Salida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode='wait'>
                        {currentItems.map((item, idx) => {
                          const user = getUserData(item);
                          return (
                            <motion.tr 
                                key={item.id} 
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} 
                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                className="hover:bg-slate-50/50 transition text-sm"
                            >
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${user.type === 'staff' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}><User size={16}/></div>
                                    <div>
                                        <div className="font-bold text-slate-700">{user.name}</div>
                                        <div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${user.type === 'staff' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{user.type === 'staff' ? 'STAFF' : 'OBRERO'}</span><span className="text-xs text-slate-400">{user.role}</span></div>
                                    </div>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-bold text-[#003366]">{item.project_name || <span className="text-slate-300 italic">No registrado</span>}</td>
                              <td className="p-4 text-slate-600 font-medium"><div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/>{new Date(item.date).toLocaleDateString()}</div></td>
                              <td className="p-4 text-center">
                                {item.check_in_time ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-100"><Clock size={12}/> {new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <div className="flex gap-2">
                                      {item.check_in_photo && <a href={item.check_in_photo} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded hover:text-blue-600"><Camera size={14} /></a>}
                                      {item.check_in_location && !item.check_in_location.includes('Panel') && <a href={getMapLink(item.check_in_location)} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded hover:text-blue-600"><MapPin size={14} /></a>}
                                    </div>
                                  </div>
                                ) : '-'}
                              </td>
                              <td className="p-4 text-center">
                                {item.check_out_time ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100"><Clock size={12}/> {new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <div className="flex gap-2">
                                      {item.check_out_photo && <a href={item.check_out_photo} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded hover:text-blue-600"><Camera size={14} /></a>}
                                      {item.check_out_location && !item.check_out_location.includes('Panel') && <a href={getMapLink(item.check_out_location)} target="_blank" rel="noreferrer" className="p-1.5 bg-slate-100 rounded hover:text-blue-600"><MapPin size={14} /></a>}
                                    </div>
                                  </div>
                                ) : <span className="text-slate-300 italic text-xs">En turno</span>}
                              </td>
                            </motion.tr>
                          );
                        })}
                    </AnimatePresence>
                  </tbody>
                </table>
            </div>

            {/* --- COMPONENTE DE PAGINACIÓN CENTRADA --- */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 relative flex flex-col md:flex-row justify-center items-center gap-4">
                    <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium order-2 md:order-1">
                        Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} de {filteredData.length}
                    </div>
                    
                    <div className="flex items-center gap-1 order-1 md:order-2 z-10 bg-white/50 p-1 rounded-xl border border-slate-100 shadow-sm">
                        <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronsLeft size={18}/></button>
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronLeft size={18}/></button>
                        
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                .map((page, i, arr) => (
                                    <React.Fragment key={page}>
                                        {i > 0 && arr[i - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                        <button onClick={() => goToPage(page)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-[#003366] text-white shadow-md scale-110' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}>
                                            {page}
                                        </button>
                                    </React.Fragment>
                                ))
                            }
                        </div>

                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronRight size={18}/></button>
                        <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronsRight size={18}/></button>
                    </div>
                </div>
            )}
          </>
        )}
      </div>

      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} type={notification.type} title={notification.title} message={notification.message} />
    </div>
  );
};

export default ReportsPage;