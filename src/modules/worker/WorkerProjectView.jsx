import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
// Asegúrate de que la ruta a tu utilidad de compresión sea correcta
import { compressImage } from '../../utils/imageCompressor'; 
import { 
  ArrowLeft, CalendarDays, Camera, Loader2, 
  MapPin, CheckCircle2, Circle, Upload, Clock, ImagePlus 
} from 'lucide-react';

const WorkerProjectView = () => {
  const { worker } = useOutletContext();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'gallery'
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Referencia al input oculto que abre la cámara
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (worker?.project_assigned) {
      fetchProjectData();
    } else {
      setLoading(false);
    }
  }, [worker]);

  const fetchProjectData = async () => {
    try {
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('name', worker.project_assigned)
        .single();

      if (projError) throw projError;
      setProject(projData);

      const { data: taskData, error: taskError } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projData.id)
        .order('start_date', { ascending: true });

      if (taskError) throw taskError;
      setTasks(taskData || []);

    } catch (err) {
      console.error("Error cargando proyecto:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async (taskId, newProgress) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
    try {
      const status = newProgress === 100 ? 'Completado' : newProgress > 0 ? 'En Progreso' : 'Pendiente';
      const { error } = await supabase.from('project_tasks').update({ progress: newProgress, status: status }).eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error("Error actualizando tarea:", err);
      fetchProjectData();
    }
  };

  // --- FUNCIÓN PARA SUBIR FOTO ---
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona solo archivos de imagen.');
        return;
    }

    setUploading(true);

    try {
      console.log("Comprimiendo imagen...");
      const compressed = await compressImage(file);
      const fileName = `avance_${worker.document_number}_${Date.now()}.jpg`;

      console.log("Subiendo a Supabase...");
      // Asegúrate de tener un bucket público llamado 'project-gallery' en Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-gallery')
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-gallery')
        .getPublicUrl(fileName);

      console.log("Registrando en base de datos...");
      await supabase.from('project_gallery').insert([{
        project_id: project.id,
        image_url: publicUrl,
        description: `Avance reportado por ${worker.full_name}`,
        week_number: 1 // Podrías calcular esto dinámicamente
      }]);

      alert("¡Foto de avance subida correctamente!");
    } catch (error) {
      console.error("Error en el proceso de subida:", error);
      alert("Error al subir la foto: " + (error.message || "Inténtalo de nuevo."));
    } finally {
      setUploading(false);
      // Limpiar el input para poder subir la misma foto si es necesario
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Función helper para activar el input oculto
  const triggerCamera = () => {
    if (fileInputRef.current && !uploading) {
        fileInputRef.current.click();
    }
  };


  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-[#003366] mb-2" size={32} />
      <p className="text-slate-400 text-sm font-medium">Cargando obra...</p>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
        <MapPin className="text-slate-400" size={32} />
      </div>
      <h3 className="font-bold text-lg text-slate-800">Sin Proyecto Asignado</h3>
      <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
        Actualmente no tienes una obra asignada. Contacta a tu supervisor.
      </p>
      <button onClick={() => navigate('/worker/dashboard')} className="mt-8 px-6 py-3 bg-[#003366] text-white rounded-xl font-bold text-sm">
        Volver al Inicio
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 relative">
      
      {/* HEADER */}
      <div className="bg-[#003366] text-white pt-6 pb-12 px-6 rounded-b-[2.5rem] shadow-xl relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/worker/dashboard')} className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition backdrop-blur-md active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-blue-50 tracking-wide border border-white/10">
            MI OBRA ACTUAL
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight mb-2">{project.name}</h1>
          <div className="flex items-center gap-2 text-blue-200 text-sm font-medium">
            <MapPin size={16} className="shrink-0" /><span className="truncate">{project.location}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 -mt-6 relative z-20">
        <div className="bg-white p-1.5 rounded-2xl shadow-lg border border-slate-100 flex">
          <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'bg-slate-100 text-[#003366] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <CalendarDays size={18} /> Cronograma
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'bg-slate-100 text-[#003366] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <Camera size={18} /> Evidencias
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="p-6">
        
        {/* VISTA CRONOGRAMA */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Tareas Pendientes</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">{tasks.length}</span>
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                <Clock className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-400 text-sm font-medium">No hay tareas registradas aún.</p>
              </div>
            ) : (
              tasks.map(task => {
                const isCompleted = task.progress === 100;
                return (
                  <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div onClick={() => updateTaskProgress(task.id, isCompleted ? 0 : 100)} className="cursor-pointer">
                           {isCompleted ? <CheckCircle2 className="text-emerald-500 fill-emerald-50" size={24} /> : <Circle className="text-slate-300" size={24} />}
                        </div>
                        <div>
                           <h4 className={`font-bold text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.task_name}</h4>
                           <p className="text-[10px] text-slate-400 font-medium">{new Date(task.start_date).toLocaleDateString()} - {new Date(task.end_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full border ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{task.progress}%</span>
                    </div>
                    <div className="mt-4 px-1">
                      <input type="range" min="0" max="100" value={task.progress} onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#003366]"/>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* VISTA SUBIR FOTOS (GALERÍA) - MEJORADA */}
        {activeTab === 'gallery' && (
          <div className="flex flex-col items-center justify-center py-6 animate-in slide-in-from-bottom-4 duration-500 space-y-6">
            
            {/* Tarjeta de "Estado Vacío" con botón de acción */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 w-full text-center">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-md ring-1 ring-blue-100">
                <ImagePlus size={40} className="text-[#003366]" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mb-3">Registrar Avance</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Toma una foto del trabajo realizado para reportarlo al residente de obra.
              </p>

              {/* BOTÓN CENTRAL VISIBLE */}
              <button 
                onClick={triggerCamera}
                disabled={uploading}
                className="px-8 py-4 bg-blue-50 text-[#003366] rounded-2xl font-bold text-sm flex items-center justify-center gap-3 mx-auto hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm active:scale-95 disabled:opacity-70"
              >
                 {uploading ? <Loader2 className="animate-spin" /> : <><Camera size={20} /> Abrir Cámara Ahora</>}
              </button>
            </div>

            {/* Input oculto esencial */}
            <input 
              type="file" 
              accept="image/*"
              capture="environment" // Fuerza cámara trasera
              ref={fileInputRef}
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        )}

      </div>

      {/* BOTÓN FLOTANTE INFERIOR (Solo en Galería como refuerzo) */}
      {activeTab === 'gallery' && (
        <div className="fixed bottom-6 inset-x-6 z-30">
          <button 
            onClick={triggerCamera}
            disabled={uploading}
            className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-transform flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed border-t border-blue-400/20"
          >
            {uploading ? <Loader2 className="animate-spin w-6 h-6" /> : <><Upload size={24} /> Subir Evidencia</>}
          </button>
        </div>
      )}

    </div>
  );
};

export default WorkerProjectView;