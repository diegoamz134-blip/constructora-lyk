import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función auxiliar para limpiar todo si hay error
  const forceLogout = async () => {
    console.warn("Forzando cierre de sesión por token inválido...");
    await supabase.auth.signOut();
    localStorage.clear(); // Limpieza agresiva del storage
    setUser(null);
    setRole(null);
    setLoading(false);
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Obtenemos sesión actual
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Si hay error de token inválido al arrancar, limpiamos inmediatamente
        if (error) {
           console.error("Error crítico de sesión:", error.message);
           if (error.message.includes("Refresh Token") || error.message.includes("invalid_grant")) {
             await forceLogout();
             return;
           }
        }

        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user.email);
        }
      } catch (error) {
        console.error("Excepción en checkSession:", error);
        await forceLogout();
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchamos cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Evento Auth:", event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        setRole(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user || null);
        if (session?.user && !role) await fetchUserRole(session.user.email);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (email) => {
    if (!email) return;
    try {
      const { data: emp } = await supabase.from('employees').select('role').eq('email', email).maybeSingle();
      if (emp) { setRole(emp.role); return; }
      
      const { data: wor } = await supabase.from('workers').select('role').eq('email', email).maybeSingle();
      if (wor) { setRole(wor.role); return; }

    } catch (e) {
      console.error("Error obteniendo roles:", e);
    }
  };

  const login = async (email, password) => {
    // 1. Intento Login Normal
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
        await fetchUserRole(data.user.email);
        return data;
    }

    // 2. Intento Migración (Solo si es necesario)
    if (error) {
      // Ignoramos errores de red o servidor, nos enfocamos en credenciales
      try {
        const { data: dbUser, error: dbError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        // Si RLS bloquea, abortamos migración
        if (dbError) throw error; 

        if (dbUser && dbUser.password === password) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: dbUser.full_name, role: dbUser.role } }
          });

          if (signUpError) {
             if (signUpError.message.includes("already registered")) {
                throw new Error("Credenciales incorrectas.");
             }
             throw signUpError;
          }
          
          if (signUpData.user) {
             await fetchUserRole(signUpData.user.email);
             return signUpData;
          }
        }
      } catch (migError) {
         // Silencioso, devolvemos el error original
      }
    }
    
    throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);