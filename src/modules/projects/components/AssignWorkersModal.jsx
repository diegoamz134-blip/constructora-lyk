import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Search, HardHat, Loader2 } from 'lucide-react';
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

const AssignWorkersModal = ({ isOpen, onClose, onSuccess, projectName }) => {
  const [workers, setWorkers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar obreros que NO están en este proyecto
  useEffect(() => {
    if (isOpen) {
      fetchAvailableWorkers();
      setSelectedIds([]);
      setSearchTerm('');
    }
  }, [isOpen, projectName]);

  const fetchAvailableWorkers = async () => {
    setLoading(true);
    // Traemos todos los obreros. 
    // NOTA: En un sistema real, filtraríamos en la DB, pero aquí filtramos en JS para flexibilidad
    const { data, error } = await supabase
      .from('workers')
      .select('id, full_name, category, project_assigned')
      .neq('status', 'Inactivo'); // Solo activos

    if (!error && data) {
      // Filtramos los que YA están en este proyecto para no mostrarlos
      const available = data.filter(w => w.project_assigned !== projectName);
      setWorkers(available);
    }
    setLoading(false);
  };

  const toggleWorker = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    setSaving(true);

    try {
      // Actualizamos el campo 'project_assigned' de los obreros seleccionados
      const { error } = await supabase
        .from('workers')
        .update({ project_assigned: projectName })
        .in('id', selectedIds);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      alert("Error al asignar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtrado por buscador
  const filteredWorkers = workers.filter(w => 
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose} 
          />
          
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Derivar Personal</h3>
                <p className="text-xs text-slate-500">Selecciona obreros para mover a: <span className="font-bold text-[#003366]">{projectName}</span></p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o categoría..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin" /> Cargando personal...
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  No se encontró personal disponible para asignar.
                </div>
              ) : (
                filteredWorkers.map(worker => (
                  <div 
                    key={worker.id}
                    onClick={() => toggleWorker(worker.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedIds.includes(worker.id) 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedIds.includes(worker.id) ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <HardHat size={20} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${selectedIds.includes(worker.id) ? 'text-[#003366]' : 'text-slate-700'}`}>{worker.full_name}</p>
                        <p className="text-xs text-slate-400">
                          {worker.category} • <span className="italic">{worker.project_assigned || 'Sin asignar'}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(worker.id) ? 'border-[#003366] bg-[#003366]' : 'border-slate-300'}`}>
                      {selectedIds.includes(worker.id) && <X size={12} className="text-white rotate-45" strokeWidth={4} />}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer con Botón */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={handleAssign}
                disabled={saving || selectedIds.length === 0}
                className="w-full py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="animate-spin" size={18}/> : <><UserPlus size={18}/> Asignar {selectedIds.length} Obreros</>}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AssignWorkersModal;