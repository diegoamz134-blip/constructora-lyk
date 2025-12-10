import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, MapPin, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import logoFull from '../../assets/images/logo-lk-full.png';

const WorkerLayout = () => {
  const navigate = useNavigate();
  const { worker, logoutWorker, loading } = useWorkerAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Si terminó de cargar y no hay usuario, mandar al login
    if (!loading && !worker) {
      navigate('/');
    }
  }, [worker, loading, navigate]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Simular tiempo de carga para la animación de despedida
    setTimeout(() => {
      logoutWorker();
      navigate('/');
    }, 2000); // 2 segundos de despedida
  };

  // Pantalla de carga inicial mientras se recupera la sesión
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando sesión...</div>;
  
  if (!worker) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* --- OVERLAY DE SALIDA (DESPEDIDA) --- */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#003366] text-white"
          >
             <motion.div 
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center p-6 text-center"
            >
              <img src={logoFull} alt="Logo" className="h-24 brightness-0 invert mb-6 opacity-90" />
              <h2 className="text-2xl font-bold mb-2">¡Hasta luego, {worker.full_name.split(' ')[0]}!</h2>
              <p className="text-blue-200 text-sm mb-8">Cerrando sesión de forma segura...</p>
              <Loader2 className="animate-spin text-[#f0c419]" size={32} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CONTENIDO PRINCIPAL SCROLLEABLE --- */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        <Outlet context={{ worker }} />
      </main>

      {/* --- BARRA DE NAVEGACIÓN INFERIOR (Bottom Tab Bar) --- */}
      <div className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        <NavLink 
          to="/worker/dashboard" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[#003366]' : 'text-slate-400'}`}
        >
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Inicio</span>
        </NavLink>

        {/* Botón Central Destacado para Asistencia */}
        <div className="relative -top-8">
          <NavLink 
            to="/worker/asistencia" 
            className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-900/30 border-4 border-slate-50 transform transition-transform active:scale-95"
          >
            <MapPin size={28} />
          </NavLink>
        </div>

        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </div>
    </div>
  );
};

export default WorkerLayout;