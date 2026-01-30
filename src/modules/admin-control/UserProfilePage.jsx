import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Edit2, Save, Camera, Lock, Loader2, 
  Briefcase, User, Shield, 
  Eye, EyeOff, MapPin, Heart, GraduationCap, 
  CreditCard, FileText, Building2, FileDown, Calendar
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import bcrypt from 'bcryptjs';

import { generateStaffPDF } from '../../utils/staffPdfGenerator';
import StatusModal from '../../components/common/StatusModal';
import ImageCropperModal from '../../components/common/ImageCropperModal';

const PENSION_SYSTEMS = [
  'ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'
];

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState('general'); 
  const [isEditing, setIsEditing] = useState(false);
  
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    id: user?.id || '', 
    full_name: user?.full_name || '', 
    email: user?.email || '', 
    role: user?.role || 'Staff', 
    entry_date: user?.entry_date || '', 
    birth_date: '', phone: '', area: user?.area || '', 
    status: 'Activo', avatar_url: user?.avatar_url || '', document_number: '',
    onboarding_data: {} 
  });

  const fetchProfile = async () => {
    try {
      let currentUser = user;
      
      if (!currentUser || !currentUser.id) {
        const stored = localStorage.getItem('lyk_session');
        if (!stored) { navigate('/'); return; }
        const parsed = JSON.parse(stored);
        currentUser = parsed.user;
        if(parsed.role && currentUser) currentUser.role = parsed.role;
      }

      if (!currentUser?.id) return;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        logout(); 
        return;
      }

      if (data) {
        const safeOnboardingData = (data.onboarding_data && typeof data.onboarding_data === 'object') 
            ? data.onboarding_data 
            : {};

        setProfile({
            ...data,
            role: data.role || currentUser.role || 'Staff', 
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

  const handleChange = (e, section, index, subfield) => {
    const { name, value } = e.target;
    const safeValue = value === null || value === undefined ? '' : value;

    // Lógica para actualizar estado
    setProfile(prev => {
        let newProfile = { ...prev };

        if (!section && !subfield) {
            newProfile[name] = safeValue;
        } else if (section === 'onboarding_data' && index === undefined) {
            newProfile.onboarding_data = { ...prev.onboarding_data, [name]: safeValue };
        } else if (section && index !== undefined && subfield) {
            const list = [...(prev.onboarding_data[section] || [])];
            if(!list[index]) list[index] = {}; 
            list[index][subfield] = safeValue;
            newProfile.onboarding_data = { ...prev.onboarding_data, [section]: list };
        }

        // LÓGICA DE CALCULO DE EDAD AUTOMÁTICO
        if (name === 'birth_date') {
            const birth = new Date(safeValue);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                age--;
            }
            // Actualizamos la edad dentro de onboarding_data
            newProfile.onboarding_data = { 
                ...newProfile.onboarding_data, 
                age: age.toString() 
            };
        }

        return newProfile;
    });
  };

  const handleArrayChange = (value, section, index, subIndex) => {
      const list = [...(profile.onboarding_data[section] || [])];
      if (!list[index]) return;
      
      const subList = [...(list[index].functions || [])];
      subList[subIndex] = value;
      list[index].functions = subList;

      setProfile(prev => ({
          ...prev,
          onboarding_data: { ...prev.onboarding_data, [section]: list }
      }));
  };

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

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generateStaffPDF(profile);
    } catch (error) {
      console.error("Error capturado en UI:", error);
      setNotification({
        isOpen: true, 
        type: 'error', 
        title: 'Error PDF', 
        message: 'No se pudo generar el PDF. Verifica la consola.'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="w-10 h-10 animate-spin text-slate-400"/></div>;
  
  const avatarSrc = profile.avatar_url ? `${profile.avatar_url}?t=${cacheBuster}` : null;
  const ob = profile.onboarding_data || {}; 

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 pb-20 p-4 md:p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
            <p className="text-slate-500 text-sm">Gestiona tu información personal y laboral</p>
         </div>
         
         <div className="flex items-center gap-3">
             <button 
                onClick={handleDownloadPDF} 
                disabled={generatingPdf}
                title="Descargar Ficha PDF"
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 shadow-sm transition-all active:scale-95 disabled:opacity-50"
             >
                {generatingPdf ? <Loader2 className="animate-spin" size={20}/> : <FileDown size={20} />}
             </button>

             <button 
                onClick={() => isEditing ? handleSaveAll() : setIsEditing(true)} 
                disabled={saving} 
                title={isEditing ? "Guardar Cambios" : "Editar Información"}
                className={`w-11 h-11 flex items-center justify-center rounded-full border shadow-sm transition-all active:scale-95 ${
                    isEditing 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                    : 'bg-white border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50'
                }`}
             >
                {saving ? <Loader2 className="animate-spin" size={20}/> : (isEditing ? <Save size={20}/> : <Edit2 size={20}/>)}
             </button>
         </div>
      </div>

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
                    
                    {/* FECHA DE NACIMIENTO Y EDAD */}
                    <Field label="F. Nacimiento" name="birth_date" value={profile.birth_date} onChange={handleChange} isEditing={isEditing} type="date" />
                    <Field label="Edad" name="age" value={ob.age} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} type="number" />
                    
                    {/* SEXO Y SISTEMA DE PENSIÓN */}
                    <Field label="Sexo" name="gender" value={ob.gender} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    
                    {/* PENSION SYSTEM - SELECTOR */}
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Sistema Pensión</label>
                            <select 
                                name="afp_status" 
                                value={ob.afp_status || ''} 
                                onChange={e => handleChange(e, 'onboarding_data')} 
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 font-medium focus:bg-white focus:border-[#0F172A] outline-none transition-all"
                            >
                                <option value="">-- Seleccione --</option>
                                {PENSION_SYSTEMS.map(sys => <option key={sys} value={sys}>{sys}</option>)}
                            </select>
                        </div>
                    ) : (
                        <Field label="Sistema Pensión" name="afp_status" value={ob.afp_status} onChange={e => handleChange(e, 'onboarding_data')} isEditing={false} />
                    )}

                    {/* CARGO Y FECHA DE INGRESO */}
                    <Field label="Cargo" name="role" value={profile.role} onChange={handleChange} isEditing={false} />
                    <Field label="Fecha Ingreso" name="entry_date" value={profile.entry_date} onChange={handleChange} isEditing={isEditing} type="date" />

                    <Field label="Celular Principal" name="phone" value={profile.phone} onChange={handleChange} isEditing={isEditing} />
                    <Field label="Celular Secundario" name="alt_phone" value={ob.alt_phone} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    
                    <Field label="Email Corporativo" name="email" value={profile.email} onChange={handleChange} isEditing={isEditing} type="email" />
                    <Field label="Email Personal" name="personal_email" value={ob.personal_email} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} type="email" />
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
                        <Field label="Nombre Padre" name="father_name" value={ob.father_name} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                        <Field label="Nombre Madre" name="mother_name" value={ob.mother_name} onChange={e => handleChange(e, 'onboarding_data')} isEditing={isEditing} />
                    </div>

                    {/* LISTA DE HIJOS */}
                    {ob.children && ob.children.length > 0 && (
                        <div className="mb-6 bg-slate-50 p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Detalle Hijos</h4>
                            {ob.children.map((child, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-slate-100 last:border-0">
                                    <span>{child.name}</span>
                                    <span className="font-bold text-slate-600">{child.age} años</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LISTA DE EMERGENCIAS */}
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <h4 className="text-xs font-bold text-red-800 uppercase mb-3">Contactos de Emergencia</h4>
                        {ob.emergency_contacts && ob.emergency_contacts.length > 0 ? (
                            ob.emergency_contacts.map((contact, idx) => (
                                <div key={idx} className="mb-2 pb-2 border-b border-red-100 last:border-0 last:mb-0 last:pb-0">
                                    <p className="font-bold text-slate-800 text-sm">{contact.name}</p>
                                    <div className="flex gap-4 text-xs text-slate-600">
                                        <span>Relación: {contact.relationship}</span>
                                        <span>Tel: {contact.phone}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-red-400 italic">Sin contactos registrados.</p>
                        )}
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
                    
                    {/* VISUALIZAR CURSOS */}
                    {ob.additional_courses && ob.additional_courses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Cursos Adicionales</h4>
                            <ul className="space-y-1">
                                {ob.additional_courses.map((course, idx) => (
                                    <li key={idx} className="text-sm text-slate-700 flex justify-between">
                                        <span>• {course.name}</span>
                                        <span className="text-slate-400 text-xs">{course.date}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
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
                                    
                                    <div className="md:col-span-2 mt-2">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Funciones</label>
                                        {Array.isArray(exp.functions) ? (
                                            isEditing ? (
                                                <div className="space-y-1 mt-1">
                                                    {exp.functions.map((func, fIdx) => (
                                                        <input 
                                                            key={fIdx}
                                                            className="w-full text-sm bg-white border border-slate-200 rounded px-2 py-1"
                                                            value={func}
                                                            onChange={(e) => handleArrayChange(e.target.value, 'work_experience', idx, fIdx)}
                                                        />
                                                    ))}
                                                </div>
                                            ) : (
                                                <ul className="list-disc pl-4 mt-1 text-sm text-slate-700 space-y-1">
                                                    {exp.functions.map((func, fIdx) => (
                                                        <li key={fIdx}>{func}</li>
                                                    ))}
                                                </ul>
                                            )
                                        ) : (
                                            <p className="text-sm text-slate-700">{exp.functions || '-'}</p>
                                        )}
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