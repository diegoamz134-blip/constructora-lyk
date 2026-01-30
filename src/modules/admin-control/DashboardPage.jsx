import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Activity, Clock, 
  MapPin, LogIn, LogOut, CheckCircle2, Loader2,
  AlertTriangle, ChevronLeft, ChevronRight, CheckCircle,
  Briefcase, RefreshCw, Save, X, Cloud, Sun, CloudRain, Wind, CloudLightning
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import StatusModal from '../../components/common/StatusModal';
import EmployeeDocumentsModal from '../hr/components/EmployeeDocumentsModal';

// COLORES PARA GRÁFICOS
const COLORS = ['#003366', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardPage = () => {
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [refreshWeather, setRefreshWeather] = useState(0); 
  
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ESTADO CLIMA
  const [weather, setWeather] = useState({ 
    temp: '--', condition: 'Buscando GPS...', code: null, wind: '--'
  });

  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [kpiData, setKpiData] = useState({ activeProjects: 0, activeStaff: 0 });

  // DATOS GRÁFICOS
  const [laborData, setLaborData] = useState([]);
  const [sCurveData, setSCurveData] = useState([]);

  // Modales
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedPersonForDocs, setSelectedPersonForDocs] = useState(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedWorkerForProject, setSelectedWorkerForProject] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // FILTRO RESIDENTE
  const [residentProjectName, setResidentProjectName] = useState(null);
  const [residentProjectId, setResidentProjectId] = useState(null);

  // 1. Reloj
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Clima
  useEffect(() => {
    const fetchWeather = async () => {
        setWeather(prev => ({ ...prev, condition: 'Detectando...' }));
        try {
            const coords = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) reject("No GPS");
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                    (err) => reject(err),
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                );
            });

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&timezone=auto`);
            const data = await res.json();
            
            if (data.current_weather) {
                const code = data.current_weather.weathercode;
                const temp = data.current_weather.temperature;
                let conditionText = 'Despejado';
                if (code >= 1 && code <= 3) conditionText = 'Nublado';
                if (code >= 45 && code <= 48) conditionText = 'Niebla';
                if (code >= 51 && code <= 67) conditionText = 'Lluvia Ligera';
                if (code >= 71) conditionText = 'Lluvia Fuerte';
                if (code >= 95) conditionText = 'Tormenta';

                setWeather({ temp: Math.round(temp), condition: conditionText, code: code, wind: data.current_weather.windspeed });
            }
        } catch (e) {
            setWeather({ temp: '--', condition: 'Sin GPS', code: null, wind: '--' });
        }
    };
    fetchWeather();
  }, [refreshWeather]);

  const getLocalDateStr = () => {
    const now = new Date();
    return now.toLocaleDateString('en-CA'); 
  };

  // 3. CARGA DE DATOS
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!currentUser) return;

        let currentProjectName = null;
        let currentProjectId = null;

        // A. OBTENER PROYECTO DEL RESIDENTE
        if (currentUser.role === 'residente_obra') {
            const { data: assignment } = await supabase
                .from('project_assignments')
                .select('projects(id, name)')
                .eq('employee_id', currentUser.id)
                .maybeSingle();
            
            if (assignment?.projects?.name) {
                currentProjectName = assignment.projects.name;
                currentProjectId = assignment.projects.id;
                setResidentProjectName(currentProjectName);
                setResidentProjectId(currentProjectId);
            }
        }

        const today = getLocalDateStr();
        
        // B. ASISTENCIA
        let query = supabase.from('attendance').select('*').eq('date', today);
        if (currentUser.role === 'worker') query = query.eq('worker_id', currentUser.id);
        else query = query.eq('employee_id', currentUser.id);
        const { data: attendanceData } = await query.maybeSingle();
        setTodayRecord(attendanceData);

        // C. CHARTS Y KPIS
        await fetchChartsAndKPIs(currentUser.role, currentProjectName, currentProjectId);

      } catch (error) {
        console.error("Error dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, refreshTrigger]);

  const fetchChartsAndKPIs = async (role, projectName, projectId) => {
      // 1. KPIs
      let projectsCount = 0;
      let staffCount = 0;

      if (role === 'residente_obra') {
          // Obras asignadas (generalmente 1)
          projectsCount = projectId ? 1 : 0;
          // Personal en esa obra
          if (projectName) {
              const { count } = await supabase.from('workers').select('*', { count: 'exact', head: true }).eq('status', 'Activo').eq('project_assigned', projectName);
              staffCount = count || 0;
          }
      } else {
          // Admin ve todo
          const { count: pCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'En Ejecución');
          const { count: sCount } = await supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'Activo');
          projectsCount = pCount || 0;
          staffCount = sCount || 0;
      }
      setKpiData({ activeProjects: projectsCount, activeStaff: staffCount });

      // 2. DONUT: FUERZA LABORAL
      let laborQuery = supabase.from('workers').select('category').eq('status', 'Activo');
      if (role === 'residente_obra' && projectName) {
          laborQuery = laborQuery.eq('project_assigned', projectName);
      }
      const { data: workers } = await laborQuery;
      
      const laborDist = workers.reduce((acc, curr) => {
          const cat = curr.category || 'Sin Categoría';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
      }, {});
      setLaborData(Object.keys(laborDist).map(key => ({ name: key, value: laborDist[key] })));

      // 3. CURVA S: AVANCE PROGRAMADO VS REAL
      if (projectId) {
          // Obtener tareas del proyecto
          const { data: tasks } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);
          
          if (tasks && tasks.length > 0) {
              // Encontrar fechas de inicio y fin del proyecto
              const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.end_date)]);
              const minDate = new Date(Math.min.apply(null, dates));
              const maxDate = new Date(Math.max.apply(null, dates));
              const today = new Date();

              // Total de peso (duración total en días como proxy de peso)
              const totalDuration = tasks.reduce((acc, t) => {
                  const duration = (new Date(t.end_date) - new Date(t.start_date)) / (1000 * 60 * 60 * 24);
                  return acc + (duration > 0 ? duration : 1);
              }, 0);

              const chartData = [];
              let currentDate = new Date(minDate);
              
              // Generar puntos de la gráfica (cada 3 días para suavizar)
              while (currentDate <= maxDate) {
                  const dateStr = currentDate.toISOString().split('T')[0];
                  
                  // A. PROGRAMADO: Suma de pesos de tareas que deberían estar listas
                  let plannedAccumulated = 0;
                  tasks.forEach(t => {
                      const tStart = new Date(t.start_date);
                      const tEnd = new Date(t.end_date);
                      const duration = (tEnd - tStart) / (1000 * 60 * 60 * 24) || 1;
                      
                      if (currentDate >= tEnd) {
                          plannedAccumulated += duration; // Tarea debió terminar
                      } else if (currentDate >= tStart) {
                          const daysPassed = (currentDate - tStart) / (1000 * 60 * 60 * 24);
                          plannedAccumulated += daysPassed; // Avance parcial lineal
                      }
                  });
                  const plannedPct = Math.min(100, (plannedAccumulated / totalDuration) * 100);

                  // B. REAL: Cálculo del avance real ponderado hasta la fecha
                  let actualAccumulated = 0;
                  if (currentDate <= today) {
                      tasks.forEach(t => {
                          const tStart = new Date(t.start_date);
                          const duration = (new Date(t.end_date) - tStart) / (1000 * 60 * 60 * 24) || 1;
                          const taskProgress = t.progress || 0; // % reportado en BD

                          if (currentDate >= tStart) {
                              // Asumimos que el progreso reportado se ganó linealmente hasta hoy
                              // Si la tarea empezó, contribuye con su % real proporcional al tiempo pasado
                              // Esta es una aproximación ya que no tenemos histórico diario
                              actualAccumulated += (duration * (taskProgress / 100)); 
                          }
                      });
                      // Ajuste simple: Si estamos en el pasado, mostramos el acumulado.
                      // Nota: Esta lógica asume que el 'progress' actual es el acumulado a hoy.
                      // Para días pasados, sería ideal tener historial, aquí se proyecta el estado final hacia atrás (limitación sin tabla histórica)
                      // PARA CORREGIR: Mostraremos la línea Real solo hasta HOY.
                  }
                  
                  const actualPct = currentDate <= today ? Math.min(100, (actualAccumulated / totalDuration) * 100) : null;

                  chartData.push({
                      date: `${currentDate.getDate()}/${currentDate.getMonth()+1}`,
                      Programado: parseFloat(plannedPct.toFixed(1)),
                      Real: actualPct !== null ? parseFloat(actualPct.toFixed(1)) : null
                  });

                  currentDate.setDate(currentDate.getDate() + 5); // Salto de 5 días
              }
              setSCurveData(chartData);
          } else {
              setSCurveData([]);
          }
      } else {
          setSCurveData([]);
      }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(`${position.coords.latitude},${position.coords.longitude}`),
            (error) => { console.warn("Error GPS:", error); resolve(null); },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
  };

  const handleCheckIn = async () => {
    setBtnLoading(true);
    if (!currentUser?.id) return;
    
    try {
      const location = await getCurrentLocation();
      const now = new Date();
      
      const payload = {
        date: getLocalDateStr(),
        check_in_time: now.toISOString(),
        project_name: 'Oficina Central', 
        check_in_location: location || 'Panel Web (Sin GPS)', 
        status: 'Presente'
      };

      if (currentUser.role === 'worker') {
          payload.worker_id = currentUser.id;
      } else {
          payload.employee_id = currentUser.id;
      }

      const { data, error } = await supabase.from('attendance').insert([payload]).select().single();
      if (error) throw error;
      
      setTodayRecord(data);
      setNotification({ isOpen: true, type: 'success', title: 'Entrada', message: `Registrada a las ${now.toLocaleTimeString()}` });
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally {
      setBtnLoading(false);
    }
  };

  const handleCheckOutClick = () => {
    if (todayRecord) setShowConfirmModal(true);
  };

  const processCheckOut = async () => {
    setShowConfirmModal(false);
    setBtnLoading(true);
    try {
      const location = await getCurrentLocation();
      const now = new Date();
      
      const { data, error } = await supabase
        .from('attendance')
        .update({ check_out_time: now.toISOString(), check_out_location: location || 'Panel Web' })
        .eq('id', todayRecord.id)
        .select().single();

      if (error) throw error;
      setTodayRecord(data);
      setNotification({ isOpen: true, type: 'success', title: 'Salida', message: 'Jornada finalizada.' });
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally {
      setBtnLoading(false);
    }
  };

  const getWorkedHours = () => {
    if (!todayRecord?.check_in_time || !todayRecord?.check_out_time) return null;
    const diff = (new Date(todayRecord.check_out_time) - new Date(todayRecord.check_in_time)) / 36e5; 
    return diff.toFixed(2);
  };

  const handleOpenUpdateDocs = (person) => {
    const personWithType = { ...person, type: person.role_type }; 
    setSelectedPersonForDocs(personWithType);
    setDocModalOpen(true);
  };

  const handleOpenAssignProject = (worker) => {
    setSelectedWorkerForProject(worker);
    setProjectModalOpen(true);
  };

  const handleSuccessAction = () => setRefreshTrigger(prev => prev + 1);

  const getWeatherIcon = (code) => {
      if (code === null) return <Loader2 className="animate-spin text-slate-400" size={32} />;
      if (code >= 95) return <CloudLightning className="text-purple-500" size={32} />;
      if (code >= 51) return <CloudRain className="text-blue-500" size={32} />;
      if (code >= 1 && code <= 3) return <Cloud className="text-gray-400" size={32} />;
      return <Sun className="text-yellow-500" size={32} />;
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-900" size={40}/></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-10">
      
      {/* 1. SECCIÓN SUPERIOR */}
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* BANNER */}
        <div className="flex-1 bg-[#0F172A] p-8 rounded-3xl text-white relative overflow-hidden shadow-xl flex flex-col justify-center">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">Hola, {currentUser?.full_name?.split(' ')[0]} 👋</h2>
            <p className="text-blue-200 text-sm md:text-base mb-6">
                {residentProjectName 
                    ? `Obra Asignada: ${residentProjectName}` 
                    : 'Panel de Control Principal'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <Clock size={16} className="text-blue-400"/>
                {currentTime.toLocaleDateString()} - {currentTime.toLocaleTimeString()}
            </div>
          </div>
          <Building2 className="absolute right-0 bottom-0 text-white/5 w-48 h-48 translate-y-12 translate-x-12" />
        </div>

        {/* WIDGET ASISTENCIA */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-[#003366]" size={20}/> Mi Asistencia</h3>
                <p className="text-xs text-slate-500 mt-1">{todayRecord ? 'Registro detectado' : 'Pendiente de registro'}</p>
            </div>
            <div className="mt-4 flex flex-col gap-3 relative z-10">
                {!todayRecord ? (
                    <button onClick={handleCheckIn} disabled={btnLoading} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                        {btnLoading ? <Loader2 className="animate-spin" size={20}/> : <><LogIn size={20}/> Marcar Entrada</>}
                    </button>
                ) : !todayRecord.check_out_time ? (
                    <div className="space-y-3">
                        <div className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full text-green-700"><Clock size={16}/></div>
                            <div>
                                <p className="text-xs text-green-600 font-bold uppercase">En Curso</p>
                                <p className="text-sm font-bold text-slate-700">{new Date(todayRecord.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <button onClick={handleCheckOutClick} disabled={btnLoading} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                            {btnLoading ? <Loader2 className="animate-spin" size={20}/> : <><LogOut size={20}/> Marcar Salida</>}
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2"/>
                        <p className="font-bold text-slate-700">Jornada Finalizada</p>
                        <p className="text-xs text-slate-500 mt-1">Total: <span className="font-bold text-[#003366]">{getWorkedHours()} hrs</span></p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* 2. SECCIÓN DE WIDGETS Y KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* WIDGET CLIMA */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10"><Cloud size={80} /></div>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-50">
                    {getWeatherIcon(weather.code)}
                </div>
                <button onClick={() => setRefreshWeather(prev => prev + 1)} className="p-2 bg-white rounded-full hover:bg-blue-50 text-blue-400">
                    <RefreshCw size={14} className={weather.condition === 'Detectando...' ? 'animate-spin' : ''} />
                </button>
            </div>
            <div className="relative z-10">
                <h3 className="text-4xl font-black text-slate-800 flex items-start gap-1">
                    {weather.temp}<span className="text-lg font-medium text-slate-400 mt-1">°C</span>
                </h3>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-wide mt-1">{weather.condition}</p>
                <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
                    <Wind size={14}/> <span>Viento: {weather.wind} km/h</span>
                </div>
            </div>
        </div>

        {/* KPIs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Building2 size={24}/></div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Proyectos</span>
            </div>
            <div>
                <h3 className="text-4xl font-bold text-slate-800">{kpiData.activeProjects}</h3>
                <p className="text-slate-500 text-sm font-medium">Obras bajo gestión</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><Activity size={24}/></div>
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">RR.HH</span>
            </div>
            <div>
                <h3 className="text-4xl font-bold text-slate-800">{kpiData.activeStaff}</h3>
                <p className="text-slate-500 text-sm font-medium">Personal en Obra</p>
            </div>
        </div>
      </div>

      {/* 3. GRÁFICOS: DONUT Y CURVA S (NUEVA LÓGICA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* DONUT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Distribución Fuerza Laboral</h3>
              <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={laborData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {laborData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* CURVA S: PROGRAMADO VS REAL */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h3 className="text-lg font-bold text-slate-800">Curva S: Avance de Obra</h3>
                      <p className="text-xs text-slate-500">{residentProjectName || 'Vista General (Seleccione Obra)'}</p>
                  </div>
                  <div className="flex gap-4 text-xs font-bold">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#003366]"></span> Programado</div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#00C49F]"></span> Real</div>
                  </div>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                  {sCurveData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="date" style={{ fontSize: '10px' }} />
                              <YAxis domain={[0, 100]} style={{ fontSize: '10px' }} unit="%" />
                              <RechartsTooltip />
                              <Line type="monotone" dataKey="Programado" stroke="#003366" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                              <Line type="monotone" dataKey="Real" stroke="#00C49F" strokeWidth={3} dot={true} />
                          </LineChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full text-slate-400 text-sm flex-col gap-2">
                          <Activity size={32} className="opacity-20"/>
                          <p>{residentProjectId ? "No hay tareas registradas para generar la curva." : "Gráfico disponible solo para Residentes de Obra."}</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      {/* 4. TABLAS OPERATIVAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <ExpiredDocumentsTable refreshTrigger={refreshTrigger} onUpdate={handleOpenUpdateDocs} projectFilter={residentProjectName} />
        <ValidWorkersTable refreshTrigger={refreshTrigger} onAssign={handleOpenAssignProject} projectFilter={residentProjectName} />
      </div>

      <EmployeeDocumentsModal isOpen={docModalOpen} onClose={() => { setDocModalOpen(false); handleSuccessAction(); }} person={selectedPersonForDocs} />
      <AssignProjectModal isOpen={projectModalOpen} onClose={() => setProjectModalOpen(false)} worker={selectedWorkerForProject} onSuccess={handleSuccessAction} />
      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} type={notification.type} title={notification.title} message={notification.message} />
    
      {/* MODAL SALIDA */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 p-8 text-center">
              <div className="mx-auto w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-6"><LogOut size={40} /></div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">¿Confirmar Salida?</h3>
              <p className="text-slate-500 text-sm mb-8">Estás a punto de registrar el fin de tu jornada.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button onClick={processCheckOut} className="flex-1 py-3.5 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 shadow-lg">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- TABLAS AUXILIARES COMPLETAS ---

const ExpiredDocumentsTable = ({ refreshTrigger, onUpdate, projectFilter }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => { fetchExpiredDocs(); }, [page, refreshTrigger, projectFilter]);

  const fetchExpiredDocs = async () => {
    setLoading(true);
    try {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: documents, error } = await supabase
        .from('hr_documents')
        .select('*')
        .lte('expiration_date', nextMonthStr)
        .order('expiration_date', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (documents.length > 0) {
        const workerDocs = documents.filter(d => d.person_type === 'worker');
        const employeeDocs = documents.filter(d => d.person_type === 'employee');

        const workerIds = [...new Set(workerDocs.map(d => d.person_id))];
        const employeeIds = [...new Set(employeeDocs.map(d => d.person_id))];

        const [workersRes, employeesRes] = await Promise.all([
            workerIds.length > 0 ? supabase.from('workers').select('id, full_name, category, project_assigned').in('id', workerIds) : { data: [] },
            employeeIds.length > 0 ? supabase.from('employees').select('id, full_name, position').in('id', employeeIds) : { data: [] }
        ]);

        const workerMap = {};
        workersRes.data?.forEach(w => workerMap[w.id] = w);
        const employeeMap = {};
        employeesRes.data?.forEach(e => employeeMap[e.id] = e);

        let mappedDocs = documents.map(doc => {
            let person = null;
            let roleDisplay = '';
            
            if (doc.person_type === 'worker') {
                person = workerMap[doc.person_id];
                roleDisplay = person?.category || 'Obrero';
                if (projectFilter && person && person.project_assigned !== projectFilter) {
                    return null; 
                }
            } else {
                person = employeeMap[doc.person_id];
                roleDisplay = person?.position || 'Staff';
            }

            if (!person) return null;

            return {
                ...doc,
                owner_name: person.full_name,
                role_display: roleDisplay,
                person_data: { ...person, role_type: doc.person_type }
            };
        }).filter(Boolean);

        setDocs(mappedDocs);
      } else { 
        setDocs([]); 
      }
      setHasMore(documents.length === ITEMS_PER_PAGE);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };
  
  const getStatusBadge = (dateStr) => {
    const today = new Date();
    const expDate = new Date(dateStr);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)); 
    if (diffDays < 0) return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200"><AlertTriangle size={12}/> Vencido</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200"><Clock size={12}/> Vence: {diffDays}d</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/30 flex justify-between items-center">
          <h3 className="font-bold text-red-900 flex items-center gap-2"><AlertTriangle className="text-red-600" size={20}/> Documentación Crítica</h3>
          {projectFilter && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 rounded-full">Obra: {projectFilter}</span>}
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100"><tr><th className="px-4 py-3">Personal</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acción</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr> : 
             docs.length === 0 ? <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Todo en orden.</td></tr> : 
             docs.map(doc => (
                <tr key={doc.id} className="hover:bg-red-50/40">
                    <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{doc.owner_name}</p>
                        <p className="text-[10px] text-slate-400">{doc.role_display}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]" title={doc.doc_type}>{doc.doc_type}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.expiration_date)}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => onUpdate(doc.person_data)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200"><RefreshCw size={16}/></button></td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex justify-end gap-2"><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-white text-slate-500"><ChevronLeft size={18}/></button><button onClick={() => setPage(p => p + 1)} disabled={!hasMore} className="p-1 rounded hover:bg-white text-slate-500"><ChevronRight size={18}/></button></div>
    </div>
  );
};

const ValidWorkersTable = ({ refreshTrigger, onAssign, projectFilter }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => { fetchValidWorkers(); }, [page, refreshTrigger, projectFilter]);

  const fetchValidWorkers = async () => {
    setLoading(true);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      let query = supabase.from('workers').select('id, full_name, category, project_assigned').eq('status', 'Activo');
      
      if (projectFilter) {
          query = query.eq('project_assigned', projectFilter);
      }

      const { data: people, error } = await query.range(from, to).order('full_name');
      
      if (error) throw error;

      if (people.length > 0) {
        const ids = people.map(p => p.id);
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: docs } = await supabase.from('hr_documents').select('person_id, expiration_date').in('person_id', ids).lt('expiration_date', todayStr);
        
        setWorkers(people.map(person => {
           const hasExpired = docs?.some(d => d.person_id === person.id);
           return { ...person, docStatus: hasExpired ? 'Warning' : 'OK' };
        }));
      } else { setWorkers([]); }
      
      setHasMore(people.length === ITEMS_PER_PAGE);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckCircle className="text-green-600" size={20}/> Personal Activo</h3>
          {projectFilter && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 rounded-full">Obra: {projectFilter}</span>}
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100"><tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">Proyecto</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Derivar</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr> : 
             workers.length === 0 ? <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Sin personal asignado.</td></tr> : 
             workers.map(worker => (
                <tr key={worker.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{worker.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 truncate max-w-[100px]">{worker.project_assigned || '-'}</td>
                    <td className="px-4 py-3">{worker.docStatus === 'OK' ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200"><CheckCircle size={10}/> OK</span> : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold border border-red-200"><AlertTriangle size={10}/> DOCS</span>}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => onAssign(worker)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 border border-indigo-200"><Briefcase size={16}/></button></td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex justify-end gap-2"><button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-white text-slate-500"><ChevronLeft size={18}/></button><button onClick={() => setPage(p => p + 1)} disabled={!hasMore} className="p-1 rounded hover:bg-white text-slate-500"><ChevronRight size={18}/></button></div>
    </div>
  );
};

const AssignProjectModal = ({ isOpen, onClose, worker, onSuccess }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchProjects = async () => { const { data } = await supabase.from('projects').select('name').eq('status', 'En Ejecución'); setProjects(data || []); setSelectedProject(worker?.project_assigned || ''); };
            fetchProjects();
        }
    }, [isOpen, worker]);

    const handleSave = async () => {
        setLoading(true);
        try { const { error } = await supabase.from('workers').update({ project_assigned: selectedProject }).eq('id', worker.id); if (error) throw error; onSuccess(); onClose(); } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"><div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">Derivar Personal</h3><button onClick={onClose}><X size={20} className="text-slate-400"/></button></div><div className="mb-4"><p className="text-sm text-slate-500 mb-1">Trabajador</p><div className="font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">{worker?.full_name}</div></div><div className="mb-6"><p className="text-sm text-slate-500 mb-1">Proyecto de Destino</p><select className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#003366] text-sm" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}><option value="">Sin Asignar</option>{projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div><button onClick={handleSave} disabled={loading} className="w-full py-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-blue-900 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Guardar Asignación</>}</button></div></div>
    );
};

export default DashboardPage;