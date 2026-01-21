import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Edit2, Save, Camera, Lock, Loader2, 
  Briefcase, User, Shield, 
  Eye, EyeOff, MapPin, Heart, GraduationCap, 
  CreditCard, FileText, Building2, FileDown
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import bcrypt from 'bcryptjs';

// Importamos el generador PDF
import { generateStaffPDF } from '../../utils/staffPdfGenerator';

// --- MODALES ---
import StatusModal from '../../components/common/StatusModal';
import ImageCropperModal from '../../components/common/ImageCropperModal';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // --- ESTADOS DE CARGA ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // --- PESTAÑA ACTIVA ---
  const [activeTab, setActiveTab] = useState('general'); 

  // --- ESTADOS DE EDICIÓN ---
  const [isEditing, setIsEditing] = useState(false);
  
  // --- ESTADOS DE CONTRASEÑA ---
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  
  // --- NOTIFICACIONES ---
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // --- CROPPING ---
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const fileInputRef = useRef(null);

  // --- DATOS DEL PERFIL ---
  const [profile, setProfile] = useState({
    id: '', full_name: '', email: '', role: 'Staff',
    entry_date: '', birth_date: '', phone: '', area: '', 
    status: 'Activo', avatar_url: '', document_number: '',
    onboarding_data: {} 
  });

  // 1. CARGA DE DATOS
  const fetchProfile = async () => {
    try {
      let currentUser = user;
      if (!currentUser || !currentUser.id) {
        const stored = localStorage.getItem('lyk_session');
        if (!stored) { navigate('/'); return; }
        currentUser = JSON.parse(stored).user;
      }

      if (!currentUser?.id) return;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      if (data) {
        // CORRECCIÓN CRÍTICA: Aseguramos que onboarding_data sea un objeto
        const safeOnboardingData = (data.onboarding_data && typeof data.onboarding_data === 'object') 
            ? data.onboarding_data 
            : {};

        setProfile({
            ...data,
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
            birth_date: data.birth_date || '',
            onboarding_data: safeOnboardingData
        });
        setCacheBuster(Date.now());
      }
    } catch (error) {
      console.error(error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo cargar la información.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);

  // 2. MANEJO DE CAMBIOS (SEGURO PARA EVITAR ERROR DE OBJETO)
  const handleChange = (e, section, index, subfield) => {
    const { name, value } = e.target;
    // Forzamos que sea string o vacío
    const safeValue = value === null || value === undefined ? '' : value;

    if (!section && !subfield) {
        setProfile(prev => ({ ...prev, [name]: safeValue }));
        return;
    }

    if (section === 'onboarding_data' && index === undefined) {
        setProfile(prev => ({
            ...prev,
            onboarding_data: { ...prev.onboarding_data, [name]: safeValue }
        }));
        return;
    }

    if (section && index !== undefined && subfield) {
        const list = [...(profile.onboarding_data[section] || [])];
        if(!list[index]) list[index] = {}; 
        list[index][subfield] = safeValue;

        setProfile(prev => ({
            ...prev,
            onboarding_data: { ...prev.onboarding_data, [section]: list }
        }));
    }
  };

  // 3. GUARDAR TODO
  const handleSaveAll = async () => {
    setSaving(true);
    try {
        const { error } = await supabase
            .from('employees')
            .update({
                full_name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
                birth_date: profile.birth_date || null,
                onboarding_data: profile.onboarding_data
            })
            .eq('id', profile.id);

        if (error) throw error;
        setIsEditing(false);
        setNotification({ isOpen: true, type: 'success', title: 'Guardado', message: 'Perfil actualizado correctamente.' });
        
        // Actualizar localStorage
        const stored = JSON.parse(localStorage.getItem('lyk_session') || '{}');
        if(stored.user) {
            stored.user.onboarding_data = profile.onboarding_data;
            localStorage.setItem('lyk_session', JSON.stringify(stored));
        }
    } catch (error) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally {
        setSaving(false);
    }
  };

  // 4. FOTO DE PERFIL
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = () => { setTempImageSrc(reader.result); setIsCropperOpen(true); };
        reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob) => {
    setUploading(true);
    setIsCropperOpen(false);
    try {
        const fileName = `avatar_${profile.id}.jpg`;
        await supabase.storage.from('avatars').upload(fileName, blob, { upsert: true });
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        await supabase.from('employees').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
        setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));
        setCacheBuster(Date.now());
        setNotification({ isOpen: true, type: 'success', title: 'Foto', message: 'Foto actualizada.' });
    } catch (e) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'Falló la subida.' });
    } finally {
        setUploading(false);
    }
  };

  // 5. CAMBIO PASSWORD
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword) return;
    setSavingPassword(true);
    try {
        const hash = bcrypt.hashSync(passwordForm.newPassword, 10);
        await supabase.from('employees').update({ password: hash }).eq('id', profile.id);
        setPasswordForm({ newPassword: '' });
        setNotification({ isOpen: true, type: 'success', title: 'Éxito', message: 'Contraseña actualizada.' });
    } catch (error) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo actualizar.' });
    } finally {
        setSavingPassword(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400"/></div>;
  
  const avatarSrc = profile.avatar_url ? `${profile.avatar_url}?t=${cacheBuster}` : null;
  const ob = profile.onboarding_data || {}; 

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 pb-20 p-4 md:p-6">
      
      {/* HEADER CON BOTONES */}
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
            <p className="text-slate-500 text-sm">Gestiona tu información personal y laboral</p>
         </div>
         
         <div className="flex gap-3">
             {/* BOTÓN PDF ARREGLADO */}
             <button 
                onClick={() => generateStaffPDF(profile)} 
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95"
             >
                <FileDown size={18} /> Descargar PDF
             </button>

             {/* BOTÓN EDITAR */}
             <button 
                onClick={() => isEditing ? handleSaveAll() : setIsEditing(true)} 
                disabled={saving} 
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 ${isEditing ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-[#0F172A] text-white hover:bg-slate-800'}`}
             >
                {saving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <><Save size={18}/> Guardar Cambios</> : <><Edit2 size={18}/> Editar Perfil</>)}
             </button>
         </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <TabBtn id="general" label="General" icon={User} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="details" label="Detalles" icon={FileText} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="professional" label="Profesional" icon={Briefcase} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="bank" label="Bancario" icon={CreditCard} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: RESUMEN */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center h-fit sticky top-6">
          <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current.click()}>
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
            <div className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-[#0F172A] z-10 transition-colors">
                <Camera size={18} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          </div>

          <h2 className="text-xl font-bold text-slate-800 capitalize leading-tight">{profile.full_name || 'Usuario'}</h2>
          <p className="text-slate-400 text-xs mt-1">{profile.email}</p>
          <div className="mt-4 mb-6">
             <span className="px-4 py-1.5 bg-blue-50 text-[#003366] rounded-lg text-xs font-bold border border-blue-100 capitalize">
                {profile.role?.replace(/_/g, ' ')}
             </span>
          </div>
          <div className="w-full space-y-3 pt-6 border-t border-slate-100">
             <InfoRow label="Ingreso" val={profile.entry_date} />
             <InfoRow label="Área" val={profile.area} />
             <InfoRow label="Nacionalidad" val={ob.nationality} />
             <InfoRow label="DNI" val={profile.document_number} />
          </div>
        </div>

        {/* COLUMNA DERECHA: CONTENIDO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                 <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Datos Básicos</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <Field label="Nombres Completos" name="full_name" value={profile.full_name} onChange={handleChange} isEditing={isEditing} />
                    <Field label="Correo" name="email" value={profile.email} onChange={handleChange} isEditing={isEditing} type="email" />
                    <Field label="F. Nacimiento" name="birth_date" value={profile.birth_date} onChange={handleChange} isEditing={isEditing} type="date" />
                    <Field label="Teléfono" name="phone" value={profile.phone} onChange={handleChange} isEditing={isEditing} />
                 </div>
               </div>

               {/* Seguridad */}
               <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Shield size={18}/> Seguridad</h3>
                 <form onSubmit={handlePasswordUpdate} className="flex flex-col md:flex-row gap-4 items-end">
                     <div className="w-full relative">
                        <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nueva Contraseña</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type={showPassword ? "text" : "password"} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ newPassword: e.target.value })} className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#003366] transition-all" placeholder="******" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                        </div>
                     </div>
                     <button type="submit" disabled={savingPassword || !passwordForm.newPassword} className="py-2.5 px-6 bg-[#003366] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-blue-900 disabled:opacity-50 transition-all">
                        {savingPassword ? <Loader2 className="animate-spin" size={18}/> : 'Actualizar'}
                     </button>
                 </form>
               </div>
            </motion.div>
          )}

          {/* TAB 2: DETALLES */}
          {activeTab === 'details' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><MapPin size={18} className="text-blue-600"/> Domicilio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Dirección" name="address" value={ob.address} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Distrito" name="district" value={ob.district} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Provincia" name="province" value={ob.province} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Departamento" name="department" value={ob.department} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Heart size={18} className="text-red-500"/> Familia y Emergencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Field label="Estado Civil" name="civil_status" value={ob.civil_status} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Cónyuge" name="spouse_name" value={ob.spouse_name} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Hijos/Dependientes" name="has_dependents" value={ob.has_dependents} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <h4 className="text-xs font-bold text-red-800 uppercase mb-3">Contacto de Emergencia</h4>
                        <div className="flex gap-4">
                            <Field label="Nombre" name="emergency_contact_name" value={ob.emergency_contact_name} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                            <Field label="Teléfono" name="emergency_contact_phone" value={ob.emergency_contact_phone} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex gap-8">
                    <Field label="Talla Polo" name="shirt_size" value={ob.shirt_size} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    <Field label="Talla Pantalón" name="pants_size" value={ob.pants_size} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    <Field label="Calzado" name="shoe_size" value={ob.shoe_size} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                </div>
            </motion.div>
          )}

          {/* TAB 3: PROFESIONAL */}
          {activeTab === 'professional' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><GraduationCap size={20} className="text-emerald-600"/> Formación Académica</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <Field label="Nivel" name="education_level" value={ob.education_level} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Estado" name="education_status" value={ob.education_status} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Institución" name="institution" value={ob.institution} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Año Egreso" name="grad_year" value={ob.grad_year} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-blue-600"/> Experiencia Laboral</h3>
                    <div className="space-y-4">
                        {(ob.work_experience || []).map((exp, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Field label="Empresa" name="company" value={exp.company} onChange={e => handleChange(e, 'work_experience', idx, 'company')} isEditing={isEditing} />
                                    <Field label="Cargo" name="position" value={exp.position} onChange={e => handleChange(e, 'work_experience', idx, 'position')} isEditing={isEditing} />
                                    <Field label="Inicio" name="start" value={exp.start} onChange={e => handleChange(e, 'work_experience', idx, 'start')} isEditing={isEditing} type="date" />
                                    <Field label="Fin" name="end" value={exp.end} onChange={e => handleChange(e, 'work_experience', idx, 'end')} isEditing={isEditing} type="date" />
                                    <div className="md:col-span-2">
                                        <Field label="Funciones" name="functions" value={exp.functions} onChange={e => handleChange(e, 'work_experience', idx, 'functions')} isEditing={isEditing} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!ob.work_experience || ob.work_experience.length === 0) && <p className="text-sm text-slate-400 italic">No se registró experiencia.</p>}
                    </div>
                </div>
             </motion.div>
          )}

          {/* TAB 4: BANCARIO */}
          {activeTab === 'bank' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Building2 size={20} className="text-indigo-600"/> Información Bancaria</h3>
                 
                 <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={120}/></div>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Banco Principal</p>
                    <p className="text-2xl font-bold mb-6">{ob.bank_name || 'No registrado'}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase">Número de Cuenta</p>
                            <p className="font-mono text-lg tracking-wider">{ob.bbva_account || '-'}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase">CCI</p>
                            <p className="font-mono text-lg tracking-wider">{ob.interbank_account || '-'}</p>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Sistema Pensión" name="afp_status" value={ob.afp_status} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    <Field label="Observaciones" name="bank_observations" value={ob.bank_observations} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                 </div>
              </motion.div>
          )}

        </div>
      </div>

      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} type={notification.type} title={notification.title} message={notification.message} />
      <ImageCropperModal isOpen={isCropperOpen} onClose={() => { setIsCropperOpen(false); setTempImageSrc(null); }} imageSrc={tempImageSrc} onCropComplete={handleCropComplete} />
    </motion.div>
  );
};

// COMPONENTES AUXILIARES
const InfoRow = ({ label, val }) => (
    <div className="flex justify-between items-center w-full py-1">
        <span className="text-xs text-slate-400 font-medium">{label}</span>
        <span className="text-xs font-bold text-slate-700">{val ? String(val) : '-'}</span>
    </div>
);

const TabBtn = ({ id, label, icon: Icon, active, onClick }) => (
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active === id ? 'bg-slate-100 text-[#0F172A] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
        <Icon size={16} className={active === id ? 'text-blue-600' : ''}/> {label}
    </button>
);

const Field = ({ label, name, value, onChange, isEditing, type = "text" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</label>
    {isEditing ? (
      <input type={type} name={name} value={value || ''} onChange={onChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:bg-white focus:border-[#0F172A] outline-none transition-all" />
    ) : (
      <p className="text-slate-800 font-medium text-sm py-1 border-b border-transparent truncate min-h-[1.75rem]">{value ? String(value) : '-'}</p>
    )}
  </div>
);

export default UserProfilePage;