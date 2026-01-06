import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Edit2, Save, Camera, Lock, Loader2, 
  Briefcase, CheckCircle2
} from 'lucide-react';
import { Avatar } from "@heroui/react";
import { supabase } from '../../services/supabase';

// --- MODALES PERSONALIZADOS ---
import StatusModal from '../../components/common/StatusModal';
import ConfirmDeleteModal from '../projects/components/ConfirmDeleteModal';
// IMPORTAMOS EL NUEVO MODAL DE RECORTE
import ImageCropperModal from '../../components/common/ImageCropperModal';

const ADMIN_SESSION_KEY = 'lyk_admin_session'; // CLAVE DE SESIÓN LOCAL

const UserProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estados de edición
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingWork, setIsEditingWork] = useState(false);
  
  // Estados para contadores
  const [projectStats, setProjectStats] = useState({ active: 0, historical: 0, loading: true });

  // Estados para Modales y Notificaciones
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);

  // --- NUEVOS ESTADOS PARA EL CROPPER ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  // --------------------------------------

  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    role: 'Administrador',
    entry_date: '',
    birth_date: '',
    district: '',
    phone: '',
    notifications: true,
    area: '',
    team_size: 0,
    experience_years: 0,
    headquarters: '',
    status: 'Activo',
    avatar_url: '' 
  });

  // --- FUNCIÓN AUXILIAR PARA OBTENER USUARIO (CON FALLBACK) ---
  const getCurrentUserWithFallback = async () => {
    // 1. Intentar con Supabase Auth (Servidor)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;

    // 2. Si falla, intentar con LocalStorage (Sesión persistida)
    const localSession = localStorage.getItem(ADMIN_SESSION_KEY);
    if (localSession) {
      try {
        const parsed = JSON.parse(localSession);
        // Normalizamos para devolver algo con estructura { id, email }
        return {
          id: parsed.id || parsed.user?.id,
          email: parsed.email || parsed.user?.email,
          ...parsed
        };
      } catch (e) {
        console.error("Error leyendo sesión local", e);
      }
    }
    return null;
  };

  // --- 1. CARGA DE PERFIL ---
  const fetchProfile = async () => {
    try {
      const user = await getCurrentUserWithFallback();
      
      // Si después de intentar ambos métodos no hay usuario, entonces sí redirigimos
      if (!user || !user.id) {
        navigate('/'); 
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      } else {
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.full_name || ''
        }));
      }

      fetchProjectStats();

    } catch (error) {
      console.error('Error general cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async () => {
    try {
        const { count: activeCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'En Ejecución');

        const { count: historyCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .in('status', ['Completado', 'Entregado', 'Cancelado']);

        setProjectStats({
            active: activeCount || 0,
            historical: historyCount || 0,
            loading: false
        });
    } catch (e) {
        console.error("Error cargando stats", e);
        setProjectStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // --- 2. MANEJO DE FOTO (INICIO) ---
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  // Este paso solo lee el archivo y abre el modal de recorte
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Limpiamos el input para que permita seleccionar el mismo archivo otra vez si se cancela
    event.target.value = '';

    // Creamos una URL temporal para mostrar la imagen en el cropper
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setTempImageSrc(reader.result); // Guardamos la imagen cruda
      setIsCropperOpen(true); // Abrimos el modal
    });
    reader.readAsDataURL(file);
  };

  // --- 3. MANEJO DE FOTO (FINAL: RECORTADA Y COMPRIMIDA) ---
  // Esta función la llama el ImageCropperModal cuando termina
  const handleCropComplete = async (croppedBlob) => {
    setUploading(true);
    setIsCropperOpen(false); // Cerramos el modal

    try {
      const user = await getCurrentUserWithFallback();
      if (!user || !user.id) throw new Error("Sesión expirada o inválida");

      // Usamos un timestamp para hacer el nombre de archivo ÚNICO cada vez.
      const timestamp = new Date().getTime();
      const fileName = `avatar_${user.id}_${timestamp}.jpg`; 

      // Subimos la imagen ya recortada y comprimida (es un Blob)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, {
           contentType: 'image/jpeg',
           cacheControl: '3600', 
           upsert: false 
        });

      if (uploadError) throw uploadError;

      // Obtenemos la URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Actualizamos el perfil en la base de datos con la nueva URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ 
            id: user.id, 
            avatar_url: publicUrl, 
            updated_at: new Date()
        });

      if (updateError) throw updateError;

      // Actualizamos el estado local para que se vea inmediatamente
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Disparamos evento global por si el sidebar necesita actualizarse
      window.dispatchEvent(new Event('profileUpdated'));
      
      setNotification({ 
          isOpen: true, type: 'success', 
          title: 'Foto Actualizada', 
          message: 'Tu foto de perfil se ha recortado y subido correctamente.' 
      });

    } catch (error) {
      console.error('Error subiendo foto recortada:', error);
      setNotification({ 
          isOpen: true, type: 'error', 
          title: 'Error de Subida', 
          message: error.message || 'No se pudo subir la imagen.' 
      });
    } finally {
      setUploading(false);
      setTempImageSrc(null); // Limpiamos la imagen temporal
    }
  };


  // --- 4. FUNCIONES DE ACTUALIZACIÓN DE DATOS ---
  const handleUpdate = async (section) => {
    setSaving(true);
    try {
      const user = await getCurrentUserWithFallback();
      if (!user || !user.id) throw new Error("No se pudo identificar al usuario");
      
      const cleanProfile = {
        ...profile,
        id: user.id,
        updated_at: new Date()
      };

      const { error } = await supabase.from('profiles').upsert(cleanProfile);
      if (error) throw error;
      
      if (section === 'personal') setIsEditingPersonal(false);
      if (section === 'work') setIsEditingWork(false);
      
      setProfile(cleanProfile);
      window.dispatchEvent(new Event('profileUpdated'));
      
      setNotification({ 
          isOpen: true, type: 'success', 
          title: 'Perfil Guardado', 
          message: 'La información ha sido actualizada exitosamente.' 
      });

    } catch (error) {
      console.error('Error:', error);
      setNotification({ 
          isOpen: true, type: 'error', 
          title: 'Error al Guardar', 
          message: error.message 
      });
    } finally {
      setSaving(false);
    }
  };

  // --- 5. LÓGICA DE CONTRASEÑA ---
  const handlePasswordResetClick = () => {
      setIsConfirmResetOpen(true);
  };

  const executePasswordReset = async () => {
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
              redirectTo: window.location.origin + '/reset-password',
          });
          if (error) throw error;
          
          setNotification({ 
              isOpen: true, type: 'success', 
              title: 'Correo Enviado', 
              message: `Se ha enviado un enlace de recuperación a ${profile.email}.` 
          });
      } catch (e) {
          setNotification({ 
              isOpen: true, type: 'error', 
              title: 'Error de Envío', 
              message: e.message 
          });
      } finally {
          setIsConfirmResetOpen(false);
      }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-slate-400"/></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-6 pb-10"
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Mi Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLUMNA IZQUIERDA: RESUMEN === */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center h-fit">
          
          {/* Avatar con Indicador de Carga */}
          <div className="relative mb-4 group cursor-pointer" onClick={handleAvatarClick}>
            <div className={`p-1 rounded-full border-4 border-slate-50 relative overflow-hidden ${uploading ? 'opacity-50' : ''}`}>
               {/* Usamos la URL como key para forzar re-render si cambia */}
               <Avatar 
                 key={profile.avatar_url} 
                 src={profile.avatar_url} 
                 className="w-32 h-32 text-large" 
                 showFallback
                 name={profile.full_name}
                 imgProps={{ 
                    referrerPolicy: "no-referrer",
                    onError: (e) => { e.target.src = 'https://via.placeholder.com/150?text=IMG'; }
                 }} 
               />
               
               {uploading && (
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-full">
                    <Loader2 className="text-white animate-spin" size={24}/>
                 </div>
               )}
            </div>
            
            <div className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-[#0F172A] transition-colors z-10">
               <Camera size={18} />
            </div>
            
            {/* Input de archivo oculto */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 capitalize">{profile.full_name || 'Usuario'}</h2>
          <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
          
          <div className="mt-4 mb-8">
             <span className="px-5 py-2 bg-blue-50 text-[#003366] rounded-xl text-sm font-bold border border-blue-100">
               {profile.role}
             </span>
          </div>

          <div className="w-full space-y-4 mb-8">
             <div className="flex justify-between items-center px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Miembro desde</span>
                <span className="text-sm font-bold text-slate-800">{profile.entry_date || new Date().toLocaleDateString()}</span>
             </div>
          </div>

          <div className="w-full space-y-3">
             <button 
                onClick={handlePasswordResetClick}
                className="w-full py-3.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2 group hover:border-blue-200"
             >
                <Lock size={18} className="group-hover:text-blue-600 transition-colors"/> Restablecer contraseña
             </button>
          </div>
        </div>

        {/* === COLUMNA DERECHA: FORMULARIOS === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tarjeta Personal */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative">
             <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Información personal
                </h3>
                <button 
                  onClick={() => isEditingPersonal ? handleUpdate('personal') : setIsEditingPersonal(true)}
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditingPersonal ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                   {saving && isEditingPersonal ? <Loader2 size={16} className="animate-spin"/> : (isEditingPersonal ? <><Save size={16}/> Guardar</> : <><Edit2 size={16}/> Editar</>)}
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                <Field label="Nombres Completos" name="full_name" value={profile.full_name} onChange={handleChange} isEditing={isEditingPersonal} />
                <Field label="Correo Electrónico" name="email" value={profile.email} onChange={handleChange} isEditing={isEditingPersonal} type="email" />
                <Field label="Fecha de Nacimiento" name="birth_date" value={profile.birth_date} onChange={handleChange} isEditing={isEditingPersonal} type="date" />
                <Field label="Distrito" name="district" value={profile.district} onChange={handleChange} isEditing={isEditingPersonal} />
                <Field label="Celular" name="phone" value={profile.phone} onChange={handleChange} isEditing={isEditingPersonal} />
                <div className="flex flex-col gap-2">
                   <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Notificaciones</label>
                   <div className="h-10 flex items-center">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${profile.notifications ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                         {profile.notifications ? 'Activadas' : 'Desactivadas'}
                      </span>
                   </div>
                </div>
             </div>
          </div>

          {/* Tarjeta Trabajo */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative">
             <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800">Información de trabajo</h3>
                <button 
                  onClick={() => isEditingWork ? handleUpdate('work') : setIsEditingWork(true)}
                  disabled={saving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isEditingWork ? 'bg-[#0F172A] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                   {saving && isEditingWork ? <Loader2 size={16} className="animate-spin"/> : (isEditingWork ? <><Save size={16}/> Guardar</> : <><Edit2 size={16}/> Editar</>)}
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                
                {/* WIDGET DE PROYECTOS */}
                <div className="col-span-1 md:col-span-2 bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-2">
                   <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-3">Resumen de Proyectos</label>
                   
                   {projectStats.loading ? (
                       <div className="flex gap-2 items-center text-slate-400 text-sm">
                           <Loader2 size={16} className="animate-spin"/> Calculando...
                       </div>
                   ) : (
                       <div className="flex gap-8">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-100 text-[#003366] rounded-lg">
                                   <Briefcase size={20}/>
                               </div>
                               <div>
                                   <p className="text-2xl font-bold text-slate-800 leading-none">{projectStats.active}</p>
                                   <p className="text-xs text-slate-500 font-bold mt-1">Activos</p>
                               </div>
                           </div>
                           <div className="w-px bg-slate-200 h-10 self-center"></div>
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                   <CheckCircle2 size={20}/>
                               </div>
                               <div>
                                   <p className="text-2xl font-bold text-slate-800 leading-none">{projectStats.historical}</p>
                                   <p className="text-xs text-slate-500 font-bold mt-1">Históricos</p>
                               </div>
                           </div>
                       </div>
                   )}
                </div>
                
                <Field label="Área" name="area" value={profile.area} onChange={handleChange} isEditing={isEditingWork} />
                <Field label="Equipo a cargo" name="team_size" value={profile.team_size} onChange={handleChange} isEditing={isEditingWork} type="number" suffix="profesionales" />
                <Field label="Experiencia" name="experience_years" value={profile.experience_years} onChange={handleChange} isEditing={isEditingWork} type="number" suffix="años" />
                <Field label="Sede" name="headquarters" value={profile.headquarters} onChange={handleChange} isEditing={isEditingWork} />
                
                <div className="flex flex-col gap-2">
                   <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Estado de Cuenta</label>
                   <div className="h-10 flex items-center">
                      <span className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         {profile.status}
                      </span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* --- MODALES --- */}
      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmResetOpen}
        onClose={() => setIsConfirmResetOpen(false)}
        onConfirm={executePasswordReset}
        title="¿Restablecer contraseña?"
        message={`Se enviará un correo a ${profile.email} con las instrucciones para crear una nueva contraseña. ¿Deseas continuar?`}
        confirmText="Enviar Correo" 
      />

      <ImageCropperModal 
        isOpen={isCropperOpen}
        onClose={() => {
            setIsCropperOpen(false);
            setTempImageSrc(null); 
        }}
        imageSrc={tempImageSrc}
        onCropComplete={handleCropComplete}
      />

    </motion.div>
  );
};

const Field = ({ label, name, value, onChange, isEditing, type = "text", suffix = "" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{label}</label>
    {isEditing ? (
      <input 
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#0F172A] focus:ring-0 outline-none transition-all"
        placeholder={`Ingresa ${label.toLowerCase()}`}
      />
    ) : (
      <p className="text-slate-800 font-medium text-base py-2.5 border-b border-transparent truncate">
        {value || '-'} {value && suffix ? ` ${suffix}` : ''}
      </p>
    )}
  </div>
);

export default UserProfilePage;