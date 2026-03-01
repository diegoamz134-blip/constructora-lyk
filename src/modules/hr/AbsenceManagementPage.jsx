import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Search, Filter, Plus, 
  FileText, Clock, AlertTriangle, 
  CheckCircle2, HardHat, UserCog, HeartPulse, X, ExternalLink, UserCheck, UserX, Loader2, CheckCircle, XCircle, Eye 
} from 'lucide-react'; // <-- ¡AQUÍ ESTÁ LA CORRECCIÓN! Agregamos "Eye"
import { supabase } from '../../services/supabase';
import AddAbsenceModal from './components/AddAbsenceModal';
import StatusModal from '../../components/common/StatusModal';

const AbsenceManagementPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADOS PARA REVISIÓN DE RRHH (Caso 6)
  const [reviewModal, setReviewModal] = useState({ isOpen: false, absence: null });
  const [processing, setProcessing] = useState(false);
  const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    fetchAbsences();
  }, [activeTab]);

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      let query = supabase.from('absences').select('*').order('created_at', { ascending: false });

      if (activeTab === 'workers') {
        query = supabase
          .from('absences')
          .select(`*, workers!inner(full_name, document_number, category)`)
          .not('worker_id', 'is', null);
      } else {
        query = supabase
          .from('absences')
          .select(`*, employees!inner(full_name, document_number, position)`)
          .not('employee_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE APROBACIÓN RRHH Y CREACIÓN AUTOMÁTICA EN ASISTENCIA ---
  const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let currentDate = new Date(`${startDate}T00:00:00`);
    const lastDate = new Date(`${endDate}T00:00:00`);
    while (currentDate <= lastDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const handleHRApproval = async (isApproved) => {
      const absence = reviewModal.absence;
      setProcessing(true);

      try {
          const newHRStatus = isApproved ? 'Aprobado' : 'Rechazado';
          const overallStatus = isApproved ? 'Aprobado' : 'Rechazado';

          // 1. Actualizar el estado de la solicitud en RRHH
          const { error: updateError } = await supabase
              .from('absences')
              .update({ hr_approval: newHRStatus, status: overallStatus })
              .eq('id', absence.id);

          if (updateError) throw updateError;

          // 2. SI SE APRUEBA Y ES DE UN OBRERO, CREAMOS LA ASISTENCIA AUTOMÁTICAMENTE
          if (isApproved && absence.worker_id) {
              const dates = getDatesInRange(absence.start_date, absence.end_date);
              
              const attendanceRecords = dates.map(date => ({
                  worker_id: absence.worker_id,
                  date: date,
                  project_name: absence.project_name || 'Validado RRHH',
                  status: 'Falta Justificada',
                  check_in_time: `${date}T07:30:00-05:00`,
                  check_out_time: `${date}T17:00:00-05:00`,
                  observation: `[Falta Justificada validada por RRHH: ${absence.absence_type || absence.type}]`,
                  approval_status: 'Aprobado',
                  validation_status: 'VALIDADO',
                  justification_type: 'FALTA_JUSTIFICADA'
              }));

              // Hacemos UPSERT (Insertar o Actualizar si ya existía registro ese día)
              const { error: attendanceError } = await supabase
                  .from('attendance')
                  .upsert(attendanceRecords, { onConflict: 'worker_id, date' });

              if (attendanceError) throw attendanceError;
          }

          setStatusModal({ 
              isOpen: true, 
              type: isApproved ? 'success' : 'error', 
              title: isApproved ? 'Solicitud Aprobada' : 'Solicitud Rechazada', 
              message: isApproved ? 'Se aprobó la solicitud y se generaron los registros de asistencia en el sistema.' : 'La solicitud ha sido rechazada definitivamente.' 
          });

          setReviewModal({ isOpen: false, absence: null });
          fetchAbsences(); // Recargar tabla

      } catch (error) {
          console.error("Error al procesar solicitud:", error);
          alert("Ocurrió un error al procesar la solicitud.");
      } finally {
          setProcessing(false);
      }
  };

  // --- HELPERS DE UI ---
  const getTypeStyle = (type) => {
    if (!type) return 'bg-slate-100 text-slate-700';
    const t = type.toUpperCase();
    if (t.includes('VACACIONES')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (t.includes('MEDICO') || t.includes('MÉDICO')) return 'bg-red-100 text-red-700 border-red-200';
    if (t.includes('PERMISO') || t.includes('HORA')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (t.includes('PATERNIDAD') || t.includes('MATRIMONIO') || t.includes('LUTO')) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getTypeIcon = (type) => {
    if (!type) return <FileText size={14}/>;
    const t = type.toUpperCase();
    if (t.includes('VACACIONES')) return <Calendar size={14}/>;
    if (t.includes('MEDICO') || t.includes('MÉDICO')) return <HeartPulse size={14}/>;
    if (t.includes('PERMISO') || t.includes('HORA')) return <Clock size={14}/>;
    return <FileText size={14}/>;
  };

  const calculateDuration = (start, end) => {
      if (!start || !end) return '-';
      const d1 = new Date(`${start}T00:00:00`);
      const d2 = new Date(`${end}T00:00:00`);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para contar el mismo día
      return `${diffDays} día(s)`;
  };

  const filteredData = absences.filter(item => {
    const person = activeTab === 'workers' ? item.workers : item.employees;
    return person?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="text-red-500" /> Control de Vacaciones y Faltas Justificadas
          </h1>
          <p className="text-slate-500 text-sm">Gestión de ausencias, permisos médicos y programación de vacaciones.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#003366] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all"
        >
          <Plus size={18} /> Registrar Ausencia Manual
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HardHat size={18} /> Obreros (Campo)
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserCog size={18} /> Staff (Oficina)
        </button>
      </div>

      {/* Stats Cards (Resumen Rápido) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Calendar size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{absences.filter(a => (a.absence_type || a.type)?.includes('VACACIONES')).length}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Vacaciones</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-red-50 text-red-600 rounded-xl"><HeartPulse size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{absences.filter(a => (a.absence_type || a.type)?.includes('Médico') || (a.absence_type || a.type)?.includes('MEDICO')).length}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descansos Médicos</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><FileText size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{absences.filter(a => a.status === 'Pendiente' || a.hr_approval === 'Pendiente').length}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes de RRHH</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">{absences.filter(a => (a.absence_type || a.type)?.includes('PERMISO') || (a.absence_type || a.type)?.includes('Cita')).length}</p>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Permisos / Citas</p>
           </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex gap-4 items-center bg-slate-50/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#003366]/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-4 py-4">Tipo Incidencia</th>
                <th className="px-4 py-4 text-center">Fechas / Duración</th>
                <th className="px-4 py-4 text-center">Firma Residente</th>
                <th className="px-4 py-4 text-center">Firma RRHH</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2"/> Cargando registros...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400">No hay ausencias registradas.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const person = activeTab === 'workers' ? item.workers : item.employees;
                  const typeLabel = item.absence_type || item.type || 'Desconocido';
                  const duration = item.total_days ? `${item.total_days} días` : item.total_hours ? `${item.total_hours} hrs` : calculateDuration(item.start_date, item.end_date);

                  return (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{person?.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{person?.document_number} | {person?.category || person?.position}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getTypeStyle(typeLabel)}`}>
                          {getTypeIcon(typeLabel)} {typeLabel.replace('_', ' ')}
                        </span>
                        {item.reason && <p className="text-[10px] text-slate-500 mt-1 max-w-[150px] truncate" title={item.reason}>"{item.reason}"</p>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <p className="text-xs font-bold text-slate-700">{new Date(item.start_date).toLocaleDateString()} {item.end_date && item.end_date !== item.start_date && `- ${new Date(item.end_date).toLocaleDateString()}`}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{duration}</p>
                      </td>
                      
                      {/* ESTADO RESIDENTE */}
                      <td className="px-4 py-4 text-center">
                         {item.boss_approval === 'Aprobado' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold"><CheckCircle2 size={12}/> Aprobado</span>
                         ) : item.boss_approval === 'Rechazado' ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold"><XCircle size={12}/> Rechazado</span>
                         ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold"><Clock size={12}/> Pendiente</span>
                         )}
                      </td>

                      {/* ESTADO RRHH */}
                      <td className="px-4 py-4 text-center">
                         {item.hr_approval === 'Aprobado' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-bold"><CheckCircle2 size={12}/> Aprobado</span>
                         ) : item.hr_approval === 'Rechazado' ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold"><XCircle size={12}/> Rechazado</span>
                         ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold"><Clock size={12}/> Pendiente</span>
                         )}
                      </td>

                      {/* ACCIONES */}
                      <td className="px-6 py-4 text-center">
                         {/* Si el Residente ya aprobó, RRHH puede evaluar */}
                         {item.boss_approval === 'Aprobado' && item.hr_approval === 'Pendiente' ? (
                            <button onClick={() => setReviewModal({ isOpen: true, absence: item })} className="bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors animate-pulse flex items-center gap-1 mx-auto">
                               <AlertTriangle size={14}/> Evaluar
                            </button>
                         ) : item.boss_approval === 'Pendiente' ? (
                             <span className="text-[10px] text-slate-400 font-medium italic">Esperando Residente...</span>
                         ) : (
                            <button onClick={() => setReviewModal({ isOpen: true, absence: item })} className="text-blue-600 hover:underline text-[11px] font-bold flex items-center gap-1 mx-auto">
                               <Eye size={14}/> Ver Detalle
                            </button>
                         )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE EVALUACIÓN RRHH (CASO 6) --- */}
      <AnimatePresence>
        {reviewModal.isOpen && reviewModal.absence && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setReviewModal({ isOpen: false, absence: null })}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y:0 }} className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-slate-100 relative bg-purple-50 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm"><FileText size={28} /></div>
                  <div>
                      <h3 className="text-xl font-bold text-purple-900">Validación de RRHH</h3>
                      <p className="text-purple-700 font-medium text-sm mt-0.5">Solicitud de {reviewModal.absence.absence_type || reviewModal.absence.type}</p>
                  </div>
                  <button onClick={() => setReviewModal({isOpen:false, absence:null})} className="absolute top-6 right-6 p-2 text-purple-400 hover:bg-white rounded-full"><X size={20}/></button>
               </div>
               
               <div className="p-6 bg-slate-50 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Colaborador</p>
                          <p className="font-bold text-slate-800">{activeTab === 'workers' ? reviewModal.absence.workers?.full_name : reviewModal.absence.employees?.full_name}</p>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fechas Solicitadas</p>
                          <p className="font-bold text-slate-800">{reviewModal.absence.start_date} al {reviewModal.absence.end_date || reviewModal.absence.start_date}</p>
                      </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motivo indicado:</p>
                      <p className="text-slate-700 text-sm italic">"{reviewModal.absence.reason || 'Sin motivo escrito'}"</p>
                  </div>

                  {/* Evidencia Adjunta */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Evidencia Documentaria</p>
                      {reviewModal.absence.evidence_photo ? (
                          <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden relative group border">
                              <img src={reviewModal.absence.evidence_photo} className="w-full h-full object-contain bg-slate-900"/>
                              <a href={reviewModal.absence.evidence_photo} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2"><ExternalLink size={20}/> Ver Pantalla Completa</a>
                          </div>
                      ) : (
                          <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-sm text-slate-400">Sin documento adjunto</div>
                      )}
                  </div>
               </div>

               {/* ACCIONES DE RRHH (Solo si está pendiente) */}
               {reviewModal.absence.hr_approval === 'Pendiente' && reviewModal.absence.boss_approval === 'Aprobado' ? (
                   <div className="p-6 flex flex-col gap-3 bg-white border-t border-slate-100">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-2 flex items-start gap-2">
                          <AlertTriangle size={16} className="text-blue-600 shrink-0 mt-0.5"/>
                          <p className="text-[11px] text-blue-800 font-medium leading-tight">Al aprobar esta solicitud, el sistema generará automáticamente la asistencia en modo <strong>"Falta Justificada"</strong> para los días indicados, garantizando su correcto pago en planilla.</p>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={() => handleHRApproval(false)} disabled={processing} className="flex-1 py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                             {processing ? <Loader2 className="animate-spin" size={18}/> : <><UserX size={18}/> Rechazar</>}
                          </button>
                          <button onClick={() => handleHRApproval(true)} disabled={processing} className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                             {processing ? <Loader2 className="animate-spin" size={18}/> : <><CheckCircle size={18}/> Aprobar y Generar Asistencia</>}
                          </button>
                      </div>
                   </div>
               ) : (
                   <div className="p-6 bg-white border-t border-slate-100 text-center">
                       <p className="text-sm font-bold text-slate-500">Esta solicitud ya fue procesada y se encuentra {reviewModal.absence.hr_approval}.</p>
                   </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddAbsenceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAbsences}
        type={activeTab}
      />

      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />
    </div>
  );
};

export default AbsenceManagementPage;