import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Briefcase, Loader2, 
  BookOpen, ChevronDown, Check,
  Lock, KeyRound, PieChart, Hash,
  MapPin, Phone, Eye, EyeOff, Trash2, 
  FileText, UploadCloud, CheckCircle2
} from 'lucide-react';
import { getSedes } from '../../services/sedesService';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../components/common/StatusModal';

// --- CONFIG ---
const DOC_TYPES_OPTIONAL = [
  'Curriculum Vitae', 'DNI / CE', 'Certificado Único Laboral', 'Renta de Quinta', 'Carnet de Vacunación', 'Asignación Familiar'
];
const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const COMMISSION_TYPES = ['Flujo', 'Mixta'];

// --- NUEVA LISTA DE ROLES DETALLADA ---
const ROLES = [
  // ALTA DIRECCIÓN (VEN TODO)
  { label: 'Gerente General', value: 'gerencia_general' },
  { label: 'Gerente de Admin. y Finanzas', value: 'gerencia_admin_finanzas' },
  { label: 'Gerente de Proyectos', value: 'gerente_proyectos' },
  { label: 'Coordinador de Proyectos', value: 'coordinador_proyectos' },
  { label: 'Jefe de Recursos Humanos', value: 'jefe_rrhh' },

  // CONTABILIDAD Y ADMIN
  { label: 'Contador', value: 'contador' },
  { label: 'Analista Contable', value: 'analista_contable' },
  { label: 'Asistente de Contabilidad', value: 'asistente_contabilidad' },
  { label: 'Administrador', value: 'administrador' },
  { label: 'Asistente Administrativo', value: 'asistente_administrativo' },
  { label: 'Tesorera', value: 'tesorera' },

  // LOGÍSTICA Y SERVICIOS
  { label: 'Asistente Logística', value: 'asistente_logistica' },
  { label: 'Encargado de Almacén', value: 'encargado_almacen' },
  { label: 'Servicios Generales', value: 'servicios_generales' },
  { label: 'Transportista', value: 'transportista' },
  { label: 'Personal de Limpieza', value: 'limpieza' },

  // RRHH
  { label: 'Asistente de RR.HH.', value: 'asistente_rrhh' },

  // OBRAS Y CAMPO
  { label: 'Residente de Obra', value: 'residente_obra' },
  { label: 'Encargado de Obra', value: 'encargado_obra' },
  { label: 'Asistente Residente / Ing. Campo', value: 'asistente_residente' },
  { label: 'Jefe de Calidad', value: 'jefe_calidad' },

  // LICITACIONES Y COSTOS
  { label: 'Jefe de Licitaciones', value: 'jefe_licitaciones' },
  { label: 'Asistente Costos y Presupuestos', value: 'asistente_costos' },

  // SSOMA
  { label: 'Jefe de SSOMA', value: 'jefe_ssoma' },
  { label: 'Coordinador SSOMA', value: 'coordinador_ssoma' },
  { label: 'Prevencionista de Riesgos', value: 'prevencionista' },

  { label: 'Super Admin (Sistema)', value: 'admin' }
];

// LISTA DE CARGOS (TEXTO) PARA EL OTRO CAMPO
const POSITIONS = ROLES.map(r => r.label.toUpperCase());

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } };
const dropdownVariants = { hidden: { opacity: 0, y: -10, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.95 } };

const AddEmployeeModal = ({ isOpen, onClose, onSuccess, userToEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  
  // Estados de menús
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [showAfpMenu, setShowAfpMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false); 
  const [showCommissionMenu, setShowCommissionMenu] = useState(false);
  const [showSedeMenu, setShowSedeMenu] = useState(false);
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Referencias
  const docTypeRef = useRef(null);
  const afpRef = useRef(null);
  const roleRef = useRef(null); 
  const commissionRef = useRef(null);
  const sedeRef = useRef(null);
  const positionRef = useRef(null);

  const [sedesList, setSedesList] = useState([]); 

  // Docs
  const [pendingDocs, setPendingDocs] = useState({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState(null);
  const [tempDocData, setTempDocData] = useState({ file: null, startDate: '', endDate: '' });

  const [formData, setFormData] = useState({
    first_name: '', paternal_surname: '', maternal_surname: '', phone: '',
    document_type: 'DNI', document_number: '', 
    position: '', 
    start_date: new Date().toISOString().split('T')[0], contract_end_date: '',
    password: '', afp: '', commission_type: 'Flujo', cuspp: '', 
    role: 'asistente_residente', 
    sede_id: ''
  });

  useEffect(() => {
    if (isOpen) {
      const loadSedes = async () => {
        try {
          const data = await getSedes();
          setSedesList(data || []);
        } catch (error) { console.error("Error cargando sedes:", error); }
      };
      loadSedes();
      setPendingDocs({}); 
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docTypeRef.current && !docTypeRef.current.contains(event.target)) setShowDocTypeMenu(false);
      if (afpRef.current && !afpRef.current.contains(event.target)) setShowAfpMenu(false);
      if (roleRef.current && !roleRef.current.contains(event.target)) setShowRoleMenu(false); 
      if (commissionRef.current && !commissionRef.current.contains(event.target)) setShowCommissionMenu(false);
      if (sedeRef.current && !sedeRef.current.contains(event.target)) setShowSedeMenu(false);
      if (positionRef.current && !positionRef.current.contains(event.target)) setShowPositionMenu(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        first_name: userToEdit.first_name || '',
        paternal_surname: userToEdit.paternal_surname || '',
        maternal_surname: userToEdit.maternal_surname || '',
        phone: userToEdit.phone || '',
        document_type: userToEdit.document_type || 'DNI',
        document_number: userToEdit.document_number || '',
        position: userToEdit.position || '',
        start_date: userToEdit.entry_date || userToEdit.start_date || '',
        contract_end_date: userToEdit.contract_end_date || '',
        password: '',
        afp: userToEdit.pension_system || userToEdit.afp || 'ONP',
        commission_type: userToEdit.commission_type || 'Flujo',
        cuspp: userToEdit.cuspp || '', 
        role: userToEdit.role || 'asistente_residente', 
        sede_id: userToEdit.sede_id || ''
      });
    } else {
      setFormData({
        first_name: '', paternal_surname: '', maternal_surname: '', phone: '',
        document_type: 'DNI', document_number: '', position: '', 
        start_date: new Date().toISOString().split('T')[0], contract_end_date: '',
        password: '', afp: 'ONP', commission_type: 'Flujo', cuspp: '',
        role: 'asistente_residente', 
        sede_id: ''
      });
    }
    setShowPassword(false);
  }, [userToEdit, isOpen]);

  // --- HANDLERS SEGUROS PARA EVITAR RE-RENDERS ---

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    // Preparamos el nuevo estado
    let updatedData = { ...formData, [name]: newValue };

    // LÓGICA SEGURA: Si cambia la fecha de ingreso y supera a la de fin, limpiamos la de fin
    if (name === 'start_date' && formData.contract_end_date && newValue > formData.contract_end_date) {
        updatedData.contract_end_date = '';
    }

    setFormData(updatedData);
  };

  // Validación de teléfono: Solo números y máx 9 dígitos
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    if (value.length <= 9) {
      setFormData(prev => ({ ...prev, phone: value }));
    }
  };

  const handleDocumentChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    const maxLength = formData.document_type === 'DNI' ? 8 : 12;
    if (value.length <= maxLength) setFormData({ ...formData, document_number: value });
  };

  const handleDeleteClick = () => {
    if (userToEdit && onDelete) {
       onDelete(userToEdit.id);
       onClose(); 
    }
  };

  const openUploadModal = (docType) => {
    setCurrentDocType(docType);
    setTempDocData({ file: null, startDate: '', endDate: '' });
    setUploadModalOpen(true);
  };

  const handleSaveTempDoc = () => {
    if (!tempDocData.file) {
      alert("Por favor selecciona un archivo.");
      return;
    }
    setPendingDocs(prev => ({ ...prev, [currentDocType]: tempDocData }));
    setUploadModalOpen(false);
  };

  const uploadDocumentsToCloud = async (employeeId) => {
    if (Object.keys(pendingDocs).length === 0) return;
    const uploadPromises = Object.entries(pendingDocs).map(async ([type, data]) => {
      try {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${employeeId}/${type.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('hr-documents').upload(fileName, data.file);
        if (uploadError) throw uploadError;
        await supabase.from('hr_documents').insert([{
          person_id: employeeId, person_type: 'employee', doc_type: type, file_url: fileName,
          start_date: data.startDate || null, expiration_date: data.endDate || null
        }]);
      } catch (err) { console.error(`Error subiendo ${type}:`, err); }
    });
    await Promise.all(uploadPromises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validación DNI
    if (formData.document_type === 'DNI' && formData.document_number.length !== 8) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'El DNI debe tener 8 dígitos.' });
        setLoading(false); return;
    }

    // Validación Teléfono (Nuevo)
    if (formData.phone.length > 0 && formData.phone.length !== 9) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'El celular debe tener 9 dígitos.' });
        setLoading(false); return;
    }

    // Validación Fecha Fin vs Inicio (Nuevo)
    if (formData.contract_end_date && formData.contract_end_date < formData.start_date) {
        setNotification({ isOpen: true, type: 'error', title: 'Error en fechas', message: 'El fin de contrato no puede ser anterior al ingreso.' });
        setLoading(false); return;
    }

    try {
      const fullName = `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim();
      let hashedPassword = null;
      if (formData.password || !userToEdit) {
          const plainPass = formData.password || formData.document_number;
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(plainPass, salt);
      }

      const payload = {
        full_name: fullName,
        first_name: formData.first_name, 
        paternal_surname: formData.paternal_surname, 
        maternal_surname: formData.maternal_surname,
        phone: formData.phone,
        document_type: formData.document_type, 
        document_number: formData.document_number,
        status: userToEdit ? userToEdit.status : 'Activo',
        salary: userToEdit ? userToEdit.salary : 0, 
        has_children: false, children_count: 0, email: null, 
        entry_date: formData.start_date,
        position: formData.position, 
        contract_end_date: formData.contract_end_date || null,
        role: formData.role, 
        pension_system: formData.afp,
        commission_type: (formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen') ? formData.commission_type : null,
        cuspp: (formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen') ? formData.cuspp : null,
        sede_id: formData.sede_id || null
      };

      if (hashedPassword) payload.password = hashedPassword;

      let targetId = userToEdit?.id;

      if (userToEdit) {
        const { error } = await supabase.from('employees').update(payload).eq('id', userToEdit.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('employees').insert([payload]).select().single();
        if (error) throw error;
        targetId = data.id; 
      }

      if (targetId) await uploadDocumentsToCloud(targetId);

      setNotification({ isOpen: true, type: 'success', title: 'Éxito', message: 'Personal guardado correctamente.' });
    } catch (error) {
      console.error(error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotif = () => {
    setNotification({ ...notification, isOpen: false });
    if (notification.type === 'success') { onSuccess(); onClose(); }
  };

  const DropdownOption = ({ label, isSelected, onClick }) => (
    <button type="button" onClick={onClick} className={`w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-slate-100 ${isSelected ? 'bg-blue-50 text-[#003366]' : 'text-slate-600'}`}>
        {label} {isSelected && <Check size={16} className="text-[#003366]"/>}
    </button>
  );

  const getRoleLabel = (roleValue) => {
    const role = ROLES.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  const getSedeName = () => {
    const sede = sedesList.find(s => s.id === formData.sede_id);
    return sede ? sede.name : 'Sin Oficina Asignada';
  };

  const isAFP = formData.afp && formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><User className="text-[#003366]"/> {userToEdit ? 'Editar' : 'Nuevo'} Staff / Administrativo</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200"><X size={20}/></button>
              </div>

              <div className="overflow-y-auto p-6 scrollbar-thin">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* DATOS PERSONALES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nombres</label><input name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Ap. Paterno</label><input name="paternal_surname" required value={formData.paternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Ap. Materno</label><input name="maternal_surname" required value={formData.maternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1 md:col-span-2 z-30">
                        <label className="text-xs font-bold text-slate-500 uppercase">Documento de Identidad</label>
                        <div ref={docTypeRef} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-[48px]">
                            <button type="button" onClick={() => setShowDocTypeMenu(!showDocTypeMenu)} className="h-full flex items-center px-3 text-slate-700 font-bold text-sm border-r border-slate-200 min-w-[80px] justify-between">{formData.document_type} <ChevronDown size={14}/></button>
                            <AnimatePresence>{showDocTypeMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-[120px] bg-white rounded-xl shadow-xl border z-50 overflow-hidden">{['DNI', 'CE'].map(t => <DropdownOption key={t} label={t} isSelected={formData.document_type === t} onClick={() => {setFormData(p=>({...p, document_type:t, document_number:''})); setShowDocTypeMenu(false);}}/>)}</motion.div>)}</AnimatePresence>
                            <input name="document_number" required value={formData.document_number} onChange={handleDocumentChange} className="w-full h-full pl-3 bg-transparent outline-none text-sm font-mono" placeholder="Número"/>
                        </div>
                    </div>
                    <div className="space-y-1 col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Celular</label>
                        <div className="relative h-[48px]">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input 
                              type="tel" 
                              name="phone" 
                              value={formData.phone} 
                              onChange={handlePhoneChange} 
                              inputMode="numeric"
                              className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" 
                              placeholder="999888777"
                            />
                        </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">F. Ingreso</label><input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Fin Contrato</label>
                      <input 
                        type="date" 
                        name="contract_end_date" 
                        value={formData.contract_end_date} 
                        onChange={handleChange}
                        min={formData.start_date}
                        className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"
                      />
                    </div>
                  </div>

                  {/* CARGO Y SEDE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 relative" ref={positionRef}>
                          <label className="text-xs font-bold text-slate-500 uppercase">Cargo (Etiqueta)</label>
                          <button type="button" onClick={() => setShowPositionMenu(!showPositionMenu)} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between text-slate-700 hover:border-[#003366] focus:border-[#003366] transition-colors">
                            <span className="truncate">{formData.position || 'Seleccionar Cargo'}</span> <ChevronDown size={16}/>
                          </button>
                          <AnimatePresence>
                              {showPositionMenu && (
                                  <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute bottom-full mb-1 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                      {POSITIONS.map(pos => (
                                          <DropdownOption key={pos} label={pos} isSelected={formData.position === pos} onClick={() => {setFormData({...formData, position: pos}); setShowPositionMenu(false);}}/>
                                      ))}
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </div>

                      <div className="space-y-1 relative" ref={sedeRef}>
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><MapPin size={12}/> Oficina (Sede)</label>
                          <button type="button" onClick={() => setShowSedeMenu(!showSedeMenu)} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between text-slate-700 hover:border-[#003366] focus:border-[#003366] transition-colors">
                            <span className="truncate">{getSedeName()}</span> <ChevronDown size={16}/>
                          </button>
                          <AnimatePresence>
                              {showSedeMenu && (
                                  <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute bottom-full mb-1 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-48 overflow-y-auto">
                                      <DropdownOption label="Sin Oficina Asignada" isSelected={!formData.sede_id} onClick={() => {setFormData({...formData, sede_id: null}); setShowSedeMenu(false);}}/>
                                      {sedesList.map(s => (
                                          <DropdownOption key={s.id} label={s.name} isSelected={formData.sede_id === s.id} onClick={() => {setFormData({...formData, sede_id: s.id}); setShowSedeMenu(false);}}/>
                                      ))}
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </div>
                  </div>

                  <div className="border-t pt-4"><h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2"><BookOpen size={16}/> Información Adicional</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-1 relative" ref={afpRef}>
                        <label className="text-xs font-bold text-slate-500 uppercase">Régimen Pensionario</label>
                        <button type="button" onClick={() => setShowAfpMenu(!showAfpMenu)} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between">{formData.afp || 'Seleccione'} <ChevronDown size={16}/></button>
                        <AnimatePresence>{showAfpMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 overflow-hidden">{AFPS.map(a => <DropdownOption key={a} label={a} isSelected={formData.afp === a} onClick={() => {setFormData({...formData, afp: a}); setShowAfpMenu(false);}}/>)}</motion.div>)}</AnimatePresence>
                      </div>
                      {isAFP && (
                        <>
                          <div className="space-y-1 relative" ref={commissionRef}>
                              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><PieChart size={12}/> Tipo Comisión</label>
                              <button type="button" onClick={() => setShowCommissionMenu(!showCommissionMenu)} className="w-full h-[48px] px-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-[#003366] flex items-center justify-between shadow-sm">
                                  {formData.commission_type} <ChevronDown size={16}/>
                              </button>
                              <AnimatePresence>{showCommissionMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 overflow-hidden">{COMMISSION_TYPES.map(c => <DropdownOption key={c} label={c} isSelected={formData.commission_type === c} onClick={() => {setFormData({...formData, commission_type: c}); setShowCommissionMenu(false);}}/>)}</motion.div>)}</AnimatePresence>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Hash size={12}/> CUSPP</label>
                              <input type="text" name="cuspp" value={formData.cuspp} onChange={handleChange} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] font-mono" placeholder="Código AFP"/>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* DOCUMENTOS */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2">
                        <FileText size={16}/> Documentos (Opcional)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {DOC_TYPES_OPTIONAL.map((doc) => {
                        const isUploaded = !!pendingDocs[doc];
                        return (
                          <div key={doc} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isUploaded ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                             <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUploaded ? 'bg-green-100 text-green-600' : 'bg-white text-slate-400'}`}>
                                   {isUploaded ? <CheckCircle2 size={16}/> : <FileText size={16}/>}
                                </div>
                                <div>
                                   <p className={`text-sm font-bold ${isUploaded ? 'text-green-800' : 'text-slate-700'}`}>{doc}</p>
                                   <p className="text-[10px] text-slate-400">{isUploaded ? 'Listo para subir' : 'Sin archivo'}</p>
                                </div>
                             </div>
                             {isUploaded ? (
                               <button type="button" onClick={() => { 
                                  const newDocs = { ...pendingDocs }; delete newDocs[doc]; setPendingDocs(newDocs); 
                               }} className="text-xs text-red-500 hover:underline font-medium">Quitar</button>
                             ) : (
                               <button type="button" onClick={() => openUploadModal(doc)} className="flex items-center gap-1 text-xs bg-white border border-slate-300 hover:border-[#003366] hover:text-[#003366] px-3 py-1.5 rounded-lg transition-all font-bold shadow-sm">
                                  <UploadCloud size={14}/> Subir
                               </button>
                             )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ROL DE ACCESO (PERMISOS) */}
                  <div className="border-t pt-4">
                     <h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2"><KeyRound size={16}/> Usuario y Permisos</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder={userToEdit ? "•••••• (Opcional)" : "Por defecto: DNI"} autoComplete="new-password"/>
                                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#003366]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                            </div>
                            <p className="text-[10px] text-slate-400 ml-1 mt-1">* El usuario será su DNI/CE.</p>
                         </div>
                         <div className="space-y-1 relative" ref={roleRef}>
                             <label className="text-xs font-bold text-slate-500 uppercase">Rol de Acceso (Permisos)</label>
                             <button type="button" onClick={() => setShowRoleMenu(!showRoleMenu)} className="w-full h-[48px] pl-3 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between text-slate-700">
                                 <span className="truncate mr-2">{getRoleLabel(formData.role)}</span> <ChevronDown size={16}/>
                             </button>
                             <AnimatePresence>{showRoleMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute bottom-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 mb-1 overflow-hidden h-60 overflow-y-auto">{ROLES.map(r => (<DropdownOption key={r.value} label={r.label} isSelected={formData.role === r.value} onClick={() => {setFormData({...formData, role: r.value}); setShowRoleMenu(false);}}/>))}</motion.div>)}</AnimatePresence>
                         </div>
                     </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    {userToEdit && (
                      <button type="button" onClick={handleDeleteClick} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex items-center justify-center" title="Eliminar"><Trash2 size={20} /></button>
                    )}
                    <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                    <button disabled={loading} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2">{loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Guardar</>}</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* MINI MODAL SUBIDA */}
      <AnimatePresence>
        {uploadModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-lg">{currentDocType}</h3>
                    <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                 </div>
                 <div className="space-y-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Archivo (PDF/IMG)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" className="w-full text-sm text-slate-600" onChange={(e) => setTempDocData({ ...tempDocData, file: e.target.files[0] })}/></div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">F. Emisión</label><input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={tempDocData.startDate} onChange={(e) => setTempDocData({ ...tempDocData, startDate: e.target.value })}/></div>
                       <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">F. Vencimiento</label><input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={tempDocData.endDate} onChange={(e) => setTempDocData({ ...tempDocData, endDate: e.target.value })}/></div>
                    </div>
                    <button type="button" onClick={handleSaveTempDoc} className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 mt-2">Confirmar Carga</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <StatusModal isOpen={notification.isOpen} onClose={handleCloseNotif} type={notification.type} title={notification.title} message={notification.message}/>
    </>
  );
};

export default AddEmployeeModal;