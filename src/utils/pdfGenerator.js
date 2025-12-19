import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- FUNCIÓN INTERNA DE DIBUJO (NO EXPORTAR) ---
// Esta función dibuja UNA boleta en el documento actual
const drawPayslipContent = (doc, item, weekRange, logoImg) => {
    const p = item.person;
    const isStaff = item.type === 'staff';
    const d = item.details || {}; 

    // --- CONFIGURACIÓN DE ESTILOS ---
    const headerColor = [220, 235, 255]; 
    const borderColor = [0, 0, 0];
    const lineWidth = 0.1;

    // --- LOGO ---
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'PNG', 14, 5, 40, 15); 
      } catch (imgErr) {
        console.warn("No se pudo cargar el logo", imgErr);
      }
    }

    // --- ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    
    doc.text(`RUC: 20482531301`, 14, 24);
    doc.text(`Empleador: CONSTRUCTORA E INVERSIONES L & K S.A.C.`, 14, 28);
    doc.text(`Periodo: ${weekRange.start} al ${weekRange.end}`, 14, 32);

    // Recuadro Trabajador (Derecha)
    doc.text("TRABAJADOR", 140, 24);
    doc.setFont("helvetica", "normal");
    doc.text((p.full_name || 'SIN NOMBRE').toUpperCase(), 140, 28);
    doc.text(`DNI: ${p.document_number || '-'}`, 140, 32);

    const startY = 38;
    
    // --- TABLA 1: DATOS GENERALES ---
    autoTable(doc, {
      startY: startY,
      head: [['Documento de Identidad', 'Nombre y Apellidos', 'Situación']],
      body: [[
        `Tipo: DNI\nNúmero: ${p.document_number}`,
        (p.full_name || '').toUpperCase(),
        'ACTIVO'
      ]],
      theme: 'grid', 
      styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0, 0, 0] },
      headStyles: { fillColor: headerColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 100 }, 2: { cellWidth: 40 } },
      margin: { left: 14 }
    });

    // --- TABLA 2: DATOS LABORALES ---
    const pensionName = d.pensionName || p.pension_system || 'ONP';

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY - 0.1, 
      head: [['Fecha de Ingreso', 'Tipo de Trabajador', 'Régimen Pensionario', 'CUSPP']],
      body: [[
        p.entry_date || p.start_date || '-',
        isStaff ? 'EMPLEADO' : 'OBRERO',
        pensionName,
        p.cuspp || '-'
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], halign: 'center' },
      headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold' },
      margin: { left: 14 }
    });

    // --- TABLA 3: ASISTENCIA ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY - 0.1,
      head: [['Días Laborados', 'Días No Lab.', 'Días Sub.', 'Condición', 'Jornada Ordinaria', 'Sobretiempo']],
      body: [[
        `${item.daysWorked || 0}`, '0', '0', 'Domiciliado', 'Total Horas: --\nMinutos: 0', 'Total Horas: 0\nMinutos: 0'
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], halign: 'center' },
      headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold' },
      margin: { left: 14 }
    });

    // --- CUERPO DE CONCEPTOS ---
    let rows = [];
    const fmt = (val) => (val || 0).toFixed(2);
    const sectionTitle = (text) => ({ 
        content: text, colSpan: 4, styles: { fontStyle: 'bold', halign: 'left', fillColor: headerColor } 
    });

    if (isStaff) {
        rows = [
            [sectionTitle('Ingresos')],
            ['0121', 'REMUNERACIÓN BÁSICA', fmt(d.basicSalary), ''],
            ['0201', 'ASIGNACIÓN FAMILIAR', fmt(d.familyAllowance), ''],
            [sectionTitle('Descuentos')],
            [{ content: `Aportes (${pensionName})`, colSpan: 4, styles: { fontStyle: 'italic', halign: 'left' } }],
            ['060x', 'FONDO DE PENSIONES', '', fmt(d.pensionSystem || d.pensionAmount)],
            ['0701', 'ADELANTOS DE SUELDO', '', fmt(item.totalAdvances)],
        ];
    } else {
        rows = [
            [sectionTitle('Ingresos')],
            ['0121', 'JORNAL BÁSICO', fmt(d.basicSalary), ''],
            ['0106', 'DOMINICAL', fmt(d.dominical), ''],
            ['0304', 'BONIF. UNIFICADA (BUC)', fmt(d.buc), ''],
            ['0902', 'MOVILIDAD', fmt(d.mobility), ''],
        ];
        if (d.schoolAssign > 0) {
            rows.push(['0201', 'ASIGNACIÓN ESCOLAR', fmt(d.schoolAssign), '']);
        }
        rows.push([sectionTitle('Descuentos')]);
        rows.push(['0608', `SISTEMA PENSIONES (${pensionName})`, '', fmt(d.pensionAmount)]);
        rows.push(['0706', 'CONAFOVICER', '', fmt(d.conafovicer)]);
        rows.push(['0701', 'ADELANTOS', '', fmt(item.totalAdvances)]);
    }

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 5,
      head: [['Código', 'Conceptos', 'Ingresos S/.', 'Descuentos S/.']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
      headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
      columnStyles: { 0: {halign: 'center'}, 2: {halign: 'right'}, 3: {halign: 'right'} },
      margin: { left: 14 }
    });

    const finalY = doc.lastAutoTable.finalY;

    // --- TOTALES ---
    autoTable(doc, {
      startY: finalY - 0.1,
      body: [[
        { content: 'Neto a Pagar:', styles: { fontStyle: 'bold', halign: 'right', fillColor: headerColor } },
        { content: fmt(item.netPay), styles: { fontStyle: 'bold', halign: 'right', fontSize: 10 } }
      ]],
      theme: 'grid',
      styles: { fontSize: 9, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
      columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 40 } },
      margin: { left: 14 }
    });

    // --- APORTES EMPLEADOR ---
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 2,
      head: [['Aportes de Empleador', 'Monto S/.']],
      body: [['0804 ESSALUD (9%)', fmt(d.essalud)]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
      headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold', halign: 'left' },
      columnStyles: { 1: {halign: 'right'} },
      margin: { left: 14, right: 120 } 
    });

    // --- FIRMAS ---
    const pageHeight = doc.internal.pageSize.height;
    let signatureY = Math.max(doc.lastAutoTable.finalY + 30, pageHeight - 40);
    if (signatureY > pageHeight - 20) {
        doc.addPage();
        signatureY = 40;
    }

    doc.setDrawColor(0);
    doc.line(30, signatureY, 90, signatureY); 
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("EMPLEADOR", 60, signatureY + 5, null, null, "center");

    doc.line(120, signatureY, 180, signatureY); 
    doc.text("TRABAJADOR", 150, signatureY + 5, null, null, "center");
    doc.setFont("helvetica", "normal");
    doc.text(p.document_number || '', 150, signatureY + 9, null, null, "center");
};

// --- FUNCIÓN PÚBLICA 1: DESCARGAR UNA SOLA BOLETA ---
export const generatePayslip = (item, weekRange, logoImg) => {
  try {
    const doc = new jsPDF();
    drawPayslipContent(doc, item, weekRange, logoImg);
    doc.save(`Boleta_${item.person.document_number}_${weekRange.start}.pdf`);
  } catch (err) {
    console.error("Error PDF Individual:", err);
    alert("Error al generar PDF individual.");
  }
};

// --- FUNCIÓN PÚBLICA 2: DESCARGA MASIVA (TODO EN UN PDF) ---
export const generateBulkPayslips = (items, weekRange, logoImg) => {
    if (!items || items.length === 0) {
        alert("No hay boletas para generar.");
        return;
    }

    try {
        const doc = new jsPDF();
        
        items.forEach((item, index) => {
            // Si no es el primero, agregar nueva página
            if (index > 0) {
                doc.addPage();
            }
            // Dibujar en la página actual
            drawPayslipContent(doc, item, weekRange, logoImg);
        });

        // Guardar un solo archivo grande
        doc.save(`Planilla_Completa_${weekRange.start}_al_${weekRange.end}.pdf`);
        
    } catch (err) {
        console.error("Error PDF Masivo:", err);
        alert("Error al generar el PDF masivo. Revisa la consola.");
    }
};