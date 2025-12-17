import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, TrendingUp, Activity, Clock, 
  MapPin, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, User 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import StatusModal from '../../components/common/StatusModal';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });

  const [kpiData, setKpiData] = useState({ activeProjects: 0, activeStaff: 0 });

  // 1. Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. CARGA INTELIGENTE DE DATOS
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        console.log("--- INICIANDO CARGA DASHBOARD ---");
        
        let user = null;
        
        // A. Intentar recuperar de LocalStorage
        const sessionStr = localStorage.getItem('lyk_admin_session');
        if (sessionStr) {
           user = JSON.parse(sessionStr);
        }

        // B. Si no hay local, intentar recuperar de Supabase Auth y buscar en PROFILES
        if (!user) {
           const { data: { user: authUser } } = await supabase.auth.getUser();
           if (authUser?.email) {
               console.log("Recuperando perfil para:", authUser.email);
               
               // Buscar en PROFILES (Tu tabla principal para admins)
               const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('email', authUser.email)
                  .maybeSingle();

               if (profile) {
                   user = { 
                       id: profile.id, // Esto es un UUID (Texto)
                       full_name: profile.full_name, 
                       email: profile.email, 
                       role: profile.role,
                       source: 'profiles' 
                   };
                   // Guardar para mantener sesión
                   localStorage.setItem('lyk_admin_session', JSON.stringify(user));
               }
           }
        }
        
        console.log("Usuario final detectado:", user);
        setCurrentUser(user);

        // C. Buscar Asistencia de Hoy (Usando lógica dinámica de ID)
        if (user && user.id) {
            const today = new Date().toISOString().split('T')[0];
            let query = supabase.from('attendance').select('*').eq('date', today);

            // Si el ID es numérico, busca en employee_id. Si es UUID, busca en profile_id
            const isNumericId = !isNaN(user.id) && !isNaN(parseFloat(user.id));
            
            if (isNumericId) {
                query = query.eq('employee_id', user.id);
            } else {
                query = query.eq('profile_id', user.id);
            }

            const { data: attendance, error } = await query.maybeSingle();
            
            if (error) console.error("Error buscando asistencia:", error);
            if (attendance) setTodayRecord(attendance);
        }

        // D. Cargar KPIs
        const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'En Ejecución');
        const { count: staffCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        
        setKpiData({
          activeProjects: projectsCount || 0,
          activeStaff: staffCount || 0
        });

      } catch (error) {
        console.error("Error crítico en dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // --- HELPER: OBTENER GEOLOCALIZACIÓN ---
  const getCurrentLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("Navegador no soporta geolocalización");
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Devolvemos formato: "Lat,Lng"
                resolve(`${latitude},${longitude}`);
            },
            (error) => {
                console.warn("Error obteniendo GPS:", error);
                // Si el usuario deniega permiso, devolvemos null (o un texto por defecto)
                resolve(null); 
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
  };

  // --- MANEJADORES DE ASISTENCIA ---

  const handleCheckIn = async () => {
    setBtnLoading(true);
    
    // 1. Verificación de Usuario
    if (!currentUser || !currentUser.id) {
        setBtnLoading(false);
        setNotification({
            isOpen: true, 
            type: 'error', 
            title: 'Usuario No Identificado', 
            message: 'No se encontraron tus datos de perfil. Por favor cierra sesión y vuelve a ingresar.'
        });
        return;
    }
    
    try {
      console.log("Procesando entrada para:", currentUser.full_name);
      
      // 2. Obtener Ubicación (Espera a que el usuario acepte o deniegue)
      const location = await getCurrentLocation();
      const locationString = location || 'Panel Web (Sin GPS)';

      const now = new Date();
      
      // 3. Determinar qué tipo de ID tenemos (Numérico vs UUID)
      const isNumericId = !isNaN(currentUser.id) && !isNaN(parseFloat(currentUser.id));
      
      // 4. Construir Payload Dinámico
      const payload = {
        date: now.toISOString().split('T')[0],
        check_in_time: now.toISOString(),
        project_name: 'Oficina Central', 
        check_in_location: locationString, // <--- UBICACIÓN REAL
        worker_id: null, 
      };

      if (isNumericId) {
          payload.employee_id = parseInt(currentUser.id, 10);
          payload.profile_id = null;
      } else {
          payload.employee_id = null;
          payload.profile_id = currentUser.id; // UUID directo
      }

      console.log("Enviando Payload con GPS:", payload);

      const { data, error } = await supabase
        .from('attendance')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      
      setTodayRecord(data);
      setNotification({
        isOpen: true,
        type: 'success',
        title: '¡Entrada Registrada!',
        message: `Hola ${currentUser.full_name}, asistencia registrada a las ${now.toLocaleTimeString()}. Ubicación detectada.`
      });

    } catch (error) {
      console.error("Error CheckIn:", error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error de Registro',
        message: error.message || 'No se pudo registrar la entrada. Verifica la consola.'
      });
    } finally {
      setBtnLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    if (!window.confirm("¿Confirmar salida?")) return;
    
    setBtnLoading(true);
    try {
      // 1. Obtener Ubicación Salida
      const location = await getCurrentLocation();
      const locationString = location || 'Panel Web (Sin GPS)';

      const now = new Date();
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: now.toISOString(),
          check_out_location: locationString // <--- UBICACIÓN REAL SALIDA
        })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      setNotification({
        isOpen: true,
        type: 'success',
        title: '¡Salida Registrada!',
        message: 'Jornada finalizada exitosamente.'
      });

    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error de Salida',
        message: error.message
      });
    } finally {
      setBtnLoading(false);
    }
  };

  const getWorkedHours = () => {
    if (!todayRecord?.check_in_time || !todayRecord?.check_out_time) return null;
    const start = new Date(todayRecord.check_in_time);
    const end = new Date(todayRecord.check_out_time);
    const diff = (end - start) / (1000 * 60 * 60); 
    return diff.toFixed(2);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-10"
    >
      
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* BANNER */}
        <div className="flex-1 bg-[#0F172A] p-8 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">
              Hola, {currentUser?.full_name?.split(' ')[0] || 'Usuario'} 👋
            </h2>
            <p className="text-blue-200 text-sm md:text-base max-w-lg">
              Bienvenido al panel de control.
            </p>
            
            {/* DEBUG VISUAL: Si no hay usuario, mostrar alerta */}
            {!currentUser && !loading && (
               <div className="mt-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 px-3 py-1 rounded text-xs inline-flex items-center gap-2">
                  <AlertCircle size={12}/> Cargando perfil o sesión no encontrada...
               </div>
            )}

            <div className="mt-6 flex items-center gap-2 text-xs font-mono bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10">
                <Clock size={14} className="text-blue-400"/>
                {currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <Building2 className="absolute right-0 bottom-0 text-white/5 w-48 h-48 translate-y-12 translate-x-12" />
        </div>

        {/* WIDGET DE ASISTENCIA */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="text-[#003366]" size={20}/> Mi Asistencia
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {todayRecord ? 'Registro de hoy detectado' : 'No has marcado entrada hoy'}
                </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 relative z-10">
                {!todayRecord ? (
                    <button 
                        onClick={handleCheckIn}
                        disabled={btnLoading} 
                        className={`w-full py-3 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                            currentUser ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 'bg-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {btnLoading ? <Loader2 className="animate-spin" size={20}/> : <><LogIn size={20}/> Marcar Entrada</>}
                    </button>
                ) : !todayRecord.check_out_time ? (
                    <div className="space-y-3">
                        <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full text-green-700">
                                <Clock size={16}/>
                            </div>
                            <div>
                                <p className="text-xs text-green-600 font-bold uppercase">Entrada Registrada</p>
                                <p className="text-sm font-bold text-slate-700">
                                    {new Date(todayRecord.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCheckOut}
                            disabled={btnLoading}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {btnLoading ? <Loader2 className="animate-spin" size={20}/> : <><LogOut size={20}/> Marcar Salida</>}
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2"/>
                        <p className="font-bold text-slate-700">Jornada Finalizada</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Total: <span className="font-bold text-[#003366]">{getWorkedHours()} hrs</span>
                        </p>
                    </div>
                )}
            </div>

            <div className={`absolute inset-0 opacity-10 pointer-events-none ${todayRecord ? 'bg-green-50' : 'bg-red-50'}`}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Building2 /></div><h3 className="text-3xl font-bold text-slate-800">{kpiData.activeProjects}</h3><p className="text-slate-500 text-sm font-medium">Obras en Ejecución</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4"><TrendingUp /></div><h3 className="text-3xl font-bold text-slate-800">94%</h3><p className="text-slate-500 text-sm font-medium">Cumplimiento General</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Activity /></div><h3 className="text-3xl font-bold text-slate-800">{kpiData.activeStaff}</h3><p className="text-slate-500 text-sm font-medium">Personal Activo Total</p></div>
      </div>
      
      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

    </motion.div>
  );
};

export default DashboardPage;