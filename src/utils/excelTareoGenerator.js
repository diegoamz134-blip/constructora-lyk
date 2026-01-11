import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Helper para obtener horas trabajadas
const getHoursDiff = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffMs = e - s;
    return diffMs / (1000 * 60 * 60);
};

// Helper para saber si es domingo
const isSunday = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d); 
    return date.getDay() === 0;
};

// Helper para saber si es sábado
const isSaturday = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d); 
    return date.getDay() === 6;
};

// Helper para obtener el Lunes
const getMondayOfWeek = (dateString) => {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday;
};

// --- FUNCIÓN PARA GENERAR UNA HOJA ESPECÍFICA ---
const addTareoSheet = (workbook, sheetName, dateList, allWorkers, allStaff, attendanceData, projectFilter) => {
    const safeSheetName = sheetName.replace(/[\\/?*\[\]]/g, '').substring(0, 30) || 'Hoja';
    const sheet = workbook.addWorksheet(safeSheetName);

    // --- PROCESAMIENTO DE DATOS ---
    const workersMap = {};

    const addToMap = (person, type) => {
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

    // Agregamos solo lo que nos pasen (si allStaff viene vacío, no se agregan administrativos)
    allWorkers.forEach(w => addToMap(w, 'worker'));
    allStaff.forEach(s => addToMap(s, 'staff'));

    attendanceData.forEach(record => {
        if (!dateList.includes(record.date)) return;
        if (projectFilter && record.project_name !== projectFilter.name) return;

        // Detectar si es Obrero o Staff
        const person = record.workers || record.employees;
        if (!person) return;
        const id = person.id;

        // Si el registro no está en el mapa inicial (ej. un staff en hoja de solo obreros),
        // lo agregamos solo si corresponde al tipo permitido en esta hoja.
        // Como 'addTareoSheet' recibe listas filtradas, si un staff llega aquí
        // pero no estaba en 'allStaff', significa que estamos forzando su exclusión,
        // así que verificamos:
        if (!workersMap[id]) {
             // Si es una hoja exclusiva de obreros (allStaff vacío) y llega un empleado, lo ignoramos.
             if (allStaff.length === 0 && record.employees) return;

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
            workersMap[id].observations.push(`[${record.date.slice(5)}]: ${record.observation}`);
        }

        // --- CÁLCULO DE HORAS (LÓGICA ESTRICTA: 8.5h / 5.5h) ---
        const totalHours = getHoursDiff(record.check_in_time, record.check_out_time);
        let n = 0, he60 = 0, he100 = 0;
        
        let standardHours = 8.5; // Lunes a Viernes
        if (isSaturday(record.date)) standardHours = 5.5; // Sábado
        
        if (totalHours > 0) {
            // 1. CÁLCULO DE JORNAL (N) - ESTRICTO
            if (isSaturday(record.date)) {
                if (totalHours >= 5.5) n = 1;
                else if (totalHours >= 1) n = 0.5;
                else n = 0; 
            } else {
                if (totalHours >= 8.5) n = 1;
                else if (totalHours >= 1) n = 0.5;
                else n = 0;
            }

            // 2. CÁLCULO DE EXTRAS
            if (isSunday(record.date)) {
                n = 1; 
                he100 = totalHours; 
            } 
            else if (totalHours > standardHours) {
                const extra = totalHours - standardHours;
                if (extra <= 2) {
                    he60 = extra;
                } else {
                    he60 = 2;
                    he100 = extra - 2;
                }
            }
        }

        workersMap[id].days[record.date] = { 
            n: n > 0 ? n : '', 
            he60: he60 > 0 ? parseFloat(he60.toFixed(2)) : '', 
            he100: he100 > 0 ? parseFloat(he100.toFixed(2)) : '' 
        };
    });

    let finalWorkersArray = Object.values(workersMap);
    // En master global queremos ver a todos (incluso si no vinieron), 
    // pero en proyectos específicos solo los que asistieron.
    if (projectFilter) {
        finalWorkersArray = finalWorkersArray.filter(w => w.hasAttendanceInThisProject);
    }
    
    finalWorkersArray.sort((a, b) => a.name.localeCompare(b.name));

    // --- DISEÑO DEL EXCEL ---
    const borderStyle = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    const centerAlign = { vertical: 'middle', horizontal: 'center' };

    sheet.getColumn('A').width = 5; sheet.getColumn('B').width = 12; 
    sheet.getColumn('C').width = 35; sheet.getColumn('D').width = 15; sheet.getColumn('E').width = 12;

    sheet.mergeCells('A1:AC1');
    const title = sheet.getCell('A1');
    title.value = projectFilter ? `TAREO SEMANAL - ${projectFilter.name}` : 'TAREO SEMANAL - MASTER GLOBAL (OBREROS)';
    title.font = { size: 14, bold: true };
    title.alignment = centerAlign;

    sheet.getCell('B6').value = 'OBRA:';
    sheet.getCell('C6').value = projectFilter ? projectFilter.name : 'TODAS (MASTER)';
    sheet.getCell('B8').value = 'PERIODO:';
    sheet.getCell('C8').value = `DEL ${dateList[0]} AL ${dateList[6]}`;

    const headerRowIdx = 10;
    const subHeaderRowIdx = 11;
    sheet.getCell(`A${headerRowIdx}`).value = 'ITEM';
    sheet.getCell(`B${headerRowIdx}`).value = 'DNI';
    sheet.getCell(`C${headerRowIdx}`).value = 'APELLIDOS Y NOMBRES';
    sheet.getCell(`D${headerRowIdx}`).value = 'CATEGORIA';
    sheet.getCell(`E${headerRowIdx}`).value = 'FECHA DE INGRESO';

    ['A','B','C','D','E'].forEach(col=>{
        sheet.mergeCells(`${col}${headerRowIdx}:${col}${subHeaderRowIdx}`);
        sheet.getCell(`${col}${headerRowIdx}`).alignment=centerAlign;
        sheet.getCell(`${col}${headerRowIdx}`).border=borderStyle;
        sheet.getCell(`${col}${headerRowIdx}`).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE0E0E0'}};
        sheet.getCell(`${col}${headerRowIdx}`).font={size:8,bold:true};
    });

    let colIndex = 6;
    dateList.forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dObj = new Date(y, m - 1, d); 
        const dayLabel = dObj.toLocaleDateString('es-ES',{weekday:'long'});
        const dateLabel = dObj.toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit'});

        sheet.mergeCells(headerRowIdx, colIndex, headerRowIdx, colIndex+2);
        const cell = sheet.getCell(headerRowIdx, colIndex);
        cell.value = `${dayLabel.charAt(0).toUpperCase()+dayLabel.slice(1)} ${dateLabel}`;
        cell.alignment=centerAlign; cell.border=borderStyle; cell.font={size:8,bold:true};
        cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFBDD7EE'}};

        ['N','0.6','1'].forEach((l,i)=>{
            const sc = sheet.getCell(subHeaderRowIdx, colIndex+i);
            sc.value=l; sc.alignment=centerAlign; sc.border=borderStyle; sc.font={size:7,bold:true};
            sheet.getColumn(colIndex+i).width=4;
        });
        colIndex+=3;
    });

    const totalStartCol = colIndex;
    sheet.mergeCells(headerRowIdx, totalStartCol, headerRowIdx, totalStartCol+2);
    const tc = sheet.getCell(headerRowIdx, totalStartCol);
    tc.value='TOTAL'; tc.alignment=centerAlign; tc.border=borderStyle; tc.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFFF00'}};
    
    ['Horas','60%','100%'].forEach((l,i)=>{
        const sc = sheet.getCell(subHeaderRowIdx, totalStartCol+i);
        sc.value=l; sc.alignment=centerAlign; sc.border=borderStyle; sc.font={size:7,bold:true};
        sheet.getColumn(totalStartCol+i).width=6;
    });

    const obsCol = totalStartCol+3;
    sheet.mergeCells(headerRowIdx, obsCol, subHeaderRowIdx, obsCol);
    sheet.getCell(headerRowIdx, obsCol).value='OBSERVACION';
    sheet.getCell(headerRowIdx, obsCol).border=borderStyle;
    sheet.getColumn(obsCol).width = 40;

    let currentRow = 12;
    const startDataRow = currentRow;

    finalWorkersArray.forEach((worker, idx) => {
        sheet.getCell(`A${currentRow}`).value = idx + 1;
        sheet.getCell(`B${currentRow}`).value = worker.dni;
        sheet.getCell(`C${currentRow}`).value = worker.name;
        sheet.getCell(`D${currentRow}`).value = worker.category;
        sheet.getCell(`E${currentRow}`).value = worker.entryDate;

        let colCursor = 6;
        let sumN=0, sum60=0, sum100=0;

        dateList.forEach(dateStr => {
            const dData = worker.days[dateStr] || {n:'',he60:'',he100:''};
            const cN=sheet.getCell(currentRow, colCursor); cN.value=dData.n; if(dData.n) sumN+=parseFloat(dData.n);
            const c60=sheet.getCell(currentRow, colCursor+1); c60.value=dData.he60; if(dData.he60) sum60+=parseFloat(dData.he60);
            const c100=sheet.getCell(currentRow, colCursor+2); c100.value=dData.he100; if(dData.he100) sum100+=parseFloat(dData.he100);
            [cN,c60,c100].forEach(c=>{c.alignment=centerAlign;c.border=borderStyle;c.font={size:8}});
            colCursor+=3;
        });

        const cTN=sheet.getCell(currentRow, totalStartCol); cTN.value=sumN>0?sumN:'';
        const cT60=sheet.getCell(currentRow, totalStartCol+1); cT60.value=sum60>0?sum60:'';
        const cT100=sheet.getCell(currentRow, totalStartCol+2); cT100.value=sum100>0?sum100:'';
        
        const cObs = sheet.getCell(currentRow, obsCol);
        cObs.value = worker.observations.join('; ');
        cObs.border = borderStyle;
        cObs.font = {size:8, color: {argb: 'FF555555'}};
        cObs.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
        
        ['A','B','C','D','E'].forEach(col=>{
            const c=sheet.getCell(`${col}${currentRow}`); c.border=borderStyle; c.font={size:8};
            c.alignment = col==='C'?{vertical:'middle',horizontal:'left'}:centerAlign;
        });
        [cTN,cT60,cT100].forEach(c=>{
            c.border=borderStyle;c.alignment=centerAlign;c.font={size:8,bold:true};
            c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};
        });
        
        currentRow++;
    });

    const lastDataRow = currentRow - 1;
    const rowSum = currentRow + 3;
    const rowCount = currentRow + 4;

    sheet.getCell(`C${rowSum}`).value = "TOTAL JORNALES";
    sheet.getCell(`C${rowSum}`).alignment={horizontal:'right'}; sheet.getCell(`C${rowSum}`).font={bold:true,size:8};
    sheet.getCell(`C${rowCount}`).value = "TOTAL PERSONAL";
    sheet.getCell(`C${rowCount}`).alignment={horizontal:'right'}; sheet.getCell(`C${rowCount}`).font={bold:true,size:8};

    let sumColCursor = 6;
    dateList.forEach(() => {
        const colN = sheet.getColumn(sumColCursor).letter;
        const col60 = sheet.getColumn(sumColCursor+1).letter;
        const col100 = sheet.getColumn(sumColCursor+2).letter;

        const cellSumN = sheet.getCell(rowSum, sumColCursor);
        cellSumN.value = { formula: `SUM(${colN}${startDataRow}:${colN}${lastDataRow})` };
        const cellSum60 = sheet.getCell(rowSum, sumColCursor+1);
        cellSum60.value = { formula: `SUM(${col60}${startDataRow}:${col60}${lastDataRow})` };
        const cellSum100 = sheet.getCell(rowSum, sumColCursor+2);
        cellSum100.value = { formula: `SUM(${col100}${startDataRow}:${col100}${lastDataRow})` };

        [cellSumN, cellSum60, cellSum100].forEach(c => {
            c.border = borderStyle; c.alignment = centerAlign; c.font = { bold: true, size: 8 };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } };
        });

        sheet.mergeCells(rowCount, sumColCursor, rowCount, sumColCursor+2);
        const cellCount = sheet.getCell(rowCount, sumColCursor);
        cellCount.value = { formula: `COUNTA(${colN}${startDataRow}:${colN}${lastDataRow})` };
        cellCount.border = borderStyle; cellCount.alignment = centerAlign; cellCount.font = { bold: true, size: 8 };
        
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
        // --- MASTER GLOBAL: SOLO OBREROS (CORRECCIÓN) ---
        // 1. Filtramos las asistencias para obtener solo las que tienen 'workers' (ignora 'employees')
        const obrerosAttendance = attendanceData ? attendanceData.filter(r => r.workers) : [];
        
        // 2. Pasamos array vacío [] para allStaff, así no se agregan a la lista de personal
        addTareoSheet(workbook, "MASTER GLOBAL", dateList, allWorkers, [], obrerosAttendance, null);
        
        if (projectsList && projectsList.length > 0) {
            projectsList.forEach(proj => {
                // En las hojas por proyecto mantenemos a todos por si quieres ver residentes
                addTareoSheet(workbook, proj.name, dateList, allWorkers, allStaff, attendanceData, proj);
            });
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `TAREO_SEMANAL_${dateList[0]}_${selectedProject ? selectedProject.name : 'MASTER_GLOBAL'}.xlsx`;
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
};