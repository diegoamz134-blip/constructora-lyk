import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth'; // <--- USAR HOOK UNIFICADO

const WorkerOnboardingGuard = () => {
  // Obtenemos el usuario del contexto unificado (que mira ambos AuthContexts)
  const { currentUser: user, loading } = useUnifiedAuth(); 
  const location = useLocation();

  if (loading) {
     return (
       <div className="h-screen w-full flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
       </div>
     );
  }

  // 1. Si no hay usuario, mandar a login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Si el usuario ES obrero (role === 'worker' O 'obrero')
  if (user.role === 'worker' || user.role === 'obrero') {
      
      // Verificamos si NO ha completado el onboarding
      if (user.onboarding_completed !== true) {
          
          // Si ya estamos en la página de onboarding, NO redirigir (romper el bucle)
          if (location.pathname === '/worker/onboarding') {
              return <Outlet />;
          }

          // Si estamos en otro lado, mandar al onboarding
          return <Navigate to="/worker/onboarding" replace />;
      }
  }

  // 3. Si todo está bien, mostrar contenido
  return <Outlet />;
};

export default WorkerOnboardingGuard;