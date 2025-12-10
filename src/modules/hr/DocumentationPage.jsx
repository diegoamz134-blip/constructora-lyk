import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, FolderOpen, User, HardHat, FileCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import EmployeeDocumentsModal from './components/EmployeeDocumentsModal';

const DocumentationPage = () => {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'workers'
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el modal de documentos
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    const table = activeTab === 'staff' ? 'employees' : 'workers';
    const { data } = await supabase.from(table).select('*').eq(activeTab === 'workers' ? 'status' : 'id', activeTab === 'workers' ? 'Activo' : undefined || 'id'); // Truco: traer todos si es staff
    
    // Si es staff no tiene campo status a veces, mejor traer todos.
    // Corrección consulta:
    let query = supabase.from(table).select('*');
    if (activeTab === 'workers') query = query.eq('status', 'Activo');
    
    const { data: results } = await query;
    setList(results || []);
    setLoading(false);
  };

  const filteredList = list.filter(item => 
    item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_number.includes(searchTerm)
  );

  const openLegajo = (person) => {
    setSelectedPerson({ ...person, type: activeTab === 'staff' ? 'staff' : 'worker' });
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Legajos Digitales</h2>
        <p className="text-slate-500 text-sm">Gestiona la documentación obligatoria del personal.</p>
      </div>

      {/* Tabs y Buscador */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 inline-flex">
            <button onClick={() => setActiveTab('staff')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'staff' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                <User size={16}/> Staff Administrativo
            </button>
            <button onClick={() => setActiveTab('workers')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'workers' ? 'bg-[#0F172A] text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}>
                <HardHat size={16}/> Personal Obrero
            </button>
        </div>

        <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" placeholder="Buscar por nombre o DNI..." 
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
            />
        </div>
      </div>

      {/* Grid de Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((item) => (
            <motion.div 
                key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => openLegajo(item)}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${activeTab === 'staff' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'}`}>
                        {item.full_name.charAt(0)}
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:text-[#003366] group-hover:bg-blue-50 transition-colors">
                        <FolderOpen size={20} />
                    </div>
                </div>
                
                <h3 className="font-bold text-slate-800 truncate">{item.full_name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-4">DNI: {item.document_number}</p>
                
                <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.position || item.category}</span>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        Ver Documentos <ChevronRight size={14} />
                    </span>
                </div>
            </motion.div>
        ))}
      </div>

      {/* Modal de Documentos */}
      <EmployeeDocumentsModal 
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        person={selectedPerson}
      />

    </div>
  );
};

// Helper Icon
const ChevronRight = ({size}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default DocumentationPage;