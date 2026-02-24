import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Calendar, Save, MapPin, CheckCircle, XCircle, 
  AlertCircle, Search, Users, ClipboardCheck, Loader2,
  Building2, ArrowLeft, Image as ImageIcon,
  ExternalLink, Eye, X, ChevronDown, Coffee, Send, Clock,
  CheckSquare, AlertTriangle, UserCheck, UserX
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

  // Estados de Modales
  const [photoModal, setPhotoModal] = useState({ isOpen: false, worker: null });
  const [validationModal, setValidationModal] = useState({ isOpen: false, worker: null });
  const [confirmActionType, setConfirmActionType] = useState(null); 
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, type: 'success', title: '', message: '', onCloseAction: null 
  });

  // 1. Cargar Proyectos Activos
  useEffect(() => {
    const loadProjects = async () => {
      if (!currentUser) return;
      try {
        const data = await getProjectsForUser(currentUser);
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
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('project_assigned', selectedProject.name.trim()) 
          .eq('status', 'Activo')
          .order('full_name', { ascending: true });

        if (workersError) throw workersError;

        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('project_name', selectedProject.name)
          .eq('date', date);
        
        if (attendanceError) throw attendanceError;

        const mergedList = workersData.map(w => {
          const record = attendanceData.find(a => a.worker_id === w.id);

          let mappedStatus = record ? (record.status || 'Presente') : 'Presente';
          
          // REGLA CLAVE (NOTA 2): Si tiene Ingreso Pendiente, visualmente es TARDANZA
          if (record && record.approval_status === 'Pendiente' && !record.check_out_time) {
              mappedStatus = 'Tardanza'; 
          }

          return {
            ...w,
            attendanceId: record ? record.id : null, 
            attendanceStatus: mappedStatus,
            
            checkInTime: record ? record.check_in_time : null,
            checkInLocation: record ? record.check_in_location : null,
            checkInPhoto: record ? record.check_in_photo : null,

            checkOutTime: record ? record.check_out_time : null,
            checkOutLocation: record ? record.check_out_location : null,
            checkOutPhoto: record ? record.check_out_photo : null,
            
            evidencePhoto: record ? record.evidence_photo : null, // NUEVO: Evidencia fotográfica
            
            isLocationValid: record ? record.is_location_valid : true,
            justificationReason: record ? record.justification_reason : '',
            justificationType: record ? record.justification_type : '',
            overtimeStatus: record ? record.overtime_status : 'Ninguno',
            approvalStatus: record ? record.approval_status : 'Aprobado',

            origin: record && record.check_in_photo ? 'APP' : 'MANUAL',
            observation: record ? (record.observation || '') : '',
            saved: !!record 
          };
        });
        
        setWorkers(mergedList || []);
      } catch (err) {
        console.error("Error cargando personal:", err);
        setStatusModal({
            isOpen: true, type: 'error', title: 'Error de Carga', message: 'No se pudo cargar la lista de trabajadores.'
        });
      } finally {
        setLoading(false);
      }
    };
    loadTeamAndAttendance();
  }, [selectedProject, date]);

  // --- LÓGICA DE INTERACCIÓN Y ESTADOS ---
  const handleStatusChange = (index, newStatus) => {
    const newWorkers = [...workers];
    const worker = newWorkers[index];
    worker.attendanceStatus = newStatus;
    
    if (newStatus === 'Presente') {
        if (!worker.checkInTime) worker.checkInTime = `${date}T07:30:00-05:00`;
        if (!worker.checkOutTime) worker.checkOutTime = `${date}T17:00:00-05:00`;
    } else if (newStatus === 'Falta Justificada') {
        worker.checkInTime = `${date}T07:30:00-05:00`;
        worker.checkOutTime = `${date}T17:00:00-05:00`;
        worker.observation = 'Justificado por Residente - Paga día normal';
    } else if (newStatus === 'Tardanza') {
        // En caso manual, dejamos las horas para que anoten la tardanza, pero cambiamos obs.
        worker.observation = worker.observation || 'Tardanza Injustificada - Debe recuperar horas';
    } else {
        worker.checkInTime = null; worker.checkOutTime = null;
        worker.observation = newStatus === 'Falta' ? 'Inasistencia injustificada' : '';
    }
    
    setWorkers(newWorkers);
  };

  const handleTimeChange = (index, field, timeValue) => {
    const newWorkers = [...workers];
    newWorkers[index][field] = timeValue ? `${date}T${timeValue}:00-05:00` : null;
    
    if (!['Presente', 'Falta Justificada', 'Tardanza'].includes(newWorkers[index].attendanceStatus)) {
        newWorkers[index].attendanceStatus = 'Presente';
    }
    setWorkers(newWorkers);
  };

  const handleObservationChange = (index, value) => {
    const newWorkers = [...workers];
    newWorkers[index].observation = value;
    setWorkers(newWorkers);
  };

  const handleMarkAllPresent = () => {
      const updated = workers.map(w => {
          if (w.origin === 'APP') return w;
          return {
              ...w, attendanceStatus: 'Presente',
              checkInTime: w.checkInTime || `${date}T07:30:00-05:00`,
              checkOutTime: w.checkOutTime || `${date}T17:00:00-05:00`,
              observation: ''
          };
      });
      setWorkers(updated);
  };

  // --- APROBAR / RECHAZAR JUSTIFICACIÓN GENERAL ---
  const processJustification = (workerId, isApproved) => {
     const newWorkers = [...workers];
     const index = newWorkers.findIndex(w => w.id === workerId);
     
     if (index !== -1) {
         const w = newWorkers[index];
         
         if (w.justificationType === 'HORA_EXTRA') {
             if (isApproved) {
                w.overtimeStatus = 'Aprobado'; w.approvalStatus = 'Aprobado'; w.observation += ` [HE APROBADAS]`;
             } else {
                w.overtimeStatus = 'Rechazado'; w.approvalStatus = 'Aprobado'; w.observation += ` [HE RECHAZADAS: Ajustado a 17:00]`;
                w.checkOutTime = `${date}T17:00:00-05:00`;
             }
         } else {
             // Es justificación de Ingreso (Tardanza Justificada/Ubicación) o Salida (Ubicación)
             if (isApproved) {
                 w.approvalStatus = 'Aprobado';
                 w.attendanceStatus = 'Presente'; // Si estaba como Tardanza o Falta, se vuelve Presente
                 w.observation += ` [SOLICITUD APROBADA]`;

                 // --- NOTA 3: SI LO APRUEBA DEBERÁ APARECER COMO HORA DE INGRESO 7:30am ---
                 if (w.justificationType === 'TARDANZA_JUSTIFICADA') {
                     w.checkInTime = `${date}T07:30:00-05:00`;
                 }

             } else {
                 w.approvalStatus = 'Rechazado';
                 
                 // Si se rechaza una tardanza justificada, se vuelve injustificada (Tardanza normal)
                 if (w.justificationType === 'TARDANZA_JUSTIFICADA') {
                     w.attendanceStatus = 'Tardanza';
                     w.observation += ` [JUSTIFICACIÓN RECHAZADA - DEBE RECUPERAR]`;
                 } else {
                     w.attendanceStatus = 'Falta'; // Queda permanentemente como falta injustificada
                     if (!w.checkOutTime) w.checkInTime = null; // Anula la hora de entrada si solo marcó entrada
                     w.observation += ` [SOLICITUD RECHAZADA]`;
                 }
             }
         }
     }
     setWorkers(newWorkers);
     setValidationModal({ isOpen: false, worker: null });
  };

  // --- GUARDADO ---
  const handleSaveClick = (type) => {
    if (!selectedProject || workers.length === 0) return;
    
    const pendingCount = workers.filter(w => w.approvalStatus === 'Pendiente' || w.overtimeStatus === 'Pendiente').length;
    if (type === 'VALIDADO' && pendingCount > 0) {
        setStatusModal({
            isOpen: true, type: 'error', title: 'Existen Pendientes', 
            message: `Tienes ${pendingCount} justificaciones sin evaluar. Apruébalas o recházalas antes de enviar el tareo a RRHH.`
        });
        return;
    }
    setConfirmActionType(type); setShowConfirmModal(true);
  };

  const executeSaveTareo = async () => {
    setShowConfirmModal(false); setSaving(true);
    
    try {
      const statusToSave = confirmActionType === 'VALIDADO' ? 'VALIDADO' : 'BORRADOR';

      const recordsToUpsert = workers.map(w => {
        let finalCheckIn = w.checkInTime;
        let finalCheckOut = w.checkOutTime;

        if (!['Presente', 'Falta Justificada', 'Tardanza'].includes(w.attendanceStatus)) {
            finalCheckIn = null; finalCheckOut = null;
        }

        return {
          id: w.attendanceId || undefined,
          worker_id: w.id, project_name: selectedProject.name, date: date,
          status: w.attendanceStatus, check_in_time: finalCheckIn, check_out_time: finalCheckOut,
          check_in_location: w.checkInLocation || 'Validado por Residente', 
          observation: w.observation || '', validation_status: statusToSave,
          approval_status: w.approvalStatus || 'Aprobado', overtime_status: w.overtimeStatus || 'Ninguno'
          // Nota: La evidencia no se sobrescribe aquí porque solo se actualizan status y observaciones.
        };
      });

      const { data, error } = await supabase.from('attendance').upsert(recordsToUpsert, { onConflict: 'worker_id, date' }).select(); 
      if (error) throw error;

      if (data) {
          const updatedWorkers = [...workers];
          data.forEach(updatedRecord => {
              const index = updatedWorkers.findIndex(w => w.id === updatedRecord.worker_id);
              if (index !== -1) { updatedWorkers[index].attendanceId = updatedRecord.id; updatedWorkers[index].saved = true; }
          });
          setWorkers(updatedWorkers);
      }

      setStatusModal({
        isOpen: true, type: 'success', title: confirmActionType === 'VALIDADO' ? '¡Tareo Enviado!' : 'Guardado',
        message: confirmActionType === 'VALIDADO' ? 'Se ha validado y enviado la asistencia a RRHH.' : 'La asistencia se ha guardado como borrador.'
      });

    } catch (e) {
      setStatusModal({ isOpen: true, type: 'error', title: 'Error al guardar', message: e.message });
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
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
        const parts = formatter.formatToParts(d);
        return `${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}`;
    } catch (e) { return ''; }
  };

  const openMap = (coords) => {
    if (!coords || !coords.includes(',')) return; window.open(`http://googleusercontent.com/maps.google.com/?q=${coords}`, '_blank');
  };

  const getStats = () => {
    const total = workers.length;
    const presentes = workers.filter(w => ['Presente', 'Falta Justificada'].includes(w.attendanceStatus)).length;
    const faltas = workers.filter(w => w.attendanceStatus === 'Falta').length;
    const tardanzas = workers.filter(w => w.attendanceStatus === 'Tardanza').length;
    return { total, presentes, faltas, tardanzas };
  };

  const filteredWorkers = workers.filter(w => w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || w.document_number.includes(searchTerm));
  const stats = getStats();

  const getStatusStyles = (status) => {
    switch(status) {
        case 'Presente': return 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500 font-bold';
        case 'Falta Justificada': return 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500 font-bold';
        case 'Tardanza': return 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500 font-bold';
        case 'Falta': return 'bg-red-50 text-red-700 border-red-200 focus:ring-red-500 font-bold';
        case 'Permiso': return 'bg-orange-50 text-orange-700 border-orange-200 focus:ring-orange-500';
        case 'Bajada': return 'bg-slate-100 text-slate-700 border-slate-300 focus:ring-slate-500';
        default: return 'bg-white text-slate-700 border-slate-200';
    }
  };

  // --- RENDER VISTA 1: SELECCIÓN DE PROYECTO ---
  if (!selectedProject) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight"><ClipboardCheck className="text-[#f0c419]" size={32} /> Tareo de Campo</h1>
            <p className="text-slate-500 mt-2 font-medium">Selecciona una obra para gestionar la asistencia diaria.</p>
          </div>
          <div className="bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <Calendar className="text-slate-400" size={18}/>
             <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none text-sm uppercase cursor-pointer"/>
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
              <div key={proj.id} onClick={() => setSelectedProject(proj)} className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-[#003366]/20 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] opacity-0 group-hover:opacity-100 transition-opacity"/>
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-[#003366] rounded-xl group-hover:bg-[#003366] group-hover:text-white transition-colors"><Building2 size={24} /></div>
                   <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">{proj.project_code || 'OBRA'}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{proj.name}</h3>
                <p className="flex items-center gap-2 text-sm text-slate-500 truncate"><MapPin size={14} className="text-[#f0c419]"/> {proj.location || 'Ubicación pendiente'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- RENDER VISTA 2: TABLA DE ASISTENCIA ---
  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6 animate-in slide-in-from-right duration-300">
      
      {/* HEADER CONTEXTUAL */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-[#003366]"><ArrowLeft size={24} /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Building2 size={20} className="text-blue-600"/> {selectedProject.name}</h1>
            <p className="text-xs text-slate-500 font-medium ml-7">Tareo del día: <span className="text-slate-800 font-bold">{date}</span></p>
          </div>
        </div>
        
        <div className="flex gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <div className="px-5 py-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center min-w-[80px]"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</span><span className="text-xl font-black text-slate-700">{stats.total}</span></div>
            <div className="px-5 py-2 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center min-w-[80px]"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Presentes</span><span className="text-xl font-black text-emerald-700">{stats.presentes}</span></div>
            <div className="px-5 py-2 bg-amber-50 rounded-xl border border-amber-100 flex flex-col items-center min-w-[80px]"><span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Tardanzas</span><span className="text-xl font-black text-amber-700">{stats.tardanzas}</span></div>
            <div className="px-5 py-2 bg-red-50 rounded-xl border border-red-100 flex flex-col items-center min-w-[80px]"><span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Faltas</span><span className="text-xl font-black text-red-600">{stats.faltas}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
        
        {/* BARRA DE HERRAMIENTAS */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" placeholder="Buscar obrero..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"/>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
               <button onClick={handleMarkAllPresent} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors shadow-sm"><CheckSquare size={16}/> Todos Presentes</button>
               <div className="h-8 w-px bg-slate-300 hidden md:block"></div>
               <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase">Fecha:</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-sm font-bold text-slate-700 outline-none cursor-pointer"/>
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
                <th className="px-4 py-4 text-center">Evidencia / Alertas</th>
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
                <tr key={worker.id} className={`transition-colors group ${worker.approvalStatus === 'Pendiente' || worker.overtimeStatus === 'Pendiente' ? 'bg-amber-50/50' : 'hover:bg-blue-50/30'}`}>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm border-2 ring-1 ring-slate-100 ${worker.approvalStatus === 'Pendiente' || worker.overtimeStatus === 'Pendiente' ? 'bg-amber-500 text-white border-white' : 'bg-[#003366] text-white border-white'}`}>
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

                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative group/time">
                            <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/time:text-[#003366] transition-colors"/>
                            <input 
                                type="time"
                                value={getTimeInputValue(worker.checkInTime)}
                                onChange={(e) => handleTimeChange(workers.indexOf(worker), 'checkInTime', e.target.value)}
                                disabled={!['Presente', 'Falta Justificada', 'Tardanza'].includes(worker.attendanceStatus)}
                                className="pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/10 transition-all w-28 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        {worker.checkInLocation && worker.checkInLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkInLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"><MapPin size={10}/> Ver Mapa</button>
                        )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <div className="relative group/time">
                            <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/time:text-[#003366] transition-colors"/>
                            <input 
                                type="time"
                                value={getTimeInputValue(worker.checkOutTime)}
                                onChange={(e) => handleTimeChange(workers.indexOf(worker), 'checkOutTime', e.target.value)}
                                disabled={!['Presente', 'Falta Justificada', 'Tardanza'].includes(worker.attendanceStatus)}
                                className="pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/10 transition-all w-28 text-center disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        {worker.checkOutLocation && worker.checkOutLocation.includes(',') && (
                           <button onClick={() => openMap(worker.checkOutLocation)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"><MapPin size={10}/> Ver Mapa</button>
                        )}
                      </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                        {(worker.checkInPhoto || worker.checkOutPhoto) && (
                        <button onClick={() => setPhotoModal({ isOpen: true, worker })} className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200 text-xs font-bold">
                            <ImageIcon size={14}/> Fotos {worker.evidencePhoto && '(+Evidencia)'}
                        </button>
                        )}
                        
                        {(worker.approvalStatus === 'Pendiente' || worker.overtimeStatus === 'Pendiente') && (
                           <button onClick={() => setValidationModal({ isOpen: true, worker })} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold border border-purple-300 animate-pulse hover:bg-purple-200">
                              <AlertTriangle size={12}/> {worker.checkOutTime ? 'Evaluar Salida' : 'Evaluar Ingreso'}
                           </button>
                        )}

                        {worker.overtimeStatus === 'Aprobado' && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">H.E. Aprobadas</span>}
                        {worker.justificationType === 'OLVIDO' && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Cierre 17:00</span>}
                        {worker.justificationType === 'TARDANZA_INJUSTIFICADA' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded border border-red-200">Tardanza Injustif.</span>}
                        {worker.justificationType === 'TARDANZA_JUSTIFICADA' && worker.approvalStatus === 'Aprobado' && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">Tardanza Justif.</span>}
                        {worker.approvalStatus === 'Rechazado' && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-200">Rechazado</span>}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="relative inline-block w-full max-w-[140px]">
                        <select
                            value={worker.attendanceStatus}
                            onChange={(e) => handleStatusChange(workers.indexOf(worker), e.target.value)}
                            disabled={worker.approvalStatus === 'Pendiente' || worker.overtimeStatus === 'Pendiente'}
                            className={`w-full appearance-none py-2 pl-2 pr-6 rounded-lg text-xs border cursor-pointer outline-none transition-all text-center shadow-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed ${getStatusStyles(worker.attendanceStatus)}`}
                        >
                            <option value="Presente">Presente</option>
                            <option value="Tardanza">Tardanza</option>
                            <option value="Falta Justificada">Falta Justificada</option>
                            <option value="Falta">Falta Injustif.</option>
                            <option value="Permiso">Permiso</option>
                            <option value="Bajada">Bajada</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none opacity-50 text-slate-700"><ChevronDown size={14} /></div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <input type="text" placeholder="Añadir nota..." value={worker.observation} onChange={(e) => handleObservationChange(workers.indexOf(worker), e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#003366] outline-none text-sm py-1 transition-colors text-slate-600 placeholder:text-slate-300"/>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER DE ACCIONES */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-end gap-4 sticky bottom-0 z-20">
            <button onClick={() => handleSaveClick('BORRADOR')} disabled={saving || filteredWorkers.length === 0} className="bg-white text-slate-600 border border-slate-300 px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-sm">
              {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Guardar Borrador
            </button>
            <button onClick={() => handleSaveClick('VALIDADO')} disabled={saving || filteredWorkers.length === 0} className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
              <Send size={20}/> ENVIAR TAREO A RRHH
            </button>
        </div>
      </div>

      {/* MODAL DE FOTOS */}
      <AnimatePresence>
        {photoModal.isOpen && photoModal.worker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPhotoModal({ isOpen: false, worker: null })}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={20} className="text-[#003366]"/> Evidencia de Asistencia: {photoModal.worker.full_name}</h3>
                 <button onClick={() => setPhotoModal({isOpen:false, worker:null})} className="p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
               </div>
               
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100 max-h-[75vh] overflow-y-auto">
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

                  {/* BLOQUE DE EVIDENCIA EXTRA SI EXISTE */}
                  {photoModal.worker.evidencePhoto && (
                      <div className="bg-white p-3 rounded-xl shadow-sm md:col-span-2 mt-2">
                          <p className="font-bold text-xs mb-2 text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded">EVIDENCIA DE JUSTIFICACIÓN / HORAS EXTRAS</p>
                          <div className="aspect-[21/9] bg-slate-200 rounded-lg overflow-hidden relative group">
                              <img src={photoModal.worker.evidencePhoto} className="w-full h-full object-cover"/>
                              <a href={photoModal.worker.evidencePhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"><ExternalLink size={20}/> Abrir Evidencia</a>
                          </div>
                      </div>
                  )}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE VALIDACIÓN DE SOLICITUDES */}
      <AnimatePresence>
        {validationModal.isOpen && validationModal.worker && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setValidationModal({ isOpen: false, worker: null })}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y:0 }} className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-6 text-center border-b border-slate-100 relative bg-purple-50">
                  <div className="w-16 h-16 bg-white text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm"><AlertTriangle size={32} /></div>
                  <h3 className="text-2xl font-bold text-purple-900">Evaluar Solicitud de {validationModal.worker.checkOutTime ? 'Salida' : 'Ingreso'}</h3>
                  <p className="text-purple-700 font-medium text-sm mt-1">{validationModal.worker.full_name}</p>
                  <button onClick={() => setValidationModal({isOpen:false, worker:null})} className="absolute top-4 right-4 p-2 text-purple-400 hover:bg-white rounded-full"><X size={20}/></button>
               </div>
               
               <div className="p-6 bg-slate-50 space-y-4 max-h-[50vh] overflow-y-auto">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Motivo indicado:</p>
                      <p className="text-slate-700 font-medium italic">"{validationModal.worker.justificationReason || 'Sin motivo escrito'}"</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Alerta</p>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${validationModal.worker.justificationType === 'HORA_EXTRA' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {validationModal.worker.justificationType === 'HORA_EXTRA' ? 'Horas Extras' : 
                              (validationModal.worker.justificationType === 'UBICACION' ? 'Ubicación Incorrecta' : 
                              (validationModal.worker.justificationType === 'TARDANZA_JUSTIFICADA' ? 'Tardanza Justificada' : 'Tardanza / Fuera de Hora'))}
                          </span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                          <Clock size={20} className="text-slate-400 mb-1"/>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Hora Marcada</p>
                          <p className="text-lg font-bold text-slate-800">{getTimeInputValue(validationModal.worker.checkOutTime || validationModal.worker.checkInTime) || '--:--'}</p>
                      </div>
                  </div>

                  {/* BLOQUE PARA MOSTRAR LA EVIDENCIA AL RESIDENTE SI FUE ADJUNTA */}
                  {validationModal.worker.evidencePhoto && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Evidencia Adjunta</p>
                          <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group border">
                              <img src={validationModal.worker.evidencePhoto} className="w-full h-full object-cover"/>
                              <a href={validationModal.worker.evidencePhoto} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"><ExternalLink size={20}/> Ver Pantalla Completa</a>
                          </div>
                      </div>
                  )}
               </div>

               <div className="p-6 flex gap-4 bg-white border-t border-slate-100">
                  <button 
                     onClick={() => processJustification(validationModal.worker.id, false)}
                     className="flex-1 py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors flex justify-center items-center gap-2"
                  >
                     <UserX size={18}/> {validationModal.worker.justificationType === 'HORA_EXTRA' ? 'Rechazar H.E.' : 'Rechazar Solicitud'}
                  </button>
                  <button 
                     onClick={() => processJustification(validationModal.worker.id, true)}
                     className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors flex justify-center items-center gap-2"
                  >
                     <UserCheck size={18}/> Aprobar Solicitud
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMACIÓN GLOBAL */}
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