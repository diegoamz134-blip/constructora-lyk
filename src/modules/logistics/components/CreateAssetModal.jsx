import React, { useState, useEffect } from 'react';
import { 
  X, Save, Wrench, MapPin, Calendar, 
  Tag, Activity, Hash 
} from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';

const CreateAssetModal = ({ isOpen, onClose, onAssetSaved, assetToEdit }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'Operativo',
    current_location: 'Almacén Central',
    purchase_date: '',
    next_maintenance_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        setFormData({
          name: assetToEdit.name,
          brand: assetToEdit.brand || '',
          model: assetToEdit.model || '',
          serial_number: assetToEdit.serial_number || '',
          status: assetToEdit.status || 'Operativo',
          current_location: assetToEdit.current_location || '',
          purchase_date: assetToEdit.purchase_date || '',
          next_maintenance_date: assetToEdit.next_maintenance_date || ''
        });
      } else {
        setFormData({ name: '', brand: '', model: '', serial_number: '', status: 'Operativo', current_location: 'Almacén Central', purchase_date: '', next_maintenance_date: '' });
      }
    }
  }, [isOpen, assetToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (assetToEdit) {
        await logisticsService.updateAsset(assetToEdit.id, formData);
      } else {
        await logisticsService.createAsset(formData);
      }
      
      Swal.fire({
        icon: 'success',
        title: assetToEdit ? 'Activo Actualizado' : 'Activo Registrado',
        timer: 1500,
        showConfirmButton: false
      });

      onAssetSaved();
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo guardar el activo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6 relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench size={100} className="text-white"/></div>
          <h2 className="text-2xl font-black text-white">{assetToEdit ? 'Editar Activo' : 'Nuevo Activo'}</h2>
          <p className="text-slate-400 text-sm">Gestión de maquinaria y equipos</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nombre / Descripción</label>
            <div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input type="text" required className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" placeholder="Ej: Trompo Mezclador 9p3" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" placeholder="CAT, Honda..." value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Serie / Placa</label>
                <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" value={formData.serial_number} onChange={(e) => setFormData({...formData, serial_number: e.target.value})} />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Estado</label>
                <div className="relative"><Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                   <select className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800 appearance-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="Operativo">Operativo</option>
                      <option value="En Mantenimiento">En Mantenimiento</option>
                      <option value="Malogrado">Malogrado</option>
                      <option value="Baja">De Baja</option>
                   </select>
                </div>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase">Ubicación Actual</label>
             <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" placeholder="Obra A, Almacén..." value={formData.current_location} onChange={(e) => setFormData({...formData, current_location: e.target.value})} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha Compra</label>
                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-slate-800" value={formData.purchase_date} onChange={(e) => setFormData({...formData, purchase_date: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-xs font-bold text-red-400 uppercase">Próx. Mantenimiento</label>
                <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-red-300" size={18}/>
                   <input type="date" className="w-full pl-10 pr-4 py-3 bg-red-50 border border-red-200 rounded-xl outline-none focus:border-red-500 text-slate-700" value={formData.next_maintenance_date} onChange={(e) => setFormData({...formData, next_maintenance_date: e.target.value})} />
                </div>
             </div>
          </div>

          <div className="pt-4 flex gap-3 justify-end">
             <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
             <button type="submit" disabled={loading} className="px-8 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
               {loading ? 'Guardando...' : <><Save size={18}/> Guardar Activo</>}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssetModal;