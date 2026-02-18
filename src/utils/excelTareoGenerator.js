import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- HELPERS DE FECHA ---
const getHoursDiff = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = e - s;
    return diffMs / (1000 * 60 * 60);
};

const isSunday = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d); 
    return date.getDay() === 0;
};

const isSaturday = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d); 
    return date.getDay() === 6;
};

const getMondayOfWeek = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday;
};

// --- FUNCIÓN PRINCIPAL PARA GENERAR UNA HOJA ---
const addTareoSheet = (workbook, sheetName, dateList, allWorkers, allStaff, attendanceData, projectFilter) => {
    const safeSheetName = sheetName.replace(/[\\/?*\[\]]/g, '').substring(0, 30) || 'Hoja';
    
    // CORRECCIÓN: Creamos la hoja al principio para evitar errores de referencia
    const sheet = workbook.addWorksheet(safeSheetName);

    // 1. PROCESAMIENTO DE DATOS
    const workersMap = {};

    const addToMap = (person, type) => {
        if (projectFilter) {
            if (type === 'staff' && person.sede_id !== projectFilter.id) return;
            if (type === 'worker' && person.project_assigned !== projectFilter.name) return;
        }

        workersMap[person.id] = {
            id: person.id,
            dni: person.document_number,
            name: person.full_name,
            category: type === 'worker' ? person.category : person.position,
            entryDate: person.start_date || person.entry_date || '',
            days: {},
            observations: [],
            hasAttendanceInThisProject: false 
        };
    };

    allWorkers.forEach(w => addToMap(w, 'worker'));
    allStaff.forEach(s => addToMap(s, 'staff'));

    attendanceData.forEach(record => {
        if (!dateList.includes(record.date)) return;

        if (projectFilter) {
            const matchesName = record.project_name === projectFilter.name;
            const matchesSede = record.employees && record.employees.sede_id === projectFilter.id;
            if (!matchesName && !matchesSede) return;
        }

        const person = record.workers || record.employees;
        if (!person) return;
        const id = person.id;

        if (!workersMap[id]) {
             if (allStaff.length === 0 && record.employees) return;
             if (allWorkers.length === 0 && record.workers) return;

             const role = record.workers ? record.workers.category : record.employees.position;
             const entryDate = person.start_date || person.entry_date || ''; 
             workersMap[id] = {
                id,
                dni: person.document_number,
                name: person.full_name,
                category: role,
                entryDate: entryDate,
                days: {},
                observations: [],
                hasAttendanceInThisProject: false
            };
        }

        workersMap[id].hasAttendanceInThisProject = true;
        
        if (record.observation) {
            const obsDate = new Date(record.date + 'T00:00:00');
            const dayName = obsDate.toLocaleDateString('es-PE', { weekday: 'short' });
            workersMap[id].observations.push(`${dayName} ${obsDate.getDate()}: ${record.observation}`);
        }

        // --- CÁLCULO DE HORAS ACTUALIZADO (LÓGICA SÁBADO FIX) ---
        // 1. Obtenemos diferencia exacta
        let rawHours = getHoursDiff(record.check_in_time, record.check_out_time);
        
        // 2. Descuento Almuerzo (Solo Lun-Vie si trabaja 6h o más)
        if (!isSaturday(record.date) && rawHours >= 6) {
            rawHours -= 1; 
        }

        // 3. Redondeo Visual (Para mostrar en Excel) - Piso al 0.5
        let displayHours = rawHours;
        if (displayHours > 0) {
            displayHours = Math.floor(displayHours * 2) / 2;
        }

        let nDisplay = ''; 
        let nVal = 0;      
        let he60 = 0, he100 = 0;
        
        let standardHours = 8.5; 
        if (isSaturday(record.date)) standardHours = 5.5; 
        
        if (rawHours > 0) {
            let isFullDay = false;

            // LÓGICA FLEXIBLE: Usamos rawHours para determinar cumplimiento
            if (isSaturday(record.date)) {
                // Sábado: Si hizo al menos 4.5 horas reales, se considera día completo.
                // Esto soluciona el problema de marcas a las 12:58 o 1:00 PM exactas.
                if (rawHours >= 4.5) isFullDay = true;
            } else {
                // Lunes-Viernes: Si hizo al menos 8.0 horas reales
                if (rawHours >= 8.0) isFullDay = true;
            }

            if (isSunday(record.date)) {
                nDisplay = 1; 
                nVal = 1; 
                he100 = displayHours; 
            } else {
                if (isFullDay) {
                    nDisplay = 1;
                    nVal = 1; 
                    
                    // Cálculo de Extras (usando displayHours redondeado para pago ordenado)
                    if (displayHours > standardHours) {
                        const extra = displayHours - standardHours;
                        if (extra <= 2) he60 = extra;
                        else {
                            he60 = 2;
                            he100 = extra - 2;
                        }
                    }
                } else {
                    // DÍA INCOMPLETO
                    nDisplay = parseFloat(displayHours.toFixed(2)); 
                    nVal = displayHours / standardHours;            
                    if (nVal > 1) nVal = 1;
                }
            }
        }

        workersMap[id].days[record.date] = { 
            n: nDisplay, 
            nVal: nVal, 
            he60: he60 > 0 ? parseFloat(he60.toFixed(2)) : '', 
            he100: he100 > 0 ? parseFloat(he100.toFixed(2)) : '' 
        };
    });

    let finalWorkersArray = Object.values(workersMap);
    finalWorkersArray.sort((a, b) => a.name.localeCompare(b.name));

    // 2. DISEÑO DEL EXCEL (Se mantiene idéntico al original)
    sheet.getColumn('A').width = 5;  
    sheet.getColumn('B').width = 12; 
    sheet.getColumn('C').width = 40; 
    sheet.getColumn('D').width = 15; 
    sheet.getColumn('E').width = 12; 

    const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };
    const leftAlign = { vertical: 'middle', horizontal: 'left' };

    sheet.mergeCells('A2:AC2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = `TAREO SEMANAL - ${projectFilter ? projectFilter.name : (allStaff.length > 0 ? 'MASTER GLOBAL STAFF' : 'MASTER GLOBAL OBREROS')}`;
    titleCell.font = { size: 16, bold: true, name: 'Calibri' };
    titleCell.alignment = centerAlign;

    sheet.getCell('B6').value = 'OBRA:';
    sheet.getCell('B6').font = { bold: true };
    sheet.getCell('C6').value = projectFilter ? projectFilter.name : 'CONSTRUCTORA LYK - MASTER';
    
    sheet.getCell('B8').value = 'PERIODO:';
    sheet.getCell('B8').font = { bold: true };
    const dateStart = new Date(dateList[0]);
    const dateEnd = new Date(dateList[6]);
    sheet.getCell('C8').value = `DEL ${dateStart.toLocaleDateString('es-PE')} AL ${dateEnd.toLocaleDateString('es-PE')}`;

    const headerRow = 10;
    const subHeaderRow = 11;

    const staticHeaders = [
        { col: 'A', label: 'ITEM' },
        { col: 'B', label: 'DNI' },
        { col: 'C', label: 'APELLIDOS Y NOMBRES' },
        { col: 'D', label: 'CATEGORIA' },
        { col: 'E', label: 'FECHA DE\nINGRESO' }
    ];

    staticHeaders.forEach(h => {
        sheet.mergeCells(`${h.col}${headerRow}:${h.col}${subHeaderRow}`);
        const cell = sheet.getCell(`${h.col}${headerRow}`);
        cell.value = h.label;
        cell.alignment = { ...centerAlign, wrapText: true };
        cell.border = borderStyle;
        cell.font = { size: 8, bold: true, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    let colIndex = 6; 
    dateList.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d); 
        const dayName = dObj.toLocaleDateString('es-ES',{weekday:'long'});
        const dayNum = dObj.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'});
        const label = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}`;

        sheet.mergeCells(headerRow, colIndex, headerRow, colIndex+2);
        const dayCell = sheet.getCell(headerRow, colIndex);
        dayCell.value = label;
        dayCell.alignment = centerAlign;
        dayCell.border = borderStyle;
        dayCell.font = { size: 8, bold: true };
        dayCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };

        ['N', '60%', '100%'].forEach((subLabel, i) => {
            const subCell = sheet.getCell(subHeaderRow, colIndex + i);
            subCell.value = subLabel;
            subCell.alignment = centerAlign;
            subCell.border = borderStyle;
            subCell.font = { size: 7, bold: true };
            sheet.getColumn(colIndex + i).width = 5;
        });
        colIndex += 3;
    });

    const totalColIdx = colIndex;
    sheet.mergeCells(headerRow, totalColIdx, headerRow, totalColIdx + 2);
    const totalHeader = sheet.getCell(headerRow, totalColIdx);
    totalHeader.value = 'TOTAL';
    totalHeader.alignment = centerAlign;
    totalHeader.border = borderStyle;
    totalHeader.font = { size: 8, bold: true };
    totalHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

    ['Jornales', '60%', '100%'].forEach((subLabel, i) => {
        const subCell = sheet.getCell(subHeaderRow, totalColIdx + i);
        subCell.value = subLabel;
        subCell.alignment = centerAlign;
        subCell.border = borderStyle;
        subCell.font = { size: 7, bold: true };
        sheet.getColumn(totalColIdx + i).width = 7; 
    });

    const obsColIdx = totalColIdx + 3;
    sheet.mergeCells(headerRow, obsColIdx, subHeaderRow, obsColIdx);
    const obsHeader = sheet.getCell(headerRow, obsColIdx);
    obsHeader.value = 'OBSERVACION';
    obsHeader.alignment = centerAlign;
    obsHeader.border = borderStyle;
    obsHeader.font = { size: 8, bold: true };
    sheet.getColumn(obsColIdx).width = 30;

    let currentRow = 12;
    const startDataRow = currentRow;

    finalWorkersArray.forEach((worker, idx) => {
        sheet.getCell(`A${currentRow}`).value = idx + 1;
        sheet.getCell(`B${currentRow}`).value = worker.dni;
        sheet.getCell(`C${currentRow}`).value = worker.name;
        sheet.getCell(`D${currentRow}`).value = worker.category;
        sheet.getCell(`E${currentRow}`).value = worker.entryDate;

        ['A','B','C','D','E'].forEach(col => {
            const cell = sheet.getCell(`${col}${currentRow}`);
            cell.border = borderStyle;
            cell.font = { size: 8, name: 'Arial' };
            cell.alignment = col === 'C' ? leftAlign : centerAlign;
        });

        let colCursor = 6;
        let sumNVal = 0, sum60 = 0, sum100 = 0;

        dateList.forEach(dateStr => {
            const data = worker.days[dateStr] || { n: '', nVal: 0, he60: '', he100: '' };
            
            sheet.getCell(currentRow, colCursor).value = data.n;
            sheet.getCell(currentRow, colCursor + 1).value = data.he60;
            sheet.getCell(currentRow, colCursor + 2).value = data.he100;

            if (data.nVal) sumNVal += data.nVal;
            if (data.he60) sum60 += parseFloat(data.he60);
            if (data.he100) sum100 += parseFloat(data.he100);

            [0, 1, 2].forEach(offset => {
                const cell = sheet.getCell(currentRow, colCursor + offset);
                cell.border = borderStyle;
                cell.alignment = centerAlign;
                cell.font = { size: 8 };
            });

            colCursor += 3;
        });

        const cellTotalN = sheet.getCell(currentRow, totalColIdx);
        cellTotalN.value = sumNVal > 0 ? parseFloat(sumNVal.toFixed(2)) : '';
        
        const cellTotal60 = sheet.getCell(currentRow, totalColIdx + 1);
        cellTotal60.value = sum60 > 0 ? sum60 : '';
        const cellTotal100 = sheet.getCell(currentRow, totalColIdx + 2);
        cellTotal100.value = sum100 > 0 ? sum100 : '';

        [cellTotalN, cellTotal60, cellTotal100].forEach(c => {
            c.border = borderStyle;
            c.alignment = centerAlign;
            c.font = { size: 8, bold: true };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        });

        const cellObs = sheet.getCell(currentRow, obsColIdx);
        cellObs.value = worker.observations.join('; ');
        cellObs.border = borderStyle;
        cellObs.font = { size: 7, color: { argb: 'FF555555' } };
        cellObs.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };

        currentRow++;
    });

    const lastDataRow = currentRow - 1;
    const footerStartRow = currentRow + 2;

    sheet.getCell(`C${footerStartRow}`).value = "TOTAL JORNALES / HRS";
    sheet.getCell(`C${footerStartRow + 1}`).value = "TOTAL PERSONAL";
    
    [footerStartRow, footerStartRow+1].forEach(r => {
        const c = sheet.getCell(`C${r}`);
        c.alignment = { horizontal: 'right' };
        c.font = { bold: true, size: 9 };
    });

    let sumColCursor = 6;
    dateList.forEach(() => {
        const colN = sheet.getColumn(sumColCursor).letter;
        const col60 = sheet.getColumn(sumColCursor + 1).letter;
        const col100 = sheet.getColumn(sumColCursor + 2).letter;

        const cellSumN = sheet.getCell(footerStartRow, sumColCursor);
        cellSumN.value = { formula: `SUM(${colN}${startDataRow}:${colN}${lastDataRow})` };
        
        const cellSum60 = sheet.getCell(footerStartRow, sumColCursor + 1);
        cellSum60.value = { formula: `SUM(${col60}${startDataRow}:${col60}${lastDataRow})` };
        
        const cellSum100 = sheet.getCell(footerStartRow, sumColCursor + 2);
        cellSum100.value = { formula: `SUM(${col100}${startDataRow}:${col100}${lastDataRow})` };

        [cellSumN, cellSum60, cellSum100].forEach(c => {
            c.border = borderStyle;
            c.alignment = centerAlign;
            c.font = { bold: true, size: 8 };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        });

        sheet.mergeCells(footerStartRow + 1, sumColCursor, footerStartRow + 1, sumColCursor + 2);
        const cellCount = sheet.getCell(footerStartRow + 1, sumColCursor);
        cellCount.value = { formula: `COUNT(${colN}${startDataRow}:${colN}${lastDataRow})` };
        cellCount.border = borderStyle;
        cellCount.alignment = centerAlign;
        cellCount.font = { bold: true, size: 8 };

        sumColCursor += 3;
    });
};

export const generateTareoExcel = async (attendanceData, allWorkers, allStaff, dateRange, selectedProject, projectsList = []) => {
    const workbook = new ExcelJS.Workbook();

    let referenceDate = dateRange.start;
    if (attendanceData && attendanceData.length > 0) {
        const sortedData = [...attendanceData].sort((a, b) => new Date(a.date) - new Date(b.date));
        referenceDate = sortedData[0].date;
    }
    const startOfWeek = getMondayOfWeek(referenceDate);
    const dateList = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        dateList.push(d.toISOString().split('T')[0]);
    }

    if (selectedProject) {
        addTareoSheet(workbook, selectedProject.name, dateList, allWorkers, allStaff, attendanceData, selectedProject);
    } else {
        let filteredAttendance = attendanceData;
        if (allStaff.length > 0 && allWorkers.length === 0) {
            filteredAttendance = attendanceData ? attendanceData.filter(r => r.employees) : [];
        } else if (allWorkers.length > 0 && allStaff.length === 0) {
            filteredAttendance = attendanceData ? attendanceData.filter(r => r.workers) : [];
        }

        const sheetTitle = allStaff.length > 0 ? "MASTER GLOBAL STAFF" : "MASTER GLOBAL OBREROS";
        
        addTareoSheet(workbook, sheetTitle, dateList, allWorkers, allStaff, filteredAttendance, null);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `TAREO_SEMANAL_${dateList[0]}_${selectedProject ? selectedProject.name : 'MASTER'}.xlsx`;
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
};