import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, TrendingUp, Activity, Clock, 
  MapPin, LogIn, LogOut, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Estado de Asistencia
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // KPIs (Simulados o cargados reales)
  const [kpiData, setKpiData] = useState({
    activeProjects: 0,
    activeStaff: 0
  });

  // 1. Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Cargar Usuario y Estado de Asistencia
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // A. Recuperar usuario del LocalStorage (Sesión Admin)
        const sessionStr = localStorage.getItem('lyk_admin_session');
        if (!sessionStr) return;
        const user = JSON.parse(sessionStr);
        setCurrentUser(user);

        // B. Buscar si ya marcó asistencia HOY
        const today = new Date().toISOString().split('T')[0];
        const { data: attendance, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('employee_id', user.id) // Buscamos por ID de empleado
          .eq('date', today)
          .maybeSingle();

        if (error) throw error;
        setTodayRecord(attendance);

        // C. Cargar KPIs simples (Opcional)
        const { count: projectsCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'En Ejecución');
        const { count: staffCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Activo');
        
        setKpiData({
          activeProjects: projectsCount || 0,
          activeStaff: staffCount || 0
        });

      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // --- MANEJADORES DE ASISTENCIA ---

  const handleCheckIn = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const now = new Date();
      const payload = {
        employee_id: currentUser.id, // ID del Staff
        date: now.toISOString().split('T')[0],
        check_in_time: now.toISOString(),
        project_name: 'Oficina Central', // Por defecto para administrativos
        check_in_location: 'Panel Web'
      };

      const { data, error } = await supabase.from('attendance').insert([payload]).select().single();
      if (error) throw error;
      
      setTodayRecord(data);
      alert("¡Entrada registrada con éxito! Que tengas un buen día.");

    } catch (error) {
      console.error(error);
      alert("Error al marcar entrada.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    if (!window.confirm("¿Estás seguro de que deseas marcar tu salida?")) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: now.toISOString(),
          check_out_location: 'Panel Web' 
        })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      alert("¡Salida registrada! Buen descanso.");

    } catch (error) {
      console.error(error);
      alert("Error al marcar salida.");
    } finally {
      setLoading(false);
    }
  };

  // Helper para mostrar horas trabajadas si ya salió
  const getWorkedHours = () => {
    if (!todayRecord?.check_in_time || !todayRecord?.check_out_time) return null;
    const start = new Date(todayRecord.check_in_time);
    const end = new Date(todayRecord.check_out_time);
    const diff = (end - start) / (1000 * 60 * 60); // Horas
    return diff.toFixed(2);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-10"
    >
      
      {/* 1. SECCIÓN DE BIENVENIDA Y RELOJ */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Banner Principal */}
        <div className="flex-1 bg-[#0F172A] p-8 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Hola, {currentUser?.full_name?.split(' ')[0] || 'Usuario'} 👋</h2>
            <p className="text-blue-200 text-sm md:text-base max-w-lg">
              Bienvenido al panel de control. Aquí tienes el resumen de operaciones y tu control de asistencia personal.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10">
                <Clock size={14} className="text-blue-400"/>
                {currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <Building2 className="absolute right-0 bottom-0 text-white/5 w-48 h-48 translate-y-12 translate-x-12" />
        </div>

        {/* --- WIDGET DE ASISTENCIA (STAFF) --- */}
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
                    // CASO 1: NO HA MARCADO ENTRADA
                    <button 
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <LogIn size={18}/> Marcar Entrada
                    </button>
                ) : !todayRecord.check_out_time ? (
                    // CASO 2: YA MARCÓ ENTRADA -> MOSTRAR SALIDA
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
                            disabled={loading}
                            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut size={18}/> Marcar Salida
                        </button>
                    </div>
                ) : (
                    // CASO 3: JORNADA TERMINADA
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2"/>
                        <p className="font-bold text-slate-700">Jornada Finalizada</p>
                        <p className="text-xs text-slate-500 mt-1">
                            Total: <span className="font-bold text-[#003366]">{getWorkedHours()} hrs</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Decoración de fondo */}
            <div className={`absolute inset-0 opacity-10 pointer-events-none ${todayRecord ? 'bg-green-50' : 'bg-red-50'}`}></div>
        </div>
      </div>

      {/* 2. KPIs Generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{kpiData.activeProjects}</h3>
          <p className="text-slate-500 text-sm font-medium">Obras en Ejecución</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">94%</h3>
          <p className="text-slate-500 text-sm font-medium">Cumplimiento General</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Activity />
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{kpiData.activeStaff}</h3>
          <p className="text-slate-500 text-sm font-medium">Personal Activo Total</p>
        </div>
      </div>
      
      {/* Sección Informativa (Ejemplo) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <MapPin size={18} className="text-[#003366]"/> Ubicación Actual
            </h3>
            <div className="h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
               Mapa de Obras (Próximamente)
            </div>
         </div>
         <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <AlertCircle size={18} className="text-orange-500"/> Avisos Recientes
            </h3>
            <ul className="space-y-3">
               <li className="text-sm text-slate-600 pb-3 border-b border-slate-50">
                  <span className="font-bold text-[#003366]">Reunión General:</span> Mañana a las 9:00 AM en Oficina Central.
               </li>
               <li className="text-sm text-slate-600">
                  <span className="font-bold text-[#003366]">Cierre de Planilla:</span> Viernes 20 de Octubre.
               </li>
            </ul>
         </div>
      </div>

    </motion.div>
  );
};

export default DashboardPage;