import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { X, Camera, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);

  // Configuración para que use la cámara frontal/usuario
  const videoConstraints = {
    width: 720,
    height: 720,
    facingMode: "user"
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
  }, [webcamRef]);

  const handleConfirm = () => {
    if (imgSrc) {
      onCapture(imgSrc);
      setImgSrc(null); // Limpiar para la próxima
    }
  };

  const handleRetake = () => {
    setImgSrc(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md flex flex-col"
        >
          {/* Header */}
          <div className="p-4 flex justify-between items-center border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Camera className="text-[#003366]" size={20} />
              Evidencia de Asistencia
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Área de Cámara / Foto */}
          <div className="relative bg-black aspect-square flex items-center justify-center overflow-hidden">
            {imgSrc ? (
              <img src={imgSrc} alt="Captura" className="w-full h-full object-cover" />
            ) : (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Controles */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center gap-4">
            {!imgSrc ? (
              <button 
                onClick={capture}
                className="flex items-center gap-2 bg-[#003366] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20 active:scale-95"
              >
                <Camera size={20} />
                Tomar Foto
              </button>
            ) : (
              <>
                <button 
                  onClick={handleRetake}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw size={18} />
                  Repetir
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  <Check size={18} />
                  Confirmar
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CameraModal;