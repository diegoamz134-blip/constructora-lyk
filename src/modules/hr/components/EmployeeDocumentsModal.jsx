import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FileText, Download, Trash2, Calendar, Eye, 
  Loader2, AlertTriangle, Edit2, Save, XCircle, 
  Plus, UploadCloud, CheckCircle2, FilePlus 
} from 'lucide-react';
import { supabase } from '../../../services/supabase';
import StatusModal from '../../../components/common/StatusModal';

// --- CONFIGURACIÓN DE DOCUMENTOS REQUERIDOS ---
const REQUIRED_DOCS_STAFF = [
  'Curriculum Vitae', 'DNI / CE', 'Certificado Único Laboral', 
  'Renta de Quinta', 'Carnet de Vacunación', 'Asignación Familiar'
];

const REQUIRED_DOCS_WORKER = [
  'Curriculum Vitae', 'DNI / CE', 'Certificado Único Laboral', 
  'Carnet de Vacunación', 'Escolaridad'
];

const EmployeeDocumentsModal = ({ isOpen, onClose, person }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Edición y UX
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ start_date: '', expiration_date: '' });
  const [downloadingId, setDownloadingId] = useState(null);
  
  // Estado para Subida de Archivos
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadConfig, setUploadConfig] = useState({ type: '', isCustom: false }); 
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploadDates, setUploadDates] = useState({ start_date: '', expiration_date: '' });
  const [customTypeName, setCustomTypeName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Estado para Alertas
  const [notification, setNotification] = useState({ isOpen: false, type: '', title: '', message: '' });

  // Cargar documentos
  useEffect(() => {
    if (isOpen && person) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setEditingId(null);
    }
  }, [isOpen, person]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      if (!person?.id || !person?.type) {
        setDocuments([]);
        return;
      }

      const { data, error } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('person_id', person.id)
        .eq('person_type', person.type)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE DOCUMENTOS FALTANTES ---
  const processedDocuments = useMemo(() => {
    if (!person) return [];

    const requiredList = person.type === 'worker' ? REQUIRED_DOCS_WORKER : REQUIRED_DOCS_STAFF;
    const result = [];

    // 1. Mapear obligatorios
    requiredList.forEach(reqType => {
      const existingDoc = documents.find(d => d.doc_type.toLowerCase() === reqType.toLowerCase());
      
      if (existingDoc) {
        result.push({ ...existingDoc, status: 'uploaded', isRequired: true });
      } else {
        result.push({ 
          id: `missing-${reqType}`, 
          doc_type: reqType, 
          status: 'missing', 
          isRequired: true 
        });
      }
    });

    // 2. Agregar extras
    documents.forEach(doc => {
      const isInRequired = requiredList.some(req => req.toLowerCase() === doc.doc_type.toLowerCase());
      if (!isInRequired) {
        result.push({ ...doc, status: 'uploaded', isRequired: false });
      }
    });

    return result;
  }, [documents, person]);

  // --- FUNCIÓN DE LIMPIEZA DE NOMBRES (SOLUCIÓN DEL ERROR) ---
  const sanitizeFileName = (name) => {
    return name
      .normalize("NFD") // Descompone caracteres (ej: ú -> u + ´)
      .replace(/[\u0300-\u036f]/g, "") // Elimina los acentos
      .replace(/\s+/g, '_') // Reemplaza espacios por guiones bajos
      .replace(/[^a-zA-Z0-9._-]/g, ''); // Elimina cualquier otro caracter especial
  };

  // --- HANDLERS DE SUBIDA ---
  const handleOpenUpload = (type, isCustom = false) => {
    setUploadConfig({ type, isCustom });
    setCustomTypeName('');
    setFileToUpload(null);
    setUploadDates({ start_date: '', expiration_date: '' });
    setIsUploadModalOpen(true);
  };

  const handleUploadSubmit = async () => {
    if (!fileToUpload) return alert("Selecciona un archivo.");
    const finalDocType = uploadConfig.isCustom ? customTypeName.trim() : uploadConfig.type;
    if (!finalDocType) return alert("El tipo de documento es obligatorio.");

    setUploading(true);
    try {
      const fileExt = fileToUpload.name.split('.').pop();
      
      // AQUI APLICAMOS LA LIMPIEZA DEL NOMBRE
      const safeDocType = sanitizeFileName(finalDocType);
      const fileName = `${person.id}/${safeDocType}_${Date.now()}.${fileExt}`;

      // 1. Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(fileName, fileToUpload);
      
      if (uploadError) throw uploadError;

      // 2. Guardar en Base de Datos (Guardamos el tipo original con tildes para visualización)
      const { data, error: dbError } = await supabase.from('hr_documents').insert([{
        person_id: person.id,
        person_type: person.type,
        doc_type: finalDocType, // Guardamos "Certificado Único" (con tilde) para que se lea bien
        file_url: fileName,     // Pero el archivo se llama "Certificado_Unico" (sin tilde)
        start_date: uploadDates.start_date || null,
        expiration_date: uploadDates.expiration_date || null
      }]).select().single();

      if (dbError) throw dbError;

      // 3. Actualizar vista
      setDocuments(prev => [data, ...prev]);
      setIsUploadModalOpen(false);
      setNotification({ isOpen: true, type: 'success', title: 'Subida Exitosa', message: 'El documento se ha guardado correctamente.' });

    } catch (error) {
      console.error("Error subiendo:", error);
      alert("Error al subir el documento: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getPublicUrl = (path) => {
    if (!path) return '#';
    const { data } = supabase.storage.from('hr-documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleForceDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const { data, error } = await supabase.storage.from('hr-documents').download(doc.file_url);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      const fileName = doc.file_url.split('/').pop() || 'documento_descarga';
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descarga:", error);
      alert("No se pudo descargar.");
    } finally {
      setDownloadingId(null);
    }
  };

  const startEditing = (doc) => {
    setEditingId(doc.id);
    setEditFormData({
      start_date: doc.start_date || '',
      expiration_date: doc.expiration_date || ''
    });
  };

  const saveEditing = async (docId) => {
    try {
      const { error } = await supabase.from('hr_documents').update({
          start_date: editFormData.start_date || null,
          expiration_date: editFormData.expiration_date || null
        }).eq('id', docId);
      if (error) throw error;
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...editFormData } : d));
      setEditingId(null);
      setNotification({ isOpen: true, type: 'success', title: 'Actualizado', message: 'Fechas guardadas correctamente.' });
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron guardar los cambios.' });
    }
  };

  const handleDelete = async (docId, filePath) => {
    if (!window.confirm('¿Eliminar documento permanentemente?')) return;
    try {
      if (filePath) await supabase.storage.from('hr-documents').remove([filePath]);
      await supabase.from('hr_documents').delete().eq('id', docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      setNotification({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Documento borrado.' });
    } catch (error) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo eliminar.' });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
        
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText className="text-[#003366]" size={20}/> Legajo Digital
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${person?.type === 'worker' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {person?.type === 'worker' ? 'Obrero' : 'Staff'}
                </span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">
                  {person?.full_name} — {person?.document_number}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => handleOpenUpload('', true)} className="flex items-center gap-2 bg-[#003366] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors shadow-sm">
                  <Plus size={16}/> Agregar Otro Doc.
               </button>
               <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-red-500">
                 <X size={24}/>
               </button>
            </div>
          </div>

          {/* CUERPO GRID */}
          <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-full py-20 gap-3">
                <Loader2 className="animate-spin text-[#003366]" size={40}/>
                <p className="text-sm text-slate-400 font-medium">Cargando expediente...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedDocuments.map((doc, idx) => {
                  const isMissing = doc.status === 'missing';
                  const isEditing = editingId === doc.id;

                  // RENDERIZADO DE TARJETA
                  return (
                    <div key={doc.id || idx} className={`p-4 rounded-xl border transition-all group relative flex flex-col ${isMissing ? 'bg-slate-50 border-dashed border-slate-300' : 'bg-white border-slate-200 shadow-sm hover:shadow-md'} ${isEditing ? 'ring-2 ring-orange-200 border-orange-300' : ''}`}>
                      
                      {/* Cabecera Tarjeta */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${isMissing ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-[#003366]'}`}>
                          {isMissing ? <AlertTriangle size={20}/> : <CheckCircle2 size={20}/>}
                        </div>
                        
                        {!isMissing && !isEditing && (
                          <div className="flex gap-1">
                            <button onClick={() => startEditing(doc)} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar fechas"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete(doc.id, doc.file_url)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={14}/></button>
                          </div>
                        )}
                        {/* Etiqueta Faltante */}
                        {isMissing && <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">FALTANTE</span>}
                      </div>
                      
                      {/* Título */}
                      <div className="mb-4 flex-1">
                        <h4 className={`font-bold text-sm mb-1 line-clamp-2 leading-tight ${isMissing ? 'text-slate-500' : 'text-slate-800'}`} title={doc.doc_type}>
                          {doc.doc_type}
                        </h4>
                        
                        {!isMissing && !isEditing && (
                          <>
                            <p className="text-[10px] text-slate-400 font-medium mb-3">Subido: {new Date(doc.created_at).toLocaleDateString()}</p>
                            <div className="flex flex-wrap gap-2">
                              {doc.start_date && <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border"><Calendar size={10}/> {doc.start_date}</span>}
                              {doc.expiration_date && <span className="flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-200"><AlertTriangle size={10}/> Vence: {doc.expiration_date}</span>}
                            </div>
                          </>
                        )}

                        {/* Formulario de Edición */}
                        {isEditing && (
                          <div className="space-y-2 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                             <div><label className="text-[10px] font-bold text-slate-500">Emisión</label><input type="date" className="w-full text-xs p-1 rounded border" value={editFormData.start_date} onChange={e=>setEditFormData({...editFormData, start_date:e.target.value})}/></div>
                             <div><label className="text-[10px] font-bold text-slate-500">Vencimiento</label><input type="date" className="w-full text-xs p-1 rounded border" value={editFormData.expiration_date} onChange={e=>setEditFormData({...editFormData, expiration_date:e.target.value})}/></div>
                             <div className="flex gap-1 mt-2">
                                <button onClick={()=>saveEditing(doc.id)} className="flex-1 bg-green-600 text-white text-xs py-1 rounded hover:bg-green-700">Guardar</button>
                                <button onClick={()=>setEditingId(null)} className="flex-1 bg-slate-200 text-slate-600 text-xs py-1 rounded hover:bg-slate-300">Cancelar</button>
                             </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de Acción */}
                      <div className="mt-auto pt-3 border-t border-slate-100">
                        {isMissing ? (
                           <button onClick={() => handleOpenUpload(doc.doc_type)} className="w-full py-2 bg-white border-2 border-dashed border-slate-300 text-slate-500 text-xs font-bold rounded-lg hover:border-[#003366] hover:text-[#003366] hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                              <UploadCloud size={14}/> Subir Documento
                           </button>
                        ) : !isEditing && (
                           <div className="flex gap-2">
                              <a href={getPublicUrl(doc.file_url)} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 hover:text-[#003366] border border-slate-200 transition-colors"><Eye size={14}/> Ver</a>
                              <button onClick={() => handleForceDownload(doc)} disabled={downloadingId === doc.id} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#003366] text-white text-xs font-bold rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-70">
                                {downloadingId === doc.id ? <Loader2 size={14} className="animate-spin"/> : <Download size={14}/>} Bajar
                              </button>
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* --- MODAL INTERNO DE SUBIDA --- */}
      <AnimatePresence>
        {isUploadModalOpen && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                       <FilePlus className="text-[#003366]"/> Subir Archivo
                    </h3>
                    <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                 </div>
                 
                 <div className="space-y-4">
                    {/* Nombre del Documento */}
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Documento</label>
                       {uploadConfig.isCustom ? (
                          <input type="text" placeholder="Ej. Antecedentes Policiales" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:border-[#003366] outline-none" value={customTypeName} onChange={(e) => setCustomTypeName(e.target.value)} />
                       ) : (
                          <div className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">{uploadConfig.type}</div>
                       )}
                    </div>

                    {/* Input Archivo */}
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase">Seleccionar Archivo</label>
                       <input type="file" accept=".pdf,.jpg,.png,.jpeg" className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-[#003366] hover:file:bg-blue-100" onChange={(e) => setFileToUpload(e.target.files[0])} />
                    </div>

                    {/* Fechas */}
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">F. Emisión</label>
                          <input type="date" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={uploadDates.start_date} onChange={(e) => setUploadDates({...uploadDates, start_date: e.target.value})} />
                       </div>
                       <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">F. Vencimiento</label>
                          <input type="date" className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm outline-none" value={uploadDates.expiration_date} onChange={(e) => setUploadDates({...uploadDates, expiration_date: e.target.value})} />
                       </div>
                    </div>

                    <button onClick={handleUploadSubmit} disabled={uploading} className="w-full py-3 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 mt-2 flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-70">
                       {uploading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                       {uploading ? 'Subiendo...' : 'Guardar Documento'}
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <StatusModal isOpen={notification.isOpen} onClose={() => setNotification({ ...notification, isOpen: false })} type={notification.type} title={notification.title} message={notification.message} />
    </>
  );
};

export default EmployeeDocumentsModal;