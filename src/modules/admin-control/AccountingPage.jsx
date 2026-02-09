import React, { useState, useEffect } from 'react';
import { 
  DollarSign, PieChart, Plus, Search, 
  ArrowUpRight, ArrowDownRight, Briefcase, FileText,
  Eye, Edit, Filter, ChevronLeft, ChevronRight, Calendar,
  Download, BarChart2, AlertCircle
} from 'lucide-react';
import { 
  getTransactions, 
  getFinancialSummary, 
  getBudgetExecution, // Importamos función nueva
  exportTransactionsToCSV // Importamos función nueva
} from '../../services/accountingService';
import { getProjects } from '../../services/projectsService';
import TransactionModal from './components/TransactionModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AccountingPage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0 });
  const [transactionsData, setTransactionsData] = useState({ data: [], count: 0 });
  const [projectsList, setProjectsList] = useState([]);
  const [budgetStats, setBudgetStats] = useState([]); // Nuevo estado para presupuestos
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'Todas',
    projectId: '',
    search: ''
  });

  const PAGE_SIZE = 5;

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  const fetchInitialData = async () => {
    try {
      const [summaryData, projectsData, budgetsData] = await Promise.all([
        getFinancialSummary(),
        getProjects(),
        getBudgetExecution() // Cargamos presupuestos
      ]);
      setSummary(summaryData);
      setProjectsList(projectsData || []);
      setBudgetStats(budgetsData || []);
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const result = await getTransactions({
        page,
        pageSize: PAGE_SIZE,
        filters
      });
      setTransactionsData(result);
    } catch (error) {
      console.error("Error cargando transacciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); 
  };

  // Función para exportar los datos actuales (filtrados o todos)
  const handleExport = async () => {
    // Para exportar, idealmente pedimos TODOS los datos con los filtros actuales, sin paginación
    // Por simplicidad, exportamos la página actual o podrías hacer una llamada especial 'getAll'
    // Aquí exportaremos lo que se ve, pero idealmente harías:
    const { data } = await getTransactions({ page: 1, pageSize: 1000, filters });
    exportTransactionsToCSV(data);
  };

  const totalPages = Math.ceil((transactionsData.count || 0) / PAGE_SIZE);

  const chartData = [
    { name: 'Ingresos', amount: summary.income, color: '#10B981' },
    { name: 'Egresos', amount: summary.expenses, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Contabilidad y Finanzas</h1>
          <p className="text-slate-500 font-medium">Control de flujo de caja, presupuestos y facturación.</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="bg-white text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={20} /> Exportar Excel
            </button>
            <button 
              onClick={handleCreate}
              className="bg-[#003366] text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all flex items-center gap-2 active:scale-95"
            >
              <Plus size={20} /> Nuevo Movimiento
            </button>
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
           <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign size={100} className="text-blue-600" />
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Total</p>
           <h3 className={`text-3xl font-black ${summary.balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
             S/. {summary.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
           </h3>
        </div>

        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><ArrowUpRight size={24} /></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">+ Ingresos</span>
           </div>
           <h3 className="text-2xl font-black text-emerald-700">
             S/. {summary.income.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
           </h3>
        </div>

        <div className="bg-red-50/50 p-6 rounded-2xl border border-red-100 relative overflow-hidden">
           <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl"><ArrowDownRight size={24} /></div>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg">- Gastos</span>
           </div>
           <h3 className="text-2xl font-black text-red-700">
             S/. {summary.expenses.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
           </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (TABLA) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TABLA DE MOVIMIENTOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[600px]">
            
            {/* BARRA DE FILTROS */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl space-y-3">
               <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      name="search"
                      type="text" 
                      placeholder="Buscar por concepto..." 
                      value={filters.search}
                      onChange={handleFilterChange}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="relative w-full md:w-48">
                     <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                     <select 
                        name="projectId"
                        value={filters.projectId}
                        onChange={handleFilterChange}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none appearance-none"
                     >
                        <option value="">Todos los Proyectos</option>
                        {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                  </div>

                  <select 
                     name="category"
                     value={filters.category}
                     onChange={handleFilterChange}
                     className="w-full md:w-40 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                  >
                     <option value="Todas">Todas las Categorías</option>
                     <option>Materiales</option>
                     <option>Mano de Obra</option>
                     <option>Equipos</option>
                     <option>Servicios</option>
                     <option>Administrativo</option>
                  </select>
               </div>

               <div className="flex gap-3 items-center flex-wrap">
                   <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Calendar size={12}/> Fecha:</span>
                   <input 
                     type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange}
                     className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                   />
                   <span className="text-slate-300">-</span>
                   <input 
                     type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange}
                     className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                   />
                   {(filters.startDate || filters.endDate || filters.projectId || filters.search) && (
                      <button 
                        onClick={() => setFilters({ startDate: '', endDate: '', category: 'Todas', projectId: '', search: '' })}
                        className="text-xs text-red-500 hover:underline ml-auto"
                      >
                        Limpiar Filtros
                      </button>
                   )}
               </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              <table className="w-full text-left border-collapse">
                <thead className="text-xs uppercase text-slate-400 font-bold bg-white sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="text-center p-10 text-slate-400">Cargando datos...</td></tr>
                  ) : transactionsData.data.length === 0 ? (
                    <tr><td colSpan="6" className="p-10 text-center text-slate-400 italic">No se encontraron movimientos.</td></tr>
                  ) : (
                    transactionsData.data.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{t.date}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {t.description}
                          {t.reference_document && <span className="block text-[10px] text-slate-400">{t.reference_document}</span>}
                        </td>
                        <td className="px-4 py-3">
                           <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                             {t.category}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                           {t.projects ? (
                             <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                                <Briefcase size={10}/> <span className="truncate max-w-[100px]" title={t.projects.name}>{t.projects.name}</span>
                             </div>
                           ) : <span className="text-slate-400 italic bg-slate-100 px-2 py-0.5 rounded">General</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${t.type === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {t.type === 'Ingreso' ? '+' : '-'} S/. {Number(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                           <div className="flex justify-center gap-2">
                             {t.file_url && (
                               <a 
                                 href={t.file_url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                 title="Ver Recibo"
                               >
                                 <Eye size={16}/>
                               </a>
                             )}
                             <button 
                               onClick={() => handleEdit(t)} 
                               className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" 
                               title="Editar"
                             >
                               <Edit size={16} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTER PAGINACIÓN */}
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
                <span className="text-xs text-slate-500 font-medium">
                   Mostrando {transactionsData.data.length} de {transactionsData.count} registros
                </span>
                <div className="flex gap-2 items-center">
                   <button 
                     onClick={() => setPage(p => Math.max(1, p - 1))}
                     disabled={page === 1}
                     className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronLeft size={16}/>
                   </button>
                   <span className="text-xs font-bold text-slate-700 bg-white px-3 py-2 border border-slate-200 rounded-lg">
                      Pág {page} de {totalPages || 1}
                   </span>
                   <button 
                     onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                     disabled={page >= totalPages}
                     className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <ChevronRight size={16}/>
                   </button>
                </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (GRÁFICAS Y PRESUPUESTO) */}
        <div className="space-y-6">
            
            {/* 1. RESUMEN VISUAL */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center items-center">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 self-start">
                   <PieChart size={18} className="text-slate-400"/> Resumen Visual
                </h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* 2. NUEVO: CONTROL DE PRESUPUESTO */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 sticky top-0 bg-white z-10 pb-2">
                   <BarChart2 size={18} className="text-slate-400"/> Control Presupuestal
                </h3>
                
                <div className="space-y-5">
                   {budgetStats.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No hay obras activas con presupuesto.</p>
                   ) : (
                      budgetStats.map((proj) => {
                         const percent = Math.min(100, proj.percentage);
                         let barColor = 'bg-blue-500';
                         if (percent > 75) barColor = 'bg-orange-500';
                         if (percent >= 100) barColor = 'bg-red-500';

                         return (
                            <div key={proj.id} className="group">
                               <div className="flex justify-between items-end mb-1">
                                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{proj.name}</span>
                                  <span className={`text-[10px] font-bold ${percent >= 100 ? 'text-red-600' : 'text-slate-500'}`}>
                                     {percent.toFixed(1)}% Usado
                                  </span>
                               </div>
                               
                               <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${barColor}`} 
                                    style={{ width: `${percent}%` }}
                                  ></div>
                               </div>
                               
                               <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                  <span>Gasto: S/.{proj.spent.toLocaleString()}</span>
                                  <span>Ppto: S/.{proj.budget.toLocaleString()}</span>
                               </div>
                            </div>
                         );
                      })
                   )}
                </div>

                <div className="mt-4 bg-blue-50 p-3 rounded-xl flex gap-2 items-start border border-blue-100">
                    <AlertCircle size={14} className="text-blue-600 shrink-0 mt-0.5"/>
                    <p className="text-[10px] text-blue-800 leading-tight">
                       Este panel compara los gastos registrados (categoría 'Gasto') contra el presupuesto inicial de cada proyecto activo.
                    </p>
                </div>
            </div>

        </div>

      </div>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { fetchTransactions(); fetchInitialData(); }} 
        transactionToEdit={transactionToEdit}
      />

    </div>
  );
};

export default AccountingPage;