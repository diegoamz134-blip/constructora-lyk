import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper para obtener horas trabajadas
const getHoursDiff = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = e - s;
    return diffMs / (1000 * 60 * 60); // Retorna horas decimales
};

// Helper para saber si es domingo
const isSunday = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d); 
    return date.getDay() === 0; // 0 = Domingo
};

// Helper para obtener el Lunes de la semana dada una fecha
const getMondayOfWeek = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    // Ajuste: Si es domingo (0), volver 6 días. Si no, volver (day - 1) días.
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday;
};

export const generateTareoExcel = async (attendanceData, dateRange, project) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tareo Semanal');

    // --- 1. DETECCIÓN INTELIGENTE DE SEMANA ---
    // Si hay datos, usamos la fecha del primer registro para ubicar la semana correcta.
    // Si no hay datos, usamos la fecha del filtro.
    let referenceDate = dateRange.start;
    
    if (attendanceData && attendanceData.length > 0) {
        // Ordenamos temporalmente para encontrar la fecha más antigua real
        const sortedData = [...attendanceData].sort((a, b) => new Date(a.date) - new Date(b.date));
        referenceDate = sortedData[0].date;
    }

    const startOfWeek = getMondayOfWeek(referenceDate);
    const dateList = [];
    
    // Generar exactamente 7 días a partir del Lunes calculado
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        // Formato YYYY-MM-DD para keys
        const isoDate = d.toISOString().split('T')[0];
        dateList.push(isoDate);
    }

    // Calcular fecha fin de la semana para mostrar en cabecera
    const endOfWeekIso = dateList[6]; // Domingo

    // --- 2. PROCESAMIENTO DE DATOS ---
    const workersMap = {};

    attendanceData.forEach(record => {
        // Solo procesamos si la fecha del registro cae en esta semana calculada
        if (!dateList.includes(record.date)) return;

        const person = record.workers || record.employees;
        if (!person) return;

        // Validar campos de obrero vs empleado
        const role = record.workers ? record.workers.category : record.employees.position;
        const entryDate = person.start_date || person.entry_date || ''; 

        const id = person.id;
        if (!workersMap[id]) {
            workersMap[id] = {
                id,
                dni: person.document_number,
                name: person.full_name,
                category: role,
                entryDate: entryDate,
                days: {} 
            };
        }

        // --- LÓGICA DE CÁLCULO ---
        const totalHours = getHoursDiff(record.check_in_time, record.check_out_time);
        
        let n = 0;      // Normal (Días)
        let he60 = 0;   // Horas
        let he100 = 0;  // Horas
        
        if (totalHours > 0) {
            // Lógica Días (N): >= 5 horas es 1 día, < 5 es 0.5
            if (totalHours >= 5) n = 1;
            else n = 0.5;

            // Lógica Horas Extras (Umbral 9h = 8h trabajo + 1h comida)
            const THRESHOLD = 9; 
            const hoursForCalc = totalHours; 

            // Si ya tienes HE calculadas en DB, úsalas. Si no, calcúlalas aquí:
            // Priorizamos el campo 'overtime_hours' de la DB si existe (lo insertamos en el SQL)
            if (record.overtime_hours && parseFloat(record.overtime_hours) > 0) {
                // Si la DB dice explícitamente horas extras
                const extra = parseFloat(record.overtime_hours);
                // Asumimos lógica estándar: primeras 2 al 60%, resto al 100%
                if (extra <= 2) he60 = extra;
                else {
                    he60 = 2;
                    he100 = extra - 2;
                }
            } else if (hoursForCalc > THRESHOLD && !isSunday(record.date)) {
                // Cálculo automático si no viene de DB
                const extra = hoursForCalc - THRESHOLD;
                if (extra <= 2) he60 = extra;
                else {
                    he60 = 2;
                    he100 = extra - 2;
                }
            }

            // Domingos
            if (isSunday(record.date)) {
                n = 1;
                // Si trabajó domingo, se suele poner todo a 100% o según política
                // Aquí pondremos HE100 si hubo labor
                if (hoursForCalc > 0 && !he100) he100 = 8; 
            }
        }

        // Guardar en el mapa
        workersMap[id].days[record.date] = { 
            n: n > 0 ? n : '', 
            he60: he60 > 0 ? parseFloat(he60.toFixed(2)) : '', 
            he100: he100 > 0 ? parseFloat(he100.toFixed(2)) : '' 
        };
    });

    const workersArray = Object.values(workersMap);

    // Si no hay trabajadores, avisar en consola
    if (workersArray.length === 0) {
        console.warn("ExcelGenerator: No se encontraron trabajadores para la semana calculada:", dateList);
    }

    // --- 3. DISEÑO DEL EXCEL (ESTILOS) ---
    const borderStyle = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    
    sheet.getColumn('A').width = 5;  // ITEM
    sheet.getColumn('B').width = 12; // DNI
    sheet.getColumn('C').width = 35; // NOMBRES
    sheet.getColumn('D').width = 15; // CATEGORIA
    sheet.getColumn('E').width = 12; // FECHA ING

    // --- 4. CABECERA DEL PROYECTO ---
    sheet.mergeCells('A1:AC1');
    sheet.getCell('A1').value = 'TAREO SEMANAL PERSONAL OBRERO';
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = centerAlign;

    sheet.getCell('B4').value = 'CC:';
    sheet.getCell('C4').value = project?.project_code || '---';
    sheet.getCell('T4').value = 'RESPONSABLE:';
    sheet.getCell('V4').value = 'ADMINISTRACION DE OBRA';

    sheet.getCell('B6').value = 'OBRA:';
    sheet.getCell('C6').value = project?.name || 'GLOBAL';

    // FECHA EXACTA DE LA SEMANA
    sheet.getCell('B8').value = 'PERIODO:';
    sheet.getCell('C8').value = `DEL ${dateList[0]} AL ${endOfWeekIso}`;

    // --- 5. CABECERAS DE TABLA ---
    const headerRowIdx = 10;
    const subHeaderRowIdx = 11;
    
    sheet.getCell(`A${headerRowIdx}`).value = 'ITEM';
    sheet.getCell(`B${headerRowIdx}`).value = 'DNI';
    sheet.getCell(`C${headerRowIdx}`).value = 'APELLIDOS Y NOMBRES';
    sheet.getCell(`D${headerRowIdx}`).value = 'CATEGORIA';
    sheet.getCell(`E${headerRowIdx}`).value = 'FECHA DE INGRESO';

    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        sheet.mergeCells(`${col}${headerRowIdx}:${col}${subHeaderRowIdx}`);
        sheet.getCell(`${col}${headerRowIdx}`).alignment = centerAlign;
        sheet.getCell(`${col}${headerRowIdx}`).border = borderStyle;
        sheet.getCell(`${col}${headerRowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        sheet.getCell(`${col}${headerRowIdx}`).font = { size: 8, bold: true };
    });

    // Columnas Dinámicas (7 DÍAS)
    let colIndex = 6; // F
    
    dateList.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d); 

        const dayName = dObj.toLocaleDateString('es-ES', { weekday: 'long' });
        const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const dateLabel = dObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });

        const startCol = colIndex;
        const endCol = colIndex + 2;
        sheet.mergeCells(headerRowIdx, startCol, headerRowIdx, endCol);
        
        const cell = sheet.getCell(headerRowIdx, startCol);
        cell.value = `${dayLabel} ${dateLabel}`;
        cell.alignment = centerAlign;
        cell.border = borderStyle;
        cell.font = { size: 8, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }; 

        const labels = ['N', '0.6', '1'];
        labels.forEach((lbl, idx) => {
            const subCell = sheet.getCell(subHeaderRowIdx, startCol + idx);
            subCell.value = lbl;
            subCell.alignment = centerAlign;
            subCell.border = borderStyle;
            subCell.font = { size: 7, bold: true };
            sheet.getColumn(startCol + idx).width = 4;
        });

        colIndex += 3;
    });

    // Columna Totales
    const totalStartCol = colIndex;
    sheet.mergeCells(headerRowIdx, totalStartCol, headerRowIdx, totalStartCol + 2);
    sheet.getCell(headerRowIdx, totalStartCol).value = 'TOTAL';
    sheet.getCell(headerRowIdx, totalStartCol).alignment = centerAlign;
    sheet.getCell(headerRowIdx, totalStartCol).border = borderStyle;
    sheet.getCell(headerRowIdx, totalStartCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    ['Horas', '60%', '100%'].forEach((lbl, idx) => {
        const c = sheet.getCell(subHeaderRowIdx, totalStartCol + idx);
        c.value = lbl;
        c.alignment = centerAlign;
        c.border = borderStyle;
        c.font = { size: 7, bold: true };
        sheet.getColumn(totalStartCol + idx).width = 6;
    });

    const obsCol = totalStartCol + 3;
    sheet.mergeCells(headerRowIdx, obsCol, subHeaderRowIdx, obsCol);
    sheet.getCell(headerRowIdx, obsCol).value = 'OBSERVACION';
    sheet.getCell(headerRowIdx, obsCol).alignment = centerAlign;
    sheet.getCell(headerRowIdx, obsCol).border = borderStyle;
    sheet.getColumn(obsCol).width = 20;

    // --- 6. LLENADO DE DATOS ---
    let currentRow = 12;

    workersArray.forEach((worker, idx) => {
        sheet.getCell(`A${currentRow}`).value = idx + 1;
        sheet.getCell(`B${currentRow}`).value = worker.dni;
        sheet.getCell(`C${currentRow}`).value = worker.name;
        sheet.getCell(`D${currentRow}`).value = worker.category;
        sheet.getCell(`E${currentRow}`).value = worker.entryDate;

        let colCursor = 6;
        let sumN = 0;
        let sum60 = 0;
        let sum100 = 0;

        dateList.forEach(dateStr => {
            const dayData = worker.days[dateStr] || { n: '', he60: '', he100: '' };
            
            // N
            const cN = sheet.getCell(currentRow, colCursor);
            cN.value = dayData.n;
            if(dayData.n) sumN += parseFloat(dayData.n);

            // 60
            const c60 = sheet.getCell(currentRow, colCursor + 1);
            c60.value = dayData.he60;
            if(dayData.he60) sum60 += parseFloat(dayData.he60);

            // 100
            const c100 = sheet.getCell(currentRow, colCursor + 2);
            c100.value = dayData.he100;
            if(dayData.he100) sum100 += parseFloat(dayData.he100);

            [cN, c60, c100].forEach(c => {
                c.alignment = centerAlign;
                c.border = borderStyle;
                c.font = { size: 8 };
            });

            colCursor += 3;
        });

        // Totales
        const cellTN = sheet.getCell(currentRow, totalStartCol);
        cellTN.value = sumN > 0 ? sumN : '';
        
        const cellT60 = sheet.getCell(currentRow, totalStartCol + 1);
        cellT60.value = sum60 > 0 ? sum60 : '';

        const cellT100 = sheet.getCell(currentRow, totalStartCol + 2);
        cellT100.value = sum100 > 0 ? sum100 : '';

        ['A','B','C','D','E'].forEach(col => {
            const c = sheet.getCell(`${col}${currentRow}`);
            c.border = borderStyle;
            c.alignment = col === 'C' ? { vertical: 'middle', horizontal: 'left' } : centerAlign;
            c.font = { size: 8 };
        });
        
        [cellTN, cellT60, cellT100].forEach(c => {
            c.border = borderStyle;
            c.alignment = centerAlign;
            c.font = { size: 8, bold: true };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        });
        
        sheet.getCell(currentRow, obsCol).border = borderStyle;

        currentRow++;
    });

    // --- 7. EXPORTAR ---
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `TAREO_SEMANAL_${dateList[0]}_${project?.name || 'GLOBAL'}.xlsx`);
};