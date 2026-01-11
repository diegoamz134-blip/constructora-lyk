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

          // 2. REFRESCAMOS LOS DATOS DESDE LA BASE DE DATOS (SOLUCIÓN)
          // Esto busca si le asignaron una obra nueva o cambiaron su estado
          const { data: freshData, error } = await supabase
            .from('workers')
            .select('*')
            .eq('id', parsedWorker.id)
            .single();

          if (!error && freshData) {
             // Verificamos si sigue activo
             if (freshData.status !== 'Activo') {
                alert("Tu cuenta ha sido desactivada. Contacta a RRHH.");
                logoutWorker();
             } else {
                // Actualizamos el estado y el localStorage con los DATOS NUEVOS
                setWorker(freshData);
                localStorage.setItem('lyk_worker_session', JSON.stringify(freshData));
                console.log("Datos de obrero actualizados:", freshData.project_assigned);
             }
          } else if (error) {
             // Si el usuario fue borrado de la BD, cerramos sesión
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

      // 1. Buscar al obrero por DNI
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

      // 2. Verificar Contraseña
      let isValidPassword = false;
      
      try {
         // Intento 1: Comparar como hash (bcrypt)
         isValidPassword = await bcrypt.compare(password, workerData.password);
      } catch (e) {
         console.warn("No es un hash válido, probando texto plano...");
      }

      // Intento 2: Comparar como texto plano (Legacy)
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
    // Opcional: Redirigir al login si fuera necesario
    // window.location.href = '/login'; 
  };

  return (
    <WorkerAuthContext.Provider value={{ worker, loginWorker, logoutWorker, loading }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};

export const useWorkerAuth = () => useContext(WorkerAuthContext);