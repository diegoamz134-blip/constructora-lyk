import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, ChevronRight, MessageSquare, 
  MapPin, Loader2, HardHat
} from 'lucide-react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import logoFull from '../../assets/images/logo-lk-full.png';

// --- CONFIGURACIÓN DE ANIMACIONES ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

const WorkerDashboard = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();

  if (!worker) {
     return <div className="p-10 flex justify-center h-full items-center"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;
  }

  const goTo = (path) => navigate(path);
  const canAccessLog = ['Capataz', 'Operario'].includes(worker.category);

  const formatCurrency = (amount) => {
    // CAMBIO AQUÍ: Texto actualizado
    if (!amount || amount === 0) return 'Según el Sistema';
    return `S/. ${Number(amount).toFixed(2)}`;
  };

  // Función segura para obtener iniciales
  const getInitials = () => {
    const name = worker.first_name || worker.full_name || '';
    const lastName = worker.paternal_surname || '';
    
    if (name && lastName) {
        return `${name[0]}${lastName[0]}`.toUpperCase();
    }
    return (name.split(' ').map(n => n[0]).slice(0, 2).join('') || 'WK').toUpperCase();
  };

  return (
    <motion.div 
      className="p-6 space-y-8 min-h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    > 
      
      {/* 1. HEADER: LOGO Y FOTO DE PERFIL */}
      <motion.div variants={itemVariants} className="flex justify-between items-center pt-4">
        {/* Logo de la empresa */}
        <img src={logoFull} alt="L&K" className="h-10 w-auto object-contain opacity-90" />
        
        {/* BOTÓN DE PERFIL */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => goTo('/worker/profile')} 
          className="focus:outline-none relative"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-slate-100 shadow-md bg-[#003366] flex items-center justify-center text-white font-bold text-sm relative z-10">
             {worker.avatar_url ? (
                <>
                  <span className="absolute inset-0 flex items-center justify-center bg-[#003366] z-0">
                    {getInitials()}
                  </span>
                  <img 
                    src={worker.avatar_url} 
                    alt="Perfil" 
                    className="w-full h-full object-cover relative z-10"
                    onError={(e) => { e.target.style.display = 'none'; }} 
                  />
                </>
             ) : (
                <span>{getInitials()}</span>
             )}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-20"></div>
        </motion.button>
      </motion.div>

      {/* 2. SALUDO */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Hola, <span className="text-[#003366]">{worker.first_name || 'Compañero'}</span>
        </h1>
        <p className="text-slate-500 text-sm font-medium mt-1">
          ¡Que tengas una excelente jornada!
        </p>
      </motion.div>

      {/* 3. TARJETA DE ESTADO (INFO LABORAL) */}
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
      </motion.div>

      {/* 4. ACCESOS RÁPIDOS */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 px-1 tracking-wider">Menú Principal</h3>

        <div className="grid grid-cols-2 gap-4">
          
          <motion.div 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => goTo('/worker/asistencia')} 
            className="col-span-2 bg-[#003366] p-5 rounded-[1.8rem] text-white shadow-lg shadow-blue-900/20 cursor-pointer relative overflow-hidden group"
          >
            <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
               <Clock size={100} />
            </div>
            <div className="relative z-10 flex justify-between items-center">
               <div>
                  <h4 className="text-lg font-bold mb-1">Marcar Asistencia</h4>
                  <p className="text-blue-200 text-xs">Entrada y Salida con GPS</p>
               </div>
               <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                  <ChevronRight size={20}/>
               </div>
            </div>
          </motion.div>

          {canAccessLog && (
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goTo('/worker/bitacora')} 
              className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer flex flex-col justify-between h-32 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit"><MessageSquare size={22} /></div>
              <div>
                <h4 className="font-bold text-slate-800">Bitácora</h4>
                <p className="text-slate-400 text-[10px] font-medium">Reportar Incidente</p>
              </div>
            </motion.div>
          )}

          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => goTo('/worker/proyecto')} 
            className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm cursor-pointer flex flex-col justify-between h-32 hover:border-blue-200 hover:shadow-md transition-all"
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