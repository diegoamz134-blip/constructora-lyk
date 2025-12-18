import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Search, Filter, Plus, 
  FileText, Clock, AlertTriangle, 
  CheckCircle2, HardHat, UserCog, HeartPulse
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import AddAbsenceModal from './components/AddAbsenceModal';

const AbsenceManagementPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchAbsences();
  }, [activeTab]);

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      let query = supabase.from('absences').select('*').order('start_date', { ascending: false });

      if (activeTab === 'workers') {
        query = supabase
          .from('absences')
          .select(`*, workers!inner(full_name, document_number, category)`)
          .not('worker_id', 'is', null);
      } else {
        query = supabase
          .from('absences')
          .select(`*, employees!inner(full_name, document_number, position)`)
          .not('employee_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAbsences(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'VACACIONES': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DESC_MEDICO': return 'bg-red-100 text-red-700 border-red-200';
      case 'PERMISO_HORAS': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'VACACIONES': return <Calendar size={16}/>;
      case 'DESC_MEDICO': return <HeartPulse size={16}/>;
      case 'PERMISO_HORAS': return <Clock size={16}/>;
      default: return <FileText size={16}/>;
    }
  };

  const filteredData = absences.filter(item => {
    const person = activeTab === 'workers' ? item.workers : item.employees;
    return person?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="text-red-500" /> Control de Vacaciones y Descansos
          </h1>
          <p className="text-slate-500 text-sm">Gestión de ausencias, permisos médicos y programación de vacaciones.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#003366] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all"
        >
          <Plus size={18} /> Registrar Ausencia
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HardHat size={18} /> Obreros
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserCog size={18} /> Staff
        </button>
      </div>

      {/* Stats Cards (Resumen Rápido) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Calendar size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {absences.filter(a => a.type === 'VACACIONES').length}
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">En Vacaciones</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-red-50 text-red-600 rounded-xl"><HeartPulse size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {absences.filter(a => a.type === 'DESC_MEDICO').length}
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Descansos Médicos</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24}/></div>
           <div>
             <p className="text-2xl font-bold text-slate-800">
                {absences.filter(a => a.type === 'PERMISO_HORAS').length}
             </p>
             <p className="text-xs font-bold text-slate-400 uppercase">Permisos x Hora</p>
           </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex gap-4 items-center bg-slate-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#003366]/10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Tipo Incidencia</th>
                <th className="px-6 py-4">Periodo / Fecha</th>
                <th className="px-6 py-4 text-center">Duración</th>
                <th className="px-6 py-4">Detalle / Motivo</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400">Cargando registros...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-400">No hay ausencias registradas.</td></tr>
              ) : (
                filteredData.map((item) => {
                  const person = activeTab === 'workers' ? item.workers : item.employees;
                  return (
                    <motion.tr 
                      key={item.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-700">{person?.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{person?.document_number}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getTypeStyle(item.type)}`}>
                          {getTypeIcon(item.type)} {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(item.start_date).toLocaleDateString()} 
                        {item.type !== 'PERMISO_HORAS' && ` - ${new Date(item.end_date).toLocaleDateString()}`}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">
                        {item.type === 'PERMISO_HORAS' 
                          ? `${item.total_hours} hrs` 
                          : `${item.total_days} días`
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {item.reason || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-green-50 text-green-700 border border-green-100 rounded text-[10px] font-bold uppercase">
                          {item.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddAbsenceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchAbsences}
        type={activeTab}
      />
    </div>
  );
};

export default AbsenceManagementPage;