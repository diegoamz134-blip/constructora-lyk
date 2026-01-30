import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';
import { 
  User, Heart, Briefcase, GraduationCap, 
  CreditCard, CheckCircle2, ArrowRight, ArrowLeft, Save,
  ShieldCheck, Home, Phone, Mail,
  Building, Menu, Loader2, Calendar, Plus, Trash2, ListPlus,
  AlertCircle, SkipForward
} from 'lucide-react';

// IMPORTACIÓN DEL LOGO
import logoLyk from '../../assets/images/logo-lk-full.png';

const BANKS_PERU = [
  'BCP (Banco de Crédito)', 'BBVA', 'Interbank', 'Scotiabank', 
  'Banco de la Nación', 'BanBif', 'Banco Pichincha', 'MiBanco', 
  'Caja Arequipa', 'Caja Piura', 'Caja Huancayo', 'Caja Cusco', 
  'Caja Trujillo', 'Compartamos Financiera', 'Otro'
];

const PENSION_SYSTEMS = [
  'ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'
];

const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const PANT_SIZES = ['26', '28', '30', '32', '34', '36', '38'];
const SHOE_SIZES = Array.from({length: 9}, (_, i) => (36 + i).toString());

const STEPS = [
  { id: 1, title: 'Perfil Personal', subtitle: 'Datos y Ubicación', icon: User },
  { id: 2, title: 'Familia', subtitle: 'Hijos y Emergencias', icon: Heart },
  { id: 3, title: 'Formación', subtitle: 'Estudios', icon: GraduationCap },
  { id: 4, title: 'Experiencia', subtitle: 'Historial', icon: Briefcase },
  { id: 5, title: 'Pagos', subtitle: 'Cuentas', icon: CreditCard },
];

const StaffOnboardingPage = () => {
  const { currentUser, logout } = useUnifiedAuth();
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
    try { await logout(); } catch (e) { /**/ }
    window.location.href = '/login';
  };

  // --- ESTADO INICIAL ---
  const [formData, setFormData] = useState({
    // PERSONAL
    nationality: 'Peruana', birth_date: '', age: '', gender: '', civil_status: '',
    spouse_name: '', father_name: '', mother_name: '',
    address: '', district: '', province: '', department: 'Lima',
    phone: '', alt_phone: '', personal_email: '',
    shirt_size: '', shoe_size: '', pants_size: '', afp_status: '',

    // FAMILIA
    has_dependents: '', 
    children: [], 
    emergency_contacts: [], 
    has_relatives_in_company: 'NO', 
    relatives: [], 

    // EDUCACIÓN
    education_level: '', education_status: '', 
    grad_date: '', 
    institution: '',
    additional_courses: [], 

    // EXPERIENCIA
    work_experience: [], 

    // BANCO
    bank_name: '', bbva_account: '', interbank_account: '', bank_observations: ''
  });

  // --- HANDLERS GENÉRICOS ---
  const handleChange = (e, section = null, index = null, subfield = null) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
        let newFormData = { ...prev };

        if (section && index !== null) {
            const list = [...newFormData[section]];
            if (subfield) {
                list[index][subfield] = value;
            } else {
                list[index][name] = value; 
            }
            newFormData[section] = list;
        } else {
            newFormData[name] = value;
        }

        // --- CÁLCULO AUTOMÁTICO DE EDAD ---
        if (name === 'birth_date' && !section && value) {
            const birth = new Date(value);
            const now = new Date();
            if (!isNaN(birth.getTime())) { 
                let age = now.getFullYear() - birth.getFullYear();
                const m = now.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                    age--;
                }
                newFormData.age = age > 0 ? age.toString() : '0';
            } else {
                newFormData.age = '';
            }
        }

        return newFormData;
    });
  };

  const handleSelection = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = (section, template) => {
    setFormData(prev => ({ ...prev, [section]: [...prev[section], template] }));
  };

  const removeItem = (section, index) => {
    setFormData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  const addFunctionToJob = (jobIndex) => {
    const newWork = [...formData.work_experience];
    if (!newWork[jobIndex].functions) newWork[jobIndex].functions = [];
    newWork[jobIndex].functions.push('');
    setFormData({ ...formData, work_experience: newWork });
  };

  const removeFunctionFromJob = (jobIndex, funcIndex) => {
    const newWork = [...formData.work_experience];
    newWork[jobIndex].functions = newWork[jobIndex].functions.filter((_, i) => i !== funcIndex);
    setFormData({ ...formData, work_experience: newWork });
  };

  const changeFunctionInJob = (jobIndex, funcIndex, value) => {
    const newWork = [...formData.work_experience];
    newWork[jobIndex].functions[funcIndex] = value;
    setFormData({ ...formData, work_experience: newWork });
  };

  // --- VALIDACIÓN ESTRICTA ---
  const validateStep = (step) => {
    const errors = [];

    if (step === 1) {
        if (!formData.nationality) errors.push("Nacionalidad");
        if (!formData.birth_date) errors.push("Fecha de Nacimiento");
        if (!formData.gender) errors.push("Sexo");
        if (!formData.afp_status) errors.push("Sistema de Pensión");
        if (!formData.address) errors.push("Dirección");
        if (!formData.department) errors.push("Departamento");
        if (!formData.province) errors.push("Provincia");
        if (!formData.district) errors.push("Distrito");
        if (!formData.phone) errors.push("Celular Principal");
        if (!formData.personal_email) errors.push("Email Personal");
        if (!formData.civil_status) errors.push("Estado Civil");
        
        if (['Casado/a', 'Conviviente'].includes(formData.civil_status) && !formData.spouse_name) {
            errors.push("Nombre del Cónyuge");
        }
        if (!formData.father_name) errors.push("Nombre del Padre");
        if (!formData.mother_name) errors.push("Nombre de la Madre");
    }

    if (step === 2) {
        if (!formData.has_dependents) errors.push("¿Tiene hijos/dependientes?");
        if (formData.has_dependents === 'SI' && formData.children.length === 0) {
            errors.push("Debe registrar al menos un hijo si indicó 'SÍ'");
        }
        formData.children.forEach((child, idx) => {
            if (!child.name || !child.age) errors.push(`Datos del Hijo #${idx + 1} incompletos`);
        });

        if (formData.emergency_contacts.length === 0) {
            errors.push("Debe agregar al menos un Contacto de Emergencia");
        }
        formData.emergency_contacts.forEach((contact, idx) => {
            if (!contact.name || !contact.relationship || !contact.phone) {
                errors.push(`Contacto Emergencia #${idx + 1} incompleto`);
            }
        });
    }

    if (step === 3) {
        if (!formData.education_level) errors.push("Nivel Académico");
        if (!formData.education_status) errors.push("Estado Académico");
        
        const levelsRequiringDetails = ['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Colegiado'];
        if (levelsRequiringDetails.includes(formData.education_level)) {
            if (!formData.institution) errors.push("Institución Educativa / Colegio");
            if (!formData.grad_date) errors.push("Fecha de Egreso / Grado");
        }

        if (!formData.shirt_size) errors.push("Talla de Polo");
        if (!formData.pants_size) errors.push("Talla de Pantalón");
        if (!formData.shoe_size) errors.push("Talla de Calzado");
    }

    if (step === 4) {
        formData.work_experience.forEach((exp, idx) => {
            if (!exp.company) errors.push(`Experiencia #${idx + 1}: Falta Empresa`);
            if (!exp.position) errors.push(`Experiencia #${idx + 1}: Falta Cargo`);
            if (!exp.start) errors.push(`Experiencia #${idx + 1}: Falta Inicio`);
            if (!exp.end) errors.push(`Experiencia #${idx + 1}: Falta Fin`);
            if (!exp.boss) errors.push(`Experiencia #${idx + 1}: Falta Jefe Inmediato`);
        });
    }

    if (step === 5) {
        if (!formData.bank_name) errors.push("Banco Principal");
        if (!formData.bbva_account) errors.push("Número de Cuenta");
        if (!formData.interbank_account) errors.push("CCI Interbancario");
    }

    return errors;
  };

  const handleNext = () => {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
          setNotification({
              isOpen: true,
              type: 'error',
              title: 'Campos Faltantes',
              message: 'Por favor complete los siguientes campos obligatorios:\n\n' + errors.map(e => `• ${e}`).join('\n')
          });
          return;
      }
      nextStep();
  };

  const handleFinalSubmit = () => {
      const errors = validateStep(currentStep);
      if (errors.length > 0) {
          setNotification({
              isOpen: true,
              type: 'error',
              title: 'Campos Faltantes',
              message: 'Por favor complete los siguientes campos obligatorios:\n\n' + errors.map(e => `• ${e}`).join('\n')
          });
          return;
      }
      handleSubmit(false);
  };

  // --- SUBMIT ---
  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      if (!currentUser?.id) { handleLogoutForce(); return; }

      const dataToSave = { ...formData, skipped: skip, updated_at: new Date().toISOString() };
      
      const updatePayload = {
        onboarding_completed: true, 
        onboarding_data: dataToSave,
        birth_date: skip ? null : (formData.birth_date || null),
        phone: skip ? null : (formData.phone || null),
        district: skip ? null : (formData.district || null),
        pension_system: skip ? null : (formData.afp_status || null)
      };

      const { error } = await supabase.from('employees').update(updatePayload).eq('id', currentUser.id);
      if (error) throw error;

      const storedSession = localStorage.getItem('lyk_session');
      if (storedSession) {
        try {
            const sessionData = JSON.parse(storedSession);
            if (sessionData.user) {
              sessionData.user.onboarding_completed = true;
              sessionData.user.onboarding_data = dataToSave;
              if (!skip) {
                  sessionData.user.birth_date = formData.birth_date;
                  sessionData.user.phone = formData.phone;
              }
            }
            localStorage.setItem('lyk_session', JSON.stringify(sessionData));
        } catch (e) { /**/ }
      }
      window.location.href = '/dashboard';
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
      setLoading(false);
    }
  };

  const nextStep = () => { if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  const renderContent = () => {
    const props = { 
        formData, handleChange, handleSelection, 
        addItem, removeItem, 
        addFunctionToJob, removeFunctionFromJob, changeFunctionInJob 
    };
    switch (currentStep) {
      case 1: return <StepPersonal {...props} />;
      case 2: return <StepFamily {...props} />;
      case 3: return <StepEducation {...props} />;
      case 4: return <StepExperience {...props} />;
      case 5: return <StepBank {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-800">
      <div className="fixed inset-0 pointer-events-none" style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 51, 102, 0.15), transparent 40%)` }} />
      
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-6xl h-[90vh] md:h-[800px] bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col md:flex-row overflow-hidden">
        
        <button 
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="absolute top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/80 border border-slate-200 rounded-full shadow-sm text-xs font-bold text-slate-500 hover:text-[#003366] hover:border-[#003366] transition-all"
            title="Podrás completar tu registro después desde el Dashboard"
        >
            Omitir Registro <SkipForward size={14} />
        </button>

        <div className="w-full md:w-80 bg-white/60 border-r border-white/50 p-8 flex flex-col">
          <div className="mb-8">
             <div className="h-20 mb-6 flex items-center justify-center bg-white/50 px-4 py-2 rounded-xl border border-white shadow-sm overflow-hidden">
                {!imageError ? (
                  <img src={logoLyk} alt="L&K" className="h-full object-contain" onError={() => setImageError(true)} />
                ) : (
                  <div className="flex items-center gap-2 text-[#003366] font-black text-xl"><Building size={24}/> L&K</div>
                )}
             </div>
             <div className="mb-2">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bienvenido/a</p>
                <h2 className="text-lg font-black text-[#003366] leading-tight break-words" title={currentUser?.full_name}>
                  {currentUser?.full_name || 'Usuario'}
                </h2>
             </div>
             <p className="text-sm text-slate-500 font-medium">Completa tu legajo personal.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
             {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                return (
                   <div key={step.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isActive ? 'bg-white shadow-md translate-x-2' : 'hover:bg-white/40'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-[#003366] text-white' : 'bg-slate-200 text-slate-400'}`}>
                         {step.id < currentStep ? <CheckCircle2 size={20}/> : React.createElement(step.icon, { size: 18 })}
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

        <div className="flex-1 flex flex-col relative bg-white/40">
           <div className="flex-1 overflow-y-auto p-6 md:p-12 relative scroll-smooth pt-16 md:pt-12">
              <AnimatePresence mode="wait">
                 <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto pb-24">
                    <div className="mb-8">
                       <h2 className="text-3xl font-bold text-[#003366] mb-2">{STEPS[currentStep-1].title}</h2>
                       <p className="text-slate-500">{STEPS[currentStep-1].subtitle}</p>
                    </div>
                    {renderContent()}
                 </motion.div>
              </AnimatePresence>
           </div>

           <div className="p-6 bg-white/80 backdrop-blur-md border-t border-white/60 flex justify-between items-center z-30">
              <button onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 ${currentStep === 1 ? 'opacity-0' : ''}`}><ArrowLeft size={20}/> Atrás</button>
              <div className="flex items-center gap-4">
                 {currentStep < STEPS.length ? (
                    <button onClick={handleNext} className="group flex items-center gap-3 px-8 py-3 bg-[#003366] text-white rounded-xl font-bold shadow-xl hover:scale-[1.02] transition-all">Siguiente <ArrowRight size={18}/></button>
                 ) : (
                    <button onClick={handleFinalSubmit} disabled={loading} className="group flex items-center gap-3 px-8 py-3 bg-[#f0c419] text-[#003366] rounded-xl font-bold shadow-xl hover:scale-[1.02] transition-all">{loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Finalizar</>}</button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>

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
    </div>
  );
};

/* --- PASO 1: PERSONAL --- */
const StepPersonal = ({ formData, handleChange }) => (
   <div className="space-y-8">
      {/* SECCIÓN 1: NACIMIENTO Y EDAD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <div className="md:col-span-1">
            <FloatingInput label="F. Nacimiento" name="birth_date" type="date" val={formData.birth_date} onChange={handleChange} icon={Calendar} />
         </div>
         <div className="md:col-span-1">
            <FloatingInput label="Edad" name="age" type="text" val={formData.age} readOnly={true} className="bg-slate-100 cursor-not-allowed" />
         </div>
         <div className="md:col-span-2">
            <FloatingInput label="Nacionalidad" name="nationality" val={formData.nationality} onChange={handleChange} />
         </div>
      </div>

      {/* SECCIÓN 2: SEXO Y PENSION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Select label="Sexo" name="gender" val={formData.gender} onChange={handleChange} options={['Masculino', 'Femenino']} />
         <Select label="Sistema de Pensión" name="afp_status" val={formData.afp_status} onChange={handleChange} options={PENSION_SYSTEMS} />
      </div>
      
      {/* SECCIÓN DOMICILIO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
         <h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b pb-2">Ubicación Actual (Domicilio)</h4>
         <div className="mb-6"><FloatingInput label="Dirección / Calle / Av." name="address" val={formData.address} onChange={handleChange} icon={Home} /></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FloatingInput label="Departamento" name="department" val={formData.department} onChange={handleChange} />
            <FloatingInput label="Provincia" name="province" val={formData.province} onChange={handleChange} />
            <FloatingInput label="Distrito" name="district" val={formData.district} onChange={handleChange} />
         </div>
      </div>

      {/* SECCIÓN CONTACTO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
         <h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b pb-2">Contacto</h4>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <FloatingInput label="Celular Principal" name="phone" type="tel" val={formData.phone} onChange={handleChange} icon={Phone} />
             <FloatingInput label="Email Personal" name="personal_email" type="email" val={formData.personal_email} onChange={handleChange} icon={Mail} />
             <FloatingInput label="Celular Secundario" name="alt_phone" type="tel" val={formData.alt_phone} onChange={handleChange} icon={Phone} />
         </div>
      </div>

      {/* SECCIÓN FAMILIA */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
         <h4 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b pb-2">Familia</h4>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select label="Estado Civil" name="civil_status" val={formData.civil_status} onChange={handleChange} options={['Soltero/a', 'Casado/a', 'Conviviente', 'Viudo/a', 'Divorciado/a']} />
            {(formData.civil_status === 'Casado/a' || formData.civil_status === 'Conviviente') && (
                <FloatingInput label="Nombre Cónyuge" name="spouse_name" val={formData.spouse_name} onChange={handleChange} />
            )}
            <FloatingInput label="Nombre Padre" name="father_name" val={formData.father_name} onChange={handleChange} />
            <FloatingInput label="Nombre Madre" name="mother_name" val={formData.mother_name} onChange={handleChange} />
         </div>
      </div>
   </div>
);

/* --- PASO 2: FAMILIA Y EMERGENCIAS --- */
const StepFamily = ({ formData, handleChange, handleSelection, addItem, removeItem }) => (
   <div className="space-y-8">
      <SectionBox title="Hijos / Dependientes">
         <div className="flex gap-4 mb-4">
            <SelectionCard selected={formData.has_dependents === 'SI'} onClick={() => handleSelection('has_dependents', 'SI')} label="Sí" />
            <SelectionCard selected={formData.has_dependents === 'NO'} onClick={() => { handleSelection('has_dependents', 'NO'); setFormData(prev => ({...prev, children: []})) }} label="No" />
         </div>
         {formData.has_dependents === 'SI' && (
            <div className="space-y-3">
               {formData.children.map((child, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                     <div className="flex-1"><FloatingInput label="Nombres y Apellidos" name="name" val={child.name} onChange={(e) => handleChange(e, 'children', idx, 'name')} /></div>
                     <div className="w-24"><FloatingInput label="Edad" name="age" type="number" val={child.age} onChange={(e) => handleChange(e, 'children', idx, 'age')} /></div>
                     <button onClick={() => removeItem('children', idx)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
               ))}
               <button onClick={() => addItem('children', { name: '', age: '' })} className="flex items-center gap-2 text-sm font-bold text-[#003366] hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                  <Plus size={16}/> Agregar Hijo
               </button>
            </div>
         )}
      </SectionBox>

      <SectionBox title="Contactos de Emergencia">
         <div className="space-y-3">
            {formData.emergency_contacts.map((contact, idx) => (
               <div key={idx} className="bg-red-50 p-4 rounded-xl border border-red-100 relative group">
                  <button onClick={() => removeItem('emergency_contacts', idx)} className="absolute top-2 right-2 text-red-300 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="md:col-span-1"><FloatingInput label="Nombre" name="name" val={contact.name} onChange={(e) => handleChange(e, 'emergency_contacts', idx, 'name')} /></div>
                     <div className="md:col-span-1"><FloatingInput label="Parentesco" name="relationship" val={contact.relationship} onChange={(e) => handleChange(e, 'emergency_contacts', idx, 'relationship')} /></div>
                     <div className="md:col-span-1"><FloatingInput label="Teléfono" name="phone" type="tel" val={contact.phone} onChange={(e) => handleChange(e, 'emergency_contacts', idx, 'phone')} /></div>
                  </div>
               </div>
            ))}
            <button onClick={() => addItem('emergency_contacts', { name: '', relationship: '', phone: '' })} className="flex items-center gap-2 text-sm font-bold text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-red-100">
               <Plus size={16}/> Agregar Contacto Emergencia
            </button>
         </div>
      </SectionBox>
   </div>
);

/* --- PASO 3: EDUCACIÓN --- */
const StepEducation = ({ formData, handleChange, addItem, removeItem }) => {
   const levelsRequiringDetails = ['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Colegiado'];
   const showDetails = levelsRequiringDetails.includes(formData.education_level);

   const institutionLabel = formData.education_level === 'Colegiado' ? 'Colegio Profesional (CIP, CAP, etc.)' : 'Institución Educativa / Colegio';
   const dateLabel = formData.education_level === 'Colegiado' ? 'Fecha de Colegiatura' : 'Fecha de Egreso / Grado';

   return (
      <div className="space-y-8">
         <SectionBox title="Nivel Académico">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <Select 
                  label="Nivel Alcanzado" 
                  name="education_level" 
                  val={formData.education_level} 
                  onChange={handleChange} 
                  options={['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado', 'Colegiado']} 
               />
               <Select 
                  label="Estado" 
                  name="education_status" 
                  val={formData.education_status} 
                  onChange={handleChange} 
                  options={['Completo', 'En Curso']} 
               />
            </div>

            <AnimatePresence>
               {showDetails && (
                  <motion.div 
                     initial={{ opacity: 0, height: 0 }} 
                     animate={{ opacity: 1, height: 'auto' }} 
                     exit={{ opacity: 0, height: 0 }} 
                     className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100"
                  >
                     <FloatingInput 
                        label={institutionLabel} 
                        name="institution" 
                        val={formData.institution} 
                        onChange={handleChange} 
                        icon={Building} 
                        placeholder="Ej: Colegio San José, UTP..."
                     />
                     <FloatingInput 
                        label={dateLabel} 
                        name="grad_date" 
                        type="date" 
                        val={formData.grad_date} 
                        onChange={handleChange} 
                     />
                  </motion.div>
               )}
            </AnimatePresence>
         </SectionBox>

         <SectionBox title="Cursos / Especializaciones">
            <div className="space-y-3">
               {formData.additional_courses.map((course, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                     <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{idx+1}</div>
                     <div className="flex-1"><FloatingInput label="Nombre del Curso" name="name" val={course.name} onChange={(e)=>handleChange(e, 'additional_courses', idx, 'name')} /></div>
                     <div className="w-40"><FloatingInput type="date" name="date" val={course.date} onChange={(e)=>handleChange(e, 'additional_courses', idx, 'date')} /></div>
                     <button onClick={() => removeItem('additional_courses', idx)} className="p-3 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={18}/></button>
                  </div>
               ))}
               <button onClick={() => addItem('additional_courses', { name: '', date: '' })} className="flex items-center gap-2 text-sm font-bold text-[#003366] hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                  <Plus size={16}/> Agregar Curso
               </button>
            </div>
         </SectionBox>

         <div className="grid grid-cols-3 gap-6">
            <Select label="Talla Polo" name="shirt_size" val={formData.shirt_size} onChange={handleChange} options={SHIRT_SIZES} />
            <Select label="Talla Pantalón" name="pants_size" val={formData.pants_size} onChange={handleChange} options={PANT_SIZES} />
            <Select label="Calzado" name="shoe_size" val={formData.shoe_size} onChange={handleChange} options={SHOE_SIZES} />
         </div>
      </div>
   );
};

/* --- PASO 4: EXPERIENCIA --- */
const StepExperience = ({ formData, handleChange, addItem, removeItem, addFunctionToJob, removeFunctionFromJob, changeFunctionInJob }) => (
   <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 text-[#003366]">
         <div className="flex items-center gap-3">
            <Briefcase size={24} />
            <div><h4 className="font-bold">Historial Laboral</h4><p className="text-xs">Registre sus últimas experiencias relevantes</p></div>
         </div>
         <button onClick={() => addItem('work_experience', { company: '', position: '', start: '', end: '', boss: '', functions: [''] })} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all">
            <Plus size={14}/> Nueva Experiencia
         </button>
      </div>

      {formData.work_experience.map((exp, idx) => (
         <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group hover:border-blue-200 transition-colors">
            <button onClick={() => removeItem('work_experience', idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
            <div className="absolute -left-3 top-6 w-6 h-6 bg-[#003366] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">{idx + 1}</div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 pl-4">
               <FloatingInput label="Empresa" name="company" val={exp.company} onChange={(e)=>handleChange(e, 'work_experience', idx, 'company')} />
               <FloatingInput label="Cargo" name="position" val={exp.position} onChange={(e)=>handleChange(e, 'work_experience', idx, 'position')} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6 pl-4">
               <FloatingInput label="Inicio" name="start" type="date" val={exp.start} onChange={(e)=>handleChange(e, 'work_experience', idx, 'start')} />
               <FloatingInput label="Fin" name="end" type="date" val={exp.end} onChange={(e)=>handleChange(e, 'work_experience', idx, 'end')} />
               <FloatingInput label="Jefe Inmediato" name="boss" val={exp.boss} onChange={(e)=>handleChange(e, 'work_experience', idx, 'boss')} />
            </div>

            <div className="pl-4 border-t border-slate-50 pt-4">
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><ListPlus size={14}/> Funciones Realizadas</label>
                <div className="space-y-2">
                    {(exp.functions || []).map((func, fIdx) => (
                        <div key={fIdx} className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-200 mt-4 shrink-0"></div>
                            <input 
                                className="flex-1 bg-slate-50 border-b border-transparent hover:border-blue-100 focus:border-blue-300 outline-none py-2 px-2 text-sm text-slate-700 transition-colors" 
                                placeholder="Describa una función..."
                                value={func}
                                onChange={(e) => changeFunctionInJob(idx, fIdx, e.target.value)}
                            />
                            <button onClick={() => removeFunctionFromJob(idx, fIdx)} className="text-slate-300 hover:text-red-400 px-2"><XIcon size={14}/></button>
                        </div>
                    ))}
                    <button onClick={() => addFunctionToJob(idx)} className="text-xs font-bold text-blue-500 hover:text-blue-700 mt-2 flex items-center gap-1">
                        <Plus size={12}/> Agregar Función
                    </button>
                </div>
            </div>
         </div>
      ))}
      {formData.work_experience.length === 0 && (
          <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              No hay experiencias registradas.
          </div>
      )}
   </div>
);

const StepBank = ({ formData, handleChange }) => (
   <div className="flex flex-col items-center justify-center py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-lg shadow-emerald-100"><CreditCard size={36} /></div>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">Cuentas de Haberes</h3>
      <p className="text-slate-500 text-center max-w-md mb-10">Seleccione su banco e ingrese sus cuentas.</p>
      
      <div className="w-full max-w-lg space-y-6">
         <Select label="Banco Principal" name="bank_name" val={formData.bank_name} onChange={handleChange} options={BANKS_PERU} />
         <div className="relative group">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#004481] rounded-l-xl"></div>
            <FloatingInput label="Cuenta (Mismo Banco)" name="bbva_account" val={formData.bbva_account} onChange={handleChange} placeholder="Nro de cuenta..." />
         </div>
         <div className="relative group">
            <div className="absolute inset-y-0 left-0 w-1.5 bg-[#009c3b] rounded-l-xl"></div>
            <FloatingInput label="CCI Interbancario" name="interbank_account" val={formData.interbank_account} onChange={handleChange} placeholder="002-..." />
         </div>
         <div className="pt-6">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Observaciones (Opcional)</label>
            <textarea name="bank_observations" value={formData.bank_observations} onChange={handleChange} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none shadow-inner" rows={3} placeholder="Ej: Solicito apertura..." />
         </div>
      </div>
   </div>
);

// Auxiliares
const XIcon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
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
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Menu size={16} /></div>
   </div>
);
const SelectionCard = ({ selected, onClick, label }) => (
   <button onClick={onClick} className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 font-bold text-sm ${selected ? 'border-[#003366] bg-[#003366] text-white' : 'border-slate-100 bg-white text-slate-500'}`}>{selected && <CheckCircle2 size={16} className="text-[#f0c419]"/>}{label}</button>
);

export default StaffOnboardingPage;