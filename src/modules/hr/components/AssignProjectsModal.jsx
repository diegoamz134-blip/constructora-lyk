import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Building2, MapPin, Search, 
  CheckCircle2, Circle, CheckSquare, Square, 
  Filter, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProjects, getUserProjectIds, updateUserProjectAssignments } from '../../../services/projectsService';

const AssignProjectsModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [projects, setProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && user) {
      loadData();
      setSearchTerm(''); // Reiniciar búsqueda
    }
  }, [isOpen, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allProjects = await getProjects();
      setProjects(allProjects || []);
      const assigned = await getUserProjectIds(user.id);
      setSelectedIds(assigned);
    } catch (error) {
      console.error("Error cargando asignaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar proyectos según búsqueda
  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [projects, searchTerm]);

  // Manejar selección individual (Toggle: Pone o Quita)
  const toggleProject = (projectId) => {
    setSelectedIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId); // QUITAR (Deseleccionar)
      } else {
        return [...prev, projectId]; // PONER (Seleccionar)
      }
    });
  };

  // Manejar selección masiva (Solo de los visibles/filtrados)
  const handleSelectAll = () => {
    const visibleIds = filteredProjects.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Si todos los visibles están marcados, desmarcarlos (QUITAR MASIVO)
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      // Si falta alguno, marcar todos los visibles (PONER MASIVO)
      const newIds = [...new Set([...selectedIds, ...visibleIds])];
      setSelectedIds(newIds);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Esto borra las asignaciones viejas y crea solo las que estén en selectedIds
      await updateUserProjectAssignments(user.id, selectedIds);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  // Stats para el footer
  const selectedCount = selectedIds.length;
  const isAllVisibleSelected = filteredProjects.length > 0 && filteredProjects.every(p => selectedIds.includes(p.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
      >
        {/* === HEADER === */}
        <div className="bg-gradient-to-r from-[#003366] to-[#0f4c8a] p-5 shrink-0 relative overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
            <Building2 size={100} className="text-white" />
          </div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 size={24} className="text-blue-200" /> 
                Asignación de Obras
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Configurando acceso para:
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                 <span className="font-bold text-white text-sm tracking-wide">{user?.full_name}</span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* === FILTROS Y CONTROLES === */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
          {/* Buscador */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar obra por nombre o ubicación..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium"
            />
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex justify-between items-center">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
               {filteredProjects.length} Proyectos encontrados
             </span>
             
             {filteredProjects.length > 0 && (
               <button 
                 onClick={handleSelectAll}
                 className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                   isAllVisibleSelected 
                     ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                     : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                 }`}
               >
                 {isAllVisibleSelected ? <Square size={14}/> : <CheckSquare size={14}/>}
                 {isAllVisibleSelected ? 'Desmarcar Visibles' : 'Seleccionar Visibles'}
               </button>
             )}
          </div>
        </div>

        {/* === LISTA DE PROYECTOS === */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
          {loading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"/>)}
             </div>
          ) : filteredProjects.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                <Filter size={48} className="mb-2"/>
                <p>No se encontraron proyectos.</p>
             </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredProjects.map((proj) => {
                  const isSelected = selectedIds.includes(proj.id);
                  return (
                    <motion.div 
                      key={proj.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                      onClick={() => toggleProject(proj.id)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20' 
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      {/* Icono de Estado de Selección */}
                      <div className={`shrink-0 transition-transform duration-300 ${isSelected ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}>
                         {isSelected ? (
                           <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                              <CheckCircle2 size={24} />
                           </div>
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors">
                              <Circle size={24} />
                           </div>
                         )}
                      </div>

                      {/* Información del Proyecto */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                             {proj.name}
                          </h4>
                          {/* Badge de Estado del Proyecto (Opcional si viene del backend) */}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                             proj.status === 'En Ejecución' ? 'bg-green-100 text-green-700 border-green-200' : 
                             'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {proj.status || 'Activo'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 overflow-hidden max-w-[150px]">
                            <MapPin size={12} className={isSelected ? 'text-blue-500' : 'text-slate-400'}/>
                            <span className="truncate">{proj.location || 'Sin ubicación'}</span>
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span>Inició: {proj.start_date || '--/--/--'}</span>
                        </div>
                      </div>

                      {/* Check visual extra en background para feedback instantáneo */}
                      {isSelected && (
                         <motion.div 
                           initial={{ scale: 0 }} animate={{ scale: 1 }}
                           className="absolute right-0 top-0 p-2"
                         >
                           <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                         </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* === FOOTER === */}
        <div className="p-5 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
           <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Seleccionados</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${selectedCount > 0 ? 'text-[#003366]' : 'text-slate-300'}`}>
                  {selectedCount}
                </span>
                <span className="text-sm font-medium text-slate-500">obras</span>
              </div>
           </div>

           <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              
              <button 
                onClick={handleSave}
                disabled={saving || loading}
                className="group relative flex items-center gap-2 px-8 py-2.5 bg-[#003366] text-white rounded-xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
              >
                {/* Efecto de brillo en el botón */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"/>
                
                {saving ? (
                  <>Guardando...</>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AssignProjectsModal;