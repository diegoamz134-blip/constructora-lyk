import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, ChevronRight, MessageSquare, 
  MapPin, Loader2, HardHat, LogIn, LogOut, CheckCircle, FileText
} from 'lucide-react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase'; 
import logoFull from '../../assets/images/logo-lk-full.png';

// --- CONFIGURACIÓN DE ANIMACIONES ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const WorkerDashboard = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();
  const location = useLocation(); // <-- IMPORTANTE: Detecta cuando volvemos a la pantalla

  // ESTADOS PARA ASISTENCIA DINÁMICA
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  // Consultar asistencia CADA VEZ que el usuario entre o regrese a esta ruta
  useEffect(() => {
    if (worker) {
      checkAttendanceStatus();
    }
  }, [worker, location.key]); // El location.key fuerza la recarga al volver de marcar asistencia

  const checkAttendanceStatus = async () => {
    setLoadingAttendance(true); // Reinicia el loader al consultar
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', worker.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setAttendanceToday(data);
    } catch (err) {
      console.error("Error verificando asistencia en dashboard:", err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  if (!worker) {
     return <div className="p-10 flex justify-center h-full items-center"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;
  }

  const goTo = (path) => navigate(path);
  const canAccessLog = ['Capataz', 'Operario'].includes(worker.category);

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Según el Sistema';
    return `S/. ${Number(amount).toFixed(2)}`;
  };

  const getInitials = () => {
    const name = worker.first_name || worker.full_name || '';
    const lastName = worker.paternal_surname || '';
    if (name && lastName) return `${name[0]}${lastName[0]}`.toUpperCase();
    return (name.split(' ').map(n => n[0]).slice(0, 2).join('') || 'WK').toUpperCase();
  };

  // --- RENDERIZADO DEL BOTÓN DINÁMICO DE ASISTENCIA ---
  const renderAttendanceButton = () => {
    
    // CASO 0: ESTÁ CARGANDO (Skeleton Loader Ultra Rápido)
    if (loadingAttendance) {
        return (
           <motion.div variants={itemVariants} className="col-span-2 bg-slate-200/70 animate-pulse p-6 rounded-[1.8rem] flex justify-between items-center h-[110px]">
              <div>
                  <div className="h-7 w-40 bg-slate-300/80 rounded-lg mb-2"></div>
                  <div className="h-4 w-48 bg-slate-300/80 rounded-md"></div>
              </div>
              <div className="w-12 h-12 bg-slate-300/80 rounded-full"></div>
           </motion.div>
        );
    }

    // CASO 1: JORNADA COMPLETADA (Tiene entrada y salida)
    if (attendanceToday && attendanceToday.check_out_time) {
        let hrs = 0; let mins = 0;
        
        // Matemáticas seguras para las horas
        if (attendanceToday.check_in_time) {
            const dIn = new Date(attendanceToday.check_in_time);
            const dOut = new Date(attendanceToday.check_out_time);
            const diffMs = dOut - dIn;
            if (diffMs > 0) {
                hrs = Math.floor(diffMs / (1000 * 60 * 60));
                mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            }
        }

        let heText = '--';
        if (attendanceToday.justification_type === 'HORA_EXTRA') {
            heText = attendanceToday.overtime_status === 'Aprobado' ? 'Aprobadas' :
                     attendanceToday.overtime_status === 'Pendiente' ? 'En revisión' : 'Rechazadas';
        }

        return (
           <motion.div
              variants={itemVariants}
              className="col-span-2 bg-emerald-50 p-5 rounded-[1.8rem] border border-emerald-200 text-emerald-800 shadow-sm relative overflow-hidden opacity-95"
           >
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-3 bg-white rounded-full shadow-sm text-emerald-600"><CheckCircle size={26}/></div>
                 <div>
                     <h4 className="font-bold text-lg leading-tight text-emerald-900">Jornada Completada</h4>
                     <p className="text-emerald-700 text-xs font-medium mt-0.5">Vuelve a marcar mañana.</p>
                 </div>
              </div>
              
              <div className="flex justify-between bg-white/70 p-3 rounded-xl shadow-inner text-xs font-bold">
                 <div className="text-center w-1/2 border-r border-emerald-200/60">
                     <p className="text-emerald-500 text-[10px] uppercase tracking-wide mb-1">Horas Trabajadas</p>
                     <p className="text-lg text-emerald-800">{hrs}h {mins}m</p>
                 </div>
                 <div className="text-center w-1/2">
                     <p className="text-emerald-500 text-[10px] uppercase tracking-wide mb-1">Horas Extras</p>
                     <p className={`text-sm mt-1 ${heText === 'En revisión' ? 'text-amber-500' : heText === 'Rechazadas' ? 'text-red-500' : 'text-emerald-800'}`}>
                        {heText}
                     </p>
                 </div>
              </div>
           </motion.div>
        );
    }

    // CASO 2: MARCAR SALIDA (Tiene entrada pero no salida)
    if (attendanceToday && !attendanceToday.check_out_time) {
        return (
           <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => goTo('/worker/asistencia')}
              className="col-span-2 bg-orange-500 p-6 rounded-[1.8rem] text-white shadow-lg shadow-orange-500/30 cursor-pointer relative overflow-hidden group"
           >
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500"><LogOut size={110} /></div>
              <div className="relative z-10 flex justify-between items-center h-full">
                 <div>
                    <h4 className="text-2xl font-black mb-1 tracking-tight">Marcar Salida</h4>
                    <p className="text-orange-100 text-xs font-medium">Tu turno está en curso</p>
                 </div>
                 <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-sm"><ChevronRight size={24} strokeWidth={3}/></div>
              </div>
           </motion.div>
        );
    }

    // CASO 3: MARCAR ENTRADA (No hay registro hoy)
    return (
       <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => goTo('/worker/asistencia')}
          className="col-span-2 bg-[#003366] p-6 rounded-[1.8rem] text-white shadow-lg shadow-blue-900/30 cursor-pointer relative overflow-hidden group"
       >
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500"><LogIn size={110} /></div>
          <div className="relative z-10 flex justify-between items-center h-full">
             <div>
                <h4 className="text-2xl font-black mb-1 tracking-tight">Marcar Entrada</h4>
                <p className="text-blue-200 text-xs font-medium">Inicia tu jornada con GPS</p>
             </div>
             <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-sm"><ChevronRight size={24} strokeWidth={3}/></div>
          </div>
       </motion.div>
    );
  };

  return (
    <motion.div 
      className="p-6 space-y-8 min-h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    > 
      
      {/* HEADER */}
      <motion.div variants={itemVariants} className="flex justify-between items-center pt-4">
        <img src={logoFull} alt="L&K" className="h-10 w-auto object-contain opacity-90" />
        
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => goTo('/worker/profile')} 
          className="focus:outline-none relative"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-100 shadow-md bg-[#003366] flex items-center justify-center text-white font-bold text-sm relative z-10">
             {worker.avatar_url ? (
                <>
                  <span className="absolute inset-0 flex items-center justify-center bg-[#003366] z-0">{getInitials()}</span>
                  <img src={worker.avatar_url} alt="Perfil" className="w-full h-full object-cover relative z-10" onError={(e) => { e.target.style.display = 'none'; }} />
                </>
             ) : (
                <span>{getInitials()}</span>
             )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
        </motion.button>
      </motion.div>

      {/* SALUDO */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Hola, <span className="text-[#003366]">{worker.first_name || 'Compañero'}</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">¡Que tengas una excelente jornada!</p>
      </motion.div>

      {/* TARJETA DE ESTADO */}
      <motion.div 
        variants={itemVariants}
        whileHover={{ scale: 1.02 }}
        className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-100 transition-colors duration-500"></div>
        
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PROYECTO ASIGNADO</p>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight max-w-[200px]">
                        {worker.project_assigned || 'Sin Asignar'}
                    </h3>
                </div>
                <div className="p-3 bg-[#f0c419] text-white rounded-2xl shadow-sm"><HardHat size={24} /></div>
            </div>

            <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">CARGO</p>
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">{worker.category}</span>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">JORNAL</p>
                    <p className="text-xl font-extrabold text-[#003366]">{formatCurrency(worker.custom_daily_rate)}</p>
                </div>
            </div>
        </div>
      </motion.div>

      {/* ACCESOS RÁPIDOS */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 px-1 tracking-wider">Menú Principal</h3>

        <div className="grid grid-cols-2 gap-4">
          
          {/* BOTÓN MÁGICO DE ASISTENCIA (Ocupa las 2 columnas) */}
          {renderAttendanceButton()}

          {/* NUEVO BOTÓN DE ACCESO RÁPIDO PARA PERMISOS (Ocupa las 2 columnas) */}
          <motion.div 
             variants={itemVariants}
             whileHover={{ scale: 1.02 }}
             whileTap={{ scale: 0.97 }}
             onClick={() => goTo('/worker/asistencia')} 
             className="col-span-2 bg-purple-50 p-5 rounded-[1.5rem] border border-purple-100 shadow-sm cursor-pointer flex justify-between items-center group hover:bg-purple-100 transition-colors"
          >
             <div className="flex items-center gap-4">
               <div className="p-3 bg-white text-purple-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                   <FileText size={24} />
               </div>
               <div>
                 <h4 className="font-bold text-slate-800 text-lg leading-tight">Permisos y Faltas</h4>
                 <p className="text-slate-500 text-xs font-medium mt-0.5">Justificar o pedir días libres</p>
               </div>
             </div>
             <ChevronRight size={22} className="text-purple-300 group-hover:text-purple-600 transition-colors"/>
          </motion.div>

          {/* BOTÓN BITÁCORA */}
          {canAccessLog && (
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goTo('/worker/bitacora')} 
              className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer flex flex-col justify-between h-32 hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit"><MessageSquare size={22} /></div>
              <div>
                <h4 className="font-bold text-slate-800">Bitácora</h4>
                <p className="text-slate-400 text-[10px] font-medium">Reportar Incidente</p>
              </div>
            </motion.div>
          )}

          {/* BOTÓN MI OBRA */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goTo('/worker/proyecto')} 
            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer flex flex-col justify-between h-32 hover:border-orange-200 hover:shadow-md transition-all"
          >
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl w-fit"><MapPin size={22} /></div>
            <div>
              <h4 className="font-bold text-slate-800">Mi Obra</h4>
              <p className="text-slate-400 text-[10px] font-medium">Ver Ubicación</p>
            </div>
          </motion.div>

        </div>
      </motion.div>

    </motion.div>
  );
};

export default WorkerDashboard;