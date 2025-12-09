import React, { useEffect, useState } from 'react';
import { MapPin, Calendar, Clock, Download, ExternalLink } from 'lucide-react';
import { supabase } from '../../services/supabase';

const ReportsPage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      // Hacemos JOIN con workers para traer el nombre
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          workers ( full_name, category )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error cargando reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Función para generar el link de Google Maps
  const getMapLink = (locationString) => {
    if (!locationString) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${locationString}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reporte de Asistencia</h2>
          <p className="text-slate-500 text-sm">Monitoreo de entradas y salidas del personal.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-sm">
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
            Cargando registros...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Obrero</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Entrada</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition text-sm">
                    {/* Obrero */}
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{item.workers?.full_name || 'Desconocido'}</div>
                      <div className="text-xs text-slate-400">{item.workers?.category}</div>
                    </td>

                    {/* Fecha */}
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* COLUMNA ENTRADA */}
                    <td className="p-4 text-center">
                      {item.check_in_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-100">
                            <Clock size={12}/> {new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex gap-2">
                            {/* Link Ubicación Entrada */}
                            {item.check_in_location && (
                              <a 
                                href={getMapLink(item.check_in_location)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Ver ubicación de entrada"
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                            {/* Foto Entrada */}
                            {item.check_in_photo && (
                              <a href={item.check_in_photo} target="_blank" rel="noreferrer" className="block group relative">
                                <img src={item.check_in_photo} alt="Foto Entrada" className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-md"></div>
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">-</span>
                      )}
                    </td>

                    {/* COLUMNA SALIDA */}
                    <td className="p-4 text-center">
                      {item.check_out_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100">
                            <Clock size={12}/> {new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex gap-2">
                            {/* Link Ubicación Salida */}
                            {item.check_out_location && (
                              <a 
                                href={getMapLink(item.check_out_location)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title="Ver ubicación de salida"
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                            {/* Foto Salida */}
                            {item.check_out_photo && (
                              <a href={item.check_out_photo} target="_blank" rel="noreferrer" className="block group relative">
                                <img src={item.check_out_photo} alt="Foto Salida" className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded-md"></div>
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs italic">Pendiente</span>
                      )}
                    </td>

                  </tr>
                ))}
                
                {attendanceData.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">
                      No hay registros de asistencia hoy.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;