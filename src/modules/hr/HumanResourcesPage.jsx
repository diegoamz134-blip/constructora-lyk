import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Wallet, Shield, Search, Plus, Filter, MoreVertical, 
  ChevronRight, Download, Pencil, Trash2, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import AddEmployeeModal from './AddEmployeeModal';

const HumanResourcesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error('Error:', error);
    else setEmployees(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.document_number.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      
      {/* --- SECCIÓN SUPERIOR (Igual que antes) --- */}
      <div className="bg-white p-1.5 rounded-2xl inline-flex shadow-sm border border-slate-100">
        <button className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-semibold shadow-md transition-all">Planilla del staff</button>
        <button className="px-6 py-2.5 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors">Planilla obrera</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Cards (Simplificadas para el ejemplo) */}
        <KpiCard title="Personal Total" value={employees.length} icon={Users} color="bg-blue-50 text-blue-600" />
        <KpiCard title="Total Pensiones" value="S/ 8,472" icon={Wallet} color="bg-emerald-50 text-emerald-600" />
        <KpiCard title="Total Seguros" value="S/ 5,472" icon={Shield} color="bg-purple-50 text-purple-600" />
      </div>

      {/* --- BARRA DE ACCIONES --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
         <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar colaborador..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all transform active:scale-95"
            >
               <Plus size={18} /> 
               <span>Nuevo Ingreso</span>
            </button>
         </div>
      </div>

      {/* --- TABLA MODERNA Y ANIMADA --- */}
      <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
         {loading ? (
           <div className="flex flex-col items-center justify-center h-80">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-[#0F172A] rounded-full animate-spin mb-4"></div>
             <p className="text-slate-400 font-medium animate-pulse">Cargando personal...</p>
           </div>
         ) : (
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="p-5 pl-8 w-16"><input type="checkbox" className="rounded-md border-slate-300 text-[#0F172A] focus:ring-0 w-4 h-4 cursor-pointer" /></th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Colaborador</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Documento</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Cargo</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Ingreso</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Estado</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Salario</th>
                        <th className="py-5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider text-right pr-8">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence>
                      {filteredEmployees.map((employee, index) => (
                        <ModernTableRow key={employee.id} data={employee} index={index} />
                      ))}
                    </AnimatePresence>
                    
                    {filteredEmployees.length === 0 && (
                      <tr><td colSpan="8" className="p-12 text-center text-slate-400">No se encontraron resultados</td></tr>
                    )}
                  </tbody>
              </table>
           </div>
         )}
         
         {!loading && (
           <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400 px-4">Total: {employees.length} colaboradores</span>
              <div className="flex gap-2">
                 <button className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">Anterior</button>
                 <button className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition">Siguiente</button>
              </div>
           </div>
         )}
      </div>

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchEmployees} 
      />

    </motion.div>
  );
};

// --- COMPONENTE DE FILA ANIMADA ---
const ModernTableRow = ({ data, index }) => {
  // Función para obtener iniciales
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Colores aleatorios para los avatares (puedes fijarlos si prefieres)
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700'
  ];
  const randomColor = colors[data.id % colors.length] || colors[0];

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.05, duration: 0.3 }} // Efecto cascada
      className="group hover:bg-slate-50/80 transition-colors"
    >
       <td className="p-5 pl-8">
          <input type="checkbox" className="rounded-md border-slate-300 text-[#0F172A] focus:ring-0 w-4 h-4 cursor-pointer opacity-50 group-hover:opacity-100 transition-opacity" />
       </td>
       
       <td className="py-4 px-4">
          <div className="flex items-center gap-3">
             {/* Avatar con Iniciales */}
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

       <td className="py-4 px-4">
          <span className="text-sm font-semibold text-slate-600 bg-slate-100/50 px-3 py-1 rounded-full">
            {data.position}
          </span>
       </td>

       <td className="py-4 px-4 text-sm text-slate-500 font-medium">
          {new Date(data.entry_date).toLocaleDateString()}
       </td>

       {/* Estado Simulado (Puedes conectar esto a DB si agregas un campo 'active') */}
       <td className="py-4 px-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[10px] font-bold uppercase tracking-wide">Activo</span>
          </div>
       </td>

       <td className="py-4 px-4 text-sm font-bold text-slate-700">
          S/ {Number(data.salary).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
       </td>

       <td className="py-4 px-4 pr-8 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-200">
             <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip" title="Descargar">
                <Download size={18} />
             </button>
             <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors tooltip" title="Editar">
                <Pencil size={18} />
             </button>
          </div>
       </td>
    </motion.tr>
  );
};

// Componente pequeño para las tarjetas de arriba
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