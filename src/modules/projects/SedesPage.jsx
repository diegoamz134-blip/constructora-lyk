import React, { useState, useEffect } from 'react';
import { Building, Plus, MapPin, Trash2, Pencil, Search, Users } from 'lucide-react'; 
import { getSedes, deleteSede } from '../../services/sedesService';

// IMPORTAMOS LOS DOS MODALES (Deben estar en la carpeta components)
import CreateSedeModal from './components/CreateSedeModal';
import AssignStaffToSedeModal from './components/AssignStaffToSedeModal'; // <--- NUEVO MODAL

const SedesPage = () => {
  const [sedesList, setSedesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para modal CREAR/EDITAR
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sedeToEdit, setSedeToEdit] = useState(null);

  // Estado para modal ASIGNAR PERSONAL
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSedeForAssign, setSelectedSedeForAssign] = useState(null);

  useEffect(() => {
    fetchSedes();
  }, []);

  const fetchSedes = async () => {
    setLoading(true);
    try {
      const data = await getSedes();
      setSedesList(data);
    } catch (error) {
      console.error("Error cargando sedes", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSedeToEdit(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (e, sede) => {
    e.stopPropagation(); // Evita abrir el panel de personal
    setSedeToEdit(sede);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Evita abrir el panel de personal
    if(window.confirm("¿Estás seguro de eliminar esta sede permanentemente?")) {
        try {
            await deleteSede(id);
            fetchSedes();
        } catch (e) {
            alert("Error al eliminar. Puede que haya personal asignado a esta sede.");
        }
    }
  };

  // NUEVA FUNCIÓN: Al hacer clic en la tarjeta
  const handleCardClick = (sede) => {
    setSelectedSedeForAssign(sede);
    setIsAssignModalOpen(true);
  };

  const filteredData = sedesList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="text-[#003366]" /> Sedes Corporativas
          </h1>
          <p className="text-slate-500 text-sm">Gestiona las ubicaciones y el personal asignado.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-lg transition-all"
        >
          <Plus size={18} /> Nueva Sede
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 max-w-lg">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar sede por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
        />
      </div>

      {/* Grid de Sedes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {loading ? (
             <div className="col-span-full py-12 text-center text-slate-400">Cargando sedes...</div>
         ) : filteredData.length === 0 ? (
             <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
                No se encontraron sedes. ¡Crea una nueva!
             </div>
         ) : (
             filteredData.map(sede => (
                <div 
                  key={sede.id} 
                  onClick={() => handleCardClick(sede)} // <--- CLIC EN LA TARJETA
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
                >
                    {/* Botones de acción flotantes (Edit/Delete) */}
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 bg-gradient-to-l from-white via-white to-transparent z-10">
                        <button onClick={(e) => handleEdit(e, sede)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:scale-110 transition" title="Editar Datos Sede">
                            <Pencil size={16}/>
                        </button>
                        <button onClick={(e) => handleDelete(e, sede.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:scale-110 transition" title="Eliminar Sede">
                            <Trash2 size={16}/>
                        </button>
                    </div>

                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#003366] shadow-sm group-hover:scale-110 transition-transform">
                            <Building size={28}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg group-hover:text-[#003366] transition-colors">{sede.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                <MapPin size={12}/> {sede.location || 'Sin dirección escrita'}
                            </p>
                        </div>
                    </div>

                    {/* Badge de "Gestionar Personal" visual */}
                    <div className="mt-4 mb-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100 group-hover:border-blue-100 transition-colors">
                        <div className="flex items-center gap-2 text-sm text-slate-600 font-bold">
                           <Users size={16} className="text-slate-400"/>
                           <span>Gestionar Personal</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">
                           Click para abrir
                        </span>
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado GPS</div>
                        {sede.latitude ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Activo
                            </span>
                        ) : (
                            <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                                Sin Coordenadas
                            </span>
                        )}
                    </div>
                </div>
             ))
         )}
      </div>

      {/* MODALES */}
      
      {/* 1. Crear / Editar Sede */}
      <CreateSedeModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchSedes}
        sedeToEdit={sedeToEdit}
      />

      {/* 2. Asignar Personal (Nuevo Panel) */}
      <AssignStaffToSedeModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        sede={selectedSedeForAssign}
      />

    </div>
  );
};

export default SedesPage;