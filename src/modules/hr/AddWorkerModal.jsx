import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, Loader2, User, FileBadge, 
  HardHat, Calendar, MapPin, Hash, DollarSign
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';

// Variantes de animación estándar para el modal
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

const AddWorkerModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Estado para los datos del obrero
  const [formData, setFormData] = useState({
    full_name: '',
    document_number: '',
    category: 'Peón', // Valor por defecto
    weekly_rate: '',  // [NUEVO] Campo para el sueldo semanal
    project_assigned: '',
    start_date: '',
    status: 'Activo',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Encriptación de contraseña
      const rawPassword = formData.password || formData.document_number;
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      // 2. Preparar datos (convertir sueldo a número)
      const dataToSubmit = {
        ...formData,
        weekly_rate: parseFloat(formData.weekly_rate) || 0, // Asegurar que sea número
        password: hashedPassword 
      };

      // 3. Insertar en la tabla 'workers'
      const { error } = await supabase
        .from('workers')
        .insert([dataToSubmit]);

      if (error) throw error;

      // Limpiar formulario
      setFormData({ 
        full_name: '', 
        document_number: '', 
        category: 'Peón', 
        weekly_rate: '', 
        project_assigned: '', 
        start_date: '', 
        status: 'Activo', 
        password: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          
          {/* Overlay oscuro estándar */}
          <motion.div 
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={onClose} 
          />

          {/* Contenedor del Modal - Diseño Limpio */}
          <motion.div 
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 my-8 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Header Estándar */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Nuevo Obrero</h2>
                <p className="text-sm text-slate-500 mt-1">Complete la información del personal de campo.</p>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition -mr-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulario con scroll si es necesario */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                
                {/* Sección 1: Datos Personales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <User size={20} className="text-blue-600" />
                    Información Personal
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre Completo */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-slate-700">Apellidos y Nombres</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                            name="full_name" 
                            required
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Ej: Juan Pérez Rojas"
                            />
                        </div>
                    </div>

                    {/* DNI */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">N° Documento (DNI/CE)</label>
                        <div className="relative">
                            <FileBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                            name="document_number" 
                            required
                            maxLength={12}
                            value={formData.document_number}
                            onChange={(e) => setFormData({...formData, document_number: e.target.value.replace(/\D/g, '')})}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 font-mono"
                            placeholder="Ej: 45678901"
                            />
                        </div>
                    </div>

                     {/* Contraseña (Opcional) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Contraseña de Acceso</label>
                        <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                            name="password" 
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Opcional (Por defecto será el DNI)"
                            />
                        </div>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Datos Laborales */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <HardHat size={20} className="text-blue-600" />
                    Datos de Obra
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Categoría */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Categoría</label>
                        <div className="relative">
                            <HardHat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                            <select 
                            name="category" 
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all appearance-none relative z-0"
                            >
                            <option value="Peón">Peón</option>
                            <option value="Oficial">Oficial</option>
                            <option value="Operario">Operario</option>
                            <option value="Capataz">Capataz</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        </div>
                    </div>

                    {/* [NUEVO] Campo Sueldo Semanal */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Jornal Semanal (S/)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                            name="weekly_rate" 
                            type="number"
                            required
                            step="0.01"
                            value={formData.weekly_rate}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                            placeholder="0.00"
                            />
                        </div>
                    </div>
                    
                    {/* Fecha Inicio */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Fecha de Ingreso</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Calendar className="text-slate-400" size={18} />
                            </div>
                            <input 
                            name="start_date" 
                            type="date"
                            required
                            value={formData.start_date}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all text-slate-600"
                            />
                        </div>
                    </div>

                   {/* Proyecto Asignado */}
                   <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Obra / Proyecto</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                            name="project_assigned" 
                            required
                            value={formData.project_assigned}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                            placeholder="Ej: Residencial Los Álamos"
                            />
                        </div>
                  </div>
                </div>
              </div>

            </form>
            </div>

            {/* Footer con botones de acción */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-4 justify-end">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-white hover:border-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:shadow-xl active:scale-[0.98] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={20} /> Guardar Obrero
                    </>
                  )}
                </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddWorkerModal;