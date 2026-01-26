import { useAuth } from '../context/AuthContext';
import { useWorkerAuth } from '../context/WorkerAuthContext';
import { useMemo } from 'react';

export const useUnifiedAuth = () => {
  const { user: staffUser, loading: staffLoading, logout: logoutStaff } = useAuth();
  
  // CORRECCIÓN AQUÍ:
  // Antes: const { ..., logout: logoutWorker } = ... (Buscaba una propiedad 'logout' que no existe)
  // Ahora: const { ..., logoutWorker } = ... (Busca la propiedad correcta 'logoutWorker')
  const { worker: workerUser, loading: workerLoading, logoutWorker } = useWorkerAuth();

  const authState = useMemo(() => {
    // 1. Si hay un OBRERO logueado
    if (workerUser) {
      // --- FIX: Verificar LocalStorage para evitar bloqueo por latencia ---
      let isCompleted = workerUser.onboarding_completed;
      
      try {
          const stored = JSON.parse(localStorage.getItem('lyk_session') || '{}');
          if (stored.user && stored.user.id === workerUser.id) {
              if (stored.user.onboarding_completed === true) {
                  isCompleted = true; 
              }
          }
      } catch (e) { console.error("Error leyendo sesión local", e); }

      return {
        currentUser: { ...workerUser, onboarding_completed: isCompleted, type: 'worker' },
        loading: workerLoading,
        // Usamos la función logoutWorker que ahora sí existe
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
      logout: () => { 
          // Intentamos cerrar ambos por si acaso
          if(logoutStaff) logoutStaff(); 
          if(logoutWorker) logoutWorker(); 
      },
      isAuthenticated: false
    };
  }, [staffUser, workerUser, staffLoading, workerLoading, logoutStaff, logoutWorker]);

  return authState;
};