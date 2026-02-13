import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, 
  Edit, Trash2, User, Building2, Phone, 
  HardHat, Activity, Users, Hammer, AlertTriangle 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// Modales Staff
import AddEmployeeModal from './AddEmployeeModal';
import AssignProjectsModal from './components/AssignProjectsModal'; 
import EmployeeDocumentsModal from './components/EmployeeDocumentsModal'; 
import ChangeStatusModal from './components/ChangeStatusModal'; 

// Modales Obreros
import AddWorkerModal from './AddWorkerModal';

import StatusModal from '../../components/common/StatusModal';

const HumanResourcesPage = () => {
  // Estado de Navegación (Tabs)
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'workers'

  // Datos
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);         
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false); 
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false); 
  
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // Modal de Confirmación de Eliminación
  const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null, name: '' });

  // Cargar datos al cambiar de pestaña
  useEffect(() => {
    fetchData();
    setSearchTerm(''); 
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let data, error;
      
      if (activeTab === 'staff') {
        // CONSULTA STAFF
        const response = await supabase
          .from('employees')
          .select(`
            *, 
            sedes ( name ),
            project_assignments (
              projects ( name )
            )
          `)
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      } else {
        // CONSULTA OBREROS
        const response = await supabase
          .from('workers')
          .select('*')
          .order('created_at', { ascending: false });
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      setListData(data || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADORES ---
  const handleEdit = (e, person) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedPerson(person);
    if (activeTab === 'staff') {
       setIsAddModalOpen(true);
    } else {
       setIsAddWorkerModalOpen(true);
    }
  };

  const requestDelete = (e, id, name) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    setConfirmDeleteModal({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    const idToDelete = confirmDeleteModal.id;
    if (!idToDelete) return;
    setConfirmDeleteModal({ isOpen: false, id: null, name: '' });

    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      if (activeTab === 'staff') {
        await supabase.from('attendance').delete().eq('employee_id', idToDelete);
        await supabase.from('project_assignments').delete().eq('employee_id', idToDelete);
      } else {
        await supabase.from('attendance').delete().eq('worker_id', idToDelete).catch(() => {});
      }

      const { error } = await supabase.from(table).delete().eq('id', idToDelete);
      if (error) throw error;
      
      setNotification({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Registro eliminado correctamente.' });
      fetchData(); 
    } catch (error) {
      console.error('Error executing delete:', error);
      let errorMsg = 'No se pudo eliminar.';
      if (error.code === '23503') errorMsg = 'El usuario tiene registros vinculados activos.';
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: errorMsg });
    }
  };

  const handleAssignProject = (e, person) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedPerson(person);
    setIsProjectModalOpen(true);
  };

  const handleChangeStatus = (e, person) => {
    if(e) { e.preventDefault(); e.stopPropagation(); }
    setSelectedPerson(person);
    setIsStatusModalOpen(true);
  };

  // --- HELPER PARA MOSTRAR OBRAS ---
  const getProjectDisplayInfo = (item) => {
      if (activeTab === 'staff') {
          const assignments = item.project_assignments || [];
          if (assignments.length > 0) {
              const firstName = assignments[0]?.projects?.name || 'Sin Nombre';
              const extra = assignments.length > 1 ? assignments.length - 1 : 0;
              return { name: firstName, extraCount: extra, isAssigned: true };
          }
          return { name: 'Sin Asignar', extraCount: 0, isAssigned: false };
      } else {
          const hasProject = item.project_assigned && item.project_assigned !== 'Sin asignar';
          return { 
              name: hasProject ? item.project_assigned : 'Sin Asignar', 
              extraCount: 0, 
              isAssigned: hasProject 
          };
      }
  };

  // --- FILTROS ---
  const filteredList = listData.filter(item => {
    const term = searchTerm.toLowerCase();
    const fullName = item.full_name?.toLowerCase() || '';
    const docNum = item.document_number || '';
    const pos = (activeTab === 'staff' ? item.position : item.category)?.toLowerCase() || '';
    return fullName.includes(term) || docNum.includes(term) || pos.includes(term);
  });

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER Y TABS */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de RR.HH.</h1>
            <p className="text-slate-500 font-medium">Administración de personal y contratos.</p>
          </div>
          
          <button 
            type="button"
            onClick={() => { 
                setSelectedPerson(null); 
                if (activeTab === 'staff') setIsAddModalOpen(true);
                else setIsAddWorkerModalOpen(true);
            }}
            className="bg-[#003366] text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={20} /> 
            {activeTab === 'staff' ? 'Nuevo Staff' : 'Nuevo Obrero'}
          </button>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl w-fit self-start md:self-auto border border-slate-200">
           <button
             onClick={() => setActiveTab('staff')}
             className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'staff' ? 'bg-white text-[#003366] shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <Users size={18}/> Staff / Administrativo
           </button>
           <button
             onClick={() => setActiveTab('workers')}
             className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                activeTab === 'workers' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             <Hammer size={18}/> Obreros / Construcción
           </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder={`Buscar ${activeTab === 'staff' ? 'administrativo' : 'obrero'} por nombre, DNI...`} 
            className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button type="button" className="p-3 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors border-l border-slate-100">
          <Filter size={20} />
        </button>
      </div>

      {/* TABLA UNIFICADA */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4 min-w-[250px]">Nombre Completo</th>
                <th className="px-4 py-4">DNI / CE</th>
                <th className="px-4 py-4">Cargo</th>
                <th className="px-4 py-4">Oficina / Sede</th>
                <th className="px-4 py-4">F. Ingreso</th>
                <th className="px-4 py-4 text-center">Estado</th>
                <th className="px-4 py-4">Distrito</th>
                <th className="px-4 py-4">Celular</th>
                <th className="px-4 py-4 text-center">Obra Asignada</th>
                <th className="px-4 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366]"></div>
                       <span>Cargando datos...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-slate-400 italic">No se encontraron registros.</td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isStaff = activeTab === 'staff';
                  
                  const cargo = isStaff ? (item.position || 'Sin Cargo') : (item.category || 'Peón');
                  const oficina = isStaff 
                        ? (item.sedes?.name || <span className="text-slate-400 italic text-xs">Sin Sede</span>) 
                        : (item.project_assigned || <span className="text-slate-400 italic text-xs">Sin Asignar</span>);
                  const fechaIngreso = isStaff ? item.entry_date : item.start_date;
                  const fechaFormat = fechaIngreso ? new Date(fechaIngreso + 'T12:00:00').toLocaleDateString('es-PE') : '-';
                  
                  // LÓGICA DE PROYECTOS Y DISEÑO ANIMADO
                  const { name: projName, extraCount, isAssigned } = getProjectDisplayInfo(item);

                  const cargoClass = isStaff ? "text-slate-700 bg-slate-100 border-slate-200" : "text-orange-700 bg-orange-50 border-orange-200";
                  
                  let statusColor = 'bg-slate-100 text-slate-500 border-slate-200';
                  if (item.status === 'Activo') statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  if (item.status === 'Vacaciones') statusColor = 'bg-blue-50 text-blue-600 border-blue-100';
                  if (item.status === 'De Baja') statusColor = 'bg-red-50 text-red-600 border-red-100';
                  if (item.status === 'Permiso') statusColor = 'bg-orange-50 text-orange-600 border-orange-100';

                  return (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      
                      {/* 1. Nombre y Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold overflow-hidden shrink-0">
                             {isStaff && item.avatar_url ? (
                                <img src={item.avatar_url} alt="" className="w-full h-full object-cover"/>
                             ) : (
                                <User size={20} />
                             )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{item.full_name}</p>
                            {isStaff && <p className="text-[10px] text-slate-400">{item.email || 'Sin correo'}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm font-mono text-slate-600">{item.document_number}</td>

                      <td className="px-4 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md border ${cargoClass}`}>{cargo}</span>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                             <Building2 size={14} className="text-slate-400"/> {oficina}
                          </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">{fechaFormat}</td>

                      <td className="px-4 py-4 text-center">
                          <button onClick={(e) => handleChangeStatus(e, item)} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border hover:brightness-95 transition-all ${statusColor}`}>
                             {item.status || 'Activo'}
                          </button>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">{item.district || '-'}</td>

                      <td className="px-4 py-4 text-sm text-slate-600">
                          {item.phone ? (<div className="flex items-center gap-1"><Phone size={14} className="text-slate-400"/> {item.phone}</div>) : '-'}
                      </td>

                      {/* --- COLUMNA DE OBRA ASIGNADA CON DISEÑO "PREMIUM" --- */}
                      <td className="px-4 py-4 text-center">
                          <div className="flex justify-center">
                              <button 
                                 type="button" 
                                 onClick={(e) => handleAssignProject(e, item)} 
                                 className={`
                                    relative overflow-hidden group/btn 
                                    inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border
                                    ${isAssigned 
                                       ? 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:shadow-md' // ESTADO NORMAL + HOVER
                                       : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed hover:bg-slate-100 hover:text-slate-600'
                                    }
                                 `}
                                 title="Clic para gestionar obras"
                              >
                                 {/* ANIMACIÓN: Franja Azul que se desliza */}
                                 {isAssigned && (
                                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 transform -translate-x-full group-hover/btn:translate-x-0 transition-transform duration-300 ease-out"></span>
                                 )}

                                 <HardHat 
                                    size={14} 
                                    className={`transition-colors duration-300 ${isAssigned ? "text-slate-400 group-hover/btn:text-blue-600" : "text-slate-400"}`} 
                                 /> 
                                 
                                 <span className={`truncate max-w-[150px] transition-colors duration-300 ${isAssigned ? "group-hover/btn:text-blue-700" : ""}`}>
                                    {projName}
                                 </span>
                                 
                                 {/* INDICADOR EXTRA (+2) Animado */}
                                 {extraCount > 0 && (
                                     <span className={`
                                        ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-sm transition-colors duration-300
                                        ${isAssigned ? "bg-slate-100 text-slate-500 group-hover/btn:bg-blue-600 group-hover/btn:text-white" : ""}
                                     `}>
                                        +{extraCount}
                                     </span>
                                 )}
                              </button>
                          </div>
                      </td>

                      <td className="px-4 py-4 text-center">
                         <div className="flex items-center justify-center gap-2">
                            <button onClick={(e) => handleChangeStatus(e, item)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Cambiar Estado">
                               <Activity size={18} />
                            </button>
                            <button onClick={(e) => handleEdit(e, item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                               <Edit size={18} />
                            </button>
                            <button onClick={(e) => requestDelete(e, item.id, item.full_name)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                               <Trash2 size={18} />
                            </button>
                         </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALES --- */}
      <AddEmployeeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} userToEdit={selectedPerson} onSuccess={fetchData} onDelete={(id) => { setIsAddModalOpen(false); requestDelete(null, id, selectedPerson?.full_name); }} />
      <AddWorkerModal isOpen={isAddWorkerModalOpen} onClose={() => setIsAddWorkerModalOpen(false)} userToEdit={selectedPerson} onSuccess={fetchData} onDelete={(id) => { setIsAddWorkerModalOpen(false); requestDelete(null, id, selectedPerson?.full_name); }} />
      <ChangeStatusModal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} user={selectedPerson} isWorker={activeTab === 'workers'} onSuccess={fetchData} />
      <AssignProjectsModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} user={selectedPerson} isWorker={activeTab === 'workers'} onSuccess={fetchData} />
      <EmployeeDocumentsModal isOpen={isDocsModalOpen} onClose={() => setIsDocsModalOpen(false)} employee={selectedPerson} />
      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({...notification, isOpen: false})} type={notification.type} title={notification.title} message={notification.message} />

      <AnimatePresence>
        {confirmDeleteModal.isOpen && (
           <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e)=>e.stopPropagation()}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
                  <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={28} /></div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar registro?</h3>
                      <p className="text-sm text-slate-500 mb-6">Estás a punto de eliminar a <span className="font-bold text-slate-700">{confirmDeleteModal.name}</span>. Esta acción no se puede deshacer.</p>
                      <div className="flex gap-3 w-full">
                         <button onClick={() => setConfirmDeleteModal({ isOpen: false, id: null, name: '' })} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                         <button onClick={executeDelete} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">Sí, Eliminar</button>
                      </div>
                  </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HumanResourcesPage;