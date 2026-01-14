import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Edit2, Save, Camera, Lock, Loader2, 
  Briefcase, CheckCircle2, User, Eye, EyeOff, Shield
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import bcrypt from 'bcryptjs'; // Asegúrate de tener instalado: npm install bcryptjs

// --- MODALES PERSONALIZADOS ---
// Ajusta las rutas si tus componentes están en otra carpeta
import StatusModal from '../../components/common/StatusModal';
import ImageCropperModal from '../../components/common/ImageCropperModal';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // --- ESTADOS DE CARGA ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // --- ESTADOS DE EDICIÓN ---
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  
  // --- ESTADOS DE CONTRASEÑA ---
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  // --- ESTADOS DE MÉTRICAS ---
  const [projectStats, setProjectStats] = useState({ active: 0, historical: 0, loading: true });

  // --- NOTIFICACIONES Y MODALES ---
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // --- ESTADOS PARA FOTO DE PERFIL (CROPPER) ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now()); // Para romper caché del navegador
  const fileInputRef = useRef(null);

  // --- DATOS DEL PERFIL ---
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    email: '',
    role: 'Administrador',
    entry_date: '',
    birth_date: '',
    phone: '',
    area: '',
    status: 'Activo',
    avatar_url: '' 
  });

  // ========================================================================
  // 1. CARGA INICIAL DE DATOS
  // ========================================================================
  const fetchProfile = async () => {
    try {
      // Recuperar usuario del contexto o localStorage
      let currentUser = user;
      if (!currentUser || !currentUser.id) {
        const stored = localStorage.getItem('lyk_session');
        if (!stored) { navigate('/'); return; }
        currentUser = JSON.parse(stored).user;
      }

      if (!currentUser?.id) return;

      // Consulta a la tabla 'employees'
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
            ...data,
            id: data.id,
            full_name: data.full_name || '',
            email: data.email || '',
            role: data.role || 'Staff',
            avatar_url: data.avatar_url || '',
            phone: data.phone || '',
            area: data.area || data.position || '',
            birth_date: data.birth_date || ''
        });
        setCacheBuster(Date.now()); // Actualizamos timestamp
      }
      
      // Cargar métricas de proyectos
      fetchProjectStats();

    } catch (error) {
      console.error('Error cargando perfil:', error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo cargar la información del usuario.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async () => {
    try {
        const { count: activeCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'En Ejecución');
        const { count: historyCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['Completado', 'Entregado', 'Cancelado']);
        setProjectStats({ active: activeCount || 0, historical: historyCount || 0, loading: false });
    } catch (e) {
        setProjectStats(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);

  // ========================================================================
  // 2. LÓGICA DE FOTO DE PERFIL (Recorte y Subida)
  // ========================================================================
  const handleAvatarClick = () => fileInputRef.current.click();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = ''; // Limpiar input
    
    // Leer archivo para pasar al Cropper
    const reader = new FileReader();
    reader.addEventListener('load', () => { 
        setTempImageSrc(reader.result); 
        setIsCropperOpen(true); 
    });
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob) => {
    setUploading(true);
    setImageError(false);
    setIsCropperOpen(false);

    try {
      const userId = profile.id;
      if (!userId) throw new Error("ID de usuario no encontrado");

      // Nombre consistente para sobreescribir la imagen anterior
      const fileName = `avatar_employee_${userId}.jpg`; 
      
      // 1. Subir al Storage (Upsert = true para reemplazar)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      // 2. Obtener URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 3. Guardar URL en Base de Datos
      const { error: updateError } = await supabase
        .from('employees')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 4. Actualizar estado local
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      setCacheBuster(Date.now()); // Forzar recarga de imagen en UI
      
      // 5. Actualizar sesión local (LocalStorage) para persistencia
      const currentSession = JSON.parse(localStorage.getItem('lyk_session') || '{}');
      if (currentSession.user) {
          currentSession.user.avatar_url = publicUrl;
          localStorage.setItem('lyk_session', JSON.stringify(currentSession));
      }
      
      setNotification({ isOpen: true, type: 'success', title: 'Foto Actualizada', message: 'Tu nueva foto se ve genial.' });

    } catch (error) {
      console.error(error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo subir la imagen.' });
    } finally {
      setUploading(false);
      setTempImageSrc(null);
    }
  };

  // ========================================================================
  // 3. ACTUALIZAR DATOS PERSONALES
  // ========================================================================
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: profile.full_name,
        email: profile.email,
        birth_date: profile.birth_date || null,
        phone: profile.phone
      };

      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      
      setIsEditingPersonal(false);
      setNotification({ isOpen: true, type: 'success', title: 'Perfil Guardado', message: 'Tus datos han sido actualizados.' });

    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally {
      setSaving(false);
    }
  };

  // ========================================================================
  // 4. CAMBIAR CONTRASEÑA
  // ========================================================================
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) {
        setNotification({ isOpen: true, type: 'warning', title: 'Campo vacío', message: 'Ingresa una contraseña válida.' });
        return;
    }
    setSavingPassword(true);

    try {
        // Encriptar contraseña
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(passwordForm.newPassword, salt);

        const { error } = await supabase
            .from('employees')
            .update({ password: hashedPassword })
            .eq('id', profile.id);

        if (error) throw error;

        setPasswordForm({ newPassword: '' });
        setNotification({ isOpen: true, type: 'success', title: 'Contraseña Actualizada', message: 'Tu acceso ahora es más seguro.' });

    } catch (error) {
        console.error(error);
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo cambiar la contraseña.' });
    } finally {
        setSavingPassword(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // ========================================================================
  // RENDERIZADO
  // ========================================================================

  if (loading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400"/></div>;
  
  // URL con timestamp para evitar caché
  const avatarSrc = profile.avatar_url ? `${profile.avatar_url}?t=${cacheBuster}` : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-7xl mx-auto space-y-6 pb-20 p-6"
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Mi Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLUMNA IZQUIERDA: RESUMEN Y FOTO === */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center h-fit sticky top-6">
          
          <div className="relative mb-4 group cursor-pointer" onClick={handleAvatarClick}>
            <div className={`w-32 h-32 rounded-full border-4 border-slate-50 relative overflow-hidden bg-slate-100 ${uploading ? 'opacity-50' : ''}`}>
               {!imageError && avatarSrc ? (
                    <img src={avatarSrc} alt="Perfil" className="w-full h-full object-cover" onError={() => setImageError(true)} />
               ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl font-bold">
                        {profile.full_name ? profile.full_name.charAt(0) : <User size={40}/>}
                    </div>
               )}
               {uploading && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Loader2 className="text-white animate-spin" size={24}/></div>}
            </div>
            
            {/* Botón flotante de cámara */}
            <div className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-[#0F172A] z-10 transition-colors">
                <Camera size={18} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 capitalize">{profile.full_name || 'Usuario'}</h2>
          <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
          
          <div className="mt-4 mb-8">
             <span className="px-5 py-2 bg-blue-50 text-[#003366] rounded-xl text-sm font-bold border border-blue-100 capitalize">
                {profile.role}
             </span>
          </div>

          <div className="w-full space-y-4 mb-8">
             <div className="flex justify-between items-center px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Fecha Ingreso</span>
                <span className="text-sm font-bold text-slate-800">{profile.entry_date || '-'}</span>
             </div>
          </div>
        </div>

        {/* === COLUMNA DERECHA: FORMULARIOS === */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. TARJETA DE INFORMACIÓN PERSONAL */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative">
             <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">Información personal</h3>
                <button 
                  onClick={() => isEditingPersonal ? handleUpdate() : setIsEditingPersonal(true)}
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
                <Field label="Celular / Teléfono" name="phone" value={profile.phone} onChange={handleChange} isEditing={isEditingPersonal} />
             </div>
          </div>

          {/* 2. TARJETA DE SEGURIDAD (Cambio de Contraseña) */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
             {/* Decoración de fondo */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 relative z-10">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Shield size={20} className="text-[#003366]"/> Seguridad
                </h3>
             </div>
             
             <form onSubmit={handlePasswordUpdate} className="flex flex-col md:flex-row gap-4 items-end relative z-10">
                 <div className="w-full relative">
                    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 block">Nueva Contraseña</label>
                    <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ newPassword: e.target.value })}
                            className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold outline-none focus:border-[#003366] focus:bg-white transition-all"
                            placeholder="Mínimo 6 caracteres"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003366]">
                            {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                    </div>
                 </div>
                 <button 
                    type="submit"
                    disabled={savingPassword || !passwordForm.newPassword}
                    className="md:w-auto w-full py-3 px-6 bg-[#003366] text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                 >
                    {savingPassword ? <Loader2 className="animate-spin" size={20}/> : 'Actualizar'}
                 </button>
             </form>
          </div>

          {/* 3. TARJETA DE MÉTRICAS */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800">Métricas y Cargo</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-[#003366] rounded-xl"><Briefcase size={24}/></div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{projectStats.active}</p>
                        <p className="text-xs text-slate-500 font-bold">Proyectos Activos</p>
                    </div>
                </div>
                <Field label="Área / Cargo" name="area" value={profile.area} onChange={handleChange} isEditing={false} />
             </div>
          </div>

        </div>
      </div>

      {/* Componentes Flotantes */}
      <StatusModal 
        isOpen={notification.isOpen} 
        onClose={() => setNotification({ ...notification, isOpen: false })} 
        type={notification.type} 
        title={notification.title} 
        message={notification.message} 
      />
      
      <ImageCropperModal 
        isOpen={isCropperOpen} 
        onClose={() => { setIsCropperOpen(false); setTempImageSrc(null); }} 
        imageSrc={tempImageSrc} 
        onCropComplete={handleCropComplete} 
      />
    </motion.div>
  );
};

// Componente auxiliar para campos
const Field = ({ label, name, value, onChange, isEditing, type = "text" }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{label}</label>
    {isEditing ? (
      <input 
        type={type} 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:bg-white focus:border-[#0F172A] focus:ring-0 outline-none transition-all" 
      />
    ) : (
      <p className="text-slate-800 font-medium text-base py-2.5 border-b border-transparent truncate">
        {value || '-'}
      </p>
    )}
  </div>
);

export default UserProfilePage;