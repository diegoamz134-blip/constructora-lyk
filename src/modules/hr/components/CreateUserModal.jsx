import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Briefcase, DollarSign, Loader2, 
  Baby, BookOpen, FileBadge, ChevronDown, Check,
  Mail, Lock, Shield, KeyRound 
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../../components/common/StatusModal';

// --- Variantes de Animación ---
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 20 }
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1 } },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
  exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.1 } }
};

// --- Listas de Opciones ---
const CATEGORIES = ['Peón', 'Oficial', 'Operario', 'Capataz'];
// NOTA: Estas opciones deben coincidir con los nombres en tu tabla 'afp_rates' para que el cálculo automático funcione
const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const ROLES = ['Usuario', 'Admin', 'Supervisor', 'Residente'];

const CreateUserModal = ({ isOpen, onClose, activeTab, onSuccess, userToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  
  // --- Estados para controlar los desplegables personalizados ---
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showAfpMenu, setShowAfpMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false); 

  // --- Refs para detectar clics fuera de los menús ---
  const docTypeRef = useRef(null);
  const categoryRef = useRef(null);
  const afpRef = useRef(null);
  const roleRef = useRef(null); 

  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'DNI', 
    document_number: '',
    position: '', 
    category: 'Peón', 
    amount: '', 
    start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    password: '',
    afp: '', 
    has_children: false,
    children_count: 0,
    email: '',
    role: 'Usuario'
  });

  // --- Cerrar dropdowns al hacer clic fuera ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docTypeRef.current && !docTypeRef.current.contains(event.target)) setShowDocTypeMenu(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setShowCategoryMenu(false);
      if (afpRef.current && !afpRef.current.contains(event.target)) setShowAfpMenu(false);
      if (roleRef.current && !roleRef.current.contains(event.target)) setShowRoleMenu(false); 
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // --- Cargar datos al editar o limpiar al abrir nuevo ---
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        document_type: userToEdit.document_type || 'DNI',
        document_number: userToEdit.document_number || '',
        position: userToEdit.position || '',
        category: userToEdit.category || 'Peón',
        // Mapeo inteligente: para workers usa custom_daily_rate, para staff usa salary
        amount: userToEdit.salary || userToEdit.custom_daily_rate || userToEdit.weekly_rate || '',
        start_date: userToEdit.start_date || userToEdit.entry_date || '',
        contract_end_date: userToEdit.contract_end_date || '',
        password: '',
        // Mapeo inteligente: usa pension_system si existe, sino afp
        afp: userToEdit.pension_system || userToEdit.afp || 'ONP',
        has_children: userToEdit.has_children || false,
        children_count: userToEdit.children_count || 0,
        email: userToEdit.email || '',
        role: userToEdit.role || 'Usuario'
      });
    } else {
      setFormData({
        full_name: '',
        document_type: 'DNI',
        document_number: '',
        position: '', 
        category: 'Peón', 
        amount: '', 
        start_date: new Date().toISOString().split('T')[0],
        contract_end_date: '',
        password: '',
        afp: 'ONP',
        has_children: false,
        children_count: 0,
        email: '',
        role: 'Usuario'
      });
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  // --- Función auxiliar para seleccionar opciones ---
  const handleSelectOption = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'document_type') setShowDocTypeMenu(false);
    if (field === 'category') setShowCategoryMenu(false);
    if (field === 'afp') setShowAfpMenu(false);
    if (field === 'role') setShowRoleMenu(false); 
  };

  const handleDocumentChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    const maxLength = formData.document_type === 'DNI' ? 8 : 12; // DNI 8, CE puede ser más

    if (value.length <= maxLength) {
      setFormData({ ...formData, document_number: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validación básica
    if (formData.document_type === 'DNI' && formData.document_number.length !== 8) {
        setNotification({
            isOpen: true, type: 'error', title: 'Documento Inválido',
            message: `El DNI debe tener exactamente 8 dígitos.`
        });
        setLoading(false);
        return;
    }

    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      // Construir objeto base
      const payload = {
        full_name: formData.full_name,
        document_type: formData.document_type,
        document_number: formData.document_number,
        has_children: formData.has_children,
        children_count: formData.has_children ? parseInt(formData.children_count || 0) : 0,
        status: userToEdit ? userToEdit.status : 'Activo' // Mantener estado o default Activo
      };

      // Manejo de Contraseña (Encriptación)
      // Si el usuario escribió una nueva contraseña O es un usuario nuevo (generamos default)
      if (formData.password || !userToEdit) {
        const plainPassword = formData.password || formData.document_number; // Si es nuevo y no puso pass, usa DNI
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(plainPassword, salt);
        payload.password = passwordHash;
      }

      // Datos Específicos por Tipo
      if (activeTab === 'staff') {
        payload.entry_date = formData.start_date;
        payload.position = formData.position;
        payload.salary = parseFloat(formData.amount || 0); 
        payload.contract_end_date = formData.contract_end_date || null;
        payload.email = formData.email;
        payload.role = formData.role;
        payload.pension_system = formData.afp; // Guardar AFP también para staff

        if (!formData.email && !userToEdit) {
            throw new Error("El correo es obligatorio para administrativos.");
        }

      } else {
        // --- OBREROS (WORKERS) ---
        payload.start_date = formData.start_date;
        payload.category = formData.category;
        
        // IMPORTANTE: Guardamos en 'custom_daily_rate' para que la planilla lo use como "Sueldo Pactado"
        // Si se deja vacío, se guarda NULL y la planilla usará el valor de la tabla maestra.
        payload.custom_daily_rate = formData.amount ? parseFloat(formData.amount) : null;
        
        // Guardamos el régimen en 'pension_system' para compatibilidad con la planilla automática
        payload.pension_system = formData.afp; 
        
        if (!userToEdit) {
            payload.project_assigned = 'Sin asignar';
        }
      }

      // Ejecutar Query
      let error;
      if (userToEdit) {
        const { error: updateError } = await supabase.from(table).update(payload).eq('id', userToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from(table).insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      // Sincronizar Perfil (Solo Staff - Opcional)
      if (activeTab === 'staff' && formData.email) {
          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', formData.email).maybeSingle();
          const profileData = { full_name: formData.full_name, email: formData.email, role: formData.role, status: 'Activo' };
          
          if (existingProfile) {
              await supabase.from('profiles').update(profileData).eq('id', existingProfile.id);
          } else {
              // Crear perfil si no existe
              await supabase.from('profiles').insert([{ id: crypto.randomUUID(), ...profileData }]);
          }
      }

      setNotification({
        isOpen: true, type: 'success',
        title: userToEdit ? '¡Actualizado!' : '¡Registrado!',
        message: userToEdit ? `Datos de ${formData.full_name} actualizados.` : `${formData.full_name} ha sido registrado.`
      });

    } catch (error) {
      console.error("Error al guardar:", error);
      setNotification({
        isOpen: true, type: 'error', title: 'Error',
        message: error.message || 'No se pudo guardar en la base de datos.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, isOpen: false });
    if (notification.type === 'success') {
        onSuccess();
        onClose();
    }
  };

  const DropdownOption = ({ label, isSelected, onClick }) => (
    <button
        type="button" onClick={onClick}
        className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between group transition-all rounded-lg mx-1 my-0.5 ${isSelected ? 'bg-blue-50 text-[#003366]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'}`}
    >
        {label}
        {isSelected && <Check size={16} className="text-[#003366]"/>}
    </button>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <User className="text-[#003366]" size={20}/>
                  {userToEdit ? 'Editar' : 'Nuevo'} {activeTab === 'staff' ? 'Colaborador' : 'Obrero'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"><X size={20}/></button>
              </div>

              {/* Formulario Scrollable */}
              <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Nombre */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre Completo</label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={18} />
                      <input name="full_name" required value={formData.full_name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366] transition-all" placeholder="Apellidos y Nombres" />
                    </div>
                  </div>

                  {/* Documento y Salario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 z-30">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Documento</label>
                        <div ref={docTypeRef} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-[48px]">
                            <div className="relative h-full">
                                <button type="button" onClick={() => setShowDocTypeMenu(!showDocTypeMenu)} className="h-full flex items-center gap-1.5 px-3 text-slate-700 font-bold text-sm hover:bg-slate-100 rounded-l-xl transition-colors border-r border-slate-200 min-w-[85px] justify-between">
                                    {formData.document_type} <ChevronDown size={16} className={`text-slate-400 transition-transform ${showDocTypeMenu ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {showDocTypeMenu && (
                                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-[115%] left-0 w-[140px] bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden">
                                            {['DNI', 'CE'].map(t => <DropdownOption key={t} label={t} isSelected={formData.document_type === t} onClick={() => { handleSelectOption('document_type', t); setFormData(prev => ({...prev, document_number: ''})); }} />)}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <input name="document_number" required value={formData.document_number} onChange={handleDocumentChange} className="w-full h-full pl-3 pr-4 bg-transparent outline-none text-sm font-mono font-medium tracking-wide text-slate-800 rounded-r-xl" placeholder="Número" autoComplete="off" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                          {activeTab === 'staff' ? 'Salario Mensual' : 'Jornal Diario (Opcional)'}
                        </label>
                        <div className="relative group h-[48px]">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={18} />
                          <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full h-full pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366] transition-all" placeholder={activeTab === 'staff' ? "0.00" : "Usar Tabla"} />
                        </div>
                    </div>
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`space-y-1.5 ${activeTab !== 'staff' ? 'col-span-2' : ''}`}>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fecha Ingreso</label>
                      <input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366] h-[48px] text-slate-600" />
                    </div>
                    {activeTab === 'staff' && (
                      <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fin Contrato</label>
                          <input type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366] h-[48px] text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Categoría / Cargo */}
                  <div className="space-y-1.5 z-20">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{activeTab === 'staff' ? 'Cargo' : 'Categoría'}</label>
                    {activeTab === 'staff' ? (
                      <div className="relative group h-[48px]">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366] transition-colors" size={18} />
                        <input name="position" required value={formData.position} onChange={handleChange} className="w-full h-full pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366] transition-all" placeholder="Ej. Arquitecto" />
                      </div>
                    ) : (
                      <div ref={categoryRef} className="relative h-[48px]">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={18} />
                        <button type="button" onClick={() => setShowCategoryMenu(!showCategoryMenu)} className={`w-full h-full pl-10 pr-4 bg-slate-50 border rounded-xl text-sm font-medium flex items-center justify-between transition-all ${showCategoryMenu ? 'border-[#003366]' : 'border-slate-200'}`}>
                            <span className="text-slate-700">{formData.category}</span>
                            <ChevronDown size={18} className={`text-slate-400 transition-transform ${showCategoryMenu ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showCategoryMenu && (
                                <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-[115%] left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden">
                                    {CATEGORIES.map(cat => <DropdownOption key={cat} label={cat} isSelected={formData.category === cat} onClick={() => handleSelectOption('category', cat)} />)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 mt-2 border-t border-slate-100 z-10">
                    <h4 className="text-sm font-bold text-[#003366] mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-lg"><BookOpen size={16}/></div> Información Adicional
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 relative" ref={afpRef}>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Régimen Pensionario</label>
                        <div className="relative h-[48px]">
                            <button type="button" onClick={() => setShowAfpMenu(!showAfpMenu)} className={`w-full h-full px-4 bg-slate-50 border rounded-xl text-sm font-medium flex items-center justify-between transition-all ${showAfpMenu ? 'border-[#003366]' : 'border-slate-200'}`}>
                                <span className={`${formData.afp ? 'text-slate-700' : 'text-slate-400'}`}>{formData.afp || 'Seleccione...'}</span>
                                <ChevronDown size={18} className={`text-slate-400 transition-transform ${showAfpMenu ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {showAfpMenu && (
                                    <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-[115%] left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden max-h-[200px] overflow-y-auto scrollbar-thin">
                                        {AFPS.map(afpOption => <DropdownOption key={afpOption} label={afpOption} isSelected={formData.afp === afpOption} onClick={() => handleSelectOption('afp', afpOption)} />)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                      </div>

                      <div className="flex flex-col justify-end">
                         <div onClick={() => setFormData(prev => ({ ...prev, has_children: !prev.has_children }))} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer h-[48px] ${formData.has_children ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer pointer-events-none">
                              <Baby size={18} className={formData.has_children ? 'text-[#003366]' : 'text-slate-400'}/> ¿Tiene Hijos?
                            </label>
                            <div className={`w-11 h-6 rounded-full relative transition-colors ${formData.has_children ? 'bg-[#003366]' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform ${formData.has_children ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </div>
                         </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {formData.has_children && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 12 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Número de Hijos</label>
                            <input type="number" name="children_count" min="1" value={formData.children_count} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-[#003366] focus:outline-none focus:border-[#003366] h-[48px]" placeholder="0" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {activeTab === 'staff' && (
                    <div className="pt-5 mt-2 border-t border-slate-100 z-0">
                        <h4 className="text-sm font-bold text-[#003366] mb-4 flex items-center gap-2"><div className="p-1.5 bg-blue-50 rounded-lg"><KeyRound size={16}/></div> Credenciales</h4>
                        <div className="space-y-1.5 mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366]" placeholder="usuario@empresa.com" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contraseña</label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#003366]" placeholder={userToEdit ? "(Sin cambios)" : "••••••••"} />
                                </div>
                            </div>
                            <div className="space-y-1.5" ref={roleRef}>
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Rol</label>
                                <div className="relative h-[48px]">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={18} />
                                    <button type="button" onClick={() => setShowRoleMenu(!showRoleMenu)} className={`w-full h-full pl-10 pr-4 bg-slate-50 border rounded-xl text-sm font-medium flex items-center justify-between transition-all ${showRoleMenu ? 'border-[#003366]' : 'border-slate-200'}`}>
                                        <span className="text-slate-700">{formData.role}</span>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {showRoleMenu && (
                                            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-[115%] left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 overflow-hidden">
                                                {ROLES.map(role => <DropdownOption key={role} label={role} isSelected={formData.role === role} onClick={() => handleSelectOption('role', role)} />)}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  <div className="pt-6 flex gap-3 z-0 relative">
                    <button type="button" onClick={onClose} className="flex-1 py-3.5 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button disabled={loading} className="flex-1 py-3.5 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all">
                      {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> {userToEdit ? 'Guardar Cambios' : 'Registrar'}</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatusModal 
        isOpen={notification.isOpen}
        onClose={handleNotificationClose}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
};

export default CreateUserModal;