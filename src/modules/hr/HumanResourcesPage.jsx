import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Wallet, Shield, Search, Plus, Filter, 
  Download, Pencil, HardHat, Briefcase
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import AddEmployeeModal from './AddEmployeeModal';
import AddWorkerModal from './AddWorkerModal';

const HumanResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'workers'
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const tableName = activeTab === 'staff' ? 'employees' : 'workers';
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setDataList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const filteredData = dataList.filter(item => 
    item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_number.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      
      {/* --- SECCIÓN DE TABS --- */}
      <div className="bg-white p-1.5 rounded-2xl inline-flex shadow-sm border border-slate-100">
        <button 
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'staff' 
              ? 'bg-[#0F172A] text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Planilla del staff
        </button>
        <button 
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'workers' 
              ? 'bg-[#0F172A] text-white shadow-md' 
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          Planilla del personal obrero
        </button>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title={activeTab === 'staff' ? "Personal Staff" : "Obreros en Campo"}
          value={dataList.length} 
          icon={activeTab === 'staff' ? Users : HardHat} 
          color="bg-blue-50 text-blue-600" 
        />
        <KpiCard 
          // CAMBIO: Refleja el tipo de pago
          title={activeTab === 'staff' ? "Total Sueldos" : "Total Pago Semanal"} 
          value={activeTab === 'staff' ? "S/ 84,000" : "S/ 32,500"} 
          icon={Wallet} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <KpiCard 
          title="Seguros Activos" 
          value="100%" 
          icon={Shield} 
          color="bg-purple-50 text-purple-600" 
        />
      </div>

      {/* --- BARRA DE ACCIONES --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
         <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar ${activeTab === 'staff' ? 'empleado' : 'obrero'}...`}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm transition-colors">
               <Filter size={16} /> Filtrar
            </button>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all transform active:scale-95"
            >
               <Plus size={18} /> 
               <span>{activeTab === 'staff' ? 'Nuevo Empleado' : 'Nuevo Obrero'}</span>
            </button>
         </div>
      </div>

      {/* --- TABLA --- */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
         {loading ? (
           <div className="flex flex-col items-center justify-center h-80">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0F172A] rounded-full animate-spin mb-4"></div>
             <p className="text-slate-400 font-medium animate-pulse">Cargando datos...</p>
           </div>
         ) : (
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-5 pl-8 w-16"><input type="checkbox" className="rounded-md border-slate-300 text-[#0F172A] focus:ring-0 w-4 h-4 cursor-pointer" /></th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Nombre</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Documento</th>
                        
                        {activeTab === 'staff' ? (
                          <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Cargo</th>
                        ) : (
                          <>
                            <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Categoría</th>
                            <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Obra</th>
                          </>
                        )}

                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Ingreso</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {/* CAMBIO: Etiqueta de la columna */}
                          {activeTab === 'staff' ? 'Salario Mensual' : 'Pago Semanal'}
                        </th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-right pr-8">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {filteredData.map((item, index) => (
                        <ModernTableRow key={item.id} data={item} index={index} type={activeTab} />
                      ))}
                    </AnimatePresence>
                    
                    {filteredData.length === 0 && (
                      <tr><td colSpan="8" className="p-12 text-center text-slate-400">No se encontraron registros</td></tr>
                    )}
                  </tbody>
              </table>
           </div>
         )}
      </div>

      {activeTab === 'staff' ? (
        <AddEmployeeModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchData} 
        />
      ) : (
        <AddWorkerModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchData} 
        />
      )}

    </motion.div>
  );
};

const ModernTableRow = ({ data, index, type }) => {
  const getInitials = (name) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700'];
  const randomColor = colors[data.id % colors.length] || colors[0];

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group hover:bg-slate-50/80 transition-colors"
    >
       <td className="p-5 pl-8">
          <input type="checkbox" className="rounded-md border-slate-300 text-[#0F172A] focus:ring-0 w-4 h-4 cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity" />
       </td>
       
       <td className="py-4 px-4">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${randomColor}`}>
                {getInitials(data.full_name)}
             </div>
             <div>
               <p className="text-sm font-bold text-slate-700 group-hover:text-[#0F172A] transition-colors">{data.full_name}</p>
               <p className="text-[10px] text-slate-400 font-medium">ID: {data.id.toString().padStart(4, '0')}</p>
             </div>
          </div>
       </td>

       <td className="py-4 px-4 text-sm font-medium text-slate-600">
          <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-xs font-mono text-slate-500">
            {data.document_type}: {data.document_number}
          </span>
       </td>

       {type === 'staff' ? (
         <td className="py-4 px-4">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {data.position}
            </span>
         </td>
       ) : (
         <>
           <td className="py-4 px-4">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                data.category === 'Operario' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                data.category === 'Oficial' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {data.category}
              </span>
           </td>
           <td className="py-4 px-4 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-1"><HardHat size={12} className="text-slate-400"/> {data.project_assigned}</div>
           </td>
         </>
       )}

       <td className="py-4 px-4 text-sm text-slate-500 font-medium">
          {new Date(data.start_date || data.entry_date).toLocaleDateString()}
       </td>

       <td className="py-4 px-4 text-sm font-bold text-slate-700">
          {/* CAMBIO: Muestra el campo correcto (salary o weekly_rate) */}
          S/ {Number(data.salary || data.weekly_rate).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
       </td>

       <td className="py-4 px-4 pr-8 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-200">
             <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Download size={18} /></button>
             <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil size={18} /></button>
          </div>
       </td>
    </motion.tr>
  );
};

const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-[1.2rem] shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-all duration-300">
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
    </div>
    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shadow-sm`}>
      <Icon size={24} />
    </div>
  </div>
);

export default HumanResourcesPage;