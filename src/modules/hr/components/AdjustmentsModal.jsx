import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdjustmentsModal = ({ isOpen, onClose, onSave, initialData, workerName }) => {
  const [formData, setFormData] = useState({
    bonus: 0,
    deduction: 0,
    holidayDaysOverride: ''
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        bonus: initialData.bonus || 0,
        deduction: initialData.deduction || 0,
        holidayDaysOverride: initialData.holidayDaysOverride !== undefined ? initialData.holidayDaysOverride : ''
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      bonus: Number(formData.bonus),
      deduction: Number(formData.deduction),
      holidayDaysOverride: formData.holidayDaysOverride === '' ? null : Number(formData.holidayDaysOverride)
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        >
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Novedades / Ajustes</h3>
              <p className="text-xs text-slate-500 font-medium">{workerName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Alerta Informativa */}
            <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start text-xs text-blue-700 border border-blue-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>Aquí puedes agregar montos manuales que no están en el sistema automático (Reintegros, Bonos de Altura, Multas, etc).</p>
            </div>

            {/* Días Feriados */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Días Feriados Trabajados (Opcional)</label>
              <input 
                type="number" 
                step="0.5"
                placeholder="Ej: 1 o 2 (Déjalo vacío para usar automático)"
                value={formData.holidayDaysOverride}
                onChange={(e) => setFormData({...formData, holidayDaysOverride: e.target.value})}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400 mt-1">Si escribes un número aquí, reemplazará lo que detectó el reloj.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Bonificación Manual */}
              <div>
                <label className="block text-sm font-bold text-green-700 mb-1">Bonificación Extra (S/.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-green-600 font-bold">S/.</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.bonus}
                    onChange={(e) => setFormData({...formData, bonus: e.target.value})}
                    className="w-full pl-10 p-2.5 rounded-xl border border-green-200 bg-green-50/30 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Descuento Manual */}
              <div>
                <label className="block text-sm font-bold text-red-700 mb-1">Descuento Extra (S/.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-red-600 font-bold">S/.</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.deduction}
                    onChange={(e) => setFormData({...formData, deduction: e.target.value})}
                    className="w-full pl-10 p-2.5 rounded-xl border border-red-200 bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-lg text-sm transition-colors">Cancelar</button>
              <button type="submit" className="bg-[#003366] text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2">
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdjustmentsModal;