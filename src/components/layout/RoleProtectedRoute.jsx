import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const RoleProtectedRoute = ({ allowedRoles }) => {
  // 1. Leer sesión del almacenamiento local
  const sessionStr = localStorage.getItem('lyk_admin_session');
  let session = null;
  
  try {
    session = sessionStr ? JSON.parse(sessionStr) : null;
  } catch (e) {
    session = null;
  }

  // 2. Si no hay sesión, mandar al Login
  if (!session || !session.user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Verificar Rol
  // Si el usuario no tiene rol definido, asumimos 'staff' por seguridad
  const userRole = session.role || session.user.role || 'staff'; 
  
  // Si el rol del usuario NO está en la lista de permitidos para esta ruta
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 mb-6">
            Tu perfil de <strong>{userRole.toUpperCase()}</strong> no tiene permisos para ver esta sección.
          </p>
          <a href="/admin/dashboard" className="px-6 py-2 bg-[#003366] text-white rounded-lg font-bold hover:bg-blue-900 transition">
            Volver al Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 4. Si tiene permiso, mostrar la página
  return <Outlet />;
};

export default RoleProtectedRoute;