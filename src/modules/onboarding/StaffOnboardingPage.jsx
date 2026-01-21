import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';
import { 
  User, Heart, Briefcase, GraduationCap, 
  CreditCard, CheckCircle2, ArrowRight, ArrowLeft, Save,
  ShieldCheck, Home, Phone, Mail,
  Building, Menu, Sparkles, Clock, LogOut
} from 'lucide-react';

// LOGO
const LOGO_URL = "/logo-lk-full.png"; 

// CONFIGURACIÓN DEL TEMPORIZADOR
const TIMER_KEY = 'onboarding_timer_target';
const TIME_LIMIT_SECONDS = 250; 

// LISTA DE BANCOS
const BANKS_PERU = [
  'BCP (Banco de Crédito)', 'BBVA', 'Interbank', 'Scotiabank', 
  'Banco de la Nación', 'BanBif', 'Banco Pichincha', 'MiBanco', 
  'Caja Arequipa', 'Caja Piura', 'Caja Huancayo', 'Caja Cusco', 
  'Caja Trujillo', 'Compartamos Financiera', 'Otro'
];

const STEPS = [
  { id: 1, title: 'Personal', subtitle: 'Básicos', icon: User },
  { id: 2, title: 'Familia', subtitle: 'Emergencia', icon: Heart },
  { id: 3, title: 'Formación', subtitle: 'Estudios', icon: GraduationCap },
  { id: 4, title: 'Experiencia', subtitle: 'Trabajo', icon: Briefcase },
  { id: 5, title: 'Pagos', subtitle: 'Bancos', icon: CreditCard },
];

const StaffOnboardingPage = () => {
  const { currentUser, logout } = useUnifiedAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // --- TEMPORIZADOR INTELIGENTE (NO SE REINICIA) ---
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);

  useEffect(() => {
    // Recuperar o establecer tiempo objetivo
    let targetTime = localStorage.getItem(TIMER_KEY);
    const now = Date.now();

    if (!targetTime) {
      targetTime = now + (TIME_LIMIT_SECONDS * 1000);
      localStorage.setItem(TIMER_KEY, targetTime);
    } else {
      targetTime = parseInt(targetTime, 10);
    }

    const interval = setInterval(() => {
      const remaining = Math.ceil((targetTime - Date.now()) / 1000);
      
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        handleForceLogout("El tiempo ha expirado. Sesión cerrada.");
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    if(seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- EFECTO MOUSE ---
  useEffect(() => {
    if (window.innerWidth > 768) {
      const handleMouseMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  // --- FUNCIÓN DE SALIDA FORZADA ---
  const handleForceLogout = (msg) => {
    if(msg) alert(msg);
    localStorage.clear(); // Limpia todo
    window.location.href = '/login';
  };

  // ESTADO FORMULARIO
  const [formData, setFormData] = useState({
    nationality: 'Peruana', age: '', gender: '', civil_status: '',
    spouse_name: '', father_name: '', mother_name: '',
    address: '', district: '', province: '', department: 'Lima',
    alt_phone: '', personal_email: '', alt_email: '',
    afp_status: '', shirt_size: '', shoe_size: '', pants_size: '',
    has_dependents: 'NO', dependents_details: '', 
    emergency_contact_name: '', emergency_contact_phone: '',
    has_relatives_in_company: 'NO', 
    relatives: [{ name: '', position: '' }, { name: '', position: '' }],
    education_level: '', education_status: '', grad_year: '', institution: '',
    additional_courses: [{ name: '', date: '' }, { name: '', date: '' }, { name: '', date: '' }],
    work_experience: [
      { company: '', position: '', field: '', start: '', end: '', boss: '', boss_phone: '', functions: '' },
      { company: '', position: '', field: '', start: '', end: '', boss: '', boss_phone: '', functions: '' },
      { company: '', position: '', field: '', start: '', end: '', boss: '', boss_phone: '', functions: '' },
    ],
    bank_name: '', bbva_account: '', interbank_account: '', bank_observations: ''
  });

  const handleChange = (e, section = null, index = null, subfield = null) => {
    const { name, value } = e.target;
    if (section) {
      const list = [...formData[section]];
      list[index][subfield] = value;
      setFormData({ ...formData, [section]: list });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelection = (name, value) => setFormData({ ...formData, [name]: value });

  const nextStep = () => { if (currentStep < STEPS.length) setCurrentStep(prev => prev + 1); };
  const prevStep = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  // --- SUBMIT FINAL (SOLUCIÓN PANEL) ---
  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!currentUser?.id) {
        handleForceLogout("Sesión no válida.");
        return;
      }

      // 1. Guardar datos en la NUEVA TABLA (employee_profiles)
      // Usamos upsert para que si ya existe, lo actualice
      const { error: profileError } = await supabase
        .from('employee_profiles')
        .upsert([
          { 
            employee_id: currentUser.id, 
            profile_data: formData,
            updated_at: new Date()
          }
        ], { onConflict: 'employee_id' });

      if (profileError) throw profileError;

      // 2. Actualizar bandera en la tabla de empleados
      await supabase
        .from('employees')
        .update({ onboarding_completed: true })
        .eq('id', currentUser.id);

      // --- TRUCO MAGICO: Actualizar localStorage manualmente ---
      // Esto engaña al sistema localmente para que te deje pasar inmediatamente
      // sin esperar a que la base de datos responda en la siguiente carga.
      const sessionStr = localStorage.getItem('user_session'); // O como se llame tu key de sesión
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          // Actualizamos la bandera localmente
          if (session.user) session.user.onboarding_completed = true; 
          else session.onboarding_completed = true; // Depende de tu estructura
          
          localStorage.setItem('user_session', JSON.stringify(session));
        } catch (e) { console.error("Error actualizando sesión local", e); }
      }

      // 3. Limpiar Timer y Redirigir
      localStorage.removeItem(TIMER_KEY);
      
      // Usamos window.location.replace para que no se pueda volver atrás con el botón del navegador
      window.location.replace('/dashboard');

    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un error al guardar: ' + (error.message || 'Intente nuevamente'));
      setLoading(false);
    }
  };

  // Renderizado del contenido
  const renderContent = () => {
    const props = { formData, handleChange, handleSelection };
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
      
      {/* FONDO */}
      <div className="fixed inset-0 pointer-events-none transition-opacity duration-500"
        style={{ background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 51, 102, 0.15), transparent 40%), radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(240, 196, 25, 0.1), transparent 40%)` }}
      />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#003366 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="relative z-10 w-full max-w-6xl h-[90vh] md:h-[800px] bg-white/70 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/50 flex flex-col md:flex-row overflow-hidden">
        
        {/* SIDEBAR */}
        <div className="w-full md:w-80 bg-white/60 border-r border-white/50 p-8 flex flex-col relative">
          <div className="mb-8 flex flex-col items-center md:items-start">
             <div className="h-12 mb-4 flex items-center justify-center bg-white/50 px-4 py-2 rounded-xl border border-white shadow-sm">
                <img src={LOGO_URL} alt="L&K" className="h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span class="font-bold text-[#003366]">L&K</span>' }} />
             </div>
             <h2 className="text-2xl font-black text-[#003366] tracking-tight">Ficha Personal</h2>
             {/* TIMER */}
             <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-sm border transition-colors ${timeLeft < 60 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-blue-50 text-[#003366] border-blue-200'}`}>
                <Clock size={16} /> <span>{formatTime(timeLeft)}</span>
             </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
             {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                   <div key={step.id} className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${isActive ? 'bg-white shadow-md border border-slate-100 translate-x-2' : 'hover:bg-white/40'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-[#003366] text-white shadow-lg' : isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                         {isCompleted ? <CheckCircle2 size={20}/> : React.createElement(step.icon, { size: 18 })}
                      </div>
                      <div className={`${isActive ? 'opacity-100' : 'opacity-60'}`}>
                         <p className={`text-sm font-bold leading-tight ${isActive ? 'text-[#003366]' : 'text-slate-600'}`}>{step.title}</p>
                         <p className="text-[10px] text-slate-400">{step.subtitle}</p>
                      </div>
                   </div>
                )
             })}
          </div>
          
          <div className="mt-6">
             <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider"><span>Progreso</span><span>{Math.round((currentStep / STEPS.length) * 100)}%</span></div>
             <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><motion.div className="h-full bg-gradient-to-r from-[#003366] to-[#0055aa]" initial={{ width: 0 }} animate={{ width: `${(currentStep / STEPS.length) * 100}%` }} transition={{ duration: 0.5 }} /></div>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 flex flex-col relative bg-white/40">
           <div className="md:hidden p-4 border-b border-white/50 bg-white/60 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center">
              <span className="font-bold text-[#003366]">Paso {currentStep}</span>
              <span className={`text-xs font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-slate-500'}`}>{formatTime(timeLeft)}</span>
           </div>

           <div className="flex-1 overflow-y-auto p-6 md:p-12 relative scroll-smooth">
              <AnimatePresence mode="wait">
                 <motion.div key={currentStep} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.98 }} transition={{ duration: 0.3 }} className="max-w-3xl mx-auto pb-24">
                    <div className="mb-8">
                       <h2 className="text-3xl font-bold text-[#003366] mb-2">{STEPS[currentStep-1].title}</h2>
                       <p className="text-slate-500">{STEPS[currentStep-1].subtitle} (Opcional)</p>
                    </div>
                    {renderContent()}
                 </motion.div>
              </AnimatePresence>
           </div>

           <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-white/60 flex justify-between items-center z-30">
              <button onClick={prevStep} disabled={currentStep === 1} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-500 hover:text-[#003366] hover:bg-slate-100 transition-all ${currentStep === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                 <ArrowLeft size={20} /> Atrás
              </button>
              <div className="flex items-center gap-4">
                 <button onClick={() => handleForceLogout("Has cerrado sesión.")} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-wider px-4">
                    <LogOut size={14}/> Salir
                 </button>
                 {currentStep < STEPS.length ? (
                    <button onClick={nextStep} className="group flex items-center gap-3 px-8 py-3 bg-[#003366] text-white rounded-xl font-bold shadow-xl shadow-blue-900/20 hover:shadow-blue-900/30 hover:scale-[1.02] active:scale-95 transition-all">
                       Siguiente <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </button>
                 ) : (
                    <button type="button" onClick={handleSubmit} disabled={loading} className={`group flex items-center gap-3 px-8 py-3 rounded-xl font-bold shadow-xl transition-all ${loading ? 'bg-slate-300' : 'bg-[#f0c419] text-[#003366] hover:scale-[1.02]'}`}>
                       {loading ? 'Guardando...' : <><Save size={18} /> Finalizar</>}
                    </button>
                 )}
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- COMPONENTES UI ---
const StepPersonal = ({ formData, handleChange }) => (
   <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <FloatingInput label="Nacionalidad" name="nationality" val={formData.nationality} onChange={handleChange} />
         <FloatingInput label="Edad" name="age" type="number" val={formData.age} onChange={handleChange} />
         <Select label="Sexo" name="gender" val={formData.gender} onChange={handleChange} options={['Masculino', 'Femenino']} />
      </div>
      <SectionBox title="Estado Civil y Familia">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select label="Estado Civil" name="civil_status" val={formData.civil_status} onChange={handleChange} options={['Soltero/a', 'Casado/a', 'Conviviente', 'Viudo/a']} />
            <FloatingInput label="Cónyuge" name="spouse_name" val={formData.spouse_name} onChange={handleChange} />
            <FloatingInput label="Padre" name="father_name" val={formData.father_name} onChange={handleChange} />
            <FloatingInput label="Madre" name="mother_name" val={formData.mother_name} onChange={handleChange} />
         </div>
      </SectionBox>
      <SectionBox title="Ubicación">
         <div className="mb-6"><FloatingInput label="Dirección" name="address" val={formData.address} onChange={handleChange} icon={Home} /></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FloatingInput label="Departamento" name="department" val={formData.department} onChange={handleChange} />
            <FloatingInput label="Provincia" name="province" val={formData.province} onChange={handleChange} />
            <FloatingInput label="Distrito" name="district" val={formData.district} onChange={handleChange} />
         </div>
      </SectionBox>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <FloatingInput label="Celular Extra" name="alt_phone" type="tel" val={formData.alt_phone} onChange={handleChange} icon={Phone} />
         <FloatingInput label="Email Personal" name="personal_email" type="email" val={formData.personal_email} onChange={handleChange} icon={Mail} />
      </div>
   </div>
);

const StepFamily = ({ formData, handleChange, handleSelection }) => (
   <div className="space-y-8">
      <SectionBox title="Carga Familiar">
         <div className="flex gap-4 mb-4">
            <SelectionCard selected={formData.has_dependents === 'SI'} onClick={() => handleSelection('has_dependents', 'SI')} label="Sí" />
            <SelectionCard selected={formData.has_dependents === 'NO'} onClick={() => handleSelection('has_dependents', 'NO')} label="No" />
         </div>
         {formData.has_dependents === 'SI' && <div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><textarea name="dependents_details" value={formData.dependents_details} onChange={handleChange} className="w-full p-3 bg-white rounded-xl text-sm outline-none" rows={3} placeholder="Detalles..." /></div>}
      </SectionBox>
      <SectionBox title="Emergencia">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FloatingInput label="Nombre Contacto" name="emergency_contact_name" val={formData.emergency_contact_name} onChange={handleChange} icon={ShieldCheck} />
            <FloatingInput label="Teléfono" name="emergency_contact_phone" type="tel" val={formData.emergency_contact_phone} onChange={handleChange} icon={Phone} />
         </div>
      </SectionBox>
   </div>
);

const StepEducation = ({ formData, handleChange }) => (
   <div className="space-y-8">
      <SectionBox title="Académico">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Select label="Nivel" name="education_level" val={formData.education_level} onChange={handleChange} options={['Secundaria', 'Técnico', 'Universitario', 'Bachiller', 'Titulado']} />
            <Select label="Estado" name="education_status" val={formData.education_status} onChange={handleChange} options={['Completo', 'Incompleto', 'En Curso']} />
         </div>
         <FloatingInput label="Institución" name="institution" val={formData.institution} onChange={handleChange} icon={Building} />
      </SectionBox>
      <div className="grid grid-cols-3 gap-6">
         <FloatingInput label="Talla Polo" name="shirt_size" val={formData.shirt_size} onChange={handleChange} />
         <FloatingInput label="Talla Pantalón" name="pants_size" val={formData.pants_size} onChange={handleChange} />
         <FloatingInput label="Calzado" name="shoe_size" val={formData.shoe_size} onChange={handleChange} />
      </div>
   </div>
);

const StepExperience = ({ formData, handleChange }) => (
   <div className="space-y-6">
      {formData.work_experience.map((exp, idx) => (
         <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
            <div className="absolute -left-3 top-6 w-6 h-6 bg-[#003366] text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">{idx + 1}</div>
            <div className="pl-4 grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
               <FloatingInput label="Empresa" val={exp.company} onChange={(e)=>handleChange(e, 'work_experience', idx, 'company')} />
               <FloatingInput label="Cargo" val={exp.position} onChange={(e)=>handleChange(e, 'work_experience', idx, 'position')} />
               <FloatingInput label="Rubro" val={exp.field} onChange={(e)=>handleChange(e, 'work_experience', idx, 'field')} />
            </div>
            <div className="pl-4 grid grid-cols-2 md:grid-cols-4 gap-5 mb-4">
               <FloatingInput label="Inicio" type="date" val={exp.start} onChange={(e)=>handleChange(e, 'work_experience', idx, 'start')} />
               <FloatingInput label="Fin" type="date" val={exp.end} onChange={(e)=>handleChange(e, 'work_experience', idx, 'end')} />
            </div>
         </div>
      ))}
   </div>
);

const StepBank = ({ formData, handleChange }) => (
   <div className="flex flex-col items-center justify-center py-8">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 text-emerald-600 shadow-lg"><CreditCard size={36} /></div>
      <h3 className="text-2xl font-bold text-slate-800 mb-2">Cuentas</h3>
      <div className="w-full max-w-lg space-y-6">
         <Select label="Banco" name="bank_name" val={formData.bank_name} onChange={handleChange} options={BANKS_PERU} />
         <FloatingInput label="Cuenta (Mismo Banco)" name="bbva_account" val={formData.bbva_account} onChange={handleChange} />
         <FloatingInput label="CCI Interbancario" name="interbank_account" val={formData.interbank_account} onChange={handleChange} />
         <textarea name="bank_observations" value={formData.bank_observations} onChange={handleChange} className="w-full p-4 bg-slate-50 border rounded-xl text-sm outline-none" rows={3} placeholder="Observaciones..." />
      </div>
   </div>
);

// HELPERS
const SectionBox = ({ title, children }) => (<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h4 className="text-sm font-bold text-[#003366] mb-5 border-b pb-2">{title}</h4>{children}</div>);
const FloatingInput = ({ label, name, val, onChange, type="text", icon: Icon }) => (
   <div className="relative group">
      <div className="absolute top-0 left-3 px-1 -translate-y-1/2 bg-white text-[10px] font-bold text-slate-400 group-focus-within:text-[#003366] z-10">{label}</div>
      <div className="relative">
         {Icon && <Icon size={16} className="absolute left-4 top-3.5 text-slate-300"/>}
         <input type={type} name={name} value={val} onChange={onChange} className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]`} />
      </div>
   </div>
);
const Select = ({ label, name, val, onChange, options }) => (
   <div className="relative group">
      <div className="absolute top-0 left-3 px-1 -translate-y-1/2 bg-white text-[10px] font-bold text-slate-400 group-focus-within:text-[#003366] z-10">{label}</div>
      <select name={name} value={val} onChange={onChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"><option value="">-</option>{options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
   </div>
);
const SelectionCard = ({ selected, onClick, label }) => (
   <button onClick={onClick} className={`flex-1 p-4 rounded-xl border-2 font-bold text-sm ${selected ? 'border-[#003366] bg-[#003366] text-white' : 'border-slate-100 bg-white text-slate-500'}`}>{selected && <CheckCircle2 size={16} className="text-[#f0c419] inline mr-2"/>}{label}</button>
);

export default StaffOnboardingPage;