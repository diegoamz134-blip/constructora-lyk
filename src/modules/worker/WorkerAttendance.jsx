import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, RefreshCw, LogIn, LogOut, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../services/supabase'; //
import { compressImage } from '../../utils/imageCompressor'; //
import logoFull from '../../assets/images/logo-lk-full.png'; //

const WorkerAttendance = () => {
  const contextData = useOutletContext();
  const workerFromContext = contextData ? contextData.worker : null;
  const navigate = useNavigate();

  const [step, setStep] = useState(workerFromContext ? 'confirm' : 'search'); 
  const [worker, setWorker] = useState(workerFromContext);
  
  const [attendanceToday, setAttendanceToday] = useState(null); 
  const [actionType, setActionType] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (worker) {
      checkAttendanceStatus(worker.id);
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

  const startProcess = async (type) => {
    setActionType(type);
    setLoading(true);
    setErrorMsg('');

    if (!navigator.geolocation) {
      setErrorMsg('Tu dispositivo no soporta geolocalización.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(`${position.coords.latitude},${position.coords.longitude}`);
        setStep('camera');
        startCamera();
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setErrorMsg('⚠️ Debes permitir el acceso a tu ubicación.');
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
          // Comprimimos la foto antes de guardarla en el estado
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
    if (!photoBlob || !location || !worker) return;
    setLoading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${worker.document_number}_${actionType}_${timestamp}.jpg`;
      
      // 1. Subir Foto Comprimida
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      const now = new Date().toISOString(); 

      // 2. Guardar registro en BD (Incluyendo el nombre del proyecto)
      if (actionType === 'CHECK_IN') {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            worker_id: worker.id,
            date: new Date().toISOString().split('T')[0],
            check_in_time: now,
            check_in_photo: publicUrl,
            check_in_location: location,
            project_name: worker.project_assigned // [IMPORTANTE] Guardamos el proyecto actual
          }]);
        if (insertError) throw insertError;
      } else {
        if (!attendanceToday) throw new Error("No hay registro de entrada.");
        // Al marcar salida, solo actualizamos hora y foto de salida
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            check_out_time: now,
            check_out_photo: publicUrl,
            check_out_location: location
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Fondo Azul Curvo Superior */}
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-[#003366] rounded-b-[4rem] z-0"></div>
      
      {/* Logo Header */}
      <div className="absolute top-12 z-10 w-full flex justify-center">
         <img src={logoFull} alt="L&K" className="h-20 brightness-0 invert opacity-90 drop-shadow-sm" />
      </div>

      <AnimatePresence mode="wait">
        
        {/* PASO 1: CONFIRMACIÓN Y SELECCIÓN DE ACCIÓN */}
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
              {/* Mostramos el proyecto actual para confirmación visual */}
              <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-[#003366] text-xs font-bold rounded-full border border-blue-100">
                Obra: {worker.project_assigned || 'Sin Asignar'}
              </div>
            </div>

            <div className="mt-8 space-y-5">
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
                  className="w-full py-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col items-center gap-3 hover:bg-orange-100 active:scale-95 transition-all group"
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
                  className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md"
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
                    className="flex-1 py-4 bg-[#003366] text-white rounded-2xl font-bold text-sm flex justify-center items-center shadow-lg active:scale-95 transition-transform"
                  >
                     {loading ? <RefreshCw className="animate-spin" size={20} /> : 'Confirmar'}
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
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
              <CheckCircle size={40} strokeWidth={3} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800">¡Registrado!</h2>
            <p className="text-slate-500 text-sm mt-2 mb-8">
              Tu asistencia se ha guardado correctamente.
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