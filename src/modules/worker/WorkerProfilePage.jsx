import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, Lock, Save, Loader2, 
  Briefcase, Calendar, Baby, Hash, 
  Eye, EyeOff, FileText, DollarSign, ArrowLeft,
  Shield, PieChart, Landmark // Nuevos iconos
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../components/common/StatusModal';

// Listas de opciones (Mismas que en el panel admin)
const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const COMMISSION_TYPES = ['Flujo', 'Mixta'];

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
           // Aseguramos que los campos existan
           first_name: data.first_name || '',
           paternal_surname: data.paternal_surname || '',
           maternal_surname: data.maternal_surname || '',
           pension_system: data.pension_system || 'ONP',
           commission_type: data.commission_type || 'Flujo',
           cuspp: data.cuspp || '',
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
      // 1. Recalcular Nombre Completo
      const fullName = `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim();

      // 2. Preparar objeto de actualización
      const updates = {
        // Identidad
        first_name: formData.first_name,
        paternal_surname: formData.paternal_surname,
        maternal_surname: formData.maternal_surname,
        full_name: fullName, // Importante para que el Admin lo vea bien

        // Régimen
        pension_system: formData.pension_system,
        commission_type: (formData.pension_system !== 'ONP' && formData.pension_system !== 'Sin Régimen') ? formData.commission_type : null,
        cuspp: formData.cuspp,

        // Datos Personales
        bank_account: formData.bank_account,
        birth_date: formData.birth_date,
        has_children: formData.has_children,
        children_count: formData.has_children ? parseInt(formData.children_count || 0) : 0,
        email: formData.email
      };

      // 3. Password (solo si se escribió algo)
      if (formData.new_password) {
        const salt = bcrypt.genSaltSync(10);
        updates.password = bcrypt.hashSync(formData.new_password, salt);
      }

      // 4. Enviar a Supabase
      const { error } = await supabase
        .from('workers')
        .update(updates)
        .eq('id', worker.id);

      if (error) throw error;

      // 5. Actualizar sesión local
      const updatedWorker = { ...originalData, ...updates };
      delete updatedWorker.password; 
      delete updatedWorker.new_password;
      
      loginWorker(updatedWorker); // Refrescar contexto
      setNotification({ isOpen: true, type: 'success', title: 'Actualizado', message: 'Tu perfil se ha sincronizado con el sistema.' });
      
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="h-full flex items-center justify-center pt-20"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

  return (
    <div className="p-6 space-y-6 pt-8 pb-32">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Editar Perfil</h1>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* 1. TARJETA RESUMEN (No editable directamente, muestra resultado) */}
        <div className="bg-[#003366] text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-white/20 mb-3 shadow-lg">
                    {formData.first_name?.charAt(0)}{formData.paternal_surname?.charAt(0)}
                </div>
                <h3 className="font-bold text-xl leading-tight mb-1">
                    {formData.first_name} {formData.paternal_surname}
                </h3>
                <span className="inline-block px-3 py-1 bg-[#f0c419] text-[#003366] text-xs font-bold rounded-full">
                    {formData.category}
                </span>
            </div>
            {/* Decoración de fondo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* 2. DATOS DE IDENTIDAD (Nombres) */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Identidad</h3>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium ml-1">Nombres</label>
                    <input name="first_name" value={formData.first_name} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border-slate-200 border text-slate-700 font-bold focus:border-[#003366] outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium ml-1">Ap. Paterno</label>
                        <input name="paternal_surname" value={formData.paternal_surname} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border-slate-200 border text-slate-700 font-bold focus:border-[#003366] outline-none transition-colors" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium ml-1">Ap. Materno</label>
                        <input name="maternal_surname" value={formData.maternal_surname} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border-slate-200 border text-slate-700 font-bold focus:border-[#003366] outline-none transition-colors" />
                    </div>
                </div>
            </div>
        </div>

        {/* 3. RÉGIMEN PENSIONARIO (Igual al Admin) */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><Landmark size={14}/> Afiliación</h3>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 space-y-4">
                
                {/* Selector AFP/ONP */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium ml-1">Sistema de Pensiones</label>
                    <div className="relative">
                        <select name="pension_system" value={formData.pension_system} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold appearance-none focus:border-[#003366] outline-none">
                            {AFPS.map(afp => <option key={afp} value={afp}>{afp}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                </div>

                {/* Campos condicionales para AFP */}
                {formData.pension_system && formData.pension_system !== 'ONP' && formData.pension_system !== 'Sin Régimen' && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium ml-1">Tipo Comisión</label>
                            <div className="relative">
                                <select name="commission_type" value={formData.commission_type} onChange={handleChange} className="w-full p-3 bg-blue-50 rounded-xl border border-blue-200 text-[#003366] font-bold appearance-none outline-none">
                                    {COMMISSION_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#003366]">▼</div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium ml-1">CUSPP</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                <input name="cuspp" value={formData.cuspp} onChange={handleChange} placeholder="Código" className="w-full pl-9 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-mono font-bold outline-none focus:border-[#003366]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* 4. DATOS DE CONTACTO Y PAGO */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Datos Complementarios</h3>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium ml-1">Cuenta Bancaria</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-[#003366] transition-colors">
                        <CreditCard size={18} className="text-slate-400"/>
                        <input name="bank_account" value={formData.bank_account || ''} onChange={handleChange} placeholder="Número de cuenta" className="bg-transparent w-full outline-none text-sm font-mono text-slate-700 font-medium" />
                    </div>
                </div>

                <div className="flex items-center justify-between p-1 bg-slate-50 rounded-xl px-3 border border-slate-200">
                     <label className="flex items-center gap-2 cursor-pointer flex-1 py-2">
                        <input type="checkbox" name="has_children" checked={formData.has_children || false} onChange={handleChange} className="w-5 h-5 accent-[#003366]" />
                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2"><Baby size={18}/> ¿Tengo Hijos?</span>
                     </label>
                     {formData.has_children && (
                        <input type="number" name="children_count" value={formData.children_count || 0} onChange={handleChange} className="w-16 p-2 bg-white border border-slate-200 rounded-lg text-center font-bold outline-none text-[#003366]" />
                     )}
                </div>
            </div>
        </div>

        {/* 5. SEGURIDAD */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Seguridad</h3>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium ml-1">Nueva Contraseña</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 relative focus-within:border-[#003366] transition-colors">
                        <Lock size={18} className="text-slate-400"/>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            name="new_password" 
                            value={formData.new_password || ''} 
                            onChange={handleChange} 
                            placeholder="Dejar vacío para no cambiar" 
                            className="bg-transparent w-full outline-none text-sm text-slate-700 pr-8 font-medium" 
                        />
                         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 text-slate-400 hover:text-[#003366]">
                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                         </button>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTÓN GUARDAR */}
        <button disabled={loading} className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-900 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
        </button>

      </form>
      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({...notification, isOpen:false})} type={notification.type} title={notification.title} message={notification.message}/>
    </div>
  );
};

export default WorkerProfilePage;