import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Cargar sesión al iniciar
    const storedSession = localStorage.getItem('lyk_worker_session');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      
      // Validación extra al recargar: si cambió a inactivo, lo sacamos
      if (parsed.status && parsed.status !== 'Activo') {
         localStorage.removeItem('lyk_worker_session');
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

      // --- NUEVA VALIDACIÓN DE ESTADO (Para Modal de Acceso Denegado) ---
      if (workerData.status !== 'Activo') {
          return { 
              success: false, 
              isStatusError: true, // Bandera para el Login Page
              status: workerData.status,
              user: workerData, // Datos para el modal
              error: `Cuenta en estado: ${workerData.status}`
          };
      }
      // ------------------------------------------------------------------

      // 2. Verificar contraseña
      let isValid = false;
      if (password === workerData.document_number) {
          isValid = true; // Primer ingreso (DNI = Password)
      } else if (workerData.password) {
          isValid = await bcrypt.compare(password, workerData.password);
      }

      if (!isValid) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      // 3. Guardar sesión
      const sessionData = { ...workerData, role: 'worker' };
      setWorker(sessionData);
      localStorage.setItem('lyk_worker_session', JSON.stringify(sessionData));

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
        // Si le cambiaron el estado mientras estaba logueado, lo sacamos
        if (data.status !== 'Activo') {
            logoutWorker();
            return;
        }

        const updatedSession = { ...data, role: 'worker' };
        setWorker(updatedSession);
        localStorage.setItem('lyk_worker_session', JSON.stringify(updatedSession));
      }
    } catch (error) {
      console.error("Error refrescando obrero:", error);
    }
  };

  // --- LOGOUT ---
  const logoutWorker = () => {
    setWorker(null);
    localStorage.removeItem('lyk_worker_session');
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