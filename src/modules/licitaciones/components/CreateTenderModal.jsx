import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Building, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../../../services/supabase';

const CreateTenderModal = ({ isOpen, onClose, onSuccess, tenderToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    location: '',
    submission_deadline: '',
    status: 'Borrador'
  });

  // [NUEVO] Efecto para cargar datos si estamos editando
  useEffect(() => {
    if (tenderToEdit) {
      setFormData({
        name: tenderToEdit.name || '',
        client: tenderToEdit.client || '',
        location: tenderToEdit.location || '',
        submission_deadline: tenderToEdit.submission_deadline || '',
        status: tenderToEdit.status || 'Borrador'
      });
    } else {
      // Limpiar si es nuevo
      setFormData({ name: '', client: '', location: '', submission_deadline: '', status: 'Borrador' });
    }
  }, [tenderToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tenderToEdit) {
        // MODO EDICIÓN: Actualizar registro existente
        const { error } = await supabase
          .from('tenders')
          .update(formData)
          .eq('id', tenderToEdit.id);
        if (error) throw error;
      } else {
        // MODO CREACIÓN: Insertar nuevo registro
        const { error } = await supabase
          .from('tenders')
          .insert([formData]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">
                {tenderToEdit ? 'Editar Licitación' : 'Nueva Licitación'}
              </h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 transition">
                <X size={20} className="text-slate-400 hover:text-slate-600"/>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Proyecto</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none transition-all" 
                  placeholder="Ej: Construcción de Cerco Perimétrico" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Cliente / Entidad</label>
                <div className="relative">
                  <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required 
                    value={formData.client} 
                    onChange={e => setFormData({...formData, client: e.target.value})} 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none transition-all" 
                    placeholder="Ej: Municipalidad Distrital..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Fecha Límite</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.submission_deadline} 
                    onChange={e => setFormData({...formData, submission_deadline: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ubicación</label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        required 
                        value={formData.location} 
                        onChange={e => setFormData({...formData, location: e.target.value})} 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none transition-all" 
                        placeholder="Ciudad, Distrito" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button disabled={loading} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2 shadow-lg active:scale-95 transition-all">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> {tenderToEdit ? 'Guardar Cambios' : 'Crear'}</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTenderModal;