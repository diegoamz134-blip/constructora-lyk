import { useAuth } from '../context/AuthContext';
import { useWorkerAuth } from '../context/WorkerAuthContext';

export const useUnifiedAuth = () => {
  const { user: staffUser, role: staffRole, logout: staffLogout, loading: staffLoading } = useAuth();
  const { worker, logoutWorker, loading: workerLoading } = useWorkerAuth();

  // Lógica de prioridad: Si hay usuario staff, es staff. Si no, miramos si hay obrero.
  const currentUser = staffUser 
    ? { ...staffUser, role: staffRole, type: 'staff' } 
    : (worker ? { ...worker, role: 'obrero', type: 'worker' } : null);
  
  const logout = () => {
    if (staffUser) staffLogout();
    if (worker) logoutWorker();
  };

  const isAuthenticated = !!currentUser;
  
  // SOLUCIÓN CLAVE:
  // Si ya detectamos un usuario autenticado, NO esperamos al otro contexto.
  // Esto evita que el loading de uno bloquee al otro.
  const isLoading = isAuthenticated ? false : (staffLoading || workerLoading);

  // Normalizamos el rol a minúsculas para evitar errores (Ej: "Admin" vs "admin")
  const rawRole = currentUser?.role || currentUser?.category || 'staff';
  const role = String(rawRole).toLowerCase();

  return {
    currentUser,
    role,
    isAuthenticated,
    logout,
    isLoading
  };
};