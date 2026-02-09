import React, { useState, useEffect } from 'react';
import { HardHat, Plus, Shield, FileText, Trash2, Upload, X, Calendar, AlertTriangle, Check, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression'; 
import { getWorkerEPPs, assignEPP, deleteEPPRecord } from '../../../services/ssomaService';

// IMPORTAMOS EL MODAL DE ALERTAS
import StatusModal from '../../../components/common/StatusModal';

const WorkerEPPManager = ({ workerId }) => {
  const [epps, setEpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ESTADO PARA EL MODAL DE ALERTAS
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success', // 'success' | 'error' | 'warning'
    title: '',
    message: ''
  });

  const [formData, setFormData] = useState({
    epp_type: 'Casco de Seguridad',
    delivery_date: new Date().toISOString().split('T')[0],
    renewal_date: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (workerId) loadEPPs();
  }, [workerId]);

  useEffect(() => {
    if (formData.delivery_date) {
        const date = new Date(formData.delivery_date);
        date.setMonth(date.getMonth() + 6);
        setFormData(prev => ({ ...prev, renewal_date: date.toISOString().split('T')[0] }));
    }
  }, [formData.delivery_date]);

  const loadEPPs = async () => {
    try {
      const data = await getWorkerEPPs(workerId);
      setEpps(data || []);
    } catch (error) {
      console.error("Error cargando EPPs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        try {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            setSelectedFile(compressedFile);
        } catch (error) {
            console.error("Error comprimiendo:", error);
            setSelectedFile(file);
        }
    } else {
        setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      await assignEPP({
        worker_id: workerId,
        epp_type: formData.epp_type,
        delivery_date: formData.delivery_date,
        renewal_date: formData.renewal_date,
        notes: formData.notes
      }, selectedFile);

      setShowModal(false);
      
      // Limpiar formulario
      setFormData({ 
          epp_type: 'Casco de Seguridad', 
          delivery_date: new Date().toISOString().split('T')[0], 
          renewal_date: '', 
          notes: '' 
      });
      setSelectedFile(null);
      loadEPPs();

      // MOSTRAR ALERTA DE ÉXITO
      setStatusModal({
        isOpen: true,
        type: 'success',
        title: '¡Entrega Registrada!',
        message: 'El EPP ha sido asignado correctamente al trabajador.'
      });

    } catch (error) {
      console.error(error);
      // MOSTRAR ALERTA DE ERROR
      setStatusModal({
        isOpen: true,
        type: 'error',
        title: 'Error al Guardar',
        message: error.message || 'No se pudo registrar la entrega. Intenta nuevamente.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    // Usamos el confirm nativo rápido, o podrías usar el modal también si prefieres
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      try {
        await deleteEPPRecord(id);
        loadEPPs();
        setStatusModal({
            isOpen: true,
            type: 'success',
            title: 'Registro Eliminado',
            message: 'La entrega de EPP fue borrada del historial.'
        });
      } catch (error) {
        setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: 'No se pudo eliminar el registro.'
        });
      }
    }
  };

  const getIcon = (type) => {
    if (type.includes('Casco')) return <HardHat size={18}/>;
    if (type.includes('Botas')) return <div className="font-bold text-[10px] border border-current rounded px-1">BOT</div>;
    return <Shield size={18}/>;
  };

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER DE SECCIÓN */}
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-white p-5 rounded-2xl border border-blue-100/50 shadow-sm">
        <div>
          <h3 className="font-bold text-[#003366] text-lg flex items-center gap-2">
            <Shield className="text-blue-500" size={24}/> Gestión de EPPs
          </h3>
          <p className="text-xs text-slate-500 mt-1">Historial y asignación de equipos de protección.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="bg-[#003366] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition flex items-center gap-2"
        >
          <Plus size={18}/> Asignar Equipo
        </motion.button>
      </div>

      {/* --- MODAL FORMULARIO --- */}
      <AnimatePresence>
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowModal(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 overflow-hidden"
                >
                    <div className="px-8 pt-8 pb-4 flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nueva Entrega</h2>
                            <p className="text-slate-400 font-medium text-sm mt-1">Registra la asignación de un EPP.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 transition">
                            <X size={20}/>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
                        <div className="space-y-2 group">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Tipo de Equipo</label>
                            <div className="relative">
                                <HardHat className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20}/>
                                <select 
                                    className="w-full pl-12 pr-10 py-4 bg-slate-50 border-none rounded-2xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                                    value={formData.epp_type}
                                    onChange={e => setFormData({...formData, epp_type: e.target.value})}
                                >
                                    <option>Casco de Seguridad</option>
                                    <option>Botas de Seguridad (Punta Acero)</option>
                                    <option>Chaleco Reflectivo</option>
                                    <option>Lentes de Seguridad</option>
                                    <option>Guantes de Protección</option>
                                    <option>Arnés de Cuerpo Entero</option>
                                    <option>Protección Auditiva</option>
                                    <option>Uniforme Completo</option>
                                    <option>Respirador / Mascarilla</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Fecha Entrega</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18}/>
                                    <input 
                                        type="date"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-slate-700 font-bold focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                                        value={formData.delivery_date}
                                        onChange={e => setFormData({...formData, delivery_date: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-xs font-bold text-orange-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                                    <Clock size={12}/> Vencimiento
                                </label>
                                <input 
                                    type="date"
                                    className="w-full px-4 py-3.5 bg-orange-50/50 border-none rounded-2xl text-orange-800 font-bold focus:ring-2 focus:ring-orange-100 focus:bg-orange-50 transition-all outline-none"
                                    value={formData.renewal_date}
                                    onChange={e => setFormData({...formData, renewal_date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Evidencia (Cargo)</label>
                             <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative group overflow-hidden ${
                                 selectedFile ? 'border-green-400 bg-green-50/30' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                             }`}>
                                <input 
                                  type="file" 
                                  accept="image/*,.pdf"
                                  onChange={handleFileChange}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                />
                                
                                <AnimatePresence mode="wait">
                                    {selectedFile ? (
                                        <motion.div 
                                            key="file-selected"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="flex flex-col items-center gap-2"
                                        >
                                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-1">
                                                <Check size={20} strokeWidth={3} />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 truncate max-w-[250px]">{selectedFile.name}</span>
                                            <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Listo para subir</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="upload-prompt"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-blue-500 transition-colors"
                                        >
                                           <div className="p-3 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors">
                                              <Upload size={24}/>
                                           </div>
                                           <div className="flex flex-col">
                                               <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600">Sube el cargo firmado</span>
                                               <span className="text-[10px] text-slate-400">PDF o Imagen (Autocomprimido)</span>
                                           </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                             </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={uploading}
                                className="flex-1 py-4 bg-[#003366] text-white font-bold rounded-2xl hover:bg-blue-900 shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex justify-center items-center gap-3"
                            >
                                {uploading ? (
                                    <>
                                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                      <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                      <Shield size={20}/> Confirmar Entrega
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* --- TABLA HISTÓRICA --- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
         <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
               <tr>
                  <th className="p-4 pl-6">Equipo Entregado</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Evidencia</th>
                  <th className="p-4 text-center"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {loading ? (
                 <tr><td colSpan="5" className="p-8 text-center text-slate-400">Cargando historial...</td></tr>
               ) : epps.length === 0 ? (
                 <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                             <Shield size={24} className="opacity-20"/>
                        </div>
                        <span className="text-xs font-medium">Sin registros aún</span>
                    </td>
                 </tr>
               ) : (
                 epps.map(item => {
                   const isExpired = item.renewal_date && new Date(item.renewal_date) < new Date();
                   return (
                   <tr key={item.id} className="hover:bg-slate-50 transition group">
                      <td className="p-4 pl-6">
                         <div className="flex items-center gap-3 font-bold text-slate-700">
                            <div className="text-blue-600 bg-blue-50 p-2 rounded-lg">{getIcon(item.epp_type)}</div>
                            {item.epp_type}
                         </div>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                         {new Date(item.delivery_date).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                         {item.renewal_date ? (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                               isExpired
                               ? 'bg-red-50 text-red-600 border-red-100' 
                               : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                               {isExpired && <AlertTriangle size={12}/>}
                               {new Date(item.renewal_date).toLocaleDateString()}
                            </div>
                         ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="p-4 text-center">
                         {item.file_url ? (
                            <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                               <FileText size={14}/> Ver Cargo
                            </a>
                         ) : <span className="text-slate-300 text-xs">-</span>}
                      </td>
                      <td className="p-4 text-center">
                         <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                            <Trash2 size={16}/>
                         </button>
                      </td>
                   </tr>
                 )})
               )}
            </tbody>
         </table>
      </div>

      {/* --- AQUÍ ESTÁ EL MODAL DE ALERTAS INTEGRADO --- */}
      <StatusModal 
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />

    </div>
  );
};

export default WorkerEPPManager;