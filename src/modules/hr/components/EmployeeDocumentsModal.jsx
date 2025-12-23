import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Eye, RefreshCw, CheckCircle, AlertCircle, 
  Loader2, Calendar, ArrowLeft, Clock, AlertTriangle, FileText
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import StatusModal from '../../../components/common/StatusModal'; 

// --- ANIMACIONES ---
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

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

// --- LISTA DE DOCUMENTOS ---
const DOC_TYPES = [
  "CV Documentado",
  "DNI",
  "CULL",
  "CARNET RECC",
  "EMO",
  "PÓLIZA VIDA LEY",
  "PÓLIZA SCTR",
  "FICHA DE INGRESO",
  "CONSTANCIA DE ESCOLARIDAD",
  "DNI DE LOS HIJOS",
  "OTROS"
];

const EmployeeDocumentsModal = ({ isOpen, onClose, person }) => {
  const [documents, setDocuments] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Estado para controlar la vista (Lista o Formulario)
  const [view, setView] = useState('list'); 
  const [activeDocType, setActiveDocType] = useState(null); 

  // Estado del Formulario
  const [formData, setFormData] = useState({
    startDate: '',
    expirationDate: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Notificaciones
  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });

  useEffect(() => {
    if (isOpen && person) {
      fetchDocuments();
      resetForm();
    }
  }, [isOpen, person]);

  const fetchDocuments = async () => {
    setLoadingList(true);
    try {
        const { data } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('person_id', person.id)
        .eq('person_type', person.type || (person.role === 'worker' ? 'worker' : 'employee')); 
        setDocuments(data || []);
    } catch (err) {
        console.error("Error fetching docs:", err);
    } finally {
        setLoadingList(false);
    }
  };

  const resetForm = () => {
    setView('list');
    setActiveDocType(null);
    setFormData({ startDate: '', expirationDate: '', file: null });
    setUploading(false);
  };

  // --- LÓGICA DE ALERTAS (SEMÁFORO) ---
  const getDocStatus = (doc) => {
    if (!doc) return { color: 'bg-slate-100 text-slate-400', icon: AlertCircle, label: 'Pendiente', border: 'border-slate-100' };

    if (!doc.expiration_date) return { color: 'bg-blue-50 text-blue-600', icon: CheckCircle, label: 'Subido', border: 'border-blue-100' };

    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(doc.expiration_date + 'T00:00:00');
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { color: 'bg-red-50 text-red-600', icon: AlertCircle, label: 'VENCIDO', border: 'border-red-200' };
    } else if (diffDays <= 30) {
        return { color: 'bg-orange-50 text-orange-600', icon: AlertTriangle, label: `Vence en ${diffDays} días`, border: 'border-orange-200' };
    } else {
        return { color: 'bg-green-50 text-green-600', icon: CheckCircle, label: 'Vigente', border: 'border-green-200' };
    }
  };

  // --- MANEJADORES ---
  const handleOpenForm = (docType) => {
    setActiveDocType(docType);
    const existingDoc = documents.find(d => d.doc_type === docType);
    
    setFormData({
        startDate: existingDoc?.start_date || '',
        expirationDate: existingDoc?.expiration_date || '',
        file: null
    });
    setView('form');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSave = async () => {
    // Validación: Si no hay archivo nuevo y tampoco existe uno previo, error.
    const existingDoc = documents.find(d => d.doc_type === activeDocType);
    if (!formData.file && !existingDoc) {
        alert("Debes seleccionar un archivo.");
        return;
    }

    setUploading(true);
    try {
      let publicUrl = null;

      // 1. SI SE SUBE UN ARCHIVO NUEVO
      if (formData.file) {
          // A. LIMPIEZA: BORRAR EL ARCHIVO ANTIGUO DEL STORAGE SI EXISTE
          if (existingDoc && existingDoc.file_url) {
             try {
                 // Extraemos la ruta relativa del archivo antiguo
                 // URL típica: .../hr-documents/worker/123/dni_...
                 const bucketName = 'hr-documents';
                 const urlParts = existingDoc.file_url.split(`${bucketName}/`);
                 
                 if (urlParts.length > 1) {
                     const oldPath = decodeURIComponent(urlParts[1]); // Decodificar por si tiene espacios
                     console.log("Eliminando archivo antiguo:", oldPath);
                     await supabase.storage.from(bucketName).remove([oldPath]);
                 }
             } catch (deleteErr) {
                 console.warn("No se pudo eliminar el archivo físico antiguo (puede que ya no exista):", deleteErr);
                 // Continuamos sin error crítico
             }
          }

          // B. SUBIDA: CARGAR EL NUEVO ARCHIVO
          const fileExt = formData.file.name.split('.').pop();
          const cleanDocType = activeDocType.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitizar nombre
          const fileName = `${person.type || (person.role === 'worker' ? 'worker' : 'employee')}/${person.id}/${cleanDocType}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('hr-documents')
            .upload(fileName, formData.file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('hr-documents').getPublicUrl(fileName);
          publicUrl = data.publicUrl;
      }

      // 2. ACTUALIZAR BASE DE DATOS
      // Borramos el registro antiguo (la fila en BD)
      await supabase.from('hr_documents').delete()
        .eq('person_id', person.id)
        .eq('doc_type', activeDocType);

      // Insertamos el nuevo registro con la nueva URL (o la vieja si no se cambió archivo) y las nuevas fechas
      const { error: dbError } = await supabase.from('hr_documents').insert([{
        person_id: person.id,
        person_type: person.type || (person.role === 'worker' ? 'worker' : 'employee'),
        doc_type: activeDocType,
        file_url: publicUrl || existingDoc?.file_url, // Si no hubo archivo nuevo, mantenemos el link del viejo
        start_date: formData.startDate || null,
        expiration_date: formData.expirationDate || null
      }]);

      if (dbError) throw dbError;

      // 3. FINALIZAR
      await fetchDocuments();
      setNotification({
        isOpen: true, type: 'success', title: 'Actualizado', 
        message: 'El documento ha sido renovado correctamente.'
      });
      resetForm();

    } catch (error) {
      console.error(error);
      setNotification({
        isOpen: true, type: 'error', title: 'Error', 
        message: 'No se pudo guardar el documento. Intenta de nuevo.'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <AnimatePresence mode='wait'>
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Legajo Digital</h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <span className="font-bold text-[#003366]">{person?.full_name}</span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] uppercase font-bold text-slate-600">
                        {person?.category || person?.position || 'Personal'}
                    </span>
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition"><X size={20} /></button>
              </div>

              {/* CONTENIDO CAMBIANTE (LISTA vs FORMULARIO) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-white relative">
                 <AnimatePresence mode="wait">
                    
                    {/* VISTA 1: LISTA DE DOCUMENTOS */}
                    {view === 'list' && (
                        <motion.div 
                            key="list"
                            variants={contentVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="p-8 space-y-4"
                        >
                            {loadingList ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-300"/></div>
                            ) : (
                                DOC_TYPES.map((docType) => {
                                    const existingDoc = documents.find(d => d.doc_type === docType);
                                    const status = getDocStatus(existingDoc);
                                    const StatusIcon = status.icon;

                                    return (
                                        <div key={docType} className={`flex items-center justify-between p-4 border rounded-xl hover:shadow-sm transition-all bg-white ${status.border}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.color}`}>
                                                    <StatusIcon size={20} />
                                                </div>
                                                <div>
                                                    <h4 className={`font-bold text-sm text-slate-700`}>{docType}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${status.color.replace('text-', 'bg-opacity-20 ')}`}>
                                                            {status.label}
                                                        </span>
                                                        {existingDoc?.expiration_date && (
                                                            <span className="text-xs text-slate-400">Vence: {existingDoc.expiration_date}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                {existingDoc && (
                                                    <a 
                                                        href={existingDoc.file_url} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="p-2 text-slate-400 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                        title="Ver Documento"
                                                    >
                                                        <Eye size={18} />
                                                    </a>
                                                )}

                                                <button 
                                                    onClick={() => handleOpenForm(docType)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                                                        existingDoc 
                                                        ? 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200' 
                                                        : 'bg-blue-50 text-[#003366] hover:bg-blue-100 border border-blue-100'
                                                    }`}
                                                >
                                                    {existingDoc ? <RefreshCw size={14} /> : <Upload size={14} />}
                                                    {existingDoc ? 'Actualizar' : 'Subir'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    )}

                    {/* VISTA 2: FORMULARIO DE CARGA */}
                    {view === 'form' && (
                        <motion.div 
                            key="form"
                            variants={contentVariants}
                            initial="hidden" animate="visible" exit="exit"
                            className="p-8 h-full flex flex-col"
                        >
                            <button onClick={resetForm} className="mb-6 text-slate-400 hover:text-slate-600 flex items-center gap-2 text-sm font-bold transition-colors w-fit">
                                <ArrowLeft size={16}/> Volver a la lista
                            </button>

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex-1 flex flex-col justify-center">
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-blue-100 text-[#003366] rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Upload size={24}/>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Subir {activeDocType}</h3>
                                    <p className="text-slate-500 text-sm">Completa la vigencia para activar las alertas.</p>
                                </div>

                                <div className="space-y-5 max-w-sm mx-auto w-full">
                                    {/* Inputs de Fecha */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <Calendar size={12}/> Emisión
                                            </label>
                                            <input 
                                                type="date" 
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 text-orange-600">
                                                <Clock size={12}/> Vencimiento
                                            </label>
                                            <input 
                                                type="date" 
                                                value={formData.expirationDate}
                                                onChange={(e) => setFormData({...formData, expirationDate: e.target.value})}
                                                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="text-[10px] text-slate-400 text-center bg-white p-2 rounded border border-slate-100">
                                        Si el documento no tiene caducidad (ej. DNI), deja la fecha vacía.
                                    </div>

                                    {/* Selección de Archivo */}
                                    <div 
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer relative"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            className="hidden" 
                                            accept=".pdf,.jpg,.png,.jpeg"
                                            onChange={handleFileChange}
                                        />
                                        {formData.file ? (
                                            <div className="text-[#003366] font-bold text-sm flex items-center justify-center gap-2">
                                                <FileText size={16}/> {formData.file.name}
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm text-slate-500 font-medium">Clic para seleccionar archivo</span>
                                                <p className="text-xs text-slate-400 mt-1">PDF o Imagen (Máx 5MB)</p>
                                            </>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handleSave}
                                        disabled={uploading}
                                        className="w-full py-3 bg-[#003366] hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                                    >
                                        {uploading ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
                                        {uploading ? 'Guardando...' : 'Guardar y Finalizar'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                 </AnimatePresence>
              </div>
              
              {/* Footer de Progreso (Solo visible en lista) */}
              {view === 'list' && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-2 px-2">
                        <span>Progreso del Legajo</span>
                        <span className="font-bold">{documents.length} / {DOC_TYPES.length}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(documents.length / DOC_TYPES.length) * 100}%` }}
                            className="h-full bg-green-500" 
                        />
                    </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
};

export default EmployeeDocumentsModal;