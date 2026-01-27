import React, { useState, useEffect, useRef } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import { 
  User, Phone, Mail, MapPin, Calendar, 
  Heart, Save, X, Edit3, Briefcase, 
  CreditCard, Shield, Camera, Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- COMPONENTE INPUT FIELD (EXTRAÍDO PARA EVITAR BUG DE ESCRITURA) ---
const InputField = ({ label, name, value, onChange, type = "text", icon: Icon, placeholder, isEditing, disabled = false }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
      {Icon && <Icon size={12} />} {label}
    </label>
    {isEditing && !disabled ? (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none bg-white transition-all"
        placeholder={placeholder || 'Sin información'}
      />
    ) : (
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-800 text-sm font-medium min-h-[38px] flex items-center">
         {value || <span className="text-slate-400 italic">No registrado</span>}
      </div>
    )}
  </div>
);

const WorkerProfilePage = () => {
  const { worker, refreshWorker } = useWorkerAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  // Estado del formulario (ADAPTADO A TU BASE DE DATOS REAL)
  const [formData, setFormData] = useState({
    first_name: '',
    paternal_surname: '', // CAMBIO: Antes last_name
    maternal_surname: '', // CAMBIO: Nuevo campo
    document_number: '',
    birth_date: '',
    phone: '',
    secondary_phone: '',
    email: '', 
    secondary_email: '',
    address: '',
    bank_name: '',
    bank_account: '',
    shirt_size: '',
    pants_size: '',
    shoe_size: '',
    fathers_name: '',
    mothers_name: '',
    spouse_name: '',
    has_children: false,
    number_of_children: 0,
    avatar_url: ''
  });

  // Cargar datos al montar
  useEffect(() => {
    if (worker) {
      loadWorkerData();
    }
  }, [worker]);

  const loadWorkerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('id', worker.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          first_name: data.first_name || '',
          paternal_surname: data.paternal_surname || '', // Mapeo correcto
          maternal_surname: data.maternal_surname || '', // Mapeo correcto
          document_number: data.document_number || '',
          birth_date: data.birth_date || '',
          phone: data.phone || '',
          secondary_phone: data.secondary_phone || '', 
          email: data.email || '', 
          secondary_email: data.secondary_email || '',
          address: data.address || '',
          bank_name: data.bank_name || '',
          bank_account: data.bank_account || '',
          shirt_size: data.shirt_size || '',
          pants_size: data.pants_size || '',
          shoe_size: data.shoe_size || '',
          fathers_name: data.fathers_name || '',
          mothers_name: data.mothers_name || '',
          spouse_name: data.spouse_name || '',
          has_children: data.has_children || false,
          number_of_children: data.number_of_children || 0,
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // --- LÓGICA DE SUBIDA DE IMAGEN ---
  const handleImageClick = () => {
    if (isEditing) {
        fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (event) => {
    try {
        setUploadingImage(true);
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("La imagen es muy pesada. Máximo 2MB.");
            return;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${worker.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

    } catch (error) {
        console.error("Error subiendo imagen:", error);
        alert("Error al subir la imagen.");
    } finally {
        setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // PREPARAMOS EL OBJETO EXACTO COMO LO ESPERA LA BASE DE DATOS
      const updatePayload = {
          first_name: formData.first_name,
          paternal_surname: formData.paternal_surname, // CAMBIO CRÍTICO
          maternal_surname: formData.maternal_surname, // CAMBIO CRÍTICO
          
          // CONSTRUIMOS EL FULL NAME AUTOMÁTICAMENTE
          full_name: `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim(),

          birth_date: formData.birth_date || null, // Manejo de fechas vacías
          phone: formData.phone,
          secondary_phone: formData.secondary_phone,
          secondary_email: formData.secondary_email,
          address: formData.address,
          bank_name: formData.bank_name,
          bank_account: formData.bank_account,
          shirt_size: formData.shirt_size,
          pants_size: formData.pants_size,
          shoe_size: formData.shoe_size,
          fathers_name: formData.fathers_name,
          mothers_name: formData.mothers_name,
          spouse_name: formData.spouse_name,
          has_children: formData.has_children,
          number_of_children: formData.number_of_children,
          avatar_url: formData.avatar_url
      };

      const { error } = await supabase
        .from('workers')
        .update(updatePayload)
        .eq('id', worker.id);

      if (error) throw error;

      await refreshWorker(); 
      setIsEditing(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Perfil Actualizado',
        text: 'Tus datos se han guardado correctamente.',
        confirmButtonColor: '#003366',
        timer: 2000
      });

    } catch (error) {
      console.error('Error actualizando:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `No se pudieron guardar los cambios: ${error.message || 'Error desconocido'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* 1. ENCABEZADO */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          
          {/* FOTO DE PERFIL */}
          <div className="relative group cursor-pointer" onClick={handleImageClick}>
             <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-[#003366] flex items-center justify-center text-white text-2xl font-bold relative">
                {uploadingImage ? (
                   <Loader2 className="animate-spin" />
                ) : formData.avatar_url ? (
                   <img src={formData.avatar_url} alt="Perfil" className="w-full h-full object-cover" />
                ) : (
                   <span>{formData.first_name.charAt(0)}{formData.paternal_surname.charAt(0)}</span>
                )}
                
                {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                    </div>
                )}
             </div>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
             />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
               {formData.first_name} {formData.paternal_surname}
            </h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-1">
               <Briefcase size={14}/> {worker.category || 'Obrero'}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={loading || uploadingImage}
          className={`w-full md:w-auto flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
            isEditing 
              ? 'bg-green-600 text-white hover:bg-green-700' 
              : 'bg-[#003366] text-white hover:bg-blue-900'
          }`}
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : isEditing ? (
            <><Save size={18} /> Guardar Cambios</>
          ) : (
            <><Edit3 size={18} /> Editar Perfil</>
          )}
        </button>
      </div>

      {isEditing && (
        <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-xl text-sm border border-yellow-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
           <div className="flex gap-2 items-center">
              <span className="bg-yellow-200 p-1 rounded-full"><Edit3 size={14}/></span>
              <span>Modo Edición activo.</span>
           </div>
           <button onClick={() => { setIsEditing(false); loadWorkerData(); }} className="text-yellow-900 font-bold hover:bg-yellow-200 p-1 rounded transition-colors"><X size={18}/></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 2. INFORMACIÓN PERSONAL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <User className="text-[#003366]" /> Datos Personales
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
             <InputField 
                label="Nombres" 
                name="first_name" 
                value={formData.first_name} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
             />
             
             {/* APELLIDOS SEPARADOS */}
             <div className="grid grid-cols-2 gap-4">
                <InputField 
                    label="Apellido Paterno" 
                    name="paternal_surname" 
                    value={formData.paternal_surname} 
                    onChange={handleInputChange} 
                    isEditing={isEditing} 
                />
                <InputField 
                    label="Apellido Materno" 
                    name="maternal_surname" 
                    value={formData.maternal_surname} 
                    onChange={handleInputChange} 
                    isEditing={isEditing} 
                />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <InputField 
                    label="DNI" 
                    name="document_number" 
                    value={formData.document_number} 
                    onChange={handleInputChange} 
                    isEditing={isEditing} 
                    disabled={true} // DNI suele ser fijo
                    icon={CreditCard}
                />
                <InputField 
                    label="Fecha Nacimiento" 
                    name="birth_date" 
                    type="date" 
                    value={formData.birth_date} 
                    onChange={handleInputChange} 
                    isEditing={isEditing} 
                    icon={Calendar} 
                />
             </div>
          </div>
        </div>

        {/* 3. CONTACTO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="text-[#003366]" /> Información de Contacto
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <InputField 
                label="Teléfono Principal" 
                name="phone" 
                type="tel" 
                value={formData.phone} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={Phone} 
             />
             <InputField 
                label="Teléfono Adicional" 
                name="secondary_phone" 
                type="tel" 
                value={formData.secondary_phone} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={Phone} 
                placeholder="Emergencia / Casa" 
             />
             
             <InputField 
                label="Email (Login)" 
                name="email" 
                type="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                disabled={true} 
                icon={Mail} 
             />
             <InputField 
                label="Email Adicional" 
                name="secondary_email" 
                type="email" 
                value={formData.secondary_email} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={Mail} 
                placeholder="Correo personal" 
             />
          </div>
          
          <InputField 
             label="Dirección de Domicilio" 
             name="address" 
             value={formData.address} 
             onChange={handleInputChange} 
             isEditing={isEditing} 
             icon={MapPin} 
          />
        </div>

        {/* 4. DATOS FAMILIARES */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Heart className="text-pink-600" /> Datos Familiares
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
             <InputField 
                label="Nombre del Padre" 
                name="fathers_name" 
                value={formData.fathers_name} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={User} 
                placeholder="Nombres completos" 
             />
             <InputField 
                label="Nombre de la Madre" 
                name="mothers_name" 
                value={formData.mothers_name} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={User} 
                placeholder="Nombres completos" 
             />
             <InputField 
                label="Cónyuge / Pareja" 
                name="spouse_name" 
                value={formData.spouse_name} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={Heart} 
                placeholder="Esposo(a) o Conviviente" 
             />
             
             <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                <div className="flex items-center gap-2">
                   <input 
                     type="checkbox" 
                     id="has_children"
                     name="has_children"
                     checked={formData.has_children} 
                     onChange={handleInputChange}
                     disabled={!isEditing}
                     className="w-5 h-5 text-[#003366] rounded focus:ring-[#003366]"
                   />
                   <label htmlFor="has_children" className="text-sm font-bold text-slate-700">¿Tiene Hijos?</label>
                </div>
                
                {formData.has_children && (
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cantidad:</label>
                    {isEditing ? (
                       <input 
                         type="number" 
                         name="number_of_children"
                         value={formData.number_of_children}
                         onChange={handleInputChange}
                         className="w-16 p-1 border border-slate-300 rounded text-center font-bold"
                         min="0"
                       />
                    ) : (
                       <span className="font-bold text-slate-800">{formData.number_of_children}</span>
                    )}
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* 5. DATOS BANCARIOS Y TALLAS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="text-[#003366]" /> Datos Adicionales
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <InputField 
                label="Banco" 
                name="bank_name" 
                value={formData.bank_name} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
             />
             <InputField 
                label="Número de Cuenta" 
                name="bank_account" 
                value={formData.bank_account} 
                onChange={handleInputChange} 
                isEditing={isEditing} 
                icon={CreditCard} 
             />
          </div>

          <div className="pt-2 border-t border-slate-100 mt-2">
             <p className="text-xs font-bold text-slate-400 uppercase mb-3">Tallas de Uniforme</p>
             <div className="flex gap-4">
                <div className="flex-1">
                   <InputField 
                     label="Camisa" 
                     name="shirt_size" 
                     value={formData.shirt_size} 
                     onChange={handleInputChange} 
                     isEditing={isEditing} 
                     placeholder="S/M/L" 
                   />
                </div>
                <div className="flex-1">
                   <InputField 
                     label="Pantalón" 
                     name="pants_size" 
                     value={formData.pants_size} 
                     onChange={handleInputChange} 
                     isEditing={isEditing} 
                     placeholder="30/32/34" 
                   />
                </div>
                <div className="flex-1">
                   <InputField 
                     label="Calzado" 
                     name="shoe_size" 
                     value={formData.shoe_size} 
                     onChange={handleInputChange} 
                     isEditing={isEditing} 
                     placeholder="40/41" 
                   />
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WorkerProfilePage;