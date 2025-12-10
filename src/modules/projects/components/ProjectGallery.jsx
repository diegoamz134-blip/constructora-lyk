import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import { compressImage } from '../../../utils/imageCompressor'; // Reusamos tu utilidad
import { Upload, Loader2, Trash2 } from 'lucide-react';

const ProjectGallery = ({ projectId }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, [projectId]);

  const fetchImages = async () => {
    const { data } = await supabase
      .from('project_gallery')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setImages(data || []);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      // Comprimir
      const compressed = await compressImage(file);
      const fileName = `proj_${projectId}_${Date.now()}.jpg`;

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('project-gallery') // Asegúrate de crear este bucket en Supabase
        .upload(fileName, compressed);

      if (uploadError) throw uploadError;

      // Obtener URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('project-gallery')
        .getPublicUrl(fileName);

      // Guardar en Base de Datos
      await supabase.from('project_gallery').insert([{
        project_id: projectId,
        image_url: publicUrl,
        description: 'Avance semanal'
      }]);

      fetchImages();
    } catch (error) {
      console.error(error);
      alert('Error al subir imagen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <input 
          type="file" ref={fileInputRef} className="hidden" accept="image/*"
          onChange={handleUpload}
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl font-bold hover:bg-blue-900 transition shadow-lg active:scale-95 disabled:opacity-70"
        >
          {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20} />}
          Subir Foto de Avance
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img.id} className="group relative rounded-xl overflow-hidden shadow-sm aspect-square bg-slate-100">
            <img 
              src={img.image_url} 
              alt="Avance" 
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <p className="text-white text-xs font-medium">
                {new Date(img.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            No hay fotos subidas aún.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectGallery;