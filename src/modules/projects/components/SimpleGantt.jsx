import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import AddTaskModal from './AddTaskModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const SimpleGantt = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  
  // Estados para Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null); 
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTasks();

    // [NUEVO] Suscripción a cambios en tiempo real
    const channel = supabase
      .channel(`realtime-tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar TODO: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          // Manejar los diferentes eventos para actualizar el estado localmente sin recargar
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task => task.id === payload.new.id ? payload.new : task));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Limpieza al salir
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true });
    setTasks(data || []);
  };

  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    
    try {
      await supabase.from('project_tasks').delete().eq('id', taskToDelete.id);
      // No hace falta llamar a fetchTasks() porque el listener realtime lo hará,
      // pero por seguridad lo dejamos o confiamos en el evento DELETE.
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Cronograma de Ejecución</h3>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-[#003366] rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <Plus size={16} /> Nueva Etapa
        </button>
      </div>
      
      {/* LISTA DE TAREAS */}
      <div className="space-y-6">
        {tasks.map((task) => {
          const start = new Date(task.start_date);
          const end = new Date(task.end_date);
          const totalDays = (end - start) / (1000 * 60 * 60 * 24);
          
          // Lógica de colores mejorada
          let statusColor = 'bg-slate-200';
          if (task.progress === 100) statusColor = 'bg-emerald-500';
          else if (task.progress > 0) statusColor = 'bg-blue-600';

          return (
            <div key={task.id} className="relative group">
              <div className="flex justify-between mb-2">
                <div className="flex items-center gap-2">
                  {task.progress === 100 ? <CheckCircle2 size={18} className="text-emerald-500"/> : <Circle size={18} className="text-slate-300"/>}
                  <span className={`font-bold capitalize ${task.progress === 100 ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.task_name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                   <span className={`text-xs font-bold px-2 py-1 rounded transition-colors duration-500 ${
                     task.progress === 100 
                       ? 'bg-emerald-100 text-emerald-700' 
                       : 'bg-slate-100 text-slate-500'
                   }`}>
                    {task.progress}%
                   </span>
                   
                   <button 
                     onClick={() => handleDeleteClick(task)}
                     className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"
                     title="Eliminar etapa"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
              
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${statusColor} transition-all duration-1000 ease-out rounded-full`} 
                  style={{ width: `${task.progress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                <span>{new Date(task.start_date).toLocaleDateString()}</span>
                <span>{new Date(task.end_date).toLocaleDateString()} ({Math.ceil(totalDays)} días)</span>
              </div>
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 text-sm font-medium">No hay etapas definidas.</p>
            <p className="text-slate-300 text-xs mt-1">Agrega la primera etapa para armar el cronograma.</p>
          </div>
        )}
      </div>

      <AddTaskModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchTasks} // Se mantiene como fallback
        projectId={projectId}
      />

      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteTask}
        loading={isDeleting}
        title="¿Eliminar Etapa?"
        message={<span>Se eliminará la etapa <span className="font-bold">"{taskToDelete?.task_name}"</span> del cronograma.</span>}
        warning="Esto afectará el porcentaje de avance total."
      />
    </div>
  );
};

export default SimpleGantt;