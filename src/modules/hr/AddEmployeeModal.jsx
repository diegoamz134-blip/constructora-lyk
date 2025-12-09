import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Loader2, User, FileBadge, 
  Briefcase, Calendar, DollarSign, IdCard 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// --- Configuración de Animación (Se mantiene el rebote suave) ---
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20 // Entra desde abajo ligeramente
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 25,
      mass: 0.5
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 10,
    transition: { duration: 0.15, ease: "easeOut" }
  }
};

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'DNI', 
    document_number: '',
    position: '',
    entry_date: '',
    salary: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('employees').insert([formData]);
      if (error) throw error;

      setFormData({ full_name: '', document_type: 'DNI', document_number: '', position: '', entry_date: '', salary: '' });
      onSuccess(); 
      onClose();   
    } catch (error) {
      console.error('Error:', error.message);
      // Idealmente usar un toast aquí
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
          
          {/* Backdrop (Fondo oscurecido y desenfocado) */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-all"
            onClick={onClose} 
          />

          {/* --- MODAL TODO BLANCO --- */}
          <motion.div 
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            // Cambio clave: bg-white puro y una sombra suave y difusa
            className="bg-white w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            
            {/* --- Header Limpio (Blanco) --- */}
            <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                {/* Título más grande y oscuro */}
                <h3 className="text-slate-900 font-extrabold text-2xl tracking-tight mb-1">Nuevo Colaborador</h3>
                <p className="text-slate-500 text-sm font-medium">Complete la información para el alta en planilla.</p>
              </div>
              {/* Botón de cierre oscuro para contrastar con el fondo blanco */}
              <button 
                onClick={onClose} 
                className="bg-slate-100 p-2 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition mt-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* --- Formulario --- */}
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              
              {/* Sección 1 */}
              <div className="space-y-4">
                {/* Icono de sección ahora es gris neutro */}
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <User size={16} className="text-slate-400" /> Datos Personales
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    {/* Los inputs mantienen un gris muy claro para diferenciarse del fondo blanco */}
                    <input 
                      name="full_name" 
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:ring-0 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                      placeholder="Nombre Completo"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-1 relative group">
                      <FileBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10 group-focus-within:text-slate-800 transition-colors" size={18} />
                      <select 
                        name="document_type" 
                        value={formData.document_type}
                        onChange={handleChange}
                        className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 outline-none transition-all appearance-none cursor-pointer relative z-0"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">CE</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    
                    <div className="col-span-2 relative group">
                      <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                      <input 
                        name="document_number" 
                        required
                        value={formData.document_number}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:ring-0 outline-none transition-all placeholder:text-slate-400 font-mono placeholder:font-medium"
                        placeholder="Número de documento"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Separador sutil */}
              <hr className="border-slate-100" />

              {/* Sección 2 */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                  <Briefcase size={16} className="text-slate-400" /> Datos Laborales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2 relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    <input 
                      name="position" 
                      required
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:ring-0 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                      placeholder="Cargo o Puesto de Trabajo"
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    </div>
                    <input 
                      name="entry_date" 
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-600 focus:text-slate-800 focus:bg-white focus:border-slate-800 focus:ring-0 outline-none transition-all"
                    />
                  </div>

                   <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-800 transition-colors" size={18} />
                    <input 
                      name="salary" 
                      type="number"
                      required
                      step="0.01"
                      value={formData.salary}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-slate-800 focus:ring-0 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                      placeholder="Sueldo Básico (S/)"
                    />
                  </div>
                </div>
              </div>

              {/* --- Footer --- */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row gap-3 border-t border-slate-50 shrink-0">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-3.5 border-2 border-slate-200 text-slate-700 rounded-2xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors focus:ring-2 focus:ring-slate-200 focus:outline-none"
                >
                  Cancelar
                </button>
                {/* Botón Principal: Se mantiene oscuro para ser el único punto de contraste fuerte */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-[#0F172A] text-white rounded-2xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all hover:shadow-xl active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 focus:ring-2 focus:ring-slate-800 focus:ring-offset-2 focus:outline-none"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>Guardar Personal</span>
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddEmployeeModal;