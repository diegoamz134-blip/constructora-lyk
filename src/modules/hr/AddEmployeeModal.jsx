import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Loader2, User, FileBadge, 
  Briefcase, Calendar, DollarSign, Hashtag 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// Configuración de la animación de rebote (Spring)
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: -30 // Empieza un poco más arriba
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      type: "spring", // Tipo resorte
      stiffness: 350, // Tensión (más alto = más rápido/rígido)
      damping: 25,    // Resistencia (más bajo = más rebote)
      mass: 0.8       // Peso
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

const AddEmployeeModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'DNI', // Valor por defecto
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
      // Enviamos los datos, incluyendo el nuevo document_type
      const { error } = await supabase
        .from('employees')
        .insert([formData]);

      if (error) throw error;

      // Limpiar formulario
      setFormData({ 
        full_name: '', 
        document_type: 'DNI', 
        document_number: '', 
        position: '', 
        entry_date: '', 
        salary: '' 
      });
      onSuccess(); // Recargar tabla padre
      onClose();   // Cerrar modal
    } catch (error) {
      console.error('Error:', error.message);
      // Aquí podrías usar un toast notification en lugar de alert
      alert('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Usamos AnimatePresence para que la animación de salida funcione
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          
          {/* Backdrop oscuro con desenfoque */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-sm transition-all"
            onClick={onClose} // Cerrar al hacer clic fuera
          />

          {/* Contenedor del Modal */}
          <motion.div 
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()} // Evitar cerrar al hacer clic dentro
          >
            {/* Header Premium */}
            <div className="bg-[#0F172A] px-8 py-5 flex justify-between items-center relative overflow-hidden">
              {/* Decoración de fondo sutil */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl"></div>
              
              <div>
                <h3 className="text-white font-bold text-xl tracking-tight">Nuevo Colaborador</h3>
                <p className="text-blue-200 text-sm">Complete la ficha de ingreso</p>
              </div>
              <button 
                onClick={onClose} 
                className="bg-white/10 p-2 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario con Iconos y Secciones */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              
              {/* --- SECCIÓN 1: Datos Personales --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <User size={18} className="text-blue-600" /> Datos Personales
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {/* Nombre Completo */}
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="full_name" 
                      required
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Nombre Completo"
                    />
                  </div>

                  {/* Grupo: Tipo y Número de Documento */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Selector Tipo Documento */}
                    <div className="col-span-1 relative">
                      <FileBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                      <select 
                        name="document_type" 
                        value={formData.document_type}
                        onChange={handleChange}
                        className="w-full pl-12 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer relative z-0"
                      >
                        <option value="DNI">DNI</option>
                        <option value="CE">CE (Extranjería)</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                      {/* Flecha personalizada para el select */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    
                    {/* Input Número Documento */}
                    <div className="col-span-2 relative">
                      <Hashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        name="document_number" 
                        required
                        value={formData.document_number}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono"
                        placeholder="Número de documento"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* --- SECCIÓN 2: Datos Laborales --- */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-600" /> Datos Laborales & Económicos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Puesto */}
                  <div className="md:col-span-3 relative">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="position" 
                      required
                      value={formData.position}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Cargo o Puesto de Trabajo"
                    />
                  </div>
                  
                  {/* Fecha Ingreso */}
                  <div className="relative">
                     {/* Truco para que el icono no tape el selector de fecha nativo */}
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Calendar className="text-slate-400" size={18} />
                    </div>
                    <input 
                      name="entry_date" 
                      type="date"
                      required
                      value={formData.entry_date}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                   {/* Sueldo */}
                   <div className="relative md:col-span-2">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="salary" 
                      type="number"
                      required
                      step="0.01" // Permitir decimales
                      value={formData.salary}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="Sueldo Básico Mensual (S/)"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Botones */}
              <div className="pt-6 flex gap-4 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-3.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 px-6 py-3.5 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Guardar Personal
                    </>
                  )}
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