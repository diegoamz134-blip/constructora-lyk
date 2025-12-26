import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Briefcase, DollarSign, Loader2, 
  Baby, BookOpen, ChevronDown, Check,
  Mail, Lock, Shield, KeyRound, Calendar, CreditCard, Trash2, PieChart, Hash
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../components/common/StatusModal';

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } };
const dropdownVariants = { hidden: { opacity: 0, y: -10, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.95 } };

const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const COMMISSION_TYPES = ['Flujo', 'Mixta'];
const ROLES = ['Usuario', 'Admin', 'Supervisor', 'Residente'];

const AddEmployeeModal = ({ isOpen, onClose, onSuccess, userToEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [showAfpMenu, setShowAfpMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false); 
  const [showCommissionMenu, setShowCommissionMenu] = useState(false);

  const docTypeRef = useRef(null);
  const afpRef = useRef(null);
  const roleRef = useRef(null); 
  const commissionRef = useRef(null);

  const [formData, setFormData] = useState({
    first_name: '', paternal_surname: '', maternal_surname: '', birth_date: '', bank_account: '',
    document_type: 'DNI', document_number: '', position: '', salary: '', 
    start_date: new Date().toISOString().split('T')[0], contract_end_date: '',
    password: '', afp: '', commission_type: 'Flujo', cuspp: '', // CUSPP AGREGADO
    has_children: false, children_count: 0, email: '', role: 'Usuario'
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docTypeRef.current && !docTypeRef.current.contains(event.target)) setShowDocTypeMenu(false);
      if (afpRef.current && !afpRef.current.contains(event.target)) setShowAfpMenu(false);
      if (roleRef.current && !roleRef.current.contains(event.target)) setShowRoleMenu(false); 
      if (commissionRef.current && !commissionRef.current.contains(event.target)) setShowCommissionMenu(false);
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
        birth_date: userToEdit.birth_date || '',
        bank_account: userToEdit.bank_account || '',
        document_type: userToEdit.document_type || 'DNI',
        document_number: userToEdit.document_number || '',
        position: userToEdit.position || '',
        salary: userToEdit.salary || '',
        start_date: userToEdit.entry_date || userToEdit.start_date || '',
        contract_end_date: userToEdit.contract_end_date || '',
        password: '',
        afp: userToEdit.pension_system || userToEdit.afp || 'ONP',
        commission_type: userToEdit.commission_type || 'Flujo',
        cuspp: userToEdit.cuspp || '', // Cargar CUSPP
        has_children: userToEdit.has_children || false,
        children_count: userToEdit.children_count || 0,
        email: userToEdit.email || '',
        role: userToEdit.role || 'Usuario'
      });
    } else {
      setFormData({
        first_name: '', paternal_surname: '', maternal_surname: '', birth_date: '', bank_account: '',
        document_type: 'DNI', document_number: '', position: '', salary: '', 
        start_date: new Date().toISOString().split('T')[0], contract_end_date: '',
        password: '', afp: 'ONP', commission_type: 'Flujo', cuspp: '',
        has_children: false, children_count: 0, email: '', role: 'Usuario'
      });
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleDocumentChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); 
    const maxLength = formData.document_type === 'DNI' ? 8 : 12;
    if (value.length <= maxLength) setFormData({ ...formData, document_number: value });
  };

  const handleDeleteClick = async () => {
    if (userToEdit && onDelete) {
      const success = await onDelete(userToEdit.id);
      if (success) onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.document_type === 'DNI' && formData.document_number.length !== 8) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'El DNI debe tener 8 dígitos.' });
        setLoading(false); return;
    }
    if (!formData.email && !userToEdit) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'El correo es obligatorio.' });
        setLoading(false); return;
    }

    try {
      const fullName = `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim();
      
      const payload = {
        full_name: fullName,
        first_name: formData.first_name, paternal_surname: formData.paternal_surname, maternal_surname: formData.maternal_surname,
        birth_date: formData.birth_date || null, bank_account: formData.bank_account,
        document_type: formData.document_type, document_number: formData.document_number,
        has_children: formData.has_children, children_count: formData.has_children ? parseInt(formData.children_count || 0) : 0,
        status: userToEdit ? userToEdit.status : 'Activo',
        entry_date: formData.start_date,
        position: formData.position,
        salary: parseFloat(formData.salary || 0),
        contract_end_date: formData.contract_end_date || null,
        email: formData.email,
        role: formData.role,
        pension_system: formData.afp,
        commission_type: (formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen') ? formData.commission_type : null,
        cuspp: formData.cuspp // GUARDAR CUSPP
      };

      if (formData.password || !userToEdit) {
        const plainPass = formData.password || formData.document_number;
        payload.password = await bcrypt.hash(plainPass, await bcrypt.genSalt(10));
      }

      if (userToEdit) {
        const { error } = await supabase.from('employees').update(payload).eq('id', userToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('employees').insert([payload]);
        if (error) throw error;
      }

      if (formData.email) {
          const { data: existing } = await supabase.from('profiles').select('id').eq('email', formData.email).maybeSingle();
          const profileData = { 
            full_name: fullName, first_name: formData.first_name, paternal_surname: formData.paternal_surname, maternal_surname: formData.maternal_surname,
            email: formData.email, role: formData.role, status: 'Activo', bank_account: formData.bank_account, birth_date: formData.birth_date || null
          };
          if (existing) await supabase.from('profiles').update(profileData).eq('id', existing.id);
          else await supabase.from('profiles').insert([{ id: crypto.randomUUID(), ...profileData }]);
      }

      setNotification({ isOpen: true, type: 'success', title: 'Éxito', message: 'Colaborador guardado correctamente.' });
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div variants={overlayVariants} initial="hidden" animate="visible" exit="exit" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><User className="text-[#003366]"/> {userToEdit ? 'Editar' : 'Nuevo'} Colaborador</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200"><X size={20}/></button>
              </div>

              <div className="overflow-y-auto p-6 scrollbar-thin">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* NOMBRES */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nombres</label><input name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Ap. Paterno</label><input name="paternal_surname" required value={formData.paternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Ap. Materno</label><input name="maternal_surname" required value={formData.maternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/></div>
                  </div>

                  {/* DOC E IDENTIDAD */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 z-30"><label className="text-xs font-bold text-slate-500 uppercase">Documento</label>
                        <div ref={docTypeRef} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-[48px]">
                            <button type="button" onClick={() => setShowDocTypeMenu(!showDocTypeMenu)} className="h-full flex items-center px-3 text-slate-700 font-bold text-sm border-r border-slate-200 min-w-[80px] justify-between">{formData.document_type} <ChevronDown size={14}/></button>
                            <AnimatePresence>{showDocTypeMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-[120px] bg-white rounded-xl shadow-xl border z-50 overflow-hidden">{['DNI', 'CE'].map(t => <DropdownOption key={t} label={t} isSelected={formData.document_type === t} onClick={() => {setFormData(p=>({...p, document_type:t, document_number:''})); setShowDocTypeMenu(false);}}/>)}</motion.div>)}</AnimatePresence>
                            <input name="document_number" required value={formData.document_number} onChange={handleDocumentChange} className="w-full h-full pl-3 bg-transparent outline-none text-sm font-mono" placeholder="Número"/>
                        </div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">F. Nacimiento</label><div className="relative h-[48px]"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/></div></div>
                  </div>

                  {/* FINANZAS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Salario Mensual</label><div className="relative h-[48px]"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="number" name="salary" value={formData.salary} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder="0.00"/></div></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Cuenta Bancaria</label><div className="relative h-[48px]"><CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="text" name="bank_account" value={formData.bank_account} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-[#003366]" placeholder="0011-..."/></div></div>
                  </div>

                  {/* FECHAS */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">F. Ingreso</label><input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Fin Contrato</label><input type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/></div>
                  </div>

                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Cargo</label><div className="relative h-[48px]"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input name="position" required value={formData.position} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder="Ej. Administrador"/></div></div>

                  {/* INFO ADICIONAL: AFP Y COMISIÓN */}
                  <div className="border-t pt-4"><h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2"><BookOpen size={16}/> Info Adicional</h4>
                    
                    {/* AFP, COMISIÓN Y CUSPP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      {/* SELECTOR AFP */}
                      <div className="space-y-1 relative" ref={afpRef}>
                        <label className="text-xs font-bold text-slate-500 uppercase">Régimen Pensionario</label>
                        <button type="button" onClick={() => setShowAfpMenu(!showAfpMenu)} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between">{formData.afp || 'Seleccione'} <ChevronDown size={16}/></button>
                        <AnimatePresence>{showAfpMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 overflow-hidden">{AFPS.map(a => <DropdownOption key={a} label={a} isSelected={formData.afp === a} onClick={() => {setFormData({...formData, afp: a}); setShowAfpMenu(false);}}/>)}</motion.div>)}</AnimatePresence>
                      </div>

                      {/* SELECTOR COMISIÓN (SOLO SI ES AFP) */}
                      {formData.afp && formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen' && (
                        <div className="space-y-1 relative" ref={commissionRef}>
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><PieChart size={12}/> Tipo Comisión</label>
                            <button type="button" onClick={() => setShowCommissionMenu(!showCommissionMenu)} className="w-full h-[48px] px-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-[#003366] flex items-center justify-between shadow-sm">
                                {formData.commission_type} <ChevronDown size={16}/>
                            </button>
                            <AnimatePresence>
                                {showCommissionMenu && (
                                    <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 overflow-hidden">
                                        {COMMISSION_TYPES.map(c => <DropdownOption key={c} label={c} isSelected={formData.commission_type === c} onClick={() => {setFormData({...formData, commission_type: c}); setShowCommissionMenu(false);}}/>)}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                      )}

                      {/* CAMPO CUSPP (NUEVO) */}
                      {formData.afp && formData.afp !== 'Sin Régimen' && (
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Hash size={12}/> CUSPP</label>
                            <input 
                                type="text" 
                                name="cuspp" 
                                value={formData.cuspp} 
                                onChange={handleChange} 
                                className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] font-mono"
                                placeholder="Código AFP"
                            />
                        </div>
                      )}
                    </div>

                    {/* HIJOS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div onClick={() => setFormData(p => ({ ...p, has_children: !p.has_children }))} className={`flex items-center justify-between px-3 rounded-xl border cursor-pointer h-[48px] ${formData.has_children ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}><span className="text-sm font-bold text-slate-700 flex gap-2"><Baby size={18}/> ¿Tiene Hijos?</span><div className={`w-10 h-5 rounded-full relative transition-colors ${formData.has_children ? 'bg-[#003366]' : 'bg-slate-300'}`}><div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${formData.has_children ? 'translate-x-5' : ''}`}></div></div></div>
                        {formData.has_children && <div><label className="text-xs font-bold text-slate-500 uppercase">N° Hijos</label><input type="number" name="children_count" value={formData.children_count} onChange={handleChange} className="w-full h-[48px] px-3 bg-white border-2 border-blue-100 rounded-xl text-sm font-bold text-[#003366] outline-none"/></div>}
                    </div>
                  </div>

                  {/* CREDENCIALES */}
                  <div className="border-t pt-4"><h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2"><KeyRound size={16}/> Credenciales</h4>
                    <div className="space-y-2">
                        <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder="Email"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder={userToEdit ? "******" : "Pass"}/></div>
                            <div className="relative" ref={roleRef}><Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18}/><button type="button" onClick={() => setShowRoleMenu(!showRoleMenu)} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between">{formData.role} <ChevronDown size={16}/></button>
                            <AnimatePresence>{showRoleMenu && (<motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute bottom-full left-0 w-full bg-white rounded-xl shadow-xl border z-20 mb-1">{ROLES.map(r => <DropdownOption key={r} label={r} isSelected={formData.role === r} onClick={() => {setFormData({...formData, role: r}); setShowRoleMenu(false);}}/>)}</motion.div>)}</AnimatePresence></div>
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
      <StatusModal isOpen={notification.isOpen} onClose={handleCloseNotif} type={notification.type} title={notification.title} message={notification.message}/>
    </>
  );
};

export default AddEmployeeModal;