import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { opacity: 0, scale: 0.9, y: 20 }
};

// Ahora aceptamos props genéricas: title, message, warning
// Si recibimos 'projectName' (del código anterior), lo usamos para mantener compatibilidad
const ConfirmDeleteModal = ({ 
  isOpen, onClose, onConfirm, loading, 
  projectName, // Prop antigua (opcional)
  title, message, warning // Nuevas props para personalizar
}) => {
  
  // Lógica para determinar qué texto mostrar
  const displayTitle = title || "¿Eliminar Proyecto?";
  
  const displayMessage = message || (
    <span>Estás a punto de eliminar <span className="font-bold text-slate-700">"{projectName}"</span>.</span>
  );

  const displayWarning = warning || (projectName ? "Se borrarán tareas, bitácora y fotos permanentemente." : "Esta acción no se puede deshacer.");

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            variants={overlayVariants}
            initial="hidden" animate="visible" exit="exit"
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={!loading ? onClose : undefined} 
          />
          
          <motion.div 
            variants={modalVariants}
            initial="hidden" animate="visible" exit="exit"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500" size={32} strokeWidth={2} />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {displayTitle}
              </h3>
              
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {displayMessage}
                <br/>
                <span className="text-red-500 font-medium text-xs mt-2 block bg-red-50 py-1 px-2 rounded-lg border border-red-100">
                  ⚠️ {displayWarning}
                </span>
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></span>
                  ) : (
                    <><Trash2 size={18} /> Eliminar</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDeleteModal;