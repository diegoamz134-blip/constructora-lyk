import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, User, HardHat, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; 
import fondoLogin from '../../assets/images/fondo-login.jpg';
import logoFull from '../../assets/images/logo-lk-full.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWorker } = useWorkerAuth();
  
  const [userType, setUserType] = useState('admin'); 
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (userType === 'admin') {
        const { data, error: rpcError } = await supabase.rpc('login_admin_secure', { 
          email_input: formData.identifier, 
          password_input: formData.password 
        });

        if (rpcError) throw rpcError;

        if (data) {
          const sessionData = {
            user: data,
            token: 'secure-session-token', 
            role: data.role || 'staff'
          };
          localStorage.setItem('lyk_admin_session', JSON.stringify(sessionData));
          
          // --- REDIRECCIÓN INTELIGENTE ---
          switch (data.role) {
            case 'admin':
              navigate('/dashboard');
              break;
            case 'resident_engineer':
              navigate('/campo/tareo'); // RESIDENTE VA DIRECTO A CAMPO
              break;
            case 'rrhh':
              navigate('/users');
              break;
            default:
              navigate('/dashboard');
          }
        } else {
          setError('Credenciales incorrectas o usuario no encontrado');
        }

      } else {
        const { success, error: workerError } = await loginWorker(formData.identifier, formData.password);
        if (success) {
          navigate('/worker/dashboard');
        } else {
          setError(workerError || 'Error al iniciar sesión');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Error de conexión o credenciales inválidas.');
    } finally {
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
        <div className="bg-white p-8 pb-0 flex justify-center">
          <img src={logoFull} alt="L&K Logo" className="h-16 object-contain" />
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Bienvenido</h2>
            <p className="text-slate-500 text-sm mt-1">Sistema de Gestión Integral</p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-8 relative">
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
              <User size={18} /> Administrativo
            </button>
            <button
              type="button"
              onClick={() => { setUserType('worker'); setError(''); setFormData({identifier:'', password:''}); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors ${userType === 'worker' ? 'text-[#f0c419]' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <HardHat size={18} /> Obrero
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
              disabled={loading}
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
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">© 2025 Constructora L&K. Todos los derechos reservados.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;