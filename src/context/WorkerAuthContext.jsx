import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs'; // Importante: Necesitamos bcrypt aquí también

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initWorker = () => {
        const stored = localStorage.getItem('lyk_worker_session');
        if (stored) {
          try {
            setWorker(JSON.parse(stored));
          } catch (e) {
            console.error("Error recuperando sesión obrero", e);
            localStorage.removeItem('lyk_worker_session');
          }
        }
        setLoading(false);
    };
    initWorker();
  }, []);

  const loginWorker = async (documentNumber, password) => {
    try {
      console.log("👷 Intentando login obrero:", documentNumber);

      // 1. Buscar usuario en Supabase
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', documentNumber)
        .eq('status', 'Activo')
        .maybeSingle();

      if (error) {
          console.error("Error DB Obrero:", error);
          return { success: false, error: 'Error de conexión con la base de datos.' };
      }

      if (!data) {
        return { success: false, error: 'DNI no encontrado o inactivo.' };
      }

      // 2. Verificar Contraseña (Soporte Híbrido: Hash o Texto Plano)
      let isValid = false;

      // Caso A: La contraseña en DB es un hash de bcrypt (empieza con $2a$ o $2b$)
      if (data.password && (data.password.startsWith('$2a$') || data.password.startsWith('$2b$'))) {
          // Usamos compareSync para validar el hash
          isValid = bcrypt.compareSync(password, data.password);
      } 
      // Caso B: La contraseña es texto plano (Legacy o migraciones antiguas)
      else {
          isValid = (data.password === password);
      }

      if (!isValid) {
          return { success: false, error: 'Contraseña incorrecta.' };
      }

      // 3. Login Exitoso
      console.log("✅ Login obrero exitoso:", data.full_name);
      
      // Sanitizamos el objeto antes de guardarlo (quitamos el password por seguridad)
      const sessionData = { ...data };
      delete sessionData.password;
      
      setWorker(sessionData);
      localStorage.setItem('lyk_worker_session', JSON.stringify(sessionData));
      
      return { success: true };

    } catch (err) {
      console.error("Error crítico login worker:", err);
      return { success: false, error: 'Error inesperado.' };
    }
  };

  const logoutWorker = () => {
    setWorker(null);
    localStorage.removeItem('lyk_worker_session');
  };

  return (
    <WorkerAuthContext.Provider value={{ worker, loginWorker, logoutWorker, loading }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => useContext(WorkerAuthContext);