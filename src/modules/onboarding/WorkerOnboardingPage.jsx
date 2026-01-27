import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import { 
  User, MapPin, Phone, Users, GraduationCap, 
  Briefcase, CreditCard, Save, ChevronRight, 
  ChevronLeft, Plus, Trash2, X, CheckCircle, AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

const WorkerOnboardingPage = () => {
  const { worker, refreshWorker } = useWorkerAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // --- ESTADO DEL FORMULARIO (ESTRUCTURA DE LA FICHA) ---
  const [formData, setFormData] = useState({
    // 1. DATOS PERSONALES
    birth_date: '',
    nationality: 'Peruana',
    sex: '',
    marital_status: 'Soltero',
    spouse_name: '',
    fathers_name: '',
    mothers_name: '',
    
    // Ubicación
    address: '',
    district: '',
    province: '',
    department: 'Lima',
    
    // Contacto Adicional
    phone: '', // Celular Personal (Ya suele venir del registro)
    secondary_phone: '',
    email: '', // Correo Personal
    secondary_email: '',
    
    // Sistema Pensionario y Tallas
    pension_system: 'ONP', // AFP / ONP
    shirt_size: '',
    pants_size: '',
    shoe_size: '',

    // 2. CONTACTOS DE EMERGENCIA (Array)
    emergency_contacts: [],

    // 3. FAMILIARES EN LA EMPRESA (Array)
    has_relatives_in_company: false,
    relatives_in_company: [],

    // 4. HIJOS / DEPENDIENTES (Array con edades)
    has_children: false,
    dependents: [],

    // 5. ANTECEDENTES ACADÉMICOS
    education_level: '',
    education_status: '',
    education_institution: '',
    additional_courses: [], // Array de strings o objetos

    // 6. EXPERIENCIA LABORAL (Array)
    work_experience: [],

    // 7. DATOS BANCARIOS
    bank_name: '',
    bank_account: '',
    cci: ''
  });

  // --- ESTADOS TEMPORALES PARA LISTAS ---
  const [tempEmergency, setTempEmergency] = useState({ name: '', phone: '', relation: '' });
  const [tempRelative, setTempRelative] = useState({ name: '', position: '' });
  const [tempDependent, setTempDependent] = useState({ name: '', age: '' });
  const [tempCourse, setTempCourse] = useState({ name: '', date: '' });
  
  const [newJob, setNewJob] = useState({
    company: '', role: '', field: '', period_start: '', period_end: '', 
    boss_name: '', boss_phone: '', functions: [] 
  });
  const [tempFunction, setTempFunction] = useState('');

  // CARGAR DATOS
  useEffect(() => {
    if (worker) {
      setFormData(prev => ({
        ...prev,
        // Mapeo de campos planos
        birth_date: worker.birth_date || '',
        nationality: worker.nationality || 'Peruana',
        sex: worker.sex || '',
        marital_status: worker.marital_status || 'Soltero',
        spouse_name: worker.spouse_name || '',
        fathers_name: worker.fathers_name || '',
        mothers_name: worker.mothers_name || '',
        address: worker.address || '',
        district: worker.district || '',
        province: worker.province || '',
        department: worker.department || 'Lima',
        phone: worker.phone || '',
        secondary_phone: worker.secondary_phone || '',
        secondary_email: worker.secondary_email || '',
        pension_system: worker.pension_system || 'ONP',
        shirt_size: worker.shirt_size || '',
        pants_size: worker.pants_size || '',
        shoe_size: worker.shoe_size || '',
        bank_name: worker.bank_name || '',
        bank_account: worker.bank_account || '',
        cci: worker.cci || '',
        
        education_level: worker.education_level || '',
        education_status: worker.education_status || '',
        education_institution: worker.education_institution || '',

        // Mapeo de JSONB (Arrays)
        emergency_contacts: worker.details?.emergency_contacts || [],
        has_relatives_in_company: worker.details?.has_relatives_in_company || false,
        relatives_in_company: worker.details?.relatives_in_company || [],
        has_children: worker.has_children || false,
        dependents: worker.details?.dependents || [],
        additional_courses: worker.details?.additional_courses || [],
        work_experience: worker.details?.work_experience || []
      }));
    }
  }, [worker]);

  // --- HANDLERS GENÉRICOS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // --- HANDLERS PARA LISTAS ---
  
  // Emergencia
  const addEmergencyContact = () => {
    if (!tempEmergency.name || !tempEmergency.phone) return;
    setFormData(prev => ({ ...prev, emergency_contacts: [...prev.emergency_contacts, tempEmergency] }));
    setTempEmergency({ name: '', phone: '', relation: '' });
  };
  const removeEmergencyContact = (idx) => {
    setFormData(prev => ({ ...prev, emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== idx) }));
  };

  // Familiares Empresa
  const addRelative = () => {
    if (!tempRelative.name) return;
    setFormData(prev => ({ ...prev, relatives_in_company: [...prev.relatives_in_company, tempRelative] }));
    setTempRelative({ name: '', position: '' });
  };
  const removeRelative = (idx) => {
    setFormData(prev => ({ ...prev, relatives_in_company: prev.relatives_in_company.filter((_, i) => i !== idx) }));
  };

  // Dependientes
  const addDependent = () => {
    if (!tempDependent.name) return;
    setFormData(prev => ({ ...prev, dependents: [...prev.dependents, tempDependent] }));
    setTempDependent({ name: '', age: '' });
  };
  const removeDependent = (idx) => {
    setFormData(prev => ({ ...prev, dependents: prev.dependents.filter((_, i) => i !== idx) }));
  };

  // Cursos
  const addCourse = () => {
    if (!tempCourse.name) return;
    setFormData(prev => ({ ...prev, additional_courses: [...prev.additional_courses, tempCourse] }));
    setTempCourse({ name: '', date: '' });
  };
  const removeCourse = (idx) => {
    setFormData(prev => ({ ...prev, additional_courses: prev.additional_courses.filter((_, i) => i !== idx) }));
  };

  // Trabajo
  const handleJobChange = (e) => setNewJob({ ...newJob, [e.target.name]: e.target.value });
  const addFunction = () => {
    if (!tempFunction) return;
    setNewJob(prev => ({ ...prev, functions: [...prev.functions, tempFunction] }));
    setTempFunction('');
  };
  const removeFunction = (idx) => setNewJob(prev => ({ ...prev, functions: prev.functions.filter((_, i) => i !== idx) }));
  const addJob = () => {
    if (!newJob.company || !newJob.role) return;
    setFormData(prev => ({ ...prev, work_experience: [...prev.work_experience, newJob] }));
    setNewJob({ company: '', role: '', field: '', period_start: '', period_end: '', boss_name: '', boss_phone: '', functions: [] });
  };
  const removeJob = (idx) => {
    setFormData(prev => ({ ...prev, work_experience: prev.work_experience.filter((_, i) => i !== idx) }));
  };

  // --- GUARDADO ---
  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = {
        // Campos Planos
        birth_date: formData.birth_date || null,
        nationality: formData.nationality,
        sex: formData.sex,
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

        // JSONB Complejo (Detalles)
        details: {
          ...worker.details,
          emergency_contacts: formData.emergency_contacts,
          has_relatives_in_company: formData.has_relatives_in_company,
          relatives_in_company: formData.relatives_in_company,
          dependents: formData.dependents,
          additional_courses: formData.additional_courses,
          work_experience: formData.work_experience
        },

        onboarding_completed: true
      };

      const { error } = await supabase.from('workers').update(updates).eq('id', worker.id);
      if (error) throw error;

      await refreshWorker();
      Swal.fire({
        icon: 'success',
        title: '¡Ficha Completada!',
        text: 'Todos tus datos han sido registrados.',
        confirmButtonText: 'Ir al Panel',
        confirmButtonColor: '#003366',
        allowOutsideClick: false
      }).then((r) => r.isConfirmed && navigate('/worker/dashboard'));

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudieron guardar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Swal.fire({
        title: '¿Omitir?',
        text: "Podrás llenar la ficha después desde tu perfil.",
        showCancelButton: true,
        confirmButtonText: 'Sí, ir al Panel',
        cancelButtonText: 'Continuar llenando'
    }).then((r) => r.isConfirmed && navigate('/worker/dashboard'));
  };

  // --- RENDERIZADO DE PASOS ---

  // PASO 1: DATOS PERSONALES
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
         <User className="text-[#003366]" /> 
         <h3 className="text-lg font-bold text-slate-700">1. Datos Personales</h3>
      </div>
      
      {/* Bloque 1: Nacimiento y Nacionalidad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div>
            <label className="label-input">Fecha de Nacimiento *</label>
            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="input-field" />
         </div>
         <div>
            <label className="label-input">Nacionalidad</label>
            <input name="nationality" value={formData.nationality} onChange={handleChange} className="input-field" placeholder="Ej: Peruana" />
         </div>
         <div>
            <label className="label-input">Sexo *</label>
            <select name="sex" value={formData.sex} onChange={handleChange} className="input-field">
                <option value="">-- Seleccione --</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
            </select>
         </div>
      </div>

      {/* Bloque 2: Estado Civil y Cónyuge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
         <div>
            <label className="label-input">Estado Civil *</label>
            <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="input-field">
                <option value="Soltero">Soltero(a)</option>
                <option value="Casado">Casado(a)</option>
                <option value="Conviviente">Conviviente</option>
                <option value="Divorciado">Divorciado(a)</option>
                <option value="Viudo">Viudo(a)</option>
            </select>
         </div>
         {['Casado', 'Conviviente'].includes(formData.marital_status) && (
            <div className="animate-in fade-in">
                <label className="label-input text-[#003366]">Nombre del Cónyuge / Pareja *</label>
                <input name="spouse_name" value={formData.spouse_name} onChange={handleChange} className="input-field border-blue-200 bg-white" placeholder="Nombres completos" />
            </div>
         )}
      </div>

      {/* Bloque 3: Padres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
            <label className="label-input">Nombre del Papá</label>
            <input name="fathers_name" value={formData.fathers_name} onChange={handleChange} className="input-field" placeholder="Nombres completos" />
         </div>
         <div>
            <label className="label-input">Nombre de la Mamá</label>
            <input name="mothers_name" value={formData.mothers_name} onChange={handleChange} className="input-field" placeholder="Nombres completos" />
         </div>
      </div>

      {/* Bloque 4: Ubicación */}
      <div className="space-y-3 pt-2">
         <h4 className="text-xs font-bold text-slate-400 uppercase border-b border-slate-100 pb-1">Dirección Actual</h4>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
             <div className="md:col-span-3">
                <input name="address" value={formData.address} onChange={handleChange} className="input-field" placeholder="Av. / Jr. / Calle / Mz. Lt." />
             </div>
             <input name="department" value={formData.department} onChange={handleChange} className="input-field" placeholder="Departamento (Ej: Lima)" />
             <input name="province" value={formData.province} onChange={handleChange} className="input-field" placeholder="Provincia" />
             <input name="district" value={formData.district} onChange={handleChange} className="input-field" placeholder="Distrito" />
         </div>
      </div>

      {/* Bloque 5: Contacto Adicional y Tallas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
         <div>
            <label className="label-input">Celular Adicional</label>
            <input name="secondary_phone" value={formData.secondary_phone} onChange={handleChange} className="input-field" placeholder="Otro número de contacto" />
         </div>
         <div>
            <label className="label-input">Correo Adicional</label>
            <input name="secondary_email" value={formData.secondary_email} onChange={handleChange} className="input-field" placeholder="Opcional" />
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
         <div className="col-span-2 md:col-span-1">
            <label className="label-input">Régimen</label>
            <select name="pension_system" value={formData.pension_system} onChange={handleChange} className="input-field">
               <option value="ONP">ONP</option>
               <option value="AFP Integra">AFP Integra</option>
               <option value="AFP Prima">AFP Prima</option>
               <option value="AFP Profuturo">AFP Profuturo</option>
               <option value="AFP Habitat">AFP Habitat</option>
            </select>
         </div>
         <div><label className="label-input">Talla Camisa</label><input name="shirt_size" value={formData.shirt_size} onChange={handleChange} className="input-field text-center" /></div>
         <div><label className="label-input">Talla Pantalón</label><input name="pants_size" value={formData.pants_size} onChange={handleChange} className="input-field text-center" /></div>
         <div><label className="label-input">Talla Zapato</label><input name="shoe_size" value={formData.shoe_size} onChange={handleChange} className="input-field text-center" /></div>
      </div>
    </div>
  );

  // PASO 2: FAMILIA Y EMERGENCIA
  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
         <Users className="text-red-600" /> 
         <h3 className="text-lg font-bold text-slate-700">2. Familia y Emergencia</h3>
      </div>

      {/* Contactos de Emergencia */}
      <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
         <h4 className="text-sm font-bold text-red-800">Contactos de Emergencia *</h4>
         <div className="grid grid-cols-3 gap-2">
            <input placeholder="Nombre" value={tempEmergency.name} onChange={e => setTempEmergency({...tempEmergency, name: e.target.value})} className="input-sm col-span-1" />
            <input placeholder="Teléfono" value={tempEmergency.phone} onChange={e => setTempEmergency({...tempEmergency, phone: e.target.value})} className="input-sm col-span-1" />
            <div className="flex gap-1 col-span-1">
                <input placeholder="Parentesco" value={tempEmergency.relation} onChange={e => setTempEmergency({...tempEmergency, relation: e.target.value})} className="input-sm w-full" />
                <button onClick={addEmergencyContact} className="btn-add"><Plus size={16}/></button>
            </div>
         </div>
         <ul className="space-y-1">
            {formData.emergency_contacts.map((c, i) => (
                <li key={i} className="flex justify-between text-xs bg-white p-2 rounded border border-red-200">
                    <span><b>{c.name}</b> ({c.relation}): {c.phone}</span>
                    <button onClick={() => removeEmergencyContact(i)}><Trash2 size={14} className="text-red-400"/></button>
                </li>
            ))}
         </ul>
      </div>

      {/* Familiares en la empresa */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
         <div className="flex items-center gap-2">
             <input type="checkbox" checked={formData.has_relatives_in_company} onChange={e => setFormData({...formData, has_relatives_in_company: e.target.checked})} className="w-4 h-4" />
             <label className="text-sm font-bold text-slate-700">¿Tiene familiares en la empresa?</label>
         </div>
         {formData.has_relatives_in_company && (
             <div className="pl-4 border-l-2 border-slate-200 space-y-2">
                <div className="flex gap-2">
                    <input placeholder="Nombre Familiar" value={tempRelative.name} onChange={e => setTempRelative({...tempRelative, name: e.target.value})} className="input-sm flex-1" />
                    <input placeholder="Cargo" value={tempRelative.position} onChange={e => setTempRelative({...tempRelative, position: e.target.value})} className="input-sm flex-1" />
                    <button onClick={addRelative} className="btn-add"><Plus size={16}/></button>
                </div>
                {formData.relatives_in_company.map((r, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2 rounded flex justify-between">
                        <span>{r.name} - {r.position}</span>
                        <button onClick={() => removeRelative(i)}><Trash2 size={14} /></button>
                    </div>
                ))}
             </div>
         )}
      </div>

      {/* Hijos / Dependientes */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
         <div className="flex items-center gap-2">
             <input type="checkbox" checked={formData.has_children} onChange={e => setFormData({...formData, has_children: e.target.checked})} className="w-4 h-4" />
             <label className="text-sm font-bold text-slate-700">¿Tiene Hijos o Personas Dependientes?</label>
         </div>
         {formData.has_children && (
             <div className="pl-4 border-l-2 border-slate-200 space-y-2">
                <div className="flex gap-2">
                    <input placeholder="Nombres y Apellidos" value={tempDependent.name} onChange={e => setTempDependent({...tempDependent, name: e.target.value})} className="input-sm flex-[2]" />
                    <input placeholder="Edad" type="number" value={tempDependent.age} onChange={e => setTempDependent({...tempDependent, age: e.target.value})} className="input-sm flex-1" />
                    <button onClick={addDependent} className="btn-add"><Plus size={16}/></button>
                </div>
                {formData.dependents.map((d, i) => (
                    <div key={i} className="text-xs bg-slate-50 p-2 rounded flex justify-between">
                        <span>{d.name} ({d.age} años)</span>
                        <button onClick={() => removeDependent(i)}><Trash2 size={14} /></button>
                    </div>
                ))}
             </div>
         )}
      </div>
    </div>
  );

  // PASO 3: ANTECEDENTES ACADÉMICOS
  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
         <GraduationCap className="text-purple-600" /> 
         <h3 className="text-lg font-bold text-slate-700">3. Antecedentes Académicos</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div>
            <label className="label-input">Nivel de Estudios</label>
            <select name="education_level" value={formData.education_level} onChange={handleChange} className="input-field">
                <option value="">-- Seleccione --</option>
                <option value="Secundaria">Secundaria</option>
                <option value="Técnico">Técnico Superior</option>
                <option value="Universitario">Universitario</option>
                <option value="Bachiller">Bachiller</option>
                <option value="Titulado">Titulado</option>
            </select>
         </div>
         <div>
            <label className="label-input">Estado</label>
            <select name="education_status" value={formData.education_status} onChange={handleChange} className="input-field">
                <option value="">-- Seleccione --</option>
                <option value="Completo">Completo / Egresado</option>
                <option value="Incompleto">Incompleto</option>
                <option value="En Curso">En Curso</option>
            </select>
         </div>
      </div>
      <div>
         <label className="label-input">Institución Educativa</label>
         <input name="education_institution" value={formData.education_institution} onChange={handleChange} className="input-field" placeholder="Nombre del Colegio / Instituto / Universidad" />
      </div>

      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3 mt-4">
         <h4 className="text-sm font-bold text-purple-800">Cursos Adicionales / Capacitaciones</h4>
         <div className="flex gap-2">
             <input placeholder="Nombre del Curso" value={tempCourse.name} onChange={e => setTempCourse({...tempCourse, name: e.target.value})} className="input-sm flex-[2]" />
             <input type="month" value={tempCourse.date} onChange={e => setTempCourse({...tempCourse, date: e.target.value})} className="input-sm flex-1" />
             <button onClick={addCourse} className="btn-add bg-purple-200 text-purple-700 hover:bg-purple-300"><Plus size={16}/></button>
         </div>
         <ul className="space-y-1">
             {formData.additional_courses.map((c, i) => (
                 <li key={i} className="text-xs bg-white p-2 rounded border border-purple-200 flex justify-between">
                     <span>{c.name} - {c.date}</span>
                     <button onClick={() => removeCourse(i)}><Trash2 size={14}/></button>
                 </li>
             ))}
         </ul>
      </div>
    </div>
  );

  // PASO 4: EXPERIENCIA LABORAL (Mejorada con campos de la ficha)
  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
         <Briefcase className="text-orange-600" /> 
         <h3 className="text-lg font-bold text-slate-700">4. Experiencia Laboral</h3>
         <span className="text-xs text-slate-400 ml-auto">(3 últimas)</span>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
         <h4 className="text-sm font-bold text-slate-600">Agregar Trabajo</h4>
         <div className="grid grid-cols-2 gap-3">
            <input placeholder="Empresa" name="company" value={newJob.company} onChange={handleJobChange} className="input-sm" />
            <input placeholder="Cargo" name="role" value={newJob.role} onChange={handleJobChange} className="input-sm" />
            <input placeholder="Rubro" name="field" value={newJob.field} onChange={handleJobChange} className="input-sm" />
            <div className="flex gap-1">
               <input placeholder="Inicio (Mes/Año)" name="period_start" value={newJob.period_start} onChange={handleJobChange} className="input-sm flex-1" />
               <input placeholder="Fin" name="period_end" value={newJob.period_end} onChange={handleJobChange} className="input-sm flex-1" />
            </div>
         </div>
         <div className="grid grid-cols-2 gap-3">
             <input placeholder="Nombre Jefe Inmediato" name="boss_name" value={newJob.boss_name} onChange={handleJobChange} className="input-sm" />
             <input placeholder="Teléfono Jefe" name="boss_phone" value={newJob.boss_phone} onChange={handleJobChange} className="input-sm" />
         </div>

         {/* Funciones */}
         <div className="bg-white p-2 rounded border border-slate-200">
             <div className="flex gap-2 mb-2">
                 <input placeholder="Función principal..." value={tempFunction} onChange={e => setTempFunction(e.target.value)} className="input-sm flex-1" onKeyDown={e => e.key === 'Enter' && addFunction()} />
                 <button onClick={addFunction} className="btn-add"><Plus size={16}/></button>
             </div>
             <ul className="text-xs space-y-1">
                 {newJob.functions.map((f, i) => (
                     <li key={i} className="flex justify-between bg-slate-50 px-2 py-1 rounded">
                         <span>- {f}</span>
                         <button onClick={() => removeFunction(i)}><X size={12}/></button>
                     </li>
                 ))}
             </ul>
         </div>

         <button onClick={addJob} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 flex justify-center gap-2">
             <Plus size={16}/> Guardar Experiencia
         </button>
      </div>

      <div className="space-y-3">
         {formData.work_experience.map((job, idx) => (
             <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 relative">
                 <button onClick={() => removeJob(idx)} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                 <h4 className="font-bold text-sm text-slate-800">{job.company} - {job.role}</h4>
                 <p className="text-xs text-slate-500">{job.period_start} a {job.period_end}</p>
                 <div className="mt-2 text-xs text-slate-600">
                    <p><b>Jefe:</b> {job.boss_name} ({job.boss_phone})</p>
                    <ul className="list-disc ml-4 mt-1">
                        {job.functions?.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                 </div>
             </div>
         ))}
      </div>
    </div>
  );

  // PASO 5: DATOS FINANCIEROS (Igual que antes)
  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
         <CreditCard className="text-green-600" /> 
         <h3 className="text-lg font-bold text-slate-700">5. Datos Bancarios</h3>
      </div>
      <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-green-800 text-xs mb-4">
         Los pagos se realizan semanalmente. Asegúrese de que la cuenta esté activa y a su nombre.
      </div>
      <div className="space-y-4">
         <div>
            <label className="label-input">Banco</label>
            <select name="bank_name" value={formData.bank_name} onChange={handleChange} className="input-field">
                <option value="">-- Seleccione --</option>
                <option value="BCP">BCP</option>
                <option value="Interbank">Interbank</option>
                <option value="BBVA">BBVA</option>
                <option value="Scotiabank">Scotiabank</option>
                <option value="Banco de la Nación">Banco de la Nación</option>
                <option value="Otro">Otro</option>
            </select>
         </div>
         <div>
             <label className="label-input">Número de Cuenta</label>
             <input name="bank_account" value={formData.bank_account} onChange={handleChange} className="input-field font-mono" placeholder="Ej: 191-..." />
         </div>
         <div>
             <label className="label-input">CCI (Código Interbancario)</label>
             <input name="cci" value={formData.cci} onChange={handleChange} className="input-field font-mono" placeholder="Ej: 002-191-..." />
             <p className="text-[10px] text-slate-400 mt-1">Obligatorio si su banco NO es BCP.</p>
         </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        
        {/* HEADER */}
        <div className="bg-[#003366] p-6 text-white shrink-0 relative">
          <h1 className="text-xl font-bold relative z-10">Ficha de Personal - Obrero</h1>
          <p className="text-blue-200 text-xs relative z-10">Paso {step} de 5</p>
          <div className="flex gap-1 mt-3">
             {[1,2,3,4,5].map(i => (
                 <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#f0c419]' : 'bg-white/20'}`} />
             ))}
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
           {step === 1 && renderStep1()}
           {step === 2 && renderStep2()}
           {step === 3 && renderStep3()}
           {step === 4 && renderStep4()}
           {step === 5 && renderStep5()}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-between items-center">
            {step === 1 ? (
                <button onClick={handleSkip} className="text-slate-400 font-bold text-sm px-3 hover:text-slate-600">Omitir</button>
            ) : (
                <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-slate-600 font-bold text-sm px-4 py-2 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16}/> Atrás</button>
            )}

            {step < 5 ? (
                <button onClick={() => setStep(s => s + 1)} className="bg-[#003366] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-900 shadow-lg shadow-blue-900/20">Siguiente <ChevronRight size={16}/></button>
            ) : (
                <button onClick={handleSave} disabled={loading} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 shadow-lg shadow-green-900/20">
                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <><CheckCircle size={18}/> Finalizar Ficha</>}
                </button>
            )}
        </div>
      </div>
      
      {/* Estilos adicionales para inputs */}
      <style>{`
        .input-field { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background-color: #f8fafc; font-size: 0.875rem; outline: none; transition: all; }
        .input-field:focus { background-color: white; border-color: #93c5fd; box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.3); }
        .label-input { display: block; font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
        .input-sm { width: 100%; padding: 0.4rem; border-radius: 0.375rem; border: 1px solid #cbd5e1; font-size: 0.75rem; outline: none; }
        .btn-add { background-color: #e2e8f0; color: #475569; padding: 0.4rem; border-radius: 0.375rem; transition: background 0.2s; }
        .btn-add:hover { background-color: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default WorkerOnboardingPage;