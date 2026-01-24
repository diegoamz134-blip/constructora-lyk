import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

// --- IMPORTAMOS EL BOTÓN FLOTANTE ---
import OnboardingFloatingBtn from '../common/OnboardingFloatingBtn';

const WorkerLayout = () => {
  // Extraemos currentUser y loading
  const { logout, currentUser, isLoading } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Datos del obrero
  const displayName = currentUser?.full_name || 'Obrero';
  const displayPhoto = currentUser?.photo_url || currentUser?.avatar_url || null;
  const displayRole = currentUser?.category || 'Construcción Civil';
  
  // Normalizamos la categoría (todo a minúsculas para comparar fácil)
  const userCategory = (currentUser?.category || '').toLowerCase().trim();

  // DEFINIMOS QUIÉN TIENE "CONTROL TOTAL"
  // Si es 'operario' O 'capataz', tiene permisos VIP.
  const hasFullAccess = userCategory === 'operario' || userCategory === 'capataz';

  // Configuración del Menú
  const navItems = [
    { 
      path: '/worker/dashboard', 
      label: 'Inicio', 
      icon: LayoutDashboard,
      restricted: false 
    },
    { 
      path: '/worker/asistencia', 
      label: 'Asistencia', 
      icon: CalendarCheck, 
      restricted: false 
    },
    { 
      path: '/worker/bitacora', 
      label: 'Bitácora', 
      icon: ClipboardList, 
      restricted: true 
    },
    { 
      path: '/worker/proyecto', 
      label: 'Mi Obra', 
      icon: Building2, 
      restricted: true 
    },
    { 
      path: '/worker/profile', 
      label: 'Perfil', 
      icon: UserCircle, 
      restricted: false 
    },
  ];

  // Filtramos los items según el rol
  const visibleNavItems = navItems.filter(item => {
    if (item.restricted) {
      // Si es restringido, solo lo mostramos si tiene Full Access
      return hasFullAccess;
    }
    return true;
  });

  // --- PROTECCIÓN DE RUTAS (SEGURIDAD) ---
  useEffect(() => {
    if (!isLoading && currentUser) {
      // Si el usuario NO tiene acceso total...
      if (!hasFullAccess) {
        // ... y está intentando entrar a una ruta PROHIBIDA
        const restrictedPaths = ['/worker/bitacora', '/worker/proyecto'];
        const currentPath = location.pathname;

        // Si intenta entrar a bitácora u obra a la fuerza:
        if (restrictedPaths.some(path => currentPath.includes(path))) {
           navigate('/worker/asistencia'); // Lo mandamos a asistencia
        }
      }
    }
  }, [isLoading, currentUser, hasFullAccess, location.pathname, navigate]);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* === 1. SIDEBAR (Solo visible en Computadora) === */}
      <aside className="hidden md:flex flex-col w-64 bg-[#003366] text-white min-h-screen fixed left-0 top-0 z-50">
        
        {/* HEADER DEL SIDEBAR CON FOTO */}
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
            <p className="text-[10px] text-slate-300 uppercase tracking-wide truncate">{displayRole}</p>
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
                      ? 'bg-[#f0c419] text-[#003366] font-bold shadow-lg'
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

        <div className="p-4 border-t border-blue-900">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-200 hover:bg-red-900/30 hover:text-red-100 transition-all text-sm font-bold"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* === 2. HEADER MOVIL (Solo visible en Celular) === */}
      <header className="md:hidden bg-[#003366] text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-2">
           <HardHat size={24} className="text-[#f0c419]" />
           <span className="font-bold text-lg">LYK Obreros</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-slate-300 active:text-white">
           <LogOut size={20} />
        </button>
      </header>

      {/* === 3. CONTENIDO PRINCIPAL === */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 animate-fade-in">
        <Outlet />
        
        {/* === AQUÍ ESTÁ EL BOTÓN FLOTANTE === */}
        {/* Solo aparecerá si el obrero dio click en "Omitir" */}
        <OnboardingFloatingBtn />
      </main>

      {/* === 4. MENÚ INFERIOR (Solo visible en Celular) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-around items-center px-2 py-2 pb-safe">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all w-16 ${
                isActive ? 'text-[#003366]' : 'text-slate-400'
              }`}
            >
              <div className={`p-1.5 rounded-full mb-1 transition-all ${
                 isActive ? 'bg-blue-50 transform -translate-y-1' : ''
              }`}>
                 <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'scale-110' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

    </div>
  );
};

export default WorkerLayout;