import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Loader2, User, FileBadge, 
  HardHat, Calendar, DollarSign, IdCard, MapPin
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.98, y: 10 }
};

const AddWorkerModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'DNI',
    document_number: '',
    category: 'Peón',
    project_assigned: '',
    start_date: '',
    weekly_rate: '' // CAMBIO: Ahora es pago semanal
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('workers').insert([formData]);
      if (error) throw error;

      // Limpiar y cerrar
      setFormData({ 
        full_name: '', document_type: 'DNI', document_number: '', 
        category: 'Peón', project_assigned: '', start_date: '', weekly_rate: '' 
      });
      onSuccess(); 
      onClose();   
    } catch (error) {
      console.error('Error:', error.message);
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all"
            onClick={onClose} 
          />

          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Header Limpio */}
            <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-slate-900 font-extrabold text-2xl tracking-tight mb-1">Nuevo Obrero</h3>
                <p className="text-slate-500 text-sm font-medium">Registro de personal de campo (Régimen Semanal).</p>
              </div>
              <button onClick={onClose} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:text-slate-900 transition mt-1">
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar max-h-[75vh]">
              
              {/* Datos Personales */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <User size={16} className="text-slate-400" /> Datos Personales
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="full_name" required value={formData.full_name} onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none transition-all"
                      placeholder="Nombre Completo"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-1 relative group">
                      <FileBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                      <select 
                        name="document_type" value={formData.document_type} onChange={handleChange}
                        className="w-full pl-12 pr-8 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none appearance-none cursor-pointer"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">CE</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                    
                    <div className="col-span-2 relative group">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        name="document_number" required value={formData.document_number} onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none font-mono"
                        placeholder="Número de documento"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Datos de Obra */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <HardHat size={16} className="text-slate-400" /> Datos de Obra
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Categoría */}
                  <div className="relative group">
                    <HardHat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                    <select 
                      name="category" value={formData.category} onChange={handleChange}
                      className="w-full pl-12 pr-8 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none appearance-none cursor-pointer"
                    >
                      <option value="Peón">Peón</option>
                      <option value="Oficial">Oficial</option>
                      <option value="Operario">Operario</option>
                      <option value="Capataz">Capataz</option>
                    </select>
                  </div>

                  {/* Obra Asignada */}
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="project_assigned" required value={formData.project_assigned} onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none"
                      placeholder="Obra Asignada"
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="text-slate-400" size={18} />
                    </div>
                    <input 
                      name="start_date" type="date" required value={formData.start_date} onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 focus:text-slate-800 focus:bg-white focus:border-slate-800 outline-none"
                    />
                  </div>

                   <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="weekly_rate" type="number" required step="0.01" value={formData.weekly_rate} onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none placeholder:text-slate-400"
                      placeholder="Pago Semanal (S/)"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-50">
                <button type="button" onClick={onClose} className="px-6 py-3.5 border-2 border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 px-6 py-3.5 bg-[#0F172A] text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-lg flex justify-center items-center gap-2">
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>Guardar Obrero</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddWorkerModal;