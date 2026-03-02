import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 horas en milisegundos

  useEffect(() => {
    // 1. Cargar sesión al iniciar (CAMBIO a sessionStorage)
    const storedSession = sessionStorage.getItem('lyk_worker_session');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      
      // NUEVO: Verificamos si expiró por tiempo (ej. pestaña abierta desde ayer)
      const now = new Date().getTime();
      if (parsed.timestamp && (now - parsed.timestamp > SESSION_TIMEOUT)) {
          sessionStorage.removeItem('lyk_worker_session');
          setLoading(false);
          return;
      }

      // Validación extra al recargar: si cambió a inactivo, lo sacamos
      if (parsed.status && parsed.status !== 'Activo') {
         sessionStorage.removeItem('lyk_worker_session');
      } else {
         setWorker(parsed);
      }
    }
    setLoading(false);
  }, []);

  // --- FUNCIÓN DE LOGIN ---
  const loginWorker = async (documentNumber, password) => {
    try {
      // 1. Buscar obrero
      const { data: workerData, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', documentNumber)
        .single();

      if (error || !workerData) {
        return { success: false, error: 'Obrero no encontrado o DNI incorrecto.' };
      }

      // --- VALIDACIÓN DE ESTADO ---
      if (workerData.status !== 'Activo') {
          return { 
              success: false, 
              isStatusError: true,
              status: workerData.status,
              user: workerData,
              error: `Cuenta en estado: ${workerData.status}`
          };
      }

      // 2. Verificar contraseña
      let isValid = false;
      if (password === workerData.document_number) {
          isValid = true;
      } else if (workerData.password) {
          isValid = await bcrypt.compare(password, workerData.password);
      }

      if (!isValid) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      // 3. Guardar sesión con TIMESTAMP
      const sessionData = { 
          ...workerData, 
          role: 'worker',
          timestamp: new Date().getTime() 
      };
      
      setWorker(sessionData);
      
      // CAMBIO: Guardamos en sessionStorage
      sessionStorage.setItem('lyk_worker_session', JSON.stringify(sessionData));

      return { success: true, data: sessionData };

    } catch (err) {
      console.error("Login Worker Error:", err);
      return { success: false, error: 'Error de conexión.' };
    }
  };

  // --- FUNCIÓN PARA REFRESCAR DATOS ---
  const refreshWorker = async () => {
    if (!worker?.id) return;

    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', worker.id)
        .single();

      if (error) throw error;
      
      if (data) {
        if (data.status !== 'Activo') {
            logoutWorker();
            return;
        }

        // Mantenemos el timestamp original para que no se reinicie el contador de 8 horas infinito
        const currentSession = JSON.parse(sessionStorage.getItem('lyk_worker_session') || '{}');
        const updatedSession = { 
            ...data, 
            role: 'worker',
            timestamp: currentSession.timestamp || new Date().getTime()
        };
        
        setWorker(updatedSession);
        sessionStorage.setItem('lyk_worker_session', JSON.stringify(updatedSession));
      }
    } catch (error) {
      console.error("Error refrescando obrero:", error);
    }
  };

  // --- LOGOUT ---
  const logoutWorker = () => {
    setWorker(null);
    sessionStorage.removeItem('lyk_worker_session'); // CAMBIO
  };

  return (
    <WorkerAuthContext.Provider value={{ 
        worker, 
        loginWorker, 
        logoutWorker, 
        refreshWorker, 
        loading 
    }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => {
  const context = useContext(WorkerAuthContext);
  if (context === undefined) {
    throw new Error('useWorkerAuth debe ser usado dentro de un WorkerAuthProvider');
  }
  return context;
};

export default WorkerAuthContext;