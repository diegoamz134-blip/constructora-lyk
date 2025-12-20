import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowRightLeft, AlertTriangle, Briefcase, HardHat } from 'lucide-react';
import { supabase } from '../../../services/supabase';

const SwitchRoleModal = ({ isOpen, onClose, user, currentRole, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  // Campos específicos para el nuevo rol
  const [newSalary, setNewSalary] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newCategory, setNewCategory] = useState('Peon');
  const [dailyRate, setDailyRate] = useState('');

  if (!isOpen || !user) return null;

  const targetRole = currentRole === 'staff' ? 'workers' : 'staff';
  const targetLabel = targetRole === 'workers' ? 'Obrero' : 'Staff';

  const handleSwitch = async () => {
    if (!window.confirm(`¿Seguro que deseas cambiar a ${user.full_name} a ${targetLabel}?`)) return;
    
    setLoading(true);
    try {
      // 1. Datos comunes
      const commonData = {
        full_name: user.full_name,
        document_number: user.document_number,
        email: user.email,
        phone: user.phone,
        address: user.address,
        birth_date: user.birth_date,
        start_date: user.start_date || user.entry_date,
        pension_system: user.pension_system || user.afp,
        status: user.status || 'Activo',
        has_children: user.has_children,
        children_count: user.children_count,
        bank_name: user.bank_name,
        bank_account: user.bank_account
      };

      // 2. Insertar en destino
      if (targetRole === 'workers') {
         // STAFF -> WORKER
         const { error } = await supabase.from('workers').insert([{
             ...commonData,
             category: newCategory,
             custom_daily_rate: dailyRate ? parseFloat(dailyRate) : null,
             project_assigned: 'Sin asignar'
         }]);
         if (error) throw error;
         
         // Borrar origen
         await supabase.from('employees').delete().eq('id', user.id);

      } else {
         // WORKER -> STAFF
         const { error } = await supabase.from('employees').insert([{
             ...commonData,
             position: newPosition || 'Auxiliar',
             salary: newSalary ? parseFloat(newSalary) : 0,
             role: 'user'
         }]);
         if (error) throw error;

         // Borrar origen
         await supabase.from('workers').delete().eq('id', user.id);
      }

      alert('Cambio de rol exitoso.');
      onSuccess();
      onClose();

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 p-5 border-b flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex gap-2"><ArrowRightLeft size={20} className="text-[#003366]"/> Cambiar Rol</h3>
            <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
        </div>
        
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Actual</span>
                    <p className="font-bold text-slate-700 flex gap-1 justify-center"><Briefcase size={16}/> {currentRole === 'staff' ? 'Staff' : 'Obrero'}</p>
                </div>
                <ArrowRightLeft className="text-blue-300"/>
                <div className="text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Nuevo</span>
                    <p className="font-bold text-[#003366] flex gap-1 justify-center"><HardHat size={16}/> {targetLabel}</p>
                </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800 flex gap-2">
                <AlertTriangle size={16} className="shrink-0"/>
                <p>Se moverán los datos personales a la nueva tabla.</p>
            </div>

            <div className="space-y-3 pt-2">
                <p className="text-sm font-bold border-b pb-1">Datos Nuevos</p>
                {targetRole === 'workers' ? (
                    <>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Categoría</label>
                            <select className="w-full p-2 border rounded-lg text-sm" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                                <option value="Peon">Peón</option>
                                <option value="Oficial">Oficial</option>
                                <option value="Operario">Operario</option>
                                <option value="Capataz">Capataz</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Jornal (Opcional)</label>
                            <input type="number" className="w-full p-2 border rounded-lg text-sm" placeholder="Vacío = Según Tabla" value={dailyRate} onChange={e => setDailyRate(e.target.value)} />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Cargo</label>
                            <input type="text" className="w-full p-2 border rounded-lg text-sm" placeholder="Ej. Asistente" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Sueldo Mensual</label>
                            <input type="number" className="w-full p-2 border rounded-lg text-sm" placeholder="0.00" value={newSalary} onChange={e => setNewSalary(e.target.value)} />
                        </div>
                    </>
                )}
            </div>

            <button onClick={handleSwitch} disabled={loading} className="w-full py-3 bg-[#003366] text-white rounded-xl font-bold mt-2 hover:bg-[#002244]">
                {loading ? 'Procesando...' : 'Confirmar Cambio'}
            </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SwitchRoleModal;