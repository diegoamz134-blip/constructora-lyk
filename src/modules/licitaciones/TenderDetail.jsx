import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { 
  ArrowLeft, Save, FileSpreadsheet, FileText, Plus, Trash2, 
  Loader2, Calculator, Briefcase, ChevronDown, Check, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoFull from '../../assets/images/logo-lk-full.png';

// Importamos el componente del Modal de Estado
import StatusModal from '../../components/common/StatusModal';

const TenderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  // Estado para el Porcentaje de Gastos Generales (Editable)
  const [ggPercentage, setGgPercentage] = useState(10); // Valor por defecto

  // Estados para el Dropdown personalizado
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Estado para el Modal de Notificación
  const [notification, setNotification] = useState({ 
    isOpen: false, 
    type: 'success', 
    title: '', 
    message: '' 
  });

  // Estado para Modal de Confirmación
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Función de redondeo financiero
  const round2 = (num) => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  // Cerrar dropdown si clicas fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const { data: tenderData } = await supabase.from('tenders').select('*').eq('id', id).single();
    const { data: itemsData } = await supabase.from('tender_items').select('*').eq('tender_id', id).order('item_code', { ascending: true });
    
    setTender(tenderData);
    setItems(itemsData || []);
    setLoading(false);
  };

  // --- CÁLCULOS FINANCIEROS EXACTOS Y DINÁMICOS ---
  const costoDirectoRaw = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const costoDirecto = round2(costoDirectoRaw);
  
  // Usamos el estado ggPercentage para el cálculo
  const gastosGenerales = round2(costoDirecto * (ggPercentage / 100));
  const utilidad = round2(costoDirecto * 0.055); // 5.50% fijo
  
  const subTotal = round2(costoDirecto + gastosGenerales + utilidad);
  const igv = round2(subTotal * 0.18);
  const totalPresupuesto = round2(subTotal + igv);

  // --- MANEJO DE ESTADO ---
  const statusOptions = ['Borrador', 'Presentado', 'Ganado', 'Perdido', 'Desierto'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ganado': return 'bg-green-100 text-green-700 border-green-200';
      case 'Perdido': return 'bg-red-50 text-red-600 border-red-100';
      case 'Presentado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Desierto': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase.from('tenders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      setTender(prev => ({ ...prev, status: newStatus }));
      setIsStatusOpen(false); 

      if (newStatus === 'Ganado') {
        setNotification({ isOpen: true, type: 'success', title: '¡Licitación Ganada!', message: 'Ahora tienes habilitada la opción para crear el Proyecto.' });
      }
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    }
  };

  // --- PREPARAR CONVERSIÓN ---
  const requestConversion = () => {
    setConfirmModal({
        isOpen: true,
        title: 'Crear Proyecto',
        message: `¿Estás seguro de crear el proyecto "${tender.name}" basado en esta licitación?`,
        onConfirm: executeConversion
    });
  };

  const executeConversion = async () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
    setConverting(true);
    
    try {
      const { error } = await supabase.from('projects').insert([{
        name: tender.name,
        location: tender.location,
        status: 'En Ejecución',
        start_date: new Date().toISOString().split('T')[0],
      }]);

      if (error) throw error;

      setNotification({
        isOpen: true,
        type: 'success',
        title: '¡Proyecto Creado!',
        message: 'La licitación ha sido derivada exitosamente al módulo de Proyectos.'
      });
      setTimeout(() => navigate('/proyectos'), 2500);

    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setConverting(false);
    }
  };

  // --- LÓGICA PRESUPUESTO ---
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { item_code: '', description: '', unit: '', quantity: 0, unit_price: 0 }]);

  const removeItem = async (index, itemId) => {
    if (itemId) await supabase.from('tender_items').delete().eq('id', itemId);
    setItems(items.filter((_, i) => i !== index));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await supabase.from('tenders').update({ budget_total: totalPresupuesto }).eq('id', id);
      setTender(prev => ({ ...prev, budget_total: totalPresupuesto }));

      const itemsToSave = items.map(item => ({
        ...item,
        tender_id: id,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0
      }));

      const { error } = await supabase.from('tender_items').upsert(itemsToSave);
      if (error) throw error;

      setNotification({ isOpen: true, type: 'success', title: '¡Guardado!', message: 'Presupuesto actualizado correctamente.' });
      fetchData(); 
    } catch (err) {
      setNotification({ isOpen: true, type: 'error', title: 'Error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // --- EXPORTAR EXCEL ---
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Presupuesto');

    const titleStyle = { font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } }, alignment: { horizontal: 'center', vertical: 'middle' } };
    const headerStyle = { font: { bold: true, color: { argb: 'FF003366' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEEEEE' } }, border: { bottom: { style: 'thick', color: { argb: 'FF003366' } } }, alignment: { horizontal: 'center' } };
    const currencyFmt = '"S/" #,##0.00'; 

    worksheet.mergeCells('A1:F2'); 
    worksheet.getCell('A1').value = `PRESUPUESTO: ${tender.name.toUpperCase()}`; 
    worksheet.getCell('A1').style = titleStyle;

    worksheet.getCell('A3').value = `CLIENTE: ${tender.client}`;
    worksheet.getCell('A4').value = `FECHA: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A5').value = `UBICACIÓN: ${tender.location}`;
    worksheet.addRow([]);

    worksheet.addRow(['ITEM', 'DESCRIPCIÓN', 'UND', 'METRADO', 'P. UNIT', 'PARCIAL']);
    const headerRow = worksheet.lastRow;
    headerRow.eachCell((cell) => cell.style = headerStyle);

    let currentRow = headerRow.number + 1;
    
    items.forEach((item) => {
      const row = worksheet.addRow([
        item.item_code,
        item.description,
        item.unit,
        parseFloat(item.quantity),
        parseFloat(item.unit_price),
        { formula: `D${currentRow}*E${currentRow}` } 
      ]);
      
      row.getCell(3).alignment = { horizontal: 'center' }; 
      row.getCell(4).alignment = { horizontal: 'center' }; 
      row.getCell(5).numFmt = currencyFmt; 
      row.getCell(6).numFmt = currencyFmt; 
      
      currentRow++;
    });

    worksheet.addRow([]);
    currentRow++;

    // Resumen Financiero Excel (Dinámico)
    const summaryStartRow = currentRow;
    const addSummaryRow = (label, formula, isTotal = false) => {
        const row = worksheet.addRow(['', '', '', '', label, { formula }]);
        const labelCell = row.getCell(5);
        const valueCell = row.getCell(6);
        
        labelCell.font = { bold: true };
        labelCell.alignment = { horizontal: 'right' };
        valueCell.numFmt = currencyFmt;

        if(isTotal) {
            labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
            labelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
            valueCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        }
    };

    const lastItemRow = currentRow - 2;
    addSummaryRow('COSTO DIRECTO', `SUM(F${headerRow.number + 1}:F${lastItemRow})`);
    
    // USAMOS EL % DEL ESTADO PARA LA FÓRMULA DE EXCEL
    const ggDecimal = ggPercentage / 100;
    addSummaryRow(`GASTOS GENERALES (${ggPercentage}%)`, `F${summaryStartRow}*${ggDecimal}`);
    
    addSummaryRow('UTILIDAD (5.50%)', `F${summaryStartRow}*0.055`);
    addSummaryRow('SUBTOTAL', `SUM(F${summaryStartRow}:F${summaryStartRow+2})`);
    addSummaryRow('IGV (18%)', `F${summaryStartRow+3}*0.18`);
    addSummaryRow('TOTAL PRESUPUESTO', `F${summaryStartRow+3}+F${summaryStartRow+4}`, true);
    
    worksheet.getColumn(1).width = 10; 
    worksheet.getColumn(2).width = 50; 
    worksheet.getColumn(3).width = 10; 
    worksheet.getColumn(4).width = 12; 
    worksheet.getColumn(5).width = 18; 
    worksheet.getColumn(6).width = 20; 

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Presupuesto_${tender.name}.xlsx`);
  };

  // --- EXPORTAR PDF (TABLA UNIFICADA + REDONDEO + CONSIDERACIONES) ---
  const exportPDF = () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = logoFull;
    img.onload = () => {
      // 1. Cabecera
      doc.addImage(img, 'PNG', 15, 10, 40, 15);
      doc.setFontSize(10); doc.setTextColor(0);
      doc.text("L&K CONSTRUCTORA E INVERSIONES", 200, 15, { align: "right" });
      doc.text("RUC: 20601234567", 200, 20, { align: "right" });
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("PROPUESTA ECONÓMICA", 105, 40, { align: "center" });
      doc.setLineWidth(0.5); doc.line(15, 42, 195, 42);
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      doc.text(`Señores: ${tender.client}`, 15, 55);
      doc.text(`Atención: Comité de Licitaciones`, 15, 60);
      doc.text(`Referencia: ${tender.name}`, 15, 70);
      doc.text(`De nuestra consideración:`, 15, 85);
      doc.text(`Por medio de la presente, hacemos llegar nuestra propuesta técnica y económica...`, 15, 92, { maxWidth: 180, align: "justify" });

      // 2. Tabla Maestra (Items + Resumen)
      const tableData = items.map(item => [
        item.item_code || '-', 
        item.description, 
        item.unit, 
        item.quantity, 
        item.unit_price.toLocaleString('es-PE', { minimumFractionDigits: 2 }), 
        round2(item.quantity * item.unit_price).toLocaleString('es-PE', { minimumFractionDigits: 2 })
      ]);
      
      // Filas de Resumen (Append al final de la misma tabla)
      tableData.push(
        [{ content: 'COSTO DIRECTO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: costoDirecto.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }],
        // USAMOS EL % DE GASTOS GENERALES DINÁMICO AQUÍ
        [{ content: `GASTOS GENERALES (${ggPercentage}%)`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: gastosGenerales.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }],
        [{ content: 'UTILIDAD (5.50%)', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: utilidad.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }],
        [{ content: 'SUBTOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: subTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }],
        [{ content: 'IGV (18%)', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: igv.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', halign: 'right' } }],
        [{ content: 'TOTAL PRESUPUESTO', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [0, 51, 102], textColor: 255 } }, { content: totalPresupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [0, 51, 102], textColor: 255, halign: 'right' } }]
      );

      autoTable(doc, {
        startY: 105,
        head: [['ITEM', 'DESCRIPCIÓN', 'UND', 'METRADO', 'P. UNIT', 'PARCIAL']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle', lineColor: [100, 100, 100], lineWidth: 0.1 },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 12, halign: 'center' }, 3: { cellWidth: 18, halign: 'right' }, 4: { cellWidth: 25, halign: 'right' }, 5: { cellWidth: 25, halign: 'right' } },
        didParseCell: function (data) { 
            // Quitar bordes a celdas vacías del resumen
            if (data.row.index >= items.length) { 
                if (data.column.index < 4) { 
                    data.cell.styles.lineColor = [255, 255, 255]; 
                    data.cell.styles.fillColor = [255, 255, 255]; 
                } 
            } 
        }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      if (finalY > 200) { doc.addPage(); finalY = 20; }
      
      // 3. Consideraciones
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 51, 102); doc.text("Consideraciones", 15, finalY); doc.setTextColor(0); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      const consideraciones = ["1. El presupuesto está realizado en base a las indicaciones y alcances del Cliente.", "2. El presupuesto se fundamenta en los nuevos planos...", "3. Los trabajos se ejecutarán cuando se tenga la confirmación...", "4. El presupuesto por los adicionales...", "5. En el caso de partidas que se encuentren en el presupuesto..."];
      finalY += 5;
      consideraciones.forEach(line => { doc.text(doc.splitTextToSize(line, 180), 15, finalY); finalY += 4; });
      
      finalY += 4;
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0, 51, 102); doc.text("Consideraciones Específicas", 15, finalY); doc.setTextColor(0); doc.setFontSize(8); doc.setFont("helvetica", "normal");
      const especificas = ["1. El plazo de entrega...", "2. La forma de pago...", "3. El cliente proporcionará...", "4. El cliente suministrará...", "5. No se considera suministro...", "6. No se considera suministro...", "7. El equipamiento..."];
      finalY += 5;
      especificas.forEach(line => { const splitText = doc.splitTextToSize(line, 180); doc.text(splitText, 15, finalY); finalY += (splitText.length * 4); });
      
      // 4. Firma
      doc.setFontSize(11); if (finalY > 240) { doc.addPage(); finalY = 20; } else { finalY += 15; }
      doc.text("Atentamente,", 15, finalY); doc.setFont("helvetica", "bold"); doc.text("GERENCIA GENERAL", 15, finalY + 10); doc.text("L&K CONSTRUCTORA", 15, finalY + 15); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Resp. L&K: Lenin Zegarra /MAIL: Lenin.zegarra@lyk.pe / 955735307", 15, finalY + 22);
      
      doc.save(`Propuesta_${tender.name}.pdf`);
    };
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <button onClick={() => navigate('/licitaciones')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold mb-1 transition-colors"><ArrowLeft size={16}/> Volver</button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{tender.name}</h1>
            
            {/* DROPDOWN ESTADO */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all active:scale-95 ${getStatusColor(tender.status)}`}
              >
                {tender.status}
                <motion.div animate={{ rotate: isStatusOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>

              <AnimatePresence>
                {isStatusOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20"
                  >
                    {statusOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleStatusChange(option)}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 flex items-center justify-between group ${tender.status === option ? 'text-[#003366] bg-blue-50' : 'text-slate-600'}`}
                      >
                        {option}
                        {tender.status === option && <Check size={14} className="text-[#003366]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-slate-500 text-sm">{tender.client} • {tender.location}</p>
        </div>

        <div className="flex gap-2">
          {/* BOTÓN CONVERTIR (MODAL) */}
          {tender.status === 'Ganado' && (
            <button 
                onClick={requestConversion}
                disabled={converting}
                className="flex flex-col items-center justify-center h-14 px-4 bg-[#003366] text-white rounded-xl hover:bg-blue-900 transition border border-transparent shadow-md active:scale-95 animate-pulse"
            >
                {converting ? <Loader2 size={20} className="animate-spin"/> : <Briefcase size={20} />}
                <span className="text-[10px] font-bold mt-1">Crear Proyecto</span>
            </button>
          )}

          <button onClick={exportExcel} className="flex flex-col items-center justify-center w-16 h-14 bg-[#1D6F42] text-white rounded-xl hover:bg-[#155734] transition border border-transparent shadow-sm active:scale-95">
            <FileSpreadsheet size={20} />
            <span className="text-[10px] font-bold mt-1">Excel</span>
          </button>
          <button onClick={exportPDF} className="flex flex-col items-center justify-center w-16 h-14 bg-red-600 text-white rounded-xl hover:bg-red-700 transition border border-transparent shadow-sm active:scale-95">
            <FileText size={20} />
            <span className="text-[10px] font-bold mt-1">PDF</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-2"><Calculator size={18}/> Detalle del Presupuesto</h3>
          <button onClick={saveChanges} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-lg text-sm font-bold hover:bg-blue-900 transition disabled:opacity-70">
            {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar Cambios
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3 w-20">Item</th>
                <th className="p-3">Descripción</th>
                <th className="p-3 w-20">Und</th>
                <th className="p-3 w-24 text-right">Metrado</th>
                <th className="p-3 w-32 text-right">P. Unit (S/)</th>
                <th className="p-3 w-32 text-right">Parcial (S/)</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map((item, index) => (
                <tr key={index} className="group hover:bg-slate-50/50">
                  <td className="p-2"><input value={item.item_code} onChange={(e) => handleItemChange(index, 'item_code', e.target.value)} className="w-full bg-transparent outline-none font-mono text-xs" placeholder="01.01"/></td>
                  <td className="p-2"><input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full bg-transparent outline-none" placeholder="Descripción..."/></td>
                  <td className="p-2"><input value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full bg-transparent outline-none text-center" placeholder="m3"/></td>
                  <td className="p-2"><input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-slate-50/50 rounded px-2 py-1 outline-none text-right focus:bg-white border border-transparent focus:border-blue-200"/></td>
                  <td className="p-2"><input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full bg-slate-50/50 rounded px-2 py-1 outline-none text-right focus:bg-white border border-transparent focus:border-blue-200"/></td>
                  
                  {/* CÁLCULO PARCIAL CON REDONDEO VISUAL */}
                  <td className="p-2 text-right font-bold text-slate-700">
                    {round2(item.quantity * item.unit_price).toFixed(2)}
                  </td>
                  
                  <td className="p-2 text-center">
                    <button onClick={() => removeItem(index, item.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <button onClick={addItem} className="w-full py-3 text-slate-500 font-bold text-xs hover:bg-slate-50 transition border-t border-slate-100 flex items-center justify-center gap-2">
          <Plus size={16}/> Agregar Partida
        </button>

        {/* Resumen Pantalla con INPUT para % Gastos Generales */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col items-end">
          <div className="w-full max-w-sm space-y-2 text-sm text-slate-600">
            <div className="flex justify-between"><span>Costo Directo</span><span className="font-medium">S/ {costoDirecto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div>
            
            {/* LÍNEA DE GASTOS GENERALES EDITABLE */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <span>Gastos Generales</span>
                    <div className="relative">
                        <input 
                            type="number" 
                            value={ggPercentage} 
                            onChange={(e) => setGgPercentage(parseFloat(e.target.value) || 0)}
                            className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-bold focus:border-blue-500 outline-none"
                        />
                        <span className="text-xs ml-1">%</span>
                    </div>
                </div>
                <span className="font-medium">S/ {gastosGenerales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex justify-between"><span>Utilidad (5.50%)</span><span className="font-medium">S/ {utilidad.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-800"><span>Subtotal</span><span>S/ {subTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span>IGV (18%)</span><span>S/ {igv.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between pt-2 mt-2 bg-[#003366] text-white p-3 rounded-lg font-bold text-lg"><span>TOTAL PRESUPUESTO</span><span>S/ {totalPresupuesto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>
      </div>

      {/* MODAL NOTIFICACIÓN */}
      <StatusModal 
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />

      {/* MODAL CONFIRMACIÓN */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}/>
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-center p-8">
              <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
                <HelpCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 py-3 text-slate-600 font-bold text-sm bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 py-3 bg-[#003366] text-white font-bold text-sm rounded-xl hover:bg-blue-900 shadow-lg transition-transform active:scale-95">Confirmar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TenderDetail;