import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Activity, AlertTriangle, Ban, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';

// Variantes de Animación
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

// Configuración de Estados
const STATUS_OPTIONS = [
  {
    id: 'Activo',
    label: 'Activo (Trabajando)',
    color: 'bg-green-50 border-green-200 text-green-700',
    icon: Activity,
    dot: 'bg-green-500'
  },
  {
    id: 'De Baja',
    label: 'De Baja (Inactivo)',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    icon: AlertTriangle,
    dot: 'bg-yellow-500'
  },
  {
    id: 'Despedido',
    label: 'Despedido (Cesado)',
    color: 'bg-red-50 border-red-200 text-red-700',
    icon: Ban,
    dot: 'bg-red-500'
  }
];

const ChangeStatusModal = ({ isOpen, onClose, user, activeTab, onSuccess }) => {
  const [selectedStatus, setSelectedStatus] = useState(user?.status || 'Activo');
  const [loading, setLoading] = useState(false);

  // Sincronizar estado inicial al abrir
  React.useEffect(() => {
    if (user) setSelectedStatus(user.status || 'Activo');
  }, [user, isOpen]);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      const { error } = await supabase
        .from(table)
        .update({ status: selectedStatus })
        .eq('id', user.id);

      if (error) throw error;
      
      onSuccess(); // Recargar tabla
      onClose();   // Cerrar modal
    } catch (error) {
      console.error('Error actualizando estado:', error);
      alert('Error al actualizar el estado');
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose} 
          />
          
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800">Cambiar Estado</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"><X size={20}/></button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 mb-2">
                Selecciona el nuevo estado para <span className="font-bold text-slate-700">{user?.full_name}</span>:
              </p>

              <div className="space-y-3">
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedStatus === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedStatus(option.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isSelected 
                          ? `${option.color} border-current shadow-sm` 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-white/50`}>
                            <Icon size={18} />
                        </div>
                        <span className="font-bold text-sm">{option.label}</span>
                      </div>
                      
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check size={20} strokeWidth={3} />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 text-slate-600 font-bold text-sm bg-white border border-slate-200 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="flex-1 py-2.5 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18}/> : 'Guardar Estado'}
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ChangeStatusModal;