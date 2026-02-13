import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Calendar, Save, MapPin, CheckCircle, XCircle, 
  AlertCircle, Search, Users, ClipboardCheck, Loader2,
  Building2, ArrowLeft, Image as ImageIcon,
  ExternalLink, Eye, X, ChevronDown, Coffee, Send, Clock,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// IMPORTAMOS EL MODAL PERSONALIZADO
import StatusModal from '../../components/common/StatusModal';

// --- IMPORTACIONES PARA FILTRAR PROYECTOS ---
import { getProjectsForUser } from '../../services/projectsService'; 
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

const FieldAttendancePage = () => {
  // Obtenemos el usuario actual para filtrar sus obras
  const { currentUser } = useUnifiedAuth();

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
  
  // Estado para Modal de Confirmación
  const [confirmActionType, setConfirmActionType] = useState(null); 
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Estado para el StatusModal
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success', 
    title: '', 
    message: '',
    onCloseAction: null 
  });

  // 1. Cargar Proyectos Activos
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;

      try {
        const data = await getProjectsForUser(currentUser);
        // Filtramos solo los que están en ejecución
        const activeProjects = data.filter(p => p.status === 'En Ejecución');
        setProjects(activeProjects || []);
      } catch (err) {
        console.error("Error cargando proyectos:", err);
      }
    };
    loadProjects();
  }, [currentUser]);

  // 2. Cargar Cuadrilla y Cruzar con Asistencia
  useEffect(() => {
    if (!selectedProject) {
      setWorkers([]);
      return;
    }
    
    const loadTeamAndAttendance = async () => {
      setLoading(true);
      try {
        // A. Traer trabajadores ASIGNADOS A ESTA OBRA
        // Usamos trim() para asegurar match exacto con lo que guardamos en el modal
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('project_assigned', selectedProject.name.trim()) 
          .eq('status', 'Activo')
          .order('full_name', { ascending: true }); // Orden alfabético

        if (workersError) throw workersError;

        // B. Traer asistencias DE HOY para esta obra
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('project_name', selectedProject.name)
          .eq('date', date);
        
        if (attendanceError) throw attendanceError;

        // C. Merge de datos (Cruzar Trabajadores vs Asistencia Existente)
        const mergedList = workersData.map(w => {
          // Buscamos si ya tiene registro hoy
          const existingRecord = attendanceData.find(a => a.worker_id === w.id);

          return {
            ...w,
            attendanceId: existingRecord ? existingRecord.id : null, 
            // Si ya existe registro, usa ese estado. Si es nuevo, por defecto mostramos "Presente" visualmente pero sin guardar aun
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
        setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Error de Carga',
            message: 'No se pudo cargar la lista de trabajadores.'
        });
      } finally {
        setLoading(false);
      }
    };
    loadTeamAndAttendance();
  }, [selectedProject, date]);

  // --- LÓGICA DE INTERACCIÓN ---

  const handleStatusChange = (index, newStatus) => {
    const newWorkers = [...workers];
    const worker = newWorkers[index];
    
    worker.attendanceStatus = newStatus;
    
    // Si cambia a Presente y no tenía hora, sugerimos hora por defecto para agilizar
    // (Opcional: puedes quitar esto si prefieres que escriban la hora exacta)
    if (newStatus === 'Presente' && !worker.checkInTime) {
        // Hora por defecto: 07:30 AM
        worker.checkInTime = `${date}T07:30:00-05:00`;
    }

    if (newStatus === 'Presente' && !worker.checkOutTime) {
         // Hora salida por defecto: 17:00 PM
         worker.checkOutTime = `${date}T17:00:00-05:00`;
    }

    // Si NO es presente, limpiamos las horas
    if (newStatus !== 'Presente') {
        worker.checkInTime = null;
        worker.checkOutTime = null;
        worker.observation = newStatus === 'Falta' ? 'Inasistencia injustificada' : '';
    }
    
    setWorkers(newWorkers);
  };

  const handleTimeChange = (index, field, timeValue) => {
    const newWorkers = [...workers];
    
    if (timeValue) {
        // Formato ISO con zona horaria Perú (-05:00)
        const fullDateTime = `${date}T${timeValue}:00-05:00`;
        newWorkers[index][field] = fullDateTime;
    } else {
        newWorkers[index][field] = null;
    }

    // Si editamos hora, forzamos estado a "Presente"
    if (newWorkers[index].attendanceStatus !== 'Presente') {
        newWorkers[index].attendanceStatus = 'Presente';
    }

    setWorkers(newWorkers);
  };

  const handleObservationChange = (index, value) => {
    const newWorkers = [...workers];
    newWorkers[index].observation = value;
    setWorkers(newWorkers);
  };

  // --- NUEVA FUNCIÓN: MARCAR TODOS ---
  const handleMarkAllPresent = () => {
      const updated = workers.map(w => {
          // Solo modificamos si no tiene fotos de la APP (respetamos lo que viene de campo real)
          if (w.origin === 'APP') return w;

          return {
              ...w,
              attendanceStatus: 'Presente',
              // Seteamos horas por defecto si están vacías
              checkInTime: w.checkInTime || `${date}T07:30:00-05:00`,
              checkOutTime: w.checkOutTime || `${date}T17:00:00-05:00`,
              observation: ''
          };
      });
      setWorkers(updated);
  };

  // --- GUARDADO ---
  
  const handleSaveClick = (type) => {
    if (!selectedProject || workers.length === 0) return;
    setConfirmActionType(type);
    setShowConfirmModal(true);
  };

  const executeSaveTareo = async () => {
    setShowConfirmModal(false); 
    setSaving(true);
    
    try {
      const statusToSave = confirmActionType === 'VALIDADO' ? 'VALIDADO' : 'BORRADOR';

      const recordsToUpsert = workers.map(w => {
        let finalCheckIn = w.checkInTime;
        let finalCheckOut = w.checkOutTime;

        // Limpieza de seguridad: Si no es presente, no debe haber horas
        if (w.attendanceStatus !== 'Presente') {
            finalCheckIn = null;
            finalCheckOut = null;
        }

        const record = {
          worker_id: w.id,
          project_name: selectedProject.name,
          date: date,
          status: w.attendanceStatus,
          check_in_time: finalCheckIn,
          check_out_time: finalCheckOut,
          check_in_location: w.checkInLocation || 'Validado por Residente', // Marca administrativa
          observation: w.observation || '',
          validation_status: statusToSave 
        };

        // Si ya existe ID (update), lo incluimos
        if (w.attendanceId) {
            record.id = w.attendanceId;
        }

        return record;
      });

      // Guardamos (Upsert) basado en worker_id + date
      const { data, error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'worker_id, date' }) 
        .select(); 
      
      if (error) throw error;

      if (data) {
          // Actualizamos estado local
          const updatedWorkers = [...workers];
          data.forEach(updatedRecord => {
              const index = updatedWorkers.findIndex(w => w.id === updatedRecord.worker_id);
              if (index !== -1) {
                  updatedWorkers[index].attendanceId = updatedRecord.id;
                  updatedWorkers[index].saved = true;
              }
          });
          setWorkers(updatedWorkers);
      }

      const isValidation = statusToSave === 'VALIDADO';
      
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: isValidation ? '¡Tareo Enviado!' : 'Guardado',
        message: isValidation 
          ? `Se ha validado y enviado la asistencia de ${workers.length} trabajadores a Oficina Técnica/RRHH.`
          : 'La asistencia se ha guardado como borrador.',
      });

    } catch (e) {
      console.error(e);
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error al guardar',
        message: e.message || 'No se pudo procesar la solicitud.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseStatusModal = () => {
      const action = statusModal.onCloseAction;
      setStatusModal({ ...statusModal, isOpen: false });
      if (action) action();
  };

  // --- HELPERS DE UI ---
  const getTimeInputValue = (isoString) => {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        // Ajustamos visualización a hora local
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Lima',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(d);
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        
        return `${hour}:${minute}`;
    } catch (e) {
        return '';
    }
  };

  const openMap = (coords) => {
    if (!coords || !coords.includes(',')) return;
    window.open(`http://maps.google.com/maps?q=${coords}`, '_blank');
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
        case 'Presente': return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500 font-bold';
        case 'Falta': return 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500 font-bold';
        case 'Permiso': return 'bg-orange-50 text-orange-700 border-orange-200 focus:ring-orange-500';
        case 'Bajada': return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500';
        default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // --- RENDER ---
  
  // VISTA 1: SELECCIÓN DE PROYECTO
  if (!selectedProject) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
              <ClipboardCheck className="text-[#f0c419]" size={32} /> Tareo de Campo
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Selecciona una obra para gestionar la asistencia diaria.</p>
          </div>
          <div className="bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <Calendar className="text-slate-400" size={18}/>
             <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none text-sm uppercase"
             />
          </div>
        </div>

        {projects.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Building2 className="mx-auto text-slate-200 mb-4" size={64}/>
              <h3 className="text-xl font-bold text-slate-400">No tienes obras activas asignadas</h3>
              <p className="text-slate-400 text-sm mt-2">Contacta a RRHH para que te asignen a un proyecto.</p>
           </div>
        ) : (
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
                <p className="flex items-center gap-2 text-sm text-slate-500 truncate">
                    <MapPin size={14} className="text-[#f0c419]"/> {proj.location || 'Ubicación pendiente'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // VISTA 2: TABLA DE ASISTENCIA
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 animate-in slide-in-from-right duration-300">
      
      {/* HEADER CONTEXTUAL */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-[#003366]">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600"/> {selectedProject.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium ml-7">Tareo del día: <span className="text-slate-800 font-bold">{date}</span></p>
          </div>
        </div>
        
        {/* RESUMEN ESTADÍSTICO */}
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center min-w-[90px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-slate-700">{stats.total}</span>
            </div>
            <div className="px-5 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center min-w-[90px]">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Presentes</span>
                <span className="text-xl font-black text-emerald-700">{stats.presentes}</span>
            </div>
            <div className="px-5 py-2 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center min-w-[90px]">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Faltas</span>
                <span className="text-xl font-black text-red-600">{stats.faltas}</span>
            </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        
        {/* BARRA DE HERRAMIENTAS */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              type="text" 
              placeholder="Buscar obrero..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
               <button 
                  onClick={handleMarkAllPresent}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm"
               >
                   <CheckSquare size={16}/> Todos Presentes
               </button>
               <div className="h-8 w-px bg-slate-300 hidden md:block"></div>
               <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Fecha:</span>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="text-sm font-bold text-slate-700 outline-none cursor-pointer"
                  />
               </div>
          </div>
        </div>

        {/* TABLA DE TRABAJADORES */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase sticky top-0 z-10 shadow-sm tracking-wider">
              <tr>
                <th className="px-6 py-4">Obrero</th>
                <th className="px-4 py-4 text-center">Entrada</th>
                <th className="px-4 py-4 text-center">Salida</th>
                <th className="px-4 py-4 text-center">Evidencia</th>
                <th className="px-4 py-4 text-center w-40">Estado</th>
                <th className="px-6 py-4">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="py-20 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2 text-[#003366]"/> Cargando cuadrilla...</td></tr>
              ) : filteredWorkers.length === 0 ? (
                <tr><td colSpan="6" className="py-20 text-center text-slate-400 italic">No se encontraron trabajadores asignados a esta obra.</td></tr>
              ) : filteredWorkers.map((worker) => (
                <tr key={worker.id} className="hover:bg-blue-50/30 transition-colors group">
                  
                  {/* 1. OBRERO */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border-2 border-white ring-1 ring-slate-100">
                        {worker.first_name?.[0]}{worker.paternal_surname?.[0]}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{worker.full_name}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{worker.document_number}</span>
                          <span className="text-[#003366] font-semibold opacity-80">{worker.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. ENTRADA */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative group/time">
                            <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/time:text-[#003366] transition-colors"/>
                            <input 
                                type="time"
                                value={getTimeInputValue(worker.checkInTime)}
                                onChange={(e) => handleTimeChange(workers.indexOf(worker), 'checkInTime', e.target.value)}
                                disabled={worker.attendanceStatus !== 'Presente'}
                                className="pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/10 transition-all w-28 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        {worker.checkInLocation && worker.checkInLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkInLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                              <MapPin size={10}/> Ver Mapa
                           </button>
                        )}
                    </div>
                  </td>

                  {/* 3. SALIDA */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative group/time">
                            <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/time:text-[#003366] transition-colors"/>
                            <input 
                                type="time"
                                value={getTimeInputValue(worker.checkOutTime)}
                                onChange={(e) => handleTimeChange(workers.indexOf(worker), 'checkOutTime', e.target.value)}
                                disabled={worker.attendanceStatus !== 'Presente'}
                                className="pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/10 transition-all w-28 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        {worker.checkOutLocation && worker.checkOutLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkOutLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                              <MapPin size={10}/> Ver Mapa
                           </button>
                        )}
                      </div>
                  </td>

                  {/* 4. EVIDENCIA */}
                  <td className="px-4 py-4 text-center">
                    {(worker.checkInPhoto || worker.checkOutPhoto) ? (
                      <button 
                        onClick={() => setPhotoModal({ isOpen: true, worker })}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-xs font-bold"
                      >
                        <ImageIcon size={14}/> Fotos
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-medium">--</span>
                    )}
                  </td>

                  {/* 5. ESTADO */}
                  <td className="px-4 py-4 text-center">
                    <div className="relative inline-block w-32">
                        <select
                            value={worker.attendanceStatus}
                            onChange={(e) => handleStatusChange(workers.indexOf(worker), e.target.value)}
                            className={`w-full appearance-none py-2 pl-3 pr-8 rounded-lg text-xs border cursor-pointer outline-none transition-all text-center shadow-sm uppercase tracking-wide
                                ${getStatusStyles(worker.attendanceStatus)}`}
                        >
                            <option value="Presente">Presente</option>
                            <option value="Falta">Falta</option>
                            <option value="Permiso">Permiso</option>
                            <option value="Bajada">Bajada</option>
                        </select>
                        <div className={`absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none opacity-50 
                            ${worker.attendanceStatus === 'Presente' ? 'text-emerald-800' : 'text-slate-700'}`}>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                  </td>

                  {/* 6. OBSERVACIONES */}
                  <td className="px-6 py-4">
                    <input 
                      type="text" 
                      placeholder="Añadir nota..."
                      value={worker.observation}
                      onChange={(e) => handleObservationChange(workers.indexOf(worker), e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#003366] outline-none text-sm py-1 transition-colors text-slate-600 placeholder:text-slate-300"
                    />
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER DE ACCIONES */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-end gap-4 sticky bottom-0 z-20">
            <button 
              onClick={() => handleSaveClick('BORRADOR')}
              disabled={saving || filteredWorkers.length === 0}
              className="bg-white text-slate-600 border border-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-sm"
            >
              {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
              <span>Guardar Borrador</span>
            </button>

            <button 
              onClick={() => handleSaveClick('VALIDADO')}
              disabled={saving || filteredWorkers.length === 0}
              className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <Send size={20}/>
              <span>ENVIAR TAREO A RRHH</span>
            </button>
        </div>
      </div>

      {/* MODAL DE FOTOS */}
      <AnimatePresence>
        {photoModal.isOpen && photoModal.worker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPhotoModal({ isOpen: false, worker: null })}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={20} className="text-[#003366]"/> Evidencia: {photoModal.worker.full_name}</h3>
                 <button onClick={() => setPhotoModal({isOpen:false, worker:null})} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
               </div>
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100">
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                      <p className="font-bold text-xs mb-2 text-green-700 bg-green-50 inline-block px-2 py-1 rounded">ENTRADA</p>
                      {photoModal.worker.checkInPhoto ? (
                        <div className="aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden relative group">
                            <img src={photoModal.worker.checkInPhoto} className="w-full h-full object-cover"/>
                            <a href={photoModal.worker.checkInPhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"><ExternalLink size={20}/> Abrir</a>
                        </div>
                      ) : <div className="h-64 bg-slate-50 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed rounded-lg">Sin foto</div>}
                  </div>
                  <div className="bg-white p-3 rounded-xl shadow-sm">
                      <p className="font-bold text-xs mb-2 text-red-700 bg-red-50 inline-block px-2 py-1 rounded">SALIDA</p>
                      {photoModal.worker.checkOutPhoto ? (
                        <div className="aspect-[3/4] bg-slate-200 rounded-lg overflow-hidden relative group">
                            <img src={photoModal.worker.checkOutPhoto} className="w-full h-full object-cover"/>
                            <a href={photoModal.worker.checkOutPhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"><ExternalLink size={20}/> Abrir</a>
                        </div>
                      ) : <div className="h-64 bg-slate-50 flex items-center justify-center text-xs text-slate-400 border-2 border-dashed rounded-lg">Sin foto</div>}
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMACIÓN */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}/>
             <motion.div initial={{opacity:0, scale:0.9, y:20}} animate={{opacity:1, scale:1, y:0}} className="bg-white rounded-[2rem] p-8 relative z-10 max-w-sm w-full text-center shadow-2xl">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${confirmActionType === 'VALIDADO' ? 'bg-blue-50 text-[#003366]' : 'bg-slate-100 text-slate-500'}`}>
                    {confirmActionType === 'VALIDADO' ? <ClipboardCheck size={40}/> : <Save size={40}/>}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{confirmActionType === 'VALIDADO' ? '¿Enviar a RRHH?' : '¿Guardar Borrador?'}</h3>
                <p className="text-slate-500 text-sm mb-8">
                    {confirmActionType === 'VALIDADO' 
                        ? 'Al enviar, la asistencia será procesada para planilla. Asegúrate de que todo esté correcto.' 
                        : 'Se guardarán los cambios actuales para que puedas continuar más tarde.'}
                </p>
                <div className="flex gap-3">
                    <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition">Cancelar</button>
                    <button onClick={executeSaveTareo} className={`flex-1 py-3 rounded-xl text-white font-bold shadow-lg transition ${confirmActionType === 'VALIDADO' ? 'bg-[#003366] hover:bg-blue-900' : 'bg-slate-600 hover:bg-slate-700'}`}>Confirmar</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={handleCloseStatusModal}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />

    </div>
  );
};

export default FieldAttendancePage;