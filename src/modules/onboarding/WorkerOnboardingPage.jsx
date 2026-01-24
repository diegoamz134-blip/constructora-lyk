import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, LogOut, Clock, ChevronRight, ChevronLeft, 
  SkipForward, CheckCircle, AlertCircle, User, MapPin, 
  Briefcase, Users, Heart, CreditCard, Trash2, GraduationCap, Plus 
} from 'lucide-react';
import Swal from 'sweetalert2';

const steps = [
  { id: 1, title: 'Datos Personales', icon: <User size={20}/> },
  { id: 2, title: 'Ubicación y Contacto', icon: <MapPin size={20}/> },
  { id: 3, title: 'Laboral y Tallas', icon: <Briefcase size={20}/> },
  { id: 4, title: 'Formación y Exp.', icon: <GraduationCap size={20}/> }, // NUEVO PASO
  { id: 5, title: 'Hijos', icon: <Users size={20}/> },
  { id: 6, title: 'Familiares L&K', icon: <Heart size={20}/> },
  { id: 7, title: 'Emergencia y Pagos', icon: <CreditCard size={20}/> },
];

const WorkerOnboardingPage = () => {
  const { currentUser: user, logout } = useUnifiedAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(20 * 60);

  if (!user) {
    return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
       </div>
    );
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTimeOut = () => {
    Swal.fire({
      icon: 'error',
      title: 'Tiempo Agotado',
      text: 'La sesión se cerró por seguridad.',
      confirmButtonColor: '#003366'
    }).then(() => {
      logout();
      navigate('/login');
    });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [formData, setFormData] = useState({
    // --- DATOS BÁSICOS ---
    birth_date: '',
    email: user?.email || '',
    phone: '',
    has_children: false,
    bank_name: 'BCP',
    bank_account: '',
    cci: '',
    pension_system: 'ONP',
    nationality: 'Peruana',
    gender: 'Masculino',
    marital_status: 'Soltero',
    spouse_name: '',
    father_name: '',
    mother_name: '',
    address: '',
    district: '',
    province: '',
    department: '',
    secondary_phone: '',
    secondary_email: '', // Correo adicional
    
    // --- TALLAS ---
    shirt_size: '',
    pant_size: '',
    shoe_size: '',

    // --- FORMACIÓN (NUEVO) ---
    education_level: '', // Secundaria, Técnico, etc.
    education_status: '', // Completo/Incompleto
    education_year: '',
    education_institution: '',
    courses_list: [], // [{ name, date }]

    // --- EXPERIENCIA (NUEVO) ---
    work_experience: [], // [{ company, position, rubro, start, end, boss_name, boss_phone, functions }]

    // --- ARRAYS ---
    children_list: [],
    emergency_contacts: [{ name: '', phone_fixed: '', phone_cell: '' }],
    family_in_company: [],
    
    requires_change_or_first_job: '',
    observations: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- HELPERS ARRAY ---
  const handleAddChild = () => setFormData(p => ({ ...p, children_list: [...p.children_list, { name: '', age: '' }] }));
  const handleChildChange = (idx, field, val) => {
      const copy = [...formData.children_list]; copy[idx][field] = val; setFormData(p => ({ ...p, children_list: copy }));
  };
  const handleRemoveChild = (idx) => {
      const copy = [...formData.children_list]; copy.splice(idx, 1); setFormData(p => ({ ...p, children_list: copy }));
  };

  const handleAddFamily = () => setFormData(p => ({ ...p, family_in_company: [...p.family_in_company, { name: '', position: '' }] }));
  const handleFamilyChange = (idx, field, val) => {
      const copy = [...formData.family_in_company]; copy[idx][field] = val; setFormData(p => ({ ...p, family_in_company: copy }));
  };
  const handleRemoveFamily = (idx) => {
      const copy = [...formData.family_in_company]; copy.splice(idx, 1); setFormData(p => ({ ...p, family_in_company: copy }));
  };

  const handleEmergChange = (idx, field, val) => {
      const copy = [...formData.emergency_contacts]; copy[idx][field] = val; setFormData(p => ({ ...p, emergency_contacts: copy }));
  };

  // --- NUEVOS HELPERS: CURSOS Y TRABAJO ---
  const handleAddCourse = () => setFormData(p => ({ ...p, courses_list: [...p.courses_list, { name: '', date: '' }] }));
  const handleCourseChange = (idx, field, val) => {
      const copy = [...formData.courses_list]; copy[idx][field] = val; setFormData(p => ({ ...p, courses_list: copy }));
  };
  const handleRemoveCourse = (idx) => {
      const copy = [...formData.courses_list]; copy.splice(idx, 1); setFormData(p => ({ ...p, courses_list: copy }));
  };

  const handleAddJob = () => setFormData(p => ({ ...p, work_experience: [...p.work_experience, { company: '', position: '', rubro: '', start: '', end: '', boss_name: '', boss_phone: '', functions: '' }] }));
  const handleJobChange = (idx, field, val) => {
      const copy = [...formData.work_experience]; copy[idx][field] = val; setFormData(p => ({ ...p, work_experience: copy }));
  };
  const handleRemoveJob = (idx) => {
      const copy = [...formData.work_experience]; copy.splice(idx, 1); setFormData(p => ({ ...p, work_experience: copy }));
  };

  // --- VALIDACIÓN ---
  const validateStep = (step) => {
    const errors = [];
    if (step === 1) {
        if (!formData.birth_date) errors.push("Fecha de Nacimiento");
        if (!formData.nationality) errors.push("Nacionalidad");
    }
    if (step === 2) {
        if (!formData.address) errors.push("Dirección");
        if (!formData.district) errors.push("Distrito");
        if (!formData.phone) errors.push("Celular Principal");
    }
    if (step === 3) {
        if (!formData.pension_system) errors.push("Régimen Pensionario");
        if (!formData.shirt_size) errors.push("Talla de Camisa");
        if (!formData.pant_size) errors.push("Talla de Pantalón");
        if (!formData.shoe_size) errors.push("Talla de Zapatos");
    }
    // Paso 4: Formación (Opcional pero recomendado llenar algo)
    
    if (step === 7) { // Ahora es paso 7
        if (!formData.emergency_contacts[0].name) errors.push("Nombre de contacto de emergencia");
        if (!formData.emergency_contacts[0].phone_cell) errors.push("Celular de emergencia");
        if (!formData.bank_account) errors.push("Número de cuenta");
        if (!formData.cci) errors.push("CCI");
    }

    if (errors.length > 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Faltan datos',
            html: `Por favor completa los siguientes campos obligatorios:<br/><ul class="text-left mt-2 text-sm text-red-600 list-disc pl-5">${errors.map(e => `<li>${e}</li>`).join('')}</ul>`,
            confirmButtonColor: '#003366'
        });
        return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
        setCurrentStep(prev => Math.min(prev + 1, 7));
        window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const updateLocalSession = () => {
    try {
        const storedSession = localStorage.getItem('lyk_session');
        if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            if (sessionData.user) {
                sessionData.user.onboarding_completed = true;
                localStorage.setItem('lyk_session', JSON.stringify(sessionData));
            }
        }
    } catch (e) {
        console.error("Error actualizando sesión local:", e);
    }
  };

  const handleSubmit = async (e, skipped = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const detailsPayload = {
        nationality: formData.nationality,
        gender: formData.gender,
        marital_status: formData.marital_status,
        spouse_name: formData.spouse_name,
        parents: { father: formData.father_name, mother: formData.mother_name },
        address: { street: formData.address, district: formData.district, province: formData.province, department: formData.department },
        contact_extra: { secondary_phone: formData.secondary_phone, secondary_email: formData.secondary_email },
        sizes: { shirt: formData.shirt_size, pant: formData.pant_size, shoe: formData.shoe_size },
        
        // --- NUEVOS DATOS GUARDADOS EN JSON ---
        education: {
            level: formData.education_level,
            status: formData.education_status,
            year: formData.education_year,
            institution: formData.education_institution,
            courses: formData.courses_list
        },
        work_experience: formData.work_experience,
        // --------------------------------------

        children_list: formData.children_list,
        emergency_contacts: formData.emergency_contacts,
        family_in_company: formData.family_in_company,
        job_details: { requires_change_first_job: formData.requires_change_or_first_job, observations: formData.observations },
        skipped_onboarding: skipped
      };

      const { error } = await supabase
        .from('workers')
        .update({
          birth_date: formData.birth_date || null,
          email: formData.email,
          phone: formData.phone,
          has_children: formData.children_list.length > 0,
          children_count: formData.children_list.length,
          bank_name: formData.bank_name,
          bank_account: formData.bank_account,
          cci: formData.cci,
          pension_system: formData.pension_system,
          details: detailsPayload,
          onboarding_completed: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      updateLocalSession();

      Swal.fire({
        icon: skipped ? 'info' : 'success',
        title: skipped ? 'Registro Omitido' : '¡Registro Completado!',
        text: skipped ? 'Podrás completar tus datos más tarde desde tu perfil.' : 'Bienvenido al panel de obreros.',
        confirmButtonColor: '#003366',
        allowOutsideClick: false
      }).then(() => {
        window.location.href = '/worker/dashboard';
      });

    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la información.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Podrás ingresar ahora, pero deberás completar tu ficha de datos personales más adelante.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#003366',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, omitir por ahora',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            handleSubmit(null, true);
        }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 md:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-2 z-40">
          <div className="mb-2 md:mb-0">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-[#003366] text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm">{currentStep}/7</span>
                Ficha de Datos
            </h1>
            <p className="text-xs text-slate-500 ml-10">Obreros / Construcción Civil</p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleSkip} className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-bold border border-transparent hover:border-slate-200 transition-all flex items-center gap-1">
                <SkipForward size={14}/> Omitir
             </button>
             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-800'}`}>
                <Clock size={16} />
                {formatTime(timeLeft)}
             </div>
          </div>
        </div>

        <div className="flex justify-between mb-6 px-2 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
            <div className="absolute top-1/2 left-0 h-1 bg-[#003366] -z-10 rounded-full transition-all duration-500" style={{ width: `${((currentStep - 1) / 6) * 100}%` }}></div>
            {steps.map((s) => (
                <div key={s.id} className={`flex flex-col items-center gap-1 transition-all duration-300 ${currentStep >= s.id ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 z-10 bg-white transition-all ${currentStep >= s.id ? 'border-[#003366] text-[#003366]' : 'border-slate-300 text-slate-300'}`}>
                        {currentStep > s.id ? <CheckCircle size={16}/> : s.icon}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 hidden md:block bg-white px-1 whitespace-nowrap">{s.title}</span>
                </div>
            ))}
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="relative min-h-[400px]">
           <AnimatePresence mode='wait'>
             <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
             >
                <h2 className="text-xl font-bold text-[#003366] mb-6 border-b pb-3 flex items-center gap-2">
                    {steps[currentStep-1].icon}
                    {steps[currentStep-1].title}
                </h2>

                {currentStep === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Fecha de Nacimiento *</label><input required type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Nacionalidad *</label><input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Sexo</label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"><option>Masculino</option><option>Femenino</option></select></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Estado Civil</label><select name="marital_status" value={formData.marital_status} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"><option>Soltero</option><option>Casado</option><option>Conviviente</option><option>Divorciado</option><option>Viudo</option></select></div>
                         <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Cónyuge</label><input type="text" name="spouse_name" value={formData.spouse_name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Nombre del Papá</label><input type="text" name="father_name" value={formData.father_name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Nombre de la Mamá</label><input type="text" name="mother_name" value={formData.mother_name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                         <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Dirección Actual *</label><input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" placeholder="Av. Calle, Nro, Urb..." /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Distrito *</label><input required type="text" name="district" value={formData.district} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Provincia</label><input type="text" name="province" value={formData.province} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Departamento</label><input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl uppercase" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Celular Principal *</label><input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="999 999 999" /></div>
                         {/* CORREO ADICIONAL AGREGADO AQUI */}
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Celular Adicional</label><input type="tel" name="secondary_phone" value={formData.secondary_phone} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Correo Personal</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                         <div><label className="block text-xs font-bold text-slate-600 mb-1">Correo Adicional</label><input type="email" name="secondary_email" value={formData.secondary_email} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" placeholder="Opcional" /></div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Régimen Pensionario *</label><select name="pension_system" value={formData.pension_system} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"><option value="ONP">ONP</option><option value="AFP Integra">AFP Integra</option><option value="AFP Prima">AFP Prima</option><option value="AFP Profuturo">AFP Profuturo</option><option value="AFP Habitat">AFP Habitat</option><option value="Sin Régimen">Sin Régimen</option></select></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">¿Cambio de régimen o 1° empleo?</label><input type="text" name="requires_change_or_first_job" value={formData.requires_change_or_first_job} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">Talla Camisa/Polo *</label><select name="shirt_size" value={formData.shirt_size} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"><option value="">Seleccione</option><option value="S">S</option><option value="M">M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option></select></div>
                        <div><label className="block text-xs font-bold text-slate-600 mb-1">Talla Pantalón *</label><input type="text" name="pant_size" placeholder="Ej. 30, 32" value={formData.pant_size} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-1">Talla de Calzado (Zapatos) <span className="text-red-500">*</span></label><input type="text" name="shoe_size" placeholder="Ej. 40, 42" value={formData.shoe_size} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" /></div>
                    </div>
                )}

                {/* --- NUEVO PASO 4: FORMACIÓN Y EXPERIENCIA --- */}
                {currentStep === 4 && (
                    <div className="space-y-8 animate-fadeIn">
                        {/* ESTUDIOS */}
                        <div>
                            <h3 className="text-sm font-bold text-[#003366] border-b pb-2 mb-4">Nivel de Estudios Logrados</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nivel</label>
                                    <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Seleccione</option>
                                        <option value="Secundaria">Secundaria</option>
                                        <option value="Técnico Superior">Técnico Superior</option>
                                        <option value="Universitario">Universitario</option>
                                        <option value="Bachiller">Bachiller</option>
                                        <option value="Titulado">Titulado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
                                    <select name="education_status" value={formData.education_status} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                                        <option value="">Seleccione</option>
                                        <option value="Completo">Completo</option>
                                        <option value="Incompleto">Incompleto</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Año de Egreso</label>
                                    <input type="number" name="education_year" value={formData.education_year} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="Ej. 2015" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Institución Formativa</label>
                                    <input type="text" name="education_institution" value={formData.education_institution} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase" />
                                </div>
                            </div>

                            {/* CURSOS */}
                            <div className="mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500">Cursos Adicionales</label>
                                    <button type="button" onClick={handleAddCourse} className="text-xs text-blue-600 flex items-center gap-1 font-bold hover:bg-blue-50 px-2 py-1 rounded"><Plus size={14}/> Agregar Curso</button>
                                </div>
                                {formData.courses_list.map((course, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <input type="text" placeholder="Nombre del curso" value={course.name} onChange={(e) => handleCourseChange(idx, 'name', e.target.value)} className="flex-1 p-2 bg-slate-50 border rounded-lg text-sm uppercase" />
                                        <input type="date" value={course.date} onChange={(e) => handleCourseChange(idx, 'date', e.target.value)} className="w-32 p-2 bg-slate-50 border rounded-lg text-sm" />
                                        <button type="button" onClick={() => handleRemoveCourse(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* EXPERIENCIA LABORAL */}
                        <div>
                            <div className="flex justify-between items-center border-b pb-2 mb-4">
                                <h3 className="text-sm font-bold text-[#003366]">Experiencia Laboral (3 últimas)</h3>
                                <button type="button" onClick={handleAddJob} className="text-xs bg-[#003366] text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold shadow-sm hover:bg-blue-900"><Plus size={14}/> Agregar Trabajo</button>
                            </div>
                            
                            {formData.work_experience.length === 0 ? (
                                <p className="text-center text-slate-400 text-xs py-4 bg-slate-50 rounded-xl border border-dashed">No ha registrado experiencia laboral.</p>
                            ) : (
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                                    {formData.work_experience.map((job, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                                            <button type="button" onClick={() => handleRemoveJob(idx)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <input type="text" placeholder="Empresa" value={job.company} onChange={(e) => handleJobChange(idx, 'company', e.target.value)} className="p-2 bg-white border rounded text-sm uppercase font-bold" />
                                                <input type="text" placeholder="Puesto/Cargo" value={job.position} onChange={(e) => handleJobChange(idx, 'position', e.target.value)} className="p-2 bg-white border rounded text-sm uppercase" />
                                                <input type="text" placeholder="Rubro" value={job.rubro} onChange={(e) => handleJobChange(idx, 'rubro', e.target.value)} className="p-2 bg-white border rounded text-sm uppercase" />
                                                <div className="flex gap-2">
                                                    <input type="date" placeholder="Inicio" value={job.start} onChange={(e) => handleJobChange(idx, 'start', e.target.value)} className="w-1/2 p-2 bg-white border rounded text-xs" />
                                                    <input type="date" placeholder="Fin" value={job.end} onChange={(e) => handleJobChange(idx, 'end', e.target.value)} className="w-1/2 p-2 bg-white border rounded text-xs" />
                                                </div>
                                                <input type="text" placeholder="Jefe Inmediato" value={job.boss_name} onChange={(e) => handleJobChange(idx, 'boss_name', e.target.value)} className="p-2 bg-white border rounded text-sm uppercase" />
                                                <input type="text" placeholder="Tel. Jefe" value={job.boss_phone} onChange={(e) => handleJobChange(idx, 'boss_phone', e.target.value)} className="p-2 bg-white border rounded text-sm" />
                                            </div>
                                            <textarea placeholder="Descripción de funciones principales..." value={job.functions} onChange={(e) => handleJobChange(idx, 'functions', e.target.value)} rows="2" className="w-full p-2 bg-white border rounded text-sm"></textarea>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {currentStep === 5 && (
                    <div>
                        <div className="flex justify-between items-center mb-4"><p className="text-sm text-slate-500">Agregue sus hijos menores o dependientes.</p><button type="button" onClick={handleAddChild} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"><div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center"><span className="text-lg leading-none mb-0.5">+</span></div> Agregar</button></div>
                        {formData.children_list.length === 0 ? <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center"><Users className="mx-auto text-slate-300 mb-2" size={32}/><p className="text-slate-400 text-sm">No ha registrado hijos.</p></div> : <div className="space-y-3">{formData.children_list.map((child, idx) => (<div key={idx} className="flex items-end gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-fadeIn"><div className="flex-1"><label className="block text-[10px] font-bold text-slate-400 uppercase">Nombre</label><input type="text" value={child.name} onChange={(e) => handleChildChange(idx, 'name', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg uppercase text-sm" placeholder="Nombre del hijo" /></div><div className="w-24"><label className="block text-[10px] font-bold text-slate-400 uppercase">Edad</label><input type="number" value={child.age} onChange={(e) => handleChildChange(idx, 'age', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" /></div><button type="button" onClick={() => handleRemoveChild(idx)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button></div>))}</div>}
                    </div>
                )}

                {currentStep === 6 && (
                    <div>
                        <div className="flex justify-between items-center mb-4"><p className="text-sm text-slate-500">Familiares en la empresa.</p><button type="button" onClick={handleAddFamily} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"><div className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center"><span className="text-lg leading-none mb-0.5">+</span></div> Agregar</button></div>
                        {formData.family_in_company.length === 0 ? <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center"><Heart className="mx-auto text-slate-300 mb-2" size={32}/><p className="text-slate-400 text-sm">No reporta familiares.</p></div> : <div className="space-y-3">{formData.family_in_company.map((fam, idx) => (<div key={idx} className="flex items-end gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 animate-fadeIn"><div className="flex-1"><label className="block text-[10px] font-bold text-slate-400 uppercase">Nombre</label><input type="text" value={fam.name} onChange={(e) => handleFamilyChange(idx, 'name', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg uppercase text-sm" /></div><div className="flex-1"><label className="block text-[10px] font-bold text-slate-400 uppercase">Cargo</label><input type="text" value={fam.position} onChange={(e) => handleFamilyChange(idx, 'position', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg uppercase text-sm" /></div><button type="button" onClick={() => handleRemoveFamily(idx)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button></div>))}</div>}
                    </div>
                )}

                {currentStep === 7 && (
                    <div className="space-y-6">
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                             <h3 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2"><AlertCircle size={16}/> Contacto de Emergencia (Obligatorio)</h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="md:col-span-3"><label className="block text-xs font-bold text-red-400">Nombre Completo <span className="text-red-600">*</span></label><input required type="text" value={formData.emergency_contacts[0].name} onChange={(e) => handleEmergChange(0, 'name', e.target.value)} className="w-full p-2 bg-white border border-red-200 rounded-lg uppercase" /></div>
                                <div><label className="block text-xs font-bold text-red-400">Celular <span className="text-red-600">*</span></label><input required type="tel" value={formData.emergency_contacts[0].phone_cell} onChange={(e) => handleEmergChange(0, 'phone_cell', e.target.value)} className="w-full p-2 bg-white border border-red-200 rounded-lg" /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-red-400">Tel. Fijo</label><input type="tel" value={formData.emergency_contacts[0].phone_fixed} onChange={(e) => handleEmergChange(0, 'phone_fixed', e.target.value)} className="w-full p-2 bg-white border border-red-200 rounded-lg" /></div>
                             </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h3 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2"><CreditCard size={16}/> Datos Bancarios</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold text-green-600">Banco</label><select name="bank_name" value={formData.bank_name} onChange={handleChange} className="w-full p-2 bg-white border border-green-200 rounded-lg outline-none"><option value="BCP">BCP (Banco de Crédito)</option><option value="Interbank">Interbank</option><option value="BBVA">BBVA</option><option value="Scotiabank">Scotiabank</option><option value="Banco de la Nación">Banco de la Nación</option></select></div>
                                <div><label className="block text-xs font-bold text-green-600">N° de Cuenta <span className="text-red-500">*</span></label><input required type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full p-2 bg-white border border-green-200 rounded-lg font-mono" /></div>
                                <div className="md:col-span-2"><label className="block text-xs font-bold text-green-600">CCI (Interbancaria) <span className="text-red-500">*</span></label><input required type="text" name="cci" value={formData.cci} onChange={handleChange} className="w-full p-2 bg-white border border-green-200 rounded-lg font-mono" placeholder="20 dígitos" /></div>
                                <div className="md:col-span-2"><textarea name="observations" value={formData.observations} onChange={handleChange} rows="2" className="w-full p-2 bg-white border border-green-200 rounded-lg text-sm" placeholder="Observaciones bancarias (opcional)..."></textarea></div>
                            </div>
                        </div>
                    </div>
                )}
             </motion.div>
           </AnimatePresence>
           
           <div className="mt-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-lg border border-slate-100 sticky bottom-4 z-40">
                {currentStep > 1 ? <button type="button" onClick={handlePrev} className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 flex items-center gap-2 border border-slate-200"><ChevronLeft size={20}/> Atrás</button> : <button type="button" onClick={logout} className="px-5 py-2.5 rounded-xl text-red-500 font-bold hover:bg-red-50 flex items-center gap-2 border border-transparent"><LogOut size={20}/> Salir</button>}
                {currentStep < 7 ? <button type="button" onClick={handleNext} className="px-6 py-2.5 rounded-xl bg-[#003366] text-white font-bold hover:bg-blue-900 shadow-lg flex items-center gap-2">Siguiente <ChevronRight size={20}/></button> : <button type="submit" disabled={loading} className="px-8 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg flex items-center gap-2">{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20} />} Finalizar</button>}
           </div>
        </form>
      </div>
    </div>
  );
};
export default WorkerOnboardingPage;