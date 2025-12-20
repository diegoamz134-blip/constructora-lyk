// src/components/common/ImageCropperModal.jsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ZoomIn, RotateCw } from 'lucide-react';
import getCroppedImg from '../../utils/imageCropper'; // Importamos la utilidad del Paso 2

const ImageCropperModal = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = (crop) => setCrop(crop);
  const onZoomChange = (zoom) => setZoom(zoom);
  const onRotationChange = (rotation) => setRotation(rotation);

  // Esta función se ejecuta cada vez que el usuario mueve/ajusta el recorte
  const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Esta función se ejecuta al dar click en "Recortar y Guardar"
  const handleSave = async () => {
    setProcessing(true);
    try {
      // Usamos la utilidad para obtener el archivo final
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      // Devolvemos el archivo procesado al componente padre
      onCropComplete(croppedImageBlob);
      onClose();
      // Reseteamos estados
      setZoom(1);
      setRotation(0);
    } catch (e) {
      console.error("Error al recortar:", e);
      alert("Error al procesar la imagen");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col h-[90vh] md:h-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Ajustar Foto de Perfil</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X size={20} />
            </button>
          </div>

          {/* Área de Recorte (Cropper) */}
          <div className="relative flex-1 bg-slate-900 min-h-[300px] md:min-h-[400px]">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1} // ¡Importante! Fuerza a que sea cuadrado (1:1)
              onCropChange={onCropChange}
              onRotationChange={onRotationChange}
              onCropComplete={onCropAreaChange}
              onZoomChange={onZoomChange}
              showGrid={true}
              cropShape="round" // Muestra una guía redonda, ideal para perfiles
            />
          </div>

          {/* Controles (Sliders) */}
          <div className="p-6 space-y-6 bg-white">
            <div className="space-y-2">
               <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                 <span className="flex items-center gap-1"><ZoomIn size={14}/> Zoom</span>
                 <span>{((zoom - 1) * 100).toFixed(0)}%</span>
               </div>
               <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#003366]"
                />
            </div>

            <div className="space-y-2">
               <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                 <span className="flex items-center gap-1"><RotateCw size={14}/> Rotación</span>
                 <span>{rotation}°</span>
               </div>
               <input
                  type="range"
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  aria-labelledby="Rotación"
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#003366]"
                />
            </div>
          </div>

          {/* Footer / Botones */}
          <div className="flex gap-3 p-4 border-t border-slate-100 bg-slate-50">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white transition"
              disabled={processing}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={processing}
              className="flex-1 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {processing ? 'Procesando...' : <><Check size={18} /> Recortar y Guardar</>}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageCropperModal;