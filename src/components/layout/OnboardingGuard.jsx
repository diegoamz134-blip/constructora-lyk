import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

const OnboardingGuard = () => {
  const { currentUser, isLoading } = useUnifiedAuth();

  if (isLoading) return null; // O un spinner

  // Si es STAFF y NO ha completado onboarding, mandarlo a /onboarding
  if (currentUser?.type === 'staff' && currentUser?.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // Si ya completó, dejarlo pasar
  return <Outlet />;
};

export default OnboardingGuard;