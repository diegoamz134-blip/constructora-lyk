import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, RefreshCw, LogIn, LogOut, ArrowLeft, 
  MapPin, AlertTriangle, Lock, Loader2, Camera
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { compressImage } from '../../utils/imageCompressor';
import logoFull from '../../assets/images/logo-lk-full.png';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; // <--- IMPORTACIÓN CLAVE

// --- UTILIDAD: Cálculo de distancia (Fórmula Haversine) ---
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Radio de la tierra en metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Retorna distancia en metros
};

const WorkerAttendance = () => {
  // 1. Usamos el contexto global del obrero (Solución al error de pantalla blanca)
  const { worker, loading: authLoading } = useWorkerAuth();
  const navigate = useNavigate();

  // Estados de flujo
  const [step, setStep] = useState('confirm'); // 'confirm' | 'camera' | 'success'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de datos
  const [attendanceToday, setAttendanceToday] = useState(null); 
  const [projectLocation, setProjectLocation] = useState(null); 
  const [actionType, setActionType] = useState(null); // 'CHECK_IN' | 'CHECK_OUT'
  
  // Estados de GPS
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceToProject, setDistanceToProject] = useState(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  
  // Estados de Cámara
  const [photoBlob, setPhotoBlob] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); // Referencia para limpiar la cámara correctamente

  // 2. Cargar Datos Iniciales al montar o al tener el worker
  useEffect(() => {
    if (worker) {
      checkAttendanceStatus(worker.id);
      loadProjectCoordinates(worker.project_assigned);
    }
  }, [worker]);

  // Limpieza de cámara al desmontar
  useEffect(() => {
    return () => stopCameraStream();
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const checkAttendanceStatus = async (workerId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', workerId)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setAttendanceToday(data);
    } catch (err) {
      console.error("Error verificando asistencia:", err);
    }
  };

  const loadProjectCoordinates = async (projectName) => {
    if (!projectName) return;
    try {
      const { data } = await supabase
        .from('projects')
        .select('latitude, longitude')
        .eq('name', projectName)
        .maybeSingle();
      
      if (data) setProjectLocation(data);
    } catch (err) {
      console.error("Error cargando ubicación proyecto:", err);
    }
  };

  // 3. Iniciar Proceso: Validar GPS antes de abrir cámara
  const startProcess = async (type) => {
    // BLOQUEO: Si ya está validado por supervisor
    if (attendanceToday?.validation_status === 'VALIDADO') {
      alert("🔒 El supervisor ya cerró y validó tu asistencia de hoy. No puedes realizar más cambios.");
      return;
    }

    setActionType(type);
    setLoading(true);
    setErrorMsg('');
    setIsOutOfRange(false);
    setDistanceToProject(null);

    if (!navigator.geolocation) {
      setErrorMsg('Tu dispositivo no soporta geolocalización.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const locString = `${lat},${lng}`;
        
        setCurrentLocation(locString);
        
        // --- LOGICA GEOFENCING ---
        if (projectLocation?.latitude && projectLocation?.longitude) {
           const dist = calculateDistance(lat, lng, projectLocation.latitude, projectLocation.longitude);
           setDistanceToProject(Math.round(dist));
           
           // Rango permitido: 500 metros (ajustable)
           if (dist > 500) {
             setIsOutOfRange(true);
             // No bloqueamos, pero advertimos
           }
        }
        // -------------------------

        setStep('camera');
        startCamera();
        setLoading(false);
      },
      (error) => {
        console.error("Error GPS:", error);
        setLoading(false);
        setErrorMsg('⚠️ Debes permitir el acceso a tu ubicación para marcar asistencia. Revisa la configuración de tu navegador.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startCamera = async () => {
    try {
      stopCameraStream(); // Asegurarse de limpiar anteriores
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error Cámara:", err);
      setErrorMsg('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Efecto espejo opcional: context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
        try {
          const compressed = await compressImage(file);
          setPhotoBlob(compressed);
          stopCameraStream(); // Detener video al tomar la foto
        } catch (e) {
          console.error("Error procesando imagen", e);
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const submitAttendance = async () => {
    if (!photoBlob || !currentLocation || !worker) return;
    setLoading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${worker.document_number}_${actionType}_${timestamp}.jpg`;
      
      // 1. Subir Foto
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      const now = new Date().toISOString(); 
      
      // 2. Preparar Observación
      let observationText = '';
      if (isOutOfRange) {
        observationText = `⚠️ FUERA DE RANGO (${distanceToProject}m). `;
      }

      // 3. Guardar en BD
      if (actionType === 'CHECK_IN') {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            worker_id: worker.id,
            date: new Date().toISOString().split('T')[0],
            check_in_time: now,
            check_in_photo: publicUrl,
            check_in_location: currentLocation,
            project_name: worker.project_assigned,
            observation: observationText
          }]);
        if (insertError) throw insertError;
      } else {
        if (!attendanceToday) throw new Error("No hay registro de entrada previo.");
        
        // Concatenar observación
        const existingObs = attendanceToday.observation || '';
        const newObs = existingObs + (observationText ? ` | Salida: ${observationText}` : '');

        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: now,
            check_out_photo: publicUrl,
            check_out_location: currentLocation,
            observation: newObs
          })
          .eq('id', attendanceToday.id);
        if (updateError) throw updateError;
      }
      setStep('success');
    } catch (error) {
      console.error(error);
      setErrorMsg('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const retryPhoto = () => {
    setPhotoBlob(null);
    startCamera();
  };

  const goBackToDashboard = () => {
    navigate('/worker/dashboard');
  };

  // --- RENDERIZADO ---
  
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
        <AlertTriangle size={48} className="text-red-500 mb-4"/>
        <h2 className="text-xl font-bold text-slate-800">Sesión no encontrada</h2>
        <p className="text-slate-500 mb-6">Por favor, vuelve a ingresar al sistema.</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-[#003366] text-white rounded-xl font-bold">Ir al Login</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Fondo Decorativo */}
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-[#003366] rounded-b-[4rem] z-0"></div>
      
      <div className="absolute top-12 z-10 w-full flex justify-center">
         <img src={logoFull} alt="L&K" className="h-20 brightness-0 invert opacity-90 drop-shadow-sm" />
      </div>

      <AnimatePresence mode="wait">
        
        {/* PASO 1: SELECCIÓN DE ACCIÓN */}
        {step === 'confirm' && (
          <motion.div 
            key="confirm"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] relative z-10 mt-20 shadow-xl"
          >
            <button 
              onClick={goBackToDashboard} 
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-[#003366] bg-slate-50 hover:bg-slate-100 rounded-full transition-all"
            >
               <ArrowLeft size={20} />
            </button>

            <div className="text-center mt-6">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Registro Diario</h2>
              <p className="text-slate-500 text-sm mt-1">Selecciona tu acción para hoy</p>
              
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#003366] text-xs font-bold rounded-full border border-blue-100">
                <MapPin size={12}/> Obra: {worker.project_assigned || 'Sin Asignar'}
              </div>
            </div>

            {/* AVISO DE VALIDACIÓN */}
            {attendanceToday?.validation_status === 'VALIDADO' && (
               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-800 text-xs font-bold">
                  <Lock size={16} />
                  <span>Día cerrado y validado por supervisión.</span>
               </div>
            )}

            <div className="mt-6 space-y-5">
              {!attendanceToday ? (
                <button 
                  onClick={() => startProcess('CHECK_IN')} 
                  disabled={loading}
                  className="w-full py-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center gap-3 hover:bg-emerald-100 active:scale-95 transition-all group disabled:opacity-50"
                >
                  <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <LogIn size={26} strokeWidth={2.5} />}
                  </div>
                  <span className="font-bold text-emerald-800 text-sm tracking-wide">
                    {loading ? 'BUSCANDO GPS...' : 'MARCAR ENTRADA'}
                  </span>
                </button>
              ) : !attendanceToday.check_out_time ? (
                <button 
                  onClick={() => startProcess('CHECK_OUT')} 
                  disabled={attendanceToday?.validation_status === 'VALIDADO' || loading}
                  className={`w-full py-6 rounded-3xl border flex flex-col items-center gap-3 transition-all group disabled:opacity-50
                    ${attendanceToday?.validation_status === 'VALIDADO' 
                        ? 'bg-slate-50 border-slate-200 cursor-not-allowed grayscale' 
                        : 'bg-orange-50 border-orange-100 hover:bg-orange-100 active:scale-95'
                    }`}
                >
                  <div className="p-3 bg-white rounded-full text-orange-600 shadow-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <LogOut size={26} strokeWidth={2.5} />}
                  </div>
                  <span className="font-bold text-orange-800 text-sm tracking-wide">
                    {loading ? 'BUSCANDO GPS...' : 'MARCAR SALIDA'}
                  </span>
                </button>
              ) : (
                <div className="py-10 bg-blue-50 rounded-3xl border border-blue-100 text-blue-800 flex flex-col items-center gap-3 text-center">
                  <div className="p-3 bg-white rounded-full shadow-sm text-blue-600">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">¡Jornada Completa!</h3>
                    <p className="text-xs text-blue-600/70 mt-1">Has registrado entrada y salida.</p>
                  </div>
                </div>
              )}
            </div>
            
            {errorMsg && (
              <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center border border-red-100 flex items-center justify-center gap-2">
                <AlertTriangle size={16} className="shrink-0"/>
                {errorMsg}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* PASO 2: CÁMARA */}
        {step === 'camera' && (
          <motion.div 
            key="camera"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-black h-[70vh] rounded-[2.5rem] overflow-hidden relative flex flex-col z-20 shadow-2xl"
          >
            {/* Cabecera de Estado GPS */}
            <div className="absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
                {isOutOfRange ? (
                    <div className="bg-red-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm animate-pulse shadow-lg">
                        <AlertTriangle size={14} /> Distancia: {distanceToProject}m (Lejos de obra)
                    </div>
                ) : distanceToProject ? (
                    <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg">
                        <MapPin size={14} /> En obra ({distanceToProject}m)
                    </div>
                ) : (
                   <div className="bg-slate-700/50 text-white px-3 py-1 rounded-full text-[10px] backdrop-blur-sm">
                      GPS Detectado
                   </div>
                )}
            </div>

            {!photoBlob ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Guía visual para la foto */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none border-[12px] border-black/30">
                  <div className="w-64 h-80 border-2 border-white/50 rounded-[2rem] relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                  </div>
                </div>
                
                {/* Controles de Cámara */}
                <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center pb-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <button 
                    onClick={takePhoto} 
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-95 transition-transform flex items-center justify-center"
                  >
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                      setStep('confirm');
                      stopCameraStream();
                  }} 
                  className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md z-40 hover:bg-black/60 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
              </>
            ) : (
              <div className="flex flex-col h-full bg-slate-900 relative">
                <img src={URL.createObjectURL(photoBlob)} className="flex-1 object-cover" alt="Preview" />
                
                {isOutOfRange && (
                    <div className="absolute bottom-28 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl text-xs text-center font-bold backdrop-blur-md">
                       ⚠️ Advertencia: Estás marcando fuera del rango permitido. Esto generará una observación.
                    </div>
                )}

                <div className="p-6 bg-white rounded-t-[2rem] flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                  <button 
                    onClick={retryPhoto} 
                    className="flex-1 py-4 text-slate-600 font-bold bg-slate-100 rounded-2xl text-sm hover:bg-slate-200 transition-colors"
                  >
                    Repetir Foto
                  </button>
                  <button 
                    onClick={submitAttendance} 
                    disabled={loading} 
                    className={`flex-1 py-4 text-white rounded-2xl font-bold text-sm flex justify-center items-center shadow-lg active:scale-95 transition-transform gap-2
                        ${isOutOfRange ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#003366] hover:bg-blue-900'}`}
                  >
                     {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20}/> {isOutOfRange ? 'Enviar (Obs)' : 'Confirmar'}</>}
                  </button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}

        {/* PASO 3: ÉXITO */}
        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white p-10 rounded-[2.5rem] text-center relative z-20 mt-20 shadow-xl"
          >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isOutOfRange ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
              {isOutOfRange ? <AlertTriangle size={48} strokeWidth={2} /> : <CheckCircle size={48} strokeWidth={2} />}
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800 mb-2">{isOutOfRange ? 'Registrado' : '¡Excelente!'}</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {isOutOfRange 
                ? 'Tu asistencia se guardó con una observación de distancia.' 
                : 'Tu asistencia ha sido registrada exitosamente en el sistema.'}
            </p>
            
            <button 
              onClick={goBackToDashboard} 
              className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform"
            >
              Volver al Inicio
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default WorkerAttendance;