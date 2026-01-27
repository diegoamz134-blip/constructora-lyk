import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/images/logo-lk-full.png'; 

export const generateWorkerPDF = async (worker) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // --- CONFIGURACIÓN DE ESTILO ---
  const colors = {
    primary: [0, 51, 102], // Azul Corporativo (#003366)
    secondary: [100, 116, 139], // Gris texto secundario
    text: [30, 41, 59], // Gris oscuro para lectura
    lightBg: [248, 250, 252] // Fondo muy sutil para filas alternas (opcional)
  };

  const checkVal = (val) => val || '-';
  const formatDate = (dateStr) => dateStr || '-';

  // --- 1. ENCABEZADO ---
  try {
    const imgProps = doc.getImageProperties(logo);
    const imgWidth = 40;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    doc.addImage(logo, 'PNG', 14, 10, imgWidth, imgHeight);
  } catch (e) {
    console.warn("Logo no cargado", e);
  }

  doc.setFontSize(14);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text("FICHA DE PERSONAL - OBRERO", pageWidth - 14, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(...colors.secondary);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, pageWidth - 14, 26, { align: 'right' });

  let currentY = 35;

  // --- FUNCIÓN HELPER PARA TABLAS LIMPIAS ---
  // Esta configuración quita los bordes verticales y horizontales del cuerpo,
  // dejando solo el encabezado destacado.
  const tableConfig = {
    theme: 'plain', // Sin bordes por defecto (lo que pediste)
    headStyles: { 
        fillColor: colors.primary, 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 10,
        cellPadding: 3,
        halign: 'left'
    },
    bodyStyles: { 
        textColor: colors.text, 
        fontSize: 9, 
        cellPadding: 3 
    },
    columnStyles: {
        0: { fontStyle: 'bold', width: 45 }, // Etiquetas en negrita
        1: { width: 50 },
        2: { fontStyle: 'bold', width: 45 },
        3: { width: 'auto' }
    },
    // Dibujar solo una línea al final del header para separarlo
    didDrawCell: (data) => {
        if (data.section === 'head' && data.column.index === data.table.columns.length - 1) {
            // Opcional: Si quisieras una línea debajo del header
        }
    }
  };

  // --- 2. DATOS PERSONALES ---
  autoTable(doc, {
    startY: currentY,
    head: [['1. DATOS PERSONALES', '', '', '']],
    ...tableConfig,
    body: [
      ['Nombres:', checkVal(worker.first_name), 'Apellidos:', `${checkVal(worker.paternal_surname)} ${checkVal(worker.maternal_surname)}`],
      ['DNI / CEX:', checkVal(worker.document_number), 'Fecha Nacimiento:', formatDate(worker.birth_date)],
      ['Nacionalidad:', checkVal(worker.nationality), 'Sexo:', checkVal(worker.sex)],
      ['Estado Civil:', checkVal(worker.marital_status), 'Cónyuge:', checkVal(worker.spouse_name)],
      ['Nombre Padre:', checkVal(worker.fathers_name), 'Nombre Madre:', checkVal(worker.mothers_name)],
      ['¿Tiene Hijos?:', worker.has_children ? 'SÍ' : 'NO', 'Cantidad:', worker.details?.dependents?.length || 0]
    ]
  });

  // --- 3. UBICACIÓN Y CONTACTO ---
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8, // Un poco más de aire entre tablas
    head: [['2. UBICACIÓN Y CONTACTO', '', '', '']],
    ...tableConfig,
    body: [
      ['Dirección:', { content: checkVal(worker.address), colSpan: 3 }],
      ['Departamento:', checkVal(worker.department), 'Provincia:', checkVal(worker.province)],
      ['Distrito:', checkVal(worker.district), '', ''],
      ['Celular Principal:', checkVal(worker.phone), 'Celular Adicional:', checkVal(worker.secondary_phone)],
      ['Email:', checkVal(worker.email), 'Email Adicional:', checkVal(worker.secondary_email)],
    ]
  });

  // --- 4. DATOS ADMINISTRATIVOS ---
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['3. DATOS ADMINISTRATIVOS Y TALLAS', '', '', '']],
    ...tableConfig,
    body: [
      ['Sistema Pensión:', checkVal(worker.pension_system), 'Banco:', checkVal(worker.bank_name)],
      ['Nro. Cuenta:', checkVal(worker.bank_account), 'CCI:', checkVal(worker.cci)],
      ['Talla Camisa:', checkVal(worker.shirt_size), 'Talla Pantalón:', checkVal(worker.pants_size)],
      ['Talla Calzado:', checkVal(worker.shoe_size), '', '']
    ]
  });

  // --- 5. FAMILIA Y EMERGENCIA ---
  const emergencyRows = (worker.details?.emergency_contacts || []).map(c => [
    c.name, c.relation, c.phone
  ]);
  const dependentRows = (worker.details?.dependents || []).map(d => [
    d.name, `${d.age} años`, '-'
  ]);

  if (emergencyRows.length > 0 || dependentRows.length > 0) {
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['4. FAMILIA Y EMERGENCIA', '', '']],
        ...tableConfig,
        body: [] // Solo usamos el header principal aquí
    });
    
    // Subtabla simple sin bordes pesados
    if (emergencyRows.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.text);
        doc.text("Contactos de Emergencia:", 14, doc.lastAutoTable.finalY + 6);
        
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [['Nombre', 'Relación', 'Teléfono']],
            body: emergencyRows,
            theme: 'striped', // Striped suave para listas es mejor que plain
            headStyles: { fillColor: [148, 163, 184], textColor: 255, fontStyle: 'bold' }, // Gris azulado suave
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14 }
        });
    }

    if (dependentRows.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.text);
        doc.text("Hijos / Dependientes:", 14, doc.lastAutoTable.finalY + 6);
        
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 8,
            head: [['Nombre', 'Edad', 'Observación']],
            body: dependentRows,
            theme: 'striped',
            headStyles: { fillColor: [148, 163, 184], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14 }
        });
    }
  }

  // --- 6. PERFIL PROFESIONAL ---
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['5. PERFIL PROFESIONAL', '', '', '']],
    ...tableConfig,
    columnStyles: { 0: { fontStyle: 'bold', width: 45 } },
    body: [
      ['Nivel Educativo:', checkVal(worker.education_level), 'Estado:', checkVal(worker.education_status)],
      ['Institución:', { content: checkVal(worker.education_institution), colSpan: 3 }],
    ]
  });

  const jobRows = (worker.details?.work_experience || []).map(job => [
    job.company, job.role, `${job.period_start || ''} - ${job.period_end || ''}`, job.boss_name || '-'
  ]);

  if (jobRows.length > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text("Experiencia Laboral:", 14, doc.lastAutoTable.finalY + 6);
    
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Empresa', 'Cargo', 'Periodo', 'Jefe Inmediato']],
        body: jobRows,
        theme: 'striped',
        headStyles: { fillColor: [148, 163, 184], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14 }
    });
  }

  // --- 7. DECLARACIÓN JURADA (TEXTO LEGAL) ---
  
  // Verificamos espacio. Si queda poco, pasamos a nueva hoja
  if (doc.internal.pageSize.height - doc.lastAutoTable.finalY < 120) {
      doc.addPage();
      currentY = 20;
  } else {
      currentY = doc.lastAutoTable.finalY + 15;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text("DECLARACIÓN JURADA Y CLÁUSULAS CONTRACTUALES", pageWidth / 2, currentY, { align: 'center' });

  currentY += 8;

  const legalText = [
      "Declaro bajo juramento que la información proporcionada en la presente ficha es veraz, conforme a lo establecido en el artículo IV inciso 1.7 del Título Preliminar, el artículo 47 inciso 47.1.3 y el artículo 44 del TUO de la Ley Nº 27444, aprobado por D.S. Nº 006-2017-JUS. Autorizo su verificación, y acepto que, de encontrarse información falsa o adulterada acepto expresamente que la entidad proceda a mi retiro automático, sea del proceso de selección o de la entidad si se produjo vinculación, sin prejuicio de aplicarse las sanciones legales que correspondan.",
      "",
      "CLÁUSULAS CONTRACTUALES:",
      "• Reconozco haber sido contratado en la categoría laboral correspondiente (peón, oficial, operario u otra) y me comprometo a desempeñar las funciones acordes a la misma, hasta la culminación del proyecto.",
      "• Declaro haber recibido inducción de seguridad en obra y me comprometo a cumplir estrictamente las normas de Seguridad y Salud en el Trabajo, así como las políticas, disposiciones y reglamento interno de la empresa.",
      "• Me obligo a usar de manera permanente los EPP asignados y reportar cualquier deterioro.",
      "• Acepto que el incumplimiento grave de normas de seguridad, consumo de alcohol, drogas o actos de indisciplina en obra son causales de terminación del vínculo laboral conforme a ley.",
      "• En caso de recibir equipos, herramientas o implementos, me comprometo a su devolución al cese de labores, autorizando expresamente el descuento de su valor en mis beneficios sociales si no lo hiciera.",
      "• Me obligo a mantener reserva respecto de la información técnica del proyecto (planos, metrados, especificaciones, costos).",
      "• Autorizo el tratamiento de mis datos personales para fines administrativos y de control, conforme a la Ley Nº 29733.",
      "",
      "“Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”."
  ];

  autoTable(doc, {
      startY: currentY,
      body: legalText.map(line => [line]),
      theme: 'plain', // Sin ningún borde para el texto legal
      styles: { 
          fontSize: 8, 
          cellPadding: 1, 
          overflow: 'linebreak', 
          halign: 'justify', 
          textColor: [50, 50, 50],
          font: 'helvetica'
      },
      columnStyles: { 0: { cellWidth: 'auto' } },
      pageBreak: 'auto'
  });

  // --- 8. FIRMA Y HUELLA ---
  
  // Aquí es donde damos el espacio EXTRA que pediste
  // Antes era +15, ahora +40 para que no esté pegado
  let signY = doc.lastAutoTable.finalY + 45; 

  // Si con ese espacio extra nos salimos de la hoja, nueva página
  if (signY + 40 > doc.internal.pageSize.height) {
      doc.addPage();
      signY = 50; // Empezamos un poco abajo en la nueva hoja
  }

  doc.setDrawColor(0); // Color negro para líneas
  doc.setLineWidth(0.5);

  // Bloque Firma (Izquierda)
  doc.line(30, signY, 90, signY); // Línea de firma
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Firma del Trabajador", 60, signY + 6, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`DNI: ${checkVal(worker.document_number)}`, 60, signY + 11, { align: 'center' });

  // Bloque Huella (Derecha)
  // Cuadro para la huella
  doc.setDrawColor(150); // Gris suave para el borde de la huella
  doc.rect(130, signY - 30, 25, 35); 
  
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.text("Huella Digital", 142.5, signY + 10, { align: 'center' });

  // Guardar PDF
  doc.save(`Ficha_Obrero_${worker.first_name || 'Trabajador'}.pdf`);
};