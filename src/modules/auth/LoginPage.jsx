import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth'; 

import { Eye, EyeOff, Loader2, HardHat, Briefcase, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import logoLyk from '../../assets/images/logo-lk-full.png'; 
import bgImage from '../../assets/images/fondo-login.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  
  const { login: loginStaff } = useAuth();
  const { loginWorker } = useWorkerAuth();
  const { currentUser } = useUnifiedAuth(); 

  const [activeTab, setActiveTab] = useState('staff'); 
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginSuccess, setLoginSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  // --- REDIRECCIÓN AUTOMÁTICA MEJORADA ---
  useEffect(() => {
    if (!loading && !loginSuccess && currentUser) {
       console.log("🚀 Usuario detectado:", currentUser);
       
       // CORRECCIÓN: Verificamos 'type' (del hook unificado) O 'role' (del contexto)
       const isWorker = 
          currentUser.type === 'worker' || 
          currentUser.role === 'worker' || 
          currentUser.role === 'obrero';

       const targetPath = isWorker ? '/worker/dashboard' : '/dashboard';
       
       navigate(targetPath, { replace: true });
    }
  }, [currentUser, navigate, loading, loginSuccess]);

  const triggerSuccess = (path, name) => {
    setWelcomeName(name);
    setLoginSuccess(true);
    setTimeout(() => {
        navigate(path, { replace: true });
    }, 2000); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const identifier = formData.identifier.trim();
      const password = formData.password;

      if (activeTab === 'staff') {
         const response = await loginStaff(identifier, password);
         const nameToShow = response.user.full_name?.split(' ')[0] || response.user.first_name || 'Colaborador';
         triggerSuccess('/dashboard', nameToShow);
      } else {
         const response = await loginWorker(identifier, password);
         
         if (response.success) {
            const nameToShow = response.data.full_name?.split(' ')[0] || 'Compañero';
            triggerSuccess('/worker/dashboard', nameToShow);
         } else {
            throw new Error(response.error || 'Error al iniciar sesión.');
         }
      }

    } catch (err) {
      console.error("Login Error:", err);
      let msg = err.message || 'Error de conexión.';
      if (msg.includes('PGRST116')) msg = 'Error de datos duplicados.';
      setError(msg);
      setLoading(false);
    }
  };

  // Estilos dinámicos
  const themeColor = activeTab === 'staff' ? 'bg-[#003366]' : 'bg-orange-600';
  const themeHover = activeTab === 'staff' ? 'hover:bg-blue-900' : 'hover:bg-orange-700';
  const themeBorder = activeTab === 'staff' ? 'focus:border-[#003366]' : 'focus:border-orange-500';
  const themeRing = activeTab === 'staff' ? 'focus:ring-blue-100' : 'focus:ring-orange-100';

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row ${activeTab === 'obrero' ? 'lg:flex-row-reverse' : 'lg:flex-row'} bg-slate-50 overflow-hidden relative`}>
      
      {/* === OVERLAY DE BIENVENIDA === */}
      <AnimatePresence>
        {loginSuccess && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center text-white ${activeTab === 'staff' ? 'bg-[#003366]' : 'bg-orange-600'}`}
          >
             <motion.div 
               initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
               className="flex flex-col items-center p-6 text-center"
             >
              <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 shadow-2xl">
                 <CheckCircle size={48} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-4xl font-bold mb-2 tracking-tight">¡Bienvenido!</h2>
              <p className="text-white/80 text-xl mb-8 font-medium">Hola, {welcomeName}</p>
              <Loader2 className="animate-spin text-white/50" size={32} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === IMAGEN LATERAL === */}
      <motion.div 
        layout 
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        className={`hidden lg:flex w-1/2 relative overflow-hidden ${activeTab === 'staff' ? 'bg-slate-900' : 'bg-orange-900'}`}
      >
        <motion.img 
          key={activeTab} 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.5 }}
          src={bgImage} 
          alt="Fondo" 
          className="absolute inset-0 w-full h-full object-cover" 
        />
        
        <div className="relative z-10 p-16 flex flex-col justify-between h-full text-white w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/20`}>
                {activeTab === 'staff' ? <Briefcase size={32} /> : <HardHat size={32} />}
            </div>
            <h1 className="text-5xl font-extrabold mb-4 leading-tight">
              {activeTab === 'staff' ? 'Gestión Corporativa' : 'Portal del Obrero'}
            </h1>
            <p className="text-xl text-slate-200 max-w-md font-light">
              {activeTab === 'staff' 
                ? 'Plataforma administrativa integral para el control de obras y personal.' 
                : 'Accede a tus boletas, marca tu asistencia y revisa tu historial.'}
            </p>
          </motion.div>

          <div className="text-sm text-slate-400 font-medium">
            © {new Date().getFullYear()} Constructora L & K S.A.C.
          </div>
        </div>
      </motion.div>

      {/* === FORMULARIO === */}
      <motion.div 
        layout 
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 relative"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:hidden"></div>

        <div className="w-full max-w-md bg-white p-10 rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-white">
          
          <div className="text-center mb-10">
            <motion.img 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              src={logoLyk} 
              alt="Logo" 
              className="h-20 mx-auto mb-6 drop-shadow-sm" 
            />
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Bienvenido</h2>
            <p className="text-slate-400 mt-2">Selecciona tu perfil para ingresar</p>
          </div>

          {/* TABS */}
          <div className="bg-slate-100 p-1.5 rounded-2xl mb-8 relative flex">
            <motion.div 
              className="absolute top-1.5 bottom-1.5 rounded-xl bg-white shadow-sm"
              layoutId="activeTabBackground"
              initial={false}
              animate={{ 
                left: activeTab === 'staff' ? '0.375rem' : '50%', 
                width: 'calc(50% - 0.375rem)' 
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            <button
              type="button"
              onClick={() => { setActiveTab('staff'); setError(''); setFormData({identifier:'', password:''}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl relative z-10 transition-colors ${
                activeTab === 'staff' ? 'text-[#003366]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Briefcase size={18} /> Administrativos
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('obrero'); setError(''); setFormData({identifier:'', password:''}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl relative z-10 transition-colors ${
                activeTab === 'obrero' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <HardHat size={18} /> Obreros
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={activeTab} 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    <div>
                        <label htmlFor="identifier" className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                            {activeTab === 'staff' ? 'DNI o Correo Corporativo' : 'Documento de Identidad (DNI)'}
                        </label>
                        <input
                            id="identifier"
                            name={activeTab === 'staff' ? 'email' : 'username'} 
                            autoComplete="username"
                            type="text"
                            value={formData.identifier}
                            onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                            className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold placeholder:font-normal outline-none transition-all ${themeBorder} focus:ring-4 ${themeRing}`}
                            placeholder={activeTab === 'staff' ? 'Ej: 12345678 o admin@lyk.com' : 'Ingresa tu DNI'}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Contraseña</label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold outline-none transition-all ${themeBorder} focus:ring-4 ${themeRing}`}
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl text-center border border-red-100 flex items-center justify-center gap-2"
                >
                    <span>⚠️</span> {error}
                </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || loginSuccess}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-xl transition-all flex justify-center items-center gap-2 text-base mt-2
                ${themeColor} ${themeHover} shadow-${activeTab === 'staff' ? 'blue' : 'orange'}-900/20
                ${(loading || loginSuccess) ? 'opacity-70 cursor-not-allowed' : ''}
              `}
            >
              {loading ? <Loader2 className="animate-spin" /> : (activeTab === 'staff' ? 'Iniciar Sesión' : 'Acceder al Portal')}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;