import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Calendar, Save, MapPin, CheckCircle, XCircle, 
  AlertCircle, Search, Users, ClipboardCheck, Loader2,
  Building2, ArrowLeft, Clock
} from 'lucide-react';

const FieldAttendancePage = () => {
  // Estados
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null); // Ahora guarda el objeto completo del proyecto o null
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Cargar Proyectos Activos (Con todos los detalles para las tarjetas)
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*') // Traemos todo para mostrar código, ubicación, etc.
          .eq('status', 'En Ejecución')
          .order('name');
        
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Error cargando proyectos:", err);
      }
    };
    loadProjects();
  }, []);

  // 2. Cargar Trabajadores cuando se selecciona un proyecto
  useEffect(() => {
    if (!selectedProject) {
      setWorkers([]);
      return;
    }
    
    const loadTeam = async () => {
      setLoading(true);
      try {
        // Buscamos trabajadores asignados a este proyecto
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('project_assigned', selectedProject.name) 
          .eq('status', 'Activo')
          .order('full_name');

        if (error) throw error;

        const initialList = data.map(w => ({
          ...w,
          attendanceStatus: 'Presente', // Estado inicial
          observation: '',
          saved: false
        }));
        
        setWorkers(initialList || []);
      } catch (err) {
        console.error("Error cargando personal:", err);
        alert("Error al cargar la cuadrilla.");
      } finally {
        setLoading(false);
      }
    };
    loadTeam();
  }, [selectedProject]); // Dependencia: objeto selectedProject

  // --- LÓGICA DE ASISTENCIA ---

  const toggleStatus = (index) => {
    const newWorkers = [...workers];
    const current = newWorkers[index].attendanceStatus;
    
    if (current === 'Presente') newWorkers[index].attendanceStatus = 'Falta';
    else if (current === 'Falta') newWorkers[index].attendanceStatus = 'Permiso';
    else if (current === 'Permiso') newWorkers[index].attendanceStatus = 'Bajada';
    else newWorkers[index].attendanceStatus = 'Presente';
    
    setWorkers(newWorkers);
  };

  const handleObservationChange = (index, value) => {
    const newWorkers = [...workers];
    newWorkers[index].observation = value;
    setWorkers(newWorkers);
  };

  const handleSaveTareo = async () => {
    if (!selectedProject || workers.length === 0) return;
    
    const confirm = window.confirm(`¿Estás seguro de enviar el tareo del ${date} para ${workers.length} trabajadores?`);
    if (!confirm) return;

    setSaving(true);
    try {
      const recordsToInsert = workers.map(w => ({
        worker_id: w.id,
        project_name: selectedProject.name,
        date: date,
        status: w.attendanceStatus,
        check_in_time: w.attendanceStatus === 'Presente' ? `${date} 07:00:00` : null,
        check_out_time: w.attendanceStatus === 'Presente' ? `${date} 17:00:00` : null,
        check_in_location: 'Validado por Residente',
        observation: w.observation || ''
      }));

      const { error } = await supabase.from('attendance').insert(recordsToInsert);
      
      if (error) throw error;

      alert('✅ Tareo enviado correctamente a Oficina Central.');
      setWorkers(prev => prev.map(w => ({...w, saved: true})));

    } catch (e) {
      console.error(e);
      alert('Error guardando tareo: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.document_number.includes(searchTerm)
  );

  // --- VISTA 1: SELECCIÓN DE PROYECTOS (TARJETAS) ---
  if (!selectedProject) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ClipboardCheck className="text-[#f0c419]" size={32} /> Supervisión de Campo
            </h1>
            <p className="text-slate-500 mt-2">Seleccione un proyecto para registrar la asistencia diaria.</p>
          </div>
          
          {/* Selector de Fecha Global */}
          <div className="bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 uppercase">Fecha de Registro:</span>
             <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none text-sm"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                <Building2 size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No hay proyectos en ejecución asignados actualmente.</p>
             </div>
          ) : (
            projects.map(proj => (
              <div 
                key={proj.id} 
                onClick={() => setSelectedProject(proj)}
                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-[#003366]/20 transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Decoración Hover */}
                <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] opacity-0 group-hover:opacity-100 transition-opacity"/>
                
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-[#003366] rounded-xl group-hover:bg-[#003366] group-hover:text-white transition-colors">
                      <Building2 size={24} />
                   </div>
                   <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                      {proj.project_code || 'S/C'}
                   </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#003366] transition-colors">{proj.name}</h3>
                
                <div className="space-y-2 text-sm text-slate-500">
                   <p className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#f0c419]"/> 
                      {proj.location || 'Sin ubicación'}
                   </p>
                   <p className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400"/> 
                      Inicio: {new Date(proj.start_date).toLocaleDateString()}
                   </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                   <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      En Ejecución
                   </span>
                   <span className="text-xs font-bold text-[#003366] group-hover:underline">
                      Ingresar al Tareo →
                   </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- VISTA 2: LISTA DE ASISTENCIA (TAREO) ---
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* HEADER CON BOTÓN VOLVER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => setSelectedProject(null)} // Volver a la lista
            className="flex items-center gap-2 text-slate-400 hover:text-[#003366] text-xs font-bold uppercase mb-2 transition-colors"
          >
            <ArrowLeft size={14}/> Volver a Proyectos
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-[#003366]">{selectedProject.name}</span>
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
             <span className="flex items-center gap-1"><Building2 size={14}/> C.C: {selectedProject.project_code || '---'}</span>
             <span className="flex items-center gap-1"><MapPin size={14}/> {selectedProject.location}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="text-slate-400 ml-2" size={18}/>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none text-sm"
            />
        </div>
      </div>

      {/* CUERPO PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
        
        {/* Barra de Búsqueda Interna */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16}/> 
            <span className="font-bold">{workers.length}</span> Trabajadores asignados
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Buscar obrero..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003366]"
            />
          </div>
        </div>

        {/* LISTA DE TRABAJADORES */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-[#003366]" size={32}/>
              <p>Cargando cuadrilla...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No se encontraron trabajadores activos en este proyecto.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Trabajador</th>
                  <th className="px-6 py-4 text-center">Estado (Clic para cambiar)</th>
                  <th className="px-6 py-4">Observaciones del Día</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map((worker) => {
                  const realIndex = workers.findIndex(w => w.id === worker.id);
                  return (
                    <tr key={worker.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800">{worker.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{worker.document_number}</span>
                            <span className="text-[10px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{worker.category}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleStatus(realIndex)}
                          className={`w-32 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm mx-auto
                            ${worker.attendanceStatus === 'Presente' 
                              ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
                              : worker.attendanceStatus === 'Falta' 
                                ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200'
                            }`}
                        >
                          {worker.attendanceStatus === 'Presente' && <CheckCircle size={16}/>}
                          {worker.attendanceStatus === 'Falta' && <XCircle size={16}/>}
                          {(worker.attendanceStatus === 'Permiso' || worker.attendanceStatus === 'Bajada') && <AlertCircle size={16}/>}
                          {worker.attendanceStatus.toUpperCase()}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          placeholder={worker.attendanceStatus === 'Presente' ? "Sin novedades..." : "Motivo..."}
                          value={worker.observation}
                          onChange={(e) => handleObservationChange(realIndex, e.target.value)}
                          className={`w-full p-2 text-sm border rounded-lg outline-none transition-all
                            ${worker.attendanceStatus !== 'Presente' ? 'border-red-200 bg-red-50 focus:border-red-400' : 'border-slate-200 focus:border-[#003366]'}
                          `}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER DE ACCIONES */}
        {workers.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="text-xs text-slate-400">
              * Verifique la fecha ({date}) antes de enviar.
            </div>
            <button 
              onClick={handleSaveTareo}
              disabled={saving}
              className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
              {saving ? 'ENVIANDO...' : 'CERRAR Y ENVIAR TAREO'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldAttendancePage;