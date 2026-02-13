import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Building2, MapPin, Search, 
  CheckCircle2, Circle, CheckSquare, 
  Filter, Briefcase, Map, HardHat, Eraser
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Servicios
import { getProjects, getUserProjectIds, updateUserProjectAssignments } from '../../../services/projectsService';
import { getSedes, assignStaffToSede } from '../../../services/sedesService';
import { supabase } from '../../../services/supabase'; 

const AssignProjectsModal = ({ isOpen, onClose, user, onSuccess, isWorker = false }) => {
  // Estados de Datos
  const [projects, setProjects] = useState([]);
  const [sedes, setSedes] = useState([]);
  
  // Estados de Selección
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedSedeId, setSelectedSedeId] = useState(null);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('projects'); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && user) {
      loadData();
      setSearchTerm('');
      setActiveTab('projects'); 
    }
  }, [isOpen, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProjects, allSedes] = await Promise.all([
        getProjects(),
        getSedes()
      ]);
      
      setProjects(allProjects || []);
      setSedes(allSedes || []);

      // --- LOGICA DE CARGA INICIAL ---
      if (isWorker) {
        // OBREROS: Buscamos la obra actual (texto)
        if (user.project_assigned && user.project_assigned !== 'Sin asignar') {
            // Como es texto, buscamos el proyecto que coincida con el nombre
            const matchingProject = (allProjects || []).find(p => 
                p.name.toLowerCase() === user.project_assigned.toLowerCase()
            );
            
            // Si lo encontramos, lo marcamos como seleccionado
            setSelectedProjectIds(matchingProject ? [matchingProject.id] : []);
        } else {
            setSelectedProjectIds([]);
        }
        setSelectedSedeId(null);

      } else {
        // STAFF: Buscamos en la tabla relacional (pueden ser varios)
        const assignedProjects = await getUserProjectIds(user.id);
        setSelectedProjectIds(assignedProjects);
        setSelectedSedeId(user.sede_id || null);
      }

    } catch (error) {
      console.error("Error cargando asignaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const filteredList = useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    if (activeTab === 'projects') {
      return projects.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.location && p.location.toLowerCase().includes(term))
      );
    } else {
      return sedes.filter(s => 
        s.name.toLowerCase().includes(term) ||
        (s.location && s.location.toLowerCase().includes(term))
      );
    }
  }, [projects, sedes, searchTerm, activeTab]);

  // --- MANEJADORES DE SELECCIÓN ---

  const toggleProject = (projectId) => {
    if (isWorker) {
        // === CORRECCIÓN AQUÍ: SELECCIÓN ÚNICA PARA OBREROS ===
        // Si selecciona uno nuevo, reemplaza al anterior automáticamente.
        // Si selecciona el mismo que ya tiene, lo dejamos (o podrías desmarcarlo si quisieras permitir dejarlo sin obra).
        // Aquí forzamos el cambio directo:
        setSelectedProjectIds([projectId]); 
    } else {
        // === STAFF: SELECCIÓN MÚLTIPLE MANTENIDA ===
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    }
  };

  const handleSelectAllProjects = () => {
    // Esta función SOLO estará disponible para Staff
    const visibleIds = filteredList.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedProjectIds.includes(id));

    if (allSelected) {
      setSelectedProjectIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedProjectIds, ...visibleIds])];
      setSelectedProjectIds(newIds);
    }
  };

  const handleClearSelection = () => {
      setSelectedProjectIds([]);
  };

  const toggleSede = (sedeId) => {
    if (selectedSedeId === sedeId) {
        setSelectedSedeId(null); 
    } else {
        setSelectedSedeId(sedeId);
    }
  };

  // --- GUARDAR TODO ---
  const handleSave = async () => {
    setSaving(true);
    try {
      
      if (isWorker) {
        // === GUARDADO OBRERO (Texto simple, una sola obra) ===
        
        let projectName = 'Sin asignar';
        
        if (selectedProjectIds.length > 0) {
            // Buscamos el nombre del ÚNICO proyecto seleccionado
            const project = projects.find(p => p.id === selectedProjectIds[0]);
            if (project) projectName = project.name;
        }

        // Actualizamos tabla workers
        const { error } = await supabase
            .from('workers')
            .update({ project_assigned: projectName })
            .eq('id', user.id);

        if (error) throw error;
        
      } else {
        // === GUARDADO STAFF (Múltiple, tabla relacional) ===
        const projectsPromise = updateUserProjectAssignments(user.id, selectedProjectIds);
        const sedePromise = assignStaffToSede(user.id, selectedSedeId);
        await Promise.all([projectsPromise, sedePromise]);
      }
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar cambios: " + (error.message || "Error desconocido"));
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = activeTab === 'projects' ? selectedProjectIds.length : (selectedSedeId ? 1 : 0);
  const itemLabel = activeTab === 'projects' ? (isWorker ? 'obra' : 'obras') : 'sede';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* === HEADER === */}
        <div className={`p-5 shrink-0 relative overflow-hidden bg-gradient-to-r ${isWorker ? 'from-orange-600 to-orange-800' : 'from-[#003366] to-[#0f4c8a]'}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
            {isWorker ? <HardHat size={100} className="text-white" /> : <Building2 size={100} className="text-white" />}
          </div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isWorker ? <HardHat size={24} className="text-orange-200" /> : <Briefcase size={24} className="text-blue-200" />}
                {isWorker ? 'Cambiar de Obra' : 'Asignaciones Laborales'}
              </h2>
              <p className={isWorker ? "text-orange-100 text-sm mt-1" : "text-blue-100 text-sm mt-1"}>
                  {isWorker ? 'Seleccione la nueva obra de destino.' : 'Gestione múltiples proyectos y sedes.'}
              </p>
              
              <div className="mt-3 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                 <span className="font-bold text-white text-sm tracking-wide">{user?.full_name || user?.name || 'Usuario'}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* === TABS (Solo Staff) === */}
        {!isWorker && (
          <div className="flex p-2 bg-slate-50 border-b border-slate-100 gap-2 shrink-0">
              <button
                  onClick={() => { setActiveTab('projects'); setSearchTerm(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'projects' 
                      ? 'bg-white text-[#003366] shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
              >
                  <Building2 size={16}/> Proyectos
              </button>
              <button
                  onClick={() => { setActiveTab('sede'); setSearchTerm(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'sede' 
                      ? 'bg-white text-[#003366] shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
              >
                  <Map size={16}/> Sede Administrativa
              </button>
          </div>
        )}

        {/* === BUSCADOR Y ACCIONES === */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'projects' ? "Buscar obras..." : "Buscar sedes..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm font-medium"
            />
          </div>

          <div className="flex justify-between items-center">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
               {filteredList.length} {activeTab === 'projects' ? 'Proyectos' : 'Sedes'} disponibles
             </span>
             
             {/* Acciones de Selección Masiva (SOLO PARA STAFF) */}
             {activeTab === 'projects' && !isWorker && filteredList.length > 0 && (
               <div className="flex gap-2">
                   {selectedProjectIds.length > 0 && (
                        <button 
                            onClick={handleClearSelection}
                            className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Desmarcar todos"
                        >
                            <Eraser size={14}/>
                        </button>
                   )}
                   <button 
                     onClick={handleSelectAllProjects}
                     className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
                   >
                     <CheckSquare size={14}/> Alternar Todos
                   </button>
               </div>
             )}
          </div>
        </div>

        {/* === LISTA DE ITEMS === */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
          {loading ? (
             <div className="space-y-3">
               {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse"/>)}
             </div>
          ) : filteredList.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
                <Filter size={48} className="mb-2"/>
                <p>No se encontraron resultados.</p>
             </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode='wait'>
                {filteredList.map((item) => {
                  
                  const isSelected = activeTab === 'projects' 
                     ? selectedProjectIds.includes(item.id)
                     : selectedSedeId === item.id;

                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                      onClick={() => activeTab === 'projects' ? toggleProject(item.id) : toggleSede(item.id)}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none overflow-hidden ${
                        isSelected 
                          ? (isWorker 
                                ? 'bg-orange-50/80 border-orange-500 shadow-md ring-1 ring-orange-500/20' 
                                : 'bg-blue-50/80 border-blue-500 shadow-md ring-1 ring-blue-500/20')
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      {/* Animación de fondo al seleccionar */}
                      {isSelected && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isWorker ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                      )}

                      {/* Icono de Selección (Radio vs Check) */}
                      <div className={`shrink-0 transition-transform duration-300 ml-2 ${isSelected ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}>
                         {isSelected ? (
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg ${
                               isWorker 
                               ? 'bg-orange-600 shadow-orange-600/30' 
                               : 'bg-blue-600 shadow-blue-600/30'
                           }`}>
                              {/* Si es obrero mostramos Check, pero funciona como Radio lógico */}
                              <CheckCircle2 size={20} />
                           </div>
                         ) : (
                           <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-400 transition-colors">
                              <Circle size={20} />
                           </div>
                         )}
                      </div>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className={`text-sm font-bold truncate ${isSelected ? (isWorker ? 'text-orange-900' : 'text-blue-900') : 'text-slate-700'}`}>
                             {item.name}
                          </h4>
                          {activeTab === 'projects' && (
                              <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                item.status === 'En Ejecución' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {item.status || 'Activo'}
                              </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 overflow-hidden">
                            <MapPin size={12} className={isSelected ? (isWorker ? 'text-orange-500' : 'text-blue-500') : 'text-slate-400'}/>
                            <span className="truncate max-w-[200px]">{item.location || 'Sin ubicación registrada'}</span>
                          </span>
                        </div>
                      </div>
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
              <span className="text-xs font-bold text-slate-400 uppercase">
                  {isWorker ? 'Obra Destino' : 'Selección Total'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${selectedCount > 0 ? (isWorker ? 'text-orange-700' : 'text-[#003366]') : 'text-slate-300'}`}>
                  {selectedCount}
                </span>
                <span className="text-sm font-medium text-slate-500">{itemLabel}</span>
              </div>
           </div>

           <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm">
                Cancelar
              </button>
              
              <button 
                onClick={handleSave}
                disabled={saving || loading}
                className={`
                    group relative flex items-center gap-2 px-8 py-2.5 text-white rounded-xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden
                    ${isWorker 
                        ? 'bg-orange-600 shadow-orange-900/20 hover:bg-orange-700' 
                        : 'bg-[#003366] shadow-blue-900/20 hover:bg-blue-900'
                    }
                `}
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"/>
                {saving ? 'Guardando...' : <><Save size={18} /> {isWorker ? 'Asignar Obra' : 'Guardar Cambios'}</>}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AssignProjectsModal;