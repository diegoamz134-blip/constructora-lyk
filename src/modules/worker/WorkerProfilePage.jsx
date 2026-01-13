import React, { useState, useEffect, useRef } from 'react';
import { 
  User, CreditCard, Lock, Save, Loader2, 
  Briefcase, Calendar, Baby, Hash, 
  Eye, EyeOff, FileText, DollarSign, ArrowLeft,
  Shield, PieChart, Landmark, Camera, ExternalLink, ImageOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import { Avatar } from "@heroui/react";

// Modales
import StatusModal from '../../components/common/StatusModal';
import ImageCropperModal from '../../components/common/ImageCropperModal';

// Opciones
const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const COMMISSION_TYPES = ['Flujo', 'Mixta'];

const WorkerProfilePage = () => {
  const { worker, loginWorker } = useWorkerAuth();
  const navigate = useNavigate();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  
  // Estado para controlar errores de imagen
  const [imageError, setImageError] = useState(false);
  // Timestamp para romper caché
  const [cacheBuster, setCacheBuster] = useState(Date.now());

  // Formularios
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});

  // Cropper
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const fileInputRef = useRef(null);

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
           first_name: data.first_name || '',
           paternal_surname: data.paternal_surname || '',
           maternal_surname: data.maternal_surname || '',
           pension_system: data.pension_system || 'ONP',
           commission_type: data.commission_type || 'Flujo',
           cuspp: data.cuspp || '',
           avatar_url: data.avatar_url || '', 
           password: '', 
           new_password: '' 
        };
        
        setFormData(initialData);
        setOriginalData(initialData);
        setCacheBuster(Date.now()); // Actualizar timestamp al cargar
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setFetchLoading(false);
      }
    };
    fetchFullData();
  }, [worker]);

  // --- FOTO DE PERFIL ---
  const handleAvatarClick = () => fileInputRef.current.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; 
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setTempImageSrc(reader.result);
      setIsCropperOpen(true);
    });
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob) => {
    setUploading(true);
    setImageError(false); // Resetear error
    setIsCropperOpen(false);

    try {
      if (!worker?.id) throw new Error("Sesión inválida");

      // Usamos siempre el mismo nombre de archivo para ahorrar espacio, 
      // pero el navegador lo verá como nuevo gracias al cacheBuster.
      const fileName = `avatar_worker_${worker.id}.jpg`; 

      // 1. Subir (Reemplazar existente)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
           contentType: 'image/jpeg',
           upsert: true 
        });

      if (uploadError) throw uploadError;

      // 2. Obtener URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log("URL Pública generada:", publicUrl);

      // 3. Guardar en BD
      const { error: updateError } = await supabase
        .from('workers')
        .update({ avatar_url: publicUrl })
        .eq('id', worker.id);

      if (updateError) throw updateError;

      // 4. Actualizar Estado
      const updatedData = { ...formData, avatar_url: publicUrl };
      setFormData(updatedData);
      setOriginalData(prev => ({ ...prev, avatar_url: publicUrl }));
      setCacheBuster(Date.now()); // ¡Importante! Forzar recarga visual
      
      const contextWorker = { ...updatedData };
      delete contextWorker.password;
      delete contextWorker.new_password;
      loginWorker(contextWorker);

      setNotification({ 
          isOpen: true, type: 'success', 
          title: 'Foto Actualizada', 
          message: 'Tu foto se ha actualizado correctamente.' 
      });

    } catch (error) {
      console.error('Error subiendo foto:', error);
      setNotification({ 
          isOpen: true, type: 'error', 
          title: 'Error de Subida', 
          message: error.message || 'No se pudo subir la imagen.' 
      });
    } finally {
      setUploading(false);
      setTempImageSrc(null);
    }
  };

  // --- ACTUALIZAR DATOS ---
  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fullName = `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim();

      const updates = {
        first_name: formData.first_name,
        paternal_surname: formData.paternal_surname,
        maternal_surname: formData.maternal_surname,
        full_name: fullName, 
        pension_system: formData.pension_system,
        commission_type: (formData.pension_system !== 'ONP' && formData.pension_system !== 'Sin Régimen') ? formData.commission_type : null,
        cuspp: formData.cuspp,
        bank_account: formData.bank_account,
        birth_date: formData.birth_date,
        has_children: formData.has_children,
        children_count: formData.has_children ? parseInt(formData.children_count || 0) : 0,
        email: formData.email
      };

      if (formData.new_password) {
        const salt = bcrypt.genSaltSync(10);
        updates.password = bcrypt.hashSync(formData.new_password, salt);
      }

      const { error } = await supabase.from('workers').update(updates).eq('id', worker.id);
      if (error) throw error;

      const updatedWorker = { ...originalData, ...updates, avatar_url: formData.avatar_url };
      delete updatedWorker.password; 
      delete updatedWorker.new_password;
      
      loginWorker(updatedWorker); 
      setNotification({ isOpen: true, type: 'success', title: 'Actualizado', message: 'Tu perfil se ha sincronizado con el sistema.' });
      
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <div className="h-full flex items-center justify-center pt-20"><Loader2 className="animate-spin text-[#003366]" size={40}/></div>;

  // URL FINAL CON TIMESTAMP PARA EVITAR CACHÉ
  const avatarSrc = formData.avatar_url 
    ? `${formData.avatar_url}?t=${cacheBuster}` 
    : null;

  return (
    <div className="p-6 space-y-6 pt-8 pb-32">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
            <ArrowLeft size={20} className="text-slate-600"/>
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Editar Perfil</h1>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="bg-[#003366] text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
                
                {/* --- ÁREA DE AVATAR ROBUSTA --- */}
                <div className="relative mb-3 group cursor-pointer" onClick={handleAvatarClick}>
                    <div className={`w-24 h-24 rounded-full border-4 border-white/20 relative overflow-hidden bg-white ${uploading ? 'opacity-50' : ''}`}>
                        
                        {/* Lógica de visualización: Si hay URL y no hay error, muestra imagen. Si falla, muestra iniciales */}
                        {!imageError && avatarSrc ? (
                            <img 
                                src={avatarSrc} 
                                alt="Perfil"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    console.error("Error cargando imagen:", e);
                                    setImageError(true);
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[#003366] text-3xl font-bold">
                                {formData.first_name ? formData.first_name.charAt(0) : <User size={40}/>}
                            </div>
                        )}

                        {uploading && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                                <Loader2 className="text-white animate-spin" size={24}/>
                            </div>
                        )}
                    </div>
                    
                    <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border border-slate-200 text-[#003366] hover:bg-slate-100 transition-colors z-30">
                        <Camera size={16} />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                
                {/* --- DEBUG: LINK DIRECTO --- */}
                {formData.avatar_url && (
                   <a 
                     href={formData.avatar_url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="text-[10px] text-blue-200 hover:text-white underline mb-2 flex items-center gap-1 justify-center"
                   >
                     {imageError ? "Error de carga (Ver Original)" : "Ver imagen original"} <ExternalLink size={10}/>
                   </a>
                )}

                <h3 className="font-bold text-xl leading-tight mb-1">
                    {formData.first_name} {formData.paternal_surname}
                </h3>
                <span className="inline-block px-3 py-1 bg-[#f0c419] text-[#003366] text-xs font-bold rounded-full">
                    {formData.category}
                </span>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* ... (RESTO DE LOS CAMPOS IDÉNTICOS AL ANTERIOR) ... */}
        {/* IDENTIDAD */}
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

        {/* AFILIACIÓN */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-2"><Landmark size={14}/> Afiliación</h3>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium ml-1">Sistema de Pensiones</label>
                    <div className="relative">
                        <select name="pension_system" value={formData.pension_system} onChange={handleChange} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold appearance-none focus:border-[#003366] outline-none">
                            {AFPS.map(afp => <option key={afp} value={afp}>{afp}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                </div>
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

        {/* DATOS COMPLEMENTARIOS */}
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

        {/* SEGURIDAD */}
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

        <button disabled={loading} className="w-full py-4 bg-[#003366] text-white rounded-2xl font-bold shadow-xl shadow-blue-900/20 hover:bg-blue-900 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={20}/> Guardar Cambios</>}
        </button>

      </form>
      
      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({...notification, isOpen:false})} type={notification.type} title={notification.title} message={notification.message}/>
      
      <ImageCropperModal 
        isOpen={isCropperOpen}
        onClose={() => {
            setIsCropperOpen(false);
            setTempImageSrc(null); 
        }}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default WorkerProfilePage;