import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
// Reutilizamos el componente de Bitácora que ya hiciste para el admin
import DailyLog from '../projects/components/DailyLog'; 

const WorkerProjectLog = () => {
  const { worker } = useOutletContext();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Definir roles permitidos
  const allowedRoles = ['Capataz', 'Operario'];
  const isAllowed = allowedRoles.includes(worker?.category);

  useEffect(() => {
    if (isAllowed && worker?.project_assigned) {
      fetchProjectId();
    } else {
      setLoading(false);
    }
  }, [worker]);

  // 2. Buscar el ID del proyecto usando el nombre guardado en el obrero
  const fetchProjectId = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('name', worker.project_assigned)
        .single();

      if (error || !data) throw new Error("No se encontró el proyecto asignado en el sistema.");
      setProjectId(data.id);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el proyecto. Verifica tu asignación con RR.HH.");
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de Acceso Denegado
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-red-500" size={40} />
        </div>
        <h3 className="font-bold text-2xl text-slate-800 mb-2">Acceso Restringido</h3>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">
          Esta función está reservada para Capataces y Operarios encargados de reportar incidencias.
        </p>
        <button 
          onClick={() => navigate('/worker/dashboard')} 
          className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  // Pantalla de Carga
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="animate-spin text-[#003366]" size={40} />
    </div>
  );

  // Pantalla de Error (Sin proyecto)
  if (error || !projectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mx-auto mb-4 text-orange-500" size={48} />
        <h3 className="font-bold text-xl text-slate-800">Sin Asignación Válida</h3>
        <p className="text-slate-500 mt-2 mb-6">{error || "No tienes un proyecto válido asignado."}</p>
        <button onClick={() => navigate('/worker/dashboard')} className="text-[#003366] font-bold hover:underline">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // VISTA PRINCIPAL
  return (
    <div className="min-h-screen bg-slate-50 pb-6">
      {/* Header Estilo Móvil */}
      <div className="bg-[#003366] text-white p-6 pb-16 rounded-b-[2.5rem] shadow-lg relative z-10">
        <button 
          onClick={() => navigate('/worker/dashboard')}
          className="absolute top-6 left-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center mt-2">
          <h1 className="text-2xl font-bold">Bitácora de Obra</h1>
          <p className="text-blue-200 text-sm font-medium mt-1 truncate px-8">
            {worker.project_assigned}
          </p>
        </div>
      </div>

      {/* Contenedor del Chat (Reusado) */}
      <div className="px-4 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
           {/* Renderizamos el componente DailyLog pasándole el ID real del proyecto */}
           <DailyLog projectId={projectId} />
        </div>
      </div>
    </div>
  );
};

export default WorkerProjectLog;