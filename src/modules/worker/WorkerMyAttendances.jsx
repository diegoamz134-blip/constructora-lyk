import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CalendarDays, FileText, Loader2, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useWorkerAuth } from '../../context/WorkerAuthContext';
import { startOfWeek, endOfWeek, subWeeks, format, addDays, getISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import logoFull from '../../assets/images/logo-lk-full.png';

const WorkerMyAttendances = () => {
  const { worker } = useWorkerAuth();
  const navigate = useNavigate();
  
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Generar automáticamente las últimas 4 semanas al cargar
  useEffect(() => {
    const generateLast4Weeks = () => {
      const today = new Date();
      const generatedWeeks = [];

      for (let i = 0; i < 4; i++) {
        const targetDate = subWeeks(today, i);
        const start = startOfWeek(targetDate, { weekStartsOn: 1 });
        const end = endOfWeek(targetDate, { weekStartsOn: 1 });
        const weekNum = getISOWeek(targetDate);

        generatedWeeks.push({
          id: `week-${i}`,
          label: `Semana ${weekNum}`,
          weekNumber: weekNum,
          startObj: start,
          endObj: end,
          startStr: format(start, 'yyyy-MM-dd'),
          endStr: format(end, 'yyyy-MM-dd'),
          displayRange: `Del ${format(start, 'dd/MM/yyyy')} al ${format(end, 'dd/MM/yyyy')}`
        });
      }
      setWeeks(generatedWeeks);
    };

    generateLast4Weeks();
  }, []);

  // 2. Buscar datos cuando selecciona una semana
  const handleSelectWeek = async (week) => {
    setSelectedWeek(week);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', worker.id)
        .gte('date', week.startStr)
        .lte('date', week.endStr)
        .order('date', { ascending: true });

      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error("Error obteniendo asistencia:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para extraer horas HH:mm:ss de fechas ISO exacto como el PDF
  const extractTime = (isoString) => {
      if (!isoString) return '--:--:--';
      const d = new Date(isoString);
      return format(d, 'HH:mm:ss');
  };

  // --- LÓGICA PRINCIPAL: GENERAR TABLA Y CALCULAR TOTALES ---
  const generateReportData = () => {
      if (!selectedWeek) return { rows: [], stats: {} };
      
      const rows = [];
      let currentDate = selectedWeek.startObj;

      // Variables Acumuladoras para el Resumen del Cliente
      let stats = {
          totalHN: 0, totalHE60: 0, totalHE100: 0,
          diasTrabajados: 0, inasistencias: 0,
          tardanzasJustificadas: 0, tardanzasNoJustificadas: 0,
          asistenciasDentro: 0, asistenciasFuera: 0
      };

      for (let i = 0; i < 7; i++) {
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          const displayDate = format(currentDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
          const isSunday = currentDate.getDay() === 0;
          const isSaturday = currentDate.getDay() === 6;
          
          let jornadaIn = '07:30:00';
          let jornadaOut = '17:00:00';
          if (isSaturday) { jornadaOut = '13:00:00'; } 
          if (isSunday) { jornadaIn = '--:--:--'; jornadaOut = '--:--:--'; }

          const record = attendanceData.find(a => a.date === dateStr);

          let checkIn = '--:--:--'; let checkOut = '--:--:--';
          let hn = 0; let he60 = 0; let he100 = 0;
          let obsArr = [];
          let obra = worker?.project_assigned || '--';

          if (record) {
              if (record.status === 'Falta') {
                  // Lógica de Faltas
                  if (record.justification_type === 'Descanso Médico' || record.approval_status === 'Aprobado') {
                      obsArr.push("MARCA INGRESO COMO FALTA JUSTIFICADA");
                  } else {
                      obsArr.push("MARCA INGRESO COMO FALTA NO JUSTIFICADA");
                      stats.inasistencias++;
                  }
                  if (!isSunday) { jornadaIn = '07:30:00'; jornadaOut = '17:00:00'; }
              } else {
                  // Asistió
                  stats.diasTrabajados++;
                  checkIn = extractTime(record.check_in_time);
                  checkOut = extractTime(record.check_out_time);
                  obra = record.project_name || obra;
                  
                  // GPS Logic
                  if (record.is_location_valid) {
                      stats.asistenciasDentro++;
                  } else {
                      stats.asistenciasFuera++;
                      if (record.justification_type === 'UBICACION' && record.approval_status === 'Aprobado') {
                          obsArr.push("MARCÓ CON UBICACIÓN INCORRECTA PERO JUSTIFICADA");
                      } else {
                          obsArr.push("MARCÓ CON UBICACIÓN INCORRECTA PERO NO JUSTIFICADA");
                      }
                  }

                  // Tardanza Logic
                  if (record.status === 'Tardanza' || record.justification_type === 'TARDANZA_INJUSTIFICADA') {
                      stats.tardanzasNoJustificadas++;
                      obsArr.push("TARDANZA NO JUSTIFICADA");
                  } else if (record.justification_type === 'TARDANZA_JUSTIFICADA') {
                      stats.tardanzasJustificadas++;
                      obsArr.push("TARDANZA JUSTIFICADA");
                  }

                  // Cálculo de Horas
                  if (record.check_in_time && record.check_out_time) {
                      const dIn = new Date(record.check_in_time);
                      const dOut = new Date(record.check_out_time);
                      let diffHours = (dOut - dIn) / (1000 * 60 * 60);
                      
                      let workedHours = diffHours > 1 ? diffHours - 1 : diffHours; // Resta 1 hora de almuerzo
                      
                      if (isSunday) {
                          // Si trabaja domingo, todo es 100%
                          he100 = parseFloat(workedHours.toFixed(2));
                          obsArr.push("TRABAJO DOMINICAL / FERIADO AL 100%");
                      } else {
                          // Lunes a Sábado: Tope de 8.5 horas normales
                          if (workedHours > 8.5) {
                              hn = 8.5;
                              if (record.overtime_status === 'Aprobado') {
                                  he60 = parseFloat((workedHours - 8.5).toFixed(2));
                                  obsArr.push("MARCÓ DESPUÉS DEL HORARIO ESTABLECIDO Y JUSTIFICÓ HORAS EXTRAS");
                              } else {
                                  obsArr.push("MARCÓ DESPUÉS DEL HORARIO ESTABLECIDO PERO NO JUSTIFICÓ HORAS EXTRAS");
                              }
                          } else {
                              hn = parseFloat(workedHours.toFixed(2));
                              if (!obsArr.some(o => o.includes("UBICACIÓN") || o.includes("TARDANZA"))) {
                                  obsArr.push("SALIÓ DENTRO DEL TIEMPO ESTABLECIDO");
                              }
                          }
                      }
                  }
              }
          }

          // Sumamos a los totales
          stats.totalHN += hn;
          stats.totalHE60 += he60;
          stats.totalHE100 += he100;

          // Observación final unida
          let finalObs = obsArr.length > 0 ? obsArr.join(' | ') : '';
          // Si el admin escribió algo manual, lo agregamos al final
          if (record && record.observation && !finalObs.includes(record.observation)) {
              finalObs += finalObs ? ` | ${record.observation}` : record.observation;
          }

          rows.push(
              <tr key={i} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors text-[10px] sm:text-[11px] group">
                  <td className="p-2 border-r border-gray-200 capitalize font-medium text-slate-800 break-words">{displayDate}</td>
                  <td className="p-2 border-r border-gray-200 text-center text-slate-500 bg-slate-50/50">{jornadaIn}</td>
                  <td className="p-2 border-r border-gray-200 text-center text-slate-500 bg-slate-50/50">{jornadaOut}</td>
                  <td className="p-2 border-r border-gray-200 text-center font-bold text-[#003366]">{checkIn !== '--:--:--' ? checkIn : ''}</td>
                  <td className="p-2 border-r border-gray-200 text-center font-bold text-[#003366]">{checkOut !== '--:--:--' ? checkOut : ''}</td>
                  <td className="p-2 border-r border-gray-200 text-center font-bold text-emerald-700 bg-emerald-50/30">{hn > 0 ? hn : ''}</td>
                  <td className="p-2 border-r border-gray-200 text-center font-bold text-amber-600 bg-amber-50/30">{he60 > 0 ? he60 : ''}</td>
                  <td className="p-2 border-r border-gray-200 text-center font-bold text-purple-600 bg-purple-50/30">{he100 > 0 ? he100 : ''}</td>
                  <td className="p-2 border-r border-gray-200 text-slate-600 text-[9px] leading-tight min-w-[150px]">{finalObs}</td>
                  <td className="p-2 text-center text-slate-400 font-mono text-[9px] min-w-[80px]">{obra}</td>
              </tr>
          );

          currentDate = addDays(currentDate, 1);
      }

      return { rows, stats };
  };

  const reportData = generateReportData();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* HEADER TIPO APP */}
      <div className="bg-[#003366] text-white p-6 pt-12 pb-20 rounded-b-[3rem] shadow-lg relative z-10">
         <button onClick={() => navigate(-1)} className="absolute top-8 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={24} />
         </button>
         <div className="text-center mt-4">
            <div className="w-16 h-16 bg-blue-500/20 border border-blue-400/30 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
               <CalendarDays size={32} className="text-blue-100"/>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Mis Asistencias</h1>
            <p className="text-blue-200 text-sm mt-1 font-medium">Historial detallado y horas extras</p>
         </div>
      </div>

      {/* LISTA DE SEMANAS */}
      <div className="p-6 -mt-10 relative z-20 space-y-4 max-w-lg mx-auto w-full flex-1 overflow-y-auto pb-20">
         {weeks.map((week, index) => (
             <motion.div 
                 key={week.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: index * 0.1 }}
                 onClick={() => handleSelectWeek(week)}
                 className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex items-center justify-between cursor-pointer hover:border-[#003366] hover:shadow-xl transition-all active:scale-95 group relative overflow-hidden"
             >
                 <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#003366] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="flex items-center gap-4 ml-2">
                     <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003366] flex items-center justify-center font-black text-lg shadow-inner border border-blue-100 group-hover:bg-[#003366] group-hover:text-white transition-colors">
                         {week.weekNumber}
                     </div>
                     <div>
                         <h3 className="font-bold text-slate-800 text-lg">Semana {week.weekNumber}</h3>
                         <p className="text-xs text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block border border-slate-100">{week.displayRange}</p>
                     </div>
                 </div>
                 <div className="p-2 bg-slate-50 rounded-full text-slate-400 group-hover:text-[#003366] group-hover:bg-blue-50 transition-colors">
                    <FileText size={24}/>
                 </div>
             </motion.div>
         ))}
      </div>

      {/* MODAL DEL REPORTE TIPO PDF (CON SCROLL CORREGIDO) */}
      <AnimatePresence>
          {selectedWeek && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/90 backdrop-blur-sm">
                  <motion.div 
                     initial={{ opacity: 0, y: "100%" }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: "100%" }}
                     className="bg-slate-200 sm:rounded-2xl w-full h-full sm:h-auto sm:max-h-[95vh] max-w-6xl flex flex-col shadow-2xl overflow-hidden"
                  >
                     {/* CABECERA DEL MODAL (Controles fijos arriba) */}
                     <div className="flex justify-between items-center p-4 border-b border-slate-300 bg-white shadow-sm z-10 shrink-0">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                             <FileText size={20} className="text-[#003366]"/> Documento Oficial de Asistencia
                         </h3>
                         <button onClick={() => setSelectedWeek(null)} className="p-2 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors active:scale-90"><X size={20}/></button>
                     </div>

                     {/* CONTENEDOR DESLIZABLE (SCROLL VERTICAL HABILITADO) */}
                     <div className="flex-1 overflow-y-auto p-2 sm:p-6 pb-20">
                         {loading ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-500 mt-20">
                                 <Loader2 className="animate-spin mb-4 text-[#003366]" size={48}/>
                                 <p className="font-bold">Calculando horas y totales...</p>
                             </div>
                         ) : (
                             // DISEÑO DEL "PAPEL" BLANCO
                             <div className="bg-white w-full max-w-5xl mx-auto shadow-md rounded-xl border-t-[12px] border-[#003366] p-4 sm:p-10 text-black font-sans relative">
                                 
                                 {/* LOGO EMPRESA */}
                                 <div className="mb-6 sm:absolute sm:top-8 sm:left-10 flex justify-center sm:justify-start">
                                     <img src={logoFull} alt="L&K Logo" className="h-10 sm:h-14 object-contain drop-shadow-sm" />
                                 </div>

                                 {/* TITULOS DEL REPORTE */}
                                 <div className="text-center mb-8 sm:mb-10 sm:mt-0">
                                     <h2 className="text-lg sm:text-2xl font-black uppercase tracking-widest text-[#003366] mb-1">Reporte de Asistencia</h2>
                                     <div className="h-1 w-24 sm:w-32 bg-[#f0c419] mx-auto rounded-full"></div>
                                 </div>

                                 {/* INFO DEL TRABAJADOR Y SEMANA */}
                                 <div className="flex flex-col sm:flex-row justify-between text-[11px] sm:text-sm mb-6 border-b-2 border-slate-100 pb-4 sm:pb-6 gap-4">
                                     <div className="space-y-1.5">
                                         <p><span className="font-bold text-[#003366] w-16 sm:w-20 inline-block">Nombre:</span> {worker?.full_name}</p>
                                         <p><span className="font-bold text-[#003366] w-16 sm:w-20 inline-block">DNI:</span> {worker?.document_number}</p>
                                         <p><span className="font-bold text-[#003366] w-16 sm:w-20 inline-block">Empresa:</span> CONSTRUCTORA E INVERSIONES L&K S.A.C.</p>
                                         <p><span className="font-bold text-[#003366] w-16 sm:w-20 inline-block">RUC:</span> 20482531301</p>
                                         <p><span className="font-bold text-[#003366] w-16 sm:w-20 inline-block">Obra:</span> <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{worker?.project_assigned || 'S/N'}</span></p>
                                     </div>
                                     <div className="text-left sm:text-right space-y-2">
                                         <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-200 inline-block">
                                            <p className="text-slate-600 text-[10px] sm:text-xs"><span className="font-bold text-[#003366]">Fecha del:</span> {format(selectedWeek.startObj, 'dd/MM/yyyy')} <span className="font-bold text-[#003366] mx-1">Al</span> {format(selectedWeek.endObj, 'dd/MM/yyyy')}</p>
                                         </div>
                                         <div className="sm:block flex justify-between items-center mt-2 sm:mt-0">
                                            <p className="text-lg sm:text-xl font-black text-[#003366] bg-blue-50 inline-block px-4 py-1 rounded-lg border border-blue-100 shadow-sm">SEMANA {selectedWeek.weekNumber}</p>
                                         </div>
                                     </div>
                                 </div>

                                 {/* TABLA PRINCIPAL (CON SCROLL HORIZONTAL PROPIO PARA NO ROMPER EL CELULAR) */}
                                 <div className="w-full overflow-x-auto shadow-sm rounded-lg border border-gray-300 mb-8 pb-1">
                                     <table className="w-full border-collapse bg-white text-left min-w-[700px]">
                                         <thead className="bg-[#003366] text-white text-[10px] sm:text-xs tracking-wider">
                                             <tr>
                                                 <th rowSpan="2" className="border border-[#002244] p-3 font-bold w-[14%]">Fecha</th>
                                                 <th colSpan="2" className="border border-[#002244] p-2 font-bold text-center bg-blue-800">Jornada</th>
                                                 <th colSpan="2" className="border border-[#002244] p-2 font-bold text-center bg-blue-700">Marcaciones</th>
                                                 <th rowSpan="2" className="border border-[#002244] p-2 font-bold text-center w-10" title="Horas Normales">H.N.</th>
                                                 <th rowSpan="2" className="border border-[#002244] p-2 font-bold text-center w-12 leading-tight">H.E. AL<br/>60%</th>
                                                 <th rowSpan="2" className="border border-[#002244] p-2 font-bold text-center w-12 leading-tight">H.E. AL<br/>100%</th>
                                                 <th rowSpan="2" className="border border-[#002244] p-3 font-bold w-[25%]">OBSERVACIONES</th>
                                                 <th rowSpan="2" className="border border-[#002244] p-3 font-bold text-center w-[10%]">OBRA</th>
                                             </tr>
                                             <tr>
                                                 <th className="border border-[#002244] p-1 font-semibold text-center text-[9px] sm:text-[10px] bg-blue-800/80 text-blue-100">Ingreso</th>
                                                 <th className="border border-[#002244] p-1 font-semibold text-center text-[9px] sm:text-[10px] bg-blue-800/80 text-blue-100">Salida</th>
                                                 <th className="border border-[#002244] p-1 font-semibold text-center text-[9px] sm:text-[10px] bg-blue-700/80 text-blue-100">Ingreso</th>
                                                 <th className="border border-[#002244] p-1 font-semibold text-center text-[9px] sm:text-[10px] bg-blue-700/80 text-blue-100">Salida</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {reportData.rows}
                                         </tbody>
                                     </table>
                                 </div>

                                 {/* NUEVO: SECCIÓN DE TOTALES Y RESUMEN */}
                                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-6 mb-10 shadow-inner">
                                     <h4 className="text-[#003366] font-black uppercase text-sm mb-4 border-b border-slate-200 pb-2">Resumen de la Semana</h4>
                                     
                                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                         {/* Columna 1: Horas */}
                                         <div className="space-y-2 text-[10px] sm:text-xs">
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">JORNAL NORMAL (H.N.):</span>
                                                 <span className="font-black text-emerald-700 bg-emerald-100 px-2 rounded">{reportData.stats.totalHN} H</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">HORAS EXTRAS AL 60%:</span>
                                                 <span className="font-black text-amber-700 bg-amber-100 px-2 rounded">{reportData.stats.totalHE60} H</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">HORAS EXTRAS AL 100%:</span>
                                                 <span className="font-black text-purple-700 bg-purple-100 px-2 rounded">{reportData.stats.totalHE100} H</span>
                                             </div>
                                             <div className="flex justify-between items-center bg-[#003366] text-white p-1.5 rounded shadow-sm mt-2">
                                                 <span className="font-bold">TOTAL REALIZADO:</span>
                                                 <span className="font-black">{(reportData.stats.totalHN + reportData.stats.totalHE60 + reportData.stats.totalHE100).toFixed(2)} H</span>
                                             </div>
                                         </div>

                                         {/* Columna 2: Días y Faltas */}
                                         <div className="space-y-2 text-[10px] sm:text-xs">
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">DÍAS TRABAJADOS:</span>
                                                 <span className="font-black text-blue-700">{reportData.stats.diasTrabajados} DÍA(S)</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">INASISTENCIAS:</span>
                                                 <span className="font-black text-red-600">{reportData.stats.inasistencias} DÍA(S)</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">TARDANZAS JUSTIFICADAS:</span>
                                                 <span className="font-black text-slate-800">{reportData.stats.tardanzasJustificadas}</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">TARDANZAS NO JUSTIF.:</span>
                                                 <span className="font-black text-red-600">{reportData.stats.tardanzasNoJustificadas}</span>
                                             </div>
                                         </div>

                                         {/* Columna 3: GPS */}
                                         <div className="space-y-2 text-[10px] sm:text-xs">
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">ASISTENCIAS DENTRO (GPS):</span>
                                                 <span className="font-black text-emerald-600">{reportData.stats.asistenciasDentro}</span>
                                             </div>
                                             <div className="flex justify-between items-center border-b border-slate-200 border-dashed pb-1">
                                                 <span className="font-bold text-slate-600">ASISTENCIAS FUERA (GPS):</span>
                                                 <span className="font-black text-red-500">{reportData.stats.asistenciasFuera}</span>
                                             </div>
                                         </div>
                                     </div>
                                 </div>

                                 {/* ZONA DE FIRMAS (Adaptado para móvil) */}
                                 <div className="mt-12 sm:mt-24 mb-6 flex flex-col sm:flex-row justify-around px-4 sm:px-10 gap-12 sm:gap-0">
                                     <div className="w-full sm:w-56 text-center">
                                         <div className="border-t border-slate-400 pt-2">
                                             <p className="text-xs font-bold text-slate-800 uppercase">Firma del Trabajador</p>
                                             <p className="text-[10px] text-slate-500">DNI: {worker?.document_number}</p>
                                         </div>
                                     </div>
                                     <div className="w-full sm:w-56 text-center">
                                         <div className="border-t border-slate-400 pt-2">
                                             <p className="text-xs font-bold text-slate-800 uppercase">V° B° Recursos Humanos</p>
                                             <p className="text-[10px] text-slate-500">Constructora L&K</p>
                                         </div>
                                     </div>
                                 </div>

                             </div>
                         )}
                     </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default WorkerMyAttendances;