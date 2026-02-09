import React, { useState, useEffect } from 'react';
import { Search, HardHat, Shield, User, ChevronRight, AlertTriangle, ChevronLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import WorkerEPPManager from './components/WorkerEPPManager'; 

const ITEMS_PER_PAGE = 10;

const SsomaPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Función principal de búsqueda y carga
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      // Calculamos el rango para la paginación (Ej: Pag 1 es del 0 al 9)
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('workers')
        .select('*', { count: 'exact' }) // Pedimos el conteo total
        .order('full_name', { ascending: true }) // Orden alfabético
        .range(from, to);

      // Si hay término de búsqueda, filtramos
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%`);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      setWorkers(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));

    } catch (error) {
      console.error("Error cargando obreros:", error);
    } finally {
      setLoading(false);
    }
  };

  // Efecto: Cargar cuando cambia la página
  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); 

  // Efecto: Debounce para el buscador (esperar a que termines de escribir)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1); // Al buscar, volvemos a la página 1
      fetchWorkers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <Shield className="text-orange-600" size={32} />
          Gestión SSOMA
        </h1>
        <p className="text-slate-500 font-medium">Control de Seguridad, Salud y Medio Ambiente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        
        {/* COLUMNA IZQUIERDA: LISTA Y BUSCADOR */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          
          {/* Barra de Búsqueda */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
             <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Buscar Personal</label>
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  placeholder="Buscar por DNI o Nombre..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
          </div>
          
          {/* Lista de Obreros */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 relative">
             {loading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
             )}
             
             {!loading && workers.length === 0 ? (
               <div className="text-center py-8 px-4">
                  <AlertTriangle className="mx-auto text-slate-300 mb-2" size={32}/>
                  <p className="text-sm text-slate-500">No se encontraron obreros.</p>
               </div>
             ) : (
                workers.map(worker => (
                  <div 
                    key={worker.id}
                    onClick={() => setSelectedWorker(worker)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border group ${
                      selectedWorker?.id === worker.id 
                      ? 'bg-orange-50 border-orange-200 shadow-sm ring-1 ring-orange-200' 
                      : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                         selectedWorker?.id === worker.id ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                       }`}>
                          {worker.full_name.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${selectedWorker?.id === worker.id ? 'text-orange-900' : 'text-slate-700'}`}>
                            {worker.full_name}
                          </p>
                          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                            <span>DNI: {worker.document_number}</span>
                            <span className={`w-2 h-2 rounded-full ${worker.status === 'Activo' ? 'bg-green-500' : 'bg-red-400'}`}></span>
                          </p>
                       </div>
                       {selectedWorker?.id === worker.id && <ChevronRight size={18} className="text-orange-500"/>}
                    </div>
                  </div>
                ))
             )}
          </div>

          {/* Footer de Paginación */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
             <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 rounded-lg hover:bg-white text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
             >
                <ChevronLeft size={20}/>
             </button>
             
             <span className="text-xs font-bold text-slate-500">
                Pág {page} de {totalPages || 1}
                <span className="ml-1 font-normal text-slate-400">({totalCount} registros)</span>
             </span>

             <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
                className="p-2 rounded-lg hover:bg-white text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
             >
                <ChevronRight size={20}/>
             </button>
          </div>

        </div>

        {/* COLUMNA DERECHA: GESTOR DE EPPs */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-y-auto">
           {selectedWorker ? (
             <div key={selectedWorker.id} className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                   <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-lg">
                      <User size={32} className="text-slate-400"/>
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-800">{selectedWorker.full_name}</h2>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md border border-slate-200">
                           {selectedWorker.position || 'Obrero'}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${
                            selectedWorker.status === 'Activo' 
                            ? 'bg-green-50 text-green-600 border-green-100' 
                            : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                           {selectedWorker.status}
                        </span>
                      </div>
                   </div>
                </div>

                {/* Componente de Gestión */}
                <WorkerEPPManager workerId={selectedWorker.id} />
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                <HardHat size={64} className="text-slate-300 mb-4"/>
                <h3 className="text-lg font-bold text-slate-700">Selecciona un personal</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Selecciona un obrero de la lista izquierda para ver su historial de EPPs y asignar nuevos equipos.
                </p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default SsomaPage;