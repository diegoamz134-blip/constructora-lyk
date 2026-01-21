import jsPDF from 'jspdf';
import 'jspdf-autotable';

// NOTA: Usamos new Date().toLocaleDateString() nativo para evitar errores de librerías.

export const generateStaffPDF = (profile) => {
  const doc = new jsPDF();
  const ob = profile.onboarding_data || {};

  // --- COLORES Y FUENTES ---
  const PRIMARY_COLOR = [0, 51, 102]; // Azul L&K
  const TEXT_COLOR = [0, 0, 0];
  const GRAY_BG = [220, 220, 220]; // Gris claro para cabeceras
  
  const fontTitle = 14;
  const fontHeader = 9;
  const fontBody = 8;
  const fontLegal = 7;

  // --- HELPER PARA TÍTULOS CON FONDO ---
  const addSectionTitle = (text, y) => {
    doc.setFontSize(fontHeader);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(14, y, 182, 6, 'F'); // Barra azul de fondo
    doc.setTextColor(255, 255, 255); // Texto blanco
    doc.text(text, 16, y + 4.5);
    doc.setTextColor(...TEXT_COLOR); // Reset a negro
    return y + 8;
  };

  // --- TÍTULO PRINCIPAL ---
  doc.setFontSize(fontTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text("FICHA PERSONAL STAFF", 105, 15, { align: "center" });
  
  let currentY = 25;

  // =========================================================
  // I. DATOS PERSONALES
  // =========================================================
  currentY = addSectionTitle("I. DATOS PERSONALES", currentY);

  // Preparamos los datos asegurando que sean strings
  const p = (val) => val || ''; 

  const personalData = [
    [
        { content: 'Nombre Completo:', styles: { fontStyle: 'bold' } }, { content: p(profile.full_name), colSpan: 3 }
    ],
    [
        { content: 'Cargo:', styles: { fontStyle: 'bold' } }, p(profile.position || ob.area), 
        { content: 'Fecha Ingreso:', styles: { fontStyle: 'bold' } }, p(profile.entry_date)
    ],
    [
        { content: 'DNI / CEX:', styles: { fontStyle: 'bold' } }, p(profile.document_number), 
        { content: 'Nacionalidad:', styles: { fontStyle: 'bold' } }, p(ob.nationality || 'Peruana')
    ],
    [
        { content: 'Fecha Nacimiento:', styles: { fontStyle: 'bold' } }, p(profile.birth_date), 
        { content: 'Edad:', styles: { fontStyle: 'bold' } }, p(ob.age)
    ],
    [
        { content: 'Sexo:', styles: { fontStyle: 'bold' } }, p(ob.gender), 
        { content: 'Estado Civil:', styles: { fontStyle: 'bold' } }, p(ob.civil_status)
    ],
    [
        { content: 'Cónyuge:', styles: { fontStyle: 'bold' } }, p(ob.spouse_name), 
        { content: 'Padres:', styles: { fontStyle: 'bold' } }, `${p(ob.father_name)} / ${p(ob.mother_name)}`
    ],
    [
        { content: 'Dirección:', styles: { fontStyle: 'bold' } }, { content: p(ob.address), colSpan: 3 }
    ],
    [
        { content: 'Distrito:', styles: { fontStyle: 'bold' } }, p(ob.district), 
        { content: 'Provincia/Dpto:', styles: { fontStyle: 'bold' } }, `${p(ob.province)} - ${p(ob.department)}`
    ],
    [
        { content: 'Celular:', styles: { fontStyle: 'bold' } }, p(profile.phone), 
        { content: 'Celular Adic.:', styles: { fontStyle: 'bold' } }, p(ob.alt_phone)
    ],
    [
        { content: 'Email:', styles: { fontStyle: 'bold' } }, p(profile.email), 
        { content: 'Email Adic.:', styles: { fontStyle: 'bold' } }, p(ob.alt_email)
    ],
    [
        { content: 'AFP / ONP:', styles: { fontStyle: 'bold' } }, p(ob.afp_status || profile.pension_system),
        { content: 'Tallas (C/Z/P):', styles: { fontStyle: 'bold' } }, `${p(ob.shirt_size)} / ${p(ob.shoe_size)} / ${p(ob.pants_size)}`
    ]
  ];

  doc.autoTable({
    startY: currentY,
    body: personalData,
    theme: 'grid',
    styles: { fontSize: fontBody, cellPadding: 1.5, lineColor: [200, 200, 200], textColor: TEXT_COLOR },
    columnStyles: { 0: { cellWidth: 35 }, 2: { cellWidth: 30 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // =========================================================
  // II. EMERGENCIA Y FAMILIA
  // =========================================================
  doc.setFontSize(fontHeader);
  doc.setFont('helvetica', 'bold');
  doc.text("CONTACTOS DE EMERGENCIA Y FAMILIA:", 16, currentY);
  currentY += 2;

  const familyData = [
      [{ content: 'Contacto Emergencia:', styles: { fontStyle: 'bold' } }, p(ob.emergency_contact_name), { content: 'Teléfono:', styles: { fontStyle: 'bold' } }, p(ob.emergency_contact_phone)],
      [{ content: 'Familiares en L&K:', styles: { fontStyle: 'bold' } }, p(ob.has_relatives_in_company || 'NO'), { content: 'Hijos/Dependientes:', styles: { fontStyle: 'bold' } }, p(ob.has_dependents || 'NO')]
  ];

  if(ob.has_dependents === 'SI' && ob.dependents_details) {
      familyData.push([{ content: 'Detalle Hijos:', styles: { fontStyle: 'bold' } }, { content: p(ob.dependents_details), colSpan: 3 }]);
  }

  doc.autoTable({
    startY: currentY,
    body: familyData,
    theme: 'grid',
    styles: { fontSize: fontBody, cellPadding: 1.5 },
    margin: { left: 14, right: 14 }
  });
  currentY = doc.lastAutoTable.finalY + 5;

  // =========================================================
  // III. ANTECEDENTES ACADÉMICOS
  // =========================================================
  currentY = addSectionTitle("III. ANTECEDENTES ACADÉMICOS", currentY);

  const academicData = [
      [{ content: 'Nivel:', styles: { fontStyle: 'bold' } }, p(ob.education_level), { content: 'Estado:', styles: { fontStyle: 'bold' } }, p(ob.education_status)],
      [{ content: 'Institución:', styles: { fontStyle: 'bold' } }, p(ob.institution), { content: 'Año Egreso:', styles: { fontStyle: 'bold' } }, p(ob.grad_year)]
  ];

  if(ob.additional_courses && ob.additional_courses.length > 0) {
      ob.additional_courses.forEach(c => {
          if(c.name) academicData.push([{ content: 'Curso:', styles: { fontStyle: 'bold' } }, p(c.name), { content: 'Fecha:', styles: { fontStyle: 'bold' } }, p(c.date)]);
      });
  }

  doc.autoTable({
    startY: currentY,
    body: academicData,
    theme: 'grid',
    styles: { fontSize: fontBody, cellPadding: 1.5 },
    margin: { left: 14, right: 14 }
  });
  currentY = doc.lastAutoTable.finalY + 5;

  // =========================================================
  // IV. EXPERIENCIA LABORAL
  // =========================================================
  currentY = addSectionTitle("IV. EXPERIENCIA LABORAL (Últimas 3)", currentY);

  const expRows = [];
  // Cabecera manual
  expRows.push([
      { content: 'Empresa', styles: { fillColor: GRAY_BG, fontStyle: 'bold' } },
      { content: 'Cargo', styles: { fillColor: GRAY_BG, fontStyle: 'bold' } },
      { content: 'Periodo', styles: { fillColor: GRAY_BG, fontStyle: 'bold' } },
      { content: 'Jefe Inmediato', styles: { fillColor: GRAY_BG, fontStyle: 'bold' } }
  ]);

  const experiences = ob.work_experience || [];
  experiences.forEach((exp) => {
     if(exp.company) {
         expRows.push([
             p(exp.company),
             p(exp.position),
             `${p(exp.start)} a ${p(exp.end)}`,
             `${p(exp.boss)} (${p(exp.boss_phone)})`
         ]);
         expRows.push([{ content: `Funciones: ${p(exp.functions)}`, colSpan: 4, styles: { fontStyle: 'italic', fontSize: 7, textColor: [80,80,80] } }]);
     }
  });

  if (expRows.length === 1) { 
      expRows.push([{ content: 'No se registró experiencia previa.', colSpan: 4, styles: { halign: 'center' } }]);
  }

  doc.autoTable({
    startY: currentY,
    body: expRows,
    theme: 'grid',
    styles: { fontSize: fontBody, cellPadding: 1.5 },
    margin: { left: 14, right: 14 }
  });
  currentY = doc.lastAutoTable.finalY + 5;

  // =========================================================
  // V. DATOS BANCARIOS
  // =========================================================
  if (currentY > 250) { doc.addPage(); currentY = 20; }
  currentY = addSectionTitle("V. DATOS BANCARIOS", currentY);

  const bankData = [
      [{ content: 'Banco:', styles: { fontStyle: 'bold' } }, p(ob.bank_name), { content: 'AFP/ONP:', styles: { fontStyle: 'bold' } }, p(ob.afp_status)],
      [{ content: 'N° Cuenta:', styles: { fontStyle: 'bold' } }, p(ob.bbva_account), { content: 'CCI:', styles: { fontStyle: 'bold' } }, p(ob.interbank_account)],
      [{ content: 'Observaciones:', styles: { fontStyle: 'bold' } }, { content: p(ob.bank_observations) || 'Ninguna', colSpan: 3 }]
  ];

  doc.autoTable({
    startY: currentY,
    body: bankData,
    theme: 'grid',
    styles: { fontSize: fontBody, cellPadding: 1.5 },
    margin: { left: 14, right: 14 }
  });
  currentY = doc.lastAutoTable.finalY + 5;

  // =========================================================
  // VI. CLAUSULAS LEGALES (Del Word)
  // =========================================================
  if (currentY > 200) { doc.addPage(); currentY = 20; }

  doc.setFontSize(fontHeader);
  doc.setFont('helvetica', 'bold');
  doc.text("DECLARACIONES Y CLÁUSULAS INTERNAS:", 16, currentY);
  currentY += 5;

  doc.setFontSize(fontLegal);
  doc.setFont('helvetica', 'normal');
  
  const legalText = [
      "1. Declaro bajo juramento que la información proporcionada en la presente ficha es veraz, conforme a lo establecido en el artículo IV inciso 1.7 del Título Preliminar, el artículo 47 inciso 47.1.3 y el artículo 44 del TUO de la Ley Nº 27444.",
      "2. Autorizo su verificación, y acepto que, de encontrarse información falsa o adulterada acepto expresamente que la entidad proceda a mi retiro automático, sea del proceso de selección o de la entidad si se produjo vinculación, sin prejuicio de aplicarse las sanciones legales que correspondan.",
      "3. CLAUSULAS INTERNAS: Me comprometo a cumplir con mis funciones, las políticas, reglamentos internos y disposiciones de la empresa.",
      "4. Declaro haber recibido la inducción en Seguridad y Salud en el Trabajo y me comprometo al uso adecuado de los equipos de protección personal (EPP) entregados.",
      "5. Me obligo a mantener la confidencialidad de toda información a la que tenga acceso en el ejercicio de mis funciones.",
      "6. Reconozco que debo comunicar de inmediato cualquier ausencia, accidente o novedad relacionada con mi trabajo.",
      "7. En caso de recibir bienes, equipos o materiales de la empresa (incluidos EPP), me comprometo a su correcta utilización y devolución, autorizando expresamente el descuento de su valor en mis beneficios sociales en caso de pérdida o no devolución.",
      "8. Autorizo el tratamiento de mis datos personales para fines administrativos y de control, conforme a la Ley Nº 29733.",
      "9. “Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”."
  ];

  const splitText = doc.splitTextToSize(legalText.join('\n\n'), 180);
  doc.text(splitText, 16, currentY);
  currentY += (splitText.length * 2.8) + 15;

  // =========================================================
  // FIRMA
  // =========================================================
  if (currentY > 270) { doc.addPage(); currentY = 40; }

  doc.line(70, currentY, 140, currentY); // Línea
  doc.setFontSize(fontBody);
  doc.setFont('helvetica', 'bold');
  doc.text("Firma y Huella", 105, currentY + 5, { align: "center" });
  
  doc.setFont('helvetica', 'normal');
  doc.text(`DNI/CEX: ${p(profile.document_number) || '.........................'}`, 105, currentY + 10, { align: "center" });
  
  // Fecha usando JS nativo
  const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.text(`Lima, ${today}`, 105, currentY + 15, { align: "center" });

  doc.save(`Ficha_Staff_${p(profile.document_number) || 'empleado'}.pdf`);
};