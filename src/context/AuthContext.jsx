import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const AuthContext = createContext({
  user: null,
  role: null,
  login: async () => {},
  logout: async () => {},
  loading: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // LOGIN AUTÓNOMO: Recuperar sesión al recargar
    const initSession = () => {
      try {
        const storedSession = localStorage.getItem('lyk_session');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession.user && parsedSession.role) {
            
            // --- NUEVA VALIDACIÓN AL RECARGAR PÁGINA ---
            // Si el usuario guardado NO está activo, borramos la sesión
            if (parsedSession.user.status && parsedSession.user.status !== 'Activo') {
               console.warn("Sesión terminada: Usuario no activo.");
               localStorage.removeItem('lyk_session');
               setLoading(false);
               return;
            }

            const userWithRole = { ...parsedSession.user, role: parsedSession.role };
            setUser(userWithRole);
            setRole(parsedSession.role);
          }
        }
      } catch (error) {
        console.error("Error recuperando sesión:", error);
        localStorage.removeItem('lyk_session');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  const login = async (identifier, password) => {
    console.log("Intentando login (Staff/Admin) para:", identifier);
    
    // 1. Buscamos en 'employees'
    let { data: emp, error } = await supabase
      .from('employees')
      .select('*')
      .or(`email.eq.${identifier},document_number.eq.${identifier}`)
      .maybeSingle();

    if (error) throw new Error('Error de conexión al buscar usuario.');

    // 2. Si no es empleado, buscamos en 'workers' (Fallback)
    let isWorker = false;
    if (!emp) {
        const { data: wor } = await supabase
            .from('workers')
            .select('*')
            .or(`document_number.eq.${identifier}`)
            .maybeSingle();
        
        if (wor) {
            emp = wor;
            isWorker = true;
        }
    }

    if (!emp) throw new Error('Usuario no encontrado.');

    // --- AQUÍ ESTÁ EL CAMBIO SOLICITADO (VALIDACIÓN DE ESTADO) ---
    // Si el estado es diferente de 'Activo', bloqueamos el ingreso.
    if (emp.status !== 'Activo') {
        throw new Error(`ACCESO DENEGADO: Tu cuenta está en estado "${emp.status}".`);
    }
    // -------------------------------------------------------------

    // 3. Verificamos contraseña
    if (!emp.password) {
        // Backdoor temporal: DNI como contraseña si no tiene una establecida
        if (password !== emp.document_number) {
           throw new Error('Contraseña no establecida. Intente con su DNI.');
        }
    } else {
        // Usamos bcrypt para comparar
        const isValid = await bcrypt.compare(password, emp.password);
        if (!isValid) throw new Error('Contraseña incorrecta.');
    }

    // 4. DEFINIR ROL Y GUARDAR
    const userRole = isWorker ? 'worker' : (emp.role || 'staff');
    
    // Inyectamos el rol en el objeto usuario
    const userWithRole = { ...emp, role: userRole };
    const sessionData = { user: userWithRole, role: userRole };

    setUser(userWithRole);
    setRole(userRole);
    localStorage.setItem('lyk_session', JSON.stringify(sessionData));

    return { user: userWithRole, role: userRole };
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('lyk_session');
    await supabase.auth.signOut().catch(() => {}); 
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export default AuthProvider;