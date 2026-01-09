import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Spinner simple sin texto
const SimpleSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
  </div>
);

const RoleProtectedRoute = ({ allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // 1. Si está cargando, mostramos spinner limpio
  if (loading) {
    return <SimpleSpinner />;
  }

  // 2. Si terminó de cargar y NO hay usuario, al Login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Si hay usuario pero su rol no está permitido
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
            <p className="text-slate-500 mb-4">No tienes permisos para ver esta sección.</p>
            <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded">Tu rol: {role || 'Sin rol detectado'}</p>
         </div>
      </div>
    );
  }

  // 4. Todo correcto, mostrar contenido
  return <Outlet />;
};

export default RoleProtectedRoute;