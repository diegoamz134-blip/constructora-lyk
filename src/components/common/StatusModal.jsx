import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25 }
  },
  exit: { opacity: 0, scale: 0.8, y: 20 }
};

const StatusModal = ({ isOpen, onClose, type = 'success', title, message }) => {
  
  // Configuración según el tipo de alerta
  const config = {
    success: {
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      buttonColor: 'bg-green-600 hover:bg-green-700',
      icon: <CheckCircle2 size={48} />,
      defaultTitle: '¡Éxito!'
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      buttonColor: 'bg-red-600 hover:bg-red-700',
      icon: <XCircle size={48} />,
      defaultTitle: 'Ocurrió un error'
    },
    warning: {
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      buttonColor: 'bg-orange-500 hover:bg-orange-600',
      icon: <AlertCircle size={48} />,
      defaultTitle: 'Advertencia'
    }
  };

  const currentConfig = config[type] || config.success;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* Fondo borroso */}
          <motion.div 
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-center p-8"
          >
            {/* Icono Animado */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${currentConfig.bgColor} ${currentConfig.color}`}>
              {currentConfig.icon}
            </div>

            <h3 className="text-2xl font-bold text-slate-800 mb-2">
              {title || currentConfig.defaultTitle}
            </h3>
            
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {message}
            </p>

            <button 
              onClick={onClose}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform ${currentConfig.buttonColor}`}
            >
              Entendido
            </button>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StatusModal;