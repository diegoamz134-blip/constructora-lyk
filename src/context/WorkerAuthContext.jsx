import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      // 1. Intentamos recuperar la sesión guardada
      const storedSession = localStorage.getItem('lyk_worker_session');
      
      if (storedSession) {
        try {
          const parsedWorker = JSON.parse(storedSession);
          
          // Cargamos los datos visualmente rápido
          setWorker(parsedWorker);

          // 2. REFRESCAMOS LOS DATOS DESDE LA BASE DE DATOS
          const { data: freshData, error } = await supabase
            .from('workers')
            .select('*')
            .eq('id', parsedWorker.id)
            .single();

          if (!error && freshData) {
             if (freshData.status !== 'Activo') {
                alert("Tu cuenta ha sido desactivada. Contacta a RRHH.");
                logoutWorker();
             } else {
                setWorker(freshData);
                localStorage.setItem('lyk_worker_session', JSON.stringify(freshData));
             }
          } else if (error) {
             console.warn("Usuario no encontrado en BD, cerrando sesión.");
             logoutWorker();
          }

        } catch (error) {
          console.error("Error al recuperar sesión de obrero:", error);
          localStorage.removeItem('lyk_worker_session');
        }
      }
      setLoading(false);
    };

    initSession();
  }, []);

  const loginWorker = async (documentNumber, password) => {
    try {
      console.log("Intentando login obrero:", documentNumber);

      const { data: workerData, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', documentNumber)
        .single();

      if (error || !workerData) {
        return { success: false, error: 'DNI no encontrado en el sistema.' };
      }

      if (workerData.status !== 'Activo') {
        return { success: false, error: 'Cuenta inactiva.' };
      }

      let isValidPassword = false;
      try {
         isValidPassword = await bcrypt.compare(password, workerData.password);
      } catch (e) {
         console.warn("No es un hash válido, probando texto plano...");
      }

      if (!isValidPassword && workerData.password === password) {
          isValidPassword = true;
      }

      if (!isValidPassword) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      setWorker(workerData);
      localStorage.setItem('lyk_worker_session', JSON.stringify(workerData));
      
      return { success: true, data: workerData };

    } catch (err) {
      console.error("Error login worker:", err);
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const logoutWorker = () => {
    setWorker(null);
    localStorage.removeItem('lyk_worker_session');
    // window.location.href = '/login'; 
  };

  // --- NUEVA FUNCIÓN AGREGADA: UPDATE PROFILE ---
  const updateProfile = async (updates) => {
    if (!worker) return false;

    try {
      console.log("Actualizando perfil obrero...", updates);

      // 1. Actualizar en Supabase
      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', worker.id)
        .select()
        .single();

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      // 2. Actualizar estado local y localStorage inmediatamente
      setWorker(data);
      localStorage.setItem('lyk_worker_session', JSON.stringify(data));
      
      return true;
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      return false;
    }
  };

  return (
    // IMPORTANTE: Agregamos updateProfile al value del Provider
    <WorkerAuthContext.Provider value={{ worker, loginWorker, logoutWorker, loading, updateProfile }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => useContext(WorkerAuthContext);