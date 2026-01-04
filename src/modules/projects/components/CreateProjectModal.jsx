import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Building2, MapPin, Hash } from 'lucide-react';
// CORRECCIÓN: Ruta correcta hacia supabase (3 niveles arriba)
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

const CreateProjectModal = ({ isOpen, onClose, onSuccess, projectToEdit }) => {
  const [loading, setLoading] = useState(false);
  
  // Estado inicial incluyendo project_code
  const [formData, setFormData] = useState({
    name: '',
    project_code: '', 
    location: '',
    start_date: '',
    end_date: '',
    status: 'En Ejecución'
  });

  // Efecto para cargar datos si estamos editando
  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        name: projectToEdit.name || '',
        project_code: projectToEdit.project_code || '', 
        location: projectToEdit.location || '',
        start_date: projectToEdit.start_date || '',
        end_date: projectToEdit.end_date || '',
        status: projectToEdit.status || 'En Ejecución'
      });
    } else {
      // Limpiar si es nuevo
      setFormData({ 
        name: '', 
        project_code: '', 
        location: '', 
        start_date: '', 
        end_date: '', 
        status: 'En Ejecución' 
      });
    }
  }, [projectToEdit, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (projectToEdit) {
        // MODO EDICIÓN: Actualizar
        const { error } = await supabase
          .from('projects')
          .update(formData)
          .eq('id', projectToEdit.id);
        if (error) throw error;
      } else {
        // MODO CREACIÓN: Insertar
        const { error } = await supabase
          .from('projects')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar proyecto: ' + error.message);
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
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">
                {projectToEdit ? 'Editar Proyecto' : 'Registrar Nuevo Proyecto'}
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* CAMPO 1: NOMBRE DEL PROYECTO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Proyecto</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="name" required value={formData.name} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    placeholder="Ej: Residencial Los Álamos"
                  />
                </div>
              </div>

              {/* CAMPO 2: CÓDIGO ÚNICO / C.C. */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Código / C.C.</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="project_code" 
                    required 
                    value={formData.project_code} 
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    placeholder="Ej: PC-25572"
                  />
                </div>
              </div>

              {/* CAMPO 3: UBICACIÓN */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Ubicación</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    name="location" required value={formData.location} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    placeholder="Ej: Av. Principal 123, Lima"
                  />
                </div>
              </div>

              {/* FECHAS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha Inicio</label>
                  <input 
                    type="date" name="start_date" required value={formData.start_date} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha Entrega</label>
                  <input 
                    type="date" name="end_date" required value={formData.end_date} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button disabled={loading} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> {projectToEdit ? 'Actualizar' : 'Crear Proyecto'}</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateProjectModal;