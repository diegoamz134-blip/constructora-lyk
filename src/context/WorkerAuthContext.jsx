import React, { createContext, useState, useContext, useEffect } from 'react';

const WorkerAuthContext = createContext();

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, verificamos si hay una sesión guardada en el navegador
    const storedWorker = localStorage.getItem('lyk_worker_session');
    if (storedWorker) {
      try {
        setWorker(JSON.parse(storedWorker));
      } catch (error) {
        console.error("Error al recuperar sesión:", error);
        localStorage.removeItem('lyk_worker_session');
      }
    }
    setLoading(false);
  }, []);

  // Función para iniciar sesión (se llamará desde el Login)
  const loginWorker = (workerData) => {
    setWorker(workerData);
    localStorage.setItem('lyk_worker_session', JSON.stringify(workerData));
  };

  // Función para cerrar sesión
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