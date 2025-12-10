import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, Loader2, Calendar } from 'lucide-react';
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

const AddAdvanceModal = ({ isOpen, onClose, person, onSuccess, type }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !person) return;
    setLoading(true);

    try {
      const payload = {
        amount: parseFloat(amount),
        reason: reason || 'Adelanto',
        date: date,
        status: 'Pendiente'
      };

      // [CAMBIO] Decidir a quién asignar el adelanto
      if (type === 'staff') {
        payload.employee_id = person.id;
      } else {
        payload.worker_id = person.id;
      }

      const { error } = await supabase.from('advances').insert([payload]);

      if (error) throw error;

      onSuccess();
      onClose();
      setAmount('');
      setReason('');
    } catch (error) {
      alert('Error al registrar adelanto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && person && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose} 
          />
          
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
          >
            <div className="bg-[#003366] p-6 text-white">
              <button onClick={onClose} className="absolute top-4 right-4 p-1 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={18}/></button>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Banknote /> Registrar Vale
              </h3>
              <p className="text-blue-200 text-xs mt-1">
                Adelanto para: <span className="font-bold text-white">{person.full_name}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Monto (S/.)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                  <input 
                    type="number" step="0.01" min="0" required
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:border-[#003366]"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    type="date" required
                    value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Motivo (Opcional)</label>
                <input 
                  type="text" 
                  value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                  placeholder="Ej: Alimentos, Pasaje..."
                />
              </div>

              <div className="pt-2">
                <button 
                  disabled={loading}
                  className="w-full py-3.5 bg-[#003366] text-white rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Guardar Adelanto'}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AddAdvanceModal;