import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, HardHat, ArrowRight, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; 
import { useAuth } from '../../context/AuthContext';
import fondoLogin from '../../assets/images/fondo-login.jpg';
import logoFull from '../../assets/images/logo-lk-full.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWorker } = useWorkerAuth();
  const { login } = useAuth();
  
  const [userType, setUserType] = useState('admin'); 
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ESTADOS DE DIAGNÓSTICO
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking', 'ok', 'error'
  const [envStatus, setEnvStatus] = useState(null);

  // 1. CHEQUEO AUTOMÁTICO AL CARGAR
  useEffect(() => {
    const runDiagnostics = async () => {
      console.log("--- INICIANDO DIAGNÓSTICO ---");
      
      // A) Verificar Variables de Entorno (Sin mostrar las claves reales por seguridad)
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_KEY;
      
      const envCheck = {
        hasUrl: !!url && url.length > 0,
        hasKey: !!key && key.length > 0,
        urlPreview: url ? `${url.substring(0, 15)}...` : 'Falta definir',
      };
      setEnvStatus(envCheck);
      console.log("Estado ENV:", envCheck);

      if (!envCheck.hasUrl || !envCheck.hasKey) {
        setConnectionStatus('error');
        setError("FALTAN VARIABLES DE ENTORNO. Revisa tu archivo .env y reinicia la terminal.");
        return;
      }

      // B) Ping a Supabase (Intentamos leer algo público)
      try {
        const start = Date.now();
        // Intentamos conectar. Usamos 'workers' que ya habilitaste para lectura pública
        const { count, error } = await supabase.from('workers').select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error("Error de conexión:", error);
          // Si es un error de RLS (permisos), al menos sabemos que conectó.
          // Si es Network Error, es que no llega.
          if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
             setConnectionStatus('error');
             setError("ERROR DE RED: No se puede conectar con Supabase. Verifica tu internet o firewall.");
          } else {
             // Si responde error 401 o permisos, ¡SIGNIFICA QUE SÍ CONECTA!
             setConnectionStatus('ok'); 
          }
        } else {
          console.log(`Conexión exitosa en ${Date.now() - start}ms`);
          setConnectionStatus('ok');
        }
      } catch (err) {
        console.error("Error crítico:", err);
        setConnectionStatus('error');
        setError(`Error de conexión: ${err.message}`);
      }
    };

    runDiagnostics();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Temporizador de seguridad
    const safetyTimer = setTimeout(() => {
      setLoading(current => {
        if (current) {
          setError('TIMEOUT: El servidor no responde. Mira la consola (F12) para más detalles.');
          return false;
        }
        return false;
      });
    }, 10000); // 10 segundos

    try {
      console.log("Intentando Login...");
      
      if (userType === 'admin') {
        // Usamos el login del contexto
        const response = await login(formData.identifier, formData.password);
        
        if (response?.user || response?.data?.user) {
           // Si llegamos aquí, ¡ÉXITO!
           console.log("Login exitoso, redirigiendo...");
           // (La lógica de redirección la maneja el componente o el useEffect de AuthContext, 
           // pero aquí forzamos la navegación por si acaso)
           navigate('/dashboard'); 
        }
      } else {
        const { success, error: workerError } = await loginWorker(formData.identifier, formData.password);
        if (success) navigate('/worker/dashboard');
        else setError(workerError || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error("Login Falló:", err);
      let msg = 'Error desconocido';
      if (err.message) msg = err.message;
      if (msg.includes('Invalid login')) msg = 'Contraseña incorrecta o usuario no encontrado.';
      setError(msg);
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center relative font-sans"
      style={{ backgroundImage: `url(${fondoLogin})` }}
    >
      <div className="absolute inset-0 bg-[#003366]/80 backdrop-blur-sm"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden m-4"
      >
        {/* CABECERA DE DIAGNÓSTICO (Solo visible si hay problemas o cargando) */}
        <div className={`p-2 text-xs text-center font-bold flex items-center justify-center gap-2 
          ${connectionStatus === 'ok' ? 'bg-green-100 text-green-700' : 
            connectionStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
          
          {connectionStatus === 'checking' && <><Loader2 className="animate-spin" size={12}/> Probando conexión...</>}
          {connectionStatus === 'ok' && <><Wifi size={14}/> Conexión con Supabase: OK</>}
          {connectionStatus === 'error' && <><WifiOff size={14}/> Sin conexión a Supabase</>}
        </div>

        {envStatus && (!envStatus.hasUrl || !envStatus.hasKey) && (
           <div className="bg-red-500 text-white p-2 text-xs text-center font-bold">
             ⚠️ ERROR CRÍTICO: No se detectan las API KEYS en .env
           </div>
        )}

        <div className="bg-white p-6 pb-0 flex justify-center">
          <img src={logoFull} alt="L&K Logo" className="h-16 object-contain" />
        </div>

        <div className="p-8 pt-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Sistema de Gestión Integral</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 relative">
             {/* ... (Tus botones de Admin/Obrero sin cambios) ... */}
            <motion.div 
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm"
              initial={false}
              animate={{ x: userType === 'admin' ? 0 : '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button
              type="button"
              onClick={() => { setUserType('admin'); setError(''); setFormData({identifier:'', password:''}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors ${userType === 'admin' ? 'text-[#003366]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <User size={18} /> Admin
            </button>
            <button
              type="button"
              onClick={() => { setUserType('worker'); setError(''); setFormData({identifier:'', password:''}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors ${userType === 'worker' ? 'text-[#f0c419]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <HardHat size={18} /> Obrero
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <AnimatePresence mode='wait'>
              <motion.div
                key={userType}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                      {userType === 'admin' ? 'Correo Electrónico' : 'DNI / Documento'}
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#003366] transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        type={userType === 'admin' ? "email" : "text"}
                        name="identifier"
                        value={formData.identifier}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003366] transition-all font-medium text-slate-700"
                        placeholder={userType === 'admin' ? "ejemplo@lyk.com" : "Ingrese su DNI"}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Contraseña</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#003366] transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#003366] transition-all font-medium text-slate-700"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm font-medium"
              >
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || connectionStatus === 'error'}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                ${userType === 'admin' 
                  ? 'bg-[#003366] hover:bg-[#002244]' 
                  : 'bg-[#f0c419] hover:bg-[#d4aa00]'
                }`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Ingresar al Sistema <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;