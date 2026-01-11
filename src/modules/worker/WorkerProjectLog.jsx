import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { ArrowLeft, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; // Importación correcta
import DailyLog from '../projects/components/DailyLog'; 

const WorkerProjectLog = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Roles permitidos
  const allowedRoles = ['Capataz', 'Operario'];
  const isAllowed = allowedRoles.includes(worker?.category);

  useEffect(() => {
    if (isAllowed && worker?.project_assigned) {
      fetchProjectId();
    } else {
      setLoading(false);
    }
  }, [worker]);

  const fetchProjectId = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('name', worker.project_assigned)
        .single();

      if (error || !data) throw new Error("No se encontró el proyecto asignado.");
      setProjectId(data.id);
    } catch (err) {
      console.error(err);
      setError("Error de asignación. Contacta a RR.HH.");
    } finally {
      setLoading(false);
    }
  };

  // Pantalla: Acceso Denegado
  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200">
          <AlertCircle className="text-slate-400" size={40} />
        </div>
        <h3 className="font-bold text-2xl text-slate-800 mb-2">Solo Personal Autorizado</h3>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          La bitácora está reservada para Capataces y Operarios encargados del reporte.
        </p>
        <button onClick={() => navigate('/worker/dashboard')} className="px-8 py-3 bg-[#003366] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform">
          Volver
        </button>
      </div>
    );
  }

  // Pantalla: Carga
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

  // Pantalla: Error
  if (error || !projectId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="mx-auto mb-4 text-orange-500" size={48} />
        <h3 className="font-bold text-xl text-slate-800">Sin Asignación</h3>
        <p className="text-slate-500 mt-2 mb-6 text-sm">{error || "No tienes un proyecto válido."}</p>
        <button onClick={() => navigate('/worker/dashboard')} className="text-[#003366] font-bold text-sm underline">Regresar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 relative flex flex-col">
      
      {/* HEADER TIPO APP */}
      <div className="bg-[#003366] pb-12 pt-6 px-6 rounded-b-[2.5rem] shadow-xl z-10 shrink-0">
        <div className="flex items-center gap-4 mb-4">
            <button 
                onClick={() => navigate('/worker/dashboard')}
                className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition active:scale-95 text-white"
            >
                <ArrowLeft size={20} />
            </button>
            <span className="text-xs font-bold text-blue-100 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                Reportes Diarios
            </span>
        </div>
        <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Bitácora de Obra</h1>
            <div className="flex items-center gap-2 mt-2 text-blue-200 text-sm">
                <MessageSquare size={16}/> 
                <span className="font-medium truncate">{worker.project_assigned}</span>
            </div>
        </div>
      </div>

      {/* CONTENEDOR DEL CHAT */}
      <div className="flex-1 px-4 -mt-6 relative z-20 flex flex-col">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-[60vh]">
           {/* Componente Reutilizado (Asegúrate que DailyLog se adapte al 100% de altura) */}
           <div className="flex-1 relative">
                <DailyLog projectId={projectId} />
           </div>
        </div>
      </div>

    </div>
  );
};

export default WorkerProjectLog;