import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, FileText, Calendar, Briefcase, Tag, Upload, Image as ImageIcon, Trash2, Loader2, AlertCircle, Edit } from 'lucide-react';
import { createTransaction, updateTransaction, uploadFinanceFile } from '../../../services/accountingService'; // Importamos update
import { getProjects } from '../../../services/projectsService';

const TransactionModal = ({ isOpen, onClose, onSuccess, transactionToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [projects, setProjects] = useState([]);
  
  // Estado para el archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [formData, setFormData] = useState({
    type: 'Gasto',
    description: '',
    amount: '',
    category: 'Materiales',
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    reference_document: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      // Si hay transacción para editar, llenamos el formulario
      if (transactionToEdit) {
         setFormData({
            type: transactionToEdit.type,
            description: transactionToEdit.description,
            amount: transactionToEdit.amount,
            category: transactionToEdit.category,
            date: transactionToEdit.date,
            project_id: transactionToEdit.project_id || '',
            reference_document: transactionToEdit.reference_document || ''
         });
         // Si ya tiene archivo, mostramos el link existente (aunque no lo descargamos al input file)
         if (transactionToEdit.file_url) {
            setPreviewUrl(transactionToEdit.file_url); 
         } else {
            setPreviewUrl(null);
         }
         setSelectedFile(null); // Reseteamos archivo nuevo
      } else {
         // Modo Crear: Limpiar
         setFormData({
            type: 'Gasto', description: '', amount: '', category: 'Materiales',
            date: new Date().toISOString().split('T')[0], project_id: '', reference_document: ''
         });
         setSelectedFile(null);
         setPreviewUrl(null);
      }
    }
  }, [isOpen, transactionToEdit]);

  const loadProjects = async () => {
    const data = await getProjects();
    setProjects(data || []);
  };

  // --- LÓGICA DE COMPRESIÓN DE IMÁGENES ---
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("El archivo es demasiado grande (Max 5MB).");
      return;
    }

    if (file.type.startsWith('image/')) {
       try {
         const compressed = await compressImage(file);
         setSelectedFile(compressed);
         setPreviewUrl(URL.createObjectURL(compressed));
       } catch (err) {
         console.error("Error comprimiendo", err);
         setSelectedFile(file);
       }
    } else {
       if (file.size > 2 * 1024 * 1024) {
           alert("El PDF pesa más de 2MB. Por favor comprímelo antes de subirlo.");
           return;
       }
       setSelectedFile(file);
       setPreviewUrl(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let fileUrl = transactionToEdit?.file_url || null; // Mantener URL anterior si existe

      // 1. Si hay archivo NUEVO, lo subimos y reemplazamos la URL
      if (selectedFile) {
        setUploading(true);
        fileUrl = await uploadFinanceFile(selectedFile);
        setUploading(false);
      }

      const payload = {
        ...formData,
        project_id: formData.project_id || null,
        file_url: fileUrl
      };

      // 2. Guardar o Actualizar
      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, payload);
      } else {
        await createTransaction(payload);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`p-4 shrink-0 flex justify-between items-center ${formData.type === 'Ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            {transactionToEdit ? <Edit/> : <DollarSign/>} 
            {transactionToEdit ? 'Editar Movimiento' : `Registrar ${formData.type}`}
          </h2>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 p-1.5 rounded-full"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TABS TIPO */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['Gasto', 'Ingreso'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({...formData, type})}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  formData.type === type 
                    ? (type === 'Ingreso' ? 'bg-green-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md') 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMNA IZQUIERDA: DATOS */}
            <div className="space-y-4">
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Monto (S/.)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input 
                        type="number" step="0.01" required
                        className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none font-mono font-bold text-lg text-slate-700 bg-slate-50"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                      <input 
                        type="date" required
                        className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none text-slate-700 bg-slate-50 font-medium"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>
                  </div>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Descripción</label>
                 <input 
                   type="text" required
                   className="w-full px-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none text-slate-700 bg-slate-50"
                   placeholder="Ej. Compra de cemento..."
                   value={formData.description}
                   onChange={e => setFormData({...formData, description: e.target.value})}
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                 <div className="relative">
                   <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                   <select 
                     className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none bg-slate-50 appearance-none text-slate-700"
                     value={formData.category}
                     onChange={e => setFormData({...formData, category: e.target.value})}
                   >
                     <option>Materiales</option>
                     <option>Mano de Obra</option>
                     <option>Equipos</option>
                     <option>Subcontratos</option>
                     <option>Servicios</option>
                     <option>Administrativo</option>
                     <option>Valuación (Cobro)</option>
                     <option>Otros</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Asignar a Obra</label>
                 <div className="relative">
                   <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                   <select 
                     className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none bg-slate-50 appearance-none text-slate-700"
                     value={formData.project_id}
                     onChange={e => setFormData({...formData, project_id: e.target.value})}
                   >
                     <option value="">-- Gasto General (Sin Obra) --</option>
                     {projects.map(p => (
                       <option key={p.id} value={p.id}>{p.name}</option>
                     ))}
                   </select>
                 </div>
               </div>

               <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nro. Factura / Recibo</label>
                <div className="relative">
                     <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input 
                      type="text" 
                      className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none text-slate-700 bg-slate-50"
                      placeholder="Ej. F001-2345"
                      value={formData.reference_document}
                      onChange={e => setFormData({...formData, reference_document: e.target.value})}
                    />
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA: ARCHIVO */}
            <div className="space-y-4 flex flex-col">
               <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                  Comprobante (Foto/PDF)
                  {selectedFile && <span className="text-emerald-600 font-bold text-[10px]">Listo para subir</span>}
               </label>
               
               <div className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center relative bg-slate-50 transition-colors ${selectedFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                  
                  {!selectedFile && !previewUrl ? (
                    <>
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-slate-400">
                         <Upload size={24}/>
                      </div>
                      <p className="text-sm font-bold text-slate-600">Clic para subir archivo</p>
                      <p className="text-xs text-slate-400 mt-1">Imágenes (se comprimen) o PDF</p>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center relative">
                        {/* Botón borrar archivo seleccionado */}
                        {selectedFile && (
                          <button 
                            onClick={removeFile}
                            type="button"
                            className="absolute top-2 right-2 p-2 bg-white text-red-500 rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}

                        {previewUrl ? (
                          <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg bg-white border border-slate-200">
                             {/* Si es PDF o imagen */}
                             {previewUrl.includes('.pdf') ? (
                                <div className="text-center">
                                    <FileText size={40} className="text-red-500 mb-2 mx-auto"/>
                                    <span className="text-xs font-bold text-slate-700">PDF Adjunto</span>
                                </div>
                             ) : (
                                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[200px] object-contain" />
                             )}
                          </div>
                        ) : (
                           <div className="flex flex-col items-center text-center">
                              <FileText size={48} className="text-red-500 mb-2"/>
                              <span className="text-sm font-bold text-slate-700 max-w-[150px] truncate">{selectedFile.name}</span>
                           </div>
                        )}
                        
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-white px-3 py-1.5 rounded-full shadow-sm">
                           <ImageIcon size={14}/> {selectedFile ? 'Listo para subir' : 'Archivo Actual'}
                        </div>
                    </div>
                  )}

               </div>
               
               <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-start border border-blue-100">
                  <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5"/>
                  <p className="text-[10px] text-blue-800 leading-relaxed">
                    <span className="font-bold">Nota:</span> Las imágenes se comprimen automáticamente.
                  </p>
               </div>
            </div>

          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${formData.type === 'Ingreso' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20}/> {uploading ? 'Subiendo archivo...' : 'Guardando...'}</>
            ) : (
              <><Save size={20}/> {transactionToEdit ? 'Actualizar Movimiento' : 'Registrar Movimiento'}</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default TransactionModal;