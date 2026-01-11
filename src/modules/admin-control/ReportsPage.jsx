import React, { useEffect, useState, useMemo } from 'react';
import { 
  MapPin, Calendar, Clock, FileText, Filter, 
  Camera, User, HardHat, UserCog, Loader2, Search, 
  ArrowLeft, Building2, Users, FileDown, PieChart as PieChartIcon, BarChart3, 
  X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFull from '../../assets/images/logo-lk-full.png';

// LIBRERÍA DE GRÁFICOS
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';

import { getProjects } from '../../services/projectsService';
// IMPORT PARA EXCEL
import { generateTareoExcel } from '../../utils/excelTareoGenerator';

// --- VARIANTES DE ANIMACIÓN ---
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const ReportsPage = () => {
  // --- CONFIGURACIÓN ---
  const ITEMS_PER_PAGE = 10;

  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState('projects'); 
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  
  const [attendanceData, setAttendanceData] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // --- FILTROS ---
  const [dateRange, setDateRange] = useState(() => {
    // Por defecto mostramos la semana actual
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6); 
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });
  
  const [filterText, setFilterText] = useState('');
  const [filterRole, setFilterRole] = useState('Todos');

  const ROLES = ['Todos', 'Operario', 'Oficial', 'Peón', 'Capataz', 'Topógrafo', 'Staff'];
  const COLORS = { obrero: '#003366', staff: '#f0c419', late: '#ef4444', ontime: '#22c55e' };

  // --- 1. CARGA INICIAL ---
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjectsList(data);
    } catch (error) { console.error(error); }
  };

  // --- 2. FETCH DE ASISTENCIA (PARA PANTALLA) ---
  const fetchAttendance = async (page = 1, project = selectedProject) => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          workers ( id, full_name, category, document_number ),
          employees ( id, full_name, position, document_number )
        `, { count: 'exact' })
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
        .order('check_in_time', { ascending: true });

      if (project) {
        query = query.eq('project_name', project.name);
      }

      const { data, error } = await query;
      if (error) throw error;

      let finalData = data || [];

      // Filtro de Texto (Local)
      if (filterText) {
         finalData = finalData.filter(item => {
            const u = getUserData(item);
            return u.name.toLowerCase().includes(filterText.toLowerCase()) || u.doc.includes(filterText);
         });
      }

      // Filtro de Rol (Local)
      if (filterRole !== 'Todos') {
         finalData = finalData.filter(item => {
            const u = getUserData(item);
            if (filterRole === 'Staff') return u.type === 'STAFF';
            return u.role === filterRole;
         });
      }

      setAttendanceData(finalData); 
      setTotalRecords(finalData.length);
      setCurrentPage(1);

    } catch (error) {
      console.error('Error cargando asistencia:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'detail' || (viewMode === 'projects' && (filterText || filterRole !== 'Todos'))) {
       const timer = setTimeout(() => {
          fetchAttendance(1, selectedProject);
       }, 500);
       return () => clearTimeout(timer);
    }
  }, [dateRange, selectedProject, filterText, filterRole]);

  // --- LÓGICA DE PAGINACIÓN LOCAL ---
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  
  const paginatedTableData = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return attendanceData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [attendanceData, currentPage]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getUserData = (item) => {
    if (item.workers) return { name: item.workers.full_name, role: item.workers.category, doc: item.workers.document_number, type: 'OBRERO' };
    if (item.employees) return { name: item.employees.full_name, role: item.employees.position, doc: item.employees.document_number, type: 'STAFF' };
    return { name: 'Desconocido', role: '-', doc: '-', type: '?' };
  };

  // --- ESTADÍSTICAS CORREGIDAS (LÓGICA ESTRICTA 8.5h / 5.5h) ---
  const stats = useMemo(() => {
    const dataToAnalyze = attendanceData; 
    const grouped = {};
    let obreros = 0, staff = 0;

    dataToAnalyze.forEach(item => {
      const dateKey = new Date(item.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
      if (!grouped[dateKey]) grouped[dateKey] = { name: dateKey, Obrero: 0, Staff: 0 };
      const u = getUserData(item);
      
      // LÓGICA DE JORNADA
      let dayValue = 0;
      if (item.check_in_time && item.check_out_time) {
          const diffMs = new Date(item.check_out_time) - new Date(item.check_in_time);
          const hours = diffMs / (1000 * 60 * 60);
          
          // Corrección segura de fecha para detectar sábado
          const recordDate = new Date(item.date.split('-').join('/'));
          const isSaturday = recordDate.getDay() === 6;

          if (isSaturday) {
             if (hours >= 5.5) dayValue = 1; // Sábado estricto: >= 5.5h
             else if (hours >= 1) dayValue = 0.5;
             else dayValue = 0;
          } else {
             if (hours >= 8.5) dayValue = 1; // Lunes-Viernes estricto: >= 8.5h
             else if (hours >= 1) dayValue = 0.5;
             else dayValue = 0;
          }
          
      } else if (!item.check_out_time) {
          dayValue = 0; 
      }

      if (u.type === 'OBRERO') { 
          grouped[dateKey].Obrero += dayValue; 
          if(dayValue > 0) obreros++; 
      } else { 
          grouped[dateKey].Staff += dayValue; 
          if(dayValue > 0) staff++; 
      }
    });

    return { 
      total: totalRecords,
      unique: new Set(dataToAnalyze.map(i => i.worker_id || i.employee_id)).size,
      barData: Object.values(grouped),
      pieData: [{ name: 'Obreros', value: obreros }, { name: 'Staff', value: staff }].filter(d => d.value > 0)
    };
  }, [attendanceData, totalRecords]);

  // --- MANEJADORES ---
  const handleProjectClick = (project) => {
    setSelectedProject(project);
    setViewMode('detail');
    setFilterText('');
    setFilterRole('Todos');
  };

  const handleBack = () => {
    setSelectedProject(null);
    setViewMode('projects');
    setFilterText('');
    setAttendanceData([]);
  };

  const isGlobalSearchMode = viewMode === 'projects' && (filterText !== '' || filterRole !== 'Todos');

  // --- GENERADOR PDF ---
  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`*, workers(full_name,category,document_number), employees(full_name,position,document_number)`)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
        .range(0, 9999);
        
      if (selectedProject) query = query.eq('project_name', selectedProject.name);
      
      const { data: fullData, error } = await query;
      if (error || !fullData || fullData.length === 0) { alert("Sin datos para reportar."); return; }

      let reportData = fullData;
      if (filterText) {
          reportData = fullData.filter(item => {
             const u = getUserData(item);
             return u.name.toLowerCase().includes(filterText.toLowerCase());
          });
      }

      const doc = new jsPDF('l', 'mm', 'a4'); 
      const imgLogo = new Image(); imgLogo.src = logoFull;
      await new Promise(r => { imgLogo.onload = r; imgLogo.onerror = r; });

      const getImgBase64 = async (url) => {
        try { const r = await fetch(url); const b = await r.blob(); return new Promise(res => { const fr = new FileReader(); fr.onloadend=()=>res(fr.result); fr.readAsDataURL(b); }); } catch{ return null; }
      };
      
      const getWeekNumber = (d) => {
          d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
          var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
          return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
      };

      const dates = [...new Set(reportData.map(i => i.date))];

      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const dateObj = new Date(d + 'T00:00:00');
        if (i>0) doc.addPage();
        
        doc.addImage(imgLogo, 'PNG', 14, 10, 35, 12);
        doc.setFontSize(16); doc.setTextColor(0, 51, 102); doc.setFont("helvetica", "bold");
        doc.text("LISTA DE ASISTENCIA DE PERSONAL - L&K", 280, 18, { align: "right" });
        doc.setDrawColor(0, 51, 102); doc.setLineWidth(0.5); doc.line(14, 25, 283, 25);

        doc.setFontSize(9); doc.setTextColor(50); doc.setFont("helvetica", "bold");
        const fechaStr = dateObj.toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase();
        
        doc.text("OBRA:", 14, 32); doc.setFont("helvetica", "normal"); doc.setTextColor(0); 
        doc.text(selectedProject ? selectedProject.name.toUpperCase() : 'REPORTE GLOBAL', 28, 32);
        
        doc.setFont("helvetica", "bold"); doc.setTextColor(50); doc.text("C.C.:", 150, 32);
        doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.text(selectedProject?.project_code || '---', 160, 32);

        doc.setFont("helvetica", "bold"); doc.setTextColor(50); doc.text("SEMANA:", 240, 32);
        doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.text(`${getWeekNumber(dateObj)}`, 260, 32);

        doc.setFont("helvetica", "bold"); doc.setTextColor(50); doc.text("FECHA:", 14, 38);
        doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.text(fechaStr, 28, 38);
        
        doc.setFont("helvetica", "bold"); doc.setTextColor(50); doc.text("TURNO:", 150, 38);
        doc.setFont("helvetica", "normal"); doc.setTextColor(0); doc.text("DÍA", 165, 38);

        const dayRows = reportData.filter(x => x.date === d);
        const tableBody = [];

        for (const [idx, item] of dayRows.entries()) {
          const u = getUserData(item);
          const [pIn, pOut] = await Promise.all([
             item.check_in_photo ? getImgBase64(item.check_in_photo) : null,
             item.check_out_photo ? getImgBase64(item.check_out_photo) : null
          ]);
          
          const hiTime = item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '-';
          const hiLoc = item.check_in_location || 'Sin GPS';
          const hsTime = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '-';
          const hsLoc = item.check_out_location || 'Sin GPS';

          tableBody.push({
             index: idx + 1,
             name: u.name.toUpperCase(),
             doc: u.doc,
             cat: `${u.role.toUpperCase()}\n${u.role === 'Operario' ? '(Albañil)' : ''}`, 
             hi: `${hiTime}\n${hiLoc}`, 
             firma_in: pIn, 
             hs: `${hsTime}\n${hsLoc}`, 
             firma_out: pOut, 
             obs: item.observation || ''
          });
        }

        autoTable(doc, {
           startY: 42,
           head: [['N°', 'APELLIDOS Y NOMBRES', 'DNI / C.E.', 'CATEGORIA\nESPECIALIDAD', 'H.I\n(HORA Y UBICACIÓN)', 'FIRMA (ENTRADA)', 'H.S\n(HORA Y UBICACIÓN)', 'FIRMA (SALIDA)', 'OBSERVACIONES']],
           body: tableBody.map(r => [ r.index, r.name, r.doc, r.cat, r.hi, '', r.hs, '', r.obs ]),
           theme: 'grid',
           styles: { fontSize: 6, valign: 'middle', halign: 'center', lineColor: [200, 200, 200], lineWidth: 0.1, cellPadding: 1, textColor: [0, 0, 0] },
           headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', valign: 'middle' },
           columnStyles: { 0: {cellWidth: 8}, 1: {cellWidth: 50, halign: 'left'}, 2: {cellWidth: 18}, 3: {cellWidth: 20}, 4: {cellWidth: 30}, 5: {cellWidth: 22}, 6: {cellWidth: 30}, 7: {cellWidth: 22}, 8: {cellWidth: 'auto'} },
           bodyStyles: { minCellHeight: 18 },
           didDrawCell: (data) => {
              if (data.section === 'body') {
                  const row = tableBody[data.row.index];
                  if (data.column.index === 5 && row.firma_in) {
                      try { doc.addImage(row.firma_in, 'JPEG', data.cell.x + (data.cell.width - 16)/2, data.cell.y + (data.cell.height - 16)/2, 16, 16); } catch(e){}
                  }
                  if (data.column.index === 7 && row.firma_out) {
                      try { doc.addImage(row.firma_out, 'JPEG', data.cell.x + (data.cell.width - 16)/2, data.cell.y + (data.cell.height - 16)/2, 16, 16); } catch(e){}
                  }
              }
           }
        });
        
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(`Sistema de Gestión L&K - Página ${pageCount}`, 14, 200);
      }
      doc.save(`TAREO_${selectedProject?.name || 'GLOBAL'}_${dateRange.start}.pdf`);
    } catch (e) { alert("Error PDF"); console.error(e); }
    finally { setIsGeneratingPdf(false); }
  };

  // --- GENERADOR EXCEL (MULTI-HOJA) ---
  const handleExportExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      console.log("Iniciando exportación Excel Completa.");

      // 1. CARGAR MASTER LIST (Todos los activos)
      const { data: allWorkers, error: errWorkers } = await supabase
          .from('workers')
          .select('*')
          .eq('status', 'Activo')
          .range(0, 4999);
      
      const { data: allStaff, error: errStaff } = await supabase
          .from('employees')
          .select('*')
          .eq('status', 'Activo')
          .range(0, 4999);

      if (errWorkers || errStaff) throw new Error("Error cargando lista de personal.");

      // 2. CARGAR ASISTENCIAS DEL RANGO
      let query = supabase
        .from('attendance')
        .select(`
            *, 
            workers(id, full_name, category, document_number, start_date), 
            employees(id, full_name, position, document_number, entry_date)
        `)
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('date', { ascending: true })
        .range(0, 9999); 
        
      if (selectedProject) query = query.eq('project_name', selectedProject.name);
      
      const { data: attendanceData, error } = await query;
      if (error) throw error;

      // 3. GENERAR EXCEL (Pasamos projectsList para generar hojas)
      await generateTareoExcel(
          attendanceData || [], 
          allWorkers || [], 
          allStaff || [], 
          dateRange, 
          selectedProject,
          projectsList || [] 
      );

    } catch (e) {
      console.error("Error General Excel:", e);
      alert("Error inesperado al generar Excel. Revisa la consola.");
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="text-[#003366]"/> 
             {selectedProject ? `Obra: ${selectedProject.name}` : 'Reportes y KPI Global'}
          </h2>
          <p className="text-slate-500 text-sm">
            {selectedProject ? 'Gestión detallada de asistencia.' : 'Vista general de todas las obras.'}
          </p>
        </div>
        {selectedProject && (
           <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-[#003366] bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-sm">
              <ArrowLeft size={16}/> Volver
           </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
         {/* FECHAS */}
         <div className="md:col-span-4 flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
             <div className="relative flex-1">
               <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
               <input type="date" value={dateRange.start} onChange={e=>setDateRange({...dateRange, start:e.target.value})} className="w-full pl-7 bg-transparent text-xs font-bold text-slate-700 outline-none"/>
             </div>
             <span className="text-slate-300">|</span>
             <div className="relative flex-1">
               <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
               <input type="date" value={dateRange.end} onChange={e=>setDateRange({...dateRange, end:e.target.value})} className="w-full pl-7 bg-transparent text-xs font-bold text-slate-700 outline-none"/>
             </div>
         </div>

         {/* BUSCADOR */}
         <div className="md:col-span-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Buscar (Nombre/DNI)..."
              value={filterText}
              onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] transition-colors"
            />
            {filterText && <button onClick={()=>setFilterText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X size={14}/></button>}
         </div>

         {/* ROL */}
         <div className="md:col-span-3 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#003366] appearance-none cursor-pointer">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
         </div>

         {/* EXPORTAR */}
         <div className="md:col-span-2 flex justify-end gap-2">
             <button 
                onClick={handleExportExcel} 
                disabled={isGeneratingExcel} 
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm shadow hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
             >
                {isGeneratingExcel ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16}/>} Excel
             </button>

             <button 
                onClick={generatePDF} 
                disabled={isGeneratingPdf || totalRecords === 0} 
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm shadow hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
             >
                {isGeneratingPdf ? <Loader2 className="animate-spin" size={16}/> : <FileDown size={16}/>} PDF
             </button>
         </div>
      </div>

      {/* VISTA TARJETAS PROYECTO */}
      {!selectedProject && !isGlobalSearchMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {loading && projectsList.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2"/> Cargando obras...</div>
           ) : (
             projectsList.map(proj => (
               <motion.div key={proj.id} whileHover={{ y: -5 }} onClick={() => handleProjectClick(proj)} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm cursor-pointer group hover:shadow-md hover:border-blue-200 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1.5 h-full bg-[#003366] group-hover:bg-[#f0c419] transition-colors"></div>
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-50 text-[#003366] rounded-xl"><Building2 size={24}/></div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${proj.status === 'En Ejecución' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{proj.status}</span>
                 </div>
                 <h3 className="font-bold text-lg text-slate-800 mb-1">{proj.name}</h3>
                 <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14}/> {proj.location}</p>
               </motion.div>
             ))
           )}
        </div>
      )}

      {/* VISTA DETALLE Y TABLA PAGINADA */}
      {(selectedProject || isGlobalSearchMode) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
           {/* HEADER BÚSQUEDA GLOBAL */}
           {isGlobalSearchMode && (
             <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-3 text-blue-800 text-sm">
                <Search size={18}/> 
                <span>Búsqueda Global: {stats.total} registros encontrados.</span>
                <button onClick={() => { setFilterText(''); setFilterRole('Todos'); }} className="ml-auto text-xs font-bold underline">Limpiar</button>
             </div>
           )}

           {/* GRÁFICOS (VISIBLES CON TODA LA DATA) */}
           {attendanceData.length > 0 && !filterText && (
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[300px]">
                   <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase">Asistencia Total (Jornales)</h4>
                   <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stats.barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11}} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize:11}}/>
                          <Tooltip cursor={{fill: 'transparent'}}/>
                          <Legend />
                          <Bar dataKey="Obrero" stackId="a" fill={COLORS.obrero} radius={[0,0,4,4]} barSize={30}/>
                          <Bar dataKey="Staff" stackId="a" fill={COLORS.staff} radius={[4,4,0,0]} barSize={30}/>
                      </BarChart>
                   </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                   <h4 className="font-bold text-slate-700 mb-2 text-sm uppercase text-center">Distribución Total</h4>
                   <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                         <Pie data={stats.pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                            {stats.pieData.map((e,i)=><Cell key={i} fill={e.name==='Obreros'?COLORS.obrero:COLORS.staff}/>)}
                         </Pie>
                         <Tooltip/>
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="mt-2 text-center">
                      <span className="block text-3xl font-bold text-slate-800">{stats.total}</span>
                      <span className="text-xs text-slate-400">TOTAL REGISTROS</span>
                   </div>
                </div>
             </div>
           )}

           {/* TABLA PAGINADA (LOCALMENTE) */}
           <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                 {loading ? (
                    <div className="py-20 flex justify-center text-slate-400 gap-2"><Loader2 className="animate-spin"/> Cargando registros...</div>
                 ) : attendanceData.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-slate-400"><FileText size={40} className="opacity-30 mb-2"/><p>No se encontraron registros en este rango.</p></div>
                 ) : (
                    <table className="w-full text-left text-sm">
                       <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
                          <tr>
                             <th className="px-6 py-4">Personal</th>
                             <th className="px-6 py-4">Proyecto</th>
                             <th className="px-6 py-4">Fecha</th>
                             <th className="px-6 py-4">Entrada</th>
                             <th className="px-6 py-4">Salida</th>
                             <th className="px-6 py-4 text-center">Fotos</th>
                          </tr>
                       </thead>
                       
                       <motion.tbody 
                          variants={containerVariants}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          key={currentPage} 
                          className="divide-y divide-slate-50"
                       >
                          {paginatedTableData.map(item => {
                             const u = getUserData(item);
                             return (
                                <motion.tr 
                                   key={item.id} 
                                   variants={itemVariants} 
                                   className="hover:bg-slate-50/50 transition"
                                >
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                         <div className={`p-2 rounded-full ${u.type==='STAFF'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700'}`}><User size={16}/></div>
                                         <div><p className="font-bold text-slate-700">{u.name}</p><p className="text-xs text-slate-400">{u.role}</p></div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 text-xs font-bold text-slate-600">{item.project_name}</td>
                                   <td className="px-6 py-4 font-medium text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                                   <td className="px-6 py-4">
                                      {item.check_in_time ? (
                                         <div className="flex flex-col">
                                            <span className="text-green-700 font-bold text-xs">{new Date(item.check_in_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={item.check_in_location}>{item.check_in_location||'Sin GPS'}</span>
                                         </div>
                                      ) : '-'}
                                   </td>
                                   <td className="px-6 py-4">
                                      {item.check_out_time ? (
                                         <div className="flex flex-col">
                                            <span className="text-orange-700 font-bold text-xs">{new Date(item.check_out_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={item.check_out_location}>{item.check_out_location||'Sin GPS'}</span>
                                         </div>
                                      ) : <span className="text-[10px] italic text-slate-400">En turno</span>}
                                   </td>
                                   <td className="px-6 py-4 text-center flex justify-center gap-2">
                                      {item.check_in_photo && <a href={item.check_in_photo} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden hover:scale-110 transition shadow-sm"><img src={item.check_in_photo} className="w-full h-full object-cover"/></a>}
                                      {item.check_out_photo && <a href={item.check_out_photo} target="_blank" rel="noreferrer" className="w-8 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden hover:scale-110 transition shadow-sm"><img src={item.check_out_photo} className="w-full h-full object-cover"/></a>}
                                   </td>
                                </motion.tr>
                             )
                          })}
                       </motion.tbody>
                    </table>
                 )}
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && !filterText && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 relative flex flex-col md:flex-row justify-center items-center gap-4">
                    <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium order-2 md:order-1">
                        Página {currentPage} de {totalPages} ({totalRecords} registros)
                    </div>
                    
                    <div className="flex items-center gap-1 order-1 md:order-2 z-10 bg-white/50 p-1 rounded-xl border border-slate-100 shadow-sm">
                        <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 text-slate-500 transition-all"><ChevronsLeft size={18}/></button>
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 text-slate-500 transition-all"><ChevronLeft size={18}/></button>
                        <div className="flex items-center gap-1 mx-2">
                            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#003366] text-white font-bold text-xs shadow-md">{currentPage}</span>
                        </div>
                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 text-slate-500 transition-all"><ChevronRight size={18}/></button>
                        <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 text-slate-500 transition-all"><ChevronsRight size={18}/></button>
                    </div>
                </div>
              )}
           </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReportsPage;