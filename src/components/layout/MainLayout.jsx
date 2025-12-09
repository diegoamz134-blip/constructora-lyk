import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';

// Tu logo
import logoFull from '../../assets/images/logo-lk-full.png';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate('/');
    }, 2000);
  };

  return (
    // FONDO GENERAL: Azul Oscuro de la marca (actúa como fondo del Sidebar)
    <div className="flex h-screen bg-lk-darkblue font-sans overflow-hidden relative">
      
      {/* --- PANTALLA DE SALIDA (Overlay) --- */}
      <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-lk-darkblue text-white transition-all duration-700 ${isLoggingOut ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lk-blue/40 via-lk-darkblue to-lk-darkblue"></div>
         <div className="relative z-10 flex flex-col items-center animate-pulse">
            <img src={logoFull} alt="L&K" className="h-24 object-contain mb-6 drop-shadow-2xl brightness-0 invert" />
            <h2 className="text-3xl font-bold">Cerrando sesión...</h2>
         </div>
      </div>

      {/* --- SIDEBAR (Izquierda) --- */}
      <aside className="w-72 flex flex-col py-6 z-10">
        
        {/* Logo L&K en blanco */}
        <div className="px-8 mb-10 flex items-center gap-3">
           <img src={logoFull} alt="L&K" className="h-10 object-contain brightness-0 invert" />
           <div className="text-white">
             <h1 className="font-bold text-lg leading-tight">L&K</h1>
             <p className="text-[10px] opacity-70 tracking-widest uppercase">Constructora</p>
           </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 px-4 space-y-3">
          <NavItem to="/dashboard" icon={<HomeIcon />} label="Panel Principal" active={location.pathname === '/dashboard'} />
          <NavItem to="/projects" icon={<HardHatIcon />} label="Proyectos" active={location.pathname === '/projects'} />
          <NavItem to="/users" icon={<UsersIcon />} label="Personal" active={location.pathname === '/users'} />
          <NavItem to="/cashflow" icon={<CashIcon />} label="Finanzas" active={location.pathname === '/cashflow'} />
          <NavItem to="/tickets" icon={<ClipboardIcon />} label="Reportes" active={location.pathname === '/tickets'} />
        </nav>

        {/* Soporte / Logout Abajo */}
        <div className="px-4 mt-auto">
          <div className="bg-lk-blue/20 rounded-2xl p-4 mb-4 text-center">
             <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 text-lk-accent">
               <SupportIcon />
             </div>
             <p className="text-white text-xs font-medium mb-2">¿Necesitas ayuda?</p>
             <button className="text-xs text-lk-accent hover:text-white transition">Contactar Soporte</button>
          </div>
          
          <button onClick={handleLogout} className="flex items-center w-full px-6 py-3 text-sm font-medium text-red-200 hover:bg-white/5 rounded-xl transition-colors">
            <LogoutIcon />
            <span className="ml-3">Salir del Sistema</span>
          </button>
        </div>
      </aside>

      {/* --- CONTENIDO PRINCIPAL (Derecha) --- */}
      {/* CLAVE DEL DISEÑO: 'rounded-l-[40px]' 
          Esto crea la curva grande en la esquina superior e inferior izquierda,
          dando el efecto de "tarjeta flotante" sobre el fondo azul.
      */}
      <main className="flex-1 bg-[#F3F4F6] h-screen relative rounded-l-[40px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header Superior (Dentro del área blanca) */}
        <header className="px-8 py-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-20">
           <div>
             <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
             <p className="text-sm text-gray-500">Bienvenido al panel de control</p>
           </div>
           
           <div className="flex items-center gap-4">
             {/* Botón de Notificación */}
             <button className="p-2 text-gray-400 hover:text-lk-blue transition relative">
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                <BellIcon />
             </button>
             {/* Perfil */}
             <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-gray-700">Admin L&K</p>
                  <p className="text-xs text-gray-400">Ingeniero Residente</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-lk-darkblue text-white flex items-center justify-center font-bold shadow-lg border-2 border-white">
                  A
                </div>
             </div>
           </div>
        </header>

        {/* Área scrolleable para las páginas */}
        <div className="flex-1 overflow-y-auto p-8">
           <Outlet />
        </div>
      </main>

    </div>
  );
};

// --- Componente de Item de Menú (Estilo Pill) ---
const NavItem = ({ icon, label, to, active }) => {
    const navigate = useNavigate();
    return (
      <div 
        onClick={() => navigate(to)}
        className={`flex items-center px-6 py-4 cursor-pointer transition-all duration-300 rounded-2xl group
        ${active 
            ? 'bg-white text-lk-darkblue shadow-lg translate-x-2' // Activo: Blanco, texto azul, desplazado
            : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
      >
        <span className={`text-xl ${active ? 'text-lk-accent' : 'text-gray-400 group-hover:text-white'}`}>
            {icon}
        </span>
        <span className="ml-4 font-medium tracking-wide">{label}</span>
      </div>
    )
};

// Iconos (Simples SVG)
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const HardHatIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const UsersIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CashIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ClipboardIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const LogoutIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const BellIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const SupportIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;

export default MainLayout;