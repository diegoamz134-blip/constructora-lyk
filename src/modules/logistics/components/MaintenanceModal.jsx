import React, { useState, useEffect } from 'react';
import { X, Wrench, Calendar, Plus, Save, Clock, DollarSign, User } from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';
import { format } from 'date-fns';

const MaintenanceModal = ({ isOpen, onClose, asset }) => {
  const [history, setHistory] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario nuevo mantenimiento
  const [newMaint, setNewMaint] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    type: 'Preventivo',
    description: '',
    cost: '',
    performed_by: '',
    next_maintenance_date: ''
  });

  useEffect(() => {
    if (isOpen && asset) {
      loadHistory();
      setShowForm(false);
    }
  }, [isOpen, asset]);

  const loadHistory = async () => {
    try {
      const data = await logisticsService.getMaintenanceHistory(asset.id);
      setHistory(data);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await logisticsService.registerMaintenance({
        ...newMaint,
        asset_id: asset.id
      });
      Swal.fire('Registrado', 'Mantenimiento guardado correctamente.', 'success');
      setNewMaint({ maintenance_date: new Date().toISOString().split('T')[0], type: 'Preventivo', description: '', cost: '', performed_by: '', next_maintenance_date: '' });
      setShowForm(false);
      loadHistory(); // Recargar lista
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar el registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Wrench className="text-slate-500"/> Mantenimiento</h2>
            <p className="text-slate-500 text-sm font-medium">{asset.name} <span className="text-slate-300">|</span> {asset.brand} {asset.model}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {!showForm ? (
            <>
              <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-slate-700">Historial de Servicios</h3>
                 <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all"><Plus size={14}/> Registrar Nuevo</button>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                   <Clock size={32} className="mx-auto mb-2 opacity-50"/>
                   <p>No hay registros de mantenimiento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div key={item.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                       <div className="flex justify-between items-start">
                          <div>
                             <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${item.type === 'Preventivo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{item.type}</span>
                                <span className="text-xs text-slate-400 font-mono">{format(new Date(item.maintenance_date), 'dd/MM/yyyy')}</span>
                             </div>
                             <p className="text-sm text-slate-700 font-medium">{item.description}</p>
                             <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                <User size={12}/> {item.performed_by || 'Taller Externo'}
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="block font-bold text-slate-700">S/ {Number(item.cost).toFixed(2)}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 animate-in slide-in-from-right duration-300">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="font-bold text-slate-700">Registrar Mantenimiento</h3>
                 <button type="button" onClick={() => setShowForm(false)} className="text-xs font-bold text-red-500 hover:underline">Cancelar</button>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Fecha Realizado</label>
                     <input type="date" required className="w-full p-2 border rounded-lg" value={newMaint.maintenance_date} onChange={e => setNewMaint({...newMaint, maintenance_date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Tipo</label>
                     <select className="w-full p-2 border rounded-lg" value={newMaint.type} onChange={e => setNewMaint({...newMaint, type: e.target.value})}>
                        <option value="Preventivo">Preventivo</option>
                        <option value="Correctivo">Correctivo (Reparación)</option>
                     </select>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Descripción del Trabajo</label>
                  <textarea required rows="3" className="w-full p-2 border rounded-lg" placeholder="Cambio de filtros, aceite, revisión de frenos..." value={newMaint.description} onChange={e => setNewMaint({...newMaint, description: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Costo (S/)</label>
                     <div className="relative"><DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/><input type="number" step="0.01" className="w-full pl-7 p-2 border rounded-lg" value={newMaint.cost} onChange={e => setNewMaint({...newMaint, cost: e.target.value})} /></div>
                  </div>
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-500">Realizado por</label>
                     <input type="text" className="w-full p-2 border rounded-lg" placeholder="Mecánico o Taller" value={newMaint.performed_by} onChange={e => setNewMaint({...newMaint, performed_by: e.target.value})} />
                  </div>
               </div>

               <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <label className="text-xs font-bold text-blue-700 block mb-1">📅 Programar Siguiente Mantenimiento</label>
                  <input type="date" className="w-full p-2 border border-blue-200 rounded-lg bg-white" value={newMaint.next_maintenance_date} onChange={e => setNewMaint({...newMaint, next_maintenance_date: e.target.value})} />
                  <p className="text-[10px] text-blue-500 mt-1">Al guardar, se actualizará la fecha de alerta del activo.</p>
               </div>

               <button type="submit" disabled={loading} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all flex justify-center gap-2">
                  {loading ? 'Guardando...' : <><Save size={18}/> Guardar Registro</>}
               </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;