import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Briefcase, DollarSign, Loader2 } from 'lucide-react';
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

  const [formData, setFormData] = useState({
    full_name: '',
    document_number: '',
    position: '', 
    category: 'Peón', 
    amount: '', 
    start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    password: '' 
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        full_name: userToEdit.full_name || '',
        document_number: userToEdit.document_number || '',
        position: userToEdit.position || '',
        category: userToEdit.category || 'Peón',
        amount: userToEdit.salary || userToEdit.weekly_rate || '',
        start_date: userToEdit.start_date || userToEdit.entry_date || '',
        contract_end_date: userToEdit.contract_end_date || '',
        password: '' 
      });
    } else {
      setFormData({
        full_name: '',
        document_number: '',
        position: '', 
        category: 'Peón', 
        amount: '', 
        start_date: new Date().toISOString().split('T')[0],
        contract_end_date: '',
        password: '' 
      });
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const table = activeTab === 'staff' ? 'employees' : 'workers';
      
      const payload = {
        full_name: formData.full_name,
        document_number: formData.document_number,
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
        // [CAMBIO] Ahora el staff también guarda fecha de contrato
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
        const { error: updateError } = await supabase
          .from(table)
          .update(payload)
          .eq('id', userToEdit.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from(table)
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      setNotification({
        isOpen: true,
        type: 'success',
        title: userToEdit ? '¡Actualización Exitosa!' : '¡Registro Exitoso!',
        message: userToEdit 
          ? `Los datos de ${formData.full_name} han sido actualizados.`
          : `Se ha registrado a ${formData.full_name} correctamente.`
      });

    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo guardar los cambios.'
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">
                  {userToEdit ? 'Editar' : 'Nuevo'} {activeTab === 'staff' ? 'Colaborador' : 'Obrero'}
                </h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition"><X size={20}/></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      name="full_name" required value={formData.full_name} onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">DNI / CE</label>
                    <input 
                      name="document_number" required value={formData.document_number} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {activeTab === 'staff' ? 'Salario Mensual' : 'Jornal Semanal'}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="number" name="amount" required value={formData.amount} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha Ingreso</label>
                    <input 
                      type="date" name="start_date" required value={formData.start_date} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Vence Contrato/SSTR
                    </label>
                    <input 
                      type="date" name="contract_end_date" value={formData.contract_end_date} onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                      // [CAMBIO] Ya no está deshabilitado para staff
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    {activeTab === 'staff' ? 'Cargo' : 'Categoría'}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    {activeTab === 'staff' ? (
                      <input 
                        name="position" required value={formData.position} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                      />
                    ) : (
                      <select 
                        name="category" value={formData.category} onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366] appearance-none"
                      >
                        <option value="Peón">Peón</option>
                        <option value="Oficial">Oficial</option>
                        <option value="Operario">Operario</option>
                        <option value="Capataz">Capataz</option>
                      </select>
                    )}
                  </div>
                </div>

                {userToEdit && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cambiar Contraseña (Opcional)</label>
                        <input 
                            type="password" name="password" value={formData.password} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#003366]"
                            placeholder="Dejar en blanco para mantener la actual"
                        />
                    </div>
                )}

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