import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Lock, HardHat, Briefcase, ArrowRight, Loader2, User, KeyRound, Eye, EyeOff
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useWorkerAuth } from '../../context/WorkerAuthContext';

import logoFull from '../../assets/images/logo-lk-full.png';
import bgImage from '../../assets/images/fondo-login.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWorker } = useWorkerAuth();
  
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

  // --- LÓGICA DE LOGIN ADMIN ---
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

      // Mostrar pantalla de bienvenida antes de redirigir
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      setErrorMsg('Credenciales incorrectas.');
      setLoading(false);
    }
  };

  // --- LÓGICA DE LOGIN OBRERO ---
  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', dni)
        .maybeSingle();

      if (error || !data) throw new Error('Documento no encontrado.');

      const isMatch = await bcrypt.compare(workerPassword, data.password);
      if (!isMatch) throw new Error('Contraseña incorrecta.');

      if (data.status !== 'Activo') throw new Error('Usuario inactivo.');

      // Guardar sesión en el contexto
      loginWorker(data);
      
      // Mostrar pantalla de bienvenida antes de redirigir
      setShowWelcome(true);
      setTimeout(() => {
        navigate('/worker/dashboard');
      }, 2000);

    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error de autenticación.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-gray-50 font-sans">
      
      {/* ========================================================= */}
      {/* PANTALLA DE BIENVENIDA (Overlay Global)                   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#003366]"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <img src={logoFull} alt="L&K Logo" className="h-24 brightness-0 invert mb-6" />
              <h2 className="text-4xl font-bold text-white mb-2">Bienvenido</h2>
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin mt-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* PANEL IZQUIERDO (Tarjeta Flotante con Imagen)             */}
      {/* ========================================================= */}
      <div className="hidden lg:flex w-1/2 p-6 items-center justify-center relative">
        
        {/* Tarjeta contenedora con sombras y bordes redondeados */}
        <div className="w-full h-full relative rounded-[3rem] shadow-2xl overflow-hidden bg-[#003366] z-10">
            
            {/* Imagen de Fondo con Animación */}
            <img 
              src={bgImage} 
              alt="Construcción L&K" 
              className="absolute inset-0 w-full h-full object-cover animate-slow-pan scale-110"
            />
            
            {/* Capas de Color (Overlay) para legibilidad y tinte azul */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#003366]/95 via-[#003366]/60 to-transparent mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#001a33] via-transparent to-transparent opacity-90"></div>
            
            {/* Contenido sobre la imagen */}
            <div className="relative z-10 h-full flex flex-col justify-between p-16 text-white">
                <div>
                    <img src={logoFull} alt="L&K" className="h-16 brightness-0 invert opacity-90 drop-shadow-lg" />
                </div>
                <div className="mb-10">
                    <h1 className="text-5xl font-extrabold leading-tight mb-6 drop-shadow-md tracking-tight">
                        Construyendo el <br/>
                        <span className="text-[#f0c419]">futuro, hoy.</span>
                    </h1>
                    <p className="text-xl text-blue-100 opacity-90 max-w-md font-medium leading-relaxed drop-shadow-sm">
                        Plataforma integral de gestión de obras y control de personal en tiempo real.
                    </p>
                </div>
                {/* Indicadores decorativos */}
                <div className="flex gap-2">
                    <div className="w-12 h-1.5 bg-white rounded-full backdrop-blur-md"></div>
                    <div className="w-3 h-1.5 bg-white/40 rounded-full backdrop-blur-md"></div>
                    <div className="w-3 h-1.5 bg-white/40 rounded-full backdrop-blur-md"></div>
                </div>
            </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PANEL DERECHO (Formulario)                                */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative z-0">
        
        <div className="w-full max-w-md space-y-10 relative z-10">
          
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Iniciar Sesión</h2>
            <p className="text-slate-500 text-lg">Bienvenido de nuevo a L&K Construcciones.</p>
          </div>

          {/* Selector de Tabs Mejorado */}
          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button
              onClick={() => { setLoginMode('admin'); setErrorMsg(null); }}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginMode === 'admin' 
                  ? 'bg-white text-[#003366] shadow-md' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Briefcase size={20} /> Administrativo
            </button>
            <button
              onClick={() => { setLoginMode('worker'); setErrorMsg(null); }}
              className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginMode === 'worker' 
                  ? 'bg-white text-[#003366] shadow-md' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <HardHat size={20} /> Personal Obrero
            </button>
          </div>

          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORMULARIO ADMIN */}
          {loginMode === 'admin' && (
            <motion.form 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleAdminSubmit} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Correo Electrónico</label>
                <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={20} />
                    <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                        placeholder="ejemplo@lyk.com"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
                <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={20} />
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-14 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003366] transition-colors"
                    >
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-lg hover:bg-[#002244] shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>Ingresar <ArrowRight size={22}/></>}
                </button>
              </div>
            </motion.form>
          )}

          {/* FORMULARIO OBRERO */}
          {loginMode === 'worker' && (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleWorkerSubmit} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Documento (DNI/CE)</label>
                <div className="relative group">
                    <HardHat className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={20} />
                    <input
                        type="tel"
                        required
                        autoComplete="username"
                        maxLength={15}
                        value={dni}
                        onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-bold tracking-widest placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:border-[#003366] focus:bg-white transition-all text-lg"
                        placeholder="00000000"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Contraseña</label>
                <div className="relative group">
                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={20} />
                    <input
                        type={showWorkerPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={workerPassword}
                        onChange={(e) => setWorkerPassword(e.target.value)}
                        className="w-full pl-14 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                        placeholder="••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003366] transition-colors"
                    >
                        {showWorkerPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                    </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-lg hover:bg-[#002244] shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-all flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>Acceder al Panel <ArrowRight size={22}/></>}
                </button>
              </div>
            </motion.form>
          )}

          <div className="text-center pt-8 border-t border-slate-100 relative z-10">
            <p className="text-xs text-slate-400 font-medium">
                &copy; 2024 L&K Constructora e Inversiones. Todos los derechos reservados.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;