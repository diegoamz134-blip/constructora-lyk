import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, HardHat, Briefcase, ArrowRight, Loader2, User, KeyRound
} from 'lucide-react';
import bcrypt from 'bcryptjs';
// [NUEVO] Usamos el hook del contexto
import { useWorkerAuth } from '../../context/WorkerAuthContext';

import logoFull from '../../assets/images/logo-lk-full.png';
import bgImage from '../../assets/images/fondo-login.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWorker } = useWorkerAuth(); // [NUEVO] Extraemos la función login
  
  // Estado para el modo de login: 'admin' | 'worker'
  const [loginMode, setLoginMode] = useState('admin');
  
  // Estados Admin
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados Obrero
  const [dni, setDni] = useState('');
  const [workerPassword, setWorkerPassword] = useState('');
  
  // Estados de UI
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // --- LOGIN ADMINISTRATIVO ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2500);

    } catch (error) {
      setErrorMsg('Credenciales administrativas incorrectas.');
      setLoading(false);
    }
  };

  // --- LOGIN OBRERO (CON CONTEXTO Y HASH) ---
  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Buscar al obrero
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', dni)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Documento no encontrado o credenciales incorrectas.');
      }

      // 2. Verificar contraseña (HASH)
      const isMatch = await bcrypt.compare(workerPassword, data.password);
      if (!isMatch) {
        throw new Error('Contraseña incorrecta.');
      }

      // 3. Verificar estado
      if (data.status !== 'Activo') {
        throw new Error('Usuario inactivo. Contacte a RR.HH.');
      }

      // 4. [CAMBIO] Guardar sesión en Contexto/LocalStorage
      loginWorker(data);

      // 5. Redirigir (ya no enviamos state)
      navigate('/worker/dashboard');

    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error de autenticación.');
      setLoading(false);
    }
  };

  // ... (El resto del return del componente se mantiene IDÉNTICO, solo cambiamos la lógica arriba)
  return (
    <div className="h-screen w-full flex overflow-hidden bg-white relative font-sans">
      
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-lk-darkblue"
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lk-blue/40 via-lk-darkblue to-lk-darkblue"></div>
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <img src={logoFull} alt="L&K Logo" className="h-32 object-contain mb-8 drop-shadow-2xl brightness-0 invert" />
              <h2 className="text-5xl font-extrabold mb-4 text-white tracking-tight">¡Bienvenido!</h2>
              <p className="text-xl text-blue-200 font-medium tracking-wide">Accediendo al panel de control...</p>
              <div className="mt-10">
                <Loader2 className="w-12 h-12 text-lk-accent animate-spin" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:block md:w-[60%] relative h-full overflow-hidden">
        <img 
          src={bgImage} 
          alt="Construcción L&K" 
          className="absolute inset-0 w-full h-full object-cover animate-slow-pan scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-lk-darkblue via-lk-darkblue/80 to-lk-blue/50 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-lk-darkblue via-transparent to-transparent opacity-80"></div>
        
        <div className="absolute bottom-0 left-0 p-12 lg:p-20 z-10">
          <img src={logoFull} alt="L&K" className="h-20 mb-8 drop-shadow-lg brightness-0 invert" />
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
            Excelencia en <br/>
            <span className="text-lk-accent">cada proyecto.</span>
          </h1>
          <p className="text-blue-100 text-xl max-w-lg leading-relaxed opacity-90">
            Sistema integral de gestión de obras, personal y control de asistencia en tiempo real.
          </p>
        </div>
      </div>

      <div className="w-full md:w-[45%] h-full bg-white flex flex-col justify-center p-8 md:p-12 lg:p-20 relative z-10 md:rounded-l-[4rem] md:-ml-24 shadow-2xl">
        <div className="w-full max-w-md mx-auto">
          <div className="md:hidden text-center mb-8">
            <img src={logoFull} alt="L&K Logo" className="h-16 mx-auto" />
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Iniciar Sesión</h2>
            <p className="text-gray-500 mt-2 text-lg">Seleccione su tipo de perfil para continuar.</p>
          </div>

          <div className="bg-slate-100 p-1.5 rounded-2xl flex mb-8">
            <button
              onClick={() => { setLoginMode('admin'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                loginMode === 'admin' 
                  ? 'bg-white text-lk-darkblue shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Briefcase size={18} /> Administrativo
            </button>
            <button
              onClick={() => { setLoginMode('worker'); setErrorMsg(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                loginMode === 'worker' 
                  ? 'bg-white text-lk-darkblue shadow-md' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <HardHat size={18} /> Personal Obrero
            </button>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl shadow-sm text-sm font-medium flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {loginMode === 'admin' && (
            <motion.form 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleAdminSubmit} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lk-blue transition-colors" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-lk-blue focus:bg-white focus:ring-0 transition-all font-medium"
                    placeholder="admin@lyk.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lk-blue transition-colors" size={20} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-lk-blue focus:bg-white focus:ring-0 transition-all font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lk-blue transition-colors"
                  >
                    {showPassword ? <span className="text-xs font-bold">OCULTAR</span> : <span className="text-xs font-bold">VER</span>}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-lk-blue focus:ring-lk-blue" />
                  <span className="ml-2 text-gray-600">Recordarme</span>
                </label>
                <a href="#" className="text-lk-blue hover:underline font-medium">¿Olvidaste tu clave?</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-lk-darkblue to-lk-blue text-white rounded-xl font-bold text-lg hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Ingresar <ArrowRight size={20} /></>}
              </button>
            </motion.form>
          )}

          {loginMode === 'worker' && (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleWorkerSubmit} 
              className="space-y-6"
            >
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 text-sm mb-2 flex items-start gap-3">
                <User className="shrink-0 mt-0.5" size={18} />
                <span>Ingrese sus credenciales personales para acceder al panel.</span>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Documento (DNI/CE)</label>
                  <div className="relative group">
                    <HardHat className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lk-blue transition-colors" size={20} />
                    <input
                      type="tel"
                      required
                      maxLength={15}
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-lk-blue focus:bg-white focus:ring-0 transition-all font-bold text-lg tracking-widest"
                      placeholder="00000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lk-blue transition-colors" size={20} />
                    <input
                      type={showWorkerPassword ? "text" : "password"}
                      required
                      value={workerPassword}
                      onChange={(e) => setWorkerPassword(e.target.value)}
                      className="block w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-lk-blue focus:bg-white focus:ring-0 transition-all font-medium text-lg"
                      placeholder="••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-lk-blue transition-colors"
                    >
                      {showWorkerPassword ? <span className="text-xs font-bold">OCULTAR</span> : <span className="text-xs font-bold">VER</span>}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-lk-darkblue text-white rounded-xl font-bold text-lg hover:bg-lk-blue hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : <>Ingresar al Panel <ArrowRight size={20} /></>}
              </button>
            </motion.form>
          )}

          <p className="text-center text-xs text-gray-400 mt-12">
            © 2024 L&K Constructora e Inversiones. v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;