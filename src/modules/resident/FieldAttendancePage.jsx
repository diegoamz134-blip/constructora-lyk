import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Calendar, Save, MapPin, CheckCircle, XCircle, 
  AlertCircle, Search, Users, ClipboardCheck, Loader2,
  Building2, ArrowLeft, Image as ImageIcon,
  ExternalLink, Eye, X, ChevronDown, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FieldAttendancePage = () => {
  // Estados
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para el Modal de Fotos
  const [photoModal, setPhotoModal] = useState({ isOpen: false, worker: null });
  
  // NUEVO: Estado para el Modal de Confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Cargar Proyectos Activos
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
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

  // 2. Cargar Cuadrilla y Cruzar con Asistencia
  useEffect(() => {
    if (!selectedProject) {
      setWorkers([]);
      return;
    }
    
    const loadTeamAndAttendance = async () => {
      setLoading(true);
      try {
        // A. Traer trabajadores asignados
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('project_assigned', selectedProject.name) 
          .eq('status', 'Activo')
          .order('full_name');

        if (workersError) throw workersError;

        // B. Traer asistencias DE HOY
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('project_name', selectedProject.name)
          .eq('date', date);
        
        if (attendanceError) throw attendanceError;

        // C. Merge de datos
        const mergedList = workersData.map(w => {
          const existingRecord = attendanceData.find(a => a.worker_id === w.id);

          return {
            ...w,
            attendanceId: existingRecord ? existingRecord.id : null, 
            attendanceStatus: existingRecord ? (existingRecord.status || 'Presente') : 'Presente',
            
            // Datos de Entrada
            checkInTime: existingRecord ? existingRecord.check_in_time : null,
            checkInLocation: existingRecord ? existingRecord.check_in_location : null,
            checkInPhoto: existingRecord ? existingRecord.check_in_photo : null,

            // Datos de Salida
            checkOutTime: existingRecord ? existingRecord.check_out_time : null,
            checkOutLocation: existingRecord ? existingRecord.check_out_location : null,
            checkOutPhoto: existingRecord ? existingRecord.check_out_photo : null,
            
            origin: existingRecord && existingRecord.check_in_photo ? 'APP' : 'MANUAL',
            observation: existingRecord ? (existingRecord.observation || '') : '',
            saved: !!existingRecord 
          };
        });
        
        setWorkers(mergedList || []);
      } catch (err) {
        console.error("Error cargando personal:", err);
        alert("Error al cargar la cuadrilla.");
      } finally {
        setLoading(false);
      }
    };
    loadTeamAndAttendance();
  }, [selectedProject, date]);

  // --- LÓGICA DE INTERACCIÓN ---

  const handleStatusChange = (index, newStatus) => {
    const newWorkers = [...workers];
    newWorkers[index].attendanceStatus = newStatus;
    
    if (newStatus === 'Presente' && !newWorkers[index].saved) {
        newWorkers[index].observation = ''; 
    }
    
    setWorkers(newWorkers);
  };

  const handleObservationChange = (index, value) => {
    const newWorkers = [...workers];
    newWorkers[index].observation = value;
    setWorkers(newWorkers);
  };

  // --- GUARDADO (NUEVA LÓGICA CON MODAL) ---
  
  // 1. Botón "Validar" solo abre el modal
  const handleSaveClick = () => {
    if (!selectedProject || workers.length === 0) return;
    setShowConfirmModal(true);
  };

  // 2. Ejecución real del guardado
  const executeSaveTareo = async () => {
    setShowConfirmModal(false); // Cerrar modal
    setSaving(true);
    
    try {
      const recordsToUpsert = workers.map(w => {
        let finalCheckIn = w.checkInTime;
        let finalCheckOut = w.checkOutTime;

        // Si es manual y está presente, asignar horas por defecto
        if (w.origin === 'MANUAL' && w.attendanceStatus === 'Presente') {
            if (!finalCheckIn) finalCheckIn = `${date} 07:00:00`;
            if (!finalCheckOut) finalCheckOut = `${date} 17:00:00`;
        }
        // Si no está presente, limpiar horas
        if (w.attendanceStatus !== 'Presente') {
            finalCheckIn = null;
            finalCheckOut = null;
        }

        return {
          id: w.attendanceId, 
          worker_id: w.id,
          project_name: selectedProject.name,
          date: date,
          status: w.attendanceStatus,
          check_in_time: finalCheckIn,
          check_out_time: finalCheckOut,
          check_in_location: w.checkInLocation || 'Validado por Residente',
          observation: w.observation || '',
          validation_status: 'VALIDADO' 
        };
      });

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'id' }); 
      
      if (error) throw error;

      alert('✅ Asistencia validada correctamente.');
      
      // Recargar IDs para evitar duplicados
      const { data: refreshedData } = await supabase
          .from('attendance')
          .select('id, worker_id')
          .eq('project_name', selectedProject.name)
          .eq('date', date);

      if (refreshedData) {
          setWorkers(prev => prev.map(w => {
              const match = refreshedData.find(r => r.worker_id === w.id);
              return match ? { ...w, attendanceId: match.id, saved: true } : w;
          }));
      }

    } catch (e) {
      console.error(e);
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- HELPERS ---
  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const openMap = (coords) => {
    if (!coords || !coords.includes(',')) return;
    window.open(`http://googleusercontent.com/maps.google.com/3{coords}`, '_blank');
  };

  const getStats = () => {
    const total = workers.length;
    const presentes = workers.filter(w => w.attendanceStatus === 'Presente').length;
    const faltas = workers.filter(w => w.attendanceStatus === 'Falta').length;
    return { total, presentes, faltas };
  };

  const filteredWorkers = workers.filter(w => 
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.document_number.includes(searchTerm)
  );

  const stats = getStats();

  const getStatusStyles = (status) => {
    switch(status) {
        case 'Presente': return 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500';
        case 'Falta': return 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500';
        case 'Permiso': return 'bg-orange-50 text-orange-700 border-orange-200 focus:ring-orange-500';
        case 'Bajada': return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // --- VISTA 1: SELECCIÓN DE PROYECTO ---
  if (!selectedProject) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ClipboardCheck className="text-[#f0c419]" size={32} /> Supervisión de Campo
            </h1>
            <p className="text-slate-500 mt-2">Valida la asistencia, ubicación y fotos del personal en obra.</p>
          </div>
          <div className="bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <Calendar className="text-slate-400" size={18}/>
             <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none text-sm"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(proj => (
            <div 
              key={proj.id} 
              onClick={() => setSelectedProject(proj)}
              className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-[#003366]/20 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] opacity-0 group-hover:opacity-100 transition-opacity"/>
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-blue-50 text-[#003366] rounded-xl group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <Building2 size={24} />
                 </div>
                 <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                    {proj.project_code || 'OBRA'}
                 </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{proj.name}</h3>
              <p className="flex items-center gap-2 text-sm text-slate-500"><MapPin size={14} className="text-[#f0c419]"/> {proj.location || 'Sin ubicación'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- VISTA 2: TABLA DE SUPERVISIÓN ---
  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-slate-500"/>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{selectedProject.name}</h1>
            <p className="text-xs text-slate-500 font-medium">Validación de Asistencia - {date}</p>
          </div>
        </div>
        
        {/* RESUMEN RÁPIDO */}
        <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center min-w-[80px]">
                <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                <span className="text-lg font-bold text-slate-800">{stats.total}</span>
            </div>
            <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-100 flex flex-col items-center min-w-[80px]">
                <span className="text-xs font-bold text-green-600 uppercase">Presentes</span>
                <span className="text-lg font-bold text-green-700">{stats.presentes}</span>
            </div>
            <div className="px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center min-w-[80px]">
                <span className="text-xs font-bold text-red-500 uppercase">Faltas</span>
                <span className="text-lg font-bold text-red-600">{stats.faltas}</span>
            </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Buscador */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Buscar por nombre o DNI..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003366]"
            />
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-400 uppercase">Fecha:</span>
             <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none"/>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4">Trabajador</th>
                <th className="px-6 py-4 text-center">Entrada</th>
                <th className="px-6 py-4 text-center">Salida</th>
                <th className="px-6 py-4 text-center">Evidencia</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="py-20 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Cargando datos...</td></tr>
              ) : filteredWorkers.map((worker, idx) => (
                <tr key={worker.id} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* 1. TRABAJADOR */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {worker.first_name?.[0]}{worker.paternal_surname?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{worker.full_name}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-slate-100 text-slate-500 px-1.5 rounded">{worker.document_number}</span>
                          <span className="text-[#003366] font-semibold">{worker.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. ENTRADA */}
                  <td className="px-6 py-4 text-center">
                    {worker.checkInTime ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded mb-1">
                          {formatTime(worker.checkInTime)}
                        </span>
                        {worker.checkInLocation && worker.checkInLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkInLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                              <MapPin size={10}/> Ver Mapa
                           </button>
                        )}
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </td>

                  {/* 3. SALIDA */}
                  <td className="px-6 py-4 text-center">
                    {worker.checkOutTime ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded mb-1">
                          {formatTime(worker.checkOutTime)}
                        </span>
                        {worker.checkOutLocation && worker.checkOutLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkOutLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                              <MapPin size={10}/> Ver Mapa
                           </button>
                        )}
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </td>

                  {/* 4. EVIDENCIA (FOTOS) */}
                  <td className="px-6 py-4 text-center">
                    {(worker.checkInPhoto || worker.checkOutPhoto) ? (
                      <button 
                        onClick={() => setPhotoModal({ isOpen: true, worker })}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-xs font-bold"
                      >
                        <ImageIcon size={14}/> Ver Fotos
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Sin fotos</span>
                    )}
                  </td>

                  {/* 5. ESTADO (SELECTOR) */}
                  <td className="px-6 py-4 text-center">
                    <div className="relative inline-block w-32">
                        <select
                            value={worker.attendanceStatus}
                            onChange={(e) => handleStatusChange(workers.indexOf(worker), e.target.value)}
                            className={`w-full appearance-none py-1.5 pl-3 pr-8 rounded-lg font-bold text-xs border cursor-pointer outline-none transition-all text-center
                                ${getStatusStyles(worker.attendanceStatus)}`}
                        >
                            <option value="Presente">Presente</option>
                            <option value="Falta">Falta</option>
                            <option value="Permiso">Permiso</option>
                            <option value="Bajada">Bajada</option>
                        </select>
                        <div className={`absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none opacity-50 
                            ${worker.attendanceStatus === 'Presente' ? 'text-green-700' : 
                              worker.attendanceStatus === 'Falta' ? 'text-red-700' : 'text-slate-700'}`}>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                  </td>

                  {/* 6. OBSERVACIONES */}
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      placeholder="Ej. Llegó tarde..."
                      value={worker.observation}
                      onChange={(e) => handleObservationChange(workers.indexOf(worker), e.target.value)}
                      className="w-full bg-transparent border-b border-slate-200 focus:border-[#003366] outline-none text-sm py-1 transition-colors"
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER - Botón para VALIDAR */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
              onClick={handleSaveClick}
              disabled={saving || filteredWorkers.length === 0}
              className="bg-[#003366] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-70 active:scale-95"
            >
              {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
              {saving ? 'Validando...' : 'VALIDAR ASISTENCIA'}
            </button>
        </div>
      </div>

      {/* --- MODAL DE FOTOS --- */}
      <AnimatePresence>
        {photoModal.isOpen && photoModal.worker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPhotoModal({ isOpen: false, worker: null })}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <ImageIcon size={20} className="text-[#003366]"/> 
                  Evidencia: {photoModal.worker.full_name}
                </h3>
                <button onClick={() => setPhotoModal({ isOpen: false, worker: null })} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-100">
                {/* FOTO ENTRADA */}
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100">ENTRADA</span>
                    <span className="text-xs text-slate-400 font-mono">{formatTime(photoModal.worker.checkInTime)}</span>
                  </div>
                  {photoModal.worker.checkInPhoto ? (
                    <div className="aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden relative group">
                      <img src={photoModal.worker.checkInPhoto} alt="Entrada" className="w-full h-full object-cover"/>
                      <a href={photoModal.worker.checkInPhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2">
                        <ExternalLink size={20}/> Abrir Original
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                      <ImageIcon size={40}/>
                      <span className="text-xs mt-2">Sin foto registrada</span>
                    </div>
                  )}
                </div>

                {/* FOTO SALIDA */}
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100">SALIDA</span>
                    <span className="text-xs text-slate-400 font-mono">{formatTime(photoModal.worker.checkOutTime)}</span>
                  </div>
                  {photoModal.worker.checkOutPhoto ? (
                    <div className="aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden relative group">
                      <img src={photoModal.worker.checkOutPhoto} alt="Salida" className="w-full h-full object-cover"/>
                      <a href={photoModal.worker.checkOutPhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2">
                        <ExternalLink size={20}/> Abrir Original
                      </a>
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                      <ImageIcon size={40}/>
                      <span className="text-xs mt-2">Sin foto registrada</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- NUEVO MODAL DE CONFIRMACIÓN (ESTILO PROFESIONAL) --- */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowConfirmModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-center p-8"
            >
              <div className="mx-auto w-20 h-20 bg-blue-50 text-[#003366] rounded-full flex items-center justify-center mb-6">
                <ClipboardCheck size={40} strokeWidth={1.5} />
              </div>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                ¿Validar Asistencia?
              </h3>
              
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Estás a punto de validar el tareo del <strong>{date}</strong> para <strong>{workers.length} trabajadores</strong>. Esta acción sincronizará los datos con RRHH.
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3.5 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={executeSaveTareo}
                  className="flex-1 py-3.5 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 shadow-lg shadow-blue-900/30 transition-all active:scale-95"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default FieldAttendancePage;