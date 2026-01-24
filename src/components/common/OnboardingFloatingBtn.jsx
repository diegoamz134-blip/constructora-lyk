import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle } from 'lucide-react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

const OnboardingFloatingBtn = () => {
  const navigate = useNavigate();
  const { currentUser } = useUnifiedAuth();

  if (!currentUser) return null;

  // 1. Lógica para STAFF (Oficina)
  // Verifica si es staff y tiene el flag antiguo
  const isStaffSkipped = currentUser?.type === 'staff' && currentUser?.onboarding_data?.skipped === true;

  // 2. Lógica para WORKER (Obrero)
  // Verifica si es obrero y tiene el flag 'skipped_onboarding' en sus detalles
  const isWorker = currentUser.role === 'worker' || currentUser.role === 'obrero';
  const isWorkerSkipped = isWorker && currentUser?.details?.skipped_onboarding === true;

  // Si ninguno de los dos omitió, no mostramos nada
  if (!isStaffSkipped && !isWorkerSkipped) return null;

  // Definimos a dónde va cada uno
  const targetPath = isWorkerSkipped ? '/worker/onboarding' : '/onboarding';

  return (
    <button
      onClick={() => navigate(targetPath)}
      // Ajuste de posición: bottom-24 en móvil para no tapar el menú inferior, bottom-6 en PC
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex items-center gap-3 px-5 py-4 bg-[#f0c419] text-[#003366] font-bold rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-500/40 transition-all animate-bounce-slow border-2 border-[#003366]/10"
    >
      <div className="relative">
        <FileText size={24} />
        {/* Puntito rojo parpadeante para llamar la atención */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </div>
      <div className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wider opacity-80 font-black">
            {isWorkerSkipped ? '¡Faltan Datos!' : 'Acción Requerida'}
        </span>
        <span className="text-sm font-bold">
            {isWorkerSkipped ? 'Terminar Ficha' : 'Completar Registro'}
        </span>
      </div>
    </button>
  );
};

export default OnboardingFloatingBtn;