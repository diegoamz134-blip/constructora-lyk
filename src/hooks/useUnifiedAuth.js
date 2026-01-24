import { useAuth } from '../context/AuthContext';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useMemo } from 'react';

export const useUnifiedAuth = () => {
  const { user: staffUser, loading: staffLoading, logout: logoutStaff } = useAuth();
  const { worker: workerUser, loading: workerLoading, logout: logoutWorker } = useWorkerAuth();

  const authState = useMemo(() => {
    // 1. Si hay un OBRERO logueado
    if (workerUser) {
      // --- FIX: Verificar LocalStorage para evitar bloqueo por latencia ---
      let isCompleted = workerUser.onboarding_completed;
      
      try {
          // Leemos si guardamos la marca localmente en el paso anterior
          const stored = JSON.parse(localStorage.getItem('lyk_session') || '{}');
          if (stored.user && stored.user.id === workerUser.id) {
              if (stored.user.onboarding_completed === true) {
                  isCompleted = true; // Forzamos a TRUE si el local lo dice
              }
          }
      } catch (e) { console.error("Error leyendo sesión local", e); }

      return {
        // Inyectamos el valor corregido
        currentUser: { ...workerUser, onboarding_completed: isCompleted, type: 'worker' },
        loading: workerLoading,
        logout: logoutWorker,
        isAuthenticated: true
      };
    }

    // 2. Si hay un STAFF logueado
    if (staffUser) {
      return {
        currentUser: { ...staffUser, type: 'staff' },
        loading: staffLoading,
        logout: logoutStaff,
        isAuthenticated: true
      };
    }

    // 3. Nadie logueado
    return {
      currentUser: null,
      loading: staffLoading || workerLoading,
      logout: () => { logoutStaff(); logoutWorker(); },
      isAuthenticated: false
    };
  }, [staffUser, workerUser, staffLoading, workerLoading, logoutStaff, logoutWorker]);

  return authState;
};