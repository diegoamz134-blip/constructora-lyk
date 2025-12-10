import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, MapPin, LogOut } from 'lucide-react';
// [NUEVO] Importamos el hook
import { useWorkerAuth } from '../../context/WorkerAuthContext';

const WorkerLayout = () => {
  const navigate = useNavigate();
  // [NUEVO] Obtenemos el usuario y funciones desde el contexto
  const { worker, logoutWorker, loading } = useWorkerAuth();

  useEffect(() => {
    // Si terminó de cargar y no hay usuario, mandar al login
    if (!loading && !worker) {
      navigate('/');
    }
  }, [worker, loading, navigate]);

  // Pantalla de carga mientras verificamos el localStorage
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400">Cargando sesión...</div>;
  
  // Si no hay obrero (y ya cargó), no mostramos nada para evitar parpadeos antes del redirect
  if (!worker) return null;

  const handleLogout = () => {
    logoutWorker();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* --- CONTENIDO PRINCIPAL SCROLLEABLE --- */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Pasamos los datos del obrero a las páginas hijas vía Context de Outlet */}
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