import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Building2, DollarSign, Activity, AlertCircle } from 'lucide-react';
import { supabase } from '../../../services/supabase';

// --- IMPORTACIONES DE MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglo para el icono por defecto de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- COMPONENTE INTERNO: MANEJADOR DE CLICS EN MAPA ---
const LocationPicker = ({ position, onLocationSelect }) => {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Si cambiamos de proyecto y la posición cambia, centramos el mapa ahí
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? (
    <Marker position={position}>
      <Popup>Ubicación seleccionada</Popup>
    </Marker>
  ) : null;
};

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated, projectToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Coordenadas por defecto (Lima, Perú)
  const defaultCenter = [-12.046374, -77.042793]; 

  const [formData, setFormData] = useState({
    name: '',
    project_code: '',
    location: '',
    latitude: '',
    longitude: '',
    start_date: '',
    end_date: '',
    budget: '',
    status: 'En Ejecución'
  });

  // EFECTO: Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      
      if (projectToEdit) {
        // MODO EDICIÓN: Cargar datos del proyecto existente
        setFormData({
          name: projectToEdit.name || '',
          project_code: projectToEdit.project_code || '',
          location: projectToEdit.location || '',
          latitude: projectToEdit.latitude || '',
          longitude: projectToEdit.longitude || '',
          start_date: projectToEdit.start_date || '',
          end_date: projectToEdit.end_date || '',
          budget: projectToEdit.budget || '',
          status: projectToEdit.status || 'En Ejecución'
        });
      } else {
        // MODO CREACIÓN: Limpiar formulario
        setFormData({
          name: '', project_code: '', location: '',
          latitude: '', longitude: '',
          start_date: '', end_date: '', budget: '', status: 'En Ejecución'
        });
      }
    }
  }, [isOpen, projectToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMapClick = (latlng) => {
    setFormData(prev => ({
      ...prev,
      latitude: latlng.lat,
      longitude: latlng.lng
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Validaciones básicas
      if (!formData.name || !formData.project_code || !formData.start_date) {
        throw new Error('Por favor completa los campos obligatorios (*)');
      }

      // Validación de Coordenadas
      if (!formData.latitude || !formData.longitude) {
        const confirmNoGps = window.confirm("⚠️ No has seleccionado una ubicación en el mapa.\n\nSin coordenadas, la validación GPS para los obreros NO funcionará.\n¿Deseas continuar?");
        if (!confirmNoGps) {
          setLoading(false);
          return;
        }
      }

      // Preparar objeto de datos
      const projectData = {
        name: formData.name,
        project_code: formData.project_code,
        location: formData.location,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        budget: formData.budget || 0,
        status: formData.status
      };

      if (projectToEdit) {
        // --- ACTUALIZAR PROYECTO EXISTENTE ---
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectToEdit.id);

        if (error) throw error;

      } else {
        // --- CREAR NUEVO PROYECTO ---
        const { error } = await supabase
          .from('projects')
          .insert([projectData]);

        if (error) throw error;
      }

      onProjectCreated(); // Recargar lista en el padre
      onClose();
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="text-[#003366]" /> 
              {projectToEdit ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
            </h2>
            <p className="text-slate-500 text-sm">
              {projectToEdit ? 'Modifica los detalles del proyecto seleccionado.' : 'Ingresa los detalles y la ubicación de la obra.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-bold border border-red-100">
              <AlertCircle size={20} /> {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA: DATOS GENERALES */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Información General</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Código CC *</label>
                  <input type="text" name="project_code" value={formData.project_code} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" placeholder="Ej. 24-001" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Presupuesto (S/.)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                    <input type="number" name="budget" value={formData.budget} onChange={handleChange} className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Nombre del Proyecto *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" placeholder="Ej. Residencial Los Alamos" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Fecha Inicio *</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Fecha Fin (Aprox)</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Estado</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none appearance-none">
                    <option value="En Ejecución">En Ejecución</option>
                    <option value="Planificación">Planificación</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Paralizado">Paralizado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-600">Dirección Referencial</label>
                 <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" placeholder="Av. Principal 123..." />
                 </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: MAPA */}
            <div className="space-y-4 flex flex-col h-full">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                  Ubicación GPS (Para App Obreros)
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 normal-case font-bold">
                    {formData.latitude ? 'Ubicación Seleccionada' : 'Haz clic en el mapa'}
                  </span>
               </h3>

               <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border-2 border-slate-200 relative shadow-inner">
                  <MapContainer 
                    center={projectToEdit && projectToEdit.latitude ? [projectToEdit.latitude, projectToEdit.longitude] : defaultCenter} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationPicker 
                       position={formData.latitude ? [formData.latitude, formData.longitude] : null} 
                       onLocationSelect={handleMapClick}
                    />
                  </MapContainer>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                     <span className="block text-[10px] text-slate-400 uppercase font-bold">Latitud</span>
                     <span className="text-xs font-mono text-slate-700">{formData.latitude || '---'}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                     <span className="block text-[10px] text-slate-400 uppercase font-bold">Longitud</span>
                     <span className="text-xs font-mono text-slate-700">{formData.longitude || '---'}</span>
                  </div>
               </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 transition shadow-lg flex items-center gap-2">
              {loading ? 'Guardando...' : <><Save size={18}/> {projectToEdit ? 'Actualizar' : 'Crear Proyecto'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;