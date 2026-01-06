import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Building2, Users, FileText, Settings, 
  LogOut, Briefcase, Bell, ChevronDown, FolderOpen,
  FileSpreadsheet, Menu, X, 
  DollarSign, 
  ClipboardCheck 
} from 'lucide-react';
import { Avatar } from "@heroui/react";
import logoFull from '../../assets/images/logo-lk-full.png';
import { supabase } from '../../services/supabase';

const ADMIN_SESSION_KEY = 'lyk_admin_session';

// DEFINICIÓN DE MENÚ CON PERMISOS (ROLES ACTUALIZADOS)
const navItems = [
  { 
    path: '/dashboard', 
    icon: LayoutDashboard, 
    label: 'Dashboard',
    allowed: ['admin', 'rrhh', 'resident_engineer', 'staff', 'logistica']
  },
  // SOLO ADMIN VE PROYECTOS AHORA
  { 
    path: '/proyectos', 
    icon: Building2, 
    label: 'Proyectos',
    allowed: ['admin'] 
  },
  // RESIDENTE Y ADMIN VEN SUPERVISIÓN
  { 
    path: '/campo/tareo', 
    icon: ClipboardCheck, 
    label: 'Supervisión Campo',
    allowed: ['admin', 'resident_engineer'] 
  },
  // SOLO ADMIN VE LICITACIONES AHORA
  { 
    path: '/licitaciones', 
    icon: FileSpreadsheet, 
    label: 'Licitaciones',
    allowed: ['admin']
  },
  { 
    label: 'Recursos Humanos', 
    icon: Users,
    allowed: ['admin', 'rrhh'],
    children: [
      { path: '/users', label: 'Personal y Contratos' },
      { path: '/planillas', label: 'Planillas y Pagos', icon: DollarSign },
      { path: '/documentacion', label: 'Legajos Digitales', icon: FolderOpen },
      { path: '/reportes', icon: FileText, label: 'Reportes y KPI' } 
    ]
  },
  { 
    path: '/finanzas', 
    icon: Briefcase, 
    label: 'Contabilidad',
    allowed: ['admin'] 
  },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: 'Cargando...', role: 'staff', avatar_url: '' });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [openMenus, setOpenMenus] = useState({
    'Recursos Humanos': location.pathname.includes('/users') || 
                        location.pathname.includes('/documentacion') || 
                        location.pathname.includes('/reportes') ||
                        location.pathname.includes('/planillas')
  });

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name, role, avatar_url').eq('id', user.id).single();
        if (data) setCurrentUser({ name: data.full_name || user.email, role: data.role || 'staff', avatar_url: data.avatar_url });
      } else {
          const stored = localStorage.getItem(ADMIN_SESSION_KEY);
          if (stored) {
              const u = JSON.parse(stored);
              setCurrentUser({ name: u.user?.full_name || u.full_name, role: u.role || 'staff', avatar_url: '' });
          }
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchCurrentUser();
    window.addEventListener('profileUpdated', fetchCurrentUser);
    return () => window.removeEventListener('profileUpdated', fetchCurrentUser);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(async () => { 
        await supabase.auth.signOut(); 
        localStorage.removeItem(ADMIN_SESSION_KEY);
        localStorage.removeItem('lyk_worker_session'); 
        navigate('/'); 
    }, 1500);
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 flex justify-center items-center h-20 border-b border-white/5">
        <img src={logoFull} alt="L&K Logo" className="h-10 object-contain brightness-0 invert" />
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, index) => {
          if (item.allowed && !item.allowed.includes(currentUser.role)) {
             return null;
          }

          if (item.children) {
            const isOpen = openMenus[item.label];
            const isActiveParent = item.children.some(child => child.path === location.pathname);

            return (
              <div key={index} className="mb-1 overflow-hidden">
                <button 
                  onClick={() => toggleMenu(item.label)}
                  className={`w-full relative group flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                    isOpen ? 'bg-white/5' : 'hover:bg-white/5'
                  }`}
                >
                  {isActiveParent && !isOpen && (
                    <motion.div layoutId="active-pill" className="absolute inset-0 bg-white rounded-xl shadow-md" initial={false} />
                  )}
                  <div className={`relative z-10 flex items-center gap-3 transition-colors duration-200 ${
                    isActiveParent && !isOpen ? 'text-[#0F172A]' : 'text-slate-400 group-hover:text-white'
                  }`}>
                    <item.icon size={20} strokeWidth={isActiveParent ? 2.5 : 2} />
                    <span className={`text-sm font-medium tracking-wide ${isActiveParent ? 'font-bold' : ''}`}>{item.label}</span>
                  </div>
                  <div className={`relative z-10 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`}>
                    <ChevronDown size={16} />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      key="content" initial="collapsed" animate="open" exit="collapsed"
                      variants={{ open: { opacity: 1, height: "auto", marginTop: 4 }, collapsed: { opacity: 0, height: 0, marginTop: 0 } }}
                      transition={{ duration: 0.3 }}
                      className="pl-4 pr-2 space-y-1"
                    >
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <NavLink key={child.path} to={child.path} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all relative group/child ${isChildActive ? 'text-white font-bold bg-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-blue-500 rounded-r-md transition-all duration-300 ${isChildActive ? 'h-5' : 'h-0 group-hover/child:h-3'}`} />
                            {child.icon && <child.icon size={16} />}
                            <span className="truncate">{child.label}</span>
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path} className="block relative group mb-1">
              {isActive && (
                <motion.div layoutId="active-pill" className="absolute inset-0 bg-white rounded-xl shadow-md" initial={false} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
              )}
              <div className={`relative z-10 flex items-center gap-3 px-4 py-3 transition-colors duration-200 ${isActive ? 'text-[#0F172A]' : 'text-slate-400 group-hover:text-white'}`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5 bg-[#0b1120]">
         {['admin'].includes(currentUser.role) && (
             <NavLink to="/configuracion" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5 mb-2">
                <Settings size={20} /> <span className="text-sm font-medium">Configuración</span>
             </NavLink>
         )}
         <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors rounded-xl">
            <LogOut size={20} /> <span className="text-sm font-medium">Cerrar Sesión</span>
         </button>
      </div>
    </>
  );

  const getPageTitle = () => {
    if (location.pathname === '/documentacion') return 'Gestión Documental';
    if (location.pathname.includes('/licitaciones')) return 'Gestión de Licitaciones';
    if (location.pathname.includes('/planillas')) return 'Planillas y Boletas de Pago';
    if (location.pathname.includes('/campo/tareo')) return 'Supervisión de Campo';
    
    const foundItem = navItems.find(item => item.path === location.pathname);
    if(foundItem) return foundItem.label;

    const foundChild = navItems.find(i => i.children)?.children.find(c => c.path === location.pathname);
    if(foundChild) return foundChild.label;

    return 'Panel de Control';
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] md:p-3 font-sans overflow-hidden">
      <motion.aside 
        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}
        className="hidden md:flex w-72 bg-[#0F172A] rounded-2xl flex-col shadow-xl z-20 relative overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#0F172A] z-50 flex flex-col md:hidden shadow-2xl"
            >
               <SidebarContent />
               <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-2">
                 <X size={24} />
               </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 h-full flex flex-col overflow-hidden relative bg-[#F1F5F9] w-full">
        <header className="h-16 md:h-20 flex justify-between items-center px-4 md:px-6 bg-white md:bg-transparent shadow-sm md:shadow-none shrink-0 z-10">
           <div className="flex items-center gap-3">
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden">
               <Menu size={24} />
             </button>
             <h1 className="text-lg md:text-2xl font-bold text-slate-800 truncate max-w-[200px] md:max-w-none">
               {getPageTitle()}
             </h1>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
              <button className="relative p-2 bg-slate-50 md:bg-white rounded-xl text-slate-500 hover:text-[#0F172A] shadow-sm transition-all">
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                <Bell size={20} />
              </button>
              <div onClick={() => navigate('/profile')} className="flex items-center gap-2 md:gap-3 bg-slate-50 md:bg-white pl-2 pr-2 md:pr-4 py-1.5 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all group">
                <Avatar key={currentUser.avatar_url} src={currentUser.avatar_url} name={currentUser.name} className="w-8 h-8 md:w-9 md:h-9 ring-2 ring-transparent group-hover:ring-[#0F172A]/10 transition-all" />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-slate-800 leading-none group-hover:text-[#0F172A]">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium capitalize">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors hidden md:block" />
              </div>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 pt-4 md:pt-0 scrollbar-hide">
           <Outlet />
        </div>
      </main>

      {isLoggingOut && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-[#0F172A]/90 backdrop-blur-sm z-[60] flex items-center justify-center">
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