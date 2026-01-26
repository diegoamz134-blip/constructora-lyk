import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const storedSession = localStorage.getItem('lyk_worker_session');
      
      if (storedSession) {
        try {
          const parsedWorker = JSON.parse(storedSession);
          
          // CORRECCIÓN: Forzamos el rol en la carga inicial
          setWorker({ ...parsedWorker, role: 'worker' });

          // Refrescamos datos de BD
          const { data: freshData, error } = await supabase
            .from('workers')
            .select('*')
            .eq('id', parsedWorker.id)
            .single();

          if (!error && freshData) {
             if (freshData.status !== 'Activo') {
                logoutWorker();
             } else {
                // CORRECCIÓN: Forzamos el rol al actualizar desde BD
                const workerWithRole = { ...freshData, role: 'worker' };
                setWorker(workerWithRole);
                localStorage.setItem('lyk_worker_session', JSON.stringify(workerWithRole));
             }
          } else if (error) {
             logoutWorker();
          }

        } catch (error) {
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
        return { success: false, error: 'DNI no encontrado.' };
      }

      if (workerData.status !== 'Activo') {
        return { success: false, error: 'Cuenta inactiva.' };
      }

      let isValidPassword = false;
      try {
         isValidPassword = await bcrypt.compare(password, workerData.password);
      } catch (e) {
         // Fallback texto plano
      }

      if (!isValidPassword && workerData.password === password) {
          isValidPassword = true;
      }

      if (!isValidPassword) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      // CORRECCIÓN: Inyectamos el rol antes de guardar
      const workerWithRole = { ...workerData, role: 'worker' };
      setWorker(workerWithRole);
      localStorage.setItem('lyk_worker_session', JSON.stringify(workerWithRole));
      
      return { success: true, data: workerWithRole };

    } catch (err) {
      console.error("Error login worker:", err);
      return { success: false, error: 'Error de conexión.' };
    }
  };

  const logoutWorker = () => {
    setWorker(null);
    localStorage.removeItem('lyk_worker_session');
  };

  const updateProfile = async (updates) => {
    if (!worker) return false;

    try {
      const { data, error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', worker.id)
        .select()
        .single();

      if (error) throw error;

      // CORRECCIÓN: Mantenemos el rol al actualizar perfil
      const updatedWorker = { ...data, role: 'worker' };
      setWorker(updatedWorker);
      localStorage.setItem('lyk_worker_session', JSON.stringify(updatedWorker));
      
      return true;
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      return false;
    }
  };

  return (
    <WorkerAuthContext.Provider value={{ worker, loginWorker, logoutWorker, loading, updateProfile }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => useContext(WorkerAuthContext);