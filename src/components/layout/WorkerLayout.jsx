import React, { useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, MapPin, User, LogOut } from 'lucide-react';

const WorkerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Recuperamos los datos del obrero pasados desde el Login
  const workerData = location.state?.preloadedWorker;

  useEffect(() => {
    // Seguridad básica: Si no hay datos del obrero (por recargar página), volver al login
    if (!workerData) {
      navigate('/');
    }
  }, [workerData, navigate]);

  if (!workerData) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* --- CONTENIDO PRINCIPAL SCROLLEABLE --- */}
      <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
        {/* Pasamos los datos del obrero a las páginas hijas (Dashboard, Asistencia) */}
        <Outlet context={{ worker: workerData }} />
      </main>

      {/* --- BARRA DE NAVEGACIÓN INFERIOR (Bottom Tab Bar) --- */}
      <div className="absolute bottom-0 w-full bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        <NavLink 
          to="/worker/dashboard" 
          state={{ preloadedWorker: workerData }} // Mantenemos el estado al navegar
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-[#003366]' : 'text-slate-400'}`}
        >
          <Home size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Inicio</span>
        </NavLink>

        {/* Botón Central Destacado para Asistencia */}
        <div className="relative -top-8">
          <NavLink 
            to="/worker/asistencia" 
            state={{ preloadedWorker: workerData }}
            className="w-16 h-16 bg-[#003366] rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-900/30 border-4 border-slate-50 transform transition-transform active:scale-95"
          >
            <MapPin size={28} />
          </NavLink>
        </div>

        <NavLink 
          to="/" // Botón de salir temporal
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={24} strokeWidth={2.5} />
          <span className="text-[10px] font-bold">Salir</span>
        </NavLink>
      </div>
    </div>
  );
};

export default WorkerLayout;