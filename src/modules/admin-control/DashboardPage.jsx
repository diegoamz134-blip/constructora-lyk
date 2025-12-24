import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, TrendingUp, Activity, Clock, 
  MapPin, LogIn, LogOut, CheckCircle2, AlertCircle, Loader2, User,
  AlertTriangle, ChevronLeft, ChevronRight, CheckCircle, FileText,
  Briefcase, RefreshCw, Save, X
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import StatusModal from '../../components/common/StatusModal';
import EmployeeDocumentsModal from '../hr/components/EmployeeDocumentsModal'; // Importamos el modal de documentos

const DashboardPage = () => {
  // --- ESTADOS ORIGINALES ---
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });

  const [kpiData, setKpiData] = useState({ activeProjects: 0, activeStaff: 0 });

  // --- NUEVOS ESTADOS PARA LAS TABLAS Y MODALES ---
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedPersonForDocs, setSelectedPersonForDocs] = useState(null);
  
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedWorkerForProject, setSelectedWorkerForProject] = useState(null);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Para recargar las tablas

  // 1. Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. CARGA INTELIGENTE DE DATOS (ORIGINAL)
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

        // B. Si no hay local, recuperar de Supabase Auth
        if (!user) {
           const { data: { user: authUser } } = await supabase.auth.getUser();
           if (authUser?.email) {
               console.log("Recuperando perfil para:", authUser.email);
               
               const { data: profile } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('email', authUser.email)
                  .maybeSingle();

               if (profile) {
                   user = { 
                       id: profile.id, 
                       full_name: profile.full_name, 
                       email: profile.email, 
                       role: profile.role,
                       source: 'profiles' 
                   };
                   localStorage.setItem('lyk_admin_session', JSON.stringify(user));
               }
           }
        }
        
        console.log("Usuario final detectado:", user);
        setCurrentUser(user);

        // C. Buscar Asistencia de Hoy
        if (user && user.id) {
            const today = new Date().toISOString().split('T')[0];
            let query = supabase.from('attendance').select('*').eq('date', today);

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
  }, [refreshTrigger]); // Se recarga si cambia el trigger

  // --- HELPER: GEOLOCALIZACIÓN (ORIGINAL) ---
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
                resolve(`${latitude},${longitude}`);
            },
            (error) => {
                console.warn("Error obteniendo GPS:", error);
                resolve(null); 
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
  };

  // --- MANEJADORES DE ASISTENCIA (ORIGINALES) ---
  const handleCheckIn = async () => {
    setBtnLoading(true);
    
    if (!currentUser || !currentUser.id) {
        setBtnLoading(false);
        setNotification({
            isOpen: true, type: 'error', title: 'Usuario No Identificado', 
            message: 'No se encontraron tus datos. Cierra sesión y vuelve a ingresar.'
        });
        return;
    }
    
    try {
      console.log("Procesando entrada para:", currentUser.full_name);
      const location = await getCurrentLocation();
      const locationString = location || 'Panel Web (Sin GPS)';
      const now = new Date();
      
      const isNumericId = !isNaN(currentUser.id) && !isNaN(parseFloat(currentUser.id));
      
      const payload = {
        date: now.toISOString().split('T')[0],
        check_in_time: now.toISOString(),
        project_name: 'Oficina Central', 
        check_in_location: locationString, 
        worker_id: null, 
      };

      if (isNumericId) {
          payload.employee_id = parseInt(currentUser.id, 10);
          payload.profile_id = null;
      } else {
          payload.employee_id = null;
          payload.profile_id = currentUser.id;
      }

      const { data, error } = await supabase.from('attendance').insert([payload]).select().single();
      
      if (error) throw error;
      
      setTodayRecord(data);
      setNotification({
        isOpen: true, type: 'success', title: '¡Entrada Registrada!',
        message: `Hola ${currentUser.full_name}, asistencia registrada a las ${now.toLocaleTimeString()}.`
      });

    } catch (error) {
      console.error("Error CheckIn:", error);
      setNotification({
        isOpen: true, type: 'error', title: 'Error de Registro',
        message: error.message || 'No se pudo registrar la entrada.'
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
      const location = await getCurrentLocation();
      const locationString = location || 'Panel Web (Sin GPS)';
      const now = new Date();
      const { data, error } = await supabase
        .from('attendance')
        .update({ 
          check_out_time: now.toISOString(),
          check_out_location: locationString 
        })
        .eq('id', todayRecord.id)
        .select()
        .single();

      if (error) throw error;

      setTodayRecord(data);
      setNotification({
        isOpen: true, type: 'success', title: '¡Salida Registrada!',
        message: 'Jornada finalizada exitosamente.'
      });

    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true, type: 'error', title: 'Error de Salida',
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

  // --- NUEVOS MANEJADORES PARA TABLAS ---
  const handleOpenUpdateDocs = (person) => {
    setSelectedPersonForDocs(person);
    setDocModalOpen(true);
  };

  const handleOpenAssignProject = (worker) => {
    setSelectedWorkerForProject(worker);
    setProjectModalOpen(true);
  };

  const handleSuccessAction = () => {
    setRefreshTrigger(prev => prev + 1); // Forzar recarga de datos
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-10"
    >
      
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* BANNER (ORIGINAL) */}
        <div className="flex-1 bg-[#0F172A] p-8 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-2">
              Hola, {currentUser?.full_name?.split(' ')[0] || 'Usuario'} 👋
            </h2>
            <p className="text-blue-200 text-sm md:text-base max-w-lg">
              Bienvenido al panel de control.
            </p>
            
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

        {/* WIDGET DE ASISTENCIA (ORIGINAL) */}
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

      {/* KPIs Grid (ORIGINAL) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Building2 /></div><h3 className="text-3xl font-bold text-slate-800">{kpiData.activeProjects}</h3><p className="text-slate-500 text-sm font-medium">Obras en Ejecución</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4"><TrendingUp /></div><h3 className="text-3xl font-bold text-slate-800">94%</h3><p className="text-slate-500 text-sm font-medium">Cumplimiento General</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><Activity /></div><h3 className="text-3xl font-bold text-slate-800">{kpiData.activeStaff}</h3><p className="text-slate-500 text-sm font-medium">Personal Activo Total</p></div>
      </div>
      
      {/* ------------------------------------------------------------------ */}
      {/* NUEVAS SECCIONES: DOCUMENTOS VENCIDOS Y PERSONAL AL DÍA            */}
      {/* ------------------------------------------------------------------ */}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ExpiredDocumentsTable 
          refreshTrigger={refreshTrigger} 
          onUpdate={handleOpenUpdateDocs} 
        />
        <ValidWorkersTable 
          refreshTrigger={refreshTrigger} 
          onAssign={handleOpenAssignProject} 
        />
      </div>

      {/* MODALES FLOTANTES */}
      <EmployeeDocumentsModal 
        isOpen={docModalOpen}
        onClose={() => { setDocModalOpen(false); handleSuccessAction(); }}
        person={selectedPersonForDocs}
      />

      <AssignProjectModal 
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        worker={selectedWorkerForProject}
        onSuccess={handleSuccessAction}
      />

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

// ==============================================================================
// SUB-COMPONENTES AUXILIARES (DEFINIDOS EN EL MISMO ARCHIVO PARA SIMPLIFICAR)
// ==============================================================================

// 1. TABLA DE DOCUMENTOS VENCIDOS
const ExpiredDocumentsTable = ({ refreshTrigger, onUpdate }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchExpiredDocs();
  }, [page, refreshTrigger]);

  const fetchExpiredDocs = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Traer documentos que vencen pronto
      const { data: documents, error } = await supabase
        .from('hr_documents')
        .select('*')
        .lte('expiration_date', nextMonthStr) 
        .order('expiration_date', { ascending: true }) 
        .range(from, to);

      if (error) throw error;

      if (documents.length > 0) {
        // Enriquecer con nombres (Join manual para rendimiento)
        const personIds = [...new Set(documents.map(d => d.person_id))];
        const [workersRes, employeesRes] = await Promise.all([
          supabase.from('workers').select('id, full_name, category').in('id', personIds),
          supabase.from('employees').select('id, full_name, position').in('id', personIds)
        ]);

        const personMap = {};
        workersRes.data?.forEach(w => personMap[w.id] = { ...w, role: 'worker', displayRole: w.category });
        employeesRes.data?.forEach(e => personMap[e.id] = { ...e, role: 'employee', displayRole: e.position });

        const enrichedDocs = documents.map(doc => {
            const person = personMap[doc.person_id];
            return {
                ...doc,
                owner_name: person ? person.full_name : 'Desconocido',
                person_data: person // Pasamos el objeto completo para el modal
            };
        });
        setDocs(enrichedDocs);
      } else {
        setDocs([]);
      }
      setHasMore(documents.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error expired docs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (dateStr) => {
    const today = new Date();
    const expDate = new Date(dateStr);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24)); 

    if (diffDays < 0) return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200"><AlertTriangle size={12}/> Vencido</span>;
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200"><Clock size={12}/> Vence en {diffDays} días</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-red-100 bg-red-50/30 flex justify-between items-center">
        <h3 className="font-bold text-red-900 flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20}/> Documentación Crítica
        </h3>
        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full uppercase">Acción Requerida</span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Personal</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Cargando...</td></tr>
            ) : docs.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400 flex flex-col items-center gap-2"><CheckCircle size={24} className="text-green-500"/> Todo en orden.</td></tr>
            ) : (
              docs.map(doc => (
                <tr key={doc.id} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-700">{doc.owner_name}</td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-[100px]">{doc.doc_type}</td>
                  <td className="px-4 py-3">{getStatusBadge(doc.expiration_date)}</td>
                  <td className="px-4 py-3 text-right">
                      {/* BOTÓN ACTUALIZAR */}
                      <button 
                        onClick={() => onUpdate(doc.person_data)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                        title="Actualizar Documento"
                      >
                          <RefreshCw size={16}/>
                      </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="p-1 rounded hover:bg-white disabled:opacity-50 text-slate-500"><ChevronLeft size={18}/></button>
        <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading} className="p-1 rounded hover:bg-white disabled:opacity-50 text-slate-500"><ChevronRight size={18}/></button>
      </div>
    </div>
  );
};

// 2. TABLA DE PERSONAL AL DÍA
const ValidWorkersTable = ({ refreshTrigger, onAssign }) => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 5;
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchValidWorkers();
  }, [page, refreshTrigger]);

  const fetchValidWorkers = async () => {
    setLoading(true);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: people, error } = await supabase
        .from('workers')
        .select('id, full_name, category, project_assigned')
        .eq('status', 'Activo')
        .range(from, to)
        .order('full_name');

      if (error) throw error;

      if (people.length > 0) {
        const ids = people.map(p => p.id);
        const { data: docs } = await supabase.from('hr_documents').select('person_id, expiration_date').in('person_id', ids);
        const todayStr = new Date().toISOString().split('T')[0];

        const validPeople = people.map(person => {
           const personDocs = docs.filter(d => d.person_id === person.id);
           const hasExpired = personDocs.some(d => d.expiration_date && d.expiration_date < todayStr);
           return { 
             ...person, 
             docStatus: hasExpired ? 'Warning' : 'OK', 
             totalDocs: personDocs.length 
           };
        });
        setWorkers(validPeople);
      } else {
        setWorkers([]);
      }
      setHasMore(people.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error fetching valid workers:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle className="text-green-600" size={20}/> Estado del Personal
        </h3>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase">Obreros Activos</span>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Derivar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Verificando...</td></tr>
            ) : workers.length === 0 ? (
              <tr><td colSpan="4" className="px-4 py-6 text-center text-slate-400">Sin personal activo.</td></tr>
            ) : (
              workers.map(worker => (
                <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-700">{worker.full_name}</td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-[100px]">{worker.project_assigned || '-'}</td>
                  <td className="px-4 py-3">
                    {worker.docStatus === 'OK' ? (
                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200">
                         <CheckCircle size={10}/> AL DÍA
                       </span>
                    ) : (
                       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                         <Clock size={10}/> REVISAR
                       </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                      {/* BOTÓN DERIVAR */}
                      <button 
                        onClick={() => onAssign(worker)}
                        className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                        title="Asignar Proyecto"
                      >
                          <Briefcase size={16}/>
                      </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading} className="p-1 rounded hover:bg-white disabled:opacity-50 text-slate-500"><ChevronLeft size={18}/></button>
        <button onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading} className="p-1 rounded hover:bg-white disabled:opacity-50 text-slate-500"><ChevronRight size={18}/></button>
      </div>
    </div>
  );
};

// 3. MODAL DE ASIGNACIÓN DE PROYECTO (SIMPLE)
const AssignProjectModal = ({ isOpen, onClose, worker, onSuccess }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchProjects = async () => {
                const { data } = await supabase.from('projects').select('name').eq('status', 'En Ejecución');
                setProjects(data || []);
                setSelectedProject(worker?.project_assigned || '');
            };
            fetchProjects();
        }
    }, [isOpen, worker]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('workers').update({ project_assigned: selectedProject }).eq('id', worker.id);
            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al asignar proyecto");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Derivar Personal</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
                </div>
                
                <div className="mb-4">
                    <p className="text-sm text-slate-500 mb-1">Trabajador</p>
                    <div className="font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {worker?.full_name}
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-slate-500 mb-1">Proyecto de Destino</p>
                    <select 
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#003366] text-sm"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                    >
                        <option value="">Sin Asignar</option>
                        {projects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                </div>

                <button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="w-full py-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-blue-900 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Guardar Asignación</>}
                </button>
            </div>
        </div>
    );
};

export default DashboardPage;