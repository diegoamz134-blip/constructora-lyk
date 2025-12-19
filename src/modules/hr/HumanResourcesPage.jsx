import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Search, Plus, UserCog, HardHat, 
  Briefcase, Filter, Trash2, Pencil, Baby, BookOpen, 
  Activity, DollarSign 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// Componentes
import CreateUserModal from './components/CreateUserModal';
import ChangeStatusModal from './components/ChangeStatusModal'; 
import StatusModal from '../../components/common/StatusModal';

const HumanResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('staff');
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToChangeStatus, setUserToChangeStatus] = useState(null);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      // Seleccionamos todo para asegurarnos de traer pension_system y custom_daily_rate
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

  const handleCreate = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleStatusChange = (user) => {
    setUserToChangeStatus(user);
    setIsStatusModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) return;
    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      setNotification({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Registro eliminado correctamente.' });
      fetchData();
    } catch (error) {
      console.error(error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo eliminar el registro.' });
    }
  };

  // --- HELPER PARA RENDERIZAR BADGE DE ESTADO ---
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

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center text-slate-400"><span className="animate-pulse font-bold">Cargando datos...</span></div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center"><Filter size={48} className="mb-4 opacity-20" /><p>No se encontraron registros.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Nombre Completo</th>
                  <th className="px-6 py-4">DNI / Doc</th>
                  <th className="px-6 py-4">{activeTab === 'staff' ? 'Cargo' : 'Categoría'}</th>
                  
                  {/* CORRECCIÓN DE ENCABEZADO */}
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
                {filteredData.map((user) => {
                  
                  // --- Lógica para mostrar AFP/Régimen correctamente ---
                  // Priorizamos 'pension_system' (nuevo), fallamos a 'afp' (viejo)
                  const displayAFP = user.pension_system || user.afp;

                  // --- Lógica para mostrar Sueldo ---
                  // Workers: custom_daily_rate (Pactado) o "Según Tabla"
                  // Staff: salary
                  let displaySalary = '-';
                  if (activeTab === 'staff') {
                      displaySalary = user.salary ? `S/ ${parseFloat(user.salary).toFixed(2)}` : '-';
                  } else {
                      // Para obreros, si tiene sueldo pactado lo mostramos, si no, indicamos que usa tabla
                      displaySalary = user.custom_daily_rate 
                          ? `S/ ${parseFloat(user.custom_daily_rate).toFixed(2)}` 
                          : <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-1 rounded">Según Tabla</span>;
                  }

                  return (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
                      
                      {/* CELDA DE SUELDO CORREGIDA */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                           <DollarSign size={16} className="text-emerald-500"/>
                           {displaySalary}
                        </div>
                      </td>

                      {/* CELDA DE AFP CORREGIDA */}
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
                          <button 
                            onClick={() => handleDelete(user.id)}
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
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activeTab={activeTab}
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