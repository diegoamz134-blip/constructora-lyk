import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Users, UserPlus, Search, Filter, Wallet, 
  Banknote, HardHat, CalendarX, Pencil,
  Briefcase // Icono estándar en lugar de Building2
} from 'lucide-react';
import CreateUserModal from './components/CreateUserModal';
import AddAdvanceModal from './components/AddAdvanceModal';
import ManagePPEModal from './components/ManagePPEModal';

const HumanResourcesPage = () => {
  const [activeTab, setActiveTab] = useState('staff'); 
  const [people, setPeople] = useState([]);
  const [advances, setAdvances] = useState({}); 
  const [ppeCounts, setPpeCounts] = useState({}); 
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPPEModalOpen, setIsPPEModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [userToEdit, setUserToEdit] = useState(null);

  useEffect(() => { fetchData(); }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      let query = supabase.from(table).select('*').order('created_at', { ascending: false });
      if (activeTab === 'workers') query = query.neq('status', 'Inactivo');
      
      const { data: peopleData, error } = await query;
      if (error) throw error;
      setPeople(peopleData || []);

      let advancesQuery = supabase.from('advances').select('worker_id, employee_id, amount').eq('status', 'Pendiente');
      let ppeQuery = supabase.from('worker_ppe').select('worker_id, employee_id');

      const { data: advancesData } = await advancesQuery;
      const { data: ppeData } = await ppeQuery;

      const advancesMap = {};
      advancesData?.forEach(adv => {
        const id = activeTab === 'staff' ? adv.employee_id : adv.worker_id;
        if (id) advancesMap[id] = (advancesMap[id] || 0) + adv.amount;
      });
      setAdvances(advancesMap);

      const ppeMap = {};
      ppeData?.forEach(item => {
        const id = activeTab === 'staff' ? item.employee_id : item.worker_id;
        if (id) ppeMap[id] = (ppeMap[id] || 0) + 1;
      });
      setPpeCounts(ppeMap);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleOpenAdvance = (person) => { setSelectedPerson(person); setIsAdvanceModalOpen(true); };
  const handleOpenPPE = (person) => { setSelectedPerson(person); setIsPPEModalOpen(true); };
  const handleCreate = () => { setUserToEdit(null); setIsModalOpen(true); };
  const handleEdit = (person) => { setUserToEdit(person); setIsModalOpen(true); };

  const filteredPeople = people.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.document_number.includes(searchTerm)
  );

  const totalSalaries = people.reduce((sum, p) => {
    const amount = p.weekly_rate || p.salary || 0; 
    return sum + parseFloat(amount);
  }, 0);
  
  const totalAdvances = Object.values(advances).reduce((sum, val) => sum + val, 0);

  const getContractStatus = (dateString) => {
    if (!dateString) return { color: 'bg-slate-100 text-slate-400', label: 'Indefinido', days: null };
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(dateString); end.setHours(0,0,0,0);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { color: 'bg-red-100 text-red-600 border-red-200', label: 'Vencido', days: diffDays };
    if (diffDays <= 7) return { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Por Vencer', days: diffDays };
    return { color: 'bg-green-50 text-green-700 border-green-200', label: 'Vigente', days: diffDays };
  };

  const contractsAlertCount =
    activeTab === 'staff'
      ? people.filter(p => {
          if (!p.contract_end_date) return false;
          const status = getContractStatus(p.contract_end_date);
          return status.label === 'Vencido' || status.label === 'Por Vencer';
        }).length
      : 0;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recursos Humanos</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl mt-4 inline-flex">
            <button onClick={() => setActiveTab('staff')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'staff' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Planilla del Staff</button>
            <button onClick={() => setActiveTab('workers')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'workers' ? 'bg-[#003366] text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Planilla Obrera</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Personal Activo</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">{people.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Users size={24} /></div>
        </div>

                {activeTab === 'staff' && (
          contractsAlertCount > 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-red-500"></div>
              <div>
                <p className="text-red-400 text-xs font-bold uppercase tracking-wider">Contratos/Seguros</p>
                <h3 className="text-3xl font-bold text-red-600 mt-1">{contractsAlertCount} Alertas</h3>
                <p className="text-[10px] text-red-400 font-medium">Vencidos o por vencer</p>
                          </div>
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 animate-pulse"><CalendarX size={24} /></div>
        </div>
        ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vales por Descontar</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">S/ {totalAdvances.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600"><Banknote size={24} /></div>
        </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {activeTab === 'staff' ? 'Planilla Mensual' : 'Semanal (Estimado)'}
            </p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">S/ {totalSalaries.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600"><Wallet size={24} /></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"/>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition"><Filter size={18} /> Filtrar</button>
          <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-[#1e293b] shadow-lg active:scale-95 transition">
            <UserPlus size={18} /> {activeTab === 'staff' ? 'Nuevo Empleado' : 'Nuevo Obrero'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? <div className="p-10 text-center text-slate-400">Cargando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Documento</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cargo</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">AFP</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Hijos</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ingreso</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Contrato</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{activeTab === 'staff' ? 'Salario' : 'Jornal'}</th>
                  <th className="p-4 text-xs font-bold text-red-400 uppercase tracking-wider">Adelantos</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPeople.map((person) => {
                  const debt = advances[person.id] || 0;
                  const ppeCount = ppeCounts[person.id] || 0;
                  const contractStatus = getContractStatus(person.contract_end_date);
                  const moneyValue = person.weekly_rate || person.salary || 0; 
                  return (
                    <tr key={person.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeTab === 'staff' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{person.full_name.charAt(0)}</div>
                          <div><p className="font-bold text-slate-700 text-sm">{person.full_name}</p><p className="text-xs text-slate-400">ID: {person.id.toString().padStart(4, '0')}</p></div>
                        </div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 border border-slate-200 rounded text-xs font-mono text-slate-600 bg-white">{person.document_type || 'DNI'}: {person.document_number}</span></td>
                      <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${activeTab === 'staff' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{person.position || person.category}</span></td>
                      
                      {/* CELDAS AFP e HIJOS (Seguras) */}
                      <td className="p-4">
                            {person.afp ? (
                                <span className="flex items-center gap-1 text-slate-600 text-sm"><Briefcase size={14} className="text-blue-500"/> {person.afp}</span>
                            ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="p-4">
                            {person.has_children ? (
                                <span className="flex items-center gap-1 text-slate-600 text-sm"><Users size={14} className="text-pink-500"/> {person.children_count}</span>
                            ) : <span className="text-slate-300 text-xs">No</span>}
                      </td>

                      <td className="p-4 text-sm text-slate-600">{new Date(person.start_date || person.entry_date || person.created_at).toLocaleDateString()}</td>
                      
                      <td className="p-4 text-center">
                        {person.contract_end_date ? (
                            <div className={`inline-flex flex-col items-center px-3 py-1 rounded-lg border ${contractStatus.color}`}>
                                <span className="text-[10px] font-bold uppercase">{contractStatus.label}</span>
                                <span className="text-[9px] opacity-80">{new Date(person.contract_end_date).toLocaleDateString()}</span>
                            </div>
                        ) : <span className="text-slate-300 text-xs italic">Indefinido</span>}
                      </td>

                      <td className="p-4 text-sm font-bold text-slate-700">S/ {parseFloat(moneyValue).toLocaleString()}</td>
                      
                      <td className="p-4">
                        {debt > 0 ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded-lg border border-red-100">- S/ {debt.toLocaleString()}</span>
                        ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(person)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar"><Pencil size={18} /></button>
                          <button onClick={() => handleOpenPPE(person)} className={`p-2 rounded-lg transition ${ppeCount > 0 ? 'text-slate-400 hover:text-[#003366] hover:bg-blue-50' : 'text-orange-400 hover:text-orange-600 hover:bg-orange-50 animate-pulse'}`} title="EPPs"><HardHat size={18} /></button>
                          <button onClick={() => handleOpenAdvance(person)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Adelanto"><Banknote size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} activeTab={activeTab} onSuccess={fetchData} userToEdit={userToEdit} />
      <AddAdvanceModal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} person={selectedPerson} onSuccess={fetchData} type={activeTab} />
      <ManagePPEModal isOpen={isPPEModalOpen} onClose={() => setIsPPEModalOpen(false)} person={selectedPerson} type={activeTab} />
    </div>
  );
};
export default HumanResourcesPage;