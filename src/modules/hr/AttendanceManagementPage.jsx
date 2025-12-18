import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardCheck, Search, Calendar, 
  Clock, HardHat, UserCog, Filter, MapPin, FileSpreadsheet 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import StatusModal from '../../components/common/StatusModal';

// Librerías para Excel
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AttendanceManagementPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [rawData, setRawData] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // --- Fechas: Semana Actual por Defecto ---
  const getStartOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunes
    const date = new Date(d.setDate(diff));
    return date.toISOString().split('T')[0];
  };

  const getEndOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // Domingo
    const date = new Date(d.setDate(diff));
    return date.toISOString().split('T')[0];
  };

  const [dateRange, setDateRange] = useState({
    start: getStartOfWeek(),
    end: getEndOfWeek()
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // 1. Cargar Datos
  useEffect(() => {
    fetchAttendanceRange();
  }, [dateRange, activeTab]);

  const fetchAttendanceRange = async () => {
    setLoading(true);
    setRawData([]); 
    try {
      let query;

      if (activeTab === 'workers') {
        query = supabase
          .from('attendance')
          .select(`
            *,
            workers!inner (id, full_name, document_number, category, start_date)
          `)
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .not('worker_id', 'is', null); 
      } else {
        query = supabase
          .from('attendance')
          .select(`
            *,
            employees!inner (id, full_name, document_number, position, entry_date)
          `)
          .gte('date', dateRange.start)
          .lte('date', dateRange.end)
          .not('employee_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRawData(data || []);

    } catch (error) {
      console.error("Error:", error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Cálculo de Horas (Regla: > 17:30 PM = Extra)
  const calculateDailyHours = (checkIn, checkOut) => {
    if (!checkOut) return { worked: 0, he60: 0, he100: 0 };

    const exitDate = new Date(checkOut);
    const limitDate = new Date(exitDate);
    limitDate.setHours(17, 30, 0, 0); 
    
    const entryDate = new Date(checkIn);
    const diffTotalMs = exitDate - entryDate;
    const hoursWorked = Math.max(0, (diffTotalMs / (1000 * 60 * 60)).toFixed(1));

    let val60 = 0;
    let val100 = 0;

    if (exitDate > limitDate) {
        const diffMs = exitDate - limitDate;
        const extraHours = Math.floor(diffMs / (1000 * 60 * 60)); 
        if (extraHours > 0) {
            val60 = Math.min(extraHours, 2); 
            const remainder = extraHours - 2;
            if (remainder > 0) val100 = remainder; 
        }
    }
    return { worked: parseFloat(hoursWorked), he60: val60, he100: val100 };
  };

  // 3. Agrupación de Datos para la Vista
  const aggregatedData = useMemo(() => {
    const grouped = {};

    rawData.forEach(record => {
      const person = activeTab === 'workers' ? record.workers : record.employees;
      if (!person) return;
      const personId = person.id;

      if (!grouped[personId]) {
        grouped[personId] = {
          id: personId,
          full_name: person.full_name,
          doc_number: person.document_number,
          role: activeTab === 'workers' ? person.category : person.position,
          start_date: activeTab === 'workers' ? person.start_date : person.entry_date,
          project: record.project_name || 'Sin asignar',
          worked_dates: new Set(),
          total_hours: 0,
          total_he60: 0,
          total_he100: 0,
          status_counts: { Presente: 0, Falta: 0, Tardanza: 0 },
          daily_records: {} 
        };
      }

      const statusNormalizado = record.status ? record.status.trim() : '';
      const tieneEntrada = !!record.check_in_time;
      
      if (tieneEntrada || statusNormalizado === 'Presente' || statusNormalizado === 'Tardanza') {
         grouped[personId].worked_dates.add(record.date);
      }

      if (grouped[personId].status_counts[statusNormalizado] !== undefined) {
         grouped[personId].status_counts[statusNormalizado]++;
      } else {
         if (!tieneEntrada) grouped[personId].status_counts.Falta++; 
      }

      const { worked, he60, he100 } = calculateDailyHours(record.check_in_time, record.check_out_time);
      grouped[personId].total_hours += worked;
      grouped[personId].total_he60 += he60;
      grouped[personId].total_he100 += he100;

      // Guardar horas por fecha para el Excel (YYYY-MM-DD)
      grouped[personId].daily_records[record.date] = { 
          n: 1.0, // Marcamos 1.0 como asistencia en columna N
          he60, 
          he100 
      }; 
    });

    return Object.values(grouped).filter(item => 
      item.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawData, activeTab, searchTerm]);


  // =========================================================
  //  EXPORTAR A EXCEL - FORMATO IDÉNTICO (REPLICA EXACTA)
  // =========================================================
  const exportToTareoExcel = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tareo Semanal');

        // --- 1. DEFINICIÓN DE ESTILOS EXACTOS ---
        const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; // Azul Claro
        const fillSunday = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }; // Rojo Claro
        const borderThin = { style: 'thin', color: { argb: 'FF000000' } };
        const bordersAll = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        
        const fontTitle = { name: 'Arial', size: 14, bold: true, underline: true };
        const fontLabel = { name: 'Arial', size: 10, bold: true };
        const fontHeaderTable = { name: 'Arial', size: 8, bold: true };
        const fontBody = { name: 'Arial', size: 8 };

        // --- 2. CONFIGURACIÓN DE COLUMNAS (Anchos) ---
        // A(Item), B(DNI), C(Nombres), D(Cat), E(Fecha)
        // F-H(Lun), I-K(Mar), L-N(Mie), O-Q(Jue), R-T(Vie), U-W(Sab), X-Z(Dom)
        // AA-AC(Total), AD(Obs)
        worksheet.getColumn('A').width = 5;  // ITEM
        worksheet.getColumn('B').width = 11; // DNI
        worksheet.getColumn('C').width = 40; // NOMBRES
        worksheet.getColumn('D').width = 12; // CATEGORIA
        worksheet.getColumn('E').width = 12; // FECHA
        
        // Columnas de días (ancho 4)
        for(let c=6; c<=30; c++) { 
            worksheet.getColumn(c).width = 4.5; 
        }
        worksheet.getColumn(30).width = 25; // Obs (Col AD)

        // --- 3. ENCABEZADO SUPERIOR (Filas 1-8) ---
        worksheet.mergeCells('A1:AD1');
        const title = worksheet.getCell('A1');
        title.value = `TAREO SEMANAL PERSONAL ${activeTab === 'workers' ? 'OBRERO' : 'STAFF'}`;
        title.font = fontTitle;
        title.alignment = { horizontal: 'center', vertical: 'middle' };

        // Etiquetas Generales
        const setLabel = (cell, val) => {
            const c = worksheet.getCell(cell);
            c.value = val;
            c.font = fontLabel;
        };
        const setValue = (cell, val) => {
            const c = worksheet.getCell(cell);
            c.value = val;
            c.font = { name: 'Arial', size: 10 };
        };

        // Fila 3
        setLabel('B3', 'CC:');
        setValue('C3', 'PC - GENERAL'); 
        setLabel('Q3', 'RESPONSABLE:');
        setValue('T3', 'ADMINISTRACIÓN');

        // Fila 5
        setLabel('B5', 'OBRA:');
        setValue('C5', aggregatedData[0]?.project?.toUpperCase() || 'GENERAL');

        // Fila 7
        setLabel('B7', 'PERIODO:');
        const dStart = new Date(dateRange.start);
        const dEnd = new Date(dateRange.end);
        // Ajuste zona horaria visual
        dStart.setMinutes(dStart.getMinutes() + dStart.getTimezoneOffset());
        dEnd.setMinutes(dEnd.getMinutes() + dEnd.getTimezoneOffset());
        
        setValue('C7', `SEM ${getWeekNumber(dStart)} DEL ${formatDateShort(dStart)} AL ${formatDateShort(dEnd)} DE ${getMonthName(dStart)} DEL ${dStart.getFullYear()}`);

        // --- 4. CABECERA DE TABLA (Filas 9, 10, 11) ---
        const rHeader = 9;
        
        // Cabeceras Fijas (Combina 3 filas: 9, 10, 11)
        const headersFixed = [
            { c: 'A', t: 'ITEM' }, { c: 'B', t: 'DNI' }, { c: 'C', t: 'APELLIDOS Y NOMBRES' },
            { c: 'D', t: 'CATEGORIA' }, { c: 'E', t: 'FECHA DE INGRESO' }
        ];

        headersFixed.forEach(h => {
            worksheet.mergeCells(`${h.c}${rHeader}:${h.c}${rHeader+2}`);
            const cell = worksheet.getCell(`${h.c}${rHeader}`);
            cell.value = h.t;
            cell.fill = fillHeader;
            cell.border = bordersAll;
            cell.font = fontHeaderTable;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });

        // Días de la Semana
        const weekDays = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
        let colIdx = 6; // Columna F es index 6

        // Generar arreglo de fechas
        let currDate = new Date(dStart);
        const datesOfWeek = [];
        for(let i=0; i<7; i++) {
            datesOfWeek.push(new Date(currDate));
            currDate.setDate(currDate.getDate() + 1);
        }

        datesOfWeek.forEach((d, i) => {
            const isSunday = i === 6;
            const bg = isSunday ? fillSunday : fillHeader;

            // Fila 9: Fecha (Combina 3 celdas)
            const cStart = worksheet.getColumn(colIdx).letter;
            const cEnd = worksheet.getColumn(colIdx+2).letter;
            
            worksheet.mergeCells(`${cStart}${rHeader}:${cEnd}${rHeader}`);
            const cellDate = worksheet.getCell(`${cStart}${rHeader}`);
            cellDate.value = d; // Excel date object
            cellDate.numFmt = 'dd/mm';
            cellDate.fill = bg;
            cellDate.border = bordersAll;
            cellDate.font = fontHeaderTable;
            cellDate.alignment = { horizontal: 'center', vertical: 'middle' };

            // Fila 10: Nombre Día (Combina 3 celdas)
            worksheet.mergeCells(`${cStart}${rHeader+1}:${cEnd}${rHeader+1}`);
            const cellDay = worksheet.getCell(`${cStart}${rHeader+1}`);
            cellDay.value = weekDays[i];
            cellDay.fill = bg;
            cellDay.border = bordersAll;
            cellDay.font = fontHeaderTable;
            cellDay.alignment = { horizontal: 'center', vertical: 'middle' };

            // Fila 11: Sub-headers (N, 0.6, 1.0)
            ['N', '0.6', '1.0'].forEach((sub, k) => {
                const cellSub = worksheet.getCell(rHeader+2, colIdx+k);
                cellSub.value = sub;
                cellSub.fill = bg;
                cellSub.border = bordersAll;
                cellSub.font = { ...fontHeaderTable, size: 7 };
                cellSub.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            colIdx += 3;
        });

        // Columna TOTAL (AA, AB, AC)
        const colTotal = 27; // AA
        const ctStart = worksheet.getColumn(colTotal).letter;
        const ctEnd = worksheet.getColumn(colTotal+2).letter;

        worksheet.mergeCells(`${ctStart}${rHeader}:${ctEnd}${rHeader+1}`);
        const cellTotal = worksheet.getCell(`${ctStart}${rHeader}`);
        cellTotal.value = 'TOTAL';
        cellTotal.fill = fillHeader;
        cellTotal.border = bordersAll;
        cellTotal.font = fontHeaderTable;
        cellTotal.alignment = { horizontal: 'center', vertical: 'middle' };

        ['N', '0.6', '1.0'].forEach((sub, k) => {
            const c = worksheet.getCell(rHeader+2, colTotal+k);
            c.value = sub;
            c.fill = fillHeader;
            c.border = bordersAll;
            c.font = { ...fontHeaderTable, size: 7 };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        // Columna OBSERVACION (AD)
        const cObs = worksheet.getColumn(colTotal+3).letter;
        worksheet.mergeCells(`${cObs}${rHeader}:${cObs}${rHeader+2}`);
        const cellObs = worksheet.getCell(`${cObs}${rHeader}`);
        cellObs.value = 'OBSERVACION';
        cellObs.fill = fillHeader;
        cellObs.border = bordersAll;
        cellObs.font = fontHeaderTable;
        cellObs.alignment = { horizontal: 'center', vertical: 'middle' };


        // --- 5. CUERPO DE LA TABLA (Datos) ---
        let currentRow = rHeader + 3;

        aggregatedData.forEach((worker, idx) => {
            // Datos Fijos
            const cellA = worksheet.getCell(`A${currentRow}`); cellA.value = idx + 1;
            const cellB = worksheet.getCell(`B${currentRow}`); cellB.value = worker.doc_number;
            const cellC = worksheet.getCell(`C${currentRow}`); cellC.value = worker.full_name;
            const cellD = worksheet.getCell(`D${currentRow}`); cellD.value = worker.role;
            const cellE = worksheet.getCell(`E${currentRow}`); cellE.value = worker.start_date || '-';

            // Estilos Fijos
            [cellA, cellB, cellC, cellD, cellE].forEach((c, i) => {
                c.font = fontBody;
                c.border = bordersAll;
                c.alignment = { vertical: 'middle', horizontal: i===2 ? 'left' : 'center' }; // Nombre a la izquierda
            });

            // Datos Diarios
            let cDayIdx = 6;
            let sumN = 0, sum60 = 0, sum100 = 0;

            datesOfWeek.forEach((d, i) => {
                const dateKey = d.toISOString().split('T')[0];
                const record = worker.daily_records[dateKey];
                const isSunday = i === 6;
                const bg = isSunday ? fillSunday : null; // Rojo solo en domingo

                // Valores
                let vN = null, v60 = null, v100 = null;
                if (record) {
                    vN = 1.0; sumN += 1.0;
                    if(record.he60 > 0) { v60 = record.he60; sum60 += v60; }
                    if(record.he100 > 0) { v100 = record.he100; sum100 += v100; }
                }

                // Celdas
                const cellN = worksheet.getCell(currentRow, cDayIdx);
                const cell60 = worksheet.getCell(currentRow, cDayIdx+1);
                const cell100 = worksheet.getCell(currentRow, cDayIdx+2);

                cellN.value = vN; 
                cell60.value = v60;
                cell100.value = v100;

                [cellN, cell60, cell100].forEach(c => {
                    c.border = bordersAll;
                    c.font = fontBody;
                    c.alignment = { horizontal: 'center', vertical: 'middle' };
                    if(bg) c.fill = bg;
                });

                cDayIdx += 3;
            });

            // Totales
            const tN = worksheet.getCell(currentRow, colTotal);
            const t60 = worksheet.getCell(currentRow, colTotal+1);
            const t100 = worksheet.getCell(currentRow, colTotal+2);

            tN.value = sumN > 0 ? sumN : null;
            t60.value = sum60 > 0 ? sum60 : null;
            t100.value = sum100 > 0 ? sum100 : null;

            [tN, t60, t100].forEach(c => {
                c.border = bordersAll;
                c.font = { ...fontBody, bold: true };
                c.fill = fillHeader; // Totales en azul
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Obs
            const cO = worksheet.getCell(currentRow, colTotal+3);
            cO.border = bordersAll;

            currentRow++;
        });

        // Descarga
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Tareo_Semanal_${activeTab}_${dateRange.start}.xlsx`);

    } catch (error) {
        console.error("Error Excel:", error);
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'Error generando Excel.' });
    }
  };

  // Helpers
  const formatDateShort = (d) => d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
  const getMonthName = (d) => d.toLocaleDateString('es-PE', { month: 'long' }).toUpperCase();
  const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
      var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="text-[#003366]" /> Control de Tareo Semanal
          </h1>
          <p className="text-slate-500 text-sm">Resumen acumulado de asistencia y horas extras.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="text-slate-400 ml-2" size={18} />
            <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="px-2 py-1 text-xs font-bold text-slate-600 outline-none bg-transparent w-28"
            />
            <span className="text-slate-300">-</span>
            <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="px-2 py-1 text-xs font-bold text-slate-600 outline-none bg-transparent w-28"
            />
            <button 
                onClick={fetchAttendanceRange}
                className="bg-[#003366] text-white p-1.5 rounded-lg hover:bg-blue-900 transition shadow-sm"
            >
                <Search size={14} />
            </button>
            </div>

            {/* BOTÓN EXCEL */}
            <button 
                onClick={exportToTareoExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all font-bold text-sm"
            >
                <FileSpreadsheet size={18}/> Exportar Tareo
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HardHat size={18} /> Obreros
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserCog size={18} /> Staff
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><UserCog size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{aggregatedData.length}</p>
             <p className="text-xs font-bold text-slate-400 uppercase">Personal Activo</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {aggregatedData.reduce((acc, curr) => acc + curr.worked_dates.size, 0)}
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Días Laborados</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Clock size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {aggregatedData.reduce((acc, curr) => acc + curr.total_he60, 0)}h
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Total HE 60%</p>
           </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Clock size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {aggregatedData.reduce((acc, curr) => acc + curr.total_he100, 0)}h
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Total HE 100%</p>
           </div>
        </div>
      </div>

      {/* Tabla Vista Previa */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center bg-slate-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar en ${activeTab === 'workers' ? 'Obreros' : 'Staff'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#003366]/10 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Personal</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">Días Trab.</th>
                <th className="px-6 py-4 text-center">Horas Totales</th>
                <th className="px-6 py-4 text-center text-orange-600">Acum. HE 60%</th>
                <th className="px-6 py-4 text-center text-red-600">Acum. HE 100%</th>
                <th className="px-6 py-4 text-center">Faltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-400 animate-pulse font-medium">Calculando tareo...</td></tr>
              ) : aggregatedData.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Filter size={32} className="opacity-20"/>
                    <span>No hay datos en este rango de fechas.</span>
                </td></tr>
              ) : (
                aggregatedData.map((item) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="hover:bg-blue-50/30 transition-colors group cursor-default"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${activeTab === 'workers' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {activeTab === 'workers' ? <HardHat size={18}/> : <UserCog size={18}/>}
                          </div>
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{item.full_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.doc_number}</span>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                           {item.role || '-'}
                       </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center gap-1 font-bold px-3 py-1 rounded-lg border ${
                          item.worked_dates.size > 0 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                         <Calendar size={14}/> {item.worked_dates.size}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                      {item.total_hours.toFixed(1)}h
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-orange-600 bg-orange-50/30">
                      {item.total_he60 > 0 ? `+${item.total_he60}h` : '-'}
                    </td>
                    
                    <td className="px-6 py-4 text-center font-bold text-red-600 bg-red-50/30">
                      {item.total_he100 > 0 ? `+${item.total_he100}h` : '-'}
                    </td>

                    <td className="px-6 py-4 text-center">
                       {item.status_counts.Falta > 0 ? (
                           <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold text-xs border border-red-200">
                               {item.status_counts.Falta}
                           </span>
                       ) : (
                           <span className="text-slate-300">-</span>
                       )}
                    </td>

                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
};

export default AttendanceManagementPage;