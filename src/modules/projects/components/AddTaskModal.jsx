import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, CalendarClock, ListTodo } from 'lucide-react';
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

const AddTaskModal = ({ isOpen, onClose, onSuccess, projectId }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    task_name: '',
    start_date: '',
    end_date: '',
    progress: 0,
    status: 'Pendiente'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('project_tasks')
        .insert([{
          ...formData,
          project_id: projectId // Vinculamos la tarea al proyecto actual
        }]);

      if (error) throw error;

      setFormData({ task_name: '', start_date: '', end_date: '', progress: 0, status: 'Pendiente' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear tarea: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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
            className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Agregar Etapa al Cronograma</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Etapa</label>
                <div className="relative">
                  <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="task_name" required value={formData.task_name} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    placeholder="Ej: Excavación de Zanjas"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha Inicio</label>
                  <input 
                    type="date" name="start_date" required value={formData.start_date} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha Fin</label>
                  <input 
                    type="date" name="end_date" required value={formData.end_date} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button disabled={loading} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><CalendarClock size={18}/> Guardar Etapa</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddTaskModal;