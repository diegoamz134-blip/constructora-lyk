import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { UserPlus, HardHat, MoreHorizontal, UserMinus, Search } from 'lucide-react';
import AssignWorkersModal from './AssignWorkersModal';

const ProjectTeam = ({ projectName }) => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [projectName]);

  const fetchTeam = async () => {
    setLoading(true);
    // Buscamos obreros cuyo 'project_assigned' coincida con el nombre de este proyecto
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('project_assigned', projectName)
      .eq('status', 'Activo');
    
    setTeam(data || []);
    setLoading(false);
  };

  // Función para sacar a un obrero del proyecto (lo deja "Sin asignar")
  const handleUnassign = async (workerId) => {
    if(!confirm("¿Liberar a este obrero del proyecto? Pasará a estar 'Sin asignar'.")) return;

    await supabase
      .from('workers')
      .update({ project_assigned: 'Sin asignar' }) // O podrías poner null
      .eq('id', workerId);
    
    fetchTeam(); // Recargar lista
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Equipo en Obra</h3>
          <p className="text-slate-400 text-sm">{team.length} operarios asignados activamente.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors shadow-md active:scale-95"
        >
          <UserPlus size={18} /> Derivar Personal
        </button>
      </div>

      {/* Lista de Personal */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Cargando equipo...</div>
      ) : team.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <HardHat size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No hay personal asignado a esta obra.</p>
          <p className="text-slate-400 text-sm">Usa el botón "Derivar Personal" para traer gente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((worker) => (
            <div key={worker.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-md transition-shadow bg-slate-50/30 group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                  worker.category === 'Operario' ? 'bg-amber-500' : 
                  worker.category === 'Oficial' ? 'bg-blue-500' : 'bg-slate-400'
                }`}>
                  {worker.full_name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-slate-700 text-sm">{worker.full_name}</h4>
                  <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {worker.category}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => handleUnassign(worker.id)}
                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Desvincular del proyecto"
              >
                <UserMinus size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Derivar */}
      <AssignWorkersModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTeam}
        projectName={projectName} // Pasamos el nombre para que la DB sepa a dónde enviarlos
      />

    </div>
  );
};

export default ProjectTeam;