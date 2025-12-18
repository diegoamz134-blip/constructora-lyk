import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Calculator, Calendar, 
  Printer, HardHat, UserCog, AlertCircle 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// --- IMPORTACIONES PDF ---
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 

// --- IMPORTACIÓN DEL LOGO ---
// Asegúrate de que esta ruta sea correcta en tu proyecto
import logoLyk from '../../assets/images/logo-lk-full.png';

const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [weekRange, setWeekRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);

  // --- 1. Cargar Personal ---
  useEffect(() => {
    fetchData();
    setCalculatedPayroll([]);
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const table = activeTab === 'workers' ? 'workers' : 'employees';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('status', 'Activo');
      
      if (error) throw error;
      setPeople(data || []);
    } catch (error) {
      console.error("Error cargando personal:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Lógica de Cálculo ---
  const calculatePayroll = async () => {
    setLoading(true);
    const results = [];

    const WORKER_RATES = {
      Operario: 86.80, Oficial: 68.10, Peon: 61.30,
      BUC_Operario: 0.32, BUC_Oficial: 0.30, BUC_Peon: 0.30,
      Movilidad: 8.00, CONAFOVICER: 0.02, ONP: 0.13
    };

    try {
      // 2.1 Asistencia
      let attendanceQuery = supabase.from('attendance')
        .select('status, date, worker_id, employee_id')
        .gte('date', weekRange.start)
        .lte('date', weekRange.end);
      
      if (activeTab === 'workers') attendanceQuery = attendanceQuery.not('worker_id', 'is', null);
      else attendanceQuery = attendanceQuery.not('employee_id', 'is', null);

      const { data: attData } = await attendanceQuery;

      // 2.2 Adelantos
      let advancesQuery = supabase.from('advances')
        .select('amount, worker_id, employee_id')
        .gte('date', weekRange.start)
        .lte('date', weekRange.end);

      const { data: advData } = await advancesQuery;

      // 2.3 Procesar
      for (const person of people) {
        const personId = person.id;
        
        const myAttendance = (attData || []).filter(a => 
          activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId
        );
        const myAdvances = (advData || []).filter(a => 
          activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId
        );

        const daysWorked = myAttendance.filter(a => a.status === 'Presente').length;
        const totalAdvances = myAdvances.reduce((sum, adv) => sum + (adv.amount || 0), 0);

        let payrollItem = {};

        if (activeTab === 'workers') {
          // --- OBREROS ---
          const cat = Object.keys(WORKER_RATES).find(k => k.toUpperCase() === person.category?.toUpperCase()) || 'Peon';
          const dailyRate = WORKER_RATES[cat];
          const bucRate = WORKER_RATES[`BUC_${cat}`] || 0.30;

          const basicSalary = daysWorked * dailyRate;
          const dominical = (daysWorked === 6) ? dailyRate : 0; 
          const buc = basicSalary * bucRate;
          const mobility = daysWorked * WORKER_RATES.Movilidad;
          
          const totalIncome = basicSalary + dominical + buc + mobility;
          const conafovicer = basicSalary * WORKER_RATES.CONAFOVICER;
          const onp = totalIncome * WORKER_RATES.ONP;
          
          const totalDiscounts = conafovicer + onp + totalAdvances;

          payrollItem = {
            person,
            type: 'worker',
            daysWorked,
            details: { basicSalary, dominical, buc, mobility, conafovicer, onp, essalud: totalIncome * 0.09 },
            totalIncome,
            totalDiscounts,
            totalAdvances,
            netPay: totalIncome - totalDiscounts
          };

        } else {
          // --- STAFF (Cálculo Mensual) ---
          const monthlySalary = parseFloat(person.salary) || 0;
          const dailyValue = monthlySalary / 30;
          const salaryEarned = dailyValue * (daysWorked > 0 ? 30 : 0); 
          
          const familyAllowance = person.children > 0 ? 102.50 : 0;
          const totalIncome = salaryEarned + familyAllowance;
          
          const pensionRate = person.pension_system === 'AFP' ? 0.128 : 0.13;
          const pensionSystem = totalIncome * pensionRate; 
          const essalud = totalIncome * 0.09; 
          
          const totalDiscounts = pensionSystem + totalAdvances;

          payrollItem = {
            person,
            type: 'staff',
            daysWorked: daysWorked > 0 ? 30 : 0, 
            details: { monthlySalary, salaryEarned, familyAllowance, pensionSystem, essalud },
            totalIncome,
            totalDiscounts,
            totalAdvances,
            netPay: totalIncome - totalDiscounts
          };
        }

        results.push(payrollItem);
      }

      setCalculatedPayroll(results);

    } catch (error) {
      console.error("Error:", error);
      alert("Error en el cálculo.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // GENERACIÓN DE BOLETA (CELESTE CLARO Y BLANCO + FIRMAS)
  // =========================================================================
  const printPayslip = (item) => {
    try {
      const doc = new jsPDF();
      const p = item.person;
      const isStaff = item.type === 'staff';

      // --- PALETA DE COLORES ---
      // Celeste Claro (RGB) para las cabeceras
      const headerColor = [220, 235, 255]; 
      const borderColor = [0, 0, 0];
      const lineWidth = 0.1;

      // --- LOGO ---
      try {
        doc.addImage(logoLyk, 'PNG', 14, 5, 40, 15); 
      } catch (imgErr) {
        console.warn("No se pudo cargar el logo");
      }

      // --- ENCABEZADO ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      
      doc.text(`RUC: 20482531301`, 14, 24);
      doc.text(`Empleador: CONSTRUCTORA E INVERSIONES L & K S.A.C.`, 14, 28);
      doc.text(`Periodo: ${weekRange.start.substring(0,7)}`, 14, 32);

      // Recuadro Trabajador (Derecha)
      doc.text("TRABAJADOR", 140, 24);
      doc.setFont("helvetica", "normal");
      doc.text(p.full_name.toUpperCase(), 140, 28);
      doc.text(`DNI: ${p.document_number}`, 140, 32);

      const startY = 38;
      
      // --- TABLA 1: DATOS GENERALES ---
      autoTable(doc, {
        startY: startY,
        head: [['Documento de Identidad', 'Nombre y Apellidos', 'Situación']],
        body: [[
          `Tipo: DNI\nNúmero: ${p.document_number}`,
          p.full_name.toUpperCase(),
          'ACTIVO O SUBSIDIADO'
        ]],
        theme: 'grid', 
        styles: { 
            fontSize: 7, 
            cellPadding: 2, 
            lineColor: borderColor, 
            lineWidth: lineWidth,
            textColor: [0, 0, 0]
        },
        headStyles: { 
            fillColor: headerColor, // Celeste
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            halign: 'center',
            valign: 'middle'
        },
        columnStyles: { 
            0: { cellWidth: 40 }, 
            1: { cellWidth: 100 }, 
            2: { cellWidth: 40 } 
        },
        margin: { left: 14 }
      });

      // --- TABLA 2: DATOS LABORALES ---
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1, 
        head: [['Fecha de Ingreso', 'Tipo de Trabajador', 'Régimen Pensionario', 'CUSPP']],
        body: [[
          p.entry_date || p.start_date || '-',
          isStaff ? 'EMPLEADO' : 'OBRERO',
          p.pension_system || 'S.N.P. (ONP)',
          p.cuspp || '-'
        ]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], halign: 'center' },
        headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold' },
        margin: { left: 14 }
      });

      // --- TABLA 3: ASISTENCIA ---
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1,
        head: [['Días Laborados', 'Días No Lab.', 'Días Sub.', 'Condición', 'Jornada Ordinaria', 'Sobretiempo']],
        body: [[
          `${item.daysWorked}`, '0', '0', 'Domiciliado', 'Total Horas: 240\nMinutos: 0', 'Total Horas: 0\nMinutos: 0'
        ]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], halign: 'center' },
        headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold' },
        margin: { left: 14 }
      });

      // --- TABLA 4: SUSPENSIÓN ---
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY - 0.1,
        head: [['Motivo de Suspensión de Labores', 'Otros empleadores por Rentas de 5ta']],
        body: [[ 'Tipo: -   Motivo: -   Nº Días: -', 'No tiene' ]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0], halign: 'center' },
        headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold' },
        margin: { left: 14 }
      });

      // --- CUERPO DE CONCEPTOS ---
      let rows = [];
      
      // Función para título de sección con fondo celeste
      const sectionTitle = (text) => ({ 
          content: text, 
          colSpan: 4, 
          styles: { fontStyle: 'bold', halign: 'left', fillColor: headerColor } 
      });

      if (isStaff) {
          rows = [
              [sectionTitle('Ingresos')],
              ['0121', 'REMUNERACIÓN O JORNAL BÁSICO', item.details.salaryEarned.toFixed(2), ''],
              ['0201', 'ASIGNACIÓN FAMILIAR', item.details.familyAllowance > 0 ? item.details.familyAllowance.toFixed(2) : '0.00', ''],
              [sectionTitle('Descuentos')],
              [{ content: 'Aportes del Trabajador', colSpan: 4, styles: { fontStyle: 'italic', halign: 'left', fillColor: [255,255,255] } }],
              [
                p.pension_system === 'ONP' ? '0608' : '0601', 
                p.pension_system === 'ONP' ? 'SISTEMA NACIONAL DE PENSIONES (ONP)' : 'COMISIÓN / APORTE AFP', 
                '', item.details.pensionSystem.toFixed(2)
              ],
              ['0605', 'RENTA QUINTA CATEGORÍA', '', '0.00'],
              ['0701', 'ADELANTOS DE SUELDO', '', item.totalAdvances.toFixed(2)],
          ];
      } else {
          rows = [
              [sectionTitle('Ingresos')],
              ['0121', 'JORNAL BÁSICO', item.details.basicSalary.toFixed(2), ''],
              ['0106', 'DOMINICAL', item.details.dominical.toFixed(2), ''],
              ['0304', 'BONIF. UNIFICADA CONSTRUCCION (BUC)', item.details.buc.toFixed(2), ''],
              ['0902', 'MOVILIDAD ACUMULADA', item.details.mobility.toFixed(2), ''],
              [sectionTitle('Descuentos')],
              ['0608', 'ONP / AFP', '', item.details.onp.toFixed(2)],
              ['0706', 'CONAFOVICER', '', item.details.conafovicer.toFixed(2)],
              ['0701', 'ADELANTOS', '', item.totalAdvances.toFixed(2)],
          ];
      }

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 5,
        head: [['Código', 'Conceptos', 'Ingresos S/.', 'Descuentos S/.']],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
        headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
        columnStyles: { 0: {halign: 'center'}, 2: {halign: 'right'}, 3: {halign: 'right'} },
        margin: { left: 14 }
      });

      const finalY = doc.lastAutoTable.finalY;

      // --- TOTALES ---
      autoTable(doc, {
        startY: finalY - 0.1,
        body: [[
          { content: 'Neto a Pagar:', styles: { fontStyle: 'bold', halign: 'right', fillColor: headerColor } },
          { content: item.netPay.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }
        ]],
        theme: 'grid',
        styles: { fontSize: 9, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
        columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 40 } },
        margin: { left: 14 }
      });

      // --- APORTES EMPLEADOR ---
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 2,
        head: [['Aportes de Empleador', 'Monto S/.']],
        body: [
          ['0804 ESSALUD (REGULAR CBSSP AGRAR/AC) TRAB', item.details.essalud.toFixed(2)]
        ],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2, lineColor: borderColor, lineWidth: lineWidth, textColor: [0,0,0] },
        headStyles: { fillColor: headerColor, textColor: [0,0,0], fontStyle: 'bold', halign: 'left' },
        columnStyles: { 1: {halign: 'right'} },
        margin: { left: 14, right: 120 } 
      });

      // --- SECCIÓN DE FIRMAS ---
      const pageHeight = doc.internal.pageSize.height;
      const signatureY = pageHeight - 40; 

      // Línea y Texto Empleador
      doc.line(30, signatureY, 90, signatureY); 
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("EMPLEADOR", 60, signatureY + 5, null, null, "center");

      // Línea y Texto Trabajador
      doc.line(120, signatureY, 180, signatureY); 
      doc.text("TRABAJADOR", 150, signatureY + 5, null, null, "center");
      doc.setFont("helvetica", "normal");
      doc.text(`DNI: ${p.document_number}`, 150, signatureY + 9, null, null, "center");

      // Guardar PDF
      doc.save(`Boleta_${p.document_number}_${weekRange.start}.pdf`);

    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("Error al generar el PDF. Revisa la consola.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Planillas y Pagos
          </h1>
          <p className="text-slate-500 text-sm">Emisión de boletas y cálculo de remuneraciones.</p>
        </div>
        
        <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <input 
            type="date" 
            value={weekRange.start}
            onChange={(e) => setWeekRange({...weekRange, start: e.target.value})}
            className="text-sm outline-none font-bold text-slate-600 px-2"
          />
          <span className="text-slate-400 self-center">-</span>
          <input 
            type="date" 
            value={weekRange.end}
            onChange={(e) => setWeekRange({...weekRange, end: e.target.value})}
            className="text-sm outline-none font-bold text-slate-600 px-2"
          />
          <button 
            onClick={calculatePayroll}
            className="bg-[#003366] text-white p-2 rounded-lg hover:bg-blue-900 transition flex items-center gap-2 shadow-sm"
          >
            <Calculator size={18} /> <span className="text-xs font-bold hidden md:inline">Calcular</span>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('workers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HardHat size={18} /> Obreros
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <UserCog size={18} /> Staff
        </button>
      </div>

      {/* Resultados */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {calculatedPayroll.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center">
            <div className={`p-4 rounded-full mb-4 ${activeTab === 'workers' ? 'bg-orange-50 text-orange-200' : 'bg-blue-50 text-blue-200'}`}>
              <Calculator size={48} />
            </div>
            <p className="font-medium text-lg text-slate-600">Listo para procesar planilla de {activeTab === 'workers' ? 'Obreros' : 'Staff'}</p>
            <p className="text-sm mt-2">Selecciona las fechas y presiona "Calcular".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Cargo</th>
                  <th className="px-6 py-4 text-center">Días Trab.</th>
                  <th className="px-6 py-4 text-right">Ingresos</th>
                  <th className="px-6 py-4 text-right text-red-500">Descuentos</th>
                  <th className="px-6 py-4 text-right font-black text-green-700">Neto</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {calculatedPayroll.map((item, idx) => (
                  <motion.tr 
                    key={idx} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{item.person.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.person.document_number}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {activeTab === 'workers' ? item.person.category : item.person.position}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                        {item.daysWorked}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">
                      S/. {item.totalIncome.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-red-500 font-medium">
                      - S/. {item.totalDiscounts.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg text-green-600">
                      S/. {item.netPay.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => printPayslip(item)}
                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-colors shadow-sm border border-blue-100"
                        title="Imprimir Boleta PDF"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;