import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ChevronRight, MessageSquare, 
  User, CreditCard, BadgeCheck, Loader2, HardHat
} from 'lucide-react';
import { Avatar } from "@heroui/react"; 

// Importamos el contexto
import { useWorkerAuth } from '../../context/WorkerAuthContext';

const WorkerDashboard = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();

  // Protección de carga
  if (!worker) {
     return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#003366]"/></div>;
  }

  const goTo = (path) => navigate(path);
  const canAccessLog = ['Capataz', 'Operario'].includes(worker.category);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Según Tabla';
    return `S/. ${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-8 pb-24"> 
      
      {/* HEADER: AHORA EL AVATAR ES CLICABLE */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hola, {worker.full_name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 text-sm font-semibold mt-0.5 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            {worker.category || 'Trabajador'} activo
          </p>
        </div>
        
        {/* --- CAMBIO AQUÍ: Botón Perfil --- */}
        <button 
          onClick={() => goTo('/worker/profile')} 
          className="transition-transform active:scale-95 focus:outline-none"
          title="Ver Mi Perfil"
        >
          <Avatar 
            name={worker.full_name} 
            className="w-12 h-12 text-lg font-bold bg-gradient-to-br from-[#003366] to-blue-700 text-white ring-4 ring-white shadow-md cursor-pointer" 
          />
        </button>
        {/* ---------------------------------- */}
      </div>

      {/* TARJETA PRINCIPAL */}
      <div className="bg-gradient-to-br from-[#003366] via-[#004080] to-[#0059b3] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-blue-900/30 isolate">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl -z-10"></div>
        
        <div className="relative z-10 flex justify-between items-center">
          <div className="space-y-4 max-w-[65%]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-xs font-bold backdrop-blur-md border border-white/10">
              <Clock size={12} className="animate-pulse"/> Jornada de Hoy
            </div>
            <h2 className="text-xl font-bold leading-tight tracking-tight">
              ¿Listo para iniciar tus labores?
            </h2>
            <button 
              onClick={() => goTo('/worker/asistencia')}
              className="px-6 py-2.5 bg-white text-[#003366] rounded-xl text-sm font-bold shadow-md active:scale-95 transition-all hover:shadow-lg hover:bg-blue-50 flex items-center gap-2"
            >
              Marcar Asistencia <ChevronRight size={16} className="text-blue-300"/>
            </button>
          </div>
          <HardHat className="w-28 h-28 text-white/10 absolute -bottom-6 -right-6 rotate-12" strokeWidth={1.5} />
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Accesos Rápidos</h3>

        <div className="grid grid-cols-2 gap-4">
          <div onClick={() => goTo('/worker/asistencia')} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Clock size={22} /></div>
              <ChevronRight size={18} className="text-slate-300"/>
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-1">Asistencia</h4>
            <p className="text-slate-500 text-xs font-medium">Entrada/Salida</p>
          </div>

          {canAccessLog && (
            <div onClick={() => goTo('/worker/bitacora')} className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 rounded-[1.5rem] text-white cursor-pointer hover:shadow-lg transition-all relative overflow-hidden">
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><MessageSquare size={22} /></div>
                <ChevronRight size={18} className="text-indigo-200" />
              </div>
              <h4 className="font-bold text-lg mb-1 relative z-10">Bitácora</h4>
              <p className="text-indigo-100 text-xs font-medium relative z-10">Reportar</p>
            </div>
          )}

          <div onClick={() => goTo('/worker/proyecto')} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl"><HardHat size={22} /></div>
              <ChevronRight size={18} className="text-slate-300"/>
            </div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">Mi Obra</h4>
            <p className="text-slate-500 text-xs font-medium truncate">{worker.project_assigned || 'Sin asignar'}</p>
          </div>
        </div>
      </div>

      {/* INFO PERSONAL */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
            <User size={18} className="text-[#003366]"/> Personal y Contrato
        </h3>
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl"><BadgeCheck size={20}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Cargo</p>
                        <p className="font-bold text-slate-800">{worker.category}</p>
                    </div>
                </div>
            </div>
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-green-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-xl"><CreditCard size={20}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Jornal Diario</p>
                        <p className="font-extrabold text-green-700 text-lg">{formatCurrency(worker.custom_daily_rate)}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default WorkerDashboard;