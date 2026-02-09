import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Building, AlertCircle } from 'lucide-react';
import { createSede, updateSede } from '../../../services/sedesService';

// --- IMPORTACIONES DE MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// COMPONENTE INTERNO: Puntero del Mapa
const LocationPicker = ({ position, onLocationSelect }) => {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Si hay posición inicial, centrar el mapa ahí al cargar
  useEffect(() => {
    if (position) {
      map.setView(position, 15);
    }
  }, [position, map]);

  return position ? (
    <Marker position={position}>
      <Popup>Ubicación de la Sede</Popup>
    </Marker>
  ) : null;
};

const CreateSedeModal = ({ isOpen, onClose, onSuccess, sedeToEdit }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Coordenadas por defecto (Lima)
  const defaultCenter = [-12.046374, -77.042793]; 

  const [formData, setFormData] = useState({
    name: '',
    location: '', 
    latitude: '', 
    longitude: ''
  });

  // AL ABRIR: Detectar si es Edición o Creación
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      if (sedeToEdit) {
        // MODO EDICIÓN: Cargar datos
        setFormData({
          name: sedeToEdit.name,
          location: sedeToEdit.location || '',
          latitude: sedeToEdit.latitude || '',
          longitude: sedeToEdit.longitude || ''
        });
      } else {
        // MODO CREACIÓN: Limpiar
        setFormData({
          name: '', location: '', latitude: '', longitude: ''
        });
      }
    }
  }, [isOpen, sedeToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- LÓGICA CORREGIDA: Reverse Geocoding ---
  const handleMapClick = async (latlng) => {
    // 1. Actualización visual inmediata
    setFormData(prev => ({
      ...prev,
      latitude: latlng.lat,
      longitude: latlng.lng
    }));

    // 2. Buscar dirección
    try {
        // CORRECCIÓN: latlng.lng (Leaflet) -> lon (API)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
        const data = await response.json();

        if (data && data.display_name) {
             setFormData(prev => ({
                ...prev,
                location: data.display_name // Rellenamos el input
            }));
        }
    } catch (error) {
        console.error("Error al obtener dirección del mapa:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!formData.name) throw new Error('El nombre de la sede es obligatorio.');

      const payload = {
        name: formData.name,
        location: formData.location,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null
      };

      if (sedeToEdit) {
        await updateSede(sedeToEdit.id, payload);
      } else {
        await createSede(payload);
      }

      onSuccess(); 
      onClose();   
    } catch (error) {
      console.error(error);
      setErrorMsg(error.message || 'Error al guardar la sede');
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
              <Building className="text-[#003366]" /> {sedeToEdit ? 'Editar Sede' : 'Nueva Sede'}
            </h2>
            <p className="text-slate-500 text-sm">
              {sedeToEdit ? 'Modifica los datos y ubicación.' : 'Registra una nueva ubicación operativa.'}
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
            {/* DATOS */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Nombre de la Sede *</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none font-medium" placeholder="Ej. Oficina Central" />
              </div>

              <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-600 uppercase">Dirección Escrita</label>
                 <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-[#003366] outline-none" placeholder="Av. Larco 123..." />
                 </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-blue-800 font-bold text-sm mb-2 flex items-center gap-2"><AlertCircle size={16}/> GPS para Asistencia</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Asegúrate de marcar el punto exacto en el mapa. Este punto se usará para validar que el personal esté físicamente en la sede al marcar asistencia.
                </p>
              </div>
            </div>

            {/* MAPA */}
            <div className="space-y-4 flex flex-col h-full min-h-[350px]">
               <div className="flex-1 rounded-xl overflow-hidden border-2 border-slate-200 relative shadow-inner">
                  <MapContainer center={defaultCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker 
                       position={formData.latitude ? [formData.latitude, formData.longitude] : null} 
                       onLocationSelect={handleMapClick}
                    />
                  </MapContainer>
               </div>
               <div className="text-center text-xs text-slate-500 font-mono">
                 Lat: {formData.latitude || '---'} | Lng: {formData.longitude || '---'}
               </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition">Cancelar</button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#003366] text-white font-bold rounded-xl hover:bg-blue-900 transition shadow-lg flex items-center gap-2">
              {loading ? 'Guardando...' : <><Save size={18}/> Guardar Sede</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSedeModal;