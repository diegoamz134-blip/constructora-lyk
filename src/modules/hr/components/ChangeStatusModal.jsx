import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Activity, AlertTriangle, CheckCircle2, Ban, Palmtree, Clock } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import StatusModal from '../../../components/common/StatusModal';

const STATUS_OPTIONS = [
  { value: 'Activo', label: 'Activo (Acceso Permitido)', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { value: 'Vacaciones', label: 'Vacaciones (Acceso Bloqueado)', icon: Palmtree, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { value: 'Permiso', label: 'Permiso / Descanso (Acceso Bloqueado)', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { value: 'De Baja', label: 'De Baja / Inactivo (Acceso Bloqueado)', icon: Ban, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
];

const ChangeStatusModal = ({ isOpen, onClose, user, isWorker, onSuccess }) => {
  const [selectedStatus, setSelectedStatus] = useState(user?.status || 'Activo');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  const handleSave = async () => {
    setLoading(true);
    try {
      const table = isWorker ? 'workers' : 'employees';
      
      const { error } = await supabase
        .from(table)
        .update({ status: selectedStatus })
        .eq('id', user.id);

      if (error) throw error;

      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Estado Actualizado',
        message: `El usuario ahora está: ${selectedStatus}`
      });
    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el estado.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, isOpen: false });
    if (notification.type === 'success') {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-50 p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-[#003366]" size={20}/> Cambiar Estado
            </h3>
            <p className="text-xs text-slate-500 mt-1">Usuario: <span className="font-bold">{user.full_name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex gap-3 items-start">
             <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={18}/>
             <p className="text-xs text-slate-600 leading-relaxed">
               <span className="font-bold">Importante:</span> Si seleccionas "Vacaciones", "Permiso" o "De Baja", el usuario <span className="font-bold text-red-500">perderá el acceso al sistema</span> inmediatamente hasta que lo vuelvas a activar.
             </p>
          </div>

          <div className="space-y-3">
             {STATUS_OPTIONS.map((option) => {
               const Icon = option.icon;
               const isSelected = selectedStatus === option.value;
               
               return (
                 <button
                   key={option.value}
                   onClick={() => setSelectedStatus(option.value)}
                   className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 group text-left ${
                     isSelected 
                       ? `${option.border} ${option.bg} ring-1 ring-offset-1 ring-blue-100` 
                       : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-white' : 'bg-slate-100 group-hover:bg-white'}`}>
                       <Icon className={isSelected ? option.color : 'text-slate-400'} size={20}/>
                    </div>
                    <div>
                       <span className={`block text-sm font-bold ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>{option.value}</span>
                       <span className="text-[10px] text-slate-400">{option.label}</span>
                    </div>
                    {isSelected && <div className="ml-auto text-blue-600"><CheckCircle2 size={20}/></div>}
                 </button>
               );
             })}
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50">
           <button onClick={onClose} className="flex-1 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
           <button 
             onClick={handleSave} 
             disabled={loading}
             className="flex-1 py-2.5 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition"
           >
             {loading ? 'Guardando...' : <><Save size={18}/> Actualizar Estado</>}
           </button>
        </div>

      </motion.div>

      <StatusModal 
        isOpen={notification.isOpen}
        onClose={handleCloseNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
};

export default ChangeStatusModal;