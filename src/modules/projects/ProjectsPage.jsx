import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// IMPORTACIÓN NUEVA: Usamos el servicio en lugar de supabase directo
import { getProjects, deleteProjectCascade } from '../../services/projectsService'; 
import { 
  Building2, Image as ImageIcon, MessageSquare, 
  CalendarDays, MapPin, Calendar, Plus, ArrowLeft, 
  Pencil, Trash2, Users
} from 'lucide-react';

// Sub-componentes
import ProjectGallery from './components/ProjectGallery';
import DailyLog from './components/DailyLog';
import SimpleGantt from './components/SimpleGantt';
import CreateProjectModal from './components/CreateProjectModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import ProjectTeam from './components/ProjectTeam';

const ProjectsPage = () => {
  const [projectsList, setProjectsList] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToEdit, setProjectToEdit] = useState(null);
  
  // Estados para Modal de Eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para Tabs y Carga
  const [activeTab, setActiveTab] = useState('gantt');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cargar lista de proyectos al iniciar
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // USO DEL SERVICIO
      const data = await getProjects();
      setProjectsList(data);
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para abrir modal en modo CREAR
  const handleCreate = () => {
    setProjectToEdit(null);
    setIsModalOpen(true);
  };

  // Manejador para abrir modal en modo EDITAR
  const handleEdit = (e, project) => {
    e.stopPropagation(); // Evita entrar al detalle del proyecto
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  // Manejador para abrir el Modal de Eliminación
  const handleDeleteClick = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  // Lógica real de eliminación (se ejecuta al confirmar en el modal)
  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);

    try {
      // USO DEL SERVICIO: Toda la lógica compleja está ahora en projectsService
      await deleteProjectCascade(projectToDelete);
      
      // Limpiar y recargar
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // --- VISTA DETALLE DEL PROYECTO ---
  if (selectedProject) {
    return (
      <div className="space-y-6 pb-10">
        {/* Botón Volver */}
        <button 
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#003366] font-bold text-sm transition-colors mb-2"
        >
          <ArrowLeft size={18} /> Volver a la lista
        </button>

        {/* Header del Proyecto Seleccionado */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-[#003366]" /> {selectedProject.name}
            </h1>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin size={16}/> {selectedProject.location}</span>
              <span className="flex items-center gap-1"><Calendar size={16}/> Entrega: {selectedProject.end_date}</span>
            </div>
          </div>
          <div className="px-4 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-bold border border-green-100">
            {selectedProject.status}
          </div>
        </div>

        {/* Tabs de Navegación */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'gantt'} onClick={() => setActiveTab('gantt')} icon={CalendarDays} label="Cronograma" />
          <TabButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={Users} label="Personal" />
          <TabButton active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={MessageSquare} label="Bitácora" />
          <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={ImageIcon} label="Galería" />
        </div>

        {/* Contenido Dinámico */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'gantt' && <SimpleGantt projectId={selectedProject.id} />}
          {activeTab === 'team' && <ProjectTeam projectName={selectedProject.name} />}
          {activeTab === 'log' && <DailyLog projectId={selectedProject.id} />}
          {activeTab === 'gallery' && <ProjectGallery projectId={selectedProject.id} />}
        </motion.div>
      </div>
    );
  }

  // --- VISTA LISTA DE PROYECTOS (DEFAULT) ---
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Mis Proyectos</h2>
          <p className="text-slate-500 text-sm">Gestiona el avance y recursos de tus obras.</p>
        </div>
        <button 
          onClick={handleCreate} 
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Cargando proyectos...</div>
      ) : projectsList.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center flex flex-col items-center">
          <Building2 size={48} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Aún no tienes proyectos</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs">Registra tu primera obra para comenzar a gestionar el cronograma y personal.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectsList.map((proj) => (
            <div 
              key={proj.id} 
              onClick={() => setSelectedProject(proj)}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] group-hover:bg-[#f0c419] transition-colors"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                  <Building2 size={24} className="text-slate-600 group-hover:text-[#003366]" />
                </div>
                
                {/* Botones de Acción */}
                <div className="flex gap-1">
                  <button 
                    onClick={(e) => handleEdit(e, proj)} 
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={18}/>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteClick(e, proj)} 
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-[#003366] transition-colors">{proj.name}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-1 mb-6"><MapPin size={14}/> {proj.location}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100">
                  {proj.status}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  Inicio: {new Date(proj.start_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {/* CORRECCIÓN AQUÍ: Se cambió onSuccess por onProjectCreated */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProjectCreated={fetchProjects} 
        projectToEdit={projectToEdit}
      />

      {/* Modal de Eliminación con Estilo */}
      <ConfirmDeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        projectName={projectToDelete?.name}
        loading={isDeleting}
      />
    </div>
  );
};

// Componente Helper para los botones de las pestañas
const TabButton = ({ active, onClick, icon: Icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
      active 
        ? 'bg-[#003366] text-white shadow-lg shadow-blue-900/20' 
        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
    }`}
  >
    <Icon size={18} /> {label}
  </button>
);

export default ProjectsPage;