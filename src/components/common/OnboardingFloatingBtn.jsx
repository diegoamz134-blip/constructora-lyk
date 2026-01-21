import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

const OnboardingFloatingBtn = () => {
  const navigate = useNavigate();
  const { currentUser } = useUnifiedAuth();

  // LÓGICA:
  // Mostramos el botón SOLO si el usuario es Staff y tiene la marca "skipped: true"
  // Esto significa que entró al sistema pero no llenó sus datos
  const isSkipped = currentUser?.type === 'staff' && currentUser?.onboarding_data?.skipped === true;

  if (!isSkipped) return null;

  return (
    <button
      onClick={() => navigate('/onboarding')}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-[#f0c419] text-[#003366] font-bold rounded-full shadow-2xl hover:scale-105 hover:shadow-yellow-500/40 transition-all animate-bounce-slow border-2 border-[#003366]/10"
    >
      <div className="relative">
        <FileText size={24} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </div>
      <div className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wider opacity-80 font-black">Acción Requerida</span>
        <span className="text-sm font-bold">Completar Registro</span>
      </div>
    </button>
  );
};

export default OnboardingFloatingBtn;