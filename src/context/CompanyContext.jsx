// src/context/CompanyContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPayrollConstants, getAfpRates } from '../services/payrollService';

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [constants, setConstants] = useState({});
  const [afpRates, setAfpRates] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Función para cargar/recargar la configuración
  const fetchConfig = async () => {
    try {
      // No ponemos setLoading(true) aquí para evitar parpadeos si es una recarga en segundo plano
      const [cData, aData] = await Promise.all([
        getPayrollConstants(),
        getAfpRates()
      ]);

      // Convertir array de constantes a Objeto { CLAVE: VALOR } para acceso rápido
      const constMap = (cData || []).reduce((acc, item) => ({
        ...acc, 
        [item.key_name]: Number(item.value)
      }), {});

      setConstants(constMap);
      setAfpRates(aData || []);
    } catch (error) {
      console.error("Error cargando configuración global:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Cargar al montar el componente
  useEffect(() => {
    fetchConfig();
  }, []);

  const value = {
    constants,
    afpRates,
    loadingConfig,
    refreshConfig: fetchConfig // Exponemos esto por si alguna página necesita forzar actualización
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

// Custom Hook para usar el contexto fácilmente
export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe usarse dentro de un CompanyProvider');
  }
  return context;
};