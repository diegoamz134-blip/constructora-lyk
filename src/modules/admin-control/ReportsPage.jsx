import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Search, 
  UserCog, HardHat, Filter, Clock, MapPin, 
  Loader2, FileSpreadsheet, FileIcon, Download 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import * as XLSX from 'xlsx'; 
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ReportsPage = () => {
  // --- Estados ---
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  
  // Filtros de fecha (Por defecto: mes actual)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // --- Efectos ---
  useEffect(() => {
    fetchReportData();
  }, [activeTab, dateRange]); 

  // --- FUNCIÓN DE CARGA BLINDADA (SIN JOINS) ---
  const fetchReportData = async () => {
    setLoading(true);
    setReportData([]); 
    
    try {
      // 1. Traer TODOS los registros de asistencia en el rango de fechas
      const { data: attendanceList, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (attendanceError) throw attendanceError;

      // 2. Filtrar y recolectar IDs según la pestaña activa
      let relevantAttendance = [];
      let userIds = [];

      if (activeTab === 'workers') {
        relevantAttendance = attendanceList.filter(item => item.worker_id);
        userIds = [...new Set(relevantAttendance.map(item => item.worker_id))];
      } else {
        relevantAttendance = attendanceList.filter(item => item.employee_id);
        userIds = [...new Set(relevantAttendance.map(item => item.employee_id))];
      }

      if (userIds.length === 0) {
        setReportData([]);
        setLoading(false);
        return;
      }

      // 3. Traer la información de las personas
      const tableName = activeTab === 'workers' ? 'workers' : 'employees';
      const { data: usersList, error: usersError } = await supabase
        .from(tableName)
        .select('id, full_name, document_number, category, position')
        .in('id', userIds);

      if (usersError) throw usersError;

      // 4. Cruzar los datos
      const combinedData = relevantAttendance.map(record => {
        const userIdToFind = activeTab === 'workers' ? record.worker_id : record.employee_id;
        const user = usersList.find(u => u.id === userIdToFind);

        return {
          ...record,
          user_name: user?.full_name || 'Desconocido',
          user_doc: user?.document_number || '-',
          user_role: activeTab === 'workers' ? (user?.category || 'Obrero') : (user?.position || 'Staff')
        };
      });

      setReportData(combinedData);

    } catch (error) {
      console.error("Error generando reporte:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers ---
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return '-';
    const diff = new Date(end) - new Date(start);
    const hours = diff / (1000 * 60 * 60);
    return hours.toFixed(2) + ' hrs';
  };

  // --- Exportar a Excel ---
  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      Fecha: item.date,
      Personal: item.user_name,
      DNI: item.user_doc,
      Rol: item.user_role,
      Entrada: formatTime(item.check_in_time),
      Salida: formatTime(item.check_out_time),
      'Horas Trab.': calculateHours(item.check_in_time, item.check_out_time),
      Proyecto: item.project_name || 'No especificado'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `Reporte_Asistencia_${activeTab}_${dateRange.start}.xlsx`);
  };

  // --- Exportar a PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Reporte de Asistencia - ${activeTab === 'workers' ? 'Obreros' : 'Administrativos'}`, 14, 15);
    doc.text(`Desde: ${dateRange.start} Hasta: ${dateRange.end}`, 14, 25);

    const tableColumn = ["Fecha", "Personal", "Rol", "Entrada", "Salida", "Horas", "Proyecto"];
    const tableRows = [];

    reportData.forEach(item => {
      const rowData = [
        item.date,
        item.user_name,
        item.user_role,
        formatTime(item.check_in_time),
        formatTime(item.check_out_time),
        calculateHours(item.check_in_time, item.check_out_time),
        item.project_name || '-'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    doc.save(`Reporte_Asistencia_${activeTab}.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* --- Header --- */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-[#003366]" /> Reportes de Asistencia
        </h1>
        <p className="text-slate-500 text-sm">Control detallado de entradas, salidas y horas trabajadas.</p>
      </div>

      {/* --- BARRA DE CONTROLES (Responsive) --- */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        
        {/* IZQUIERDA: Tabs (Estilo Planilla) */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
            onClick={() => setActiveTab('workers')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'workers' 
                ? 'bg-[#003366] text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            >
            <HardHat size={18} /> Planilla Obrera
            </button>
            <button
            onClick={() => setActiveTab('staff')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'staff' 
                ? 'bg-[#003366] text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            >
            <UserCog size={18} /> Planilla Staff
            </button>
        </div>

        {/* DERECHA: Filtros + Botones (Estilo Licitaciones) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            
            {/* Grupo de Fechas */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 flex-1 sm:flex-none">
                <div className="relative flex-1">
                    <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full px-2 py-2 bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                    />
                </div>
                <span className="text-slate-300">|</span>
                <div className="relative flex-1">
                    <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full px-2 py-2 bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                    />
                </div>
                <button 
                    onClick={fetchReportData} 
                    className="p-2 bg-white text-[#003366] rounded-lg shadow-sm hover:bg-blue-50 transition-colors border border-slate-100"
                    title="Actualizar Filtros"
                >
                    <Filter size={18} />
                </button>
            </div>

            {/* Grupo Botones Exportar */}
            <div className="flex gap-2">
                <button 
                    onClick={exportToExcel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    disabled={reportData.length === 0}
                >
                    <FileSpreadsheet size={18} /> Excel
                </button>
                <button 
                    onClick={exportToPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    disabled={reportData.length === 0}
                >
                    <FileIcon size={18} /> PDF
                </button>
            </div>

        </div>
      </div>

      {/* --- Tabla de Reportes --- */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="animate-spin text-[#003366]" size={40} />
              <div className="text-center">
                  <p className="font-bold text-slate-700">Generando reporte...</p>
                  <p className="text-xs">Procesando registros de asistencia</p>
              </div>
           </div>
        ) : reportData.length === 0 ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Calendar size={32} className="opacity-40" />
            </div>
            <h3 className="font-bold text-slate-700 mb-1">Sin registros encontrados</h3>
            <p className="text-sm">No hay asistencia registrada en este rango de fechas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Personal</th>
                  <th className="px-6 py-4">Horario</th>
                  <th className="px-6 py-4 text-center">Horas</th>
                  <th className="px-6 py-4 text-right">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Fecha */}
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-slate-600 text-sm font-medium">
                            <span className="w-8 text-center text-xs font-bold text-slate-400 bg-slate-100 rounded px-1 py-0.5">
                                {new Date(record.date).getDate()}
                            </span>
                            {new Date(record.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </div>
                    </td>
                    
                    {/* Personal */}
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${activeTab === 'staff' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                                {record.user_name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-slate-700 text-sm line-clamp-1">{record.user_name}</p>
                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                    {record.user_role}
                                </span>
                            </div>
                        </div>
                    </td>

                    {/* Horario (Entrada / Salida Unificados) */}
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span className="text-slate-600 font-mono">{formatTime(record.check_in_time)}</span>
                                <span className="text-slate-300 text-[10px] uppercase ml-1">Entrada</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className={`w-1.5 h-1.5 rounded-full ${record.check_out_time ? 'bg-red-500' : 'bg-slate-300'}`}></span>
                                <span className={`${record.check_out_time ? 'text-slate-600' : 'text-slate-400 italic'} font-mono`}>
                                    {record.check_out_time ? formatTime(record.check_out_time) : '--:--'}
                                </span>
                                <span className="text-slate-300 text-[10px] uppercase ml-1">Salida</span>
                            </div>
                        </div>
                    </td>

                    {/* Horas Totales */}
                    <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-600">
                            {calculateHours(record.check_in_time, record.check_out_time)}
                        </span>
                    </td>

                    {/* Ubicación / Proyecto */}
                    <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-xs font-medium max-w-[150px] truncate">
                           <MapPin size={12} className="text-[#003366]"/> 
                           {record.project_name || 'Sin Asignar'}
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;