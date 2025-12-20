import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, Search, FileText, Download, 
  ExternalLink, User, Calendar, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Filter
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import EmployeeDocumentsModal from './components/EmployeeDocumentsModal';

const DocumentationPage = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'employees'
  const [people, setPeople] = useState([]);
  
  // Estado para Modal de Documentos
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPeople();
  }, [activeTab]);

  // Resetear paginación al cambiar búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchPeople = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'workers' ? 'workers' : 'employees';
      // Traemos todos los activos
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('status', 'Activo')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (person) => {
    setSelectedPerson({ ...person, type: activeTab }); // Pasamos el tipo (worker/employee)
    setIsModalOpen(true);
  };

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
  
  // 1. Filtrar primero
  const filteredPeople = people.filter(person => 
    person.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.document_number && person.document_number.includes(searchTerm))
  );

  // 2. Calcular índices
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPeople.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);

  // 3. Función para cambiar página
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen className="text-[#003366]" /> Legajos Digitales
          </h1>
          <p className="text-slate-500 text-sm">Gestión centralizada de documentación del personal.</p>
        </div>
        
        {/* Buscador */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o DNI..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#003366] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('workers')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <User size={18} /> Obreros
        </button>
        <button 
          onClick={() => setActiveTab('employees')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'employees' ? 'bg-blue-50 text-[#003366] shadow-sm' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <User size={18} /> Staff
        </button>
      </div>

      {/* LISTA DE PERSONAL (GRID) CON PAGINACIÓN */}
      <div className="bg-slate-50/50 rounded-2xl min-h-[400px]">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400">
             <RefreshCw className="animate-spin mr-2"/> Cargando legajos...
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
             <Filter size={48} className="mb-2 opacity-20"/>
             <p>No se encontraron resultados.</p>
          </div>
        ) : (
          <>
            {/* GRID DE CARDS */}
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {currentItems.map((person, idx) => (
                  <motion.div
                    layout
                    key={person.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    onClick={() => handleOpenModal(person)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#003366]/30 relative overflow-hidden"
                  >
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                       <FolderOpen size={64} className="text-[#003366]" />
                    </div>

                    <div className="flex items-start justify-between relative z-10">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg border border-slate-200 group-hover:bg-[#003366] group-hover:text-white transition-colors">
                        {person.full_name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        {person.document_number || 'S/D'}
                      </span>
                    </div>

                    <div className="mt-4 relative z-10">
                      <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-[#003366] transition-colors">
                        {person.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {person.category || person.position || 'Sin cargo'}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={14}/>
                            <span>Ingreso: {person.start_date || '-'}</span>
                         </div>
                         <ExternalLink size={16} className="text-slate-300 group-hover:text-[#003366] transition-colors"/>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* CONTROLES DE PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col md:flex-row justify-center items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium hidden md:block">
                      Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPeople.length)} de {filteredPeople.length} legajos
                  </div>
                  
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      <button 
                        onClick={() => goToPage(1)} 
                        disabled={currentPage === 1} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronsLeft size={18}/>
                      </button>
                      <button 
                        onClick={() => goToPage(currentPage - 1)} 
                        disabled={currentPage === 1} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronLeft size={18}/>
                      </button>
                      
                      <div className="flex items-center gap-1 mx-2">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                              .map((page, i, arr) => (
                                  <React.Fragment key={page}>
                                      {i > 0 && arr[i - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                      <button 
                                        onClick={() => goToPage(page)} 
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                          currentPage === page 
                                            ? 'bg-[#003366] text-white shadow-md scale-110' 
                                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                      >
                                          {page}
                                      </button>
                                  </React.Fragment>
                              ))
                          }
                      </div>

                      <button 
                        onClick={() => goToPage(currentPage + 1)} 
                        disabled={currentPage === totalPages} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronRight size={18}/>
                      </button>
                      <button 
                        onClick={() => goToPage(totalPages)} 
                        disabled={currentPage === totalPages} 
                        className="p-2 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                      >
                        <ChevronsRight size={18}/>
                      </button>
                  </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL DE DOCUMENTOS */}
      <EmployeeDocumentsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        person={selectedPerson}
      />

    </div>
  );
};

export default DocumentationPage;