import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ChevronRight, MessageSquare, 
  MapPin, CreditCard, Loader2, HardHat
} from 'lucide-react';
import { Avatar } from "@heroui/react"; 
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import logoFull from '../../assets/images/logo-lk-full.png'; // Asegúrate que la ruta sea correcta

const WorkerDashboard = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();

  if (!worker) {
     return <div className="p-10 flex justify-center h-full items-center"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;
  }

  const goTo = (path) => navigate(path);
  const canAccessLog = ['Capataz', 'Operario'].includes(worker.category);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Según Tabla';
    return `S/. ${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-8 min-h-full"> 
      
      {/* 1. HEADER: LOGO Y PERFIL */}
      <div className="flex justify-between items-center pt-4">
        <img src={logoFull} alt="L&K" className="h-10 w-auto object-contain opacity-90" />
        
        <button 
          onClick={() => goTo('/worker/profile')} 
          className="transition-transform active:scale-95 focus:outline-none"
        >
          <Avatar 
            name={worker.full_name} 
            className="w-10 h-10 text-sm font-bold bg-[#003366] text-white ring-2 ring-slate-100 shadow-sm" 
          />
        </button>
      </div>

      {/* 2. SALUDO */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Hola, <span className="text-[#003366]">{worker.first_name || 'Compañero'}</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          ¡Que tengas una excelente jornada!
        </p>
      </div>

      {/* 3. TARJETA DE ESTADO (INFO LABORAL) */}
      <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors"></div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PROYECTO ASIGNADO</p>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight max-w-[200px]">
                        {worker.project_assigned || 'Sin Asignar'}
                    </h3>
                </div>
                <div className="p-3 bg-[#f0c419] text-white rounded-2xl shadow-sm">
                    <HardHat size={24} />
                </div>
            </div>

            <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">CARGO</p>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {worker.category}
                    </span>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">JORNAL</p>
                    <p className="text-xl font-extrabold text-[#003366]">{formatCurrency(worker.custom_daily_rate)}</p>
                </div>
            </div>
        </div>
      </div>

      {/* 4. ACCESOS RÁPIDOS (GRID LIMPIO) */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 px-1 tracking-wider">Menú Principal</h3>

        <div className="grid grid-cols-2 gap-4">
          
          {/* BOTÓN ASISTENCIA (PRINCIPAL) */}
          <div 
            onClick={() => goTo('/worker/asistencia')} 
            className="col-span-2 bg-[#003366] p-5 rounded-[1.8rem] text-white shadow-lg shadow-blue-900/20 cursor-pointer active:scale-[0.98] transition-all relative overflow-hidden"
          >
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
               <Clock size={100} />
            </div>
            <div className="relative z-10 flex justify-between items-center">
               <div>
                  <h4 className="text-lg font-bold mb-1">Marcar Asistencia</h4>
                  <p className="text-blue-200 text-xs">Entrada y Salida con GPS</p>
               </div>
               <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                  <ChevronRight size={20}/>
               </div>
            </div>
          </div>

          {/* BOTÓN BITÁCORA (CONDICIONAL) */}
          {canAccessLog && (
            <div onClick={() => goTo('/worker/bitacora')} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32 hover:border-blue-200">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit"><MessageSquare size={22} /></div>
              <div>
                <h4 className="font-bold text-slate-800">Bitácora</h4>
                <p className="text-slate-400 text-[10px] font-medium">Reportar Incidente</p>
              </div>
            </div>
          )}

          {/* BOTÓN PROYECTO */}
          <div onClick={() => goTo('/worker/proyecto')} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer active:scale-95 transition-all flex flex-col justify-between h-32 hover:border-blue-200">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit"><MapPin size={22} /></div>
            <div>
              <h4 className="font-bold text-slate-800">Mi Obra</h4>
              <p className="text-slate-400 text-[10px] font-medium">Ver Ubicación</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default WorkerDashboard;