import React, { useState, useEffect } from 'react';
import { 
  X, Save, Building2, User, 
  Phone, Mail, MapPin, FileText, 
  Star, RefreshCw 
} from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';

// Ahora recibimos "providerToEdit"
const CreateProviderModal = ({ isOpen, onClose, onProviderSaved, providerToEdit }) => {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    ruc: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    rating: 5
  });

  // Efecto para cargar datos si estamos editando
  useEffect(() => {
    if (isOpen) {
      if (providerToEdit) {
        setFormData({
          name: providerToEdit.name || '',
          ruc: providerToEdit.ruc || '',
          contact_name: providerToEdit.contact_name || '',
          phone: providerToEdit.phone || '',
          email: providerToEdit.email || '',
          address: providerToEdit.address || '',
          rating: providerToEdit.rating || 5
        });
      } else {
        // Limpiar form si es nuevo
        setFormData({ name: '', ruc: '', contact_name: '', phone: '', email: '', address: '', rating: 5 });
      }
    }
  }, [isOpen, providerToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (providerToEdit) {
        // MODO EDICIÓN
        await logisticsService.updateProvider(providerToEdit.id, formData);
      } else {
        // MODO CREACIÓN
        await logisticsService.createProvider(formData);
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
        title: providerToEdit ? 'Proveedor actualizado' : 'Proveedor registrado'
      });

      onProviderSaved();
      onClose();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar los cambios.',
        confirmButtonColor: '#003366'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Header Dinámico */}
        <div className="bg-gradient-to-r from-[#003366] to-[#004080] px-8 py-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Building2 size={120} />
          </div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {providerToEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-blue-100 text-sm mt-1 font-medium opacity-90">
                {providerToEdit ? 'Actualizar información de contacto' : 'Registrar socio estratégico'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all backdrop-blur-md"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
             <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Razón Social
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                    <Building2 size={18} />
                  </div>
                  <input 
                    type="text" 
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                    placeholder="Ej: Ferretería Central SAC"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  RUC
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                    <FileText size={18} />
                  </div>
                  <input 
                    type="text" 
                    maxLength={11}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                    placeholder="2060..."
                    value={formData.ruc}
                    onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                  />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
              Nombre de Contacto
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                <User size={18} />
              </div>
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                placeholder="Ej: Juan Pérez (Vendedor)"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  WhatsApp / Celular
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                    <Phone size={18} />
                  </div>
                  <input 
                    type="tel" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                    placeholder="999..."
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Correo Electrónico
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                    placeholder="ventas@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
              Dirección Fiscal / Almacén
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors">
                <MapPin size={18} />
              </div>
              <input 
                type="text" 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium outline-none focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-[#003366]/10 transition-all"
                placeholder="Av. Los Constructores 123..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
             <span className="text-sm font-bold text-slate-600">Calificación</span>
             <div className="flex gap-1">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   type="button"
                   onClick={() => setFormData({...formData, rating: star})}
                   className={`transition-all ${star <= formData.rating ? 'text-yellow-400 scale-110' : 'text-slate-300'}`}
                 >
                   <Star size={24} fill={star <= formData.rating ? "currentColor" : "none"} />
                 </button>
               ))}
             </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 transition-all flex items-center gap-2 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2"><RefreshCw className="animate-spin" size={18}/> Guardando...</span>
              ) : (
                <><Save size={18}/> {providerToEdit ? 'Actualizar' : 'Guardar'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProviderModal;