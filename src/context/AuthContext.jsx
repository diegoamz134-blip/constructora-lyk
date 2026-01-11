import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

// 1. Creamos el contexto con un valor por defecto para evitar el error "undefined"
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
    // Al cargar, verificamos si hay sesión en localStorage (Login Autónomo)
    const initSession = () => {
      try {
        const storedSession = localStorage.getItem('lyk_session');
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          if (parsedSession.user && parsedSession.role) {
            setUser(parsedSession.user);
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
    console.log("Intentando login autónomo para:", identifier);
    
    // 1. Buscamos en 'employees'
    let { data: emp, error } = await supabase
      .from('employees')
      .select('*')
      .or(`email.eq.${identifier},document_number.eq.${identifier}`)
      .maybeSingle();

    if (error) throw new Error('Error de conexión al buscar usuario.');

    // 2. Si no es empleado, buscamos en 'workers'
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

    // 3. Verificamos contraseña
    if (!emp.password) {
        // Backdoor temporal: DNI como contraseña si no tiene una establecida
        if (password !== emp.document_number) {
           throw new Error('Contraseña no establecida. Intente con su DNI.');
        }
    } else {
        const isValid = await bcrypt.compare(password, emp.password);
        if (!isValid) throw new Error('Contraseña incorrecta.');
    }

    // 4. Guardar sesión
    const userRole = isWorker ? 'worker' : (emp.role || 'staff');
    const sessionData = { user: emp, role: userRole };

    setUser(sessionData.user);
    setRole(sessionData.role);
    localStorage.setItem('lyk_session', JSON.stringify(sessionData));

    return { user: sessionData.user, role: sessionData.role };
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('lyk_session');
    // Limpieza opcional de supabase auth por si acaso
    await supabase.auth.signOut().catch(() => {}); 
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Exportación por defecto para asegurar compatibilidad
export default AuthProvider;