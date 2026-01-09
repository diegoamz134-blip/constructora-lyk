import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, MapPin, LogOut, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import logoFull from '../../assets/images/logo-lk-full.png';

const WorkerLayout = () => {
  const navigate = useNavigate();
  const { worker, logoutWorker, loading } = useWorkerAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !worker) {
      navigate('/', { replace: true });
    }
  }, [worker, loading, navigate]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      logoutWorker();
      navigate('/', { replace: true });
    }, 1500); 
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#003366]"/></div>;
  if (!worker) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden border-x border-slate-200">
      
      {/* Overlay de Despedida */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#003366] text-white"
          >
             <div className="flex flex-col items-center p-6 text-center">
              <img src={logoFull} alt="Logo" className="h-24 brightness-0 invert mb-6 opacity-90" />
              <h2 className="text-2xl font-bold mb-2">¡Hasta pronto!</h2>
              <Loader2 className="animate-spin text-[#f0c419]" size={32} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide bg-[#F8FAFC]">
        <Outlet />
      </main>

      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      <div className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-end z-50 rounded-t-3xl shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
        
        {/* Enlace: INICIO */}
        <NavLink 
            to="/worker/dashboard" 
            className={({ isActive }) => 
                `flex flex-col items-center gap-1 p-2 transition-colors ${isActive ? 'text-[#003366]' : 'text-slate-300'}`
            }
        >
          {({ isActive }) => (
            <>
              <Home size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Inicio</span>
            </>
          )}
        </NavLink>

        {/* Botón Flotante Central: ASISTENCIA */}
        <div className="relative -top-6">
          <NavLink 
            to="/worker/asistencia" 
            className={({ isActive }) => 
                `w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-[#F8FAFC] transform transition-transform active:scale-95 ${isActive ? 'bg-[#f0c419]' : 'bg-[#003366]'}`
            }
          >
            <MapPin size={24} />
          </NavLink>
        </div>

        {/* Botón: SALIR */}
        <button 
            onClick={handleLogout} 
            className="flex flex-col items-center gap-1 p-2 text-slate-300 hover:text-red-500 transition-colors"
        >
          <LogOut size={24} />
          <span className="text-[10px] font-bold">Salir</span>
        </button>
      </div>
    </div>
  );
};

export default WorkerLayout;