import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useWorkerAuth } from '../../context/WorkerAuthContext'; // Importación correcta
import { compressImage } from '../../utils/imageCompressor'; 
import { 
  ArrowLeft, CalendarDays, Camera, Loader2, 
  MapPin, CheckCircle2, Circle, Upload, Clock, ImagePlus, Eye
} from 'lucide-react';

const WorkerProjectView = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]); // Nuevo estado para fotos
  const [activeTab, setActiveTab] = useState('tasks'); 
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
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
      // 1. Proyecto
      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('name', worker.project_assigned)
        .single();

      if (projError) throw projError;
      setProject(projData);

      // 2. Tareas
      const { data: taskData } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projData.id)
        .order('start_date', { ascending: true });
      setTasks(taskData || []);

      // 3. Galería (NUEVO: Traer fotos)
      const { data: galleryData } = await supabase
        .from('project_gallery')
        .select('*')
        .eq('project_id', projData.id)
        .order('created_at', { ascending: false });
      setGalleryImages(galleryData || []);

    } catch (err) {
      console.error("Error cargando proyecto:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async (taskId, newProgress) => {
    // Actualización optimista
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: newProgress } : t));
    try {
      const status = newProgress === 100 ? 'Completado' : newProgress > 0 ? 'En Progreso' : 'Pendiente';
      await supabase.from('project_tasks').update({ progress: newProgress, status: status }).eq('id', taskId);
    } catch (err) {
      console.error("Error actualizando tarea:", err);
      fetchProjectData(); // Revertir si falla
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Solo imágenes por favor.');
        return;
    }

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `avance_${worker.document_number}_${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('project-gallery')
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('project-gallery')
        .getPublicUrl(fileName);

      // Guardar en BD
      const { data: newImg, error: dbError } = await supabase.from('project_gallery').insert([{
        project_id: project.id,
        image_url: publicUrl,
        description: `Avance: ${worker.full_name}`,
        week_number: 1 
      }]).select().single();

      if (dbError) throw dbError;

      // Actualizar galería localmente
      setGalleryImages([newImg, ...galleryImages]);
      alert("¡Foto subida!");

    } catch (error) {
      console.error(error);
      alert("Error al subir foto.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerCamera = () => {
    if (fileInputRef.current && !uploading) fileInputRef.current.click();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

  if (!project) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <MapPin className="text-slate-300 mb-4" size={48} />
      <h3 className="font-bold text-lg text-slate-800">Sin Proyecto</h3>
      <p className="text-slate-500 text-sm mt-2 mb-6">No tienes una obra asignada actualmente.</p>
      <button onClick={() => navigate('/worker/dashboard')} className="px-6 py-3 bg-[#003366] text-white rounded-xl font-bold text-sm">Volver</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 relative">
      
      {/* HEADER INMERSIVO */}
      <div className="bg-[#003366] text-white pt-6 pb-16 px-6 rounded-b-[2.5rem] shadow-xl relative z-10">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/worker/dashboard')} className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition backdrop-blur-md active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <span className="text-[10px] font-bold bg-[#f0c419] text-[#003366] px-3 py-1 rounded-full tracking-wider shadow-sm">
            EN EJECUCIÓN
          </span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight mb-2 line-clamp-2">{project.name}</h1>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wide">
            <MapPin size={14} className="shrink-0" /><span className="truncate">{project.location}</span>
          </div>
        </div>
      </div>

      {/* TABS FLOTANTES */}
      <div className="px-6 -mt-8 relative z-20">
        <div className="bg-white p-1.5 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex">
          <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'tasks' ? 'bg-slate-100 text-[#003366] shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>
            <CalendarDays size={16} /> CRONOGRAMA
          </button>
          <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'gallery' ? 'bg-slate-100 text-[#003366] shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>
            <Camera size={16} /> FOTOS
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="p-6">
        
        {/* VISTA 1: CRONOGRAMA */}
        {activeTab === 'tasks' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 text-sm font-medium">Cronograma no disponible.</p>
              </div>
            ) : (
              tasks.map(task => {
                const isCompleted = task.progress === 100;
                return (
                  <div key={task.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-3">
                        <div onClick={() => updateTaskProgress(task.id, isCompleted ? 0 : 100)} className="cursor-pointer mt-0.5">
                           {isCompleted ? <CheckCircle2 className="text-emerald-500 fill-emerald-50" size={22} /> : <Circle className="text-slate-300" size={22} />}
                        </div>
                        <div>
                           <h4 className={`font-bold text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.task_name}</h4>
                           <p className="text-[10px] text-slate-400 font-bold mt-1 bg-slate-50 px-2 py-0.5 rounded-md inline-block">
                              {new Date(task.start_date).toLocaleDateString()}
                           </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full border ${isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{task.progress}%</span>
                    </div>
                    {/* Barra de Progreso Mejorada */}
                    <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-[#003366]'}`} 
                            style={{width: `${task.progress}%`}}
                        />
                    </div>
                    <input 
                        type="range" min="0" max="100" 
                        value={task.progress} 
                        onChange={(e) => updateTaskProgress(task.id, parseInt(e.target.value))} 
                        className="w-full h-6 opacity-0 absolute left-0 -mt-4 cursor-pointer" // Slider invisible sobre la barra para mejor touch
                    />
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* VISTA 2: GALERÍA (CON GRID DE FOTOS) */}
        {activeTab === 'gallery' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 pb-20">
            
            {/* Grid de Fotos */}
            {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {galleryImages.map((img) => (
                        <div key={img.id} className="aspect-square rounded-2xl overflow-hidden relative group shadow-sm bg-white border border-slate-100">
                            <img src={img.image_url} alt="Avance" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"/>
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a href={img.image_url} target="_blank" rel="noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                                    <Eye size={16}/>
                                </a>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                <p className="text-[9px] text-white/90 truncate">{new Date(img.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white rounded-[2rem] border border-slate-100 mb-6">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ImagePlus size={30} className="text-slate-300"/>
                    </div>
                    <p className="text-slate-400 text-xs">Sin evidencias fotográficas.</p>
                </div>
            )}

            {/* Input oculto */}
            <input 
              type="file" 
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        )}

      </div>

      {/* BOTÓN FLOTANTE (Solo Galería) */}
      {activeTab === 'gallery' && (
        <div className="fixed bottom-24 inset-x-6 z-30">
          <button 
            onClick={triggerCamera}
            disabled={uploading}
            className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-900/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/10"
          >
            {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Camera size={20} /> AGREGAR FOTO</>}
          </button>
        </div>
      )}

    </div>
  );
};

export default WorkerProjectView;