import React, { useState } from 'react';
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

const WorkerLayout = () => {
  const { logout } = useUnifiedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Configuración del Menú
  const navItems = [
    { path: '/worker/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { path: '/worker/asistencia', label: 'Asistencia', icon: CalendarCheck },
    { path: '/worker/bitacora', label: 'Bitácora', icon: ClipboardList },
    { path: '/worker/proyecto', label: 'Mi Obra', icon: Building2 },
    { path: '/worker/profile', label: 'Perfil', icon: UserCircle },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* === 1. SIDEBAR (Solo visible en Computadora) === */}
      <aside className="hidden md:flex flex-col w-64 bg-[#003366] text-white min-h-screen fixed left-0 top-0 z-50">
        <div className="p-6 flex items-center gap-3 border-b border-blue-900">
          <div className="bg-white/10 p-2 rounded-lg">
            <HardHat size={24} className="text-[#f0c419]" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Constructora LYK</h1>
            <p className="text-xs text-slate-300">Portal de Obreros</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            // SOLUCIÓN DEL ERROR: Asignamos el ícono a una variable con Mayúscula
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
                {/* Renderizamos el ícono como componente XML, NO como variable */}
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
        <button onClick={handleLogout} className="p-2 text-slate-300">
           <LogOut size={20} />
        </button>
      </header>

      {/* === 3. CONTENIDO PRINCIPAL === */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 animate-fade-in">
        <Outlet />
      </main>

      {/* === 4. MENÚ INFERIOR (Solo visible en Celular) === */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-around items-center px-2 py-2 pb-safe">
        {navItems.map((item) => {
          // SOLUCIÓN DEL ERROR AQUÍ TAMBIÉN
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