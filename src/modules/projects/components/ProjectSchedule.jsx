import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle, Clock, AlertTriangle, 
  Edit2, Save, X, Trash2, Plus, Loader2 
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../context/AuthContext';
import Swal from 'sweetalert2';

const ProjectSchedule = ({ projectId }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal de Edición de Avance
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [progressUpdate, setProgressUpdate] = useState(0);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [saving, setSaving] = useState(false);

  // Estado para el Modal de Crear Tarea
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    task_name: '',
    start_date: '',
    end_date: '',
    progress: 0,
    status: 'Pendiente'
  });

  // PERMISOS: Admin, Gerencia y RESIDENTE DE OBRA
  const canEdit = ['admin', 'gerencia_general', 'gerente_proyectos', 'residente_obra'].includes(user?.role);

  useEffect(() => {
    if (projectId) fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error cargando cronograma:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE ACTUALIZACIÓN DE AVANCE ---
  const openEditModal = (task) => {
    setSelectedTask(task);
    setProgressUpdate(task.progress || 0);
    setStatusUpdate(task.status || 'Pendiente');
    setIsEditModalOpen(true);
  };

  const handleUpdateProgress = async () => {
    setSaving(true);
    try {
        // Lógica automática de estado según porcentaje
        let finalStatus = statusUpdate;
        if (progressUpdate === 100) finalStatus = 'Completado';
        else if (progressUpdate > 0 && progressUpdate < 100) finalStatus = 'En Progreso';
        else if (progressUpdate === 0) finalStatus = 'Pendiente';

        const { error } = await supabase
            .from('project_tasks')
            .update({ 
                progress: progressUpdate,
                status: finalStatus,
                // Opcional: Podrías guardar la fecha de actualización si tuvieras un campo 'last_updated'
            })
            .eq('id', selectedTask.id);

        if (error) throw error;

        await fetchTasks(); // Recargar datos
        setIsEditModalOpen(false);
        Swal.fire({ icon: 'success', title: 'Avance actualizado', timer: 1500, showConfirmButton: false });

    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    } finally {
        setSaving(false);
    }
  };

  // --- LÓGICA DE CREACIÓN DE TAREA ---
  const handleCreateTask = async () => {
      if (!newTask.task_name || !newTask.start_date || !newTask.end_date) {
          Swal.fire('Atención', 'Complete los campos obligatorios', 'warning');
          return;
      }
      setSaving(true);
      try {
          const { error } = await supabase.from('project_tasks').insert([{
              ...newTask,
              project_id: projectId
          }]);

          if (error) throw error;

          await fetchTasks();
          setIsCreateModalOpen(false);
          setNewTask({ task_name: '', start_date: '', end_date: '', progress: 0, status: 'Pendiente' });
          Swal.fire({ icon: 'success', title: 'Tarea creada', timer: 1500, showConfirmButton: false });
      } catch (error) {
          Swal.fire('Error', error.message, 'error');
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteTask = async (id) => {
      const result = await Swal.fire({
          title: '¿Eliminar tarea?',
          text: "Esto afectará la Curva S del proyecto.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Sí, eliminar'
      });

      if (result.isConfirmed) {
          try {
              const { error } = await supabase.from('project_tasks').delete().eq('id', id);
              if (error) throw error;
              fetchTasks();
          } catch (error) {
              Swal.fire('Error', 'No se pudo eliminar', 'error');
          }
      }
  };

  // --- HELPERS VISUALES ---
  const getStatusColor = (status) => {
      switch(status) {
          case 'Completado': return 'bg-green-100 text-green-700 border-green-200';
          case 'En Progreso': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'Retrasado': return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  const getDuration = (start, end) => {
      const diff = new Date(end) - new Date(start);
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día de inicio
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#003366]" size={32}/></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* HEADER DE LA TABLA */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-[#003366]" size={20}/> Cronograma de Actividades
              </h3>
              <p className="text-sm text-slate-500">Gestión de tareas y control de avance físico</p>
          </div>
          {canEdit && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#003366] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20"
              >
                  <Plus size={18}/> Nueva Tarea
              </button>
          )}
      </div>

      {/* TABLA DE TAREAS */}
      <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <tr>
                      <th className="p-4 border-b border-slate-100">Actividad / Partida</th>
                      <th className="p-4 border-b border-slate-100 text-center">Duración</th>
                      <th className="p-4 border-b border-slate-100">Fechas</th>
                      <th className="p-4 border-b border-slate-100 text-center">Avance</th>
                      <th className="p-4 border-b border-slate-100 text-center">Estado</th>
                      {canEdit && <th className="p-4 border-b border-slate-100 text-right">Acciones</th>}
                  </tr>
              </thead>
              <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
                  {tasks.length === 0 ? (
                      <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                              No hay tareas registradas en este proyecto.
                          </td>
                      </tr>
                  ) : (
                      tasks.map((task) => (
                          <tr key={task.id} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="p-4 font-bold text-slate-800 max-w-xs">{task.task_name}</td>
                              <td className="p-4 text-center">
                                  <span className="bg-slate-100 px-2 py-1 rounded-lg text-xs font-bold text-slate-600">
                                      {getDuration(task.start_date, task.end_date)} días
                                  </span>
                              </td>
                              <td className="p-4">
                                  <div className="flex flex-col text-xs">
                                      <span className="text-green-600 font-medium">I: {task.start_date}</span>
                                      <span className="text-red-500 font-medium">F: {task.end_date}</span>
                                  </div>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                                            style={{ width: `${task.progress}%` }}
                                          />
                                      </div>
                                      <span className="text-xs font-bold w-8 text-right">{task.progress}%</span>
                                  </div>
                              </td>
                              <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>
                                      {task.status}
                                  </span>
                              </td>
                              {canEdit && (
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => openEditModal(task)}
                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200"
                                            title="Actualizar Avance"
                                          >
                                              <Edit2 size={16}/>
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200"
                                            title="Eliminar Tarea"
                                          >
                                              <Trash2 size={16}/>
                                          </button>
                                      </div>
                                  </td>
                              )}
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>

      {/* MODAL: ACTUALIZAR AVANCE */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800">Actualizar Avance</h3>
                          <p className="text-sm text-slate-500 truncate max-w-[250px]">{selectedTask?.task_name}</p>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                  </div>

                  <div className="space-y-6">
                      {/* Control Deslizante de Progreso */}
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-sm font-bold text-slate-700">Porcentaje Completado</label>
                              <span className="text-xl font-black text-[#003366]">{progressUpdate}%</span>
                          </div>
                          <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={progressUpdate} 
                              onChange={(e) => setProgressUpdate(parseInt(e.target.value))}
                              className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#003366]"
                          />
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                              <span>0% (Inicio)</span>
                              <span>50% (Mitad)</span>
                              <span>100% (Fin)</span>
                          </div>
                      </div>

                      {/* Estado (Calculado o Manual) */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Estado de la Actividad</label>
                          <select 
                              value={statusUpdate} 
                              onChange={(e) => setStatusUpdate(e.target.value)}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#003366] font-medium"
                          >
                              <option value="Pendiente">Pendiente</option>
                              <option value="En Progreso">En Progreso</option>
                              <option value="Retrasado">Retrasado</option>
                              <option value="Paralizado">Paralizado</option>
                              <option value="Completado">Completado</option>
                          </select>
                      </div>

                      <div className="pt-2">
                          <button 
                              onClick={handleUpdateProgress} 
                              disabled={saving}
                              className="w-full py-3 bg-[#003366] hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                          >
                              {saving ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Guardar Avance</>}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: CREAR TAREA */}
      {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Nueva Actividad</h3>
                      <button onClick={() => setIsCreateModalOpen(false)}><X size={24} className="text-slate-400"/></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Actividad</label>
                          <input 
                              className="w-full p-3 border border-slate-200 rounded-xl mt-1 outline-none focus:border-[#003366]"
                              placeholder="Ej: Vaciado de Concreto Zapatas"
                              value={newTask.task_name}
                              onChange={(e) => setNewTask({...newTask, task_name: e.target.value})}
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Inicio</label>
                              <input 
                                  type="date"
                                  className="w-full p-3 border border-slate-200 rounded-xl mt-1 outline-none focus:border-[#003366]"
                                  value={newTask.start_date}
                                  onChange={(e) => setNewTask({...newTask, start_date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Fin Estimado</label>
                              <input 
                                  type="date"
                                  className="w-full p-3 border border-slate-200 rounded-xl mt-1 outline-none focus:border-[#003366]"
                                  value={newTask.end_date}
                                  onChange={(e) => setNewTask({...newTask, end_date: e.target.value})}
                              />
                          </div>
                      </div>
                      <button 
                          onClick={handleCreateTask}
                          disabled={saving}
                          className="w-full py-3 mt-2 bg-[#003366] text-white rounded-xl font-bold hover:bg-blue-900 flex justify-center items-center gap-2"
                      >
                          {saving ? <Loader2 className="animate-spin"/> : <><Plus size={20}/> Agregar al Cronograma</>}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ProjectSchedule;