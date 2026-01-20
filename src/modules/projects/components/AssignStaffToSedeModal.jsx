import React, { useState, useEffect } from 'react';
import { X, Search, User, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getStaffWithSede, assignStaffToSede, removeStaffFromSede } from '../../../services/sedesService';

const AssignStaffToSedeModal = ({ isOpen, onClose, sede }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null); // Para mostrar carga en un botón específico

  useEffect(() => {
    if (isOpen) {
      fetchStaff();
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const data = await getStaffWithSede();
      setStaffList(data);
    } catch (error) {
      console.error("Error cargando personal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (employee) => {
    setProcessingId(employee.id);
    try {
      await assignStaffToSede(employee.id, sede.id);
      // Actualizamos la lista localmente para reflejar el cambio rápido
      setStaffList(prev => prev.map(item => 
        item.id === employee.id 
          ? { ...item, sede_id: sede.id, sedes: { name: sede.name } } 
          : item
      ));
    } catch (error) {
      alert("Error al asignar personal");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (employee) => {
    if(!window.confirm(`¿Quitar a ${employee.full_name} de esta sede?`)) return;

    setProcessingId(employee.id);
    try {
      await removeStaffFromSede(employee.id);
      setStaffList(prev => prev.map(item => 
        item.id === employee.id 
          ? { ...item, sede_id: null, sedes: null } 
          : item
      ));
    } catch (error) {
      alert("Error al remover personal");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtros de búsqueda
  const filteredStaff = staffList.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Separar en dos grupos: Asignados a ESTA sede vs El resto
  const staffInThisSede = filteredStaff.filter(emp => emp.sede_id === sede?.id);
  const otherStaff = filteredStaff.filter(emp => emp.sede_id !== sede?.id);

  if (!isOpen || !sede) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="text-[#003366]" /> Gestionar Personal - {sede.name}
            </h2>
            <p className="text-slate-500 text-sm">Asigna o mueve personal administrativo a esta sede.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500 transition">
            <X size={24} />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar personal por nombre o cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none transition-all"
            />
          </div>
        </div>

        {/* Lista Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
          
          {loading ? (
             <div className="text-center py-10 text-slate-400">Cargando personal...</div>
          ) : (
            <>
              {/* SECCIÓN 1: PERSONAL EN ESTA SEDE */}
              {staffInThisSede.length > 0 && (
                <div>
                   <h3 className="text-xs font-bold text-emerald-600 uppercase mb-3 flex items-center gap-2">
                     <CheckCircle2 size={14}/> Asignados a esta Sede ({staffInThisSede.length})
                   </h3>
                   <div className="space-y-2">
                      {staffInThisSede.map(emp => (
                        <div key={emp.id} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between group">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                {emp.photo_url ? <img src={emp.photo_url} alt="" className="w-full h-full object-cover"/> : <User size={20} className="text-slate-400"/>}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{emp.full_name}</p>
                                <p className="text-xs text-slate-500">{emp.position || 'Sin cargo'}</p>
                              </div>
                           </div>
                           <button 
                             onClick={() => handleRemove(emp)}
                             disabled={processingId === emp.id}
                             className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                           >
                             {processingId === emp.id ? '...' : 'Remover'}
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
              )}

              {/* SECCIÓN 2: OTRO PERSONAL (DISPONIBLE O EN OTRAS SEDES) */}
              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 mt-2 flex items-center gap-2">
                   <User size={14}/> Otro Personal ({otherStaff.length})
                 </h3>
                 <div className="space-y-2">
                    {otherStaff.length === 0 && <p className="text-sm text-slate-400 italic">No se encontró más personal.</p>}
                    
                    {otherStaff.map(emp => (
                      <div key={emp.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden text-slate-400">
                              {emp.photo_url ? <img src={emp.photo_url} alt="" className="w-full h-full object-cover"/> : <User size={20}/>}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 text-sm">{emp.full_name}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">{emp.position || 'Sin cargo'}</span >
                                {emp.sedes ? (
                                  <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1 border border-orange-100" title="Actualmente en otra sede">
                                    <MapPin size={10}/> {emp.sedes.name}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Sin Sede</span>
                                )}
                              </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleAssign(emp)}
                           disabled={processingId === emp.id}
                           className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                         >
                           {processingId === emp.id ? '...' : <><ArrowRight size={14}/> Asignar</>}
                         </button>
                      </div>
                    ))}
                 </div>
              </div>

            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 text-right text-xs text-slate-400">
           Los cambios se guardan automáticamente.
        </div>

      </div>
    </div>
  );
};

export default AssignStaffToSedeModal;