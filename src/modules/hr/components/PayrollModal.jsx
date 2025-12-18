import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Constantes de Construcción Civil (Valores aproximados según tus archivos)
const CONSTANTS = {
  OPERARIO: { jornal: 86.80, buc: 0.32 },
  OFICIAL: { jornal: 68.10, buc: 0.30 },
  PEON: { jornal: 61.30, buc: 0.30 },
  MOVILIDAD_DIARIA: 8.60, // Según archivo parametros
  DESCUENTO_ONP: 0.13,
  DESCUENTO_CONAFOVICER: 0.02,
};

const PayrollModal = ({ isOpen, onClose, workers = [] }) => {
  const [weekInfo, setWeekInfo] = useState({
    weekNumber: '',
    startDate: '',
    endDate: '',
    projectName: 'UTP AREQUIPA' // Valor por defecto
  });

  const [payrollData, setPayrollData] = useState([]);

  // Inicializar datos cuando se abre el modal o cambian los workers
  useEffect(() => {
    if (isOpen && workers.length > 0) {
      const initialData = workers.map(worker => ({
        id: worker.id,
        item: '', // Se llenará al exportar
        name: `${worker.lastname || ''} ${worker.name || ''}`.trim(),
        category: worker.position || 'Peón', // Default
        dni: worker.dni || '',
        startDate: worker.startDate || '', // Fecha ingreso
        children: worker.children || 0,
        pensionSystem: worker.pensionSystem || 'SNP',
        cuspp: worker.cuspp || '',
        
        // Variables editables por semana
        daysWorked: 6, // Default 6 días
        sundayVal: 1, // 1 si corresponde dominical
        hours60: 0,
        hours100: 0,
        restDayHours: 0, // Trabajo en día de descanso
        holidayHours: 0, // Trabajo en feriado
        loans: 0, // Préstamos
      }));
      setPayrollData(initialData);
    }
  }, [isOpen, workers]);

  const handleInputChange = (id, field, value) => {
    setPayrollData(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const calculateRow = (row) => {
    // Determinar categoría y constantes
    let cat = row.category.toUpperCase();
    if (!CONSTANTS[cat]) cat = 'PEON'; // Fallback
    const { jornal, buc: bucRate } = CONSTANTS[cat];

    // Cálculos Ingresos
    const basico = row.daysWorked * jornal;
    const dominical = row.sundayVal * jornal;
    const buc = basico * bucRate;
    const movilidad = row.daysWorked * CONSTANTS.MOVILIDAD_DIARIA; // Movilidad acumulada
    
    // Horas Extras (Cálculo simplificado estándar CC)
    const valorHora = jornal / 8;
    const montoH60 = row.hours60 * (valorHora * 1.60);
    const montoH100 = row.hours100 * (valorHora * 2.00);
    
    const totalSemanal = basico + dominical + buc + movilidad + montoH60 + montoH100;

    // Descuentos
    // ONP vs AFP (Lógica simplificada, asumiendo ONP por defecto o AFP si se especifica)
    let descuentoPension = 0;
    if (row.pensionSystem.includes('SNP') || row.pensionSystem.includes('ONP')) {
      descuentoPension = (basico + dominical + montoH60 + montoH100) * CONSTANTS.DESCUENTO_ONP;
    } else {
      // Si es AFP, aprox 13% para el ejemplo (ajustar según tabla real AFP)
      descuentoPension = (basico + dominical + montoH60 + montoH100) * 0.13; 
    }
    
    const conafovicer = (basico + dominical) * CONSTANTS.DESCUENTO_CONAFOVICER;
    const totalDescuentos = descuentoPension + conafovicer + Number(row.loans);

    const neto = totalSemanal - totalDescuentos;

    return {
      ...row,
      jornal,
      basico,
      dominical,
      buc,
      movilidad,
      montoH60,
      montoH100,
      totalSemanal,
      descuentoPension,
      conafovicer,
      totalDescuentos,
      neto
    };
  };

  const exportToExcel = () => {
    // Preparar datos calculados
    const calculatedData = payrollData.map((row, index) => {
      const calc = calculateRow(row);
      return [
        index + 1, // Item
        calc.name,
        calc.category,
        calc.dni,
        calc.startDate,
        calc.children,
        calc.pensionSystem,
        calc.cuspp,
        calc.daysWorked,
        calc.sundayVal > 0 ? 'SI' : 'NO',
        calc.hours60,
        calc.hours100,
        calc.restDayHours,
        calc.holidayHours,
        calc.jornal.toFixed(2),
        calc.basico.toFixed(2),
        calc.buc.toFixed(2),
        calc.movilidad.toFixed(2),
        calc.dominical.toFixed(2),
        calc.totalSemanal.toFixed(2),
        calc.descuentoPension.toFixed(2),
        calc.conafovicer.toFixed(2),
        calc.loans,
        calc.neto.toFixed(2)
      ];
    });

    // Encabezados
    const header = [
      ["CONSTRUCTORA E INVERSIONES L&K SAC."],
      ["RUC: 20482531301"],
      [`OBRA: ${weekInfo.projectName}`],
      ["PLANILLA DE JORNALES DE CONSTRUCCION CIVIL - AÑO 2025"],
      [],
      ["SEMANA:", weekInfo.weekNumber || "___", "DEL:", weekInfo.startDate, "AL:", weekInfo.endDate],
      []
    ];

    const tableHeader = [
      "Item", "Apellidos y Nombres", "Categoría", "DNI", "F. Ingreso", "N° Hijos",
      "Sis. Pensión", "CUSPP", "Días Trab", "Dom", "Hrs 60%", "Hrs 100%", 
      "H. Descanso", "H. Feriado", "Jornal Diario", "Jornal Básico", 
      "B.U.C", "Movilidad", "Dominical", "Total Semanal", 
      "Desc. Pensión", "Conafovicer", "Préstamos", "NETO A PAGAR"
    ];

    const finalData = [...header, tableHeader, ...calculatedData];

    // Crear Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // Estilos de ancho de columna (visualización)
    ws['!cols'] = [
      { wch: 5 }, { wch: 35 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 5 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 5 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Planilla");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    saveAs(blob, `Planilla_Semana_${weekInfo.weekNumber || 'Nueva'}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl h-[90vh] flex flex-col shadow-xl">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Generar Planilla Semanal (Excel)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
        </div>

        {/* Formulario de Semana */}
        <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-4 border-b">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase">Semana N°</label>
            <input type="number" className="w-full border rounded p-1" value={weekInfo.weekNumber} onChange={e => setWeekInfo({...weekInfo, weekNumber: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase">Desde</label>
            <input type="date" className="w-full border rounded p-1" value={weekInfo.startDate} onChange={e => setWeekInfo({...weekInfo, startDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase">Hasta</label>
            <input type="date" className="w-full border rounded p-1" value={weekInfo.endDate} onChange={e => setWeekInfo({...weekInfo, endDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase">Proyecto</label>
            <input type="text" className="w-full border rounded p-1" value={weekInfo.projectName} onChange={e => setWeekInfo({...weekInfo, projectName: e.target.value})} />
          </div>
        </div>

        {/* Tabla Editable */}
        <div className="flex-1 overflow-auto p-4">
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-gray-800 text-white sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Trabajador</th>
                <th className="p-2 text-left">Categoría</th>
                <th className="p-2 text-center bg-blue-700">Días Trab.</th>
                <th className="p-2 text-center bg-blue-700">Dom (1/0)</th>
                <th className="p-2 text-center bg-green-700">Hrs 60%</th>
                <th className="p-2 text-center bg-green-700">Hrs 100%</th>
                <th className="p-2 text-center bg-orange-700">H. Desc</th>
                <th className="p-2 text-center bg-orange-700">H. Fer</th>
                <th className="p-2 text-center bg-red-700">Préstamos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payrollData.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50">
                  <td className="p-2 font-medium">{row.name}</td>
                  <td className="p-2 text-gray-500">{row.category}</td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.daysWorked} onChange={(e) => handleInputChange(row.id, 'daysWorked', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.sundayVal} onChange={(e) => handleInputChange(row.id, 'sundayVal', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.hours60} onChange={(e) => handleInputChange(row.id, 'hours60', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.hours100} onChange={(e) => handleInputChange(row.id, 'hours100', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.restDayHours} onChange={(e) => handleInputChange(row.id, 'restDayHours', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded" value={row.holidayHours} onChange={(e) => handleInputChange(row.id, 'holidayHours', Number(e.target.value))} /></td>
                  <td className="p-1"><input type="number" className="w-full text-center border p-1 rounded text-red-600" value={row.loans} onChange={(e) => handleInputChange(row.id, 'loans', Number(e.target.value))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancelar</button>
          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
            <span>Descargar Excel</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayrollModal;