import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { supabase } from '../../services/supabase';
import { 
  User, Users, GraduationCap, Briefcase, CreditCard, 
  ChevronRight, ChevronLeft, Plus, Trash2, X, CheckCircle, 
  AlertCircle, Building, SkipForward, Home, Phone, Mail, Calendar, ListPlus
} from 'lucide-react';

// IMPORTACIÓN DEL LOGO
import logoLyk from '../../assets/images/logo-lk-full.png';

const BANKS_PERU = [
  'BCP (Banco de Crédito)', 'BBVA', 'Interbank', 'Scotiabank', 
  'Banco de la Nación', 'BanBif', 'Banco Pichincha', 'MiBanco', 
  'Caja Arequipa', 'Caja Piura', 'Caja Huancayo', 'Caja Cusco', 
  'Caja Trujillo', 'Compartamos Financiera', 'Otro'
];

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const PANT_SIZES = ['26', '28', '30', '32', '34', '36', '38'];
const SHOE_SIZES = Array.from({length: 9}, (_, i) => (36 + i).toString());

const STEPS = [
  { id: 1, title: 'Datos Personales', subtitle: 'Información Básica', icon: User },
  { id: 2, title: 'Familia', subtitle: 'Hijos y Emergencias', icon: Users },
  { id: 3, title: 'Formación', subtitle: 'Estudios', icon: GraduationCap },
  { id: 4, title: 'Experiencia', subtitle: 'Historial Laboral', icon: Briefcase },
  { id: 5, title: 'Pagos', subtitle: 'Cuentas Bancarias', icon: CreditCard },
];

const WorkerOnboardingPage = () => {
  const { worker, refreshWorker } = useWorkerAuth();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.innerWidth > 768) {
      const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  const handleLogoutForce = async () => {
    // Implementar si tienes función de logout en el contexto de worker, sino redirigir
    window.location.href = '/login';
  };

  // --- ESTADO DEL FORMULARIO ---
  const [formData, setFormData] = useState({
    // 1. DATOS PERSONALES
    birth_date: '',
    age: '',
    nationality: 'Peruana',
    sex: '',
    marital_status: 'Soltero',
    spouse_name: '',
    fathers_name: '',
    mothers_name: '',
    
    // Ubicación
    address: '', district: '', province: '', department: 'Lima',
    
    // Contacto
    phone: '', secondary_phone: '', secondary_email: '',
    
    // Sistema Pensionario y Tallas
    pension_system: 'ONP', shirt_size: '', pants_size: '', shoe_size: '',

    // 2. FAMILIA Y EMERGENCIA
    emergency_contacts: [],
    has_relatives_in_company: false,
    relatives_in_company: [],
    has_children: false,
    dependents: [],

    // 3. ACADÉMICO
    education_level: '',
    education_status: '',
    education_institution: '',
    grad_date: '', // Nuevo campo para fecha exacta
    additional_courses: [], 

    // 4. EXPERIENCIA
    work_experience: [],

    // 5. BANCARIO
    bank_name: '', bank_account: '', cci: ''
  });

  // Estados temporales
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
        grad_date: worker.details?.grad_date || '', 

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

  // HANDLERS
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
        let newState = { ...prev, [name]: type === 'checkbox' ? checked : value };

        // CÁLCULO DE EDAD AUTOMÁTICO
        if (name === 'birth_date' && value) {
            const birth = new Date(value);
            const now = new Date();
            if (!isNaN(birth.getTime())) {
                let age = now.getFullYear() - birth.getFullYear();
                const m = now.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
                newState.age = age > 0 ? age.toString() : '0';
            } else {
                newState.age = '';
            }
        }
        return newState;
    });
  };

  // Manejo de listas
  const addItem = (section, item, setItem, reset) => {
    if (Object.values(item).some(v => !v)) return; 
    setFormData(prev => ({ ...prev, [section]: [...prev[section], item] }));
    setItem(reset);
  };
  const removeItem = (section, index) => {
    setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  // Manejo de trabajo
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

  // --- VALIDACIÓN Y NAVEGACIÓN ---
  const validateStep = (step) => {
    const errors = [];
    if (step === 1) {
        if (!formData.birth_date) errors.push("Fecha de Nacimiento");
        if (!formData.age) errors.push("Edad (Automática)");
        if (!formData.nationality) errors.push("Nacionalidad");
        if (!formData.sex) errors.push("Sexo");
        if (!formData.marital_status) errors.push("Estado Civil");
        if (['Casado', 'Conviviente'].includes(formData.marital_status) && !formData.spouse_name) errors.push("Nombre del Cónyuge");
        if (!formData.address) errors.push("Dirección Actual");
        if (!formData.phone) errors.push("Celular");
        if (!formData.pension_system) errors.push("Régimen Pensionario");
        if (!formData.shirt_size) errors.push("Talla de Polo");
        if (!formData.pants_size) errors.push("Talla de Pantalón");
        if (!formData.shoe_size) errors.push("Talla de Zapato");
    }
    if (step === 2) {
        if (formData.emergency_contacts.length === 0) errors.push("Registre al menos un Contacto de Emergencia");
        if (formData.has_children && formData.dependents.length === 0) errors.push("Registre a sus hijos en la lista");
    }
    if (step === 3) {
        if (!formData.education_level) errors.push("Nivel de Estudios");
        const advancedLevels = ['Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Egresado', 'Colegiado'];
        if (advancedLevels.includes(formData.education_level)) {
            if (!formData.education_institution) errors.push("Institución Educativa / Colegio");
            if (!formData.grad_date) errors.push("Fecha de Egreso / Grado");
        }
    }
    if (step === 5) {
        if (!formData.bank_name) errors.push("Banco");
        if (!formData.bank_account) errors.push("Número de Cuenta");
    }
    return errors;
  };

  const handleNext = () => {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
          setNotification({ isOpen: true, type: 'error', title: 'Campos Faltantes', message: 'Por favor complete:\n\n' + errors.map(e => `• ${e}`).join('\n') });
          return;
      }
      if (currentStep < STEPS.length) setCurrentStep(s => s + 1);
  };

  const handleFinalSubmit = () => {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
          setNotification({ isOpen: true, type: 'error', title: 'Campos Faltantes', message: 'Por favor complete:\n\n' + errors.map(e => `• ${e}`).join('\n') });
          return;
      }
      handleSubmit(false);
  };

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      const updates = {
        birth_date: skip ? null : (formData.birth_date || null),
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
        
        details: {
          ...worker.details,
          skipped: skip,
          age: formData.age, // GUARDA LA EDAD CALCULADA
          grad_date: formData.grad_date, 
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
      navigate('/worker/dashboard');
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron guardar los datos.' });
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO DE PASOS ---

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
       {/* Bloque 1 */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1"><FloatingInput label="F. Nacimiento" name="birth_date" type="date" val={formData.birth_date} onChange={handleChange} icon={Calendar} /></div>
          {/* CAMPO EDAD BLOQUEADO (READONLY) */}
          <div className="md:col-span-1"><FloatingInput label="Edad" name="age" type="text" val={formData.age} readOnly={true} className="bg-slate-100 cursor-not-allowed" /></div>
          <div className="md:col-span-2"><FloatingInput label="Nacionalidad" name="nationality" val={formData.nationality} onChange={handleChange} /></div>
       </div>

       {/* Bloque 2 */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select label="Sexo" name="sex" val={formData.sex} onChange={handleChange} options={['Masculino', 'Femenino']} />
          <Select label="Estado Civil" name="marital_status" val={formData.marital_status} onChange={handleChange} options={['Soltero', 'Casado', 'Conviviente', 'Viudo', 'Divorciado']} />
          {['Casado', 'Conviviente'].includes(formData.marital_status) && (
             <FloatingInput label="Cónyuge" name="spouse_name" val={formData.spouse_name} onChange={handleChange} />
          )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FloatingInput label="Nombre del Papá" name="fathers_name" val={formData.fathers_name} onChange={handleChange} />
          <FloatingInput label="Nombre de la Mamá" name="mothers_name" val={formData.mothers_name} onChange={handleChange} />
       </div>

       {/* Ubicación */}
       <SectionBox title="Dirección Actual">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="md:col-span-3"><FloatingInput label="Dirección / Calle / Mz." name="address" val={formData.address} onChange={handleChange} icon={Home} /></div>
             <FloatingInput label="Departamento" name="department" val={formData.department} onChange={handleChange} />
             <FloatingInput label="Provincia" name="province" val={formData.province} onChange={handleChange} />
             <FloatingInput label="Distrito" name="district" val={formData.district} onChange={handleChange} />
          </div>
       </SectionBox>

       {/* Tallas y Régimen */}
       <SectionBox title="Datos Laborales y Tallas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
             <FloatingInput label="Celular Principal" name="phone" val={formData.phone} onChange={handleChange} icon={Phone} />
             <Select label="Régimen Pensionario" name="pension_system" val={formData.pension_system} onChange={handleChange} options={['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen']} />
          </div>
          <div className="grid grid-cols-3 gap-6">
             <Select label="Talla Polo" name="shirt_size" val={formData.shirt_size} onChange={handleChange} options={SHIRT_SIZES} />
             <Select label="Talla Pantalón" name="pants_size" val={formData.pants_size} onChange={handleChange} options={PANT_SIZES} />
             <Select label="Talla Zapato" name="shoe_size" val={formData.shoe_size} onChange={handleChange} options={SHOE_SIZES} />
          </div>
       </SectionBox>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
       <SectionBox title="Contactos de Emergencia (Obligatorio)">
          <div className="flex gap-2 mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
             <input placeholder="Nombre" value={tempEmergency.name} onChange={e => setTempEmergency({...tempEmergency, name: e.target.value})} className="input-simple flex-[2]" />
             <input placeholder="Teléfono" value={tempEmergency.phone} onChange={e => setTempEmergency({...tempEmergency, phone: e.target.value})} className="input-simple flex-1" />
             <input placeholder="Relación" value={tempEmergency.relation} onChange={e => setTempEmergency({...tempEmergency, relation: e.target.value})} className="input-simple flex-1" />
             <button onClick={() => addItem('emergency_contacts', tempEmergency, setTempEmergency, {name:'', phone:'', relation:''})} className="btn-icon"><Plus size={18}/></button>
          </div>
          <div className="space-y-2">
             {formData.emergency_contacts.map((c, i) => (
                <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-sm">
                   <span><b className="text-slate-700">{c.name}</b> <span className="text-slate-400">({c.relation})</span> - {c.phone}</span>
                   <button onClick={() => removeItem('emergency_contacts', i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
             ))}
          </div>
       </SectionBox>

       <SectionBox title="Familiares e Hijos">
          <div className="flex items-center gap-2 mb-4">
             <input type="checkbox" checked={formData.has_relatives_in_company} onChange={e => handleChange({target: {name: 'has_relatives_in_company', type: 'checkbox', checked: e.target.checked}})} className="w-4 h-4 text-[#003366]" />
             <label className="text-sm font-bold text-slate-700">¿Tiene familiares en la empresa?</label>
          </div>
          {formData.has_relatives_in_company && (
             <div className="pl-4 border-l-2 border-slate-200 mb-6">
                <div className="flex gap-2 mb-2">
                   <input placeholder="Nombre Familiar" value={tempRelative.name} onChange={e => setTempRelative({...tempRelative, name: e.target.value})} className="input-simple flex-1" />
                   <input placeholder="Cargo" value={tempRelative.position} onChange={e => setTempRelative({...tempRelative, position: e.target.value})} className="input-simple flex-1" />
                   <button onClick={() => addItem('relatives_in_company', tempRelative, setTempRelative, {name:'', position:''})} className="btn-icon"><Plus size={18}/></button>
                </div>
                {formData.relatives_in_company.map((r, i) => (
                   <div key={i} className="flex justify-between text-xs bg-slate-50 p-2 rounded mb-1">
                      <span>{r.name} - {r.position}</span>
                      <button onClick={() => removeItem('relatives_in_company', i)}><Trash2 size={14}/></button>
                   </div>
                ))}
             </div>
          )}

          <div className="flex items-center gap-2 mb-4">
             <input type="checkbox" checked={formData.has_children} onChange={e => handleChange({target: {name: 'has_children', type: 'checkbox', checked: e.target.checked}})} className="w-4 h-4 text-[#003366]" />
             <label className="text-sm font-bold text-slate-700">¿Tiene Hijos?</label>
          </div>
          {formData.has_children && (
             <div className="pl-4 border-l-2 border-slate-200">
                <div className="flex gap-2 mb-2">
                   <input placeholder="Nombre Hijo/a" value={tempDependent.name} onChange={e => setTempDependent({...tempDependent, name: e.target.value})} className="input-simple flex-[2]" />
                   <input placeholder="Edad" type="number" value={tempDependent.age} onChange={e => setTempDependent({...tempDependent, age: e.target.value})} className="input-simple flex-1" />
                   <button onClick={() => addItem('dependents', tempDependent, setTempDependent, {name:'', age:''})} className="btn-icon"><Plus size={18}/></button>
                </div>
                {formData.dependents.map((d, i) => (
                   <div key={i} className="flex justify-between text-xs bg-slate-50 p-2 rounded mb-1">
                      <span>{d.name} ({d.age} años)</span>
                      <button onClick={() => removeItem('dependents', i)}><Trash2 size={14}/></button>
                   </div>
                ))}
             </div>
          )}
       </SectionBox>
    </div>
  );

  const renderStep3 = () => {
    // Niveles que requieren detalles adicionales
    const advancedLevels = ['Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Egresado', 'Colegiado'];
    const showDetails = advancedLevels.includes(formData.education_level);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
         <SectionBox title="Nivel Académico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
               <Select label="Nivel de Estudios" name="education_level" val={formData.education_level} onChange={handleChange} options={['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Egresado', 'Colegiado']} />
               <Select label="Estado" name="education_status" val={formData.education_status} onChange={handleChange} options={['Completo', 'Incompleto', 'En Curso']} />
            </div>
            
            {/* CAMPOS DINÁMICOS */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <FloatingInput label="Institución Educativa / Colegio" name="education_institution" val={formData.education_institution} onChange={handleChange} icon={Building} />
                        <FloatingInput label="Fecha de Egreso / Grado" name="grad_date" type="date" val={formData.grad_date} onChange={handleChange} />
                    </motion.div>
                )}
            </AnimatePresence>
         </SectionBox>

         <SectionBox title="Cursos / Capacitaciones">
            <div className="flex gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
               <input placeholder="Nombre del Curso" value={tempCourse.name} onChange={e => setTempCourse({...tempCourse, name: e.target.value})} className="input-simple flex-[2]" />
               <input type="date" value={tempCourse.date} onChange={e => setTempCourse({...tempCourse, date: e.target.value})} className="input-simple flex-1" />
               <button onClick={() => addItem('additional_courses', tempCourse, setTempCourse, {name:'', date:''})} className="btn-icon bg-[#003366] text-white"><Plus size={18}/></button>
            </div>
            <div className="space-y-2">
               {formData.additional_courses.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-sm">
                     <span><b>{c.name}</b> <span className="text-slate-400 text-xs">({c.date})</span></span>
                     <button onClick={() => removeItem('additional_courses', i)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
               ))}
            </div>
         </SectionBox>
      </div>
    );
  };

  const renderStep4 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Agregar Experiencia Laboral</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <input placeholder="Empresa" name="company" value={newJob.company} onChange={handleJobChange} className="input-simple bg-white" />
             <input placeholder="Cargo" name="role" value={newJob.role} onChange={handleJobChange} className="input-simple bg-white" />
             <div className="flex gap-2">
                <input placeholder="Inicio" name="period_start" value={newJob.period_start} onChange={handleJobChange} className="input-simple bg-white flex-1" />
                <input placeholder="Fin" name="period_end" value={newJob.period_end} onChange={handleJobChange} className="input-simple bg-white flex-1" />
             </div>
             <input placeholder="Rubro" name="field" value={newJob.field} onChange={handleJobChange} className="input-simple bg-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <input placeholder="Nombre Jefe" name="boss_name" value={newJob.boss_name} onChange={handleJobChange} className="input-simple bg-white" />
             <input placeholder="Teléfono Jefe" name="boss_phone" value={newJob.boss_phone} onChange={handleJobChange} className="input-simple bg-white" />
          </div>
          
          <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4">
             <div className="flex gap-2 mb-2">
                 <input placeholder="Función realizada..." value={tempFunction} onChange={e => setTempFunction(e.target.value)} className="input-simple flex-1" onKeyDown={e => e.key === 'Enter' && addFunction()} />
                 <button onClick={addFunction} className="btn-icon"><Plus size={16}/></button>
             </div>
             <ul className="space-y-1">
                 {newJob.functions.map((f, i) => (
                     <li key={i} className="flex justify-between items-center text-xs bg-slate-50 px-2 py-1 rounded">
                         <span>- {f}</span>
                         <button onClick={() => removeFunction(i)} className="text-red-400"><X size={14}/></button>
                     </li>
                 ))}
             </ul>
          </div>

          <button onClick={addJob} className="w-full py-3 bg-[#003366] text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-900 transition-all flex justify-center gap-2"><Plus size={18}/> Guardar Experiencia</button>
       </div>

       <div className="space-y-3">
          {formData.work_experience.map((job, idx) => (
             <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group">
                 <button onClick={() => removeItem('work_experience', idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                 <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">{idx+1}</div>
                    <div>
                        <h4 className="font-bold text-slate-800">{job.company}</h4>
                        <p className="text-xs text-slate-500 font-bold mb-1">{job.role} <span className="font-normal">({job.period_start} - {job.period_end})</span></p>
                        {job.boss_name && <p className="text-xs text-slate-500 mb-2">Jefe: {job.boss_name} ({job.boss_phone})</p>}
                        <ul className="list-disc ml-4 text-xs text-slate-600">
                            {job.functions.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                    </div>
                 </div>
             </div>
          ))}
       </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
       <div className="text-center space-y-2 py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4"><CreditCard size={32}/></div>
          <h3 className="text-xl font-bold text-slate-800">Datos Bancarios</h3>
          <p className="text-sm text-slate-500">Para el pago semanal de haberes.</p>
       </div>
       
       <div className="max-w-md mx-auto space-y-6">
          <Select label="Banco Principal" name="bank_name" val={formData.bank_name} onChange={handleChange} options={BANKS_PERU} />
          <FloatingInput label="Número de Cuenta" name="bank_account" val={formData.bank_account} onChange={handleChange} icon={CreditCard} />
          <div className="relative">
             <FloatingInput label="CCI (Código Interbancario)" name="cci" val={formData.cci} onChange={handleChange} />
             <p className="text-[10px] text-slate-400 mt-1 ml-2">Recomendado si su banco NO es BCP.</p>
          </div>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-800">
      <div className="fixed inset-0 pointer-events-none" style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 51, 102, 0.15), transparent 40%)` }} />
      
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-6xl h-[90vh] md:h-[800px] bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col md:flex-row overflow-hidden">
        
        {/* BOTÓN OMITIR */}
        <button onClick={() => handleSubmit(true)} disabled={loading} className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-full shadow-sm text-xs font-bold text-slate-500 hover:text-[#003366] hover:border-[#003366] transition-all">
            Omitir <SkipForward size={14} />
        </button>

        {/* SIDEBAR */}
        <div className="w-full md:w-80 bg-white/60 border-r border-white/50 p-8 flex flex-col">
          <div className="mb-8">
             <div className="h-16 mb-6 flex items-center justify-center bg-white/50 px-4 py-2 rounded-xl border border-white shadow-sm overflow-hidden">
                {!imageError ? <img src={logoLyk} alt="L&K" className="h-full object-contain" onError={() => setImageError(true)} /> : <div className="flex items-center gap-2 text-[#003366] font-black text-xl"><Building size={24}/> L&K</div>}
             </div>
             <div className="mb-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bienvenido/a</p>
                <h2 className="text-lg font-black text-[#003366] leading-tight break-words" title={worker?.full_name}>{worker?.full_name || 'Compañero'}</h2>
             </div>
             <p className="text-sm text-slate-500 font-medium">Ficha de ingreso de personal.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
             {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                return (
                   <div key={step.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isActive ? 'bg-white shadow-md translate-x-2' : 'hover:bg-white/40'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-[#003366] text-white' : 'bg-slate-200 text-slate-400'}`}>
                         {step.id < currentStep ? <CheckCircle size={20}/> : React.createElement(step.icon, { size: 18 })}
                      </div>
                      <div>
                         <p className={`text-sm font-bold ${isActive ? 'text-[#003366]' : 'text-slate-600'}`}>{step.title}</p>
                         <p className="text-[10px] text-slate-400">{step.subtitle}</p>
                      </div>
                   </div>
                )
             })}
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 flex flex-col relative bg-white/40">
           <div className="flex-1 overflow-y-auto p-6 md:p-12 relative scroll-smooth pt-16 md:pt-12">
              <AnimatePresence mode="wait">
                 <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto pb-24">
                    <div className="mb-8">
                       <h2 className="text-3xl font-bold text-[#003366] mb-2">{STEPS[currentStep-1].title}</h2>
                       <p className="text-slate-500">{STEPS[currentStep-1].subtitle}</p>
                    </div>
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                 </motion.div>
              </AnimatePresence>
           </div>

           <div className="p-6 bg-white/80 backdrop-blur-md border-t border-white/60 flex justify-between items-center z-30">
              <button onClick={() => currentStep > 1 && setCurrentStep(s => s - 1)} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 ${currentStep === 1 ? 'opacity-0' : ''}`}><ChevronLeft size={20}/> Atrás</button>
              <div className="flex items-center gap-4">
                 {currentStep < STEPS.length ? (
                    <button onClick={handleNext} className="group flex items-center gap-3 px-8 py-3 bg-[#003366] text-white rounded-xl font-bold shadow-xl hover:scale-[1.02] transition-all">Siguiente <ChevronRight size={18}/></button>
                 ) : (
                    <button onClick={() => handleSubmit(false)} disabled={loading} className="group flex items-center gap-3 px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-xl hover:scale-[1.02] transition-all">{loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <><CheckCircle size={18}/> Finalizar</>}</button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>

      {/* MODAL NOTIFICACIÓN */}
      <AnimatePresence>
         {notification.isOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                 <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-slate-200">
                     <div className="flex flex-col items-center text-center">
                         <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                             {notification.type === 'error' ? <AlertCircle size={32}/> : <CheckCircle2 size={32}/>}
                         </div>
                         <h3 className="text-xl font-bold text-slate-800 mb-2">{notification.title}</h3>
                         <div className="text-sm text-slate-600 whitespace-pre-line text-left bg-slate-50 p-4 rounded-xl w-full border border-slate-100 max-h-60 overflow-y-auto">
                             {notification.message}
                         </div>
                         <button onClick={() => setNotification({...notification, isOpen: false})} className="mt-6 w-full py-3 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 transition-colors">Entendido</button>
                     </div>
                 </motion.div>
             </div>
         )}
      </AnimatePresence>
      
      {/* ESTILOS INTERNOS */}
      <style>{`
        .input-simple { width: 100%; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.875rem; outline: none; transition: all; }
        .input-simple:focus { border-color: #93c5fd; box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.3); }
        .btn-icon { background-color: #eff6ff; color: #3b82f6; padding: 0.5rem; border-radius: 0.5rem; transition: all; }
        .btn-icon:hover { background-color: #dbeafe; }
      `}</style>
    </div>
  );
};

// Componentes Auxiliares para Diseño
const SectionBox = ({ title, children }) => (<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-5 pb-2 border-b border-slate-50">{title}</h4>{children}</div>);
const FloatingInput = ({ label, name, val, onChange, type="text", placeholder, icon: Icon, readOnly = false, className = '' }) => (
   <div className="relative group w-full">
      <div className="absolute top-0 left-3 px-1 -translate-y-1/2 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider group-focus-within:text-[#003366] transition-colors z-10">{label}</div>
      <div className="relative">
         {Icon && <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#003366] transition-colors"/>}
         <input 
            type={type} 
            name={name} 
            value={val} 
            onChange={onChange} 
            placeholder={placeholder} 
            readOnly={readOnly}
            className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] ${className}`} 
         />
      </div>
   </div>
);
const Select = ({ label, name, val, onChange, options }) => (
   <div className="relative group w-full">
      <div className="absolute top-0 left-3 px-1 -translate-y-1/2 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider group-focus-within:text-[#003366] transition-colors z-10">{label}</div>
      <select name={name} value={val} onChange={onChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"><option value="">- Seleccionar -</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronRight size={16} className="rotate-90" /></div>
   </div>
);
const SelectionCard = ({ selected, onClick, label }) => (
   <button onClick={onClick} className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm ${selected ? 'border-[#003366] bg-[#003366] text-white' : 'border-slate-100 bg-white text-slate-500'}`}>{selected && <CheckCircle2 size={16} className="text-[#f0c419]"/>}{label}</button>
);

export default WorkerOnboardingPage;