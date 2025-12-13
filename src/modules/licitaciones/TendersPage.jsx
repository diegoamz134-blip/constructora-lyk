import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, Plus, Calendar, MapPin, 
  Loader2, Pencil, Trash2 
} from 'lucide-react';

// Componentes Modales
import CreateTenderModal from './components/CreateTenderModal';
// Reutilizamos el modal de confirmación que ya tienes en proyectos
import ConfirmDeleteModal from '../projects/components/ConfirmDeleteModal'; 

const TendersPage = () => {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tenderToEdit, setTenderToEdit] = useState(null);

  // Estados para Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenderToDelete, setTenderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    setLoading(true);
    const { data } = await supabase.from('tenders').select('*').order('created_at', { ascending: false });
    setTenders(data || []);
    setLoading(false);
  };

  // --- MANEJADORES ---

  const handleCreate = () => {
    setTenderToEdit(null); // Aseguramos que no haya datos previos
    setIsModalOpen(true);
  };

  const handleEdit = (e, tender) => {
    e.stopPropagation(); // Evita entrar al detalle
    setTenderToEdit(tender);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e, tender) => {
    e.stopPropagation(); // Evita entrar al detalle
    setTenderToDelete(tender);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!tenderToDelete) return;
    setIsDeleting(true);
    try {
      // Borramos items relacionados primero (aunque ON DELETE CASCADE en DB debería hacerlo, es buena práctica)
      await supabase.from('tender_items').delete().eq('tender_id', tenderToDelete.id);
      
      // Borramos la licitación
      const { error } = await supabase.from('tenders').delete().eq('id', tenderToDelete.id);
      if (error) throw error;

      // Actualizamos la lista local
      fetchTenders();
      setIsDeleteModalOpen(false);
      setTenderToDelete(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ganado': return 'bg-green-100 text-green-700 border-green-200';
      case 'Perdido': return 'bg-red-50 text-red-600 border-red-100';
      case 'Presentado': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Licitaciones</h2>
          <p className="text-slate-500 text-sm">Gestión de presupuestos y oportunidades comerciales.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-lg active:scale-95 transition-all"
        >
          <Plus size={18} /> Nueva Licitación
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#003366]" /></div>
      ) : tenders.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100">
          <FileSpreadsheet size={48} className="mx-auto text-slate-200 mb-2" />
          <p className="text-slate-400">No hay licitaciones registradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenders.map((tender) => (
            <div 
              key={tender.id}
              onClick={() => navigate(`/licitaciones/${tender.id}`)}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
            >
              {/* Barra lateral de color decorativa */}
              <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] group-hover:bg-[#f0c419] transition-colors"></div>
              
              {/* Header de la Tarjeta */}
              <div className="flex justify-between items-start mb-3">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(tender.status)}`}>
                  {tender.status}
                </span>
                
                {/* [NUEVO] Botones de Acción */}
                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleEdit(e, tender)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteClick(e, tender)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido Principal */}
              <div className="flex justify-between items-start mb-1">
                 <h3 className="font-bold text-lg text-slate-800 group-hover:text-[#003366] transition-colors line-clamp-1">
                    {tender.name}
                 </h3>
                 <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 shrink-0 mt-1">
                    <Calendar size={12}/> {new Date(tender.submission_deadline).toLocaleDateString()}
                 </span>
              </div>
              
              <p className="text-sm text-slate-500 mb-4 line-clamp-1">{tender.client}</p>

              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                <MapPin size={14} /> {tender.location}
              </div>

              {/* Footer de la Tarjeta */}
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase">Presupuesto</span>
                <span className="text-lg font-bold text-slate-800">
                    S/ {(tender.budget_total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <CreateTenderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTenders}
        tenderToEdit={tenderToEdit} // Pasamos la licitación a editar
      />

      {/* Modal de Eliminación */}
      <ConfirmDeleteModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={isDeleting}
        title="¿Eliminar Licitación?"
        message={<span>Se eliminará la licitación <span className="font-bold">"{tenderToDelete?.name}"</span> y todo su presupuesto.</span>}
        warning="Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default TendersPage;