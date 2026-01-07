// src/components/layout/RoleProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Importa el nuevo contexto
import { Loader2 } from 'lucide-react';

const RoleProtectedRoute = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();

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
    return <Navigate to="/login" replace />;
  }

  // 3. Verificar Rol (Leído desde la BD, no del localStorage)
  // Si el usuario no tiene rol aún (puede pasar si la BD tarda), denegar o esperar
  if (!allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
         {/* ... Tu diseño de Acceso Restringido existente ... */}
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
            <p className="text-slate-500">No tienes permisos ({role || 'Sin Rol'})</p>
         </div>
      </div>
    );
  }

  // 4. Autorizado
  return <Outlet />;
};

export default RoleProtectedRoute;