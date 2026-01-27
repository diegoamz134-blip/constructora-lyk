import React, { useEffect, useState } from 'react'; // <--- AGREGADO useState
import { useOutlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  ClipboardList, 
  HardHat, 
  UserCircle, 
  LogOut, 
  Building2
} from 'lucide-react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';
import OnboardingFloatingBtn from '../common/OnboardingFloatingBtn';

// --- CONFIGURACIÓN DE ANIMACIÓN DE PÁGINA ---
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

const WorkerLayout = () => {
  const { logout, currentUser, loading } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentOutlet = useOutlet();
  
  // ESTADO PARA LA ANIMACIÓN DE SALIDA
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const displayName = currentUser?.full_name || 'Obrero';
  const displayPhoto = currentUser?.photo_url || currentUser?.avatar_url || null;
  const displayRole = currentUser?.category || 'Construcción Civil';
  
  const userCategory = (currentUser?.category || '').toLowerCase().trim();
  const hasFullAccess = userCategory === 'operario' || userCategory === 'capataz';

  const navItems = [
    { path: '/worker/dashboard', label: 'Inicio', icon: LayoutDashboard, restricted: false },
    { path: '/worker/asistencia', label: 'Asistencia', icon: CalendarCheck, restricted: false },
    { path: '/worker/bitacora', label: 'Bitácora', icon: ClipboardList, restricted: true },
    { path: '/worker/proyecto', label: 'Mi Obra', icon: Building2, restricted: true },
    { path: '/worker/profile', label: 'Perfil', icon: UserCircle, restricted: false },
  ];

  const visibleNavItems = navItems.filter(item => item.restricted ? hasFullAccess : true);

  useEffect(() => {
    if (!loading && currentUser) {
      if (!hasFullAccess) {
        const restrictedPaths = ['/worker/bitacora', '/worker/proyecto'];
        if (restrictedPaths.some(path => location.pathname.includes(path))) {
           navigate('/worker/asistencia');
        }
      }
    }
  }, [loading, currentUser, hasFullAccess, location.pathname, navigate]);

  // --- LOGOUT CON ANIMACIÓN ---
  const handleLogout = () => {
    setIsLoggingOut(true); // 1. Activar animación
    
    // 2. Esperar un momento para que se vea la despedida
    setTimeout(async () => {
        try {
            await logout();
            navigate('/login', { replace: true });
        } catch (error) {
            console.error("Error al salir:", error);
            navigate('/login');
        }
    }, 2000); // 2 segundos de demora estética
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-[#003366]">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* SIDEBAR PC */}
      <aside className="hidden md:flex flex-col w-64 bg-[#003366] text-white min-h-screen fixed left-0 top-0 z-50 shadow-2xl">
        <div className="p-6 flex items-center gap-3 border-b border-blue-900 bg-[#002855]">
          <div className="shrink-0">
             {displayPhoto ? (
               <img src={displayPhoto} alt="Perfil" className="w-12 h-12 rounded-full object-cover border-2 border-[#f0c419]" />
             ) : (
               <div className="bg-white/10 p-2 rounded-full border-2 border-[#f0c419]">
                 <HardHat size={24} className="text-[#f0c419]" />
               </div>
             )}
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm leading-tight truncate" title={displayName}>
              {displayName.split(' ')[0]} {displayName.split(' ')[2] || ''}
            </h1>
            <p className="text-[10px] text-slate-300 uppercase tracking-wider truncate">{displayRole}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon; 
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                    isActive
                      ? 'bg-[#f0c419] text-[#003366] font-bold shadow-lg transform scale-105'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-900 bg-[#002855]">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-200 hover:bg-red-600 hover:text-white transition-all text-sm font-bold cursor-pointer group">
            <LogOut size={20} className="group-hover:rotate-180 transition-transform duration-300" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* HEADER MÓVIL */}
      <header className="md:hidden bg-[#003366] text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center safe-area-top">
        <div className="flex items-center gap-2">
           <HardHat size={24} className="text-[#f0c419]" />
           <span className="font-bold text-lg">LYK Obreros</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-300 active:text-white active:scale-95 transition-transform">
           <LogOut size={22} />
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 relative w-full overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {currentOutlet} 
          </motion.div>
        </AnimatePresence>
        
        <OnboardingFloatingBtn />
      </main>

      {/* MENÚ MÓVIL */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50 flex justify-around items-center px-2 py-2 pb-safe safe-area-bottom">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 relative ${
                isActive ? 'text-[#003366]' : 'text-slate-400'
              }`}
            >
              {isActive && (
                <motion.div layoutId="active-nav" className="absolute inset-0 bg-blue-50 rounded-xl -z-10" />
              )}
              <div className={`p-1.5 rounded-full mb-1 transition-transform ${isActive ? 'transform -translate-y-1' : ''}`}>
                 <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'scale-105' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* --- PANTALLA DE CIERRE DE SESIÓN ANIMADA --- */}
      <AnimatePresence>
        {isLoggingOut && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#003366]/95 backdrop-blur-sm z-[100] flex flex-col items-center justify-center text-white"
          >
             <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-center p-6"
             >
                {/* Spinner personalizado con colores de la marca */}
                <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-[#f0c419] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LogOut size={24} className="text-white/80" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold tracking-tight mb-2">Cerrando Sesión...</h2>
                <p className="text-blue-200 text-lg">¡Hasta pronto, {displayName.split(' ')[0]}!</p>
                <p className="text-white/40 text-sm mt-8">Guardando datos de forma segura</p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default WorkerLayout;