import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoLyk from '../assets/images/logo-lk-full.png';

// --- CONFIGURACIÓN DE COLORES Y FUENTES ---
const COLORS = {
  HEADER_BG: [255, 255, 255], // Fondo blanco para cabecera logo
  SECTION_BG: [0, 51, 102],   // Azul L&K para títulos de sección
  TEXT: [0, 0, 0],            // Texto negro
  WHITE: [255, 255, 255],     // Texto blanco
  BORDER: [0, 0, 0]           // Bordes negros
};

// Helper para cargar imagen
const getImageData = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Si falla, no rompe el PDF
  });
};

export const generateStaffPDF = async (profile) => {
  try {
    const doc = new jsPDF();
    const ob = profile.onboarding_data || {};
    const img = await getImageData(logoLyk);

    // Helper para formatear texto (Mayúsculas si hay dato)
    const p = (val) => val ? String(val).toUpperCase() : '';

    // =========================================================
    // DEFINICIÓN DEL HEADER (Se repite en cada página)
    // =========================================================
    const drawHeader = (data) => {
        const doc = data.doc;
        
        // Dibujar solo si es la primera tabla de la página o estamos al inicio
        // Ajustamos márgenes y posición
        const startX = 14;
        const startY = 10;
        const width = 182;
        const height = 20;

        // Borde del cuadro del encabezado
        doc.setDrawColor(...COLORS.BORDER);
        doc.setLineWidth(0.3);
        doc.rect(startX, startY, width, height);

        // Logo (Izquierda)
        if (img) {
            doc.addImage(img, 'PNG', startX + 2, startY + 2, 40, 16); 
        }

        // Título (Centro)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.TEXT);
        doc.text("FICHA PERSONAL STAFF", 105, startY + 12, { align: 'center' });

        // Línea divisoria vertical (opcional, para separar logo)
        // doc.line(startX + 45, startY, startX + 45, startY + height);
    };

    // =========================================================
    // I. DATOS PERSONALES (Estructura EXACTA al Word)
    // =========================================================
    // Filas de la tabla principal. Usamos colSpan para ajustar anchos.
    const personalRows = [
        // Fila Título Sección
        [{ content: 'I. DATOS PERSONALES', colSpan: 6, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        
        // Filas de Datos
        [
            { content: 'Nombre Completo:', styles: { fontStyle: 'bold' } }, 
            { content: p(profile.full_name), colSpan: 5 }
        ],
        [
            { content: 'Cargo:', styles: { fontStyle: 'bold' } }, p(profile.position || ob.area),
            { content: 'Fecha Ingreso:', styles: { fontStyle: 'bold' } }, p(profile.entry_date),
            { content: 'Lugar de Trabajo:', styles: { fontStyle: 'bold' } }, p(ob.work_place || 'OFICINA')
        ],
        [
            { content: 'N° DNI / CEX:', styles: { fontStyle: 'bold' } }, p(profile.document_number),
            { content: 'F. Nacimiento:', styles: { fontStyle: 'bold' } }, p(profile.birth_date),
            { content: 'Nacionalidad:', styles: { fontStyle: 'bold' } }, p(ob.nationality || 'PERUANA')
        ],
        [
            { content: 'Edad:', styles: { fontStyle: 'bold' } }, p(ob.age),
            { content: 'Sexo:', styles: { fontStyle: 'bold' } }, p(ob.gender),
            { content: 'Estado Civil:', styles: { fontStyle: 'bold' } }, p(ob.civil_status)
        ],
        [
            { content: 'Nombre del Cónyuge:', styles: { fontStyle: 'bold' } }, { content: p(ob.spouse_name), colSpan: 5 }
        ],
        [
            { content: 'Nombre del Papá:', styles: { fontStyle: 'bold' } }, { content: p(ob.father_name), colSpan: 2 },
            { content: 'Nombre de la Mamá:', styles: { fontStyle: 'bold' } }, { content: p(ob.mother_name), colSpan: 2 }
        ],
        [
            { content: 'Dirección Actual:', styles: { fontStyle: 'bold' } }, { content: p(ob.address), colSpan: 5 }
        ],
        [
            { content: 'Distrito:', styles: { fontStyle: 'bold' } }, p(ob.district),
            { content: 'Provincia:', styles: { fontStyle: 'bold' } }, p(ob.province),
            { content: 'Departamento:', styles: { fontStyle: 'bold' } }, p(ob.department)
        ],
        [
            { content: 'N° Celular Personal:', styles: { fontStyle: 'bold' } }, { content: p(profile.phone), colSpan: 2 },
            { content: 'N° Celular Adic.:', styles: { fontStyle: 'bold' } }, { content: p(ob.alt_phone), colSpan: 2 }
        ],
        [
            { content: 'Correo Personal:', styles: { fontStyle: 'bold' } }, { content: p(profile.email), colSpan: 2 },
            { content: 'Correo Adicional:', styles: { fontStyle: 'bold' } }, { content: p(ob.alt_email), colSpan: 2 }
        ],
        [
            { content: 'Tipo aportación AFP/ONP:', styles: { fontStyle: 'bold' } }, { content: p(ob.afp_status || profile.pension_system), colSpan: 2 },
            { content: 'Cambio o 1° empleo:', styles: { fontStyle: 'bold' } }, { content: p(ob.first_job_details || 'NO'), colSpan: 2 }
        ],
        // Fila de Tallas (Específica del Word)
        [
            { content: 'Especifique Tallas:', styles: { fontStyle: 'bold', valign: 'middle' } }, 
            { content: `Camisa/Polo: ${p(ob.shirt_size)}`, colSpan: 2 }, 
            { content: `Pantalón: ${p(ob.pants_size)}`, colSpan: 1 }, 
            { content: `Zapatos: ${p(ob.shoe_size)}`, colSpan: 2 }
        ]
    ];

    // =========================================================
    // II. CONTACTOS EMERGENCIA
    // =========================================================
    const emergencyRows = [
        [{ content: 'II. CONTACTOS DE EMERGENCIA', colSpan: 4, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        // Encabezados internos
        [
            { content: 'Nombre y Apellidos', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'Parentesco', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'Tel. Fijo', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'Tel. Celular', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } }
        ],
        [
            p(ob.emergency_contact_name),
            p(ob.emergency_contact_relation || 'FAMILIAR'),
            p(ob.emergency_contact_fixed || '-'),
            p(ob.emergency_contact_phone)
        ],
        [
            p(ob.emergency_contact_name_2 || ''),
            p(ob.emergency_contact_relation_2 || ''),
            p(ob.emergency_contact_fixed_2 || ''),
            p(ob.emergency_contact_phone_2 || '')
        ]
    ];

    // =========================================================
    // III. FAMILIARES EN EMPRESA
    // =========================================================
    const relativesRows = [
        [{ content: 'III. FAMILIARES EN LA EMPRESA', colSpan: 4, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        [
            { content: '¿Tiene familiar(es) dentro de CONSTRUCTORA L&K S.A.C.?', colSpan: 2, styles: { fontStyle: 'bold' } },
            { content: ob.has_relatives_in_company === 'SI' ? '[ X ] SÍ   [   ] NO' : '[   ] SÍ   [ X ] NO', colSpan: 2, styles: { halign: 'center' } }
        ],
        [{ content: 'En caso afirmativo detalle (Nombre / Cargo):', colSpan: 4, styles: { fontStyle: 'bold', fontSize: 7 } }],
        [
            { content: p(ob.relatives_details) || '\n\n', colSpan: 4 } // Espacio para escribir si está vacío
        ]
    ];

    // =========================================================
    // IV. HIJOS / DEPENDIENTES
    // =========================================================
    const kidsRows = [
        [{ content: 'IV. HIJOS O DEPENDIENTES', colSpan: 4, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        [
            { content: '¿Tiene Hijos o Personas dependientes?', colSpan: 2, styles: { fontStyle: 'bold' } },
            { content: ob.has_dependents === 'SI' ? '[ X ] SÍ   [   ] NO' : '[   ] SÍ   [ X ] NO', colSpan: 2, styles: { halign: 'center' } }
        ],
        // Cabecera de la tabla de hijos
        [
            { content: 'Nombres y Apellidos', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240,240,240] } },
            { content: 'Edad', styles: { fontStyle: 'bold', fillColor: [240,240,240] } }
        ]
    ];

    // Llenar filas de hijos (simulando 4 líneas como el Word)
    const childrenList = ob.dependents_list || []; // Suponiendo que sea un array, sino usamos líneas vacías
    for(let i=0; i<4; i++) {
        const kid = childrenList[i] || {};
        kidsRows.push([
            { content: p(kid.name) || ' ', colSpan: 3 },
            { content: p(kid.age) ? `${p(kid.age)} AÑOS` : ' ', colSpan: 1 }
        ]);
    }

    // =========================================================
    // V. ANTECEDENTES ACADÉMICOS
    // =========================================================
    const academicRows = [
        [{ content: 'V. ANTECEDENTES ACADÉMICOS Y PROFESIONALES', colSpan: 4, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        [{ content: 'Marca con (X) el nivel logrado:', colSpan: 4, styles: { fontStyle: 'bold' } }],
        [
            { content: `[${ob.education_level === 'Tecnico' ? 'X' : ' '}] Técnico Superior`, colSpan: 1 },
            { content: `[${ob.education_level === 'Universitario' ? 'X' : ' '}] Universitario`, colSpan: 1 },
            { content: `[${ob.education_level === 'Bachiller' ? 'X' : ' '}] Bachiller`, colSpan: 1 },
            { content: `[${ob.education_level === 'Titulado' ? 'X' : ' '}] Titulado`, colSpan: 1 }
        ],
        [{ content: 'Especifique (Centro de Estudios, Carrera, Año Egreso):', colSpan: 4, styles: { fontStyle: 'bold' } }],
        [{ content: `${p(ob.institution)} - ${p(ob.profession || ob.degree)} - ${p(ob.grad_year)}`, colSpan: 4 }]
    ];

    // =========================================================
    // VI. EXPERIENCIA LABORAL
    // =========================================================
    const expRows = [
        [{ content: 'VI. EXPERIENCIA LABORAL (Últimas 3)', colSpan: 4, styles: { fillColor: COLORS.SECTION_BG, textColor: COLORS.WHITE, fontStyle: 'bold', halign: 'left' } }],
        [
            { content: 'EMPRESA', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'CARGO', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'PERIODO', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } },
            { content: 'JEFE INMEDIATO', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240,240,240] } }
        ]
    ];
    
    // Rellenamos 3 filas vacías si no hay datos para mantener estructura del Word
    const experiences = ob.work_experience || [];
    for(let i=0; i<3; i++) {
        const exp = experiences[i] || {};
        expRows.push([
            p(exp.company || ' '),
            p(exp.position || ' '),
            p(exp.start ? `${exp.start} - ${exp.end}` : ' '),
            p(exp.boss ? `${exp.boss} (${exp.boss_phone || ''})` : ' ')
        ]);
    }

    // =========================================================
    // RENDERIZADO DE TABLAS
    // =========================================================
    
    // Unimos todas las filas en una sola estructura grande para mantener el flujo, 
    // pero autotable maneja mejor tablas separadas para control de columnas.
    // Sin embargo, para "Tal Cual" el Word, es mejor bloques continuos.
    
    let currentY = 35; // Empezar después del header

    // 1. TABLA PRINCIPAL (Datos, Emergencia, Familia, Hijos, Académico, Experiencia)
    // Nota: Las tablas tienen diferente número de columnas lógicas (6 para Datos, 4 para el resto).
    // Usaremos tablas separadas pero pegadas visualmente.

    // TABLA I: DATOS (6 Columnas)
    autoTable(doc, {
        startY: currentY,
        body: personalRows,
        theme: 'grid',
        styles: { 
            fontSize: 7, 
            cellPadding: 1.5, 
            lineColor: COLORS.BORDER, 
            textColor: COLORS.TEXT, 
            lineWidth: 0.1,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 32 }, // Etiquetas anchas
            2: { cellWidth: 25 },
            4: { cellWidth: 25 }
        },
        margin: { top: 35, left: 14, right: 14 },
        didDrawPage: drawHeader // AQUÍ ESTÁ LA MAGIA: Dibuja el encabezado en cada página nueva que cree esta tabla
    });

    currentY = doc.lastAutoTable.finalY + 5;

    // TABLA II a VI (4 Columnas para estandarizar)
    // Combinamos el resto de secciones en un solo cuerpo para que fluyan juntas si es posible, 
    // o tablas separadas con márgenes pequeños.
    const sectionsData = [
        ...emergencyRows,
        ...relativesRows,
        ...kidsRows,
        ...academicRows,
        ...expRows
    ];

    autoTable(doc, {
        startY: currentY,
        body: sectionsData,
        theme: 'grid',
        styles: { 
            fontSize: 7, 
            cellPadding: 1.5, 
            lineColor: COLORS.BORDER, 
            textColor: COLORS.TEXT, 
            lineWidth: 0.1,
            valign: 'middle'
        },
        margin: { top: 35, left: 14, right: 14 },
        didDrawPage: drawHeader // Repite cabecera si salta de página
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // =========================================================
    // TEXTO LEGAL Y FIRMA
    // =========================================================
    
    // Verificar espacio para legal
    if (currentY > 200) {
        doc.addPage();
        drawHeader({ doc }); // Dibujar header manualmente en nueva página forzada
        currentY = 40;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("DECLARACIONES Y CLÁUSULAS INTERNAS:", 14, currentY);
    currentY += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    
    const legalText = `1. Declaro bajo juramento que la información proporcionada en la presente ficha es veraz, conforme a lo establecido en el artículo IV inciso 1.7 del Título Preliminar, el artículo 47 inciso 47.1.3 y el artículo 44 del TUO de la Ley Nº 27444.

2. Autorizo su verificación, y acepto que, de encontrarse información falsa o adulterada acepto expresamente que la entidad proceda a mi retiro automático, sea del proceso de selección o de la entidad si se produjo vinculación, sin prejuicio de aplicarse las sanciones legales que correspondan.

CLAUSULAS INTERNAS:

Me comprometo a cumplir con mis funciones, las políticas, reglamentos internos y disposiciones de la empresa.
Declaro haber recibido la inducción en Seguridad y Salud en el Trabajo y me comprometo al uso adecuado de los equipos de protección personal (EPP) entregados.
Me obligo a mantener la confidencialidad de toda información a la que tenga acceso en el ejercicio de mis funciones.
Reconozco que debo comunicar de inmediato cualquier ausencia, accidente o novedad relacionada con mi trabajo.
En caso de recibir bienes, equipos o materiales de la empresa (incluidos EPP), me comprometo a su correcta utilización y devolución, autorizando expresamente el descuento de su valor en mis beneficios sociales en caso de pérdida o no devolución.
Autorizo el tratamiento de mis datos personales para fines administrativos y de control, conforme a la Ley Nº 29733.

“Con mi firma acepto las cláusulas contractuales y declaro bajo juramento que los datos antes mencionados son verdaderos”.`;

    const splitText = doc.splitTextToSize(legalText, 182);
    doc.text(splitText, 14, currentY);
    
    // Espacio para firma
    const pageHeight = doc.internal.pageSize.height;
    let signY = currentY + (splitText.length * 3) + 20;

    // Si la firma se cae de la página, añadir nueva
    if (signY > pageHeight - 30) {
        doc.addPage();
        drawHeader({ doc });
        signY = 50;
    } else if (signY < pageHeight - 50) {
        // Empujar firma al fondo si hay mucho espacio
        signY = pageHeight - 40;
    }

    // Fecha
    const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(9);
    doc.text(`Lima, ${today}`, 140, signY - 15, { align: 'center' });

    // Línea de firma
    doc.setLineWidth(0.5);
    doc.line(70, signY, 140, signY); 
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("Firma y Huella", 105, signY + 5, { align: "center" });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`DNI/CEX: ${p(profile.document_number)}`, 105, signY + 10, { align: "center" });

    // Descarga
    doc.save(`Ficha_Staff_${p(profile.document_number) || 'empleado'}.pdf`);

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};