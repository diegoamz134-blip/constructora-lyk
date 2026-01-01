import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (val) => (val && val > 0) ? val.toFixed(2) : '0.00';

const drawPayslipContent = (doc, item, weekRange, companyAddress, logoImg, signatureImg) => {
    const p = item.person;
    const d = item.details || {};
    const pb = d.pensionBreakdown || { obligatory: 0, insurance: 0, commission: 0, total: 0 };

    // --- COLORES Y ESTILOS ---
    const lightBlue = [225, 245, 254]; // Celeste Bajo (#E1F5FE)
    const borderColor = [0, 0, 0];     // Negro para bordes
    
    // --- 1. CABECERA PRINCIPAL ---
    if (logoImg) {
      try { doc.addImage(logoImg, 'PNG', 14, 5, 30, 10); } catch (e) {}
    }
    
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    let y = 18;
    doc.text("CONSTRUCTORA E INVERSIONES L & K S.A.C.", 14, y); y+=4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("AV. LOS CONSTRUCTORES 123 - LIMA", 14, y); y+=4; 
    doc.text("R.U.C. 20482531301", 14, y);

    // Cuadro Derecha: Semana y Mes
    const dateStart = new Date(weekRange.start + 'T00:00:00'); 
    const monthName = dateStart.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const weekNumber = getWeekNumber(dateStart);

    autoTable(doc, {
        startY: 10,
        margin: { left: 130 },
        head: [['SEMANA', 'MES', 'CODIGO']],
        body: [[weekNumber, monthName, p.worker_code || p.id]],
        theme: 'grid', 
        styles: { fontSize: 7, halign: 'center', cellPadding: 2, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: lightBlue, textColor: [0,0,0], fontStyle: 'bold' }
    });

    // --- 2. DATOS DEL TRABAJADOR ---
    
    // TABLA 1: DATOS PERSONALES
    autoTable(doc, {
        startY: 35,
        head: [['APELLIDOS Y NOMBRES', 'DOC. IDENTIDAD', 'NUMERO DE CUENTA']],
        body: [[(p.full_name || '').toUpperCase(), `${p.document_type || 'DNI'} ${p.document_number}`, p.bank_account || '-']],
        theme: 'grid',
        styles: { fontSize: 7, halign: 'left', cellPadding: 1.5, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: lightBlue, textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 30 }, 2: { cellWidth: 'auto' } },
        margin: { left: 14, right: 14 }
    });

    // TABLA 2: FECHAS Y JORNAL
    const workerGrid2 = [[p.start_date || '-', p.contract_end_date || '-', p.birth_date || '-', fmt(d.unitRates?.daily)]];
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1, // Pegado
        head: [['F. DE INGRESO', 'F. DE CESE', 'F. NACIMIENTO', 'JORNAL DIARIO']],
        body: workerGrid2,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1.5, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: lightBlue, textColor: [0,0,0], fontStyle: 'bold' },
        margin: { left: 14, right: 14 }
    });

    // TABLA 3: AFP Y DETALLES
    const workerGrid3 = [['-', d.pensionName || 'ONP', p.cuspp || '-', item.daysWorked, fmt(d.dominicalDays * (d.unitRates?.daily || 0))]];
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1, // Pegado
        head: [['CARNET ESSALUD', 'AFP/ONP', 'CUSPP', 'DIAS TRAB', 'DOMINICAL (REF)']],
        body: workerGrid3,
        theme: 'grid',
        styles: { fontSize: 7, halign: 'center', cellPadding: 1.5, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] },
        headStyles: { fillColor: lightBlue, textColor: [0,0,0], fontStyle: 'bold' },
        margin: { left: 14, right: 14 }
    });

    // --- 3. CUERPO DE LA BOLETA (INGRESOS / DESCUENTOS) ---
    const ingresos = [
        { l: 'JORNAL BASICO', v: d.basicSalary }, 
        { l: 'DOMINICAL', v: d.dominical },
        { l: 'B.U.C.', v: d.buc },
        { l: 'ASIGNACION ESCOLAR', v: d.schoolAssign }, 
        
        // --- HORAS EXTRAS Y FERIADOS ---
        { l: 'HORAS EXTRAS 60%', v: d.he60?.amount },
        { l: 'HORAS EXTRAS 100%', v: d.he100?.amount },
        { l: 'TRABAJO EN FERIADO', v: d.holidayPay + (d.holidayWorkAmount || 0) },
        { l: 'TRABAJO DIA DESCANSO', v: d.sundayWorkAmount },

        // --- BONIFICACIONES ESPECIALES ---
        { l: 'BONIF. ALTURA (7%)', v: d.heightBonus },
        { l: 'BONIF. AGUA (20%)', v: d.waterBonus },
        { l: 'BONIF. BAE', v: d.baeBonus },
        { l: 'BONIF. VOLUNTARIA', v: d.manualBonus },

        // --- CONCEPTOS SOCIALES Y AJUSTES ---
        { l: 'VACACIONES', v: d.vacation }, 
        { l: 'GRATIFICACION', v: d.gratification },
        { l: 'INDEMNIZACION (CTS)', v: d.indemnity },
        { l: 'MOVILIDAD', v: d.mobility },
        { l: 'REINTEGRO SUELDO PACTADO', v: d.salaryAdjustment },
        
        // --- NO REMUNERATIVOS ---
        { l: 'VIATICOS / NO IMPONIBLE', v: d.viaticos },

    ].filter(x => x.v > 0);

    const descuentos = [
        { l: d.pensionName === 'ONP' ? 'SIST. NAC. PENS.' : 'AFP-OBLIG', v: pb.obligatory },
        { l: 'AFP-SEGURO', v: pb.insurance }, 
        { l: 'AFP-COMISION', v: pb.commission },
        { l: 'CONAFOVICER', v: d.conafovicer }, 
        { l: 'ADELANTOS', v: item.totalAdvances }, 
        { l: 'CUOTA SINDICAL', v: d.unionDues },
        { l: 'OTROS DESCUENTOS', v: d.manualDeduction }
    ].filter(x => x.v > 0);

    const aportes = [
        { l: 'ES-SALUD', v: d.essalud }, 
        { l: 'SCTR-SALUD', v: d.sctrSalud }, 
        { l: 'SCTR-PENSION', v: d.sctrPension }
    ].filter(x => x.v > 0);

    const maxRows = Math.max(ingresos.length, descuentos.length, aportes.length, 10); 
    const bodyRows = [];
    for (let i = 0; i < maxRows; i++) {
        const ing = ingresos[i] || { l: '', v: '' };
        const desc = descuentos[i] || { l: '', v: '' };
        const aport = aportes[i] || { l: '', v: '' };
        bodyRows.push([
            ing.l, typeof ing.v === 'number' ? fmt(ing.v) : '', 
            desc.l, typeof desc.v === 'number' ? fmt(desc.v) : '', 
            aport.l, typeof aport.v === 'number' ? fmt(aport.v) : ''
        ]);
    }

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 5,
        head: [[
            { content: 'INGRESOS', colSpan: 2 }, 
            { content: 'DESCUENTOS', colSpan: 2 }, 
            { content: 'APORTES EMPLEADOR', colSpan: 2 }
        ]],
        body: bodyRows,
        theme: 'grid', 
        styles: { fontSize: 6.5, cellPadding: 1.5, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0], halign: 'center' },
        headStyles: { fillColor: lightBlue, textColor: [0,0,0], fontStyle: 'bold' },
        columnStyles: { 
            0: { cellWidth: 40, halign: 'left' }, 1: { cellWidth: 15, halign: 'right' }, 
            2: { cellWidth: 40, halign: 'left' }, 3: { cellWidth: 15, halign: 'right' }, 
            4: { cellWidth: 40, halign: 'left' }, 5: { cellWidth: 15, halign: 'right' } 
        },
        margin: { left: 14, right: 14 }
    });

    // --- 4. TOTALES ---
    const totalIncome = fmt(item.totalIncome); 
    const totalDisc = fmt(item.totalDiscounts); 
    const totalContrib = fmt(d.essalud + (d.sctrSalud||0) + (d.sctrPension||0));
    
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1,
        body: [[
            { content: 'TOTAL REMUNERACION', styles: { fontStyle: 'bold', halign: 'right' } }, 
            { content: totalIncome, styles: { fontStyle: 'bold', halign: 'right' } }, 
            { content: 'TOTAL DESCUENTO', styles: { fontStyle: 'bold', halign: 'right' } }, 
            { content: totalDisc, styles: { fontStyle: 'bold', halign: 'right' } }, 
            { content: 'TOTAL APORTES', styles: { fontStyle: 'bold', halign: 'right' } }, 
            { content: totalContrib, styles: { fontStyle: 'bold', halign: 'right' } }
        ]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1.5, lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] },
        columnStyles: { 
            0: { cellWidth: 40, fillColor: lightBlue }, 1: { cellWidth: 15 }, 
            2: { cellWidth: 40, fillColor: lightBlue }, 3: { cellWidth: 15 }, 
            4: { cellWidth: 40, fillColor: lightBlue }, 5: { cellWidth: 15 } 
        },
        margin: { left: 14, right: 14 }
    });

    // --- NETO A PAGAR ---
    const finalY = doc.lastAutoTable.finalY;
    autoTable(doc, {
        startY: finalY + 2, margin: { left: 110 },
        body: [[
            { content: 'NETO A PAGAR S/.', styles: { fontStyle: 'bold', halign: 'center', fillColor: lightBlue } }, 
            { content: fmt(item.netPay), styles: { fontStyle: 'bold', halign: 'center', fontSize: 10 } }
        ]],
        theme: 'grid', 
        styles: { lineColor: borderColor, lineWidth: 0.1, textColor: [0,0,0] }, 
        columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 30 } }
    });

    // --- FIRMAS ---
    const signatureY = finalY + 35;
    doc.setLineWidth(0.1);
    
    // Firma Empleador
    doc.line(30, signatureY, 80, signatureY); 
    
    if (signatureImg) {
        try {
            const imgWidth = 40; const imgHeight = 15;
            const centerX = 55; const imgX = centerX - (imgWidth / 2);
            const imgY = signatureY - imgHeight + 2; 
            doc.addImage(signatureImg, 'PNG', imgX, imgY, imgWidth, imgHeight);
        } catch (e) {
            console.warn(e);
            doc.setFontSize(6); doc.text("EMPLEADOR", 55, signatureY + 3, { align: 'center' });
        }
    } else {
        doc.setFontSize(6); doc.text("EMPLEADOR", 55, signatureY + 3, { align: 'center' });
    }

    // Firma Trabajador
    doc.line(130, signatureY, 180, signatureY);
    doc.setFontSize(6);
    doc.text("RECIBI CONFORME", 155, signatureY + 3, { align: 'center' });
    doc.text(`DNI: ${p.document_number}`, 155, signatureY + 7, { align: 'center' });
};

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const generatePayslip = (item, weekRange, logoImg, signatureImg) => {
  const doc = new jsPDF(); 
  drawPayslipContent(doc, item, weekRange, null, logoImg, signatureImg); 
  doc.save(`Boleta_${item.person.document_number}.pdf`);
};

export const generateBulkPayslips = (items, weekRange, logoImg, signatureImg) => {
    if (!items || items.length === 0) { alert("No hay datos."); return; }
    const doc = new jsPDF();
    items.forEach((item, i) => { 
        if(i > 0) doc.addPage(); 
        drawPayslipContent(doc, item, weekRange, null, logoImg, signatureImg); 
    });
    doc.save(`Planilla_Masiva_${weekRange.end}.pdf`);
};