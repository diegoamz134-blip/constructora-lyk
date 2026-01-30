import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Función auxiliar para fechas
const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const [year, month, day] = dateString.split('-');
    // Validar que sean números
    if(!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export const generateWorkerPDF = async (worker) => {
  const doc = new jsPDF();
  
  // --- CONFIGURACIÓN DE ESTILO ---
  const PRIMARY = [0, 51, 102]; // Azul Corporativo
  const SECONDARY = [245, 245, 245]; // Gris muy claro
  const TEXT_DARK = [40, 40, 40];

  const checkVal = (val) => val || '---';

  // ==========================================
  // ENCABEZADO
  // ==========================================
  
  // Línea 1: Recursos Humanos
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("RECURSOS HUMANOS - OBRA", 105, 15, { align: 'center' });

  // Línea 2: Título del Documento
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE PERSONAL - OBRERO", 105, 23, { align: 'center' });

  // Línea 3: Nombre de la Empresa
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("CONSTRUCTORA E INVERSIONES L&K S.A.C.", 105, 30, { align: 'center' });

  // Línea separadora
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  let currentY = 45;

  // ==========================================
  // 1. DATOS GENERALES Y LABORALES
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['DATOS GENERALES Y LABORALES']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  const bodyPersonal = [
    // Fila 1
    ['Nombres:', checkVal(worker.first_name), 'Apellidos:', `${checkVal(worker.paternal_surname)} ${checkVal(worker.maternal_surname)}`],
    // Fila 2
    ['DNI / CEX:', checkVal(worker.document_number), 'F. Nacimiento:', formatDate(worker.birth_date)],
    // Fila 3
    ['Edad:', worker.age ? `${worker.age} años` : '---', 'Sexo:', checkVal(worker.sex)],
    // Fila 4
    ['Nacionalidad:', checkVal(worker.nationality), 'Estado Civil:', checkVal(worker.marital_status)],
    // Fila 5: Laboral Básico (CORREGIDO: start_date)
    ['Cargo:', checkVal(worker.category).toUpperCase(), 'F. Ingreso:', formatDate(worker.start_date || worker.entry_date)],
    // Fila 6: Pensión
    ['Sistema Pensión:', checkVal(worker.pension_system), 'Cónyuge:', checkVal(worker.spouse_name)],
    
    // TALLAS
    ['Talla Camisa:', checkVal(worker.shirt_size), 'Talla Pantalón:', checkVal(worker.pants_size)],
    ['Talla Calzado:', checkVal(worker.shoe_size), '', '']
  ];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXT_DARK },
    columnStyles: { 
        0: { fontStyle: 'bold', width: 30, textColor: PRIMARY }, 
        2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } 
    },
    body: bodyPersonal,
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // ==========================================
  // 2. UBICACIÓN Y CONTACTO
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['UBICACIÓN Y CONTACTO']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXT_DARK },
    columnStyles: { 0: { fontStyle: 'bold', width: 30, textColor: PRIMARY }, 2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } },
    body: [
      ['Dirección:', checkVal(worker.address), 'Distrito:', checkVal(worker.district)],
      ['Provincia:', checkVal(worker.province), 'Departamento:', checkVal(worker.department)],
      ['Celular 1:', checkVal(worker.phone), 'Celular 2:', checkVal(worker.secondary_phone)],
      ['Email:', checkVal(worker.email), 'Email Alt:', checkVal(worker.secondary_email)]
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // ==========================================
  // 3. FAMILIA Y EMERGENCIA
  // ==========================================
  
  // Dependientes (Prioriza la lista directa del formulario, luego details)
  const dependentsList = worker.dependents || worker.details?.dependents || [];
  const dependentRows = dependentsList.map(d => [d.name, `${d.age} años`, '-']);
  
  if (dependentRows.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("HIJOS / DEPENDIENTES", 14, currentY + 4);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Nombre', 'Edad', 'Observación']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold', lineColor: 200 },
        styles: { fontSize: 8, lineColor: 230 },
        body: dependentRows,
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 5;
  } else {
      currentY += 5;
  }

  // Emergencias
  const emergencyList = worker.emergency_contacts || worker.details?.emergency_contacts || [];
  const emergencyRows = emergencyList.map(c => [c.name, c.relation, c.phone]);

  if (emergencyRows.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("CONTACTOS DE EMERGENCIA", 14, currentY + 4);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Nombre Contacto', 'Relación', 'Teléfono']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold', lineColor: 200 },
        styles: { fontSize: 8, lineColor: 230 },
        body: emergencyRows,
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 8;
  } else {
      currentY += 5;
  }

  // ==========================================
  // 4. DATOS BANCARIOS
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['DATOS BANCARIOS']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXT_DARK },
    columnStyles: { 0: { fontStyle: 'bold', width: 30, textColor: PRIMARY }, 2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } },
    body: [
      ['Banco:', checkVal(worker.bank_name), 'N° Cuenta:', checkVal(worker.bank_account)],
      ['CCI:', checkVal(worker.cci), '', '']
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // ==========================================
  // 5. PERFIL Y EXPERIENCIA
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['PERFIL PROFESIONAL']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });
  
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXT_DARK },
    columnStyles: { 0: { fontStyle: 'bold', width: 30, textColor: PRIMARY }, 2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } },
    body: [
      ['Nivel Educ.:', checkVal(worker.education_level), 'Estado:', checkVal(worker.education_status)],
      // AÑADIDO: Fecha de Egreso
      ['Institución:', checkVal(worker.education_institution), 'F. Egreso:', formatDate(worker.grad_date)] 
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 5.1 CURSOS ADICIONALES (SECCIÓN NUEVA)
  const coursesList = worker.additional_courses || worker.details?.additional_courses || [];
  const courseRows = coursesList.map(c => [c.name, formatDate(c.date)]);

  if (courseRows.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("CURSOS Y CAPACITACIONES", 14, currentY + 4);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Nombre del Curso/Certificación', 'Fecha']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, lineColor: 230 },
        columnStyles: { 1: { width: 30, halign: 'center' } },
        body: courseRows,
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 8;
  } else {
      currentY += 5;
  }

  // Experiencia Laboral
  const jobsList = worker.work_experience || worker.details?.work_experience || [];
  const jobRows = jobsList.map(job => [
    job.company, job.role, `${job.period_start || ''} - ${job.period_end || ''}`, job.boss_name || '-'
  ]);

  if (jobRows.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("EXPERIENCIA LABORAL PREVIA", 14, currentY + 4);

      autoTable(doc, {
        startY: currentY + 6,
        head: [['Empresa', 'Cargo', 'Periodo', 'Referencia']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, lineColor: 230 },
        body: jobRows,
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 10;
  } else {
      currentY += 10;
  }

  // ==========================================
  // CLÁUSULAS Y LEGAL
  // ==========================================
  if (currentY > 200) {
      doc.addPage();
      currentY = 20;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");

  const legalText = `Declaro bajo juramento que la información proporcionada en la presente ficha es veraz. Autorizo su verificación y acepto que, de encontrarse información falsa, la empresa proceda según corresponda por ley.`;

  const clausesText = [
      "CLÁUSULAS CONTRACTUALES Y DE SEGURIDAD:",
      "• Reconozco haber sido contratado en la categoría laboral correspondiente (peón, oficial, operario u otra) y me comprometo a desempeñar las funciones acordes a la misma, hasta la culminación del proyecto.",
      "• Declaro haber recibido inducción de seguridad en obra y me comprometo a cumplir estrictamente las normas de Seguridad y Salud en el Trabajo, así como las políticas, disposiciones y reglamento interno de la empresa.",
      "• Me obligo a usar de manera permanente los EPP asignados y reportar cualquier deterioro.",
      "• Acepto que el incumplimiento grave de normas de seguridad, consumo de alcohol, drogas o actos de indisciplina en obra son causales de terminación del vínculo laboral conforme a ley.",
      "• En caso de recibir equipos, herramientas o implementos, me comprometo a su devolución al cese de labores, autorizando expresamente el descuento de su valor en mis beneficios sociales si no lo hiciera.",
      "• Autorizo el tratamiento de mis datos personales para fines administrativos y de control, conforme a la Ley Nº 29733.",
      "",
      "“Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”."
  ];

  const splitLegal = doc.splitTextToSize(legalText, 180);
  doc.text(splitLegal, 14, currentY);
  currentY += (splitLegal.length * 3) + 5;

  doc.setFont("helvetica", "bold");
  doc.text(clausesText[0], 14, currentY); 
  currentY += 4;
  
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < clausesText.length; i++) {
      const line = clausesText[i];
      if (line === "") { currentY += 2; continue; }
      if (i === clausesText.length - 1) doc.setFont("helvetica", "bolditalic");
      
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, 14, currentY);
      currentY += (splitLine.length * 3.5);
  }

  // ==========================================
  // FIRMA Y HUELLA
  // ==========================================
  currentY += 25;

  if (currentY + 40 > 290) {
      doc.addPage();
      currentY = 40;
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(60, currentY, 120, currentY); 
  
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Firma del Trabajador", 90, currentY + 5, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.text(`${(worker.first_name || '').toUpperCase()} ${(worker.paternal_surname || '').toUpperCase()}`, 90, currentY + 10, { align: 'center' });
  doc.text(`DNI: ${worker.document_number || ''}`, 90, currentY + 14, { align: 'center' });

  doc.setDrawColor(200);
  doc.rect(130, currentY - 25, 25, 30);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text("Huella", 142.5, currentY + 8, { align: 'center' });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Fecha de impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 10);

  doc.save(`Ficha_Obrero_${worker.document_number || 'Trabajador'}.pdf`);
};