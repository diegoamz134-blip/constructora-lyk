import React, { useState, useEffect } from 'react';
import { 
  X, Search, User, MapPin, CheckCircle2, Save, RefreshCw, 
  ChevronLeft, ChevronRight, AlertTriangle, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Servicios y Componentes
import { getStaffWithSedePaginated, assignStaffToSede, removeStaffFromSede, getSedes } from '../../../services/sedesService';
import StatusModal from '../../../components/common/StatusModal'; // Tu modal de éxito

const AssignStaffToSedeModal = ({ isOpen, onClose, sede }) => {
  // Datos
  const [staffList, setStaffList] = useState([]);
  const [allSedes, setAllSedes] = useState([]); 
  
  // Paginación y Búsqueda
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10; // Cantidad por página

  // Acciones y Modales
  const [processingId, setProcessingId] = useState(null); 
  const [derivingEmployeeId, setDerivingEmployeeId] = useState(null);
  const [targetSedeId, setTargetSedeId] = useState("");
  
  // Estados para Modales Personalizados
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, employee: null, type: '' }); // type: 'remove' | 'derive'

  // Reiniciar al abrir
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchTerm('');
      fetchData(1, '');
      fetchSedesList();
    }
  }, [isOpen]);

  // Efecto para buscar con delay (debounce) o al cambiar página
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchData(page, searchTerm);
    }, 500); // Espera 500ms antes de buscar
    return () => clearTimeout(timer);
  }, [page, searchTerm]);

  const fetchSedesList = async () => {
    try {
      const sedes = await getSedes();
      setAllSedes(sedes || []);
    } catch (error) {
      console.error("Error cargando lista de sedes select:", error);
    }
  };

  const fetchData = async (currentPage, search) => {
    setLoading(true);
    try {
      const { data, total } = await getStaffWithSedePaginated(currentPage, pageSize, search);
      setStaffList(data || []);
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES DE ACCIÓN ---

  const handleAssign = async (employee) => {
    setProcessingId(employee.id);
    try {
      await assignStaffToSede(employee.id, sede.id);
      showNotification('success', 'Asignado', `${employee.full_name} asignado correctamente.`);
      refreshCurrentPage(); // Recargar datos
    } catch (error) {
      showNotification('error', 'Error', 'No se pudo asignar al personal.');
    } finally {
      setProcessingId(null);
    }
  };

  // Prepara la confirmación para remover
  const requestRemove = (employee) => {
    setConfirmDialog({ isOpen: true, employee, type: 'remove' });
  };

  // Ejecuta la remoción (llamado desde el modal de confirmación)
  const executeRemove = async () => {
    const emp = confirmDialog.employee;
    if (!emp) return;
    
    setProcessingId(emp.id);
    setConfirmDialog({ isOpen: false, employee: null, type: '' }); // Cerrar modal confirmación

    try {
      await removeStaffFromSede(emp.id);
      showNotification('success', 'Removido', `${emp.full_name} quitado de la sede.`);
      refreshCurrentPage();
    } catch (error) {
      showNotification('error', 'Error', 'No se pudo remover al personal.');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDerivation = async (employee) => {
    if(!targetSedeId) return;
    setProcessingId(employee.id);
    try {
      await assignStaffToSede(employee.id, targetSedeId);
      const targetSedeName = allSedes.find(s => String(s.id) === String(targetSedeId))?.name;
      showNotification('success', 'Derivado', `${employee.full_name} movido a ${targetSedeName}.`);
      
      setDerivingEmployeeId(null);
      setTargetSedeId("");
      refreshCurrentPage();
    } catch (error) {
      showNotification('error', 'Error', 'No se pudo derivar.');
    } finally {
      setProcessingId(null);
    }
  };

  const refreshCurrentPage = () => fetchData(page, searchTerm);

  const showNotification = (type, title, message) => {
    setNotification({ isOpen: true, type, title, message });
  };

  // Filtros visuales sobre la página actual
  const staffInThisSede = staffList.filter(emp => String(emp.sede_id) === String(sede?.id));
  const otherStaff = staffList.filter(emp => String(emp.sede_id) !== String(sede?.id));

  if (!isOpen || !sede) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[50] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="text-[#003366]" /> Personal en: {sede.name}
              </h2>
              <p className="text-slate-500 text-sm">Gestión de personal asignado.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500 transition">
              <X size={24} />
            </button>
          </div>

          {/* Buscador */}
          <div className="p-4 border-b border-slate-100 bg-white flex gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por nombre o cargo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // Resetear a pag 1 al buscar
                }}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none"
              />
            </div>
            <button onClick={refreshCurrentPage} className="p-3 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200" title="Recargar">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Lista Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
            {loading ? (
              <div className="space-y-4">
                 {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse"/>)}
              </div>
            ) : (
              <>
                {/* SECCIÓN 1: EN ESTA SEDE */}
                {staffInThisSede.length > 0 && (
                  <div className="bg-white p-1 rounded-xl border border-emerald-100 shadow-sm mb-4">
                      <div className="bg-emerald-50/50 p-3 rounded-lg border-b border-emerald-100">
                        <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 size={16}/> Asignados Aquí
                        </h3>
                      </div>
                      <div className="p-2 space-y-2">
                          {staffInThisSede.map(emp => (
                            <div key={emp.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                              <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100">
                                    {emp.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : <User size={16} className="text-slate-400"/>}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-700 text-sm">{emp.full_name}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{emp.position || 'Sin cargo'}</p>
                                  </div>
                              </div>
                              
                              {/* Acciones */}
                              {derivingEmployeeId === emp.id ? (
                                  <div className="flex items-center gap-2 animate-in slide-in-from-right-5">
                                      <select className="text-xs p-1.5 border rounded-lg w-32 outline-none focus:border-blue-500" value={targetSedeId} onChange={(e)=>setTargetSedeId(e.target.value)}>
                                          <option value="">Destino...</option>
                                          {allSedes.filter(s => String(s.id) !== String(sede.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                      </select>
                                      <button onClick={()=>confirmDerivation(emp)} className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg"><Save size={14}/></button>
                                      <button onClick={()=>setDerivingEmployeeId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded-lg"><X size={14}/></button>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                    <button onClick={()=>{setDerivingEmployeeId(emp.id); setTargetSedeId("")}} className="text-xs bg-blue-50 text-blue-600 px-2 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors">Derivar</button>
                                    <button onClick={()=>requestRemove(emp)} className="text-xs bg-red-50 text-red-600 px-2 py-1.5 rounded-lg font-bold hover:bg-red-100 transition-colors">Quitar</button>
                                  </div>
                              )}
                            </div>
                          ))}
                      </div>
                  </div>
                )}

                {/* SECCIÓN 2: OTROS (Pagina actual) */}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">Disponible / Otras Sedes</h3>
                  <div className="space-y-2">
                      {otherStaff.length === 0 && <div className="text-center text-slate-400 text-sm italic py-4">No hay personal disponible en esta página.</div>}
                      {otherStaff.map(emp => (
                        <div key={emp.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
                                  {emp.avatar_url ? <img src={emp.avatar_url} className="w-full h-full object-cover"/> : <User size={14}/>}
                              </div>
                              <div>
                                <p className="font-bold text-slate-700 text-xs">{emp.full_name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">{emp.position}</span>
                                  {emp.sedes && <span className="text-[9px] bg-orange-50 text-orange-600 px-1 rounded border border-orange-100 flex items-center gap-0.5"><MapPin size={8}/> {emp.sedes.name}</span>}
                                </div>
                              </div>
                          </div>
                          <button onClick={()=>handleAssign(emp)} disabled={processingId===emp.id} className="text-xs bg-slate-100 hover:bg-[#003366] hover:text-white text-slate-600 px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-50">
                              {processingId===emp.id ? '...' : 'Traer Aquí'}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer de Paginación */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
             <button 
               onClick={() => setPage(p => Math.max(1, p - 1))} 
               disabled={page === 1 || loading}
               className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
             >
               <ChevronLeft size={20}/>
             </button>
             <span className="text-xs font-bold text-slate-500">
                Página {page} de {totalPages || 1}
             </span>
             <button 
               onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
               disabled={page === totalPages || loading}
               className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
             >
               <ChevronRight size={20}/>
             </button>
          </div>

        </div>
      </div>

      {/* --- MODALES AUXILIARES --- */}

      {/* 1. Status Modal (Éxito/Error) */}
      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      {/* 2. Modal de Confirmación Personalizado (Estilo bonito) */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                 className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-100"
              >
                  <div className="flex flex-col items-center text-center gap-3">
                     <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-1">
                        <Trash2 size={24} />
                     </div>
                     <h3 className="text-lg font-bold text-slate-800">¿Estás seguro?</h3>
                     <p className="text-sm text-slate-500">
                        Vas a quitar a <span className="font-bold text-slate-700">{confirmDialog.employee?.full_name}</span> de esta sede.
                        Quedará como "Sin Sede".
                     </p>
                     
                     <div className="grid grid-cols-2 gap-3 w-full mt-4">
                        <button 
                          onClick={() => setConfirmDialog({ isOpen: false, employee: null })}
                          className="py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-50 border border-slate-200 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={executeRemove}
                          className="py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                        >
                          Sí, quitar
                        </button>
                     </div>
                  </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssignStaffToSedeModal;