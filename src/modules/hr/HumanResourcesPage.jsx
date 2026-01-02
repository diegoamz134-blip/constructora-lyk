import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Search, Plus, UserCog, HardHat, 
  Briefcase, Filter, Trash2, Pencil, Baby, BookOpen, 
  Activity, DollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// --- IMPORTAMOS LOS MODALES ---
import AddEmployeeModal from './AddEmployeeModal';
import AddWorkerModal from './AddWorkerModal';
import ChangeStatusModal from './components/ChangeStatusModal'; 
import StatusModal from '../../components/common/StatusModal';
// Importamos el Modal de Confirmación (Reutilizamos el de proyectos)
import ConfirmDeleteModal from '../projects/components/ConfirmDeleteModal';

const HumanResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- ESTADOS DE MODALES ---
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  
  // --- ESTADOS PARA ELIMINACIÓN (NUEVO) ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [userToEdit, setUserToEdit] = useState(null);
  const [userToChangeStatus, setUserToChangeStatus] = useState(null);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // --- PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataList(data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = dataList.filter(item => 
    item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_number.includes(searchTerm)
  );

  // --- LÓGICA DE PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- MANEJO DE MODALES ---
  const handleCreate = () => {
    setUserToEdit(null);
    if (activeTab === 'staff') {
      setIsEmployeeModalOpen(true);
    } else {
      setIsWorkerModalOpen(true);
    }
  };

  const handleEdit = (user) => {
    setUserToEdit(user);
    if (activeTab === 'staff') {
      setIsEmployeeModalOpen(true);
    } else {
      setIsWorkerModalOpen(true);
    }
  };

  const handleStatusChange = (user) => {
    setUserToChangeStatus(user);
    setIsStatusModalOpen(true);
  };

  // --- NUEVA LÓGICA DE ELIMINACIÓN CON MODAL ---
  
  // 1. Abrir el modal al hacer clic en el basurero
  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // 2. Ejecutar borrado al confirmar en el modal
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      // Intentamos borrar directamente (asumiendo que ya configuraste ON DELETE CASCADE en la BD)
      const { error } = await supabase.from(table).delete().eq('id', itemToDelete);
      
      if (error) throw error;

      setNotification({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Registro eliminado correctamente.' });
      fetchData(); // Recargar lista
      setIsDeleteModalOpen(false);
      setItemToDelete(null);

    } catch (error) {
      console.error(error);
      setNotification({ 
        isOpen: true, 
        type: 'error', 
        title: 'Error', 
        message: 'No se pudo eliminar el registro. Verifica que no tenga datos asociados si no activaste el borrado en cascada.' 
      });
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- HELPER PARA BADGE DE ESTADO ---
  const renderStatusBadge = (status) => {
    let colorClass = 'bg-slate-100 text-slate-500 border-slate-200';
    let dotClass = 'bg-slate-400';
    let label = status || 'Desconocido';

    if (status === 'Activo') {
      colorClass = 'bg-green-50 text-green-700 border-green-200';
      dotClass = 'bg-green-500';
    } else if (status === 'De Baja') {
      colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
      dotClass = 'bg-yellow-500';
    } else if (status === 'Despedido') {
      colorClass = 'bg-red-50 text-red-700 border-red-200';
      dotClass = 'bg-red-500';
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-[#003366]" /> Recursos Humanos
          </h1>
          <p className="text-slate-500 text-sm">Gestión del personal administrativo y obreros de campo.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={18} /> Nuevo {activeTab === 'staff' ? 'Personal' : 'Obrero'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserCog size={18} /> Administrativos
        </button>
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-blue-50 text-[#003366] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HardHat size={18} /> Obreros
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text"
          placeholder={`Buscar por nombre o DNI en ${activeTab === 'staff' ? 'Personal' : 'Obreros'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
        />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">Limpiar</button>}
      </div>

      {/* Tabla con Animación y Paginación */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {loading ? (
          <div className="flex-1 p-12 flex justify-center items-center text-slate-400"><span className="animate-pulse font-bold">Cargando datos...</span></div>
        ) : filteredData.length === 0 ? (
          <div className="flex-1 p-12 text-center text-slate-400 flex flex-col items-center justify-center"><Filter size={48} className="mb-4 opacity-20" /><p>No se encontraron registros.</p></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Nombre Completo</th>
                    <th className="px-6 py-4">DNI / Doc</th>
                    <th className="px-6 py-4">{activeTab === 'staff' ? 'Cargo' : 'Categoría'}</th>
                    <th className="px-6 py-4 font-bold text-slate-600">
                      {activeTab === 'staff' ? 'Sueldo Mensual' : 'Jornal Diario'}
                    </th>
                    <th className="px-6 py-4 text-center">AFP / Régimen</th>
                    <th className="px-6 py-4 text-center">Hijos</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="wait">
                    {currentItems.map((user, idx) => {
                      
                      const displayAFP = user.pension_system || user.afp;
                      let displaySalary = '-';
                      if (activeTab === 'staff') {
                          displaySalary = user.salary ? `S/ ${parseFloat(user.salary).toFixed(2)}` : '-';
                      } else {
                          displaySalary = user.custom_daily_rate 
                              ? `S/ ${parseFloat(user.custom_daily_rate).toFixed(2)}` 
                              : <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">Según Tabla</span>;
                      }

                      return (
                        <motion.tr 
                          key={user.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${activeTab === 'staff' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                {activeTab === 'staff' ? <Briefcase size={18} /> : <HardHat size={18} />}
                              </div>
                              <span className="font-bold text-slate-700">{user.full_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600 text-sm">{user.document_number}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                              {activeTab === 'staff' ? user.position : user.category}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                               <DollarSign size={16} className="text-emerald-500"/>
                               {displaySalary}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            {displayAFP ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#003366] text-xs font-bold border border-blue-100">
                                 <BookOpen size={12}/> {displayAFP}
                              </div>
                            ) : <span className="text-slate-400 text-xs">-</span>}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {user.has_children ? (
                              <div className="inline-flex items-center gap-1 text-slate-600 font-bold text-sm" title={`${user.children_count} Hijos`}>
                                 <Baby size={16} className="text-pink-400"/> {user.children_count}
                              </div>
                            ) : <span className="text-slate-300 text-xs font-medium">No</span>}
                          </td>
                          
                          <td className="px-6 py-4 text-center">
                             {renderStatusBadge(user.status)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => handleStatusChange(user)}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Cambiar Estado"
                              >
                                <Activity size={18}/>
                              </button>

                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil size={18}/>
                              </button>
                              
                              {/* BOTÓN ELIMINAR ACTUALIZADO */}
                              <button 
                                onClick={() => handleDeleteClick(user.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={18}/>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* CONTROLES DE PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 relative flex flex-col md:flex-row justify-center items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium hidden md:block">
                      Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} de {filteredData.length} registros
                  </div>
                  
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <button 
                        onClick={() => goToPage(1)} 
                        disabled={currentPage === 1} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronsLeft size={18}/>
                      </button>
                      <button 
                        onClick={() => goToPage(currentPage - 1)} 
                        disabled={currentPage === 1} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronLeft size={18}/>
                      </button>
                      
                      <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                              .map((page, i, arr) => (
                                  <React.Fragment key={page}>
                                      {i > 0 && arr[i - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                      <button 
                                        onClick={() => goToPage(page)} 
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                          currentPage === page 
                                            ? 'bg-[#003366] text-white shadow-md scale-110' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                      >
                                          {page}
                                      </button>
                                  </React.Fragment>
                              ))
                          }
                      </div>

                      <button 
                        onClick={() => goToPage(currentPage + 1)} 
                        disabled={currentPage === totalPages} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronRight size={18}/>
                      </button>
                      <button 
                        onClick={() => goToPage(totalPages)} 
                        disabled={currentPage === totalPages} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronsRight size={18}/>
                      </button>
                  </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* RENDERIZADO CONDICIONAL DE LOS MODALES */}
      <AddEmployeeModal 
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSuccess={fetchData}
        userToEdit={userToEdit}
      />

      <AddWorkerModal 
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        onSuccess={fetchData}
        userToEdit={userToEdit}
      />

      <ChangeStatusModal 
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        user={userToChangeStatus}
        activeTab={activeTab}
        onSuccess={fetchData}
      />

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title={activeTab === 'staff' ? "¿Eliminar Personal?" : "¿Eliminar Obrero?"}
        message={
          <span>
            ¿Estás seguro de que deseas eliminar este registro? <br/>
            Esta acción es irreversible.
          </span>
        }
        warning="Se eliminará todo su historial, asistencias y pagos permanentemente."
      />

      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
};

export default HumanResourcesPage;