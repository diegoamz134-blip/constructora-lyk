import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Building2, MapPin, Search, 
  CheckCircle2, Circle, CheckSquare, Square, 
  Filter, Briefcase, Map // <--- Nuevos íconos
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Servicios
import { getProjects, getUserProjectIds, updateUserProjectAssignments } from '../../../services/projectsService';
import { getSedes, assignStaffToSede } from '../../../services/sedesService'; // <--- Importamos servicio de Sedes

const AssignProjectsModal = ({ isOpen, onClose, user, onSuccess }) => {
  // Estados de Datos
  const [projects, setProjects] = useState([]);
  const [sedes, setSedes] = useState([]);
  
  // Estados de Selección
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);
  const [selectedSedeId, setSelectedSedeId] = useState(null);

  // Estados de UI
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'sede'
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && user) {
      loadData();
      setSearchTerm('');
      setActiveTab('projects'); // Resetear a la primera pestaña
    }
  }, [isOpen, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Proyectos y Sedes en paralelo
      const [allProjects, allSedes] = await Promise.all([
        getProjects(),
        getSedes()
      ]);
      
      setProjects(allProjects || []);
      setSedes(allSedes || []);

      // 2. Cargar asignaciones actuales de Proyectos
      const assignedProjects = await getUserProjectIds(user.id);
      setSelectedProjectIds(assignedProjects);

      // 3. Cargar asignación actual de Sede (viene en el objeto user o es null)
      setSelectedSedeId(user.sede_id || null);

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

  // Proyectos (Multiselección)
  const toggleProject = (projectId) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(projectId)) {
        return prev.filter(id => id !== projectId);
      } else {
        return [...prev, projectId];
      }
    });
  };

  const handleSelectAllProjects = () => {
    const visibleIds = filteredList.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedProjectIds.includes(id));

    if (allSelected) {
      setSelectedProjectIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedProjectIds, ...visibleIds])];
      setSelectedProjectIds(newIds);
    }
  };

  // Sede (Selección Única)
  const toggleSede = (sedeId) => {
    // Si toco la que ya está seleccionada, la desmarco (opcional), sino marco la nueva
    if (selectedSedeId === sedeId) {
        setSelectedSedeId(null); // Desasignar sede
    } else {
        setSelectedSedeId(sedeId);
    }
  };

  // --- GUARDAR TODO ---
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Guardar Proyectos
      const projectsPromise = updateUserProjectAssignments(user.id, selectedProjectIds);
      
      // 2. Guardar Sede
      // Nota: assignStaffToSede maneja internamente si se envía null para desasignar
      const sedePromise = assignStaffToSede(user.id, selectedSedeId);

      await Promise.all([projectsPromise, sedePromise]);
      
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
  const selectedCount = activeTab === 'projects' ? selectedProjectIds.length : (selectedSedeId ? 1 : 0);
  const itemLabel = activeTab === 'projects' ? 'obras' : 'sede';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
      >
        {/* === HEADER === */}
        <div className="bg-gradient-to-r from-[#003366] to-[#0f4c8a] p-5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-2 -translate-y-2">
            <Building2 size={100} className="text-white" />
          </div>
          
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Briefcase size={24} className="text-blue-200" /> 
                Asignaciones Laborales
              </h2>
              <p className="text-blue-100 text-sm mt-1">Configurando para:</p>
              <div className="mt-2 inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                 <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                 <span className="font-bold text-white text-sm tracking-wide">{user?.full_name}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* === TABS DE NAVEGACIÓN === */}
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
               {filteredList.length} {activeTab === 'projects' ? 'Proyectos' : 'Sedes'}
             </span>
             
             {/* Botón "Seleccionar todo" solo visible en Proyectos */}
             {activeTab === 'projects' && filteredList.length > 0 && (
               <button 
                 onClick={handleSelectAllProjects}
                 className="text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100"
               >
                 <CheckSquare size={14}/> Alternar Visibles
               </button>
             )}
          </div>
        </div>

        {/* === LISTA DE ITEMS (Proyectos o Sedes) === */}
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
                  
                  // Lógica de selección dinámica
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
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 select-none ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-1 ring-blue-500/20' 
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      {/* Icono de Selección */}
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

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                             {item.name}
                          </h4>
                          {/* Badge opcional para Proyectos */}
                          {activeTab === 'projects' && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                item.status === 'En Ejecución' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {item.status || 'Activo'}
                              </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1 overflow-hidden max-w-[200px]">
                            <MapPin size={12} className={isSelected ? 'text-blue-500' : 'text-slate-400'}/>
                            <span className="truncate">{item.location || 'Sin ubicación registrada'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Indicador Visual para Sedes (Radio Style) */}
                      {activeTab === 'sede' && isSelected && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            ASIGNADA
                        </div>
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
              <span className="text-xs font-bold text-slate-400 uppercase">Selección ({activeTab === 'projects' ? 'Obras' : 'Sede'})</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${selectedCount > 0 ? 'text-[#003366]' : 'text-slate-300'}`}>
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
                className="group relative flex items-center gap-2 px-8 py-2.5 bg-[#003366] text-white rounded-xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-900 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"/>
                {saving ? 'Guardando...' : <><Save size={18} /> Guardar Todo</>}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AssignProjectsModal;