import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Search, HardHat, Clock, ChevronRight, MessageSquare, 
  User, CreditCard, BadgeCheck 
} from 'lucide-react';
import { Avatar } from "@heroui/react"; 

const WorkerDashboard = () => {
  const { worker } = useOutletContext();
  const navigate = useNavigate();

  const goTo = (path) => {
    navigate(path);
  };

  const canAccessLog = ['Capataz', 'Operario'].includes(worker.category);

  // Formateador para moneda peruana
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Según Tabla';
    return `S/. ${Number(amount).toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-8 pb-24"> 
      
      {/* HEADER */}
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
        <Avatar 
          name={worker.full_name} 
          className="w-12 h-12 text-lg font-bold bg-gradient-to-br from-[#003366] to-blue-700 text-white ring-4 ring-white shadow-md" 
        />
      </div>

      {/* TARJETA PRINCIPAL (Sin cambios) */}
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

      {/* GRID DE HERRAMIENTAS (Sin cambios) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1">Accesos Rápidos</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Card Asistencia */}
          <div 
            onClick={() => goTo('/worker/asistencia')}
            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 col-span-2 md:col-span-1"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors">
                <Clock size={22} />
              </div>
              <div className="p-1.5 bg-slate-50 rounded-full text-slate-300 group-hover:text-[#003366] group-hover:bg-blue-50 transition-colors">
                 <ChevronRight size={18} />
              </div>
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-1">Asistencia</h4>
            <p className="text-slate-500 text-xs font-medium">Registro de Entrada/Salida</p>
          </div>

          {/* Card Bitácora */}
          {canAccessLog && (
            <div 
              onClick={() => goTo('/worker/bitacora')}
              className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 rounded-[1.5rem] text-white cursor-pointer hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/10">
                  <MessageSquare size={22} />
                </div>
                <ChevronRight size={18} className="text-indigo-200" />
              </div>
              <h4 className="font-bold text-lg mb-1 relative z-10">Bitácora</h4>
              <p className="text-indigo-100 text-xs font-medium relative z-10 opacity-90">Reportar Incidencias</p>
            </div>
          )}

          {/* Card Mi Obra */}
          <div 
            onClick={() => goTo('/worker/proyecto')} 
            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden group hover:shadow-md hover:border-orange-200 hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-100 transition-colors">
                <HardHat size={22} />
              </div>
               <div className="p-1.5 bg-slate-50 rounded-full text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-colors">
                 <ChevronRight size={18} />
              </div>
            </div>
            <h4 className="font-bold text-slate-800 text-lg mb-1">Mi Obra</h4>
            <p className="text-slate-500 text-xs font-medium truncate">
              {worker.project_assigned || 'Sin asignar'}
            </p>
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
          </div>
        </div>
      </div>

      {/* --- NUEVA SECCIÓN: PERSONAL Y CONTRATO (Corregida) --- */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 flex items-center gap-2">
            <User size={18} className="text-[#003366]"/> Personal y Contrato
        </h3>
        
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
            {/* Fila 1: Cargo y Categoría */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                        <BadgeCheck size={20}/>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Cargo / Categoría</p>
                        <p className="font-bold text-slate-800">{worker.category || 'No definido'} / {worker.role || 'Operario'}</p>
                    </div>
                </div>
            </div>

            {/* Fila 2: Jornada Diaria (CORREGIDA A SOLES S/.) */}
            <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-green-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 text-green-600 rounded-xl">
                        <CreditCard size={20}/>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Jornada Diaria</p>
                        {/* AQUÍ ESTÁ EL CAMBIO SOLICITADO: S/. */}
                        <p className="font-extrabold text-green-700 text-lg">
                           {formatCurrency(worker.custom_daily_rate)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Fila 3: Sistema de Pensiones */}
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <User size={20}/>
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Fondo de Pensiones</p>
                        <p className="font-bold text-slate-800">{worker.pension_system || 'Sin registrar'}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default WorkerDashboard;