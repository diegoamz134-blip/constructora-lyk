import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, Ban, Palmtree, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { sendUnlockRequest } from '../../../services/notificationsService';

const AccessDeniedModal = ({ isOpen, onClose, user, status, isWorker }) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  // Configuración visual según el estado del usuario
  const statusConfig = {
    'Vacaciones': {
      icon: Palmtree,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      title: 'Modo Vacaciones',
      msg: 'Esperamos que estés disfrutando tu descanso. Por política de la empresa, el acceso está restringido durante este periodo.'
    },
    'De Baja': {
      icon: Ban,
      color: 'text-red-500',
      bg: 'bg-red-50',
      title: 'Cuenta Desactivada',
      msg: 'Tu cuenta figura como dada de baja en el sistema. Si crees que es un error, contacta inmediatamente con RRHH.'
    },
    'Permiso': {
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      title: 'Permiso Temporal',
      msg: 'Tu cuenta está en pausa por un permiso registrado. El acceso se restablecerá al finalizar el mismo.'
    }
  };

  const currentConfig = statusConfig[status] || {
    icon: AlertTriangle,
    color: 'text-slate-500',
    bg: 'bg-slate-50',
    title: `Estado: ${status}`,
    msg: 'Tu cuenta no está activa en este momento.'
  };

  const Icon = currentConfig.icon;

  const handleSendNotification = async () => {
    setSending(true);
    try {
      await sendUnlockRequest(user, status, isWorker);
      setSent(true);
    } catch (error) {
      console.error(error);
      alert("No se pudo enviar la notificación. Por favor contacta a la oficina.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition z-10">
          <X size={20} className="text-slate-500"/>
        </button>

        <div className="p-8 flex flex-col items-center text-center">
           
           {/* Icono Principal */}
           <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${currentConfig.bg} ${currentConfig.color}`}>
              <Icon size={40} strokeWidth={1.5} />
           </div>

           <h2 className="text-2xl font-black text-slate-800 mb-2">{currentConfig.title}</h2>
           <p className="text-slate-500 mb-8 leading-relaxed">
             {currentConfig.msg}
           </p>

           <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Usuario Identificado</p>
              <p className="text-sm font-bold text-slate-700">{user?.full_name || 'Usuario'}</p>
              <p className="text-xs text-slate-500">{user?.document_number}</p>
           </div>

           {/* Botón de Acción */}
           <AnimatePresence mode='wait'>
             {sent ? (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                 className="w-full p-4 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2 font-bold border border-green-100"
               >
                 <CheckCircle2 size={20}/> Solicitud enviada a RR.HH.
               </motion.div>
             ) : (
               <button 
                 onClick={handleSendNotification}
                 disabled={sending}
                 className="w-full py-3.5 bg-[#003366] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 active:scale-95 transition-all flex items-center justify-center gap-2"
               >
                 {sending ? <Loader2 className="animate-spin"/> : <Send size={18}/>}
                 Notificar a RR.HH. para desbloqueo
               </button>
             )}
           </AnimatePresence>

           {!sent && (
             <p className="text-[10px] text-slate-400 mt-4">
               Se enviará una alerta inmediata al panel de administración.
             </p>
           )}
        </div>
      </motion.div>
    </div>
  );
};

export default AccessDeniedModal;