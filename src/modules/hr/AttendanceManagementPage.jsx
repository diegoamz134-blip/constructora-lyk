import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, Filter, CheckCircle, XCircle, 
  Clock, Save, FileText, Download, Building2, 
  CheckSquare, Bot, MapPin, ChevronDown 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Toaster, toast } from 'sonner';

const AttendanceManagementPage = () => {
  // --- ESTADOS ---
  const [locations, setLocations] = useState([]); 
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estadísticas
  const [stats, setStats] = useState({ total: 0, presentes: 0, faltas: 0, validado: 0, aprobado: 0 });

  // Modal Confirmación
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, title: '', message: '', action: null, type: 'info' 
  });

  // 1. CARGA INICIAL: OBRAS Y SEDES
  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      // A. Proyectos
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('status', 'En Ejecución')
        .order('name');

      // B. Sedes
      const { data: sedes } = await supabase
        .from('sedes')
        .select('id, name')
        .order('name');

      const combined = [
        ...(projects || []).map(p => ({ ...p, type: 'PROJECT' })),
        ...(sedes || []).map(s => ({ ...s, type: 'SEDE' }))
      ];

      setLocations(combined);
      if (combined.length > 0) setSelectedLocation(combined[0]);

    } catch (error) {
      console.error("Error ubicaciones:", error);
      toast.error("Error al cargar ubicaciones");
    }
  };

  // 2. CARGA DE ASISTENCIA (INTELIGENTE)
  useEffect(() => {
    if (selectedLocation) {
        loadAttendance();
    }
  }, [selectedLocation, date]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      let peopleData = [];

      // === CORRECCIÓN CLAVE: Selección de Tabla según Tipo ===
      if (selectedLocation.type === 'SEDE') {
          // Si es SEDE -> Buscamos STAFF (Employees)
          const { data: staff, error } = await supabase
            .from('employees')
            .select('id, full_name, document_number, position, sede_id')
            .eq('sede_id', selectedLocation.id) // Match por ID de Sede
            .eq('status', 'Activo')
            .order('full_name');
          
          if (error) throw error;
          
          // Normalizamos para que parezca un "worker"
          peopleData = staff.map(s => ({
              id: s.id,
              full_name: s.full_name,
              document_number: s.document_number,
              category: s.position || 'Administrativo', // Usamos Cargo como Categoría
              is_staff: true
          }));

      } else {
          // Si es PROYECTO -> Buscamos OBREROS (Workers)
          const { data: workers, error } = await supabase
            .from('workers')
            .select('id, full_name, document_number, category, project_assigned')
            .eq('project_assigned', selectedLocation.name.trim()) // Match por Nombre
            .eq('status', 'Activo')
            .order('full_name');

          if (error) throw error;
          
          peopleData = workers.map(w => ({ ...w, is_staff: false }));
      }

      // B. Registros de Asistencia
      // Buscamos por nombre de proyecto/sede O por ID de trabajador/empleado
      const { data: records, error: recordsError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date)
        .or(`project_name.eq.${selectedLocation.name}, check_in_location.eq.${selectedLocation.name}`); // Buscamos coincidencia flexible

      if (recordsError) throw recordsError;

      // --- LÓGICA AUTO-CIERRE ---
      const today = new Date(); today.setHours(0,0,0,0);
      const isPastDate = new Date(date + 'T00:00:00') < today;
      let autoFixedCount = 0;

      // C. Merge (Cruce de Datos)
      const mergedData = peopleData.map(person => {
          // Buscamos el registro de asistencia correspondiente (Worker ID o Employee ID)
          const record = records.find(r => 
              person.is_staff ? r.employee_id === person.id : r.worker_id === person.id
          );
          
          let checkIn = record?.check_in_time || null;
          let checkOut = record?.check_out_time || null;
          let status = record?.status || 'Falta';
          let validation = record?.validation_status || 'PENDIENTE';
          let obs = record?.observation || '';
          let isAutoFixed = false;

          // Regla Auto-Cierre
          if (isPastDate && checkIn && !checkOut && status === 'Presente') {
              checkOut = `${date}T17:00:00-05:00`;
              if (!obs.includes('CIERRE AUTOMÁTICO')) obs = obs ? `${obs} | 🤖 CIERRE AUTOMÁTICO` : '🤖 CIERRE AUTOMÁTICO - SISTEMA';
              if (validation !== 'APROBADO') validation = 'VALIDADO';
              isAutoFixed = true;
              autoFixedCount++;
          }

          // Cálculo de Horas
          let hoursWorked = 0;
          let extraHours = 0;
          if (checkIn && checkOut) {
             const diffHrs = (new Date(checkOut) - new Date(checkIn)) / 3600000;
             if (diffHrs > 0) {
                 hoursWorked = parseFloat(diffHrs.toFixed(2));
                 if (hoursWorked > 8.5) extraHours = parseFloat((hoursWorked - 8.5).toFixed(2));
             }
          }

          return {
              ...person, // Datos base (Nombre, DNI)
              attendance_id: record?.id || null,
              status, check_in_time: checkIn, check_out_time: checkOut,
              hours_worked: record?.hours_worked || hoursWorked,
              overtime_hours: record?.overtime_hours || extraHours,
              validation_status: validation,
              observation: obs,
              has_record: !!record,
              is_auto_fixed: isAutoFixed
          };
      });

      setAttendanceData(mergedData);
      calculateStats(mergedData);

      if (autoFixedCount > 0) toast.info(`🤖 Se corrigieron ${autoFixedCount} registros automáticamente.`);

    } catch (error) {
      console.error("Error loading:", error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
      setStats({
          total: data.length,
          presentes: data.filter(d => d.status === 'Presente').length,
          faltas: data.filter(d => d.status === 'Falta').length,
          validado: data.filter(d => d.validation_status === 'VALIDADO').length,
          aprobado: data.filter(d => d.validation_status === 'APROBADO').length
      });
  };

  // --- ACTIONS ---
  const handleInputChange = (id, field, value) => {
      setAttendanceData(prev => prev.map(item => {
          if (item.id !== id) return item;
          const newItem = { ...item, [field]: value };
          
          if (['check_in_time', 'check_out_time'].includes(field)) {
              if (newItem.check_in_time && newItem.check_out_time) {
                  const diff = (new Date(newItem.check_out_time) - new Date(newItem.check_in_time)) / 3600000;
                  const hrs = diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
                  newItem.hours_worked = hrs;
                  newItem.overtime_hours = hrs > 8.5 ? parseFloat((hrs - 8.5).toFixed(2)) : 0;
              }
          }
          return newItem;
      }));
  };

  const executeSave = async (isApproval = false) => {
      setConfirmModal(prev => ({...prev, isOpen: false}));
      setSaving(true);
      try {
          // Filtramos registros a guardar
          const recordsToSave = attendanceData
            .filter(d => d.has_record || d.status === 'Presente')
            .map(d => ({
                // ID condicional: Si es staff usa employee_id, si es obrero usa worker_id
                ...(d.is_staff ? { employee_id: d.id } : { worker_id: d.id }),
                project_name: selectedLocation.name,
                date: date,
                status: d.status,
                check_in_time: d.check_in_time,
                check_out_time: d.check_out_time,
                hours_worked: d.hours_worked,
                overtime_hours: d.overtime_hours,
                validation_status: isApproval ? 'APROBADO' : d.validation_status,
                observation: d.observation
            }));

          // Upsert usando la lógica adecuada
          // NOTA: Supabase upsert requiere constraint. 
          // Si tienes restricción unique (worker_id, date), esto fallará para Staff.
          // Recomendación: Hacer dos upserts separados si tu DB distingue indices.
          // Para simplificar aquí, asumimos que attendance soporta ambos.
          
          const { error } = await supabase.from('attendance').upsert(recordsToSave); // Supabase manejará el ID si se envía
          
          if (error) throw error;
          toast.success(isApproval ? "¡Asistencia Aprobada!" : "Cambios guardados");
          loadAttendance();
      } catch (err) {
          console.error(err);
          toast.error("Error al guardar");
      } finally {
          setSaving(false);
      }
  };

  const handleExportExcel = () => {
      const exportData = attendanceData.map(d => ({
          Nombre: d.full_name,
          DNI: d.document_number,
          Cargo: d.category,
          Estado: d.status,
          Entrada: d.check_in_time ? new Date(d.check_in_time).toLocaleTimeString() : '-',
          Salida: d.check_out_time ? new Date(d.check_out_time).toLocaleTimeString() : '-',
          Horas_Trabajadas: d.hours_worked,
          Validacion: d.validation_status
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      XLSX.writeFile(wb, `Tareo_${selectedLocation.name}_${date}.xlsx`);
  };

  // UI Helpers
  const timeToInput = (iso) => {
      if (!iso) return '';
      try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };
  const inputToIso = (timeStr) => timeStr ? `${date}T${timeStr}:00-05:00` : null;

  const filteredData = attendanceData.filter(item => 
      item.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in zoom-in duration-300">
      <Toaster position="top-right" richColors />

      {/* HEADER + SELECTOR ARREGLADO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Clock className="text-[#003366]" /> Control de Asistencia
          </h1>
          <p className="text-slate-500 font-medium">Gestión de Obras y Sedes.</p>
        </div>
        
        {/* === SELECTOR CON Z-INDEX Y CAPAS CORREGIDAS === */}
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex items-center relative">
             
             {/* 1. EL SELECT INVISIBLE CUBRE TODO EL CONTENEDOR PADRE */}
             <select 
                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                    const loc = locations.find(l => l.id == e.target.value);
                    if(loc) setSelectedLocation(loc);
                }}
             >
                 <optgroup label="🏗️ Proyectos">
                    {locations.filter(l => l.type === 'PROJECT').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </optgroup>
                 <optgroup label="🏢 Sedes">
                    {locations.filter(l => l.type === 'SEDE').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </optgroup>
             </select>

             {/* 2. UI VISUAL (Lo que se ve) */}
             <div className="flex items-center gap-3 px-3 py-1.5 pointer-events-none"> 
                 {selectedLocation?.type === 'SEDE' ? 
                    <Building2 className="text-purple-500 shrink-0" size={20}/> : 
                    <MapPin className="text-orange-500 shrink-0" size={20}/>
                 }
                 
                 <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ubicación</span>
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
                            {selectedLocation?.name || 'Cargando...'}
                        </span>
                        <ChevronDown size={14} className="text-slate-400"/>
                     </div>
                 </div>
             </div>

             <div className="w-px h-8 bg-slate-100 mx-1"></div>

             {/* 3. INPUT FECHA (Debe estar POR ENCIMA del select global para poder clickearlo) */}
             <div className="relative z-30"> 
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-8 pr-2 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-bold text-slate-700 outline-none transition-colors cursor-pointer"
                />
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14}/>
             </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div><p className="text-slate-400 text-xs font-bold uppercase">Personal</p><p className="text-2xl font-black text-slate-800">{stats.total}</p></div>
              <Filter size={24} className="text-slate-200"/>
          </div>
          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex items-center justify-between">
              <div><p className="text-emerald-600 text-xs font-bold uppercase">Presentes</p><p className="text-2xl font-black text-emerald-700">{stats.presentes}</p></div>
              <CheckCircle size={24} className="text-emerald-200"/>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
              <div><p className="text-blue-600 text-xs font-bold uppercase">Validados</p><p className="text-2xl font-black text-blue-700">{stats.validado}</p></div>
              <FileText size={24} className="text-blue-200"/>
          </div>
          <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-between">
              <div><p className="text-indigo-600 text-xs font-bold uppercase">Aprobados</p><p className="text-2xl font-black text-indigo-700">{stats.aprobado}</p></div>
              <CheckSquare size={24} className="text-indigo-200"/>
          </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center gap-4 bg-slate-50/50">
              <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-[#003366]"/>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50"><Download size={16}/> Exportar</button>
                  <button onClick={() => setConfirmModal({isOpen:true, title:'Guardar Cambios', message:'Se actualizarán los registros.', type:'info', action:()=>executeSave(false)})} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-sm"><Save size={16}/> Guardar</button>
                  <button onClick={() => setConfirmModal({isOpen:true, title:'Aprobar Todo', message:'Se validará toda la asistencia para pago.', type:'success', action:()=>executeSave(true)})} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm"><CheckSquare size={16}/> Aprobar</button>
              </div>
          </div>

          <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">Personal</th>
                          <th className="px-4 py-4 text-center">Estado</th>
                          <th className="px-4 py-4 text-center">Horario</th>
                          <th className="px-4 py-4 text-center">Hrs Total</th>
                          <th className="px-4 py-4 text-center">Extras</th>
                          <th className="px-4 py-4 text-center">Validación</th>
                          <th className="px-6 py-4">Observaciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                      {loading ? <tr><td colSpan="7" className="p-10 text-center">Cargando...</td></tr> : filteredData.map((item) => (
                          <tr key={item.id} className={`hover:bg-slate-50/50 ${item.is_auto_fixed ? 'bg-amber-50/40' : ''}`}>
                              <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{item.full_name}</p>
                                  <p className="text-xs text-slate-400">{item.document_number} • {item.category}</p>
                                  {item.is_auto_fixed && <span className="text-[9px] font-bold text-amber-600 flex gap-1 mt-1"><Bot size={10}/> Auto-Cierre</span>}
                              </td>
                              <td className="px-4 py-4 text-center">
                                  <select value={item.status} onChange={(e)=>handleInputChange(item.id,'status',e.target.value)} className={`px-2 py-1 rounded text-xs font-bold border outline-none ${item.status==='Presente'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-700 border-red-200'}`}>
                                      <option value="Presente">Presente</option><option value="Falta">Falta</option><option value="Permiso">Permiso</option>
                                  </select>
                              </td>
                              <td className="px-4 py-4 text-center">
                                  <div className="flex items-center gap-1 justify-center">
                                      <input type="time" value={timeToInput(item.check_in_time)} onChange={(e)=>handleInputChange(item.id,'check_in_time',inputToIso(e.target.value))} className="w-20 text-center border rounded px-1 py-0.5 text-xs"/>
                                      <span className="text-slate-300">-</span>
                                      <input type="time" value={timeToInput(item.check_out_time)} onChange={(e)=>handleInputChange(item.id,'check_out_time',inputToIso(e.target.value))} className="w-20 text-center border rounded px-1 py-0.5 text-xs"/>
                                  </div>
                              </td>
                              <td className="px-4 py-4 text-center font-bold text-slate-700">{item.hours_worked}</td>
                              <td className="px-4 py-4 text-center">{item.overtime_hours > 0 ? <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs font-bold">+{item.overtime_hours}</span> : <span className="text-slate-300">-</span>}</td>
                              <td className="px-4 py-4 text-center">
                                  <span className={`px-2 py-1 rounded text-[10px] font-black border ${item.validation_status==='VALIDADO'?'bg-blue-100 text-blue-700 border-blue-200':item.validation_status==='APROBADO'?'bg-indigo-100 text-indigo-700 border-indigo-200':'bg-slate-100 text-slate-500'}`}>{item.validation_status}</span>
                              </td>
                              <td className="px-6 py-4">
                                  <input type="text" value={item.observation} onChange={(e)=>handleInputChange(item.id,'observation',e.target.value)} className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-xs text-slate-600" placeholder="..."/>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* MODAL BONITO */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={()=>setConfirmModal(prev=>({...prev, isOpen:false}))}>
             <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type==='success'?'bg-indigo-50 text-indigo-600':'bg-blue-50 text-blue-600'}`}>
                    {confirmModal.type==='success' ? <CheckSquare size={32}/> : <Save size={32}/>}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                <p className="text-slate-500 text-sm mb-6">{confirmModal.message}</p>
                <div className="flex gap-3">
                    <button onClick={()=>setConfirmModal(prev=>({...prev, isOpen:false}))} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200">Cancelar</button>
                    <button onClick={confirmModal.action} className={`flex-1 py-2.5 rounded-xl text-white font-bold shadow-lg ${confirmModal.type==='success'?'bg-indigo-600 hover:bg-indigo-700':'bg-[#003366] hover:bg-blue-900'}`}>Confirmar</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AttendanceManagementPage;