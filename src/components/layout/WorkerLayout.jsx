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
    // Vibración suave en móviles si es compatible
    if (navigator.vibrate) navigator.vibrate(50);
    
    setIsLoggingOut(true);
    setTimeout(() => {
      logoutWorker();
      navigate('/', { replace: true });
    }, 1500); 
  };

  if (loading) return <div className="h-[100dvh] flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#003366]"/></div>;
  if (!worker) return null;

  return (
    // Usamos 100dvh para mejor soporte en móviles (evita problemas con la barra de URL)
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden border-x border-slate-200">
      
      {/* --- OVERLAY DE DESPEDIDA (ANIMADO) --- */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#003366] text-white"
          >
             <motion.div 
               initial={{ scale: 0.8 }} animate={{ scale: 1 }} 
               className="flex flex-col items-center p-6 text-center"
             >
              <img src={logoFull} alt="Logo" className="h-28 brightness-0 invert mb-8 opacity-90 drop-shadow-lg" />
              <h2 className="text-3xl font-bold mb-2 tracking-tight">¡Hasta pronto!</h2>
              <p className="text-blue-200 text-sm mb-8">Cerrando sesión segura...</p>
              <Loader2 className="animate-spin text-[#f0c419]" size={40} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ÁREA PRINCIPAL --- */}
      {/* pb-32 asegura que el contenido final no quede tapado por la barra flotante */}
      <main className="flex-1 overflow-y-auto pb-32 scrollbar-hide bg-gradient-to-b from-slate-50 to-[#eff6ff]">
        <Outlet />
      </main>

      {/* --- BARRA DE NAVEGACIÓN (PREMIUM) --- */}
      <div className="absolute bottom-0 w-full max-w-md z-50">
        
        {/* Contenedor con efecto Glassmorphism */}
        <div className="bg-white/90 backdrop-blur-lg border-t border-slate-200/60 px-8 py-4 flex justify-between items-end rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,51,102,0.15)]">
          
          {/* 1. BOTÓN INICIO */}
          <NavLink 
              to="/worker/dashboard" 
              className={({ isActive }) => 
                  `group flex flex-col items-center gap-1.5 transition-all duration-300`
              }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-50 text-[#003366]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                   <Home size={26} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold transition-all ${isActive ? 'text-[#003366] opacity-100' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}>
                  Inicio
                </span>
              </>
            )}
          </NavLink>

          {/* 2. BOTÓN CENTRAL (ASISTENCIA) - FLOTANTE */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-10">
            <NavLink 
              to="/worker/asistencia" 
              className={({ isActive }) => 
                  `relative w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-900/30 
                   border-[6px] border-[#F8FAFC] transform transition-all duration-300 active:scale-90
                   ${isActive ? 'bg-[#f0c419] text-[#003366] scale-110' : 'bg-[#003366] hover:bg-[#004488]'}`
              }
            >
              <MapPin size={32} strokeWidth={2.5} />
              {/* Efecto de pulso si está activo */}
              {({ isActive }) => isActive && (
                 <span className="absolute inset-0 rounded-full bg-[#f0c419] opacity-30 animate-ping"></span>
              )}
            </NavLink>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#003366] opacity-80">
              Asistencia
            </span>
          </div>

          {/* 3. BOTÓN SALIR (ROJO AL INTERACTUAR) */}
          <button 
              onClick={handleLogout} 
              className="group flex flex-col items-center gap-1.5 transition-all duration-300"
          >
            {/* El contenedor cambia a rojo suave al pasar el mouse/tocar */}
            <div className="p-2 rounded-xl transition-colors duration-300 group-hover:bg-red-50">
              <LogOut 
                size={26} 
                className="text-slate-400 transition-colors duration-300 group-hover:text-red-500" 
              />
            </div>
            <span className="text-[10px] font-bold text-slate-300 transition-opacity duration-300 opacity-0 group-hover:opacity-100 group-hover:text-red-400">
              Salir
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default WorkerLayout;