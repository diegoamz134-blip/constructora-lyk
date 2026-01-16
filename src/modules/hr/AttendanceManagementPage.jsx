import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardCheck, Search, Calendar, 
  Clock, UserCog, Filter, FileSpreadsheet,
  Briefcase
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import StatusModal from '../../components/common/StatusModal';

// Librerías para Excel
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AttendanceManagementPage = () => {
  // YA NO HAY TABS, SIEMPRE ES STAFF
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

  // 1. Cargar Datos (SOLO STAFF)
  useEffect(() => {
    fetchAttendanceRange();
  }, [dateRange]);

  const fetchAttendanceRange = async () => {
    setLoading(true);
    setRawData([]); 
    try {
      // Consulta EXCLUSIVA para EMPLOYEES (Staff)
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!inner (id, full_name, document_number, position, entry_date)
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .not('employee_id', 'is', null);

      if (error) throw error;
      setRawData(data || []);

    } catch (error) {
      console.error("Error:", error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron cargar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Cálculo de Horas
  const calculateDailyHours = (checkIn, checkOut) => {
    if (!checkOut) return { worked: 0, extra: 0 };

    const exitDate = new Date(checkOut);
    const limitDate = new Date(exitDate);
    limitDate.setHours(18, 0, 0, 0); // Asumimos salida 6:00 PM para Staff
    
    const entryDate = new Date(checkIn);
    const diffTotalMs = exitDate - entryDate;
    const hoursWorked = Math.max(0, (diffTotalMs / (1000 * 60 * 60)).toFixed(1));

    let extra = 0;
    if (exitDate > limitDate) {
        const diffMs = exitDate - limitDate;
        extra = Math.floor(diffMs / (1000 * 60 * 60)); 
    }
    return { worked: parseFloat(hoursWorked), extra };
  };

  // 3. Agrupación de Datos
  const aggregatedData = useMemo(() => {
    const grouped = {};

    rawData.forEach(record => {
      const person = record.employees; // Directamente employees
      if (!person) return;
      const personId = person.id;

      if (!grouped[personId]) {
        grouped[personId] = {
          id: personId,
          full_name: person.full_name,
          doc_number: person.document_number,
          role: person.position,
          start_date: person.entry_date,
          // Para staff a veces no hay proyecto específico, ponemos "Oficina" si es null
          project: record.project_name || 'Oficina Central',
          worked_dates: new Set(),
          total_hours: 0,
          total_extra: 0,
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

      const { worked, extra } = calculateDailyHours(record.check_in_time, record.check_out_time);
      grouped[personId].total_hours += worked;
      grouped[personId].total_extra += extra;

      // Guardar para Excel
      grouped[personId].daily_records[record.date] = { 
          status: statusNormalizado,
          worked,
          extra
      }; 
    });

    return Object.values(grouped).filter(item => 
      item.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [rawData, searchTerm]);


  // =========================================================
  //  EXPORTAR A EXCEL (SOLO STAFF)
  // =========================================================
  const exportToTareoExcel = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Asistencia Staff');

        // Estilos
        const fillHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 
        const borderThin = { style: 'thin', color: { argb: 'FF000000' } };
        const bordersAll = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        const fontTitle = { name: 'Arial', size: 14, bold: true };
        const fontHeaderTable = { name: 'Arial', size: 9, bold: true };

        // Anchos
        worksheet.getColumn('A').width = 5;  
        worksheet.getColumn('B').width = 12; 
        worksheet.getColumn('C').width = 35; 
        worksheet.getColumn('D').width = 25; 
        
        // Columnas de días
        for(let c=5; c<=20; c++) worksheet.getColumn(c).width = 12; 

        // Título
        worksheet.mergeCells('A1:K1');
        const title = worksheet.getCell('A1');
        title.value = `REPORTE DE ASISTENCIA STAFF - SEMANA ${formatDateShort(new Date(dateRange.start))}`;
        title.font = fontTitle;
        title.alignment = { horizontal: 'center' };

        // Cabeceras Tabla
        const rHeader = 3;
        const headers = ['ITEM', 'DNI', 'COLABORADOR', 'CARGO'];
        
        // Generar días
        let currDate = new Date(dateRange.start);
        // Ajuste zona horaria simple
        currDate.setMinutes(currDate.getMinutes() + currDate.getTimezoneOffset());
        
        const datesOfWeek = [];
        for(let i=0; i<7; i++) { // Lunes a Domingo
            datesOfWeek.push(new Date(currDate));
            currDate.setDate(currDate.getDate() + 1);
        }

        // Render Headers Fijos
        headers.forEach((h, i) => {
            const cell = worksheet.getCell(rHeader, i+1);
            cell.value = h;
            cell.fill = fillHeader;
            cell.border = bordersAll;
            cell.font = fontHeaderTable;
        });

        // Render Headers Días
        let colIdx = 5;
        datesOfWeek.forEach(d => {
            const cell = worksheet.getCell(rHeader, colIdx);
            cell.value = `${d.toLocaleDateString('es-PE', {weekday:'short'}).toUpperCase()} ${d.getDate()}`;
            cell.fill = fillHeader;
            cell.border = bordersAll;
            cell.font = fontHeaderTable;
            cell.alignment = { horizontal: 'center' };
            colIdx++;
        });

        // Header Totales
        const cellTotal = worksheet.getCell(rHeader, colIdx);
        cellTotal.value = 'HORAS TOT.';
        cellTotal.fill = fillHeader;
        cellTotal.border = bordersAll;
        cellTotal.font = fontHeaderTable;

        // Datos
        let currentRow = rHeader + 1;
        aggregatedData.forEach((staff, idx) => {
            worksheet.getCell(`A${currentRow}`).value = idx + 1;
            worksheet.getCell(`B${currentRow}`).value = staff.doc_number;
            worksheet.getCell(`C${currentRow}`).value = staff.full_name;
            worksheet.getCell(`D${currentRow}`).value = staff.role;

            // Pintar celdas fijas
            ['A','B','C','D'].forEach(col => {
                worksheet.getCell(`${col}${currentRow}`).border = bordersAll;
            });

            // Datos por día
            let cDay = 5;
            datesOfWeek.forEach(d => {
                const dateKey = d.toISOString().split('T')[0];
                const record = staff.daily_records[dateKey];
                const cell = worksheet.getCell(currentRow, cDay);
                
                if (record) {
                    cell.value = record.status === 'Presente' ? `${record.worked}h` : record.status;
                    if(record.status === 'Falta') cell.font = { color: { argb: 'FFFF0000' } };
                } else {
                    cell.value = '-';
                }
                cell.alignment = { horizontal: 'center' };
                cell.border = bordersAll;
                cDay++;
            });

            // Total
            const cTotal = worksheet.getCell(currentRow, cDay);
            cTotal.value = staff.total_hours;
            cTotal.font = { bold: true };
            cTotal.alignment = { horizontal: 'center' };
            cTotal.border = bordersAll;

            currentRow++;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Asistencia_Staff_${dateRange.start}.xlsx`);

    } catch (error) {
        console.error("Error Excel:", error);
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'Error generando Excel.' });
    }
  };

  const formatDateShort = (d) => d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="text-[#003366]" /> Control de Asistencia (Staff)
          </h1>
          <p className="text-slate-500 text-sm">
            Monitoreo de ingresos, salidas y horas del personal administrativo.
          </p>
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

            <button 
                onClick={exportToTareoExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all font-bold text-sm"
            >
                <FileSpreadsheet size={18}/> Exportar Reporte
            </button>
        </div>
      </div>

      {/* Resumen STAFF */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <UserCog size={24}/>
           </div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{aggregatedData.length}</p>
             <p className="text-xs font-bold text-slate-400 uppercase">Staff Activo</p>
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
           <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Clock size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {aggregatedData.reduce((acc, curr) => acc + curr.status_counts.Falta, 0)}
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Inasistencias</p>
           </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Briefcase size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {aggregatedData.reduce((acc, curr) => acc + curr.total_extra, 0).toFixed(0)}h
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Hrs. Extra Aprox.</p>
           </div>
        </div>
      </div>

      {/* Tabla Staff */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center bg-slate-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..."
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
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4 text-center">Asistencias</th>
                <th className="px-6 py-4 text-center">Horas Laboradas</th>
                <th className="px-6 py-4 text-center">Faltas</th>
                <th className="px-6 py-4 text-center text-purple-600">Extra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400 animate-pulse font-medium">Cargando registros de staff...</td></tr>
              ) : aggregatedData.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Filter size={32} className="opacity-20"/>
                    <span>No hay datos registrados en este periodo.</span>
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
                          <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                              <UserCog size={18}/>
                          </div>
                          <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{item.full_name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{item.doc_number}</span>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-xs font-bold px-2 py-1 rounded border bg-slate-100 text-slate-600 border-slate-200">
                           {item.role || 'Staff'}
                       </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1 font-bold px-3 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-100">
                         <Calendar size={14}/> {item.worked_dates.size}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                      {item.total_hours.toFixed(1)}h
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

                    <td className="px-6 py-4 text-center font-bold text-purple-600">
                      {item.total_extra > 0 ? `+${item.total_extra}h` : '-'}
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