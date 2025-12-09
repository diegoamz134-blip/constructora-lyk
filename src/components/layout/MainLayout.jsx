import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Briefcase,
  Bell,
  ChevronDown
} from 'lucide-react';
import { Avatar } from "@heroui/react";
import logoFull from '../../assets/images/logo-lk-full.png';
import { supabase } from '../../services/supabase'; // Importante importar supabase

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/proyectos', icon: Building2, label: 'Proyectos' },
  { path: '/users', icon: Users, label: 'Recursos Humanos' },
  { path: '/finanzas', icon: Briefcase, label: 'Contabilidad' },
  { path: '/reportes', icon: FileText, label: 'Reportes' },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Estado para guardar la info básica del usuario actual (nombre y foto)
  const [currentUser, setCurrentUser] = useState({
    name: 'Cargando...',
    role: 'Usuario',
    avatar_url: ''
  });

  // Función para cargar los datos del usuario actual
  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setCurrentUser({
            name: data.full_name || user.email,
            role: data.role || 'Colaborador',
            avatar_url: data.avatar_url
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user for layout:", error);
    }
  };

  useEffect(() => {
    // 1. Cargar datos al montar
    fetchCurrentUser();

    // 2. Escuchar evento personalizado para actualizar si se edita el perfil
    window.addEventListener('profileUpdated', fetchCurrentUser);

    // Limpieza
    return () => {
      window.removeEventListener('profileUpdated', fetchCurrentUser);
    };
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/');
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] p-3 gap-3 font-sans overflow-hidden">
      
      {/* --- SIDEBAR FLOTANTE --- */}
      <motion.aside 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-72 bg-[#0F172A] rounded-2xl flex flex-col shadow-xl z-20 relative overflow-hidden"
      >
        <div className="p-6 flex justify-center items-center h-20 border-b border-white/5">
          <img 
            src={logoFull} 
            alt="L&K Logo" 
            className="h-10 object-contain brightness-0 invert" 
          />
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink 
                key={item.path} 
                to={item.path} 
                className="block relative group"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-white rounded-xl shadow-md"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className={`relative z-10 flex items-center gap-3 px-4 py-3 transition-colors duration-200 ${isActive ? 'text-[#0F172A]' : 'text-slate-400 group-hover:text-white'}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-sm font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-[#0b1120]">
           <NavLink to="/configuracion" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5 mb-2">
              <Settings size={20} />
              <span className="text-sm font-medium">Configuración</span>
           </NavLink>
           <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-xl"
           >
              <LogOut size={20} />
              <span className="text-sm font-medium">Cerrar Sesión</span>
           </button>
        </div>
      </motion.aside>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 h-full flex flex-col overflow-hidden relative">
        
        {/* Header Superior */}
        <header className="h-20 flex justify-between items-center px-6 bg-transparent shrink-0">
           <div>
             <h1 className="text-2xl font-bold text-slate-800">
                {navItems.find(item => item.path === location.pathname)?.label || 'Panel de Control'}
             </h1>
           </div>
           
           <div className="flex items-center gap-4">
              <button className="relative p-2.5 bg-white rounded-xl text-slate-500 hover:text-[#0F172A] shadow-sm hover:shadow transition-all">
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                <Bell size={20} />
              </button>

              {/* Perfil Usuario (DINÁMICO) */}
              <div 
                onClick={() => navigate('/profile')} 
                className="flex items-center gap-3 bg-white pl-2 pr-4 py-1.5 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all group"
                title="Ver mi perfil"
              >
                <Avatar 
                  key={currentUser.avatar_url} // Forzar re-render si cambia la foto
                  src={currentUser.avatar_url} 
                  name={currentUser.name}
                  className="w-9 h-9 ring-2 ring-transparent group-hover:ring-[#0F172A]/10 transition-all"
                />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-[#0F172A]">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {currentUser.role}
                  </p>
                </div>
                <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-hide">
           <Outlet />
        </div>
      </main>

      {/* Overlay Logout */}
      {isLoggingOut && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-[#0F172A]/90 backdrop-blur-sm z-50 flex items-center justify-center"
        >
           <div className="text-center">
              <div className="w-12 h-12 border-4 border-t-white border-white/20 rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-white text-lg font-medium tracking-wide">Cerrando sesión...</h2>
           </div>
        </motion.div>
      )}
    </div>
  );
};

export default MainLayout;