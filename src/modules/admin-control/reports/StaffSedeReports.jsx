import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { 
  Building2, 
  HardHat, 
  Users, 
  ArrowLeft, 
  CalendarCheck, 
  Clock, 
  MapPin 
} from 'lucide-react';

const StaffSedeReports = () => {
  const [viewState, setViewState] = useState('list'); // 'list' (tarjetas) o 'detail' (empleados)
  const [sedes, setSedes] = useState([]);
  const [selectedSede, setSelectedSede] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar todas las sedes al iniciar
  useEffect(() => {
    fetchSedes();
  }, []);

  // 2. Cargar empleados cuando se selecciona una sede
  useEffect(() => {
    if (selectedSede) {
      fetchEmployeesBySede(selectedSede.id);
    }
  }, [selectedSede]);

  const fetchSedes = async () => {
    try {
      setLoading(true);
      // Asumiendo que tienes una tabla 'sedes' o 'projects'
      // Ajusta la consulta según tu estructura real. 
      // Aquí traigo proyectos activos y sedes corporativas.
      const { data, error } = await supabase
        .from('sedes') 
        .select('*')
        .eq('status', 'Activo'); // Opcional: filtrar solo activos

      if (error) throw error;
      setSedes(data || []);
    } catch (error) {
      console.error('Error cargando sedes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesBySede = async (sedeId) => {
    try {
      setLoading(true);
      // Aquí está la clave: FILTRAR STAFF POR SEDE
      // Asegúrate de que en tu tabla 'employees' tengas un campo 'sede_id' o 'project_id'
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          attendance_records:attendance(*) 
        `)
        .eq('sede_id', sedeId) // <--- ESTO FILTRA POR LA TARJETA SELECCIONADA
        .eq('status', 'Activo');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error cargando staff de la sede:', error);
    } finally {
      setLoading(false);
    }
  };

  // KPI Rápido: Calcular asistencia de hoy (Simulado)
  const getAttendanceStats = () => {
    // Aquí podrías agregar lógica para contar cuántos marcaron hoy
    return {
      total: employees.length,
      present: employees.filter(e => Math.random() > 0.2).length, // Simulación, conecta con tu lógica real
    };
  };

  // --- VISTA 1: LAS TARJETAS (SEDES) ---
  const renderSedesGrid = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
        <MapPin className="w-6 h-6 text-blue-600" />
        Selecciona una Sede o Proyecto
      </h2>

      {loading ? (
        <div className="text-center py-10">Cargando sedes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sedes.map((sede) => {
            const isOffice = sede.type === 'Oficina' || sede.category === 'Administrativo';
            return (
              <div 
                key={sede.id}
                onClick={() => {
                  setSelectedSede(sede);
                  setViewState('detail');
                }}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${isOffice ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {isOffice ? <Building2 size={24} /> : <HardHat size={24} />}
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-500">
                    {sede.code || 'S/C'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                  {sede.name}
                </h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                  {sede.address || 'Sin dirección registrada'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    Ver Staff
                  </span>
                  <ArrowLeft className="rotate-180 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // --- VISTA 2: EL DETALLE (TABLA DE EMPLEADOS) ---
  const renderDetailView = () => {
    const stats = getAttendanceStats();

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header con botón de volver */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setViewState('list');
                setSelectedSede(null);
                setEmployees([]);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{selectedSede?.name}</h2>
              <p className="text-slate-500 text-sm">Reporte de Personal Staff</p>
            </div>
          </div>
          
          {/* Tarjetas de Resumen (KPIs) */}
          <div className="flex gap-4">
            <div className="bg-white px-4 py-2 rounded-lg border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Users size={16} /></div>
              <div>
                <p className="text-xs text-slate-500">Total Staff</p>
                <p className="font-bold text-lg">{stats.total}</p>
              </div>
            </div>
            {/* Agrega más KPIs aquí si deseas */}
          </div>
        </div>

        {/* Tabla de Empleados de esa Sede */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">Cargando personal...</div>
          ) : employees.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No hay personal Staff asignado a esta sede.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                  <tr>
                    <th className="px-6 py-4">Empleado</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4">DNI</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {emp.paternal_surname} {emp.maternal_surname}, {emp.names}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{emp.position || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">{emp.document_number}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                          Ver Historial
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {viewState === 'list' ? renderSedesGrid() : renderDetailView()}
    </div>
  );
};

export default StaffSedeReports;