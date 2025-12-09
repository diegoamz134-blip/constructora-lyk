import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Search, Bell, HardHat, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Avatar } from "@heroui/react"; 

const WorkerDashboard = () => {
  const { worker } = useOutletContext(); // Recibimos datos del Layout
  const navigate = useNavigate();

  // Función auxiliar para navegar manteniendo el estado
  const goTo = (path) => {
    navigate(path, { state: { preloadedWorker: worker } });
  };

  return (
    <div className="p-6 space-y-8">
      
      {/* --- HEADER: SALUDO --- */}
      <div className="flex justify-between items-start pt-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Hola, {worker.full_name.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {worker.category} - L&K Construcciones
          </p>
        </div>
        <div className="relative">
          <Avatar 
            name={worker.full_name} 
            className="w-12 h-12 text-large bg-[#003366] text-white" 
          />
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-50"></span>
        </div>
      </div>

      {/* --- BARRA DE BÚSQUEDA (Visual) --- */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar tareas o avisos..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20"
        />
      </div>

      {/* --- TARJETA PRINCIPAL (WELCOME / ACTIONS) --- */}
      <div className="bg-[#003366] rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-900/20">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div className="space-y-4 max-w-[60%]">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-bold backdrop-blur-md">
              Panel de Obrero
            </span>
            <h2 className="text-xl font-bold leading-tight">
              Registra tu jornada laboral hoy.
            </h2>
            <button 
              onClick={() => goTo('/worker/asistencia')}
              className="px-5 py-2 bg-white text-[#003366] rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-transform"
            >
              Marcar Ahora
            </button>
          </div>
          {/* Ilustración o Icono Grande */}
          <HardHat className="w-24 h-24 text-white/20 absolute -bottom-4 -right-4 rotate-12" />
        </div>
      </div>

      {/* --- GRID DE OPCIONES (ONGOING PROJECTS) --- */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Accesos Directos</h3>
          <button className="text-[#003366] text-xs font-bold hover:underline">Ver todo</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          
          {/* Card 1: Asistencia */}
          <div 
            onClick={() => goTo('/worker/asistencia')}
            className="bg-[#003366] p-5 rounded-[1.5rem] text-white cursor-pointer hover:shadow-lg transition-shadow relative overflow-hidden group"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                <Clock size={20} />
              </div>
              <ChevronRight size={18} className="text-white/50" />
            </div>
            <h4 className="font-bold text-lg mb-1">Asistencia</h4>
            <p className="text-blue-200 text-xs">Entrada / Salida</p>
            {/* Barra de progreso visual */}
            <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
              <div className="h-full bg-[#f0c419] w-3/4 rounded-full"></div>
            </div>
          </div>

          {/* Card 2: Mi Obra (Informativo) */}
          <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                <HardHat size={20} />
              </div>
            </div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">Mi Obra</h4>
            <p className="text-slate-400 text-xs truncate">{worker.project_assigned || 'Sin asignar'}</p>
             <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 w-1/2 rounded-full"></div>
            </div>
          </div>

           {/* Card 3: Historial (Placeholder) */}
           <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer col-span-2 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Calendar size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Historial Semanal</h4>
                  <p className="text-slate-400 text-xs">Revisa tus horas trabajadas</p>
                </div>
             </div>
             <ChevronRight size={20} className="text-slate-300" />
          </div>

        </div>
      </div>

    </div>
  );
};

export default WorkerDashboard;