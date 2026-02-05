import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Building2, DollarSign, Activity, AlertCircle, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';

// --- IMPORTACIONES DE MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// IMPORTAMOS EL MODAL BONITO
import StatusModal from '../../../components/common/StatusModal';

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

  // Si cambiamos de proyecto o BUSCAMOS UNA DIRECCIÓN, el mapa vuela ahí
  useEffect(() => {
    if (position) {
      map.flyTo(position, 16); // Zoom más cercano al encontrar dirección
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
  const [searchingMap, setSearchingMap] = useState(false); 
  const [errorMsg, setErrorMsg] = useState('');
  
  // Estado para el Modal de Alertas (Feedback bonito)
  const [statusModal, setStatusModal] = useState({ 
    isOpen: false, 
    type: 'success', 
    title: '', 
    message: ''
  });

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

  const handleCloseStatusModal = () => {
    setStatusModal({ ...statusModal, isOpen: false });
  };

  // --- FUNCIÓN MEJORADA: BUSCAR DIRECCIÓN ---
  const handleAddressSearch = async () => {
    // 1. Validación inicial con Modal bonito
    if (!formData.location || formData.location.length < 5) {
        setStatusModal({
            isOpen: true,
            type: 'warning', // Icono amarillo de advertencia
            title: 'Dirección muy corta',
            message: 'Por favor ingresa una dirección más específica para poder buscarla en el mapa.'
        });
        return;
    }

    setSearchingMap(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location + ', Peru')}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);

            // Actualizamos coordenadas
            setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lon
            }));
        } else {
            // 2. Alerta de "No encontrado" bonita
            setStatusModal({
                isOpen: true,
                type: 'warning',
                title: 'No encontrado',
                message: 'No pudimos encontrar esa dirección exacta. Intenta añadir el distrito o ser más específico (Ej: Av. Arequipa 123, Lima).'
            });
        }
    } catch (error) {
        console.error("Error buscando dirección:", error);
        // 3. Alerta de Error bonita
        setStatusModal({
            isOpen: true,
            type: 'error',
            title: 'Error de Conexión',
            message: 'Ocurrió un problema al intentar conectar con el servicio de mapas. Revisa tu internet.'
        });
    } finally {
        setSearchingMap(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!formData.name || !formData.project_code || !formData.start_date) {
        throw new Error('Por favor completa los campos obligatorios (*)');
      }

      // Validación de GPS
      if (!formData.latitude || !formData.longitude) {
        // Mantenemos el confirm nativo aquí porque interrumpe el flujo, 
        // pero ya tenemos la búsqueda cubierta con modales bonitos.
        const confirmNoGps = window.confirm("⚠️ No has seleccionado una ubicación en el mapa.\n\nSin coordenadas, la validación GPS para los obreros NO funcionará.\n¿Deseas continuar de todas formas?");
        if (!confirmNoGps) {
          setLoading(false);
          return;
        }
      }

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
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', projectToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('projects')
          .insert([projectData]);
        if (error) throw error;
      }

      onProjectCreated();
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

              {/* --- CAMPO DE DIRECCIÓN MEJORADO CON BUSCADOR --- */}
              <div className="space-y-1">
                 <label className="text-xs font-bold text-slate-600">Dirección y Ubicación GPS</label>
                 <div className="flex gap-2">
                    <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                            type="text" 
                            name="location" 
                            value={formData.location} 
                            onChange={handleChange} 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#003366] outline-none" 
                            placeholder="Escribe dirección y busca..." 
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressSearch(); } }}
                        />
                    </div>
                    <button 
                        type="button" 
                        onClick={handleAddressSearch}
                        disabled={searchingMap}
                        className="px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
                        title="Buscar en el mapa"
                    >
                        {searchingMap ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
                    </button>
                 </div>
                 <p className="text-[10px] text-slate-400 pl-1">Presiona Enter o el botón para ubicar en el mapa.</p>
              </div>
            </div>

            {/* COLUMNA DERECHA: MAPA */}
            <div className="space-y-4 flex flex-col h-full">
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                  Ubicación GPS Confirmada
                  <span className={`text-[10px] px-2 py-0.5 rounded border normal-case font-bold ${formData.latitude ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {formData.latitude ? '✓ Coordenadas Listas' : 'Sin ubicación GPS'}
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

        {/* --- AQUÍ ESTÁ NUESTRO MODAL BONITO --- */}
        <StatusModal 
            isOpen={statusModal.isOpen}
            onClose={handleCloseStatusModal}
            type={statusModal.type}
            title={statusModal.title}
            message={statusModal.message}
        />

      </div>
    </div>
  );
};

export default CreateProjectModal;