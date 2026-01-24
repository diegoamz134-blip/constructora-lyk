import React, { useState, useEffect } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
// CORRECCIÓN: Importamos 'supabase' directamente desde tu servicio, no desde un contexto inexistente
import { supabase } from '../../services/supabase'; 
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, MapPin, CreditCard, Briefcase, Phone, 
  GraduationCap, ShieldAlert, Save, Edit2, 
  Loader2, Ruler, Heart, Camera
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';

const WorkerProfilePage = () => {
  const { worker, loading, updateProfile } = useWorkerAuth();
  const navigate = useNavigate();
  
  // Estados de UI
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  // Estado del Formulario y Avatar
  const [formData, setFormData] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (worker) {
      initializeFormData();
      setAvatarUrl(worker.avatar_url);
    }
  }, [worker]);

  const initializeFormData = () => {
    let firstName = worker.first_name || worker.nombres || '';
    let lastName = worker.last_name || worker.apellidos || '';

    if (!lastName && worker.full_name) {
        const parts = worker.full_name.split(' ');
        if (parts.length > 1) {
             if (parts.length > 2) {
                 lastName = parts.slice(-2).join(' ');
                 firstName = parts.slice(0, -2).join(' ');
             } else {
                 lastName = parts[1];
                 firstName = parts[0];
             }
        }
    }

    setFormData({
        first_name: firstName,
        last_name: lastName,
        phone: worker.phone || '',
        email: worker.email || '',
        details: {
            nationality: worker.details?.nationality || 'Peruana',
            gender: worker.details?.gender || 'Masculino',
            marital_status: worker.details?.marital_status || 'Soltero(a)',
            address: {
                street: worker.details?.address?.street || '',
                district: worker.details?.address?.district || '',
                province: worker.details?.address?.province || '',
                department: worker.details?.address?.department || 'Ica',
            },
            sizes: {
                shirt: worker.details?.sizes?.shirt || '',
                pant: worker.details?.sizes?.pant || '',
                shoe: worker.details?.sizes?.shoe || '',
            },
            cuspp: worker.details?.cuspp || '',
            emergency_contacts: worker.details?.emergency_contacts || [{ name: '', phone_cell: '', relationship: '' }],
             education: {
                level: worker.details?.education?.level || '',
                status: worker.details?.education?.status || '',
                institution: worker.details?.education?.institution || ''
            },
        },
        bank_name: worker.bank_name || '',
        bank_account: worker.bank_account || '',
        cci: worker.cci || ''
    });
  };

  const handleChange = (e, section, subfield, subfield2) => {
    const value = e.target.value;
    const name = e.target.name;

    setFormData(prev => {
        if (!section) return { ...prev, [name]: value };
        if (section === 'details' && !subfield2) {
            if(['sizes', 'address', 'education'].includes(subfield)) return prev; 
            return { ...prev, details: { ...prev.details, [subfield]: value }};
        }
        if (section === 'details' && subfield && subfield2) {
            return { ...prev, details: { ...prev.details, [subfield]: { ...prev.details[subfield], [subfield2]: value }}};
        }
        return prev;
    });
  };

  const handleEmergencyChange = (field, value) => {
      setFormData(prev => {
          const newContacts = [...(prev.details.emergency_contacts || [])];
          if(newContacts.length === 0) newContacts.push({});
          newContacts[0] = { ...newContacts[0], [field]: value };
          return { ...prev, details: { ...prev.details, emergency_contacts: newContacts }}
      });
  }

  // --- LÓGICA DE SUBIDA DE FOTO COMPRIMIDA ---
  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        Swal.fire('Error', 'Por favor selecciona un archivo de imagen.', 'error');
        return;
    }

    setUploadingPhoto(true);
    try {
        // 1. Configuración de Compresión
        const options = {
            maxSizeMB: 0.5, // Máximo 500KB
            maxWidthOrHeight: 800, // Redimensionar si es muy grande
            useWebWorker: true,
            fileType: 'image/jpeg'
        };

        // 2. Comprimir la imagen
        const compressedFile = await imageCompression(file, options);
        
        // 3. Preparar subida a Supabase
        const fileExt = 'jpg';
        // Usamos worker.id para crear una carpeta única o nombre único
        const fileName = `${worker.id}/avatar_${Date.now()}.${fileExt}`;
        
        // 4. Subir al bucket 'avatars' usando el cliente importado directamente
        let { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, compressedFile, { upsert: true });

        if (uploadError) throw uploadError;

        // 5. Obtener URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

        // 6. Actualizar perfil en base de datos
        const success = await updateProfile({ avatar_url: publicUrl });
        
        if (success) {
            setAvatarUrl(publicUrl);
            Swal.fire({
                icon: 'success',
                title: 'Foto Actualizada',
                toast: true,
                position: 'top-end',
                timer: 2000,
                showConfirmButton: false
            });
        }

    } catch (error) {
        console.error('Error subiendo foto:', error);
        Swal.fire('Error', 'No se pudo subir la imagen. Intenta de nuevo.', 'error');
    } finally {
        setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const success = await updateProfile(formData);
      if (success) {
        setIsEditing(false);
        Swal.fire({
            icon: 'success',
            title: 'Perfil Actualizado',
            text: 'Tus datos se guardaron correctamente.',
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
      }
    } catch (error) {
        console.error(error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !worker || !formData) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
         <Loader2 className="animate-spin text-[#003366] w-10 h-10" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6 pb-24 p-4 md:p-6 bg-slate-50 min-h-screen">
      
      {/* HEADER DE PÁGINA */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-2 md:static">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Mi Perfil</h1>
            <p className="text-slate-500 text-sm">Gestiona tu información personal y laboral</p>
         </div>
         
         <div className="flex items-center gap-3 self-end md:self-auto">
             <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                disabled={isSaving || uploadingPhoto} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full shadow-sm transition-all active:scale-95 font-bold text-sm ${
                    isEditing 
                    ? 'bg-[#003366] text-white hover:bg-blue-900 shadow-blue-900/20' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200'
                }`}
             >
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : (isEditing ? <><Save size={18}/> Guardar Ficha</> : <><Edit2 size={18}/> Editar Ficha</>)}
             </button>
             {isEditing && (
                 <button onClick={() => { setIsEditing(false); initializeFormData(); }} className="px-4 py-2.5 rounded-full text-slate-500 font-bold text-sm hover:bg-slate-200 transition-colors">
                     Cancelar
                 </button>
             )}
         </div>
      </div>

      {/* BARRA DE PESTAÑAS (SCROLLABLE EN MÓVIL) */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
        <TabBtn id="personal" label="Personal" icon={User} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="contacto" label="Contacto" icon={Phone} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="laboral" label="Laboral" icon={Briefcase} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="bancario" label="Bancario" icon={CreditCard} active={activeTab} onClick={setActiveTab} />
        <TabBtn id="formacion" label="Formación" icon={GraduationCap} active={activeTab} onClick={setActiveTab} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* COLUMNA IZQUIERDA: TARJETA DE RESUMEN + FOTO */}
        <div className="lg:col-span-1">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center sticky top-24">
                
                {/* SECCIÓN DE FOTO DE PERFIL */}
                <div className="relative mb-4 group">
                    <div className="w-32 h-32 rounded-full border-4 border-white bg-slate-200 shadow-xl overflow-hidden flex items-center justify-center relative">
                        {uploadingPhoto ? (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                <Loader2 className="animate-spin text-white" size={30} />
                            </div>
                        ) : null}
                        
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#003366] text-white flex items-center justify-center text-5xl font-bold">
                                {formData.first_name ? formData.first_name.charAt(0) : <User size={50}/>}
                            </div>
                        )}
                    </div>

                    {/* Botón de subir foto (solo visible al editar) */}
                    <AnimatePresence>
                        {isEditing && !uploadingPhoto && (
                            <motion.label 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                htmlFor="photo-upload"
                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors z-30"
                            >
                                <Camera size={20} />
                                <input 
                                    type="file" 
                                    id="photo-upload" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handlePhotoUpload}
                                />
                            </motion.label>
                        )}
                    </AnimatePresence>
                </div>

                <h2 className="text-xl font-bold text-slate-800 capitalize leading-tight mb-1">
                    {formData.first_name} {formData.last_name}
                </h2>
                <span className="px-3 py-1 bg-blue-50 text-[#003366] rounded-lg text-xs font-bold border border-blue-100 capitalize mt-2 mb-6">
                    {worker.category || 'Obrero'}
                </span>

                <div className="w-full space-y-4 pt-6 border-t border-slate-100">
                    <InfoRow label="DNI" val={worker.document_number} />
                    <InfoRow label="Proyecto" val={worker.project_assigned} isHighlight />
                    <InfoRow label="Nacionalidad" val={formData.details.nationality} />
                    <InfoRow label="Estado" val="Activo" color="text-emerald-600" />
                </div>
            </div>
        </div>

        {/* COLUMNA DERECHA: CONTENIDO DINÁMICO */}
        <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode='wait'>
                
                {/* --- TAB: PERSONAL --- */}
                {activeTab === 'personal' && (
                    <motion.div key="personal" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                        <SectionHeader title="Información Básica" icon={User} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Field label="Nombres" name="first_name" value={formData.first_name} onChange={(e) => handleChange(e)} isEditing={isEditing} />
                            <Field label="Apellidos" name="last_name" value={formData.last_name} onChange={(e) => handleChange(e)} isEditing={isEditing} />
                            <Field label="Fecha Nacimiento" value={worker.birth_date} isEditing={false} /> 
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                             <SelectField label="Sexo" value={formData.details.gender} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'gender')} isEditing={isEditing}>
                                <option value="Masculino">Masculino</option>
                                <option value="Femenino">Femenino</option>
                             </SelectField>
                             
                             <SelectField label="Estado Civil" value={formData.details.marital_status} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'marital_status')} isEditing={isEditing}>
                                <option value="Soltero(a)">Soltero(a)</option>
                                <option value="Casado(a)">Casado(a)</option>
                                <option value="Conviviente">Conviviente</option>
                             </SelectField>

                             <SelectField label="Nacionalidad" value={formData.details.nationality} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'nationality')} isEditing={isEditing}>
                                <option value="Peruana">Peruana</option>
                                <option value="Venezolana">Venezolana</option>
                                <option value="Otra">Otra</option>
                             </SelectField>
                        </div>
                    </motion.div>
                )}

                {/* --- TAB: CONTACTO --- */}
                {activeTab === 'contacto' && (
                    <motion.div key="contacto" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                         <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                             <SectionHeader title="Contacto Directo" icon={Phone} color="text-blue-600" />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="Celular" name="phone" value={formData.phone} onChange={(e) => handleChange(e)} isEditing={isEditing} type="tel" />
                                <Field label="Correo Electrónico" name="email" value={formData.email} onChange={(e) => handleChange(e)} isEditing={isEditing} type="email" />
                             </div>
                         </div>

                         <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                             <SectionHeader title="Dirección de Domicilio" icon={MapPin} color="text-orange-600" />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                   <Field label="Dirección / Calle" value={formData.details.address.street} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'address', 'street')} isEditing={isEditing} />
                                </div>
                                <Field label="Distrito" value={formData.details.address.district} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'address', 'district')} isEditing={isEditing} />
                                <Field label="Provincia" value={formData.details.address.province} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'address', 'province')} isEditing={isEditing} />
                                <Field label="Departamento" value={formData.details.address.department} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'address', 'department')} isEditing={isEditing} />
                             </div>
                         </div>
                    </motion.div>
                )}

                {/* --- TAB: LABORAL --- */}
                {activeTab === 'laboral' && (
                    <motion.div key="laboral" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <SectionHeader title="Datos de Contratación" icon={Briefcase} color="text-slate-700" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="Régimen Pensionario" value={worker.pension_system} isEditing={false} />
                                {worker.pension_system !== 'ONP' && (
                                    <Field label="CUSPP (AFP)" value={formData.details.cuspp} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'cuspp')} isEditing={isEditing} />
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <SectionHeader title="Tallas de EPP" icon={Ruler} color="text-indigo-600" />
                            <div className="grid grid-cols-3 gap-4">
                                <Field label="Camisa" value={formData.details.sizes.shirt} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'sizes', 'shirt')} isEditing={isEditing} />
                                <Field label="Pantalón" value={formData.details.sizes.pant} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'sizes', 'pant')} isEditing={isEditing} />
                                <Field label="Calzado" value={formData.details.sizes.shoe} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'sizes', 'shoe')} isEditing={isEditing} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- TAB: BANCARIO --- */}
                {activeTab === 'bancario' && (
                    <motion.div key="bancario" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                         
                         {/* Emergencia */}
                         <div className="bg-red-50 p-6 md:p-8 rounded-[2rem] border border-red-100 shadow-sm">
                            <SectionHeader title="Contacto de Emergencia" icon={Heart} color="text-red-600" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Field label="Nombre Contacto" value={formData.details.emergency_contacts[0]?.name} onChange={(e) => handleEmergencyChange('name', e.target.value)} isEditing={isEditing} />
                                <Field label="Celular" value={formData.details.emergency_contacts[0]?.phone_cell} onChange={(e) => handleEmergencyChange('phone_cell', e.target.value)} isEditing={isEditing} type="tel" />
                                <Field label="Parentesco" value={formData.details.emergency_contacts[0]?.relationship} onChange={(e) => handleEmergencyChange('relationship', e.target.value)} isEditing={isEditing} />
                            </div>
                         </div>

                         {/* Bancario (Read Only Style) */}
                         <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                             <SectionHeader title="Cuenta de Haberes" icon={CreditCard} color="text-emerald-600" />
                             
                             <div className="bg-slate-800 text-white p-6 rounded-2xl relative overflow-hidden mt-4">
                                 <div className="absolute right-0 top-0 opacity-10 p-4"><CreditCard size={100}/></div>
                                 <p className="text-slate-400 text-xs font-bold uppercase mb-1">Banco</p>
                                 <p className="text-xl font-bold mb-6">{formData.bank_name || 'Sin Asignar'}</p>
                                 
                                 <div className="grid grid-cols-1 gap-4 relative z-10">
                                     <div>
                                         <p className="text-slate-400 text-[10px] font-bold uppercase">Número de Cuenta</p>
                                         <p className="font-mono text-lg tracking-wider">{formData.bank_account || '---'}</p>
                                     </div>
                                     <div>
                                         <p className="text-slate-400 text-[10px] font-bold uppercase">CCI</p>
                                         <p className="font-mono text-lg tracking-wider">{formData.cci || '---'}</p>
                                     </div>
                                 </div>
                             </div>
                             <p className="text-xs text-slate-400 mt-4 italic flex gap-1 items-center">
                                 <ShieldAlert size={12}/> Para cambiar estos datos, contacte a administración.
                             </p>
                         </div>
                    </motion.div>
                )}

                 {/* --- TAB: FORMACIÓN --- */}
                 {activeTab === 'formacion' && (
                    <motion.div key="formacion" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                         <SectionHeader title="Nivel Educativo" icon={GraduationCap} color="text-purple-600" />
                         <div className="grid grid-cols-1 gap-6">
                            <SelectField label="Nivel Alcanzado" value={formData.details.education.level} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'education', 'level')} isEditing={isEditing}>
                                <option value="Primaria">Primaria</option>
                                <option value="Secundaria">Secundaria</option>
                                <option value="Técnico">Técnico</option>
                                <option value="Universitario">Universitario</option>
                            </SelectField>

                            <SelectField label="Estado" value={formData.details.education.status} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'education', 'status')} isEditing={isEditing}>
                                <option value="Completo">Completo</option>
                                <option value="Incompleto">Incompleto</option>
                                <option value="En Curso">En Curso</option>
                            </SelectField>

                            <Field label="Institución o Carrera" value={formData.details.education.institution} onChange={(e) => handleChange({ target: { value: e.target.value }}, 'details', 'education', 'institution')} isEditing={isEditing} />
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// --- COMPONENTES AUXILIARES ESTILIZADOS ---

const SectionHeader = ({ title, icon: Icon, color = "text-slate-800" }) => (
    <div className={`flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 ${color}`}>
        <Icon size={20} />
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
    </div>
);

const InfoRow = ({ label, val, color = "text-slate-700", isHighlight = false }) => (
    <div className="flex justify-between items-center w-full py-1.5 border-b border-slate-50 last:border-0">
        <span className="text-xs text-slate-400 font-medium uppercase">{label}</span>
        <span className={`text-sm font-bold ${isHighlight ? 'text-[#003366]' : color} text-right`}>{val ? String(val) : '-'}</span>
    </div>
);

const TabBtn = ({ id, label, icon: Icon, active, onClick }) => (
    <button 
        onClick={() => onClick(id)} 
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-w-fit ${
            active === id 
            ? 'bg-slate-100 text-[#003366] shadow-inner' 
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
        }`}
    >
        <Icon size={16} className={active === id ? 'text-blue-600' : 'text-slate-400'}/> {label}
    </button>
);

const Field = ({ label, name, value, onChange, isEditing, type = "text" }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 pl-1">{label}</label>
    {isEditing ? (
      <input 
        type={type} 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold focus:bg-white focus:border-[#003366] focus:ring-4 focus:ring-blue-50 outline-none transition-all" 
        placeholder="Sin información"
      />
    ) : (
      <div className="px-4 py-3 bg-white border border-transparent rounded-xl text-sm text-slate-800 font-bold">
         {value || <span className="text-slate-300 italic font-normal">--</span>}
      </div>
    )}
  </div>
);

const SelectField = ({ label, value, onChange, isEditing, children }) => (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 pl-1">{label}</label>
      {isEditing ? (
        <div className="relative">
            <select 
                value={value || ''} 
                onChange={onChange} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-bold focus:bg-white focus:border-[#003366] outline-none appearance-none cursor-pointer"
            >
                {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-white border border-transparent rounded-xl text-sm text-slate-800 font-bold">
           {value || <span className="text-slate-300 italic font-normal">--</span>}
        </div>
      )}
    </div>
  );

export default WorkerProfilePage;