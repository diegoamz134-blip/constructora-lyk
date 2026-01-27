import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Save, User, Briefcase, Loader2, 
  BookOpen, ChevronDown, Check,
  Calendar, Trash2, PieChart, Hash,
  Lock, Eye, EyeOff, Phone,
  FileText, UploadCloud, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../components/common/StatusModal';

// --- CONFIGURACIÓN ---
const DOC_TYPES_WORKER = [
  'Curriculum Vitae', 
  'DNI / CE', 
  'Certificado Único Laboral', 
  'Carnet de Vacunación', 
  'Escolaridad'
];

// LISTA ACTUALIZADA DE CATEGORÍAS
const CATEGORIES = ['Capataz', 'Operario', 'Oficial', 'Ayudante'];

const AFPS = ['ONP', 'AFP Integra', 'AFP Prima', 'AFP Profuturo', 'AFP Habitat', 'Sin Régimen'];
const COMMISSION_TYPES = ['Flujo', 'Mixta'];

const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalVariants = { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.95, y: 20 } };
const dropdownVariants = { hidden: { opacity: 0, y: -10, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.95 } };

const AddWorkerModal = ({ isOpen, onClose, onSuccess, userToEdit, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });
  
  // Estados de menús
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showAfpMenu, setShowAfpMenu] = useState(false);
  const [showCommissionMenu, setShowCommissionMenu] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);

  // Referencias para cerrar menús al hacer click fuera
  const docTypeRef = useRef(null);
  const categoryRef = useRef(null);
  const afpRef = useRef(null);
  const commissionRef = useRef(null);

  // Estados para Documentos
  const [pendingDocs, setPendingDocs] = useState({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState(null);
  const [tempDocData, setTempDocData] = useState({ file: null, startDate: '', endDate: '' });

  const [formData, setFormData] = useState({
    first_name: '', paternal_surname: '', maternal_surname: '', 
    document_type: 'DNI', document_number: '', 
    phone: '',
    start_date: new Date().toISOString().split('T')[0],
    category: 'Ayudante', // Valor por defecto actualizado a uno de la lista nueva
    office: '', 
    password: '', 
    afp: 'ONP', commission_type: 'Flujo', cuspp: ''
  });

  // Cierre de menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (docTypeRef.current && !docTypeRef.current.contains(event.target)) setShowDocTypeMenu(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setShowCategoryMenu(false);
      if (afpRef.current && !afpRef.current.contains(event.target)) setShowAfpMenu(false);
      if (commissionRef.current && !commissionRef.current.contains(event.target)) setShowCommissionMenu(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Cargar datos si es edición
  useEffect(() => {
    if (userToEdit) {
      setFormData({
        first_name: userToEdit.first_name || '',
        paternal_surname: userToEdit.paternal_surname || '',
        maternal_surname: userToEdit.maternal_surname || '',
        document_type: userToEdit.document_type || 'DNI',
        document_number: userToEdit.document_number || '',
        phone: userToEdit.phone || '',
        start_date: userToEdit.start_date || '',
        category: userToEdit.category || 'Ayudante',
        office: userToEdit.project_assigned || '',
        password: '', 
        afp: userToEdit.pension_system || userToEdit.afp || 'ONP',
        commission_type: userToEdit.commission_type || 'Flujo',
        cuspp: userToEdit.cuspp || ''
      });
      setPendingDocs({});
    } else {
      // Limpiar formulario
      setFormData({
        first_name: '', paternal_surname: '', maternal_surname: '', 
        document_type: 'DNI', document_number: '', 
        phone: '',
        start_date: new Date().toISOString().split('T')[0],
        category: 'Ayudante', 
        office: '',
        password: '', afp: 'ONP', commission_type: 'Flujo', cuspp: ''
      });
      setPendingDocs({});
    }
    setShowPassword(false);
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

  // --- LÓGICA DE DOCUMENTOS ---
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

  const uploadDocumentsToCloud = async (workerId) => {
    if (Object.keys(pendingDocs).length === 0) return;
    
    const uploadPromises = Object.entries(pendingDocs).map(async ([type, data]) => {
      try {
        const fileExt = data.file.name.split('.').pop();
        const fileName = `${workerId}/${type.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('hr-documents').upload(fileName, data.file);
        if (uploadError) throw uploadError;

        await supabase.from('hr_documents').insert([{
          person_id: workerId, 
          person_type: 'worker', 
          doc_type: type, 
          file_url: fileName,
          start_date: data.startDate || null, 
          expiration_date: data.endDate || null
        }]);
      } catch (err) { 
        console.error(`Error subiendo ${type}:`, err); 
      }
    });
    
    await Promise.all(uploadPromises);
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.document_type === 'DNI' && formData.document_number.length !== 8) {
        setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'El DNI debe tener 8 dígitos.' });
        setLoading(false); return;
    }

    try {
      const fullName = `${formData.first_name} ${formData.paternal_surname} ${formData.maternal_surname}`.trim();
      
      const payload = {
        full_name: fullName,
        first_name: formData.first_name, 
        paternal_surname: formData.paternal_surname, 
        maternal_surname: formData.maternal_surname,
        
        document_type: formData.document_type, 
        document_number: formData.document_number,
        phone: formData.phone,
        
        start_date: formData.start_date,
        category: formData.category,
        project_assigned: formData.office || 'Sin asignar', // Mantiene la lógica
        
        pension_system: formData.afp,
        commission_type: (formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen') ? formData.commission_type : null,
        cuspp: (formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen') ? formData.cuspp : null,
        
        status: userToEdit ? userToEdit.status : 'Activo'
      };

      if (formData.password || !userToEdit) {
        const plainPass = formData.password || formData.document_number;
        const salt = bcrypt.genSaltSync(10); 
        payload.password = bcrypt.hashSync(plainPass, salt);
      }

      let targetId = userToEdit?.id;

      if (userToEdit) {
        const { error } = await supabase.from('workers').update(payload).eq('id', userToEdit.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('workers').insert([payload]).select().single();
        if (error) throw error;
        targetId = data.id;
      }

      if (targetId) await uploadDocumentsToCloud(targetId);

      setNotification({ isOpen: true, type: 'success', title: 'Éxito', message: 'Obrero guardado correctamente.' });
    } catch (error) {
      console.error("Error al guardar obrero:", error);
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: error.message || 'Error desconocido al guardar' });
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
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><User className="text-[#003366]"/> {userToEdit ? 'Editar' : 'Nuevo'} Obrero</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200"><X size={20}/></button>
              </div>

              <div className="overflow-y-auto p-6 scrollbar-thin">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* NOMBRES Y APELLIDOS */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nombres</label>
                        <input name="first_name" required value={formData.first_name} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ap. Paterno</label>
                        <input name="paternal_surname" required value={formData.paternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Ap. Materno</label>
                        <input name="maternal_surname" required value={formData.maternal_surname} onChange={handleChange} className="w-full px-3 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200 outline-none focus:border-[#003366]"/>
                    </div>
                  </div>

                  {/* DOCUMENTO Y CELULAR */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1 col-span-1 md:col-span-2 z-30">
                        <label className="text-xs font-bold text-slate-500 uppercase">Documento de Identidad</label>
                        <div ref={docTypeRef} className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl h-[48px]">
                            <button type="button" onClick={() => setShowDocTypeMenu(!showDocTypeMenu)} className="h-full flex items-center px-3 text-slate-700 font-bold text-sm border-r border-slate-200 min-w-[80px] justify-between">
                                {formData.document_type} <ChevronDown size={14}/>
                            </button>
                            <AnimatePresence>
                                {showDocTypeMenu && (
                                    <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full left-0 w-[120px] bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
                                        {['DNI', 'CE'].map(t => (
                                            <DropdownOption key={t} label={t} isSelected={formData.document_type === t} onClick={() => {setFormData(p=>({...p, document_type:t, document_number:''})); setShowDocTypeMenu(false);}}/>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <input name="document_number" required value={formData.document_number} onChange={handleDocumentChange} className="w-full h-full pl-3 bg-transparent outline-none text-sm font-mono" placeholder="Número"/>
                        </div>
                    </div>
                    <div className="space-y-1 col-span-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Celular</label>
                        <div className="relative h-[48px]">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]" placeholder="999..."/>
                        </div>
                    </div>
                  </div>

                  {/* FECHA INGRESO Y CATEGORÍA */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Fecha de Ingreso</label>
                        <div className="relative h-[48px]">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/>
                        </div>
                    </div>
                    <div className="space-y-1 z-20" ref={categoryRef}>
                        <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                        <div className="relative h-[48px]">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18}/>
                            <button type="button" onClick={() => setShowCategoryMenu(!showCategoryMenu)} className="w-full h-full pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between hover:border-[#003366] transition-colors">
                                {formData.category} <ChevronDown size={16}/>
                            </button>
                            <AnimatePresence>
                                {showCategoryMenu && (
                                    <motion.div 
                                        variants={dropdownVariants} 
                                        initial="hidden" 
                                        animate="visible" 
                                        exit="exit" 
                                        className="absolute top-full left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 mt-1 overflow-hidden"
                                    >
                                        {CATEGORIES.map(c => (
                                            <DropdownOption 
                                                key={c} 
                                                label={c} 
                                                isSelected={formData.category === c} 
                                                onClick={() => {
                                                    setFormData({...formData, category: c}); 
                                                    setShowCategoryMenu(false);
                                                }}
                                            />
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                  </div>

                  {/* RÉGIMEN PENSIONARIO (MODIFICADO: Sin Oficina, ocupando ancho completo) */}
                  <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1 relative" ref={afpRef}>
                          <label className="text-xs font-bold text-slate-500 uppercase">Régimen Pensionario</label>
                          <button type="button" onClick={() => setShowAfpMenu(!showAfpMenu)} className="w-full h-[48px] px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium flex items-center justify-between text-slate-700">
                              <span className="truncate">{formData.afp || 'Seleccionar'}</span> <ChevronDown size={16}/>
                          </button>
                          <AnimatePresence>
                              {showAfpMenu && (
                                  <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full mt-1 right-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                      {AFPS.map(a => <DropdownOption key={a} label={a} isSelected={formData.afp === a} onClick={() => {setFormData({...formData, afp: a}); setShowAfpMenu(false);}}/>)}
                                  </motion.div>
                              )}
                          </AnimatePresence>
                      </div>
                  </div>

                  {/* DETALLES DE AFP (SOLO SI APLICA) */}
                  {formData.afp && formData.afp !== 'ONP' && formData.afp !== 'Sin Régimen' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <div className="space-y-1 relative" ref={commissionRef}>
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><PieChart size={12}/> Tipo Comisión</label>
                                <button type="button" onClick={() => setShowCommissionMenu(!showCommissionMenu)} className="w-full h-[40px] px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-[#003366] flex items-center justify-between">
                                    {formData.commission_type} <ChevronDown size={16}/>
                                </button>
                                <AnimatePresence>
                                    {showCommissionMenu && (
                                        <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit" className="absolute top-full mt-1 left-0 w-full bg-white rounded-xl shadow-xl border z-20 overflow-hidden">
                                            {COMMISSION_TYPES.map(c => <DropdownOption key={c} label={c} isSelected={formData.commission_type === c} onClick={() => {setFormData({...formData, commission_type: c}); setShowCommissionMenu(false);}}/>)}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                           </div>
                           <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Hash size={12}/> CUSPP</label>
                                <input type="text" name="cuspp" value={formData.cuspp} onChange={handleChange} className="w-full h-[40px] px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003366] font-mono" placeholder="Código AFP"/>
                           </div>
                      </div>
                  )}

                  {/* SECCIÓN DE CONTRASEÑA */}
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                            <Lock size={14} className="text-[#003366]"/> Contraseña (Password)
                        </label>
                        <div className="relative group">
                            <input 
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder={userToEdit ? "•••••• (Dejar vacío para mantener)" : "Opcional (Por defecto será el DNI)"}
                                className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366] transition-colors"
                                autoComplete="new-password"
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#003366] transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 pl-1 leading-tight">
                            * Usuario: DNI/CE. Contraseña por defecto: DNI/CE.
                        </p>
                     </div>
                  </div>

                  {/* SECCIÓN DE ARCHIVOS (NUEVA) */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-bold text-[#003366] mb-3 flex items-center gap-2">
                        <FileText size={16}/> Documentos del Obrero
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {DOC_TYPES_WORKER.map((doc) => {
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

                  {/* BOTONES DE ACCIÓN */}
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
      
      {/* MINI MODAL SUBIDA DE ARCHIVOS */}
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

export default AddWorkerModal;