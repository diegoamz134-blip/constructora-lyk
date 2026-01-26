import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función auxiliar para fechas
const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export const generateStaffPDF = async (profile) => {
  const doc = new jsPDF();
  const ob = profile.onboarding_data || {};

  // --- CONFIGURACIÓN DE ESTILO ---
  const PRIMARY = [0, 51, 102]; // Azul Corporativo
  const SECONDARY = [245, 245, 245]; // Gris muy claro
  const TEXT_DARK = [40, 40, 40];

  // ==========================================
  // ENCABEZADO (NUEVO DISEÑO)
  // ==========================================
  
  // Línea 1: Recursos Humanos
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "bold");
  doc.text("RECURSOS HUMANOS", 105, 15, { align: 'center' });

  // Línea 2: Título del Documento
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA DE REGISTRO DE INGRESO DE PERSONAL", 105, 23, { align: 'center' });

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
  // 1. DATOS PERSONALES
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['DATOS PERSONALES Y CONTACTO']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  const bodyPersonal = [
    ['Nombres y Apellidos:', (profile.full_name || '').toUpperCase(), 'DNI:', profile.document_number || '---'],
    ['Nacionalidad:', ob.nationality || '---', 'F. Nacimiento:', formatDate(profile.birth_date)],
    ['Estado Civil:', ob.civil_status || '---', 'Sexo:', ob.gender || '---'], // Verificamos Gender aquí
    ['Cónyuge:', ob.spouse_name || '---', 'Celular Princ.:', profile.phone || '---'],
    ['Nombre Padre:', ob.father_name || '---', 'Nombre Madre:', ob.mother_name || '---'],
    ['Dirección:', ob.address || '---', 'Distrito:', ob.district || '---'],
    ['Prov/Depto:', `${ob.province || ''} - ${ob.department || ''}`, 'Email Corp:', profile.email || '---'],
    ['Email Personal:', ob.personal_email || '---', 'Celular Sec.:', ob.alt_phone || '---']
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
  // 2. FAMILIA (HIJOS DINÁMICOS)
  // ==========================================
  if (ob.children && ob.children.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("HIJOS / DEPENDIENTES", 14, currentY + 3);
      
      autoTable(doc, {
        startY: currentY + 5,
        head: [['Nombres y Apellidos', 'Edad']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold', lineColor: 200 },
        styles: { fontSize: 8, lineColor: 230 },
        body: ob.children.map(child => [child.name || '-', `${child.age || '-'} años`]),
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 5;
  }

  // ==========================================
  // 3. EMERGENCIAS (DINÁMICO)
  // ==========================================
  if (ob.emergency_contacts && ob.emergency_contacts.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(...PRIMARY);
      doc.setFont("helvetica", "bold");
      doc.text("CONTACTOS DE EMERGENCIA", 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 5,
        head: [['Nombre Contacto', 'Parentesco', 'Teléfono']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: TEXT_DARK, fontSize: 8, fontStyle: 'bold', lineColor: 200 },
        styles: { fontSize: 8, lineColor: 230 },
        body: ob.emergency_contacts.map(c => [c.name || '-', c.relationship || '-', c.phone || '-']),
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 8;
  } else {
      currentY += 5; 
  }

  // ==========================================
  // 4. FORMACIÓN ACADÉMICA
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['FORMACIÓN ACADÉMICA Y CURSOS']],
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
      ['Nivel:', ob.education_level || '---', 'Estado:', ob.education_status || '---'],
      ['Institución:', ob.institution || '---', 'Año Egreso:', ob.grad_year || '---']
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY;

  // Cursos Adicionales
  if (ob.additional_courses && ob.additional_courses.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Curso / Especialización', 'Fecha']],
        theme: 'grid',
        headStyles: { fillColor: SECONDARY, textColor: 50, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, lineColor: 230 },
        body: ob.additional_courses.map(c => [c.name || '-', formatDate(c.date)]),
        margin: { left: 14, right: 14 }
      });
      currentY = doc.lastAutoTable.finalY + 8;
  } else {
      currentY += 8;
  }

  // ==========================================
  // 5. EXPERIENCIA LABORAL
  // ==========================================
  autoTable(doc, {
    startY: currentY,
    head: [['EXPERIENCIA LABORAL']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY;

  if (ob.work_experience && ob.work_experience.length > 0) {
      ob.work_experience.forEach((exp, index) => {
          if (currentY > 260) { doc.addPage(); currentY = 20; }

          autoTable(doc, {
            startY: currentY,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1, textColor: TEXT_DARK },
            columnStyles: { 
                0: { fontStyle: 'bold', width: 20, textColor: PRIMARY }, 
                2: { fontStyle: 'bold', width: 20, textColor: PRIMARY } 
            },
            body: [
               ['Empresa:', (exp.company || '---').toUpperCase(), 'Cargo:', (exp.position || '---').toUpperCase()],
               ['Periodo:', `${formatDate(exp.start)}  al  ${formatDate(exp.end)}`, 'Jefe:', exp.boss || '---']
            ],
            margin: { left: 14, right: 14 }
          });
          currentY = doc.lastAutoTable.finalY;

          if (exp.functions && exp.functions.length > 0) {
             const funcArray = Array.isArray(exp.functions) ? exp.functions : [exp.functions];
             const cleanFunctions = funcArray.filter(f => f && f.trim() !== '');
             
             if (cleanFunctions.length > 0) {
                 const formattedFunctions = cleanFunctions.map(f => `• ${f}`).join('\n');
                 
                 autoTable(doc, {
                    startY: currentY,
                    body: [[
                        { content: 'Funciones:', styles: { fontStyle: 'bold', textColor: PRIMARY, valign: 'top', cellWidth: 20 } }, 
                        formattedFunctions
                    ]],
                    theme: 'plain',
                    styles: { fontSize: 8, cellPadding: 1 },
                    margin: { left: 14, right: 14 }
                 });
                 currentY = doc.lastAutoTable.finalY + 3;
             }
          }
          if (index < ob.work_experience.length - 1) {
              doc.setDrawColor(220);
              doc.line(14, currentY, 196, currentY);
              currentY += 2;
          }
      });
  } else {
      currentY += 5;
  }

  // ==========================================
  // 6. DATOS BANCARIOS Y TALLAS
  // ==========================================
  if (currentY > 240) { doc.addPage(); currentY = 20; }

  autoTable(doc, {
    startY: currentY,
    head: [['DATOS BANCARIOS Y TALLAS']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY, fontSize: 10, fontStyle: 'bold', halign: 'center' },
    margin: { left: 14, right: 14 }
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, textColor: TEXT_DARK },
    body: [
      ['Banco:', ob.bank_name || '---', 'N° Cuenta:', ob.bbva_account || '---'],
      ['CCI:', ob.interbank_account || '---', 'AFP/ONP:', ob.afp_status || '---'],
      ['Talla Polo:', ob.shirt_size || '---', 'Talla Pantalón:', ob.pants_size || '---'],
      ['Talla Calzado:', ob.shoe_size || '---', 'Parientes L&K:', ob.has_relatives_in_company || 'NO']
    ],
    columnStyles: { 0: { fontStyle: 'bold', width: 25, textColor: PRIMARY }, 2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // ==========================================
  // CLÁUSULAS Y LEGAL (NUEVA SECCIÓN)
  // ==========================================
  
  // Si queda poco espacio, saltamos página para las cláusulas
  if (currentY > 200) {
      doc.addPage();
      currentY = 20;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");

  const legalText = `Declaro bajo juramento que la información proporcionada en la presente ficha es veraz, conforme a lo establecido en el artículo IV inciso 1.7 del Título Preliminar, el artículo 47 inciso 47.1.3 y el artículo 44 del TUO de la Ley Nº 27444, aprobado por D.S. Nº 006-2017-JUS. Autorizo su verificación, y acepto que, de encontrarse información falsa o adulterada acepto expresamente que la entidad proceda a mi retiro automático, sea del proceso de selección o de la entidad si se produjo vinculación, sin prejuicio de aplicarse las sanciones legales que correspondan.`;

  const clausesText = [
      "CLAUSULAS INTERNAS:",
      "• Me comprometo a cumplir con mis funciones, las políticas, reglamentos internos y disposiciones de la empresa.",
      "• Declaro haber recibido la inducción en Seguridad y Salud en el Trabajo y me comprometo al uso adecuado de los equipos de protección personal (EPP) entregados.",
      "• Me obligo a mantener la confidencialidad de toda información a la que tenga acceso en el ejercicio de mis funciones.",
      "• Reconozco que debo comunicar de inmediato cualquier ausencia, accidente o novedad relacionada con mi trabajo.",
      "• En caso de recibir bienes, equipos o materiales de la empresa (incluidos EPP), me comprometo a su correcta utilización y devolución, autorizando expresamente el descuento de su valor en mis beneficios sociales en caso de pérdida o no devolución.",
      "• Autorizo el tratamiento de mis datos personales para fines administrativos y de control, conforme a la Ley Nº 29733.",
      "",
      "“Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”."
  ];

  // Imprimir párrafo legal
  const splitLegal = doc.splitTextToSize(legalText, 180);
  doc.text(splitLegal, 14, currentY);
  currentY += (splitLegal.length * 3) + 5;

  // Imprimir Cláusulas Internas
  doc.setFont("helvetica", "bold");
  doc.text(clausesText[0], 14, currentY); // Título cláusulas
  currentY += 4;
  
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < clausesText.length; i++) {
      const line = clausesText[i];
      if (line === "") {
          currentY += 2;
          continue;
      }
      // Verificar si es la línea de la firma (la última) para ponerla en negrita
      if (i === clausesText.length - 1) doc.setFont("helvetica", "bolditalic");
      
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, 14, currentY);
      currentY += (splitLine.length * 3.5); // Espaciado entre items
  }

  // ==========================================
  // FIRMA Y HUELLA
  // ==========================================
  currentY += 25; // Espacio antes de la firma

  // Verificar si la firma cabe en la página, sino nueva página
  if (currentY + 40 > 290) {
      doc.addPage();
      currentY = 40;
  }

  // Línea de firma
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(60, currentY, 120, currentY); 
  
  // Texto firma
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Firma y Huella", 90, currentY + 5, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.text(`${(profile.full_name || '').toUpperCase()}`, 90, currentY + 10, { align: 'center' });
  doc.text(`DNI: ${profile.document_number || ''}`, 90, currentY + 14, { align: 'center' });

  // Cuadro para huella (opcional visualmente)
  doc.setDrawColor(200);
  doc.rect(130, currentY - 25, 25, 30); // Cuadro a la derecha de la firma
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text("Huella", 142.5, currentY + 8, { align: 'center' });

  // Pie de página (Fecha impresión)
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Fecha de impresión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 10);

  // Guardar PDF
  doc.save(`Ficha_Personal_${profile.document_number || 'Staff'}.pdf`);
};