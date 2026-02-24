import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, LogIn, LogOut, ArrowLeft, 
  MapPin, AlertTriangle, Lock, Loader2, Clock, Upload, Camera 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { compressImage } from '../../utils/imageCompressor';
import logoFull from '../../assets/images/logo-lk-full.png';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; 

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

// Límite de distancia permitido
const MAX_DISTANCE_METERS = 200; 

const WorkerAttendance = () => {
  const { worker, loading: authLoading } = useWorkerAuth();
  const navigate = useNavigate();

  // Estados de flujo
  const [step, setStep] = useState('confirm'); // 'confirm' | 'camera' | 'justification' | 'evidence_camera' | 'success'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Estados de datos
  const [attendanceToday, setAttendanceToday] = useState(null); 
  const [projectLocation, setProjectLocation] = useState(null); 
  const [actionType, setActionType] = useState(null); // 'CHECK_IN' | 'CHECK_OUT'
  
  // Estados de GPS y Validación
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distanceToProject, setDistanceToProject] = useState(null);
  const [isLocationValid, setIsLocationValid] = useState(true);
  const [isTimeValid, setIsTimeValid] = useState(true);
  
  // Estados de Justificación y Evidencia
  const [justificationText, setJustificationText] = useState('');
  const [lateReasonType, setLateReasonType] = useState('HORA_EXTRA'); // Para salidas
  const [lateCheckInType, setLateCheckInType] = useState('JUSTIFICADA'); // Para ingresos
  const [evidenceBlob, setEvidenceBlob] = useState(null); // Estado para la foto de evidencia
  
  // Estados de Cámara
  const [photoBlob, setPhotoBlob] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null); 

  useEffect(() => {
    if (worker) {
      checkAttendanceStatus(worker.id);
      loadProjectCoordinates(worker.project_assigned);
    }
  }, [worker]);

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

  // --- LÓGICA DE TIEMPO (TOLERANCIAS) ---
  const checkTimeTolerance = (type) => {
     const now = new Date();
     const hours = now.getHours();
     const minutes = now.getMinutes();
     
     if (type === 'CHECK_IN') {
         // Tolerancia INGRESO: Hasta las 07:45 AM
         if (hours < 7) return true;
         if (hours === 7 && minutes <= 45) return true;
         return false; 
     } else {
         // Tolerancia SALIDA: Hasta las 17:30 PM
         if (hours < 17) return true;
         if (hours === 17 && minutes <= 30) return true;
         return false; 
     }
  };

  const startProcess = async (type) => {
    if (attendanceToday?.validation_status === 'VALIDADO') {
      alert("🔒 El supervisor ya cerró y validó tu asistencia de hoy. No puedes realizar más cambios.");
      return;
    }

    setActionType(type);
    setLoading(true);
    setErrorMsg('');
    setIsLocationValid(true);
    setIsTimeValid(true);
    setDistanceToProject(null);
    setJustificationText('');
    setLateReasonType('HORA_EXTRA');
    setLateCheckInType('JUSTIFICADA');
    setEvidenceBlob(null);

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
        
        let validLocation = true;
        if (projectLocation?.latitude && projectLocation?.longitude) {
           const dist = calculateDistance(lat, lng, projectLocation.latitude, projectLocation.longitude);
           setDistanceToProject(Math.round(dist));
           validLocation = dist <= MAX_DISTANCE_METERS;
           setIsLocationValid(validLocation);
        }

        let validTime = checkTimeTolerance(type);
        setIsTimeValid(validTime);

        setStep('camera');
        startCamera();
        setLoading(false);
      },
      (error) => {
        console.error("Error GPS:", error);
        setLoading(false);
        setErrorMsg('⚠️ Debes permitir el acceso a tu ubicación para marcar asistencia.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startCamera = async () => {
    try {
      stopCameraStream(); 
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error Cámara:", err);
      setErrorMsg('No se pudo acceder a la cámara frontal. Verifica los permisos.');
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
          stopCameraStream(); 
        } catch (e) {
          console.error("Error procesando imagen", e);
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const startEvidenceCamera = async () => {
    setStep('evidence_camera');
    try {
      stopCameraStream();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.warn("No se pudo acceder a la cámara trasera, intentando la frontal...", err);
      try {
        const streamFront = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, 
            audio: false 
        });
        streamRef.current = streamFront;
        if (videoRef.current) videoRef.current.srcObject = streamFront;
      } catch (fallbackErr) {
        console.error("Error Cámara Evidencia:", fallbackErr);
        setErrorMsg('No se pudo acceder a ninguna cámara.');
      }
    }
  };

  const takeEvidencePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], "evidencia.jpg", { type: "image/jpeg" });
        try {
          const compressed = await compressImage(file);
          setEvidenceBlob(compressed);
          stopCameraStream();
          setStep('justification'); 
        } catch (e) {
          console.error("Error procesando evidencia", e);
        }
      }, 'image/jpeg', 0.6);
    }
  };

  const proceedWithSubmit = async () => {
    if (!worker) {
      alert("Error: Sesión no válida. Recarga la página."); return;
    }
    if (!photoBlob) {
      setErrorMsg("Error: No hay foto procesada. Inténtalo de nuevo."); return;
    }
    if (!currentLocation) {
      alert("⚠️ Error de GPS: Se perdió tu ubicación. Debes volver al inicio.");
      setStep('confirm'); return;
    }

    const requiresJustification = (!isLocationValid || !isTimeValid);

    if (requiresJustification && justificationText.trim() === '') {
        setStep('justification');
        return;
    }

    executeDatabaseSave(requiresJustification);
  };

  const executeDatabaseSave = async (requiresJustification) => {
    setLoading(true);

    try {
      const timestamp = Date.now();
      const docNum = worker.document_number || 'sin_dni';
      const fileName = `${docNum}_${actionType}_${timestamp}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('attendance_photos')
        .upload(fileName, photoBlob, {
           contentType: 'image/jpeg',
           upsert: false
        });

      if (uploadError) {
         if (uploadError.message.includes("Bucket not found")) throw new Error("La carpeta 'attendance_photos' no existe.");
         throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('attendance_photos').getPublicUrl(fileName);

      // Subir Evidencia
      let evidenceUrl = null;
      if (evidenceBlob) {
        const evFileName = `${docNum}_evidence_${timestamp}.jpg`;
        const { error: evUploadError } = await supabase.storage
          .from('attendance_photos')
          .upload(evFileName, evidenceBlob, { contentType: 'image/jpeg', upsert: false });
        
        if (!evUploadError) {
            const { data: { publicUrl: evUrl } } = supabase.storage.from('attendance_photos').getPublicUrl(evFileName);
            evidenceUrl = evUrl;
        }
      }

      const now = new Date(); 
      let finalCheckOutTime = now.toISOString();
      let observationText = '';
      let finalJustificationType = null;
      let finalOvertimeStatus = 'Ninguno';
      let finalApprovalStatus = 'Aprobado';

      // REGLAS
      if (!isLocationValid) {
          observationText += actionType === 'CHECK_IN' ? `[GPS INGRESO: ${distanceToProject}m] ` : `[GPS SALIDA: ${distanceToProject}m] `;
          finalJustificationType = 'UBICACION';
          finalApprovalStatus = 'Pendiente';
      }

      if (!isTimeValid) {
          if (actionType === 'CHECK_IN') {
              if (lateCheckInType === 'JUSTIFICADA') {
                  observationText += `[TARDANZA JUSTIFICADA] `;
                  // Mantenemos UBICACION como principal si ambos fallan, o TARDANZA si solo es tiempo
                  if (!finalJustificationType) finalJustificationType = 'TARDANZA_JUSTIFICADA'; 
                  finalApprovalStatus = 'Pendiente'; 
              } else {
                  observationText += `[TARDANZA INJUSTIFICADA] `;
                  if (!finalJustificationType) finalJustificationType = 'TARDANZA_INJUSTIFICADA'; 
                  // Si no hay problema de GPS, la tardanza injustificada no requiere aprobarse
                  if (isLocationValid) finalApprovalStatus = 'No Aplica'; 
              }
          } 
          else if (actionType === 'CHECK_OUT') {
              if (lateReasonType === 'HORA_EXTRA') {
                  observationText += `[HORAS EXTRAS SOLICITADAS] `;
                  if (!finalJustificationType) finalJustificationType = 'HORA_EXTRA';
                  finalOvertimeStatus = 'Pendiente';
                  finalApprovalStatus = 'Pendiente';
              } else if (lateReasonType === 'OLVIDO') {
                  observationText += `[OLVIDO DE MARCACIÓN] `;
                  if (!finalJustificationType) finalJustificationType = 'OLVIDO';
                  const standardOut = new Date();
                  standardOut.setHours(17, 0, 0, 0);
                  finalCheckOutTime = standardOut.toISOString();
              }
          }
      }

      if (actionType === 'CHECK_IN') {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            worker_id: worker.id,
            date: now.toISOString().split('T')[0],
            check_in_time: now.toISOString(),
            check_in_photo: publicUrl,
            check_in_location: currentLocation,
            project_name: worker.project_assigned,
            observation: observationText,
            is_location_valid: isLocationValid,
            justification_reason: requiresJustification ? justificationText : null,
            justification_type: finalJustificationType,
            approval_status: finalApprovalStatus,
            evidence_photo: evidenceUrl,
            status: !isTimeValid ? 'Tardanza' : 'Presente' 
          }]);
        if (insertError) throw insertError;
      } else {
        if (!attendanceToday) throw new Error("No hay registro de entrada previo.");
        const existingObs = attendanceToday.observation || '';
        const newObs = existingObs + (observationText ? ` | Salida: ${observationText}` : '');

        const updatePayload = {
            check_out_time: finalCheckOutTime,
            check_out_photo: publicUrl,
            check_out_location: currentLocation,
            observation: newObs,
            is_location_valid: isLocationValid,
            justification_reason: requiresJustification ? justificationText : null,
            justification_type: finalJustificationType,
            overtime_status: finalOvertimeStatus,
            approval_status: finalApprovalStatus
        };

        if (evidenceUrl) updatePayload.evidence_photo = evidenceUrl;

        const { error: updateError } = await supabase.from('attendance').update(updatePayload).eq('id', attendanceToday.id);
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

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

  // --- REGLA CLAVE PARA MOSTRAR LA CÁMARA DE EVIDENCIA ---
  // Ahora también ES OBLIGATORIO si el obrero marca fuera de rango (!isLocationValid)
  const needsEvidence = 
      (!isLocationValid) || 
      (actionType === 'CHECK_IN' && !isTimeValid && lateCheckInType === 'JUSTIFICADA') || 
      (actionType === 'CHECK_OUT' && !isTimeValid && lateReasonType === 'HORA_EXTRA');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-[#003366] rounded-b-[4rem] z-0"></div>
      <div className="absolute top-12 z-10 w-full flex justify-center">
         <img src={logoFull} alt="L&K" className="h-20 brightness-0 invert opacity-90 drop-shadow-sm" />
      </div>

      <AnimatePresence mode="wait">
        
        {step === 'confirm' && (
          <motion.div 
            key="confirm" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] relative z-10 mt-20 shadow-xl"
          >
            <button onClick={goBackToDashboard} className="absolute top-6 left-6 p-2 text-slate-400 hover:text-[#003366] bg-slate-50 hover:bg-slate-100 rounded-full transition-all">
               <ArrowLeft size={20} />
            </button>

            <div className="text-center mt-6">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Registro Diario</h2>
              <p className="text-slate-500 text-sm mt-1">Selecciona tu acción para hoy</p>
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#003366] text-xs font-bold rounded-full border border-blue-100">
                <MapPin size={12}/> Obra: {worker.project_assigned || 'Sin Asignar'}
              </div>
            </div>

            {attendanceToday?.validation_status === 'VALIDADO' && (
               <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-800 text-xs font-bold">
                  <Lock size={16} />
                  <span>Día cerrado y validado por supervisión.</span>
               </div>
            )}

            <div className="mt-6 space-y-5">
              {!attendanceToday ? (
                <button onClick={() => startProcess('CHECK_IN')} disabled={loading} className="w-full py-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center gap-3 hover:bg-emerald-100 active:scale-95 transition-all group disabled:opacity-50">
                  <div className="p-3 bg-white rounded-full text-emerald-600 shadow-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <LogIn size={26} strokeWidth={2.5} />}
                  </div>
                  <span className="font-bold text-emerald-800 text-sm tracking-wide">{loading ? 'BUSCANDO GPS...' : 'MARCAR ENTRADA'}</span>
                </button>
              ) : !attendanceToday.check_out_time ? (
                <button onClick={() => startProcess('CHECK_OUT')} disabled={attendanceToday?.validation_status === 'VALIDADO' || loading} className={`w-full py-6 rounded-3xl border flex flex-col items-center gap-3 transition-all group disabled:opacity-50 ${attendanceToday?.validation_status === 'VALIDADO' ? 'bg-slate-50 border-slate-200 cursor-not-allowed grayscale' : 'bg-orange-50 border-orange-100 hover:bg-orange-100 active:scale-95'}`}>
                  <div className="p-3 bg-white rounded-full text-orange-600 shadow-sm">
                    {loading ? <Loader2 className="animate-spin"/> : <LogOut size={26} strokeWidth={2.5} />}
                  </div>
                  <span className="font-bold text-orange-800 text-sm tracking-wide">{loading ? 'BUSCANDO GPS...' : 'MARCAR SALIDA'}</span>
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
          </motion.div>
        )}

        {step === 'camera' && (
          <motion.div 
            key="camera" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-black h-[70vh] rounded-[2.5rem] overflow-hidden relative flex flex-col z-20 shadow-2xl"
          >
            <div className="absolute top-4 left-0 right-0 z-30 flex flex-col gap-2 items-center pointer-events-none px-4">
                {!isLocationValid ? (
                    <div className="bg-red-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm animate-pulse shadow-lg">
                        <AlertTriangle size={14} /> Distancia: {distanceToProject}m (Fuera de rango)
                    </div>
                ) : distanceToProject ? (
                    <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg">
                        <MapPin size={14} /> En obra ({distanceToProject}m)
                    </div>
                ) : (
                   <div className="bg-slate-700/50 text-white px-3 py-1 rounded-full text-[10px] backdrop-blur-sm">GPS Detectado</div>
                )}

                {!isTimeValid && (
                    <div className="bg-amber-500/90 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-sm shadow-lg">
                        <AlertTriangle size={14} /> {actionType === 'CHECK_IN' ? 'Llegada Tarde' : 'Fuera de horario tolerado'}
                    </div>
                )}
            </div>

            {!photoBlob ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none border-[12px] border-black/30">
                  <div className="w-64 h-80 border-2 border-white/50 rounded-[2rem] relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center pb-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                  <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm active:scale-95 transition-transform flex items-center justify-center">
                      <div className="w-16 h-16 bg-white rounded-full"></div>
                  </button>
                </div>
                <button onClick={() => { setStep('confirm'); stopCameraStream(); }} className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md z-40 hover:bg-black/60 transition-colors">
                  <ArrowLeft size={24} />
                </button>
              </>
            ) : (
              <div className="flex flex-col h-full bg-slate-900 relative">
                <img src={URL.createObjectURL(photoBlob)} className="flex-1 object-cover" alt="Preview" />
                {(!isLocationValid || !isTimeValid) && (
                    <div className="absolute bottom-28 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl text-xs text-center font-bold backdrop-blur-md shadow-lg">
                       ⚠️ Requiere Justificación. Su registro pasará a revisión.
                    </div>
                )}
                <div className="p-6 bg-white rounded-t-[2rem] flex gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                  <button onClick={retryPhoto} className="flex-1 py-4 text-slate-600 font-bold bg-slate-100 rounded-2xl text-sm hover:bg-slate-200 transition-colors">Repetir Foto</button>
                  <button onClick={proceedWithSubmit} disabled={loading} className={`flex-1 py-4 text-white rounded-2xl font-bold text-sm flex justify-center items-center shadow-lg active:scale-95 transition-transform gap-2 ${(!isLocationValid || !isTimeValid) ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#003366] hover:bg-blue-900'}`}>
                     {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20}/> {(!isLocationValid || !isTimeValid) ? 'Siguiente' : 'Confirmar'}</>}
                  </button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}

        {/* --- PASO 2.5: CÁMARA PARA EVIDENCIA --- */}
        {step === 'evidence_camera' && (
          <motion.div 
            key="evidence_camera" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-black h-[70vh] rounded-[2.5rem] overflow-hidden relative flex flex-col z-30 shadow-2xl"
          >
            <div className="absolute top-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
                <div className="bg-amber-500/90 text-white px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm shadow-lg flex items-center gap-2">
                    <Camera size={14} /> Toma foto de la evidencia
                </div>
            </div>

            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

            <div className="absolute bottom-0 inset-x-0 p-8 flex justify-center pb-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              <button onClick={takeEvidencePhoto} className="w-20 h-20 rounded-full border-4 border-amber-500 bg-white/20 backdrop-blur-sm active:scale-95 transition-transform flex items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]"></div>
              </button>
            </div>
            <button onClick={() => { stopCameraStream(); setStep('justification'); }} className="absolute top-6 left-6 p-3 bg-black/40 text-white rounded-full backdrop-blur-md z-40 hover:bg-black/60 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}

        {/* --- PASO 3: MODAL DE JUSTIFICACIÓN DINÁMICO --- */}
        {step === 'justification' && (
           <motion.div 
             key="justification" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
             className="w-full max-w-sm bg-white p-8 rounded-[2.5rem] relative z-10 mt-10 shadow-xl overflow-y-auto max-h-[85vh] scrollbar-hide"
           >
             <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${!isLocationValid ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    {!isLocationValid ? <MapPin size={32} /> : <Clock size={32} />}
                </div>
                <h2 className="text-xl font-bold text-slate-800">
                    {!isTimeValid && !isLocationValid ? 'Alerta de GPS y Horario' :
                     !isLocationValid ? 'Fuera de Rango (GPS)' :
                     actionType === 'CHECK_IN' ? 'Alerta de Tardanza' : 'Alerta de Horario'}
                </h2>
                <p className="text-slate-500 text-xs mt-2">
                    {!isTimeValid && !isLocationValid ? 'Estás marcando tarde y fuera de los límites de la obra.' : 
                     !isTimeValid ? (actionType === 'CHECK_IN' ? 'Estás marcando pasada la hora de tolerancia.' : 'Estás marcando fuera del horario regular.') :
                     'Estás marcando fuera del perímetro permitido de la obra.'}
                </p>
             </div>

             {/* NUEVO: ALERTA DE FUERA DE OBRA (GPS INVÁLIDO) */}
             {!isLocationValid && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                    <p className="text-xs text-red-700 font-bold flex items-center gap-1"><MapPin size={14}/> Ubicación No Reconocida</p>
                    <p className="text-[10px] text-red-600 mt-1">El sistema requiere que justifiques por qué no te encuentras en la obra y que tomes una foto de evidencia (Ej. Comprando materiales).</p>
                </div>
             )}

             {/* OPCIONES SOLO SI ES TARDANZA EN INGRESO */}
             {!isTimeValid && actionType === 'CHECK_IN' && (
                 <div className="space-y-3 mb-6">
                     <p className="text-sm font-bold text-slate-700">Clasifica tu tardanza:</p>
                     
                     <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${lateCheckInType === 'JUSTIFICADA' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                        <input type="radio" name="checkInReason" className="mt-1" checked={lateCheckInType === 'JUSTIFICADA'} onChange={() => { setLateCheckInType('JUSTIFICADA'); setEvidenceBlob(null); }}/>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">Tardanza Justificada</span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Ej. Paro de transporte, recojo de materiales. <span className="text-blue-600 font-bold">Requiere evidencia.</span></span>
                        </div>
                     </label>

                     <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${lateCheckInType === 'INJUSTIFICADA' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-red-300'}`}>
                        <input type="radio" name="checkInReason" className="mt-1" checked={lateCheckInType === 'INJUSTIFICADA'} onChange={() => { setLateCheckInType('INJUSTIFICADA'); setEvidenceBlob(null); }}/>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">Tardanza Injustificada</span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Ej. Me quedé dormido, tráfico común. <br/><strong className="text-red-600">Deberás recuperar estas horas.</strong></span>
                        </div>
                     </label>
                 </div>
             )}

             {/* OPCIONES SOLO SI ES FUERA DE HORA EN SALIDA */}
             {!isTimeValid && actionType === 'CHECK_OUT' && (
                 <div className="space-y-3 mb-6">
                     <p className="text-sm font-bold text-slate-700">Selecciona el motivo de tu demora:</p>
                     
                     <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${lateReasonType === 'HORA_EXTRA' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                        <input type="radio" name="reason" className="mt-1" checked={lateReasonType === 'HORA_EXTRA'} onChange={() => { setLateReasonType('HORA_EXTRA'); setEvidenceBlob(null); }}/>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">Solicitar Horas Extras</span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Me quedé trabajando a solicitud del residente. <span className="text-blue-600 font-bold">Requiere evidencia.</span></span>
                        </div>
                     </label>

                     <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${lateReasonType === 'OLVIDO' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white hover:border-amber-300'}`}>
                        <input type="radio" name="reason" className="mt-1" checked={lateReasonType === 'OLVIDO'} onChange={() => { setLateReasonType('OLVIDO'); setEvidenceBlob(null); }}/>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">Me olvidé de marcar a mi hora</span>
                            <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Mi salida se registrará automáticamente a las 5:00 PM.</span>
                        </div>
                     </label>
                 </div>
             )}

             <textarea 
                rows="3"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all mb-4"
                placeholder={
                    !isLocationValid ? "¿Por qué te encuentras fuera de la obra? Detalla tu ubicación y actividad..." :
                    actionType === 'CHECK_IN' 
                    ? (lateCheckInType === 'JUSTIFICADA' ? "Justificando: Ej. Fui a comprar material indicado por el jefe..." : "Describir tardanza: Ej. Hubo tráfico, salí tarde...")
                    : (lateReasonType === 'HORA_EXTRA' ? "¿Qué trabajo realizaste en estas horas extras?" : "¿Escribe aquí una nota para el Residente?")
                }
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
             ></textarea>

             {/* BLOQUE PARA CÁMARA DE EVIDENCIA */}
             {needsEvidence && (
                 <div className="mb-6">
                     <p className="text-xs font-bold text-slate-700 mb-2">Evidencia fotográfica (Requerida):</p>
                     {evidenceBlob ? (
                         <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-blue-500 shadow-sm group">
                             <img src={URL.createObjectURL(evidenceBlob)} className="w-full h-full object-cover" alt="Evidencia" />
                             <button onClick={startEvidenceCamera} className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-sm backdrop-blur-sm">
                                 <Camera className="mb-1" size={20} /> Cambiar Foto
                             </button>
                         </div>
                     ) : (
                         <button onClick={startEvidenceCamera} className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 flex flex-col items-center justify-center hover:bg-slate-100 hover:border-blue-400 transition-colors group">
                             <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                 <Camera size={24} className="text-blue-500" />
                             </div>
                             <span className="text-xs font-bold text-slate-600">Abrir Cámara para Evidencia</span>
                         </button>
                     )}
                 </div>
             )}

             <div className="flex gap-3">
                 <button onClick={() => setStep('camera')} className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Atrás</button>
                 <button 
                    onClick={() => executeDatabaseSave(true)} 
                    disabled={justificationText.trim().length < 5 || loading || (needsEvidence && !evidenceBlob)}
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-lg disabled:opacity-50 transition-colors flex justify-center items-center"
                 >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirmar Envío'}
                 </button>
             </div>
           </motion.div>
        )}

        {/* --- PASO 4: ÉXITO --- */}
        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white p-10 rounded-[2.5rem] text-center relative z-20 mt-20 shadow-xl"
          >
            {(!isLocationValid || (!isTimeValid && lateReasonType === 'HORA_EXTRA') || (!isTimeValid && actionType === 'CHECK_IN' && lateCheckInType === 'JUSTIFICADA')) ? (
                <>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-amber-50 text-amber-500">
                    <AlertTriangle size={48} strokeWidth={2} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Pendiente de Aprobación</h2>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    Tu registro fue enviado. Las justificaciones y evidencias indicadas están a la espera de ser revisadas por tu Residente.
                  </p>
                </>
            ) : (!isTimeValid && actionType === 'CHECK_IN' && lateCheckInType === 'INJUSTIFICADA') ? (
                <>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50 text-red-500">
                    <Clock size={48} strokeWidth={2} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Tardanza Registrada</h2>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    Se ha registrado tu hora de ingreso como Tardanza. Recuerda que deberás recuperar estas horas.
                  </p>
                </>
            ) : (
                <>
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-50 text-green-500">
                    <CheckCircle size={48} strokeWidth={2} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Excelente!</h2>
                  <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    Tu asistencia ha sido registrada exitosamente en el sistema.
                  </p>
                </>
            )}
            
            <button onClick={goBackToDashboard} className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform">
              Volver al Inicio
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default WorkerAttendance;