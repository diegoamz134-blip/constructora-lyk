import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, RefreshCw, LogIn, LogOut, ArrowLeft, 
  MapPin, AlertTriangle, Lock 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { compressImage } from '../../utils/imageCompressor';
import logoFull from '../../assets/images/logo-lk-full.png';

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
  const contextData = useOutletContext();
  const workerFromContext = contextData ? contextData.worker : null;
  const navigate = useNavigate();

  const [step, setStep] = useState(workerFromContext ? 'confirm' : 'search'); 
  const [worker, setWorker] = useState(workerFromContext);
  
  const [attendanceToday, setAttendanceToday] = useState(null); 
  const [projectLocation, setProjectLocation] = useState(null); // Coordenadas del proyecto
  const [actionType, setActionType] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceToProject, setDistanceToProject] = useState(null);
  const [isOutOfRange, setIsOutOfRange] = useState(false);
  
  const [photoBlob, setPhotoBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 1. Cargar Datos Iniciales (Asistencia y Proyecto)
  useEffect(() => {
    if (worker) {
      checkAttendanceStatus(worker.id);
      loadProjectCoordinates(worker.project_assigned);
    }
  }, [worker]);

  const checkAttendanceStatus = async (workerId) => {
    setLoading(true);
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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectCoordinates = async (projectName) => {
    if (!projectName) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('latitude, longitude')
        .eq('name', projectName) // Asegúrate que el nombre coincida o usa ID
        .maybeSingle();
      
      if (!error && data) {
        setProjectLocation(data);
      }
    } catch (err) {
      console.error("Error cargando ubicación proyecto:", err);
    }
  };

  // 2. Iniciar Proceso con Validación GPS
  const startProcess = async (type) => {
    // BLOQUEO: Si ya está validado por supervisor, no permitir cambios
    if (attendanceToday?.validation_status === 'VALIDADO') {
      alert("🔒 El supervisor ya cerró y validó tu asistencia de hoy. No puedes realizar más cambios.");
      return;
    }

    setActionType(type);
    setLoading(true);
    setErrorMsg('');
    setIsOutOfRange(false);

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
           
           // Rango permitido: 500 metros
           if (dist > 500) {
             setIsOutOfRange(true);
             const continuar = window.confirm(
               `⚠️ ESTÁS LEJOS DE LA OBRA\n\nDistancia detectada: ${Math.round(dist)} metros.\n\nSe registrará una observación automática.\n¿Deseas continuar de todas formas?`
             );
             if (!continuar) {
               setLoading(false);
               return; // Cancela el proceso
             }
           }
        }
        // -------------------------

        setStep('camera');
        startCamera();
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setErrorMsg('⚠️ Debes permitir el acceso a tu ubicación para marcar asistencia.');
      },
      { enableHighAccuracy: true }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
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
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
        try {
          const compressed = await compressImage(file);
          setPhotoBlob(compressed);
          const stream = video.srcObject;
          if (stream) stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          console.error("Error al procesar imagen", e);
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
      
      // 2. Preparar Observación Automática si está lejos
      let autoObservation = '';
      if (isOutOfRange) {
        autoObservation = `⚠️ FUERA DE RANGO (${distanceToProject}m). `;
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
            observation: autoObservation // Agregamos la observación automática
          }]);
        if (insertError) throw insertError;
      } else {
        if (!attendanceToday) throw new Error("No hay registro de entrada.");
        
        // Concatenar observación si ya existía alguna
        const newObs = (attendanceToday.observation || '') + (autoObservation ? ` | Salida: ${autoObservation}` : '');

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

  const goBackToDashboard = () => {
    navigate('/worker/dashboard');
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-[#003366] rounded-b-[4rem] z-0"></div>
      
      <div className="absolute top-12 z-10 w-full flex justify-center">
         <img src={logoFull} alt="L&K" className="h-20 brightness-0 invert opacity-90 drop-shadow-sm" />
      </div>

      <AnimatePresence mode="wait">
        
        {/* PASO 1: DASHBOARD DE ACCIÓN */}
        {step === 'confirm' && worker && (
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
              
              <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-[#003366] text-xs font-bold rounded-full border border-blue-100">
                Obra: {worker.project_assigned || 'Sin Asignar'}
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
                  className="w-full py-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center gap-3 hover:bg-emerald-100 active:scale-95 transition-all group"
                >
                  <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                    <LogIn size={26} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-emerald-800 text-sm tracking-wide">MARCAR ENTRADA</span>
                </button>
              ) : !attendanceToday.check_out_time ? (
                <button 
                  onClick={() => startProcess('CHECK_OUT')} 
                  // Si ya está validado, deshabilitamos visualmente (la lógica igual protege)
                  disabled={attendanceToday?.validation_status === 'VALIDADO'}
                  className={`w-full py-6 rounded-3xl border flex flex-col items-center gap-3 transition-all group
                    ${attendanceToday?.validation_status === 'VALIDADO' 
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed grayscale' 
                        : 'bg-orange-50 border-orange-100 hover:bg-orange-100 active:scale-95'
                    }`}
                >
                  <div className="p-3 bg-white rounded-full text-orange-600 shadow-sm">
                    <LogOut size={26} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold text-orange-800 text-sm tracking-wide">MARCAR SALIDA</span>
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
            
            {loading && (
              <div className="mt-8 flex justify-center text-slate-400">
                <RefreshCw className="animate-spin" size={24} />
              </div>
            )}

            {errorMsg && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold text-center">
                {errorMsg}
              </div>
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
            className="w-full max-w-sm bg-black h-[65vh] rounded-[2.5rem] overflow-hidden relative flex flex-col z-20 shadow-xl"
          >
            {/* Indicador de Ubicación / Advertencia */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-center pointer-events-none">
                {isOutOfRange ? (
                    <div className="bg-red-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm animate-pulse">
                        <AlertTriangle size={14} /> Distancia: {distanceToProject}m (Lejos)
                    </div>
                ) : distanceToProject ? (
                    <div className="bg-green-500/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
                        <MapPin size={14} /> En obra ({distanceToProject}m)
                    </div>
                ) : null}
            </div>

            {!photoBlob ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-72 border-2 border-white/30 rounded-[2rem]"></div>
                </div>
                
                <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center pb-12 bg-gradient-to-t from-black/80 to-transparent">
                  <button 
                    onClick={takePhoto} 
                    className="w-20 h-20 rounded-full border-[6px] border-white/30 bg-white active:scale-90 transition-transform"
                  ></button>
                </div>
                
                <button 
                  onClick={() => {
                      setStep('confirm');
                      if (videoRef.current?.srcObject) {
                          videoRef.current.srcObject.getTracks().forEach(t => t.stop());
                      }
                  }} 
                  className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md z-20"
                >
                  <ArrowLeft size={24} />
                </button>
              </>
            ) : (
              <div className="flex flex-col h-full bg-slate-900">
                <img src={URL.createObjectURL(photoBlob)} className="flex-1 object-cover" alt="Preview" />
                <div className="p-6 bg-white flex gap-4">
                  <button 
                    onClick={() => setPhotoBlob(null)} 
                    className="flex-1 py-4 text-slate-600 font-bold bg-slate-100 rounded-2xl text-sm"
                  >
                    Repetir
                  </button>
                  <button 
                    onClick={submitAttendance} 
                    disabled={loading} 
                    className={`flex-1 py-4 text-white rounded-2xl font-bold text-sm flex justify-center items-center shadow-lg active:scale-95 transition-transform
                        ${isOutOfRange ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#003366]'}`}
                  >
                     {loading ? <RefreshCw className="animate-spin" size={20} /> : (isOutOfRange ? 'Enviar con Obs.' : 'Confirmar')}
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
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isOutOfRange ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
              {isOutOfRange ? <AlertTriangle size={40} strokeWidth={3} /> : <CheckCircle size={40} strokeWidth={3} />}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">{isOutOfRange ? 'Registrado con Alerta' : '¡Registrado!'}</h2>
            <p className="text-slate-500 text-sm mt-2 mb-8">
              {isOutOfRange 
                ? 'Tu asistencia se guardó, pero se notificó que estabas fuera del rango permitido.' 
                : 'Tu asistencia se ha guardado correctamente.'}
            </p>
            
            <button 
              onClick={goBackToDashboard} 
              className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-transform"
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