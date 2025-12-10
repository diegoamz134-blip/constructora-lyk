import React, { useEffect, useState } from 'react';
import { MapPin, Calendar, Clock, FileSpreadsheet, FileDown, Filter, Camera } from 'lucide-react';
import { supabase } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFull from '../../assets/images/logo-lk-full.png';
// Librerías para Excel Avanzado
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ReportsPage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [loading, setLoading] = useState(true);

  // Cargar lista de proyectos
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase.from('projects').select('name');
      if (data) setProjects(data.map(p => p.name));
    };
    fetchProjects();
  }, []);

  // Cargar asistencia
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          workers ( id, full_name, category, document_number, project_assigned, start_date )
        `)
        .order('created_at', { ascending: false });

      if (selectedProject !== 'Todos') {
        query = query.eq('project_name', selectedProject);
      }

      const { data, error } = await query;
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
  }, [selectedProject]);

  // --- FUNCIÓN HELPER PARA MAPAS ---
  const getMapLink = (locationString) => {
    if (!locationString) return '#';
    return `https://www.google.com/maps?q=${locationString}`;
  };

  // --- FUNCIÓN 1: EXPORTAR TAREO SEMANAL (EXCEL AVANZADO) ---
  const generateWeeklyTareo = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tareo Semanal');

    // 1. Calcular fechas de la semana actual (Lunes a Domingo)
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // Lunes
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      weekDates.push(day);
    }
    const startDateStr = weekDates[0].toLocaleDateString('es-PE');
    const endDateStr = weekDates[6].toLocaleDateString('es-PE');

    // 2. Obtener lista completa de obreros (filtrados por proyecto si aplica)
    let workerQuery = supabase.from('workers').select('*').eq('status', 'Activo');
    if (selectedProject !== 'Todos') {
        workerQuery = workerQuery.eq('project_assigned', selectedProject);
    }
    const { data: allWorkers } = await workerQuery;

    // --- ESTILOS EXCEL (Inspirados en tu imagen) ---
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } }; // Azul Claro
    const titleFont = { name: 'Arial', size: 14, bold: true, underline: true };
    const headerFont = { name: 'Arial', size: 8, bold: true };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };

    // --- ENCABEZADO ---
    worksheet.mergeCells('D2:J2');
    const titleCell = worksheet.getCell('D2');
    titleCell.value = 'TAREO SEMANAL PERSONAL OBRERO';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    worksheet.getCell('C4').value = 'OBRA:';
    worksheet.getCell('D4').value = selectedProject.toUpperCase();
    worksheet.getCell('C5').value = 'PERIODO:';
    worksheet.getCell('D5').value = `DEL ${startDateStr} AL ${endDateStr}`;

    // --- CABECERA DE TABLA ---
    const headerRowIdx = 8;
    worksheet.getCell(`A${headerRowIdx}`).value = 'ITEM';
    worksheet.getCell(`B${headerRowIdx}`).value = 'DNI';
    worksheet.getCell(`C${headerRowIdx}`).value = 'APELLIDOS Y NOMBRES';
    worksheet.getCell(`D${headerRowIdx}`).value = 'CATEGORIA';
    worksheet.getCell(`E${headerRowIdx}`).value = 'FECHA ING.';

    // Días de la semana
    let colIndex = 6; // Columna F
    const daysNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    weekDates.forEach((date, i) => {
        const colLetter = worksheet.getColumn(colIndex).letter;
        // Fila 1: Fecha (14-jul)
        worksheet.getCell(`${colLetter}${headerRowIdx}`).value = `${date.getDate()}-${date.toLocaleDateString('es-PE', { month: 'short' })}`;
        // Fila 2: Día (Lun) - simulado en misma celda con salto o estilo
        // Para simplificar, ponemos la fecha arriba.
        
        // Color rojo para domingo
        if (i === 6) {
            worksheet.getCell(`${colLetter}${headerRowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        } else {
            worksheet.getCell(`${colLetter}${headerRowIdx}`).fill = headerFill;
        }
        colIndex++;
    });

    // Columna Total
    const totalColLetter = worksheet.getColumn(colIndex).letter;
    worksheet.getCell(`${totalColLetter}${headerRowIdx}`).value = 'TOTAL DIAS';
    worksheet.getCell(`${totalColLetter}${headerRowIdx}`).fill = headerFill;

    // Aplicar estilos a cabecera fija
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const cell = worksheet.getCell(`${col}${headerRowIdx}`);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = centerAlign;
        cell.border = borderStyle;
    });

    // --- FILAS DE DATOS (MATRIZ) ---
    let currentRow = headerRowIdx + 1;
    
    if (allWorkers) {
        allWorkers.forEach((worker, index) => {
            worksheet.getCell(`A${currentRow}`).value = index + 1;
            worksheet.getCell(`B${currentRow}`).value = worker.document_number;
            worksheet.getCell(`C${currentRow}`).value = worker.full_name;
            worksheet.getCell(`D${currentRow}`).value = worker.category;
            worksheet.getCell(`E${currentRow}`).value = worker.start_date ? new Date(worker.start_date).toLocaleDateString() : '-';

            let totalDays = 0;
            let dayColIndex = 6;

            weekDates.forEach((date) => {
                const dateStr = date.toISOString().split('T')[0];
                // Buscar si hay asistencia para este obrero en esta fecha
                const hasAttendance = attendanceData.find(a => a.worker_id === worker.id && a.date === dateStr);
                
                const cell = worksheet.getCell(currentRow, dayColIndex);
                
                if (hasAttendance) {
                    cell.value = 1.0; // Asistencia completa
                    cell.font = { color: { argb: 'FF0000FF' }, bold: true }; // Azul
                    cell.alignment = centerAlign;
                    totalDays += 1;
                } else {
                    cell.value = ''; // Falta
                }
                cell.border = borderStyle;
                dayColIndex++;
            });

            // Total
            const totalCell = worksheet.getCell(currentRow, dayColIndex);
            totalCell.value = totalDays;
            totalCell.font = { bold: true };
            totalCell.alignment = centerAlign;
            totalCell.border = borderStyle;

            // Bordes para columnas fijas
            ['A', 'B', 'C', 'D', 'E'].forEach(col => {
                worksheet.getCell(`${col}${currentRow}`).border = borderStyle;
            });
            
            currentRow++;
        });
    }

    // Ajustar anchos
    worksheet.getColumn('A').width = 5;
    worksheet.getColumn('B').width = 12;
    worksheet.getColumn('C').width = 35;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 12;

    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Tareo_Semanal_${selectedProject.replace(/\s+/g, '_')}.xlsx`);
  };

  // --- FUNCIÓN 2: EXPORTAR PDF (ACTUALIZADA) ---
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const img = new Image();
    img.src = logoFull;
    
    img.onload = () => {
      doc.addImage(img, 'PNG', 14, 10, 35, 12);
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.setFont('helvetica', 'bold');
      doc.text("REPORTE DE ASISTENCIA DE PERSONAL", 280, 18, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.setFont('helvetica', 'normal');
      doc.text(`PROYECTO: ${selectedProject.toUpperCase()}`, 280, 24, { align: 'right' });
      doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()}`, 280, 29, { align: 'right' });

      const tableColumn = ["N°", "OBRERO", "DNI", "CATEGORÍA", "FECHA", "H. ENTRADA", "UBICACIÓN ENTRADA", "H. SALIDA", "UBICACIÓN SALIDA"];
      
      const tableRows = attendanceData.map((item, index) => {
        const horaEntrada = item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
        const ubicacionEntrada = item.check_in_location || '-';
        const horaSalida = item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-';
        const ubicacionSalida = item.check_out_location || '-';

        return [
          index + 1,
          item.workers?.full_name?.toUpperCase() || '',
          item.workers?.document_number || '',
          item.workers?.category || '',
          new Date(item.date).toLocaleDateString(),
          horaEntrada,
          ubicacionEntrada,
          horaSalida,
          ubicacionSalida
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 3, valign: 'middle' },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, halign: 'center', fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 }, 
            6: { halign: 'center', fontSize: 6, cellWidth: 35 },
            8: { halign: 'center', fontSize: 6, cellWidth: 35 } 
        },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      });
      doc.save(`Reporte_${selectedProject.replace(/\s+/g, '_')}.pdf`);
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes de Asistencia</h2>
          <p className="text-slate-500 text-sm">Control diario por obra.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            <div className="relative group">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <select 
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003366]/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
                >
                    <option value="Todos">Todas las Obras</option>
                    {projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-sm hover:shadow-md active:scale-95">
                <FileDown size={18} /> PDF
            </button>
             <button onClick={generateWeeklyTareo} className="flex items-center gap-2 px-4 py-2.5 bg-[#1D6F42] text-white rounded-xl text-sm font-bold hover:bg-[#155734] transition shadow-sm hover:shadow-md active:scale-95">
                <FileSpreadsheet size={18} /> Tareo Semanal (Excel)
            </button>
        </div>
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
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Obra</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Entrada</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition text-sm">
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{item.workers?.full_name}</div>
                      <div className="text-xs text-slate-400">{item.workers?.category}</div>
                    </td>
                    <td className="p-4 text-xs font-bold text-[#003366]">
                        {item.project_name || <span className="text-slate-300 italic">No registrado</span>}
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* COLUMNA ENTRADA CON FOTO Y MAPA */}
                    <td className="p-4 text-center">
                      {item.check_in_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-100">
                            <Clock size={12}/> {new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          
                          <div className="flex gap-2">
                            {/* Ver Foto */}
                            {item.check_in_photo && (
                              <a href={item.check_in_photo} target="_blank" rel="noreferrer" className="group relative">
                                <div className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition border border-slate-200">
                                   <Camera size={14} />
                                </div>
                              </a>
                            )}
                            {/* Ver Mapa */}
                            {item.check_in_location && (
                              <a 
                                href={getMapLink(item.check_in_location)} target="_blank" rel="noreferrer"
                                className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition border border-slate-200"
                                title="Ver ubicación"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : '-'}
                    </td>

                    {/* COLUMNA SALIDA CON FOTO Y MAPA */}
                    <td className="p-4 text-center">
                      {item.check_out_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100">
                            <Clock size={12}/> {new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          
                          <div className="flex gap-2">
                            {/* Ver Foto */}
                            {item.check_out_photo && (
                              <a href={item.check_out_photo} target="_blank" rel="noreferrer" className="group relative">
                                <div className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition border border-slate-200">
                                   <Camera size={14} />
                                </div>
                              </a>
                            )}
                            {/* Ver Mapa */}
                            {item.check_out_location && (
                              <a 
                                href={getMapLink(item.check_out_location)} target="_blank" rel="noreferrer"
                                className="p-1.5 bg-slate-100 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition border border-slate-200"
                                title="Ver ubicación"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : <span className="text-slate-300 italic">Pendiente</span>}
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

export default ReportsPage;