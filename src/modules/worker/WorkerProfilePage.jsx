import React, { useState, useEffect, useRef } from 'react';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import { generateWorkerPDF } from '../../utils/workerPdfGenerator';
import { compressImage } from '../../utils/imageCompressor'; // <--- IMPORTACIÓN DE LA UTILIDAD
import { 
  User, Phone, Mail, MapPin, Calendar, 
  Heart, Save, X, Edit3, Briefcase, 
  CreditCard, Shield, Camera, Loader2,
  GraduationCap, Users, Plus, Trash2, Download
} from 'lucide-react';
import Swal from 'sweetalert2';

// --- COMPONENTE INPUT FIELD ---
const InputField = ({ label, name, value, onChange, type = "text", icon: Icon, placeholder, isEditing, disabled = false, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
      {Icon && <Icon size={10} />} {label}
    </label>
    {isEditing && !disabled ? (
      <input
        type={type}
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003366] focus:border-transparent outline-none bg-white transition-all"
        placeholder={placeholder || '-'}
      />
    ) : (
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 text-sm font-medium min-h-[38px] flex items-center">
         {value || <span className="text-slate-300 italic text-xs">Sin información</span>}
      </div>
    )}
  </div>
);

// --- COMPONENTE SELECT FIELD ---
const SelectField = ({ label, name, value, onChange, options, isEditing, disabled = false }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
    {isEditing && !disabled ? (
      <select name={name} value={value || ''} onChange={onChange} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#003366] outline-none bg-white">
         <option value="">-- Seleccionar --</option>
         {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    ) : (
      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 text-sm font-medium min-h-[38px] flex items-center">
         {value || <span className="text-slate-300 italic text-xs">Sin información</span>}
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
  const [activeTab, setActiveTab] = useState('personal'); 

  // Estado MASIVO con todos los campos
  const [formData, setFormData] = useState({
    // Básicos
    first_name: '', paternal_surname: '', maternal_surname: '', document_number: '',
    birth_date: '', age: '', nationality: 'Peruana', sex: '',
    
    // Laborales Internos
    category: 'Obrero', 
    start_date: '', 

    // Ubicación
    address: '', district: '', province: '', department: 'Lima',

    // Contacto
    phone: '', secondary_phone: '', email: '', secondary_email: '',

    // Familia
    marital_status: 'Soltero', spouse_name: '', 
    fathers_name: '', mothers_name: '',
    has_children: false, has_relatives_in_company: false,

    // Académico
    education_level: '', education_status: '', education_institution: '',
    grad_date: '',

    // Bancario / Tallas / Pension
    pension_system: 'ONP', 
    bank_name: '', bank_account: '', cci: '',
    shirt_size: '', pants_size: '', shoe_size: '',

    // ARRAYS
    emergency_contacts: [],
    dependents: [],
    relatives_in_company: [],
    additional_courses: [],
    work_experience: [],
    
    avatar_url: ''
  });

  // Estados temporales
  const [tempEmergency, setTempEmergency] = useState({ name: '', phone: '', relation: '' });
  const [tempDependent, setTempDependent] = useState({ name: '', age: '' });
  const [tempCourse, setTempCourse] = useState({ name: '', date: '' });
  
  const [newJob, setNewJob] = useState({
    company: '', role: '', field: '', period_start: '', period_end: '', 
    boss_name: '', boss_phone: '', functions: [] 
  });
  const [tempFunction, setTempFunction] = useState('');

  // Calcular edad automáticamente
  const calculateAge = (dateString) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
  };

  useEffect(() => {
    if (worker) loadWorkerData();
  }, [worker]);

  useEffect(() => {
      if (formData.birth_date) {
          setFormData(prev => ({ ...prev, age: calculateAge(prev.birth_date) }));
      }
  }, [formData.birth_date]);

  const loadWorkerData = async () => {
    try {
      const { data, error } = await supabase.from('workers').select('*').eq('id', worker.id).single();
      if (error) throw error;
      if (data) {
        setFormData(prev => ({
            ...prev, 
            ...data, 
            category: data.category || 'Peón',
            start_date: data.start_date || '', 
            
            // Datos dentro del JSONB details
            grad_date: data.details?.grad_date || '',
            emergency_contacts: data.details?.emergency_contacts || [],
            dependents: data.details?.dependents || [],
            relatives_in_company: data.details?.relatives_in_company || [],
            additional_courses: data.details?.additional_courses || [],
            work_experience: data.details?.work_experience || [],
            
            has_children: data.has_children || false,
            has_relatives_in_company: data.details?.has_relatives_in_company || false
        }));
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- MANEJO DE LISTAS ---
  const addToList = (listName, item, setItemState, emptyState) => {
    if (Object.values(item).some(v => !v)) return; 
    setFormData(prev => ({ ...prev, [listName]: [...prev[listName], item] }));
    setItemState(emptyState);
  };

  const removeFromList = (listName, index) => {
    setFormData(prev => ({ ...prev, [listName]: prev[listName].filter((_, i) => i !== index) }));
  };

  // --- MANEJO DE EXPERIENCIA LABORAL ---
  const handleJobChange = (e) => setNewJob({ ...newJob, [e.target.name]: e.target.value });
  
  const addFunctionToJob = () => {
    if (!tempFunction.trim()) return;
    setNewJob(prev => ({ ...prev, functions: [...prev.functions, tempFunction] }));
    setTempFunction('');
  };
  
  const removeFunctionFromJob = (idx) => {
    setNewJob(prev => ({ ...prev, functions: prev.functions.filter((_, i) => i !== idx) }));
  };

  const addJob = () => {
    if (!newJob.company || !newJob.role) {
        Swal.fire('Atención', 'Ingresa al menos la Empresa y el Cargo.', 'warning');
        return;
    }
    setFormData(prev => ({ ...prev, work_experience: [...prev.work_experience, newJob] }));
    setNewJob({ company: '', role: '', field: '', period_start: '', period_end: '', boss_name: '', boss_phone: '', functions: [] });
  };

  // --- SUBIDA DE IMAGEN CON COMPRESIÓN ---
  const handleImageUpload = async (event) => {
    try {
        setUploadingImage(true);
        const file = event.target.files[0];
        if (!file) return;
        
        // 1. COMPRIMIR LA IMAGEN ANTES DE SUBIR
        const compressedFile = await compressImage(file);
        
        // Usamos siempre extensión .jpg porque el compresor devuelve JPEG
        const fileExt = 'jpg'; 
        const fileName = `${worker.id}-${Date.now()}.${fileExt}`;
        
        // 2. SUBIR EL ARCHIVO COMPRIMIDO
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedFile, {
            contentType: 'image/jpeg',
            upsert: true
        });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        
    } catch (error) {
        console.error("Error al subir imagen:", error);
        Swal.fire('Error', 'No se pudo subir la imagen', 'error');
    } finally {
        setUploadingImage(false);
    }
  };

  // --- GENERAR PDF ---
  const handleDownloadPDF = () => {
      try {
          if (typeof generateWorkerPDF === 'function') {
              generateWorkerPDF(formData); 
          } else {
              Swal.fire('Info', 'La función de PDF se está implementando.', 'info');
          }
      } catch (error) {
          console.error(error);
          Swal.fire('Error', 'Hubo un problema al generar el PDF.', 'error');
      }
  };

  // --- GUARDAR TODO ---
  const handleSave = async () => {
    try {
      setLoading(true);
      const updates = {
          first_name: formData.first_name,
          paternal_surname: formData.paternal_surname,
          maternal_surname: formData.maternal_surname,
          full_name: `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim(),
          birth_date: formData.birth_date || null,
          nationality: formData.nationality,
          sex: formData.sex,
          
          start_date: formData.start_date || null, 
          
          marital_status: formData.marital_status,
          spouse_name: ['Casado', 'Conviviente'].includes(formData.marital_status) ? formData.spouse_name : null,
          fathers_name: formData.fathers_name,
          mothers_name: formData.mothers_name,
          
          address: formData.address,
          district: formData.district,
          province: formData.province,
          department: formData.department,
          phone: formData.phone,
          secondary_phone: formData.secondary_phone,
          email: formData.email, 
          secondary_email: formData.secondary_email, 
          
          pension_system: formData.pension_system,
          shirt_size: formData.shirt_size,
          pants_size: formData.pants_size,
          shoe_size: formData.shoe_size,

          bank_name: formData.bank_name,
          bank_account: formData.bank_account,
          cci: formData.cci,
          
          education_level: formData.education_level,
          education_status: formData.education_status,
          education_institution: formData.education_institution,
          has_children: formData.has_children,
          avatar_url: formData.avatar_url,
          
          details: {
              ...worker.details,
              grad_date: formData.grad_date,
              emergency_contacts: formData.emergency_contacts,
              dependents: formData.dependents,
              has_relatives_in_company: formData.has_relatives_in_company,
              relatives_in_company: formData.relatives_in_company,
              additional_courses: formData.additional_courses,
              work_experience: formData.work_experience
          }
      };

      const { error } = await supabase.from('workers').update(updates).eq('id', worker.id);
      if (error) throw error;

      await refreshWorker();
      setIsEditing(false);
      Swal.fire({ icon: 'success', title: 'Perfil Actualizado', timer: 1500, showConfirmButton: false });

    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO POR PESTAÑAS ---
  
  const renderPersonal = () => (
      <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><User size={20} className="text-blue-900"/> Datos Generales</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                 <InputField label="Nombres" name="first_name" value={formData.first_name} onChange={handleInputChange} isEditing={isEditing} />
                 <InputField label="Ap. Paterno" name="paternal_surname" value={formData.paternal_surname} onChange={handleInputChange} isEditing={isEditing} />
                 <InputField label="Ap. Materno" name="maternal_surname" value={formData.maternal_surname} onChange={handleInputChange} isEditing={isEditing} />
                 
                 <InputField label="DNI" value={formData.document_number} disabled={true} icon={CreditCard} />
                 <InputField label="F. Nacimiento" name="birth_date" type="date" value={formData.birth_date} onChange={handleInputChange} isEditing={isEditing} icon={Calendar} />
                 <InputField label="Edad" value={formData.age} disabled={true} />
                 
                 <InputField label="Nacionalidad" name="nationality" value={formData.nationality} onChange={handleInputChange} isEditing={isEditing} />
                 <SelectField label="Sexo" name="sex" value={formData.sex} onChange={handleInputChange} isEditing={isEditing} options={['Masculino', 'Femenino']} />
                 
                 <InputField label="Cargo (Categoría)" name="category" value={formData.category} disabled={true} isEditing={false} />
                 <InputField label="Fecha Ingreso" name="start_date" type="date" value={formData.start_date} onChange={handleInputChange} isEditing={isEditing} icon={Calendar} />
                 <SelectField label="Sistema Pensión" name="pension_system" value={formData.pension_system} onChange={handleInputChange} isEditing={isEditing} options={['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen']} />
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Briefcase size={20} className="text-indigo-600"/> Tallas de Dotación</h3>
             <div className="grid grid-cols-3 gap-6">
                 <InputField label="Talla Camisa" name="shirt_size" value={formData.shirt_size} onChange={handleInputChange} isEditing={isEditing} className="text-center" />
                 <InputField label="Talla Pantalón" name="pants_size" value={formData.pants_size} onChange={handleInputChange} isEditing={isEditing} className="text-center" />
                 <InputField label="Talla Calzado" name="shoe_size" value={formData.shoe_size} onChange={handleInputChange} isEditing={isEditing} className="text-center" />
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Heart size={20} className="text-pink-600"/> Familia</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <InputField label="Padre" name="fathers_name" value={formData.fathers_name} onChange={handleInputChange} isEditing={isEditing} />
                 <InputField label="Madre" name="mothers_name" value={formData.mothers_name} onChange={handleInputChange} isEditing={isEditing} />
                 <SelectField label="Estado Civil" name="marital_status" value={formData.marital_status} onChange={handleInputChange} isEditing={isEditing} options={['Soltero', 'Casado', 'Conviviente', 'Viudo', 'Divorciado']} />
                 {['Casado', 'Conviviente'].includes(formData.marital_status) && (
                     <InputField label="Cónyuge / Pareja" name="spouse_name" value={formData.spouse_name} onChange={handleInputChange} isEditing={isEditing} />
                 )}
             </div>

             <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" checked={formData.has_children} onChange={e => handleInputChange({target: {name: 'has_children', type: 'checkbox', checked: e.target.checked}})} disabled={!isEditing} />
                    <label className="font-bold text-slate-700 text-sm">¿Tiene Hijos?</label>
                </div>
                {formData.has_children && (
                    <div className="bg-slate-50 p-3 rounded-xl">
                        {isEditing && (
                            <div className="flex gap-2 mb-2">
                                <input placeholder="Nombre" value={tempDependent.name} onChange={e => setTempDependent({...tempDependent, name: e.target.value})} className="p-1 border rounded text-xs flex-1" />
                                <input placeholder="Edad" type="number" value={tempDependent.age} onChange={e => setTempDependent({...tempDependent, age: e.target.value})} className="p-1 border rounded text-xs w-20" />
                                <button onClick={() => addToList('dependents', tempDependent, setTempDependent, {name:'', age:''})} className="bg-blue-600 text-white p-1 rounded"><Plus size={16}/></button>
                            </div>
                        )}
                        {formData.dependents.map((d, i) => (
                            <div key={i} className="flex justify-between text-xs p-2 bg-white border mb-1 rounded">
                                <span>{d.name} ({d.age} años)</span>
                                {isEditing && <button onClick={() => removeFromList('dependents', i)} className="text-red-500"><Trash2 size={14}/></button>}
                            </div>
                        ))}
                        {formData.dependents.length === 0 && <p className="text-xs text-slate-400 italic">No hay hijos registrados</p>}
                    </div>
                )}
             </div>
          </div>
      </div>
  );

  const renderLocation = () => (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><MapPin size={20} className="text-green-600"/> Ubicación y Contacto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                  <InputField label="Dirección Actual" name="address" value={formData.address} onChange={handleInputChange} isEditing={isEditing} icon={MapPin} />
              </div>
              <InputField label="Departamento" name="department" value={formData.department} onChange={handleInputChange} isEditing={isEditing} />
              <InputField label="Provincia" name="province" value={formData.province} onChange={handleInputChange} isEditing={isEditing} />
              <InputField label="Distrito" name="district" value={formData.district} onChange={handleInputChange} isEditing={isEditing} />
              
              <div className="col-span-full border-t border-slate-100 my-2"></div>
              
              <InputField label="Celular Principal" name="phone" value={formData.phone} onChange={handleInputChange} isEditing={isEditing} icon={Phone} />
              <InputField label="Celular Emergencia / Casa" name="secondary_phone" value={formData.secondary_phone} onChange={handleInputChange} isEditing={isEditing} icon={Phone} />
              <InputField label="Email Personal" name="email" value={formData.email} onChange={handleInputChange} isEditing={isEditing} icon={Mail} />
              <InputField label="Email Adicional" name="secondary_email" value={formData.secondary_email} onChange={handleInputChange} isEditing={isEditing} icon={Mail} />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
             <h4 className="text-sm font-bold text-red-600 mb-3 flex items-center gap-2"><Users size={16}/> Contactos de Emergencia</h4>
             {isEditing && (
                 <div className="flex gap-2 mb-3 bg-red-50 p-2 rounded-lg">
                     <input placeholder="Nombre" value={tempEmergency.name} onChange={e => setTempEmergency({...tempEmergency, name: e.target.value})} className="p-1 border rounded text-xs flex-1" />
                     <input placeholder="Teléfono" value={tempEmergency.phone} onChange={e => setTempEmergency({...tempEmergency, phone: e.target.value})} className="p-1 border rounded text-xs flex-1" />
                     <input placeholder="Relación" value={tempEmergency.relation} onChange={e => setTempEmergency({...tempEmergency, relation: e.target.value})} className="p-1 border rounded text-xs flex-1" />
                     <button onClick={() => addToList('emergency_contacts', tempEmergency, setTempEmergency, {name:'', phone:'', relation:''})} className="bg-red-600 text-white p-1 rounded"><Plus size={16}/></button>
                 </div>
             )}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 {formData.emergency_contacts.map((c, i) => (
                     <div key={i} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
                         <div>
                             <p className="font-bold text-slate-700">{c.name}</p>
                             <p className="text-xs text-slate-500">{c.relation} • {c.phone}</p>
                         </div>
                         {isEditing && <button onClick={() => removeFromList('emergency_contacts', i)} className="text-red-400"><Trash2 size={16}/></button>}
                     </div>
                 ))}
                 {formData.emergency_contacts.length === 0 && <p className="text-sm text-slate-400 italic">No hay contactos de emergencia.</p>}
             </div>
          </div>
      </div>
  );

  const renderEducation = () => {
      const advancedLevels = ['Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Egresado', 'Colegiado'];
      const showDetails = advancedLevels.includes(formData.education_level);

      return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><GraduationCap size={20} className="text-purple-600"/> Antecedentes Académicos</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <SelectField label="Nivel Educativo" name="education_level" value={formData.education_level} onChange={handleInputChange} isEditing={isEditing} options={['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Egresado', 'Colegiado']} />
              <SelectField label="Estado" name="education_status" value={formData.education_status} onChange={handleInputChange} isEditing={isEditing} options={['Completo', 'Incompleto', 'En Curso']} />
              
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Institución Educativa" name="education_institution" value={formData.education_institution} onChange={handleInputChange} isEditing={isEditing} placeholder="Nombre del Colegio / Universidad" />
                  
                  {showDetails && (
                      <InputField label="Fecha de Egreso / Grado" name="grad_date" type="date" value={formData.grad_date} onChange={handleInputChange} isEditing={isEditing} icon={Calendar} />
                  )}
              </div>
          </div>

          <h4 className="text-sm font-bold text-slate-600 mb-2">Cursos / Capacitaciones</h4>
          {isEditing && (
              <div className="flex gap-2 mb-3 bg-purple-50 p-2 rounded-lg">
                  <input placeholder="Nombre del Curso" value={tempCourse.name} onChange={e => setTempCourse({...tempCourse, name: e.target.value})} className="p-1 border rounded text-xs flex-[2]" />
                  <input type="date" value={tempCourse.date} onChange={e => setTempCourse({...tempCourse, date: e.target.value})} className="p-1 border rounded text-xs flex-1" />
                  <button onClick={() => addToList('additional_courses', tempCourse, setTempCourse, {name:'', date:''})} className="bg-purple-600 text-white p-1 rounded"><Plus size={16}/></button>
              </div>
          )}
          <ul className="space-y-2">
              {formData.additional_courses.map((c, i) => (
                  <li key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border text-sm">
                      <span><b className="text-slate-700">{c.name}</b> <span className="text-slate-400 text-xs ml-2">({c.date})</span></span>
                      {isEditing && <button onClick={() => removeFromList('additional_courses', i)} className="text-red-400"><Trash2 size={16}/></button>}
                  </li>
              ))}
              {formData.additional_courses.length === 0 && <p className="text-sm text-slate-400 italic">No hay cursos registrados.</p>}
          </ul>
      </div>
      );
  };

  const renderWork = () => (
      <div className="space-y-6 animate-in fade-in">
          {/* Datos Financieros */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4 border-b pb-2"><Shield size={20} className="text-orange-600"/> Datos Bancarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectField label="Banco" name="bank_name" value={formData.bank_name} onChange={handleInputChange} isEditing={isEditing} options={['BCP', 'Interbank', 'BBVA', 'Scotiabank', 'Banco de la Nación']} />
                  <InputField label="Nro Cuenta" name="bank_account" value={formData.bank_account} onChange={handleInputChange} isEditing={isEditing} icon={CreditCard} />
                  <InputField label="CCI" name="cci" value={formData.cci} onChange={handleInputChange} isEditing={isEditing} />
              </div>
          </div>

          {/* Experiencia Laboral */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
               <div className="flex justify-between items-center mb-4 border-b pb-2">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Briefcase size={20} className="text-slate-600"/> Experiencia Laboral Externa</h3>
               </div>
               
               {isEditing && (
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 animate-in fade-in">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Agregar Nuevo Trabajo</h4>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <input placeholder="Empresa" name="company" value={newJob.company} onChange={handleJobChange} className="p-2 border rounded text-sm"/>
                            <input placeholder="Cargo" name="role" value={newJob.role} onChange={handleJobChange} className="p-2 border rounded text-sm"/>
                            <div className="flex gap-1">
                                <input placeholder="Inicio" name="period_start" value={newJob.period_start} onChange={handleJobChange} className="p-2 border rounded text-sm w-full"/>
                                <input placeholder="Fin" name="period_end" value={newJob.period_end} onChange={handleJobChange} className="p-2 border rounded text-sm w-full"/>
                            </div>
                            <input placeholder="Rubro" name="field" value={newJob.field} onChange={handleJobChange} className="p-2 border rounded text-sm"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                             <input placeholder="Nombre Jefe" name="boss_name" value={newJob.boss_name} onChange={handleJobChange} className="p-2 border rounded text-sm"/>
                             <input placeholder="Teléfono Jefe" name="boss_phone" value={newJob.boss_phone} onChange={handleJobChange} className="p-2 border rounded text-sm"/>
                        </div>
                        
                        <div className="bg-white p-2 border rounded mb-2">
                            <div className="flex gap-1 mb-1">
                                <input placeholder="Agregar función..." value={tempFunction} onChange={e => setTempFunction(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFunctionToJob()} className="p-1 border rounded text-xs flex-1"/>
                                <button onClick={addFunctionToJob} className="bg-slate-200 p-1 rounded"><Plus size={14}/></button>
                            </div>
                            <ul className="text-xs pl-2">
                                {newJob.functions.map((f, i) => (
                                    <li key={i} className="flex justify-between items-center">
                                        <span>• {f}</span>
                                        <button onClick={() => removeFunctionFromJob(i)} className="text-red-400"><X size={12}/></button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button onClick={addJob} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold flex justify-center items-center gap-2"><Plus size={16}/> Agregar Experiencia</button>
                   </div>
               )}

               <div className="space-y-3">
                   {formData.work_experience.map((job, i) => (
                       <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group">
                           {isEditing && (
                               <button onClick={() => removeFromList('work_experience', i)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors p-1">
                                   <Trash2 size={16}/>
                               </button>
                           )}
                           <div className="flex items-start gap-3">
                               <div className="bg-white p-2 rounded-full border border-slate-100 text-slate-600"><Briefcase size={18}/></div>
                               <div>
                                   <h4 className="font-bold text-slate-800 text-sm">{job.company}</h4>
                                   <p className="text-xs text-slate-500 font-medium mb-1">{job.role} <span className="mx-1 text-slate-300">|</span> {job.period_start} - {job.period_end}</p>
                                   {job.boss_name && <p className="text-xs text-slate-500 mb-2">Jefe: {job.boss_name} ({job.boss_phone})</p>}
                                   
                                   {job.functions && job.functions.length > 0 && (
                                       <ul className="text-xs text-slate-600 space-y-0.5 border-l-2 border-slate-200 pl-2">
                                           {job.functions.map((f, fi) => <li key={fi}>• {f}</li>)}
                                       </ul>
                                   )}
                               </div>
                           </div>
                       </div>
                   ))}
                   {formData.work_experience.length === 0 && <p className="text-sm text-slate-400 italic">No hay experiencia registrada.</p>}
               </div>
          </div>
      </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* ENCABEZADO Y FOTO */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative group cursor-pointer" onClick={() => isEditing && fileInputRef.current.click()}>
             <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-slate-100 shadow-md bg-[#003366] flex items-center justify-center text-white text-2xl font-bold relative">
                {uploadingImage ? <Loader2 className="animate-spin" /> : formData.avatar_url ? <img src={formData.avatar_url} alt="Perfil" className="w-full h-full object-cover" /> : <span>{formData.first_name?.[0]}{formData.paternal_surname?.[0]}</span>}
                {isEditing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera size={24} className="text-white" /></div>}
             </div>
             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{formData.first_name} {formData.paternal_surname} {formData.maternal_surname}</h1>
            <p className="text-slate-500 text-sm font-medium flex items-center gap-1"><Briefcase size={14}/> {formData.category}</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
            <button 
                onClick={handleDownloadPDF} 
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 text-slate-600 shadow-sm transition-all duration-300 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-md hover:-translate-y-0.5"
                title="Descargar Ficha en PDF"
            >
                <Download size={18} className="transition-transform duration-300 group-hover:scale-110" /> 
                <span className="hidden md:inline">Ficha PDF</span>
            </button>

            <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
                disabled={loading} 
                className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${
                    isEditing 
                    ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-green-900/20' 
                    : 'bg-[#003366] text-white hover:bg-blue-900 hover:shadow-blue-900/20'
                }`}
            >
                {loading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span> : isEditing ? <><Save size={18} /> Guardar</> : <><Edit3 size={18} /> Editar</>}
            </button>
        </div>
      </div>

      {/* MENSAJE MODO EDICIÓN */}
      {isEditing && (
        <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-xl text-sm border border-yellow-200 flex items-center justify-between animate-in fade-in">
           <div className="flex gap-2 items-center">
              <span className="bg-yellow-200 p-1 rounded-full"><Edit3 size={14}/></span>
              <span>Modo Edición activo.</span>
           </div>
           <button onClick={() => { setIsEditing(false); loadWorkerData(); }} className="text-yellow-900 hover:bg-yellow-200 p-1 rounded"><X size={18}/></button>
        </div>
      )}

      {/* NAVEGACIÓN DE PESTAÑAS */}
      <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
          {[
              { id: 'personal', label: 'General', icon: User },
              { id: 'location', label: 'Ubicación y Contacto', icon: MapPin },
              { id: 'education', label: 'Académicos', icon: GraduationCap },
              { id: 'work', label: 'Laboral y Bancario', icon: Shield },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.id 
                      ? 'bg-[#003366] text-white shadow-md' 
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                  <tab.icon size={16} /> {tab.label}
              </button>
          ))}
      </div>

      {/* CONTENIDO */}
      <div className="min-h-[400px]">
          {activeTab === 'personal' && renderPersonal()}
          {activeTab === 'location' && renderLocation()}
          {activeTab === 'education' && renderEducation()}
          {activeTab === 'work' && renderWork()}
      </div>

    </div>
  );
};

export default WorkerProfilePage;