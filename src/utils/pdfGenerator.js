import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (val) => (val && val > 0) ? val.toFixed(2) : '';

const drawPayslipContent = (doc, item, weekRange, companyAddress, logoImg) => {
    const p = item.person;
    const isStaff = item.type === 'staff';
    const d = item.details || {}; 

    // --- ESTILOS VISUALES ---
    const headerBgColor = [240, 240, 240];
    const borderColor = [0, 0, 0];
    const lineWidth = 0.1;
    const bodyFontSize = 7;

    // --- LOGO ---
    if (logoImg) {
      try { doc.addImage(logoImg, 'PNG', 14, 8, 35, 12); } catch (e) {}
    }

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    let yPos = 28;
    doc.text(`R.U.C. 20482531301`, 14, yPos); yPos += 4;
    doc.text(`EMPLEADOR: CONSTRUCTORA E INVERSIONES L & K S.A.C.`, 14, yPos); yPos += 4;
    doc.text(`DIRECCIÓN: AV. LOS CONSTRUCTORES 123 - LIMA`, 14, yPos); // Pon tu dirección fija aquí si no viene de DB

    doc.text("PERIODO DE PAGO:", 130, 28);
    doc.setFont("helvetica", "normal");
    doc.text(`${weekRange.start}  AL  ${weekRange.end}`, 160, 28);

    // --- DATOS TRABAJADOR ---
    const workerData = [
        [{content:'CÓDIGO:', styles:{fontStyle:'bold'}}, p.worker_code || '-', {content:'CARGO:', styles:{fontStyle:'bold'}}, (p.position || p.category || '-').toUpperCase()],
        [{content:'APELLIDOS Y NOMBRES:', styles:{fontStyle:'bold'}}, (p.full_name || '').toUpperCase(), {content:'FECHA ING.:', styles:{fontStyle:'bold'}}, p.entry_date || '-'],
        [{content:'DOC. IDENTIDAD:', styles:{fontStyle:'bold'}}, `${p.document_type||'DNI'} ${p.document_number||'-'}`, {content:'CUSPP:', styles:{fontStyle:'bold'}}, p.cuspp || '-'],
        [{content:'CATEGORÍA:', styles:{fontStyle:'bold'}}, (p.category || 'OBRERO').toUpperCase(), {content:'RÉG. PENSIONARIO:', styles:{fontStyle:'bold'}}, d.pensionName || 'ONP'],
        [{content:'OBRA / C.COSTO:', styles:{fontStyle:'bold', colSpan: 3}}, (p.project_assigned || 'SIN ASIGNAR').toUpperCase()]
    ];

    autoTable(doc, {
        startY: 45,
        body: workerData,
        theme: 'plain',
        styles: { fontSize: bodyFontSize, cellPadding: 1, textColor: [0,0,0] },
        columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 75 }, 2: { cellWidth: 25 }, 3: { cellWidth: 45 } },
        margin: { left: 14 }
    });

    // --- CUERPO PRINCIPAL (INGRESOS vs DESCUENTOS) ---
    // Preparamos dos listas: Ingresos y Descuentos
    let incomes = [];
    let discounts = [];

    if (isStaff) {
        // Staff simple
        incomes.push(['REMUNERACIÓN BÁSICA', fmt(d.basicSalary/30), 'X', '30', fmt(d.basicSalary)]);
        if (d.familyAllowance > 0) incomes.push(['ASIGNACIÓN FAMILIAR', '', '', '', fmt(d.familyAllowance)]);
        
        discounts.push([`SISTEMA PENSIONES (${d.pensionName})`, '', fmt(d.pensionAmount)]);
        if (item.totalAdvances > 0) discounts.push(['ADELANTOS', '', fmt(item.totalAdvances)]);
    } else {
        // Obreros (Estructura de la Imagen)
        incomes.push(['JORNAL BÁSICO', fmt(d.unitRates?.daily), 'X', item.daysWorked, fmt(d.basicSalary)]);
        incomes.push(['DOMINICAL', fmt(d.unitRates?.daily), 'X', d.dominicalDays > 0 ? d.dominicalDays.toFixed(2) : '0', fmt(d.dominical)]);
        incomes.push(['MOVILIDAD', fmt(d.unitRates?.mobility), 'X', item.daysWorked, fmt(d.mobility)]);
        incomes.push(['BONIF. UNIF. CONSTR. (BUC)', '', '', '', fmt(d.buc)]);
        
        if (d.schoolAssign > 0) incomes.push(['ASIGNACIÓN ESCOLAR', fmt(d.unitRates?.school), 'X', item.daysWorked, fmt(d.schoolAssign)]);
        if (d.he60.amount > 0) incomes.push(['HORAS EXTRAS 60%', fmt(d.unitRates?.he60), 'X', d.he60.hours + ' hrs', fmt(d.he60.amount)]);
        if (d.he100.amount > 0) incomes.push(['HORAS EXTRAS 100%', fmt(d.unitRates?.he100), 'X', d.he100.hours + ' hrs', fmt(d.he100.amount)]);
        
        if (d.indemnity > 0) incomes.push(['INDEMNIZACIÓN (15%)', '', '', '', fmt(d.indemnity)]);
        if (d.vacation > 0) incomes.push(['VACACIONES (10%)', '', '', '', fmt(d.vacation)]);

        // Descuentos
        discounts.push([`SISTEMA PENSIONES (${d.pensionName})`, d.pensionRateLabel || '', fmt(d.pensionAmount)]);
        discounts.push(['CONAFOVICER', '2%', fmt(d.conafovicer)]);
        if (item.totalAdvances > 0) discounts.push(['ADELANTOS', '', fmt(item.totalAdvances)]);
    }

    // Combinar en filas para la tabla (Zipping)
    const maxRows = Math.max(incomes.length, discounts.length);
    let tableRows = [];
    for (let i = 0; i < maxRows; i++) {
        const inc = incomes[i] || ['', '', '', '', ''];
        const disc = discounts[i] || ['', '', ''];
        // Estructura Fila: [Concepto Ing, Unit, X, Dias, Importe Ing] | [Concepto Desc, %/Info, Importe Desc]
        tableRows.push([
            inc[0], inc[1], inc[2], inc[3], inc[4], // Ingresos
            disc[0], disc[2] // Descuentos (Solo Concepto y Monto para ahorrar espacio, o Concepto + Monto)
        ]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      head: [['CONCEPTO', 'UNIT.', ' ', 'CANT.', 'INGRESOS', 'DESCUENTOS', 'IMPORTE']], // Headers simplificados para que calcen
      // Ajustamos para que se vea como en la imagen: Ingresos a la izquierda, Descuentos a la derecha
      // Pero como la imagen tiene "Descuentos" en un bloque separado a veces, o columna dedicada.
      // Haremos 2 tablas falsas unidas visualmente o una tabla ancha.
      // Usaremos la estructura de columnas:
      // Col 0: Concepto (Ing)
      // Col 1: Unit
      // Col 2: X
      // Col 3: Dias
      // Col 4: Monto Ing
      // Col 5: Concepto Desc
      // Col 6: Monto Desc
      head: [[
          { content: 'INGRESOS', colSpan: 5, styles: { halign: 'center', fillColor: headerBgColor } }, 
          { content: 'DESCUENTOS', colSpan: 2, styles: { halign: 'center', fillColor: headerBgColor } }
      ],
      ['CONCEPTO', 'UNIT.', '', 'DÍAS', 'IMPORTE', 'CONCEPTO', 'IMPORTE']],
      
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: bodyFontSize, cellPadding: 1.5, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], valign: 'middle' },
      headStyles: { fillColor: headerBgColor, textColor: [0,0,0], fontStyle: 'bold', halign: 'center', lineWidth: lineWidth, lineColor: borderColor },
      columnStyles: { 
          0: { cellWidth: 55 }, // Concepto Ing
          1: { cellWidth: 12, halign: 'center' }, // Unit
          2: { cellWidth: 5, halign: 'center' },  // X
          3: { cellWidth: 10, halign: 'center' }, // Dias
          4: { cellWidth: 20, halign: 'right' },  // Importe Ing
          5: { cellWidth: 55 }, // Concepto Desc
          6: { cellWidth: 20, halign: 'right' }   // Importe Desc
      },
      margin: { left: 14 }
    });

    // --- TOTALES ---
    const finalY = doc.lastAutoTable.finalY;
    autoTable(doc, {
      startY: finalY,
      body: [[
        { content: 'TOTAL INGRESOS:', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fmt(item.totalIncome), styles: { fontStyle: 'bold', halign: 'right' } },
        { content: 'TOTAL DESCUENTOS:', styles: { fontStyle: 'bold', halign: 'right' } },
        { content: fmt(item.totalDiscounts), styles: { fontStyle: 'bold', halign: 'right' } }
      ]],
      theme: 'grid',
      styles: { fontSize: bodyFontSize, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 20 }, 2: { cellWidth: 55 }, 3: { cellWidth: 20 } },
      margin: { left: 14 }
    });

    // NETO
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY,
      body: [[
        { content: 'NETO A PAGAR S/.', styles: { fontStyle: 'bold', halign: 'right', valign:'middle', fontSize: 9 } },
        { content: fmt(item.netPay), styles: { fontStyle: 'bold', halign: 'center', fontSize: 11, valign:'middle', fillColor: [230, 230, 230] } }
      ]],
      theme: 'grid',
      styles: { lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
      columnStyles: { 0: { cellWidth: 157 }, 1: { cellWidth: 20 } },
      margin: { left: 14 }
    });

    // --- PIE DE PÁGINA ---
    const footerY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(6);
    doc.text(`APORTES EMPLEADOR: ESSALUD (9%) S/. ${fmt(d.essalud)}`, 14, footerY);

    const pageHeight = doc.internal.pageSize.height;
    let signatureY = Math.max(footerY + 30, pageHeight - 30);
    if (signatureY > pageHeight - 20) { doc.addPage(); signatureY = 40; }

    doc.setDrawColor(0); doc.setLineWidth(0.1);
    doc.line(30, signatureY, 85, signatureY); 
    doc.text("EMPLEADOR", 57.5, signatureY + 3, null, null, "center");
    
    doc.line(125, signatureY, 180, signatureY); 
    doc.text("TRABAJADOR", 152.5, signatureY + 3, null, null, "center");
    doc.text(`${p.document_type||'DNI'} ${p.document_number||''}`, 152.5, signatureY + 7, null, null, "center");
};

export const generatePayslip = (item, weekRange, companyAddress, logoImg) => {
  const doc = new jsPDF(); 
  drawPayslipContent(doc, item, weekRange, companyAddress, logoImg); 
  doc.save(`Boleta_${item.person.document_number}.pdf`);
};

export const generateBulkPayslips = (items, weekRange, companyAddress, logoImg) => {
    if (!items || items.length === 0) { alert("No hay datos."); return; }
    const doc = new jsPDF();
    items.forEach((item, i) => { if(i>0) doc.addPage(); drawPayslipContent(doc, item, weekRange, companyAddress, logoImg); });
    doc.save(`Planilla_Masiva.pdf`);
};