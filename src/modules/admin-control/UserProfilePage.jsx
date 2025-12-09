import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Edit2, Save, Camera, Lock, Trash2, UserX, Loader2
} from 'lucide-react';
import { Avatar } from "@heroui/react";
import { supabase } from '../../services/supabase';
import { compressImage } from '../../utils/imageCompressor';

const UserProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingWork, setIsEditingWork] = useState(false);
  
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

  // Cargar perfil al inicio
  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data);
        } else {
          setProfile(prev => ({
            ...prev,
            email: user.email,
            full_name: user.user_metadata?.full_name || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // --- MANEJO DE FOTO DE PERFIL ---
  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);

      // 1. Comprimir
      const compressedFile = await compressImage(file);

      // 2. Subir
      const { data: { user } } = await supabase.auth.getUser();
      // Usamos un timestamp para evitar caché del navegador
      const fileName = `${user.id}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
           cacheControl: '3600',
           upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Obtener URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // 4. Guardar URL en DB
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Actualizar estado local
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Disparar evento para que el Layout se entere (opcional, pero útil)
      window.dispatchEvent(new Event('profileUpdated'));
      
      alert("¡Foto actualizada correctamente!");

    } catch (error) {
      console.error('Error subiendo foto:', error);
      alert('Error al subir la imagen. Verifica que el bucket "avatars" sea PÚBLICO.');
    } finally {
      setUploading(false);
    }
  };

  // --- GUARDAR DATOS ---
  const handleUpdate = async (section) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No hay usuario autenticado");

      const cleanProfile = {
        ...profile,
        entry_date: profile.entry_date === '' ? null : profile.entry_date,
        birth_date: profile.birth_date === '' ? null : profile.birth_date,
        team_size: Number(profile.team_size) || 0,
        experience_years: Number(profile.experience_years) || 0
      };

      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...cleanProfile, updated_at: new Date() });

      if (error) throw error;
      
      if (section === 'personal') setIsEditingPersonal(false);
      if (section === 'work') setIsEditingWork(false);
      
      // Actualizar estado local explícitamente con los datos limpios
      setProfile(cleanProfile);
      
      // Disparar evento global para actualizar el Layout
      window.dispatchEvent(new Event('profileUpdated'));
      
      alert("¡Datos guardados con éxito!");

    } catch (error) {
      console.error('Error:', error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Perfil de usuario</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLUMNA IZQUIERDA: RESUMEN === */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center h-fit">
          
          <div className="relative mb-4 group cursor-pointer" onClick={handleAvatarClick}>
            <div className={`p-1 rounded-full border-4 border-slate-50 ${uploading ? 'opacity-50' : ''}`}>
               <Avatar 
                 key={profile.avatar_url} 
                 src={profile.avatar_url} 
                 className="w-32 h-32 text-large" 
                 showFallback
                 name={profile.full_name} 
                 srcProps={{ referrerPolicy: "no-referrer" }} 
               />
            </div>
            <div className="absolute bottom-2 right-2 bg-white p-2 rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-[#0F172A] transition-colors">
               {uploading ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18} />}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          <h2 className="text-2xl font-bold text-slate-800">{profile.full_name || 'Usuario'}</h2>
          <p className="text-slate-400 text-sm mt-1">{profile.email}</p>
          
          <div className="mt-4 mb-8">
             <span className="px-5 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold border border-slate-200">
               {profile.role}
             </span>
          </div>

          <div className="w-full space-y-4 mb-8">
             <div className="flex justify-between items-center px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-sm text-slate-500 font-medium">Fecha de Ingreso</span>
                <span className="text-sm font-bold text-slate-800">{profile.entry_date || '-'}</span>
             </div>
          </div>

          <div className="w-full space-y-3">
             <button className="w-full py-3.5 px-4 rounded-xl border border-orange-200 text-orange-600 font-bold text-sm hover:bg-orange-50 transition flex items-center justify-center gap-2">
                <UserX size={18} /> Suspender cuenta
             </button>
             <button className="w-full py-3.5 px-4 rounded-xl bg-red-50 border border-red-100 text-red-600 font-bold text-sm hover:bg-red-100 transition flex items-center justify-center gap-2">
                <Trash2 size={18} /> Eliminar cuenta
             </button>
             <button className="w-full py-3.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <Lock size={18} /> Restablecer contraseña
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
                <div className="flex flex-col gap-2">
                   <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Proyectos a cargo</label>
                   <p className="text-slate-800 font-bold text-base">5 activos / 12 históricos</p>
                </div>
                
                <Field label="Área" name="area" value={profile.area} onChange={handleChange} isEditing={isEditingWork} />
                <Field label="Equipo a cargo" name="team_size" value={profile.team_size} onChange={handleChange} isEditing={isEditingWork} type="number" suffix="profesionales" />
                <Field label="Experiencia" name="experience_years" value={profile.experience_years} onChange={handleChange} isEditing={isEditingWork} type="number" suffix="años" />
                <Field label="Sede" name="headquarters" value={profile.headquarters} onChange={handleChange} isEditing={isEditingWork} />
                
                <div className="flex flex-col gap-2">
                   <label className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Estado</label>
                   <div className="h-10 flex items-center">
                      <span className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wide">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         {profile.status}
                      </span>
                   </div>
                </div>
             </div>

             <div className="flex gap-4 mt-10 pt-6 border-t border-slate-50">
                <button className="px-6 py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition border border-slate-200">
                   Proyectos a cargo
                </button>
                <button className="px-6 py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition border border-slate-200">
                   Historial de proyectos
                </button>
             </div>
          </div>

        </div>
      </div>
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