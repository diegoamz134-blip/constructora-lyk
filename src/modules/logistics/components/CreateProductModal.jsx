import React, { useState, useEffect } from 'react';
import { 
  X, Save, Package, Layers, 
  Ruler, MapPin, Archive, AlertCircle, 
  ChevronDown, Tag, RefreshCw 
} from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';

const CreateProductModal = ({ isOpen, onClose, onProductCreated, productToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit: 'UND',
    stock_min: 5,
    location: '',
    stock_current: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (productToEdit) {
        setFormData({
          name: productToEdit.name,
          category_id: productToEdit.category_id || '',
          unit: productToEdit.unit,
          stock_min: productToEdit.stock_min,
          location: productToEdit.location || '',
          stock_current: productToEdit.stock_current
        });
      } else {
        setFormData({ name: '', category_id: '', unit: 'UND', stock_min: 5, location: '', stock_current: 0 });
      }
    }
  }, [isOpen, productToEdit]);

  const loadCategories = async () => {
    try {
      const data = await logisticsService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error cargando categorías', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (productToEdit) {
        await logisticsService.updateProduct(productToEdit.id, formData);
      } else {
        await logisticsService.createProduct(formData);
      }
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#fff',
        color: '#1e293b'
      });

      Toast.fire({
        icon: 'success',
        title: productToEdit ? 'Producto actualizado' : 'Producto creado'
      });

      onProductCreated();
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar el producto.',
        confirmButtonColor: '#003366'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003366] to-[#004080] px-8 py-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Package size={120} />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-blue-100 text-sm mt-1 font-medium opacity-90">
                {productToEdit ? 'Modificar detalles del ítem' : 'Registrar ítem en el Catálogo'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-md">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nombre del Ítem</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors"><Tag size={18} /></div>
              <input 
                type="text" required
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Categoría</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors"><Layers size={18} /></div>
                <select 
                  required
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all appearance-none cursor-pointer"
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={16} strokeWidth={3} /></div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Unidad</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors"><Ruler size={18} /></div>
                <select 
                  className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all appearance-none cursor-pointer"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                >
                  <option value="UND">Unidad (UND)</option>
                  <option value="BLS">Bolsa (BLS)</option>
                  <option value="KG">Kilogramo (KG)</option>
                  <option value="M3">Metro Cúbico (M3)</option>
                  <option value="M">Metro Lineal (M)</option>
                  <option value="GLN">Galón (GLN)</option>
                  <option value="CJA">Caja (CJA)</option>
                  <option value="PZA">Pieza (PZA)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={16} strokeWidth={3} /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Stock Actual</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors"><Archive size={18} /></div>
                  <input 
                    type="number" min="0" step="0.01"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                    value={formData.stock_current}
                    onChange={(e) => setFormData({...formData, stock_current: e.target.value})}
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 text-red-400">Alerta Mínima</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-300 group-focus-within:text-red-500 transition-colors"><AlertCircle size={18} /></div>
                  <input 
                    type="number" min="0"
                    className="w-full pl-11 pr-4 py-3.5 bg-red-50/50 border border-red-100 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all"
                    value={formData.stock_min}
                    onChange={(e) => setFormData({...formData, stock_min: e.target.value})}
                  />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ubicación</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors"><MapPin size={18} /></div>
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-6 mt-2 border-t border-slate-100 flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="px-8 py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-all flex items-center gap-2 text-sm">
              {loading ? <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={18}/> Guardando...</span> : <><Save size={18} /> {productToEdit ? 'Actualizar' : 'Guardar'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductModal;