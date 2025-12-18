import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileText, Clock, Upload, User, Save } from 'lucide-react';
import { supabase } from '../../../services/supabase';

const AddAbsenceModal = ({ isOpen, onClose, onSuccess, type }) => {
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [formData, setFormData] = useState({
    person_id: '',
    absence_type: 'VACACIONES', // VACACIONES, DESC_MEDICO, PERMISO_HORAS
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    total_hours: 0,
    reason: '',
    document_url: ''
  });

  // Cargar lista de personas según el tipo (Obrero o Staff)
  useEffect(() => {
    if (isOpen) {
      fetchPeople();
    }
  }, [isOpen, type]);

  const fetchPeople = async () => {
    try {
      const table = type === 'workers' ? 'workers' : 'employees';
      const { data, error } = await supabase
        .from(table)
        .select('id, full_name, document_number')
        .eq('status', 'Activo')
        .order('full_name');
      
      if (data) setPeople(data);
    } catch (error) {
      console.error("Error cargando personal:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calcular días si no es por horas
      let days = 0;
      if (formData.absence_type !== 'PERMISO_HORAS') {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        const diffTime = Math.abs(end - start);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      }

      const payload = {
        type: formData.absence_type,
        start_date: formData.start_date,
        end_date: formData.absence_type === 'PERMISO_HORAS' ? formData.start_date : formData.end_date,
        total_days: days,
        total_hours: formData.total_hours,
        reason: formData.reason,
        status: 'Aprobado'
      };

      // Asignar ID correcto
      if (type === 'workers') payload.worker_id = formData.person_id;
      else payload.employee_id = formData.person_id;

      const { error } = await supabase.from('absences').insert([payload]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      alert('Error al registrar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-[#003366]" /> Registrar Ausencia / Vacaciones
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Selección de Personal */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Colaborador ({type === 'workers' ? 'Obrero' : 'Staff'})</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select 
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  onChange={(e) => setFormData({...formData, person_id: e.target.value})}
                >
                  <option value="">Seleccione un colaborador...</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tipo de Ausencia */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Registro</label>
              <div className="grid grid-cols-3 gap-2">
                {['VACACIONES', 'DESC_MEDICO', 'PERMISO_HORAS'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({...formData, absence_type: t})}
                    className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
                      formData.absence_type === t 
                        ? 'bg-[#003366] text-white border-[#003366]' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Desde</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              
              {formData.absence_type !== 'PERMISO_HORAS' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Hasta</label>
                  <input 
                    type="date" 
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}

              {formData.absence_type === 'PERMISO_HORAS' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cant. Horas</label>
                  <input 
                    type="number" 
                    required
                    min="1" max="8"
                    value={formData.total_hours}
                    onChange={(e) => setFormData({...formData, total_hours: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            {/* Motivo / Diagnóstico */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">
                {formData.absence_type === 'DESC_MEDICO' ? 'Diagnóstico Médico' : 'Detalle / Motivo'}
              </label>
              <textarea 
                rows="2"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                placeholder="Especifique detalles..."
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-[#003366] text-white font-bold hover:bg-blue-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
              >
                {loading ? 'Guardando...' : <><Save size={18}/> Registrar</>}
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddAbsenceModal;