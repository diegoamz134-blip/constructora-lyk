import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user.email);
        }
      } catch (error) {
        console.error("Error sesión:", error);
      } finally {
        setLoading(false); // ¡ESTO QUITA LA RUEDITA AL INICIO!
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user || null);
      if (session?.user && !role) await fetchUserRole(session.user.email);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (email) => {
    if (!email) return;
    try {
      // 1. Buscar en Employees
      const { data: emp } = await supabase.from('employees').select('role').eq('email', email).maybeSingle();
      if (emp) { setRole(emp.role); return; }
      
      // 2. Buscar en Workers
      const { data: wor } = await supabase.from('workers').select('role').eq('email', email).maybeSingle();
      if (wor) { setRole(wor.role); return; }

    } catch (e) {
      console.error("Error roles:", e);
    }
  };

  const login = async (email, password) => {
    console.log("Iniciando login para:", email);
    
    // 1. Intento Login Normal
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) return data;

    // 2. Intento Migración (Si falló el normal)
    if (error) {
      console.log("Login falló, buscando en tabla antigua...");
      
      // Verificar permiso de lectura antes de consultar
      const { data: dbUser, error: dbError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (dbError) {
        console.error("Error de permisos BD:", dbError);
        throw new Error("Error de sistema: Falta ejecutar script SQL de permisos.");
      }

      // Si existe en BD antigua y password coincide
      if (dbUser && dbUser.password === password) {
        console.log("Usuario encontrado. Migrando...");
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: dbUser.full_name, role: dbUser.role } }
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            throw new Error("Este usuario ya existe pero la contraseña no coincide. Contacte a soporte.");
          }
          throw signUpError;
        }
        return signUpData;
      }
    }
    
    // Si no se pudo migrar ni loguear
    throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);