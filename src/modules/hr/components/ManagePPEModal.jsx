import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HardHat, Plus, Trash2, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../services/supabase';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

const basicPPEs = [
  "Casco de Seguridad", "Botas Punta de Acero", "Chaleco Reflectivo", "Lentes de Seguridad", "Guantes de Cuero", "Tapones Auditivos", "Arnés de Seguridad", "Uniforme Completo"
];

const ManagePPEModal = ({ isOpen, onClose, person, type }) => {
  const [ppeList, setPpeList] = useState([]);
  const [newItem, setNewItem] = useState(basicPPEs[0]);
  const [newCondition, setNewCondition] = useState('Nuevo');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && person) {
      fetchPPE();
    }
  }, [isOpen, person]);

  const fetchPPE = async () => {
    // [CAMBIO] Buscar por el ID correcto
    let query = supabase.from('worker_ppe').select('*').order('date_given', { ascending: false });
    
    if (type === 'staff') query = query.eq('employee_id', person.id);
    else query = query.eq('worker_id', person.id);

    const { data } = await query;
    setPpeList(data || []);
  };

  const handleAdd = async () => {
    setLoading(true);
    try {
      const payload = {
        item_name: newItem,
        condition: newCondition,
        date_given: new Date().toISOString().split('T')[0]
      };

      if (type === 'staff') payload.employee_id = person.id;
      else payload.worker_id = person.id;

      const { error } = await supabase.from('worker_ppe').insert([payload]);

      if (error) throw error;
      fetchPPE();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("¿Eliminar registro de este equipo?")) return;
    await supabase.from('worker_ppe').delete().eq('id', id);
    fetchPPE();
  };

  return (
    <AnimatePresence>
      {isOpen && person && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose} 
          />
          
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck /> Kardex de EPPs
                </h3>
                <p className="text-blue-200 text-xs mt-1">
                  Equipos entregados a: <span className="font-bold text-white uppercase">{person.full_name}</span>
                </p>
              </div>
              <button onClick={onClose} className="p-1 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20}/></button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Equipo</label>
                <select 
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-[#003366] outline-none"
                  value={newItem} onChange={(e) => setNewItem(e.target.value)}
                >
                  {basicPPEs.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="w-full md:w-32 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                <select 
                  className="w-full p-2 rounded-lg border border-slate-300 text-sm focus:border-[#003366] outline-none"
                  value={newCondition} onChange={(e) => setNewCondition(e.target.value)}
                >
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                  <option value="Reposición">Reposición</option>
                </select>
              </div>
              <button 
                onClick={handleAdd}
                disabled={loading}
                className="w-full md:w-auto px-4 py-2 bg-[#003366] text-white rounded-lg font-bold text-sm hover:bg-blue-900 transition flex items-center justify-center gap-2"
              >
                <Plus size={16}/> Entregar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {ppeList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                  <AlertTriangle size={32} className="mb-2 text-orange-300" />
                  <p className="text-sm">No hay EPPs registrados.</p>
                </div>
              ) : (
                ppeList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 text-[#003366] rounded-full flex items-center justify-center">
                        <HardHat size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">{item.item_name}</h4>
                        <div className="flex gap-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><Calendar size={10}/> {item.date_given}</span>
                          <span className={`px-1.5 rounded border ${item.condition === 'Nuevo' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ManagePPEModal;