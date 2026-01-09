import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, Lock, Save, Loader2, 
  Briefcase, Calendar, Baby, Hash, 
  Eye, EyeOff, FileText, DollarSign, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../components/common/StatusModal';

const WorkerProfilePage = () => {
  const { worker, loginWorker } = useWorkerAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});

  useEffect(() => {
    const fetchFullData = async () => {
      if (!worker?.id) return;
      try {
        const { data, error } = await supabase
          .from('workers')
          .select('*')
          .eq('id', worker.id)
          .single();

        if (error) throw error;

        const initialData = {
           ...data,
           password: '', 
           new_password: '' 
        };
        
        setFormData(initialData);
        setOriginalData(initialData);
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchFullData();
  }, [worker]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = {
        bank_account: formData.bank_account,
        birth_date: formData.birth_date,
        has_children: formData.has_children,
        children_count: formData.has_children ? parseInt(formData.children_count) : 0,
        email: formData.email
      };

      if (formData.new_password) {
        const salt = bcrypt.genSaltSync(10);
        updates.password = bcrypt.hashSync(formData.new_password, salt);
      }

      const { error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', worker.id);

      if (error) throw error;

      // Actualizar sesión local sin la contraseña
      const updatedWorker = { ...originalData, ...updates };
      delete updatedWorker.password; 
      delete updatedWorker.new_password;
      
      loginWorker(updatedWorker); 
      setNotification({ isOpen: true, type: 'success', title: 'Actualizado', message: 'Tus datos se guardaron correctamente.' });
      
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="h-full flex items-center justify-center pt-20"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

  return (
    <div className="p-6 space-y-6 pt-8 pb-24">
      
      {/* HEADER SIMPLE */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <h1 className="text-xl font-bold text-slate-800">Mi Perfil</h1>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* TARJETA DATOS FIJOS */}
        <div className="bg-[#0f172a] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/20">
                        {formData.first_name?.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">{formData.full_name}</h3>
                        <p className="text-slate-400 text-xs">{formData.document_type}: {formData.document_number}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/5 p-3 rounded-xl">
                        <p className="text-slate-400 text-xs uppercase mb-1">Categoría</p>
                        <p className="font-bold text-yellow-400">{formData.category}</p>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                        <p className="text-slate-400 text-xs uppercase mb-1">Ingreso</p>
                        <p className="font-bold">{formData.start_date}</p>
                    </div>
                </div>
            </div>
            {/* Decoración */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
        </div>

        {/* FORMULARIO EDITABLE */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Datos Editables</h3>
            
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Cuenta Bancaria</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <CreditCard size={18} className="text-slate-400"/>
                        <input name="bank_account" value={formData.bank_account || ''} onChange={handleChange} placeholder="Número de cuenta" className="bg-transparent w-full outline-none text-sm font-mono text-slate-700" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Correo (Opcional)</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <User size={18} className="text-slate-400"/>
                        <input name="email" value={formData.email || ''} onChange={handleChange} placeholder="tucorreo@gmail.com" className="bg-transparent w-full outline-none text-sm text-slate-700" />
                    </div>
                </div>

                <div className="flex items-center justify-between p-1">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="has_children" checked={formData.has_children || false} onChange={handleChange} className="w-5 h-5 accent-[#003366]" />
                        <span className="text-sm font-bold text-slate-700">¿Tengo Hijos?</span>
                     </label>
                     {formData.has_children && (
                        <input type="number" name="children_count" value={formData.children_count || 0} onChange={handleChange} className="w-20 p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold outline-none" />
                     )}
                </div>
            </div>

            <h3 className="text-sm font-bold text-slate-500 uppercase ml-1 mt-6">Seguridad</h3>
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Nueva Contraseña</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 relative">
                        <Lock size={18} className="text-slate-400"/>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="new_password" 
                            value={formData.new_password || ''} 
                            onChange={handleChange} 
                            placeholder="Cambiar contraseña" 
                            className="bg-transparent w-full outline-none text-sm text-slate-700 pr-8" 
                        />
                         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-400">
                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                         </button>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-2 pt-1">Déjalo vacío si no quieres cambiarla.</p>
                </div>
            </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold shadow-lg hover:bg-blue-900 flex items-center justify-center gap-2 active:scale-95 transition-transform">
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
        </button>

      </form>
      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({...notification, isOpen:false})} type={notification.type} title={notification.title} message={notification.message}/>
    </div>
  );
};

export default WorkerProfilePage;