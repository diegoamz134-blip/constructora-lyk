import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom'; // <--- IMPORTANTE
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, MapPin, Search, CheckCircle, RefreshCw, LogIn, LogOut, ArrowLeft } from 'lucide-react'; // Agregué ArrowLeft
import { supabase } from '../../services/supabase';
import { compressImage } from '../../utils/imageCompressor';

const WorkerAttendance = () => {
  const locationState = useLocation(); // Hook para recibir datos
  const navigate = useNavigate();

  const [step, setStep] = useState('search'); 
  const [dni, setDni] = useState('');
  const [worker, setWorker] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState(null); 
  const [actionType, setActionType] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // --- EFECTO: CARGAR DATOS SI VIENEN DEL LOGIN ---
  useEffect(() => {
    // Si viene del Login con datos precargados
    if (locationState.state?.preloadedWorker) {
      const preload = locationState.state.preloadedWorker;
      setWorker(preload);
      setDni(preload.document_number);
      checkAttendanceStatus(preload.id); // Función auxiliar para verificar estado
    }
  }, [locationState]);

  // Función separada para verificar estado del día
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
      setStep('confirm'); // Saltamos directo a confirmar
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. BUSCAR OBRERO (Manual)
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', dni)
        .single();

      if (workerError || !workerData) throw new Error('DNI no encontrado.');
      setWorker(workerData);
      checkAttendanceStatus(workerData.id); // Usamos la misma función

    } catch (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  // ... (RESTO DEL CÓDIGO IGUAL: startProcess, startCamera, takePhoto, submitAttendance) ...
  
  // Solo asegúrate de copiar el resto de funciones (startProcess, etc.) del código anterior
  // Si no quieres copiar y pegar, solo agrega el useEffect y la función checkAttendanceStatus arriba
  
  // Aquí te pongo el startProcess y demás para que tengas el archivo completo si prefieres copiar todo:

  const startProcess = async (type) => {
    setActionType(type);
    setLoading(true);
    setErrorMsg('');

    if (!navigator.geolocation) {
      setErrorMsg('Navegador no soporta geolocalización.');
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
        setErrorMsg('Debes permitir la ubicación para marcar.');
      },
      { enableHighAccuracy: true }
    );
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setErrorMsg('No se pudo acceder a la cámara.');
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
        const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
        const compressed = await compressImage(file);
        setPhotoBlob(compressed);
        const stream = video.srcObject;
        stream?.getTracks().forEach(track => track.stop());
      }, 'image/jpeg', 0.8);
    }
  };

  const submitAttendance = async () => {
    if (!photoBlob || !location || !worker) return;
    setLoading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${worker.document_number}_${actionType}_${timestamp}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('attendance-photos')
        .upload(fileName, photoBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('attendance-photos')
        .getPublicUrl(fileName);

      const now = new Date().toISOString(); 

      if (actionType === 'CHECK_IN') {
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            worker_id: worker.id,
            date: new Date().toISOString().split('T')[0],
            check_in_time: now,
            check_in_photo: publicUrl,
            check_in_location: location
          }]);
        if (insertError) throw insertError;
      } else {
        if (!attendanceToday) throw new Error("No hay registro de entrada.");
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

  const reset = () => {
    // Si queremos volver al login principal al terminar
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      
      {step === 'search' && (
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl relative">
          <button onClick={() => navigate('/')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-800">
             <ArrowLeft />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 mt-4 text-center">Marcación L&K</h2>
          <p className="text-slate-500 mb-6 text-sm text-center">Ingresa tu DNI para registrar asistencia.</p>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="tel" 
                value={dni} onChange={(e) => setDni(e.target.value)}
                className="w-full pl-12 py-4 bg-slate-50 border rounded-2xl text-lg font-bold text-center tracking-widest outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DNI" maxLength={15} required
              />
            </div>
            <button disabled={loading} className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-bold hover:scale-[1.02] transition-transform">
              {loading ? <RefreshCw className="animate-spin mx-auto"/> : 'Buscar'}
            </button>
          </form>
          {errorMsg && <p className="mt-4 text-red-500 text-center text-sm bg-red-50 p-2 rounded-lg">{errorMsg}</p>}
        </div>
      )}

      {step === 'confirm' && worker && (
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl text-center">
          <h3 className="text-xl font-bold text-slate-800">{worker.full_name}</h3>
          <p className="text-slate-500 text-sm mb-8">{worker.category}</p>

          <div className="grid gap-4">
            {!attendanceToday ? (
              <button onClick={() => startProcess('CHECK_IN')} className="py-6 bg-green-50 border-2 border-green-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-green-100 transition-colors">
                <LogIn className="text-green-600 w-8 h-8" />
                <span className="font-bold text-green-700">MARCAR ENTRADA</span>
              </button>
            ) : !attendanceToday.check_out_time ? (
              <button onClick={() => startProcess('CHECK_OUT')} className="py-6 bg-orange-50 border-2 border-orange-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-orange-100 transition-colors">
                <LogOut className="text-orange-600 w-8 h-8" />
                <span className="font-bold text-orange-700">MARCAR SALIDA</span>
              </button>
            ) : (
              <div className="p-6 bg-blue-50 text-blue-800 rounded-2xl font-medium">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                Ya has completado tu jornada de hoy.
              </div>
            )}
          </div>
          
          <button onClick={() => navigate('/')} className="mt-6 text-slate-400 text-sm underline">Cancelar y Salir</button>
          {loading && <p className="mt-4 text-slate-500 animate-pulse">Procesando...</p>}
          {errorMsg && <p className="mt-4 text-red-500 text-center text-sm">{errorMsg}</p>}
        </div>
      )}

      {step === 'camera' && (
        <div className="w-full max-w-md bg-black h-[500px] rounded-3xl overflow-hidden relative flex flex-col">
          {!photoBlob ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-6 inset-x-0 flex justify-center">
                <button onClick={takePhoto} className="w-16 h-16 rounded-full border-4 border-white bg-white/20"></button>
              </div>
            </>
          ) : (
            <>
              <img src={URL.createObjectURL(photoBlob)} className="flex-1 object-cover" />
              <div className="p-4 bg-white flex gap-4">
                <button onClick={() => setPhotoBlob(null)} className="flex-1 py-3 border rounded-xl font-bold">Repetir</button>
                <button onClick={submitAttendance} disabled={loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center">
                   {loading ? <RefreshCw className="animate-spin"/> : 'Confirmar'}
                </button>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {step === 'success' && (
        <div className="w-full max-w-md bg-white p-12 rounded-3xl shadow-xl text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Listo!</h2>
          <p className="text-slate-500 mb-8">
            Tu {actionType === 'CHECK_IN' ? 'Entrada' : 'Salida'} ha sido registrada correctamente.
          </p>
          <button onClick={reset} className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-bold">Finalizar</button>
        </div>
      )}

    </div>
  );
};

export default WorkerAttendance;