import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Eye, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import StatusModal from '../../../components/common/StatusModal'; // <--- Importamos el StatusModal

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

const requiredDocs = [
  { id: 'DNI', label: 'Copia de DNI (Ambas caras)' },
  { id: 'CONTRATO', label: 'Contrato Firmado' },
  { id: 'EMO', label: 'Examen Médico Ocupacional' },
  { id: 'SSTR', label: 'Constancia SSTR / Seguro' },
  { id: 'ANTECEDENTES', label: 'Antecedentes Policiales' }
];

const EmployeeDocumentsModal = ({ isOpen, onClose, person }) => {
  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(null); 
  const fileInputRefs = useRef({});

  // Estado para notificaciones personalizadas
  const [notification, setNotification] = useState({ 
    isOpen: false, type: '', title: '', message: '' 
  });

  useEffect(() => {
    if (isOpen && person) {
      fetchDocuments();
    }
  }, [isOpen, person]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('hr_documents')
      .select('*')
      .eq('person_id', person.id)
      .eq('person_type', person.type); 
    setDocuments(data || []);
  };

  const handleUpload = async (docType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(docType);
    try {
      // 1. ELIMINAR ARCHIVO ANTIGUO SI EXISTE
      const oldDoc = documents.find(d => d.doc_type === docType);
      
      if (oldDoc) {
        try {
          const oldFileName = oldDoc.file_url.split('/').pop();
          const { error: deleteError } = await supabase.storage
            .from('hr-documents')
            .remove([oldFileName]);

          if (deleteError) console.warn("No se pudo borrar el físico antiguo:", deleteError);
        } catch (err) {
          console.warn("Error intentando borrar archivo viejo", err);
        }
      }

      // 2. SUBIR NUEVO ARCHIVO
      const fileName = `${person.type}_${person.id}_${docType}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('hr-documents')
        .getPublicUrl(fileName);

      // 3. ACTUALIZAR BASE DE DATOS
      await supabase.from('hr_documents').delete()
        .eq('person_id', person.id)
        .eq('person_type', person.type)
        .eq('doc_type', docType);

      await supabase.from('hr_documents').insert([{
        person_id: person.id,
        person_type: person.type,
        doc_type: docType,
        file_url: publicUrl
      }]);

      await fetchDocuments();
      
      // [CAMBIO] Reemplazo de alert por setNotification
      setNotification({
        isOpen: true,
        type: 'success',
        title: '¡Documento Subido!',
        message: `El documento "${requiredDocs.find(d => d.id === docType)?.label}" se ha actualizado correctamente.`
      });

    } catch (error) {
      console.error(error);
      // [CAMBIO] Reemplazo de alert por setNotification
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error de Subida',
        message: error.message || 'No se pudo subir el documento.'
      });
    } finally {
      setUploadingDoc(null);
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType].value = '';
      }
    }
  };

  const triggerFileSelect = (docType) => {
    if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType].click();
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Legajo Digital</h2>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <span className="font-bold text-[#003366]">{person?.full_name}</span>
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-[10px] uppercase font-bold text-slate-600">{person?.type === 'worker' ? 'Obrero' : 'Staff'}</span>
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition"><X size={20} /></button>
              </div>

              {/* Lista de Documentos */}
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-4">
                {requiredDocs.map((doc) => {
                  const existingDoc = documents.find(d => d.doc_type === doc.id);
                  const isUploading = uploadingDoc === doc.id;

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:shadow-sm transition-all bg-white">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${existingDoc ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                          {existingDoc ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                          <h4 className={`font-bold text-sm ${existingDoc ? 'text-slate-700' : 'text-slate-500'}`}>{doc.label}</h4>
                          <p className="text-xs text-slate-400">
                            {existingDoc ? `Subido el ${new Date(existingDoc.created_at).toLocaleDateString()}` : 'Pendiente de entrega'}
                          </p>
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
                          onClick={() => triggerFileSelect(doc.id)}
                          disabled={isUploading}
                          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                            existingDoc 
                              ? 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200' 
                              : 'bg-blue-50 text-[#003366] hover:bg-blue-100 border border-blue-100'
                          }`}
                        >
                          {isUploading ? <Loader2 size={14} className="animate-spin"/> : existingDoc ? <RefreshCw size={14} /> : <Upload size={14} />}
                          {isUploading ? 'Subiendo...' : existingDoc ? 'Actualizar' : 'Subir'}
                        </button>

                        <input 
                          type="file" 
                          ref={el => fileInputRefs.current[doc.id] = el}
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png" 
                          onChange={(e) => handleUpload(doc.id, e)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-400">
                      Documentos subidos: <span className="font-bold text-slate-700">{documents.length} / {requiredDocs.length}</span>
                  </p>
                  <div className="w-1/3 mx-auto h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${(documents.length / requiredDocs.length) * 100}%` }}
                      ></div>
                  </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Componente StatusModal para las alertas */}
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