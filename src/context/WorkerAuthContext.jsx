import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabase';
import bcrypt from 'bcryptjs';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión persistente al recargar
    const storedWorker = localStorage.getItem('lyk_worker_session');
    if (storedWorker) {
      try {
        setWorker(JSON.parse(storedWorker));
      } catch (error) {
        console.error("Error al recuperar sesión de obrero:", error);
        localStorage.removeItem('lyk_worker_session');
      }
    }
    setLoading(false);
  }, []);

  const loginWorker = async (documentNumber, password) => {
    try {
      console.log("Intentando login obrero:", documentNumber);

      // 1. Buscar al obrero por DNI
      const { data: workerData, error } = await supabase
        .from('workers')
        .select('*')
        .eq('document_number', documentNumber)
        .single();

      if (error || !workerData) {
        return { success: false, error: 'DNI no encontrado en el sistema.' };
      }

      // 2. Verificar Contraseña
      // Intentamos comparar con bcrypt (hash)
      let isValidPassword = false;
      
      try {
         // bcrypt.compare(textoPlano, hashDeLaBD)
         isValidPassword = await bcrypt.compare(password, workerData.password);
      } catch (e) {
         // Si falla bcrypt, puede ser una contraseña antigua en texto plano (ej: "1234")
         console.warn("Fallo verificación hash, intentando texto plano...");
      }

      // Si bcrypt dijo falso (o falló), probamos comparación directa (Legacy/Default)
      if (!isValidPassword && workerData.password === password) {
          isValidPassword = true;
      }

      if (!isValidPassword) {
        return { success: false, error: 'Contraseña incorrecta.' };
      }

      // 3. Login Exitoso
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
  };

  return (
    <WorkerAuthContext.Provider value={{ worker, loginWorker, logoutWorker, loading }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => useContext(WorkerAuthContext);