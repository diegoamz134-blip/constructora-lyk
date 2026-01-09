import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { 
  Calendar, Save, MapPin, CheckCircle, XCircle, 
  AlertCircle, Search, Users, ClipboardCheck, Loader2,
  Building2, ArrowLeft, Smartphone
} from 'lucide-react';

const FieldAttendancePage = () => {
  // Estados
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Cargar Proyectos Activos
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*') //
          .eq('status', 'En Ejecución')
          .order('name');
        
        if (error) throw error;
        setProjects(data || []);
      } catch (err) {
        console.error("Error cargando proyectos:", err);
      }
    };
    loadProjects();
  }, []);

  // 2. LOGICA DEL "PASO A": Cargar Trabajadores y CRUZAR con Asistencia de Hoy
  useEffect(() => {
    if (!selectedProject) {
      setWorkers([]);
      return;
    }
    
    const loadTeamAndAttendance = async () => {
      setLoading(true);
      try {
        // A. Traer trabajadores asignados al proyecto
        const { data: workersData, error: workersError } = await supabase
          .from('workers')
          .select('*')
          .eq('project_assigned', selectedProject.name) 
          .eq('status', 'Activo')
          .order('full_name');

        if (workersError) throw workersError;

        // B. Traer asistencias DE HOY para este proyecto (Lo que marcaron los obreros)
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('*')
          .eq('project_name', selectedProject.name)
          .eq('date', date); // Filtramos por la fecha seleccionada en pantalla
        
        if (attendanceError) throw attendanceError;

        // C. REALIZAR EL "JOIN" MANUAL (Merge de datos)
        const mergedList = workersData.map(w => {
          // Buscamos si este trabajador ya tiene un registro creado (por la App o previamente)
          const existingRecord = attendanceData.find(a => a.worker_id === w.id);

          return {
            ...w,
            // Guardamos el ID de la asistencia para usarlo en el UPSERT (Paso B)
            attendanceId: existingRecord ? existingRecord.id : null, 
            
            // Si existe registro, usamos su estado. Si no, asumimos 'Presente' para agilizar el llenado.
            attendanceStatus: existingRecord ? (existingRecord.status || 'Presente') : 'Presente',
            
            // Si vino de la App, conservamos la hora real. Si no, estará null.
            checkInTime: existingRecord ? existingRecord.check_in_time : null,
            checkOutTime: existingRecord ? existingRecord.check_out_time : null,
            
            // Bandera para mostrar ícono de celular si vino de la App
            origin: existingRecord && existingRecord.check_in_photo ? 'APP' : 'MANUAL',
            
            observation: existingRecord ? (existingRecord.observation || '') : '',
            saved: !!existingRecord // Marca visual si ya está guardado
          };
        });
        
        setWorkers(mergedList || []);
      } catch (err) {
        console.error("Error cargando personal:", err);
        alert("Error al cargar la cuadrilla.");
      } finally {
        setLoading(false);
      }
    };
    loadTeamAndAttendance();
  }, [selectedProject, date]); // Se recarga si cambias de proyecto o de fecha

  // --- LÓGICA DE INTERACCIÓN (Cambio de estados en la tabla) ---

  const toggleStatus = (index) => {
    const newWorkers = [...workers];
    const current = newWorkers[index].attendanceStatus;
    
    // Ciclo de estados: Presente -> Falta -> Permiso -> Bajada -> Presente...
    if (current === 'Presente') newWorkers[index].attendanceStatus = 'Falta';
    else if (current === 'Falta') newWorkers[index].attendanceStatus = 'Permiso';
    else if (current === 'Permiso') newWorkers[index].attendanceStatus = 'Bajada';
    else newWorkers[index].attendanceStatus = 'Presente';
    
    setWorkers(newWorkers);
  };

  const handleObservationChange = (index, value) => {
    const newWorkers = [...workers];
    newWorkers[index].observation = value;
    setWorkers(newWorkers);
  };

  // --- LOGICA DEL "PASO B": GUARDADO CON UPSERT Y VALIDACIÓN ---
  const handleSaveTareo = async () => {
    if (!selectedProject || workers.length === 0) return;
    
    const confirm = window.confirm(`¿Confirmar tareo del ${date}? Se validará la asistencia de ${workers.length} trabajadores.`);
    if (!confirm) return;

    setSaving(true);
    try {
      const recordsToUpsert = workers.map(w => {
        // Lógica de horas: 
        // 1. Si ya tenía hora (de la app), la respetamos.
        // 2. Si no tenía y está Presente, ponemos hora default (07:00).
        // 3. Si no está Presente (ej. Falta), las horas van en null.
        
        let finalCheckIn = null;
        let finalCheckOut = null;

        if (w.attendanceStatus === 'Presente') {
            finalCheckIn = w.checkInTime || `${date} 07:00:00`;
            finalCheckOut = w.checkOutTime || `${date} 17:00:00`;
        }

        return {
          // ID: Si existe (porque vino de la App o se guardó antes), se usa para ACTUALIZAR.
          // Si es null, Supabase creará una fila nueva.
          id: w.attendanceId, 
          
          worker_id: w.id,
          project_name: selectedProject.name,
          date: date,
          status: w.attendanceStatus,
          
          check_in_time: finalCheckIn,
          check_out_time: finalCheckOut,
          
          // Indicamos si la ubicación fue GPS (App) o Validación manual
          check_in_location: w.origin === 'APP' ? 'Registrado por App' : 'Validado por Residente',
          
          observation: w.observation || '',
          
          // [NUEVO] Columna clave para que RRHH sepa que esto ya fue revisado
          validation_status: 'VALIDADO' 
        };
      });

      // EJECUCIÓN DEL UPSERT
      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToUpsert, { onConflict: 'id' }); 
      
      if (error) throw error;

      alert('✅ Tareo sincronizado y validado correctamente.');
      
      // Recargar datos para asegurar que tenemos los IDs actualizados y evitar duplicados si se guarda de nuevo
      // Esto simula un "refresh" rápido
      const { data: refreshedData } = await supabase
          .from('attendance')
          .select('id, worker_id')
          .eq('project_name', selectedProject.name)
          .eq('date', date);

      if (refreshedData) {
          setWorkers(prev => prev.map(w => {
              const match = refreshedData.find(r => r.worker_id === w.id);
              return match ? { ...w, attendanceId: match.id, saved: true } : w;
          }));
      }

    } catch (e) {
      console.error(e);
      alert('Error guardando tareo: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.document_number.includes(searchTerm)
  );

  // --- VISTA 1: TARJETAS DE PROYECTO (Igual que antes) ---
  if (!selectedProject) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <ClipboardCheck className="text-[#f0c419]" size={32} /> Supervisión de Campo
            </h1>
            <p className="text-slate-500 mt-2">Seleccione un proyecto para validar la asistencia diaria.</p>
          </div>
          <div className="bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 uppercase">Fecha:</span>
             <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent font-bold text-slate-700 outline-none text-sm"
             />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
             <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                <Building2 size={48} className="mx-auto mb-4 opacity-20"/>
                <p>No hay proyectos en ejecución.</p>
             </div>
          ) : (
            projects.map(proj => (
              <div 
                key={proj.id} 
                onClick={() => setSelectedProject(proj)}
                className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-[#003366]/20 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#003366] opacity-0 group-hover:opacity-100 transition-opacity"/>
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-[#003366] rounded-xl group-hover:bg-[#003366] group-hover:text-white transition-colors">
                      <Building2 size={24} />
                   </div>
                   <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded border border-slate-200">
                      {proj.project_code || 'S/C'}
                   </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-[#003366] transition-colors">{proj.name}</h3>
                <div className="space-y-2 text-sm text-slate-500">
                   <p className="flex items-center gap-2"><MapPin size={14} className="text-[#f0c419]"/> {proj.location || 'Sin ubicación'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- VISTA 2: LISTA DE TAREO (Con Iconos APP) ---
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* HEADER DE PROYECTO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => setSelectedProject(null)} 
            className="flex items-center gap-2 text-slate-400 hover:text-[#003366] text-xs font-bold uppercase mb-2 transition-colors"
          >
            <ArrowLeft size={14}/> Volver a Proyectos
          </button>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-[#003366]">{selectedProject.name}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="text-slate-400 ml-2" size={18}/>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent font-bold text-slate-700 outline-none text-sm"
            />
        </div>
      </div>

      {/* CUERPO DE LA TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
        
        {/* Buscador */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={16}/> <span className="font-bold">{workers.length}</span> Trabajadores en lista
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
            <input 
              type="text" 
              placeholder="Buscar obrero..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#003366]"
            />
          </div>
        </div>

        {/* Tabla Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin text-[#003366]" size={32}/>
              <p>Sincronizando con registros de la App...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-10 text-center text-slate-400">No se encontraron trabajadores activos.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4">Trabajador</th>
                  <th className="px-6 py-4 text-center">Origen</th>
                  <th className="px-6 py-4 text-center">Estado (Clic para cambiar)</th>
                  <th className="px-6 py-4">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map((worker) => {
                  const realIndex = workers.findIndex(w => w.id === worker.id);
                  return (
                    <tr key={worker.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800">{worker.full_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{worker.document_number}</span>
                            <span className="text-[10px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{worker.category}</span>
                          </div>
                        </div>
                      </td>
                      
                      {/* COLUMNA ORIGEN: Muestra si vino de la App */}
                      <td className="px-6 py-4 text-center">
                        {worker.origin === 'APP' ? (
                            <div className="flex flex-col items-center justify-center text-blue-600 animate-pulse" title="Registrado desde App Móvil">
                                <Smartphone size={20} />
                                <span className="text-[10px] font-bold mt-1">APP</span>
                                {worker.checkInTime && (
                                   <span className="text-[9px] text-slate-400">
                                      {new Date(worker.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs text-slate-300 font-medium">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => toggleStatus(realIndex)}
                          className={`w-32 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm mx-auto
                            ${worker.attendanceStatus === 'Presente' 
                              ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200' 
                              : worker.attendanceStatus === 'Falta' 
                                ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                                : 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200'
                            }`}
                        >
                          {worker.attendanceStatus === 'Presente' && <CheckCircle size={16}/>}
                          {worker.attendanceStatus === 'Falta' && <XCircle size={16}/>}
                          {(worker.attendanceStatus === 'Permiso' || worker.attendanceStatus === 'Bajada') && <AlertCircle size={16}/>}
                          {worker.attendanceStatus.toUpperCase()}
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          placeholder={worker.attendanceStatus === 'Presente' ? "Sin novedades..." : "Motivo..."}
                          value={worker.observation}
                          onChange={(e) => handleObservationChange(realIndex, e.target.value)}
                          className={`w-full p-2 text-sm border rounded-lg outline-none transition-all
                            ${worker.attendanceStatus !== 'Presente' ? 'border-red-200 bg-red-50 focus:border-red-400' : 'border-slate-200 focus:border-[#003366]'}
                          `}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER DE GUARDADO */}
        {workers.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="text-xs text-slate-400">
              * Se marcarán como <strong>VALIDADOS</strong> para RRHH.
            </div>
            <button 
              onClick={handleSaveTareo}
              disabled={saving}
              className="bg-[#003366] text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
              {saving ? 'GUARDANDO...' : 'VALIDAR Y GUARDAR TAREO'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldAttendancePage;