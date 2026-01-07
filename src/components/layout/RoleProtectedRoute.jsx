import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const RoleProtectedRoute = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1. Mientras carga la sesión, mostramos un spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-[#003366]" size={48} />
      </div>
    );
  }

  // 2. Si no hay usuario autenticado, mandar al Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Verificar Rol
  // Si el usuario existe pero el rol es null (a veces pasa en el primer render), esperamos o mostramos acceso denegado
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
            <p className="text-slate-500 mb-4">No tienes permisos para ver esta sección.</p>
            <p className="text-xs text-slate-400">Tu rol actual: {role}</p>
         </div>
      </div>
    );
  }

  // 4. Autorizado
  return <Outlet />;
};

export default RoleProtectedRoute;