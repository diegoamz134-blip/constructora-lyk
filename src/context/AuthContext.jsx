import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función segura para buscar rol
  const fetchUserRole = async (email) => {
    if (!email) return null;
    try {
      const { data: emp } = await supabase.from('employees').select('role').eq('email', email).maybeSingle();
      if (emp) return emp.role;
      const { data: wor } = await supabase.from('workers').select('role').eq('email', email).maybeSingle();
      if (wor) return wor.role;
    } catch (e) {
      console.error("Error buscando rol:", e);
    }
    return null;
  };

  useEffect(() => {
    let mounted = true;

    // Timeout de seguridad para evitar pantalla blanca eterna
    const forceStopLoading = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 2000);

    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            if (error.message.includes("invalid_grant")) await supabase.auth.signOut();
            throw error;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          const r = await fetchUserRole(session.user.email);
          if (mounted) setRole(r);
        }
      } catch (err) {
        console.log("Sesión no activa o error de red.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
         setUser(session?.user ?? null);
         if (session?.user) {
             const r = await fetchUserRole(session.user.email);
             if (mounted) setRole(r);
         }
         setLoading(false);
      } else if (event === 'SIGNED_OUT') {
         // Limpieza redundante por seguridad
         setUser(null);
         setRole(null);
         setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(forceStopLoading);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) {
       const r = await fetchUserRole(data.user.email);
       setRole(r);
    }
    return data;
  };

  // --- LOGOUT MEJORADO (SALIDA INMEDIATA) ---
  const logout = async () => {
    try {
        // 1. ¡PRIMERO LIMPIAMOS LA UI! (Salida visual instantánea)
        setUser(null);
        setRole(null);
        setLoading(false);

        // 2. Limpiamos almacenamiento local para evitar conflictos al volver
        localStorage.clear(); 

        // 3. Le avisamos a Supabase (ya no nos importa si tarda)
        await supabase.auth.signOut();
        
    } catch (e) {
        console.warn("Error no crítico al cerrar sesión:", e);
        // Incluso si falla, el usuario ya está fuera visualmente.
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);