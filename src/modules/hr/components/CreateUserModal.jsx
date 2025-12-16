import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Iconos estándar
import { X, Save, User, Briefcase, DollarSign, Loader2, Mail, Lock, Shield, FileText } from 'lucide-react'; 
import { supabase } from '../../../services/supabase';
import bcrypt from 'bcryptjs';
import StatusModal from '../../../components/common/StatusModal';

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

const CreateUserModal = ({ isOpen, onClose, activeTab, onSuccess, userToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  // Estado del formulario
  const [formData, setFormData] = useState({
    full_name: '',
    document_type: 'DNI', // Valor por defecto
    document_number: '',
    email: '',          
    password: '',       
    role: '',           
    position: '', 
    category: 'Peón', 
    amount: '', 
    start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    
    // Campos Extras
    has_children: false,
    children_count: '',
    afp: '',
    has_afp_input: false
  });

  // Configuración de límites según tipo de documento
  const docLimit = formData.document_type === 'DNI' ? 8 : 9;

  // Efecto para sincronizar Usuario con DNI automáticamente para OBREROS
  useEffect(() => {
    if (activeTab === 'workers') {
      setFormData(prev => ({
        ...prev,
        email: prev.document_number, // El usuario es el número de documento
        role: 'worker'               // Rol fijo
      }));
    }
  }, [formData.document_number, activeTab]);

  useEffect(() => {
    const defaultRole = activeTab === 'staff' ? 'admin' : 'worker';

    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        document_type: userToEdit.document_type || 'DNI', // Cargar tipo doc
        document_number: userToEdit.document_number || '',
        email: userToEdit.email || (activeTab === 'workers' ? userToEdit.document_number : ''),
        password: '', 
        role: userToEdit.role || defaultRole,
        position: userToEdit.position || '',
        category: userToEdit.category || 'Peón',
        amount: userToEdit.salary || userToEdit.weekly_rate || '',
        start_date: userToEdit.start_date || userToEdit.entry_date || '',
        contract_end_date: userToEdit.contract_end_date || '',
        
        has_children: userToEdit.has_children || false,
        children_count: userToEdit.children_count || '',
        afp: userToEdit.afp || '',
        has_afp_input: !!userToEdit.afp
      });
    } else {
      setFormData({
        full_name: '',
        document_type: 'DNI',
        document_number: '',
        email: '',
        password: '',
        role: defaultRole,
        position: '', 
        category: 'Peón', 
        amount: '', 
        start_date: new Date().toISOString().split('T')[0],
        contract_end_date: '',
        has_children: false,
        children_count: '',
        afp: '',
        has_afp_input: false
      });
    }
  }, [userToEdit, isOpen, activeTab]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validación especial para Documento
    if (name === 'document_number') {
      // Solo permitir números
      const onlyNums = value.replace(/\D/g, '');
      // Respetar límite según tipo (8 o 9)
      if (onlyNums.length <= docLimit) {
        setFormData({ ...formData, [name]: onlyNums });
      }
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  // Manejador especial para cambio de tipo de documento
  const handleDocTypeChange = (e) => {
    setFormData({ 
      ...formData, 
      document_type: e.target.value,
      document_number: '' // Limpiar número al cambiar tipo para evitar errores
    });
  };

  const toggleSwitch = (field) => {
    if (field === 'has_children') {
      setFormData(prev => ({ ...prev, has_children: !prev.has_children, children_count: !prev.has_children ? '' : '' }));
    } else if (field === 'has_afp_input') {
      setFormData(prev => ({ ...prev, has_afp_input: !prev.has_afp_input, afp: !prev.has_afp_input ? '' : '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      const payload = {
        full_name: formData.full_name,
        document_type: formData.document_type, // Guardamos el tipo
        document_number: formData.document_number,
        email: activeTab === 'workers' ? formData.document_number : formData.email,
        role: activeTab === 'workers' ? 'worker' : formData.role,
        
        has_children: formData.has_children,
        children_count: formData.has_children ? (parseInt(formData.children_count) || 0) : 0,
        afp: formData.has_afp_input ? formData.afp : null
      };

      if (!userToEdit || formData.password) {
        const plainPassword = formData.password || formData.document_number;
        const salt = await bcrypt.genSalt(10);
        payload.password = await bcrypt.hash(plainPassword, salt);
      }

      if (activeTab === 'staff') {
        payload.entry_date = formData.start_date;
        payload.position = formData.position;
        payload.salary = parseFloat(formData.amount || 0); 
        payload.contract_end_date = formData.contract_end_date || null;
      } else {
        payload.start_date = formData.start_date;
        payload.category = formData.category;
        payload.weekly_rate = parseFloat(formData.amount || 0);
        if(!userToEdit) {
            payload.project_assigned = 'Sin asignar';
            payload.status = 'Activo';
        }
        payload.contract_end_date = formData.contract_end_date || null;
      }

      let error;
      if (userToEdit) {
        const { error: updateError } = await supabase.from(table).update(payload).eq('id', userToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from(table).insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setNotification({
        isOpen: true,
        type: 'success',
        title: userToEdit ? '¡Actualizado!' : '¡Registrado!',
        message: `Usuario ${formData.full_name} guardado correctamente.`
      });

    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al guardar.'
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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              variants={overlayVariants}
              initial="hidden" animate="visible" exit="exit"
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={onClose} 
            />
            
            <motion.div 
              variants={modalVariants}
              initial="hidden" animate="visible" exit="exit"
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">
                  {userToEdit ? 'Editar' : 'Nuevo'} {activeTab === 'staff' ? 'Colaborador' : 'Obrero'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                
                {/* 1. DATOS PERSONALES */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input name="full_name" required value={formData.full_name} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" placeholder="Apellidos y Nombres"/>
                  </div>
                </div>

                {/* SELECTOR DE DOCUMENTO */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                        <div className="relative">
                            <select 
                                name="document_type" 
                                value={formData.document_type} 
                                onChange={handleDocTypeChange} 
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] appearance-none"
                            >
                                <option value="DNI">DNI</option>
                                <option value="CE">C.E.</option>
                            </select>
                            {/* Flechita custom */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Número ({docLimit} dígitos)</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                name="document_number" 
                                required 
                                value={formData.document_number} 
                                onChange={handleChange} 
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] font-mono" 
                                maxLength={docLimit} 
                                placeholder={`Ingrese ${docLimit} números`}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Categoría / Cargo */}
                <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">{activeTab === 'staff' ? 'Cargo' : 'Categoría'}</label>
                     <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        {activeTab === 'staff' ? (
                        <input name="position" required value={formData.position} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" placeholder="Ej: Arquitecto"/>
                        ) : (
                        <select name="category" value={formData.category} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] appearance-none">
                            <option value="Peón">Peón</option>
                            <option value="Oficial">Oficial</option>
                            <option value="Operario">Operario</option>
                            <option value="Capataz">Capataz</option>
                        </select>
                        )}
                     </div>
                </div>

                {/* 2. CREDENCIALES (LÓGICA AUTOMÁTICA OBREROS) */}
                <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-[#003366] mb-3 flex items-center gap-1 uppercase">
                        <Shield size={14}/> Credenciales de Acceso
                    </h4>
                    
                    <div className="space-y-3">
                        {/* Correo / Usuario (Solo editable para Staff) */}
                        {activeTab === 'staff' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="email" 
                                        name="email" 
                                        value={formData.email} 
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" 
                                        placeholder="usuario@constructora.com"
                                    />
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'workers' && (
                             <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                    <Shield size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-blue-800">Acceso Automático</p>
                                    <p className="text-xs text-blue-600">El usuario para ingresar será el número de documento.</p>
                                </div>
                             </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            {/* Contraseña */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" placeholder={userToEdit ? "Opcional" : "DNI por defecto"}/>
                                </div>
                            </div>
                            
                            {/* Rol (Solo visible para Staff) */}
                            {activeTab === 'staff' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Rol</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select name="role" value={formData.role} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] appearance-none">
                                            <option value="admin">Administrador</option>
                                            <option value="resident">Residente</option>
                                            <option value="hr">Recursos Humanos</option>
                                            <option value="logistica">Logística</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. INFORMACIÓN ADICIONAL (Hijos y AFP) */}
                <div className="pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">Hijos</label>
                                <button type="button" onClick={() => toggleSwitch('has_children')} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.has_children ? 'bg-[#003366]' : 'bg-slate-300'}`}>
                                    <span className={`${formData.has_children ? 'translate-x-4' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200`} />
                                </button>
                            </div>
                            {formData.has_children && (
                                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} type="number" name="children_count" value={formData.children_count} onChange={handleChange} placeholder="Cantidad" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" />
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">AFP</label>
                                <button type="button" onClick={() => toggleSwitch('has_afp_input')} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${formData.has_afp_input ? 'bg-[#003366]' : 'bg-slate-300'}`}>
                                    <span className={`${formData.has_afp_input ? 'translate-x-4' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200`} />
                                </button>
                            </div>
                            {formData.has_afp_input && (
                                <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} name="afp" value={formData.afp} onChange={handleChange} placeholder="Nombre AFP" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" />
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. DATOS LABORALES FINALES */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{activeTab === 'staff' ? 'Salario (S/)' : 'Jornal (S/)'}</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" name="amount" required value={formData.amount} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" placeholder="0.00"/>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha Ingreso</label>
                    <input type="date" name="start_date" required value={formData.start_date} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" />
                  </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vencimiento Contrato</label>
                    <input type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]" />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                  <button disabled={loading} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 flex justify-center items-center gap-2 shadow-lg active:scale-95 transition">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> {userToEdit ? 'Guardar Cambios' : 'Registrar'}</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <StatusModal isOpen={notification.isOpen} onClose={handleNotificationClose} type={notification.type} title={notification.title} message={notification.message} />
    </>
  );
};
export default CreateUserModal;