import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Función auxiliar para fechas
const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const [year, month, day] = dateString.split('-');
    // Validar formato
    if(!year || !month || !day) return dateString;
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

  const checkVal = (val) => val || '---';

  // ==========================================
  // ENCABEZADO
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
  doc.text("FICHA DE REGISTRO DE PERSONAL - STAFF", 105, 23, { align: 'center' });

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
    ['Nombres y Apellidos:', (profile.full_name || '').toUpperCase(), 'DNI / CE:', profile.document_number || '---'],
    // Fila 2
    ['Nacionalidad:', checkVal(ob.nationality), 'F. Nacimiento:', formatDate(profile.birth_date)],
    // Fila 3: Edad y Sexo
    ['Edad:', ob.age ? `${ob.age} años` : '---', 'Sexo:', checkVal(ob.gender)],
    // Fila 4: Estado Civil y Conyuge
    ['Estado Civil:', checkVal(ob.civil_status), 'Cónyuge:', checkVal(ob.spouse_name)],
    // Fila 5: Contacto
    ['Celular Princ.:', checkVal(profile.phone), 'Celular Sec.:', checkVal(ob.alt_phone)],
    // Fila 6: Ubicación
    ['Dirección:', checkVal(ob.address), 'Distrito:', checkVal(ob.district)],
    ['Prov/Depto:', `${checkVal(ob.province)} - ${checkVal(ob.department)}`, 'Email Corp:', checkVal(profile.email)],
    ['Email Pers.:', checkVal(ob.personal_email), '', ''],
    
    // --- DATOS LABORALES ---
    ['Cargo:', (profile.role || '---').replace(/_/g, ' ').toUpperCase(), 'F. Ingreso:', formatDate(profile.entry_date)],
    ['Sistema Pensión:', checkVal(ob.afp_status), 'Parientes L&K:', checkVal(ob.has_relatives_in_company)],

    // --- TALLAS ---
    ['Talla Polo:', checkVal(ob.shirt_size), 'Talla Pantalón:', checkVal(ob.pants_size)],
    ['Talla Calzado:', checkVal(ob.shoe_size), '', '']
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
      ['Nivel:', checkVal(ob.education_level), 'Estado:', checkVal(ob.education_status)],
      ['Institución:', checkVal(ob.institution), 'F. Egreso:', formatDate(ob.grad_date)]
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

          // Funciones
          if (exp.functions) {
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
  // 6. DATOS BANCARIOS
  // ==========================================
  if (currentY > 240) { doc.addPage(); currentY = 20; }

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
    body: [
      ['Banco:', checkVal(ob.bank_name), 'N° Cuenta:', checkVal(ob.bbva_account)],
      ['CCI:', checkVal(ob.interbank_account), 'Obs:', checkVal(ob.bank_observations)]
    ],
    columnStyles: { 0: { fontStyle: 'bold', width: 25, textColor: PRIMARY }, 2: { fontStyle: 'bold', width: 25, textColor: PRIMARY } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 10;

  // ==========================================
  // CLÁUSULAS Y LEGAL (RESTAURADO)
  // ==========================================
  
  if (currentY > 200) {
      doc.addPage();
      currentY = 20;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");

  const legalText = `Declaro bajo juramento que la información proporcionada en la presente ficha es veraz, conforme a lo establecido en el artículo IV inciso 1.7 del Título Preliminar, el artículo 47 inciso 47.1.3 y el artículo 44 del TUO de la Ley Nº 27444, aprobado por D.S. Nº 006-2017-JUS. Autorizo su verificación, y acepto que, de encontrarse información falsa o adulterada acepto expresamente que la entidad proceda a mi retiro automático, sea del proceso de selección o de la entidad si se produjo vinculación, sin prejuicio de aplicarse las sanciones legales que correspondan.`;

  const clausesText = [
      "CLÁUSULAS Y COMPROMISOS:",
      "• Me comprometo a cumplir fielmente con mis funciones, las políticas de la empresa, y el Reglamento Interno de Trabajo.",
      "• Declaro conocer que la empresa cuenta con normas de Seguridad y Salud en el Trabajo, las cuales me comprometo a respetar para salvaguardar mi integridad y la de mis compañeros.",
      "• Me obligo a mantener la más estricta confidencialidad sobre la información técnica, comercial o administrativa de la empresa a la que tenga acceso.",
      "• En caso de que se me asignen equipos (laptop, celular, EPP, herramientas), me hago responsable de su custodia y buen uso, autorizando el descuento en caso de pérdida o daño por negligencia comprobada.",
      "• Autorizo el tratamiento de mis datos personales para fines de gestión de recursos humanos, planilla y bienestar social, conforme a la Ley Nº 29733.",
      "",
      "“Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”."
  ];

  // Imprimir párrafo legal
  const splitLegal = doc.splitTextToSize(legalText, 180);
  doc.text(splitLegal, 14, currentY);
  currentY += (splitLegal.length * 3) + 5;

  // Imprimir Cláusulas
  doc.setFont("helvetica", "bold");
  doc.text(clausesText[0], 14, currentY); 
  currentY += 4;
  
  doc.setFont("helvetica", "normal");
  for (let i = 1; i < clausesText.length; i++) {
      const line = clausesText[i];
      if (line === "") {
          currentY += 2;
          continue;
      }
      if (i === clausesText.length - 1) doc.setFont("helvetica", "bolditalic");
      
      const splitLine = doc.splitTextToSize(line, 180);
      doc.text(splitLine, 14, currentY);
      currentY += (splitLine.length * 3.5);
  }

  // ==========================================
  // FIRMA Y HUELLA
  // ==========================================
  currentY += 25;

  if (currentY + 40 > 280) {
      doc.addPage();
      currentY = 40;
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(60, currentY, 120, currentY); 
  
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Firma y Huella", 90, currentY + 5, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.text(`${(profile.full_name || '').toUpperCase()}`, 90, currentY + 10, { align: 'center' });
  doc.text(`DNI: ${profile.document_number || ''}`, 90, currentY + 14, { align: 'center' });

  doc.setDrawColor(200);
  doc.rect(130, currentY - 25, 25, 30);
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text("Huella", 142.5, currentY + 8, { align: 'center' });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, pageHeight - 10);

  doc.save(`Ficha_Staff_${profile.document_number || 'Colaborador'}.pdf`);
};