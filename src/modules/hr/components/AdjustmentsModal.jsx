import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, HardHat, Clock, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdjustmentsModal = ({ isOpen, onClose, onSave, initialData, workerName }) => {
  const [formData, setFormData] = useState({
    // --- Existentes ---
    bonus: 0,                 // Bonificación Voluntaria (Imponible)
    deduction: 0,             // Descuentos Varios
    holidayDaysOverride: '',  // Override manual de días feriados (Para pago triple)

    // --- Bonos por Condición ---
    heightDays: 0,            // Días con bonificación de altura (7%)
    waterDays: 0,             // Días con bonificación de agua (20%)
    
    // --- Tiempos y Feriados ---
    sundayHours: 0,           // Horas trabajadas en Domingo/Descanso
    holidayHours: 0,          // Horas trabajadas en Feriado (100% extra)
    
    // --- NUEVO CAMPO SOLICITADO ---
    paidHolidays: 0,          // Días Feriados NO TRABAJADOS (Resta base de BUC/Movilidad)
    
    // --- No Imponibles ---
    viaticos: 0               // Viáticos / Pasajes
  });

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        bonus: initialData.bonus || 0,
        deduction: initialData.deduction || 0,
        holidayDaysOverride: initialData.holidayDaysOverride !== undefined ? initialData.holidayDaysOverride : '',
        
        heightDays: initialData.heightDays || 0,
        waterDays: initialData.waterDays || 0,
        sundayHours: initialData.sundayHours || 0,
        holidayHours: initialData.holidayHours || 0,
        
        // Cargar nuevo campo
        paidHolidays: initialData.paidHolidays || 0,
        
        viaticos: initialData.viaticos || 0,
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      // Existentes
      bonus: Number(formData.bonus),
      deduction: Number(formData.deduction),
      holidayDaysOverride: formData.holidayDaysOverride === '' ? null : Number(formData.holidayDaysOverride),
      
      // Nuevos anteriores
      heightDays: Number(formData.heightDays),
      waterDays: Number(formData.waterDays),
      sundayHours: Number(formData.sundayHours),
      holidayHours: Number(formData.holidayHours),
      
      // Nuevo actual
      paidHolidays: Number(formData.paidHolidays),
      
      viaticos: Number(formData.viaticos),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Novedades Semanales</h3>
              <p className="text-xs text-slate-500 font-medium">{workerName}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Alerta Informativa */}
            <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start text-xs text-blue-700 border border-blue-100">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p>
                <b>Nota:</b> Usa "Hrs. Trabajadas Feriado" para pagar doble. Usa "Feriados (No Trabajados)" para que el sistema no pague BUC/Movilidad esos días.
              </p>
            </div>

            {/* SECCIÓN 1: BONIFICACIONES POR CONDICIÓN */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <HardHat size={14} /> Condiciones de Trabajo (Días)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Altura (7%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" max="7" step="1"
                      value={formData.heightDays}
                      onChange={(e) => setFormData({...formData, heightDays: e.target.value})}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Días"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Días</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Agua (20%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0" max="7" step="1"
                      value={formData.waterDays}
                      onChange={(e) => setFormData({...formData, waterDays: e.target.value})}
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Días"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">Días</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 2: TIEMPOS ESPECIALES */}
            <div className="space-y-3 pt-2 border-t border-slate-50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} /> Tiempos y Feriados
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Horas Domingo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hrs. Domingo/Descanso</label>
                  <input 
                    type="number" step="0.5"
                    value={formData.sundayHours}
                    onChange={(e) => setFormData({...formData, sundayHours: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                {/* Horas Feriado TRABAJADO */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Hrs. Trabajadas Feriado</label>
                  <input 
                    type="number" step="0.5"
                    value={formData.holidayHours}
                    onChange={(e) => setFormData({...formData, holidayHours: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                {/* NUEVO CAMPO: Paid Holidays (No Trabajados) */}
                <div className="col-span-2 bg-orange-50 p-3 rounded-xl border border-orange-100">
                  <label className="block text-sm font-bold text-orange-800 mb-1">Días Feriados (No Trabajados)</label>
                  <div className="flex gap-4 items-center">
                    <input 
                        type="number" 
                        min="0" max="7" step="1"
                        value={formData.paidHolidays}
                        onChange={(e) => setFormData({...formData, paidHolidays: e.target.value})}
                        className="w-24 p-2.5 rounded-xl border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold text-orange-900"
                    />
                    <p className="text-[10px] text-orange-600 leading-tight">
                        Cantidad de feriados pagados en el básico que <b>NO se trabajaron</b>.<br/>
                        El sistema restará estos días del cálculo de <b>BUC</b> y <b>Movilidad</b>.
                    </p>
                  </div>
                </div>

                {/* Días Feriados Override (Existente) */}
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Corrección Manual Pago Feriado</label>
                  <input 
                    type="number" 
                    step="0.5"
                    placeholder="Dejar vacío para cálculo automático"
                    value={formData.holidayDaysOverride}
                    onChange={(e) => setFormData({...formData, holidayDaysOverride: e.target.value})}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Uso avanzado: Fuerza el cálculo de la sobretasa por feriado (Pago Triple).</p>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: MONTOS DINERARIOS */}
            <div className="space-y-3 pt-2 border-t border-slate-50">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wallet size={14} /> Ajustes Monetarios
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Viáticos */}
                <div className="col-span-2">
                   <label className="block text-sm font-bold text-blue-700 mb-1">Viáticos / Reintegros (No Afecto)</label>
                   <div className="relative">
                    <span className="absolute left-3 top-2.5 text-blue-600 font-bold">S/.</span>
                    <input 
                      type="number" step="0.01"
                      value={formData.viaticos}
                      onChange={(e) => setFormData({...formData, viaticos: e.target.value})}
                      className="w-full pl-10 p-2.5 rounded-xl border border-blue-200 bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                      placeholder="0.00"
                    />
                   </div>
                </div>

                {/* Bonificación Manual */}
                <div>
                  <label className="block text-sm font-bold text-green-700 mb-1">Bonif. Extra (Afecto)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-green-600 font-bold">S/.</span>
                    <input 
                      type="number" step="0.01"
                      value={formData.bonus}
                      onChange={(e) => setFormData({...formData, bonus: e.target.value})}
                      className="w-full pl-10 p-2.5 rounded-xl border border-green-200 bg-green-50/30 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Descuento Manual */}
                <div>
                  <label className="block text-sm font-bold text-red-700 mb-1">Descuento Vario</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-red-600 font-bold">S/.</span>
                    <input 
                      type="number" step="0.01"
                      value={formData.deduction}
                      onChange={(e) => setFormData({...formData, deduction: e.target.value})}
                      className="w-full pl-10 p-2.5 rounded-xl border border-red-200 bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
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