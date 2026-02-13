import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Importamos useLocation
import { FileText } from 'lucide-react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

const OnboardingFloatingBtn = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Obtenemos la ruta actual
  const { currentUser } = useUnifiedAuth();

  // --- 1. RESTRICCIÓN DE RUTA ---
  // Si la ruta actual NO es '/dashboard', no renderizamos nada.
  // Esto asegura que el botón no aparezca en Login, Planillas, Perfil, etc.
  if (location.pathname !== '/dashboard') {
    return null;
  }

  // Si no hay usuario cargado, tampoco mostramos nada
  if (!currentUser) return null;

  // --- 2. LÓGICA DE DETECCIÓN (STAFF vs OBRERO) ---

  // A. Lógica para STAFF (Oficina)
  // Verificamos si es staff y si tiene la marca de 'skipped' en onboarding_data
  const isStaffSkipped = currentUser?.type === 'staff' && currentUser?.onboarding_data?.skipped === true;

  // B. Lógica para WORKER (Obrero)
  const isWorker = currentUser.role === 'worker' || currentUser.role === 'obrero';
  
  // Verificamos si es obrero y tiene la marca 'skipped' en details
  const isWorkerSkipped = isWorker && currentUser?.details?.skipped === true;

  // --- 3. DECISIÓN FINAL ---
  // Si ninguno de los dos omitió el registro, significa que ya completaron todo o son nuevos
  // por lo que no mostramos el botón.
  if (!isStaffSkipped && !isWorkerSkipped) return null;

  // Definimos a dónde va cada uno al hacer clic
  const targetPath = isWorkerSkipped ? '/worker/onboarding' : '/onboarding';

  return (
    <button
      onClick={() => navigate(targetPath)}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-[#f0c419] text-[#003366] font-bold rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-500/40 transition-all animate-bounce-slow border-2 border-[#003366]/10"
      title="Completar información pendiente"
    >
      <div className="relative">
        <FileText size={24} />
        {/* Puntito rojo parpadeante para llamar la atención */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </div>
      
      {/* Texto descriptivo (Oculto en pantallas muy pequeñas para ahorrar espacio) */}
      <div className="text-left leading-tight hidden md:block">
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