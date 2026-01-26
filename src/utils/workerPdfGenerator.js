import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función auxiliar para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return '---';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
};

export const generateWorkerPDF = async (worker) => {
  const doc = new jsPDF();
  
  // --- CONFIGURACIÓN DE COLORES Y FUENTES ---
  const PRIMARY_COLOR = [0, 51, 102]; // Azul #003366
  
  // --- ENCABEZADO ---
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.setFont("helvetica", "bold");
  doc.text("CONSTRUCTORA L&K", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("RUC: 20601469561", 14, 26);
  doc.text("Av. La Marina N° 123, Ica", 14, 31);

  // Título del Documento
  doc.setFillColor(...PRIMARY_COLOR);
  doc.rect(120, 10, 75, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FICHA PERSONAL", 157, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text("OBRERO DE CONSTRUCCIÓN", 157, 26, { align: 'center' });

  let currentY = 45;

  // --- 1. DATOS PERSONALES ---
  // Título de sección
  autoTable(doc, {
    startY: currentY,
    head: [['DATOS PERSONALES']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 11, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2 },
    margin: { left: 14, right: 14 }
  });

  const details = worker.details || {};
  const address = details.address || {};
  const fullName = `${worker.first_name || worker.nombres || ''} ${worker.last_name || worker.apellidos || worker.full_name || ''}`.trim().toUpperCase();

  // Contenido Datos Personales
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY, // Usamos la posición final de la tabla anterior
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35, textColor: PRIMARY_COLOR },
      1: { width: 60 },
      2: { fontStyle: 'bold', width: 30, textColor: PRIMARY_COLOR },
      3: { width: 55 }
    },
    body: [
      ['Nombres y Apellidos:', fullName, 'DNI / CEX:', worker.document_number || '---'],
      ['Fecha Nacimiento:', formatDate(worker.birth_date), 'Nacionalidad:', details.nationality || 'Peruana'],
      ['Sexo:', details.gender || '---', 'Estado Civil:', details.marital_status || '---'],
      ['Dirección:', address.street || '---', 'Distrito:', address.district || '---'],
      ['Provincia/Depto:', `${address.province || ''} - ${address.department || ''}`, 'Celular:', worker.phone || '---'],
      ['Correo:', worker.email || '---', '', '']
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // --- 2. DATOS LABORALES ---
  autoTable(doc, {
    startY: currentY,
    head: [['INFORMACIÓN LABORAL Y EPP']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 11, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  const sizes = details.sizes || {};

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35, textColor: PRIMARY_COLOR },
      1: { width: 60 },
      2: { fontStyle: 'bold', width: 30, textColor: PRIMARY_COLOR },
      3: { width: 55 }
    },
    body: [
      ['Cargo:', (worker.category || 'Obrero').toUpperCase(), 'Proyecto:', (worker.project_assigned || 'Sin Asignar').toUpperCase()],
      ['Régimen:', worker.pension_system || '---', 'CUSPP (AFP):', details.cuspp || '---'],
      ['Talla Camisa:', sizes.shirt || '---', 'Talla Pantalón:', sizes.pant || '---'],
      ['Talla Calzado:', sizes.shoe || '---', 'Banco:', worker.bank_name || '---'],
      ['N° Cuenta:', worker.bank_account || '---', 'CCI:', worker.cci || '---']
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // --- 3. EMERGENCIA Y FAMILIA ---
  autoTable(doc, {
    startY: currentY,
    head: [['FAMILIA Y EMERGENCIA']],
    theme: 'grid',
    headStyles: { fillColor: PRIMARY_COLOR, fontSize: 11, fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  const emergency = (details.emergency_contacts && details.emergency_contacts[0]) ? details.emergency_contacts[0] : {};
  
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', width: 35, textColor: PRIMARY_COLOR },
      1: { width: 145 }
    },
    body: [
      ['Contacto Emergencia:', `${emergency.name || '---'} (${emergency.relationship || ''})`],
      ['Celular Emergencia:', emergency.phone_cell || '---'],
      ['Nivel Educativo:', `${(details.education?.level || '').toUpperCase()} - ${details.education?.status || ''}`],
      ['Institución:', details.education?.institution || '---']
    ],
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 15;

  // --- SECCIÓN DE DECLARACIÓN Y FIRMA ---
  if (currentY + 60 > 280) {
      doc.addPage();
      currentY = 20;
  }

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(
    "Declaro bajo juramento que los datos consignados en la presente ficha son verdaderos y autorizo a la empresa a verificarlos.",
    14, currentY
  );
  
  doc.text(
    "Asimismo, declaro haber recibido la inducción de seguridad y me comprometo a cumplir con las normas de SST.",
    14, currentY + 4
  );

  // Cuadros de Firma
  const firmaY = currentY + 40;
  
  // Línea Firma Trabajador
  doc.setDrawColor(0);
  doc.line(20, firmaY, 80, firmaY); 
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("Firma del Trabajador", 50, firmaY + 5, { align: 'center' });
  doc.text(`DNI: ${worker.document_number}`, 50, firmaY + 10, { align: 'center' });

  // Cuadro Huella
  doc.rect(140, firmaY - 30, 25, 30);
  doc.text("Huella Digital", 152.5, firmaY + 5, { align: 'center' });

  // Fecha de Impresión
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Generado el: ${format(new Date(), "dd 'de' MMMM yyyy HH:mm", { locale: es })}`, 14, 285);

  // Guardar PDF
  doc.save(`Ficha_Personal_${worker.document_number}.pdf`);
};