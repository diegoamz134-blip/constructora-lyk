import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

import logoFull from '../../assets/images/logo-lk-full.png';
import bgImage from '../../assets/images/fondo-login.jpg';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleSubmit = async (e) => {
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
      }, 3000);

    } catch (error) {
      setErrorMsg('Credenciales incorrectas. Verifique sus datos.');
      setLoading(false);
    }
  };

  return (
    // Contenedor principal que ocupa TODA la pantalla (h-screen, w-full, sin padding externo)
    <div className="h-screen w-full flex overflow-hidden bg-white relative font-sans">
      
      {/* ========================================================= */}
      {/* PANTALLA DE BIENVENIDA (Capa superior de transición)      */}
      {/* ========================================================= */}
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center 
                       bg-lk-darkblue
                       transition-all duration-700 ease-in-out
                       ${showWelcome ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-lk-blue/40 via-lk-darkblue to-lk-darkblue"></div>
        
        <div className="relative z-10 flex flex-col items-center transform transition-all duration-700">
          <img src={logoFull} alt="L&K Logo" className="h-32 object-contain mb-8 drop-shadow-2xl animate-fade-in-up" />
          <h2 className="text-5xl font-extrabold mb-4 tracking-tight animate-fade-in-up delay-100 text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-lk-accent">
            ¡Bienvenido!
          </h2>
          <p className="text-xl text-blue-200 font-medium tracking-wide animate-fade-in-up delay-200">
            Preparando su entorno...
          </p>
          <div className="mt-10 relative animate-fade-in-up delay-300">
            <div className="w-16 h-16 rounded-full absolute border-4 border-solid border-lk-blue/30"></div>
            <div className="w-16 h-16 rounded-full animate-spin absolute border-4 border-solid border-transparent border-t-lk-accent border-l-lk-blue"></div>
          </div>
        </div>
      </div>


      {/* ========================================================= */}
      {/* DISEÑO DE PANTALLA DIVIDIDA CURVEADA (Split-Screen Curved)*/}
      {/* ========================================================= */}
      
      {/* --- LADO IZQUIERDO: Imagen y Branding --- */}
      {/* Le damos un ancho del 60% (w-[60%]) para que tenga espacio para el efecto curveado */}
      <div className={`hidden md:block md:w-[60%] relative h-full overflow-hidden transition-all duration-500 ${showWelcome ? 'scale-110' : 'scale-100'}`}>
        {/* Imagen de fondo animada */}
        <img 
          src={bgImage} 
          alt="Construcción L&K" 
          className="absolute inset-0 w-full h-full object-cover animate-slow-pan scale-110"
        />
        {/* Overlays de color para la marca */}
        <div className="absolute inset-0 bg-gradient-to-tr from-lk-darkblue via-lk-darkblue/80 to-lk-blue/50 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-lk-darkblue via-transparent to-transparent opacity-70"></div>
        
        {/* Texto sobre la imagen */}
        <div className="absolute bottom-0 left-0 p-12 lg:p-20 z-10">
          <img src={logoFull} alt="L&K" className="h-20 mb-8 drop-shadow-lg brightness-0 invert" />
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight">
            Construimos el futuro, <span className="text-lk-accent">hoy.</span>
          </h1>
          <p className="text-blue-100 text-xl max-w-lg leading-relaxed opacity-90">
            Liderando proyectos de inversión y construcción con innovación, calidad y compromiso en cada detalle.
          </p>
        </div>
      </div>

      {/* --- LADO DERECHO: Formulario de Login (El lado curveado) --- */}
      {/* CLAVES DEL EFECTO CURVEADO:
          1. relative z-10: Para estar por encima de la imagen.
          2. bg-white: El fondo blanco sólido.
          3. md:w-[45%]: Ancho del panel derecho.
          4. md:rounded-l-[5rem]: Crea la gran curva redondeada a la izquierda.
          5. md:-ml-24: Margen negativo para "jalar" este panel hacia la izquierda sobre la imagen.
          6. shadow-2xl: Sombra intensa para dar profundidad a la curva.
      */}
      <div className={`w-full md:w-[45%] h-full bg-white flex items-center justify-center p-8 md:p-12 lg:p-20 
                       relative z-10 md:rounded-l-[5rem] md:-ml-24 shadow-2xl
                       transition-all duration-500 ${showWelcome ? 'opacity-0 translate-x-20' : 'opacity-100 translate-x-0'}`}>
        
        <div className="w-full max-w-md">
           {/* Encabezado del formulario */}
          <div className="text-center mb-12">
            <img src={logoFull} alt="L&K Logo" className="h-24 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">¡Hola de nuevo!</h2>
            <p className="text-gray-500 mt-3 text-lg">Ingresa tus credenciales para acceder.</p>
          </div>

          {errorMsg && (
            <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm animate-shake">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Input Email */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 pl-1 uppercase tracking-wider">Correo electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-lk-blue transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" /><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" /></svg>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-14 pr-4 py-5 rounded-2xl border-2 border-gray-100 
                             bg-gray-50 text-gray-900 placeholder-gray-400 font-medium text-lg
                             focus:ring-0 focus:border-lk-blue focus:bg-white
                             transition-all duration-300"
                  placeholder="ejemplo@lyk.com"
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="group">
              <label className="block text-sm font-bold text-gray-700 mb-2 pl-1 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                 <span className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-lk-blue transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" /></svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-14 pr-14 py-5 rounded-2xl border-2 border-gray-100 
                             bg-gray-50 text-gray-900 placeholder-gray-400 font-medium text-lg
                             focus:ring-0 focus:border-lk-blue focus:bg-white
                             transition-all duration-300"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-lk-blue transition"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z" /><path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12 3.75s9.189 3.226 10.677 7.697a.75.75 0 010 .506C21.189 16.524 16.972 19.75 12 19.75s-9.189-3.226-10.677-7.697a.75.75 0 010-.506zM12 18.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" /><path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" /><path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.113 1.489 4.467 5.705 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm font-medium">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" className="h-5 w-5 text-lk-blue focus:ring-lk-blue border-gray-300 rounded cursor-pointer transition-all checked:bg-lk-blue"/>
                <span className="ml-3 block text-gray-600 group-hover:text-lk-blue transition">Recordar sesión</span>
              </label>
              <a href="#" className="text-lk-blue hover:text-lk-darkblue transition hover:underline">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center py-5 px-6 rounded-2xl shadow-xl
                         text-lg font-bold text-white tracking-wider uppercase
                         bg-gradient-to-r from-lk-darkblue to-lk-blue
                         hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lk-blue 
                         transition-all duration-300 transform
                         ${loading ? 'opacity-80 cursor-wait' : ''}`}
            >
              {loading && !showWelcome ? (
                <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {loading && !showWelcome ? 'Iniciando sesión...' : 'INGRESAR'}
            </button>
          </form>
           <p className="text-center text-sm text-gray-400 mt-12">
            © 2024 L&K Constructora e Inversiones.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;