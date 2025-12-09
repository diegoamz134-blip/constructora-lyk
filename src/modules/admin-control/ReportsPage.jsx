import React, { useEffect, useState } from 'react';
import { MapPin, Calendar, Clock, FileSpreadsheet, FileDown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFull from '../../assets/images/logo-lk-full.png';

// Librerías para Excel Avanzado
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ReportsPage = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          workers ( id, full_name, category, document_number, project_assigned, start_date )
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

  // --- FUNCIÓN HELPER PARA MAPAS ---
  const getMapLink = (locationString) => {
    if (!locationString) return '#';
    return `https://www.google.com/maps?q=${locationString}`;
  };

  // --- FUNCIÓN 1: EXPORTAR TAREO SEMANAL (EXCEL AVANZADO) ---
  const generateWeeklyTareo = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Tareo Semanal');

    // 1. Fechas Semana
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; 
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      weekDates.push(day);
    }
    const startDateStr = weekDates[0].toLocaleDateString('es-PE');
    const endDateStr = weekDates[6].toLocaleDateString('es-PE');

    // 2. Workers Activos
    const { data: allWorkers } = await supabase.from('workers').select('*').eq('status', 'Activo');

    // Estilos Excel
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00B0F0' } };
    const titleFont = { name: 'Arial', size: 14, bold: true, underline: true };
    const headerFont = { name: 'Arial', size: 8, bold: true };
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };

    // Encabezado
    worksheet.mergeCells('D2:J2');
    const titleCell = worksheet.getCell('D2');
    titleCell.value = 'TAREO SEMANAL PERSONAL OBRERO';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlign;

    worksheet.getCell('C4').value = 'CC:';
    worksheet.getCell('D4').value = 'PC - 25033';
    worksheet.getCell('C5').value = 'OBRA:';
    worksheet.getCell('D5').value = 'PROYECTO SENATI (DEMO)';
    worksheet.getCell('C6').value = 'PERIODO:';
    worksheet.getCell('D6').value = `DEL ${startDateStr} AL ${endDateStr}`;

    // Cabecera Tabla
    worksheet.mergeCells('A10:A11'); worksheet.getCell('A10').value = 'ITEM';
    worksheet.mergeCells('B10:B11'); worksheet.getCell('B10').value = 'DNI';
    worksheet.mergeCells('C10:C11'); worksheet.getCell('C10').value = 'APELLIDOS Y NOMBRES';
    worksheet.mergeCells('D10:D11'); worksheet.getCell('D10').value = 'CATEGORIA';
    worksheet.mergeCells('E10:E11'); worksheet.getCell('E10').value = 'FECHA INGRESO';

    let colIndex = 6; 
    const daysNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    weekDates.forEach((date, i) => {
        const colLetter = worksheet.getColumn(colIndex).letter;
        worksheet.getCell(`${colLetter}10`).value = `${date.getDate()}-${date.toLocaleDateString('es-PE', { month: 'short' })}`;
        worksheet.getCell(`${colLetter}11`).value = daysNames[i];
        
        if (i === 6) {
            worksheet.getCell(`${colLetter}10`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
            worksheet.getCell(`${colLetter}11`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        } else {
            worksheet.getCell(`${colLetter}10`).fill = headerFill;
            worksheet.getCell(`${colLetter}11`).fill = headerFill;
        }
        colIndex++;
    });

    const totalColLetter = worksheet.getColumn(colIndex).letter;
    worksheet.mergeCells(`${totalColLetter}10:${totalColLetter}11`);
    worksheet.getCell(`${totalColLetter}10`).value = 'TOTAL';
    worksheet.getCell(`${totalColLetter}10`).fill = headerFill;

    ['A10', 'B10', 'C10', 'D10', 'E10'].forEach(cell => {
        const c = worksheet.getCell(cell);
        c.fill = headerFill;
        c.font = headerFont;
        c.alignment = centerAlign;
        c.border = borderStyle;
    });

    // Filas de Datos
    let currentRow = 12;
    allWorkers.forEach((worker, index) => {
        worksheet.getCell(`A${currentRow}`).value = index + 1;
        worksheet.getCell(`B${currentRow}`).value = worker.document_number;
        worksheet.getCell(`C${currentRow}`).value = worker.full_name;
        worksheet.getCell(`D${currentRow}`).value = worker.category;
        worksheet.getCell(`E${currentRow}`).value = worker.start_date || '-';

        let totalDays = 0;
        let dayColIndex = 6;

        weekDates.forEach((date) => {
            const dateStr = date.toISOString().split('T')[0];
            const hasAttendance = attendanceData.find(a => a.worker_id === worker.id && a.date === dateStr);
            const cell = worksheet.getCell(currentRow, dayColIndex);
            
            if (hasAttendance) {
                cell.value = 1.0; 
                cell.font = { color: { argb: 'FF0000FF' }, bold: true };
                cell.alignment = centerAlign;
                totalDays += 1;
            } else {
                cell.value = '';
            }
            cell.border = borderStyle;
            dayColIndex++;
        });

        const totalCell = worksheet.getCell(currentRow, dayColIndex);
        totalCell.value = totalDays;
        totalCell.font = { bold: true };
        totalCell.alignment = centerAlign;
        totalCell.border = borderStyle;

        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
            worksheet.getCell(`${col}${currentRow}`).border = borderStyle;
        });
        currentRow++;
    });

    worksheet.getColumn('A').width = 5;
    worksheet.getColumn('B').width = 12;
    worksheet.getColumn('C').width = 35;
    worksheet.getColumn('D').width = 15;
    worksheet.getColumn('E').width = 12;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Tareo_Semanal.xlsx`);
  };

  // --- FUNCIÓN 2: EXPORTAR PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const today = new Date();
    const img = new Image();
    img.src = logoFull;
    
    img.onload = () => {
      doc.addImage(img, 'PNG', 10, 10, 40, 15);
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.setFont('helvetica', 'bold');
      doc.text("LISTA DE ASISTENCIA DE PERSONAL - L&K", 280, 20, { align: 'right' });

      // ... (Resto de tu lógica de PDF existente va aquí) ...
      // Para no hacer el código gigante, asumo que usas la lógica que ya te funcionaba bien
      
      const tableColumn = ["N°", "APELLIDOS Y NOMBRES", "DNI", "CATEGORÍA", "H. INGRESO", "H. SALIDA"];
      const tableRows = attendanceData.map((item, index) => [
          index + 1,
          item.workers?.full_name?.toUpperCase() || '',
          item.workers?.document_number || '',
          item.workers?.category?.toUpperCase() || '',
          item.check_in_time ? new Date(item.check_in_time).toLocaleTimeString() : '-',
          item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString() : '-'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
      });
      
      doc.save(`Reporte_Diario_${today.toISOString().split('T')[0]}.pdf`);
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
          <h3 className="text-xl font-medium text-slate-600 mt-1">Panel de Control de Asistencia</h3>
          <p className="text-slate-500 text-sm">Gestiona y exporta la información del personal.</p>
        </div>
        
        <div className="flex gap-3">
            <button onClick={generateWeeklyTareo} className="flex items-center gap-2 px-5 py-2.5 bg-[#1D6F42] text-white rounded-xl text-sm font-bold hover:bg-[#155734] transition shadow-sm hover:shadow-md active:scale-95">
                <FileSpreadsheet size={18} /> Tareo Semanal (Excel)
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-sm hover:shadow-md active:scale-95">
                <FileDown size={18} /> Reporte Diario (PDF)
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
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Entrada</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition text-sm">
                    <td className="p-4">
                      <div className="font-bold text-slate-700">{item.workers?.full_name || 'Desconocido'}</div>
                      <div className="text-xs text-slate-400">{item.workers?.category}</div>
                    </td>
                    
                    <td className="p-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </td>

                    {/* COLUMNA ENTRADA CON ICONOS RESTAURADOS */}
                    <td className="p-4 text-center">
                      {item.check_in_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-green-100">
                            <Clock size={12}/> {new Date(item.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex gap-2">
                            {/* Link Mapa */}
                            {item.check_in_location && (
                              <a 
                                href={getMapLink(item.check_in_location)} target="_blank" rel="noreferrer"
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                                title="Ver ubicación"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                            {/* Foto */}
                            {item.check_in_photo && (
                              <a href={item.check_in_photo} target="_blank" rel="noreferrer" className="block group relative">
                                <img src={item.check_in_photo} alt="Foto" className="w-8 h-8 rounded-md object-cover border border-slate-200" />
                              </a>
                            )}
                          </div>
                        </div>
                      ) : '-'}
                    </td>

                    {/* COLUMNA SALIDA CON ICONOS RESTAURADOS */}
                    <td className="p-4 text-center">
                      {item.check_out_time ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-100">
                            <Clock size={12}/> {new Date(item.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          <div className="flex gap-2">
                            {/* Link Mapa */}
                            {item.check_out_location && (
                              <a 
                                href={getMapLink(item.check_out_location)} target="_blank" rel="noreferrer"
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                                title="Ver ubicación"
                              >
                                <MapPin size={14} />
                              </a>
                            )}
                            {/* Foto */}
                            {item.check_out_photo && (
                              <a href={item.check_out_photo} target="_blank" rel="noreferrer" className="block group relative">
                                <img src={item.check_out_photo} alt="Foto" className="w-8 h-8 rounded-md object-cover border border-slate-200" />
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