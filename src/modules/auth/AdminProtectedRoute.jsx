import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Loader2 } from 'lucide-react';

const ADMIN_SESSION_KEY = 'lyk_admin_session';

const AdminProtectedRoute = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verificar sesión actual al montar el componente
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
                const localAdmin = localStorage.getItem(ADMIN_SESSION_KEY);

        if (session || localAdmin) {
          setSession(session || JSON.parse(localAdmin));
        } else {
          setSession(null);
        }
      } catch (error) {
        console.error('Error verificando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Escuchar cambios en la autenticación (ej: cerrar sesión en otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const localAdmin = localStorage.getItem(ADMIN_SESSION_KEY);
      setSession(session || (localAdmin ? JSON.parse(localAdmin) : null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-[#003366]" size={40} />
      </div>
    );
  }

  // Si no hay sesión, redirigir al Login inmediatamente y reemplazar el historial
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Si hay sesión, permitir el acceso a las rutas hijas
  return <Outlet />;
};

export default AdminProtectedRoute;