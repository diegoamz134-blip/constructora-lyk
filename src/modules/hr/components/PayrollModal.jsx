import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileSpreadsheet, Download, Calendar, Loader2, AlertCircle } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const PayrollModal = ({ isOpen, onClose, payrollData, dateRange }) => {
  const [loading, setLoading] = useState(false);

  // --- LÓGICA DE EXPORTACIÓN CON ESTILOS ---
  const handleExport = async () => {
    if (!payrollData || payrollData.length === 0) {
      alert("No hay datos calculados para exportar. Por favor realiza el cálculo primero en la pantalla principal.");
      return;
    }

    setLoading(true);

    try {
      // 1. Crear Libro y Hoja
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Planilla Consolidada', {
        views: [{ showGridLines: false }] // Ocultar líneas de cuadrícula por defecto para un look más limpio
      });

      // 2. Definir Columnas y Anchos
      sheet.columns = [
        { header: 'ITEM', key: 'index', width: 6 },
        { header: 'DNI / CE', key: 'doc_number', width: 12 },
        { header: 'APELLIDOS Y NOMBRES', key: 'full_name', width: 35 },
        { header: 'CARGO', key: 'category', width: 15 },
        { header: 'DIAS', key: 'days', width: 8 },
        { header: 'BASICO', key: 'basic', width: 12 },
        { header: 'DOMINICAL', key: 'dominical', width: 12 },
        { header: 'B.U.C.', key: 'buc', width: 12 },
        { header: 'MOVILIDAD', key: 'mobility', width: 12 },
        { header: 'ASIG. ESC.', key: 'school', width: 12 },
        { header: 'TOTAL ING.', key: 'total_income', width: 14 },
        { header: 'AFP/ONP', key: 'pension_name', width: 15 },
        { header: 'DESC. PENS.', key: 'pension_amount', width: 12 },
        { header: 'CONAF.', key: 'conafovicer', width: 10 },
        { header: 'ADELANTOS', key: 'advances', width: 12 },
        { header: 'TOTAL DESC.', key: 'total_discounts', width: 14 },
        { header: 'NETO A PAGAR', key: 'net_pay', width: 16 },
        { header: 'ESSALUD (9%)', key: 'essalud', width: 14 },
      ];

      // 3. Título Corporativo (Filas 1 y 2)
      sheet.mergeCells('A1:R1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'CONSTRUCTORA E INVERSIONES L & K S.A.C.';
      titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '003366' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      sheet.mergeCells('A2:R2');
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = `PLANILLA DE PAGOS SEMANAL - DEL ${dateRange.start} AL ${dateRange.end}`;
      subtitleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '555555' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Espacio antes de la tabla
      sheet.addRow([]);

      // 4. Estilizar Encabezados de Tabla (Fila 4)
      const headerRow = sheet.getRow(4);
      headerRow.values = sheet.columns.map(col => col.header);
      headerRow.height = 25;
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '003366' } // Azul L&K
        };
        cell.font = {
          name: 'Arial',
          color: { argb: 'FFFFFF' }, // Texto Blanco
          bold: true,
          size: 10
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });

      // 5. Agregar Datos
      let totalIncome = 0;
      let totalNet = 0;
      let totalEssalud = 0;

      payrollData.forEach((item, index) => {
        const d = item.details || {};
        
        // Sumar para totales
        totalIncome += (item.totalIncome || 0);
        totalNet += (item.netPay || 0);
        totalEssalud += (d.essalud || 0);

        const row = sheet.addRow({
          index: index + 1,
          doc_number: item.person.document_number,
          full_name: item.person.full_name.toUpperCase(),
          category: item.person.category || 'Staff',
          days: item.daysWorked,
          basic: d.basicSalary,
          dominical: d.dominical,
          buc: d.buc,
          mobility: d.mobility,
          school: d.schoolAssign,
          total_income: item.totalIncome,
          pension_name: d.pensionName,
          pension_amount: d.pensionAmount,
          conafovicer: d.conafovicer,
          advances: item.totalAdvances,
          total_discounts: item.totalDiscounts,
          net_pay: item.netPay,
          essalud: d.essalud
        });

        // Estilos por Fila (Zebra Striping)
        const isEven = (index + 1) % 2 === 0;
        const rowFill = isEven ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F4F8FB' } } : null; // Celeste muy pálido

        row.eachCell((cell, colNumber) => {
          if (rowFill) cell.fill = rowFill;
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'E0E0E0' } },
            left: { style: 'thin', color: { argb: 'E0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
            right: { style: 'thin', color: { argb: 'E0E0E0' } }
          };
          
          cell.font = { name: 'Arial', size: 9 };

          // Formato Moneda (Columnas 6 en adelante, excepto la 12 que es texto AFP)
          if (colNumber >= 6 && colNumber !== 12) {
             cell.numFmt = '"S/." #,##0.00;[Red]-"S/." #,##0.00';
             cell.alignment = { horizontal: 'right' };
          } else if (colNumber === 5) { // Días
             cell.alignment = { horizontal: 'center' };
          }
          
          // Resaltar Neto (Columna 17)
          if (colNumber === 17) {
             cell.font = { bold: true, color: { argb: '006600' } }; // Verde
          }
        });
      });

      // 6. Fila de Totales
      const totalRow = sheet.addRow([
        '', '', 'TOTAL GENERAL', '', '', 
        '', '', '', '', '', 
        totalIncome, 
        '', '', '', '', '', 
        totalNet, 
        totalEssalud
      ]);

      totalRow.height = 20;
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, name: 'Arial', size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD700' } }; // Amarillo Totales
        cell.border = { top: { style: 'double' } };
        
        if (colNumber >= 11) {
            cell.numFmt = '"S/." #,##0.00';
            cell.alignment = { horizontal: 'right' };
        }
      });

      // 7. Descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Planilla_LK_${dateRange.start}_${dateRange.end}.xlsx`);

      onClose();

    } catch (error) {
      console.error("Error exportando Excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="bg-[#003366] p-6 text-white text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
                <X size={24}/>
            </button>
            <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <FileSpreadsheet size={32} />
            </div>
            <h2 className="text-xl font-bold">Exportar Planilla</h2>
            <p className="text-blue-100 text-sm mt-1">Generar reporte Excel detallado</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><Calendar size={16}/> Periodo:</span>
                    <span className="font-bold text-slate-700">{dateRange?.start} al {dateRange?.end}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium flex items-center gap-2"><FileSpreadsheet size={16}/> Registros:</span>
                    <span className="font-bold text-slate-700">{payrollData?.length || 0} Trabajadores</span>
                </div>
            </div>

            {(!payrollData || payrollData.length === 0) && (
                <div className="flex items-start gap-3 p-4 bg-orange-50 text-orange-700 rounded-xl text-sm border border-orange-100">
                    <AlertCircle className="shrink-0 mt-0.5" size={18}/>
                    <p>No se han encontrado datos calculados. Por favor, cierra esta ventana y presiona <b>"Calcular"</b> en la pantalla principal antes de exportar.</p>
                </div>
            )}

            <button 
                onClick={handleExport}
                disabled={loading || !payrollData || payrollData.length === 0}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                {loading ? 'Generando Excel...' : 'Descargar Archivo .xlsx'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PayrollModal;