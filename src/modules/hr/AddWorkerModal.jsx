import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Briefcase, CreditCard } from 'lucide-react';
import { supabase } from '../../services/supabase';

const AddWorkerModal = ({ isOpen, onClose, onSuccess, workerToEdit = null }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    document_number: '',
    category: 'Peon', // Valor por defecto
    project_assigned: '',
    status: 'Activo',
    pension_system: 'ONP', // Nuevo
    commission_type: 'Flujo', // Nuevo
    has_children: false, // Nuevo
    custom_daily_rate: '' // Nuevo
  });
  const [loading, setLoading] = useState(false);
  const [afpList, setAfpList] = useState([]);

  useEffect(() => {
    // Cargar lista de AFPs disponibles desde la BD
    const fetchAfps = async () => {
        const { data } = await supabase.from('afp_rates').select('name');
        if (data) setAfpList(data);
    };
    fetchAfps();

    if (workerToEdit) {
      setFormData({
        full_name: workerToEdit.full_name || '',
        document_number: workerToEdit.document_number || '',
        category: workerToEdit.category || 'Peon',
        project_assigned: workerToEdit.project_assigned || '',
        status: workerToEdit.status || 'Activo',
        pension_system: workerToEdit.pension_system || 'ONP',
        commission_type: workerToEdit.commission_type || 'Flujo',
        has_children: workerToEdit.has_children || false,
        custom_daily_rate: workerToEdit.custom_daily_rate || ''
      });
    } else {
      setFormData({ 
          full_name: '', document_number: '', category: 'Peon', 
          project_assigned: '', status: 'Activo', pension_system: 'ONP',
          commission_type: 'Flujo', has_children: false, custom_daily_rate: ''
      });
    }
  }, [workerToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = {
          ...formData,
          // Convertir vacío a null para evitar errores numéricos
          custom_daily_rate: formData.custom_daily_rate === '' ? null : parseFloat(formData.custom_daily_rate)
      };

      if (workerToEdit) {
        const { error } = await supabase.from('workers').update(dataToSave).eq('id', workerToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workers').insert([dataToSave]);
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar trabajador');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-[#003366]" /> 
            {workerToEdit ? 'Editar Trabajador' : 'Nuevo Trabajador'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Datos Personales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                <input required type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#003366] outline-none" 
                    value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">DNI / CE</label>
                <input required type="text" maxLength={12} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-[#003366] outline-none font-mono" 
                    value={formData.document_number} onChange={e => setFormData({...formData, document_number: e.target.value})} />
            </div>
          </div>

          {/* Datos Laborales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Operario">Operario</option>
                    <option value="Oficial">Oficial</option>
                    <option value="Peon">Peón</option>
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Sueldo Diario Pactado (Opcional)</label>
                <input type="number" step="0.01" placeholder="Usar tabla" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                    value={formData.custom_daily_rate} onChange={e => setFormData({...formData, custom_daily_rate: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Hijos (Asig. Escolar)</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input type="checkbox" checked={formData.has_children} onChange={e => setFormData({...formData, has_children: e.target.checked})} className="w-5 h-5 accent-[#003366]"/>
                    <span className="text-sm text-slate-600">Sí tiene</span>
                </div>
             </div>
          </div>

          {/* Datos Pensionarios */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
             <h3 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2"><CreditCard size={16}/> Régimen Pensionario</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-800/60 uppercase">Sistema</label>
                    <select className="w-full p-2 bg-white rounded-lg border border-blue-200 outline-none text-sm"
                        value={formData.pension_system} onChange={e => setFormData({...formData, pension_system: e.target.value})}>
                        <option value="ONP">ONP (Sistema Nacional)</option>
                        {afpList.map(afp => <option key={afp.name} value={afp.name}>AFP {afp.name}</option>)}
                    </select>
                </div>
                {formData.pension_system !== 'ONP' && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-blue-800/60 uppercase">Tipo de Comisión</label>
                        <select className="w-full p-2 bg-white rounded-lg border border-blue-200 outline-none text-sm"
                            value={formData.commission_type} onChange={e => setFormData({...formData, commission_type: e.target.value})}>
                            <option value="Flujo">Sobre Flujo (Sueldo)</option>
                            <option value="Mixta">Mixta (Saldo)</option>
                        </select>
                    </div>
                )}
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-[#002244] shadow-lg shadow-blue-900/20 transition flex items-center gap-2">
                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Trabajador'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AddWorkerModal;