import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Calculator, Calendar, 
  Printer, HardHat, UserCog, AlertCircle 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [weekRange, setWeekRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);

  // --- 1. Cargar Personal (Según Tab) ---
  useEffect(() => {
    fetchData();
    setCalculatedPayroll([]); // Limpiar tabla al cambiar tab
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

  // --- 2. Lógica de Cálculo (Diferenciada) ---
  const calculatePayroll = async () => {
    setLoading(true);
    const results = [];

    // Tasas Construcción Civil (Obreros)
    const WORKER_RATES = {
      Operario: 86.80, Oficial: 68.10, Peon: 61.30,
      BUC_Operario: 0.32, BUC_Oficial: 0.30, BUC_Peon: 0.30,
      Movilidad: 8.00, CONAFOVICER: 0.02, ONP: 0.13
    };

    try {
      // 2.1 Obtener asistencia del periodo
      let attendanceQuery = supabase.from('attendance')
        .select('status, date, worker_id, employee_id')
        .gte('date', weekRange.start)
        .lte('date', weekRange.end);
      
      if (activeTab === 'workers') attendanceQuery = attendanceQuery.not('worker_id', 'is', null);
      else attendanceQuery = attendanceQuery.not('employee_id', 'is', null);

      const { data: attData, error: attError } = await attendanceQuery;
      if (attError) throw attError;

      // 2.2 Obtener adelantos
      let advancesQuery = supabase.from('advances')
        .select('amount, worker_id, employee_id')
        .gte('date', weekRange.start)
        .lte('date', weekRange.end);

      const { data: advData } = await advancesQuery;

      // 2.3 Procesar Persona por Persona
      for (const person of people) {
        const personId = person.id;
        
        // Filtrar datos específicos de esta persona
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
          // --- CÁLCULO OBREROS (Régimen Construcción) ---
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
            details: {
              basicSalary, dominical, buc, mobility, 
              conafovicer, onp
            },
            totalIncome,
            totalDiscounts,
            totalAdvances,
            netPay: totalIncome - totalDiscounts
          };

        } else {
          // --- CÁLCULO STAFF (Régimen General / Mensual) ---
          const monthlySalary = parseFloat(person.salary) || 0;
          // Cálculo simple: Sueldo / 30 * días trabajados
          // (Se puede ajustar si pagan mes completo fijo)
          const dailyValue = monthlySalary / 30;
          const salaryEarned = dailyValue * daysWorked;
          
          // Asignación Familiar (Ejemplo: si tiene hijos, 102.50)
          const familyAllowance = person.children > 0 ? 102.50 : 0;
          
          const totalIncome = salaryEarned + familyAllowance;
          
          // Descuentos Ley (ONP/AFP aprox 13% para el ejemplo)
          const pensionSystem = totalIncome * 0.13; 
          
          const totalDiscounts = pensionSystem + totalAdvances;

          payrollItem = {
            person,
            type: 'staff',
            daysWorked,
            details: {
              monthlySalary, salaryEarned, familyAllowance, pensionSystem
            },
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
      console.error("Error calculando planilla:", error);
      alert("Error en el cálculo. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Generar Boleta PDF ---
  const printPayslip = (item) => {
    const doc = new jsPDF();
    const p = item.person;
    const isWorker = item.type === 'worker';

    // Encabezado
    doc.setFillColor(isWorker ? 255 : 240, isWorker ? 255 : 248, isWorker ? 255 : 255); // Fondo diferente para staff
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("CONSTRUCTORA L&K", 105, 20, null, null, "center");
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`BOLETA DE PAGO - ${isWorker ? 'RÉGIMEN CONSTRUCCIÓN' : 'PERSONAL ADMINISTRATIVO'}`, 105, 30, null, null, "center");

    // Datos Personales
    doc.setFontSize(10);
    doc.text(`Colaborador: ${p.full_name}`, 20, 50);
    doc.text(`DNI: ${p.document_number}`, 20, 56);
    doc.text(`Cargo: ${isWorker ? p.category : p.position}`, 20, 62);
    doc.text(`Periodo: ${weekRange.start} al ${weekRange.end}`, 120, 50);

    let bodyData = [];
    
    if (isWorker) {
      bodyData = [
        ['Jornal Básico', item.details.basicSalary.toFixed(2)],
        ['Dominical', item.details.dominical.toFixed(2)],
        ['BUC (Bonif. Unificada)', item.details.buc.toFixed(2)],
        ['Movilidad', item.details.mobility.toFixed(2)],
        [{ content: 'TOTAL INGRESOS', styles: { fontStyle: 'bold' } }, item.totalIncome.toFixed(2)],
        ['', ''], // Separador
        ['DESC. ONP/AFP', `-${item.details.onp.toFixed(2)}`],
        ['DESC. CONAFOVICER', `-${item.details.conafovicer.toFixed(2)}`],
      ];
    } else {
      bodyData = [
        ['Sueldo Básico (Proporcional)', item.details.salaryEarned.toFixed(2)],
        ['Asignación Familiar', item.details.familyAllowance.toFixed(2)],
        [{ content: 'TOTAL INGRESOS', styles: { fontStyle: 'bold' } }, item.totalIncome.toFixed(2)],
        ['', ''],
        ['DESC. SISTEMA PENSIÓN', `-${item.details.pensionSystem.toFixed(2)}`],
      ];
    }

    // Agregar adelantos (común para ambos)
    bodyData.push(['DESC. ADELANTOS', `-${item.totalAdvances.toFixed(2)}`]);
    bodyData.push([{ content: 'TOTAL DESCUENTOS', styles: { fontStyle: 'bold', textColor: [200, 50, 50] } }, `-${item.totalDiscounts.toFixed(2)}`]);

    doc.autoTable({
      startY: 70,
      head: [['Concepto', 'Monto (S/.)']],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: isWorker ? [255, 100, 0] : [0, 51, 102] } // Naranja obreros, Azul staff
    });

    // Neto
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`NETO A PAGAR: S/. ${item.netPay.toFixed(2)}`, 140, doc.lastAutoTable.finalY + 20);

    // Pie
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.line(30, 250, 90, 250); doc.text("Empresa", 50, 255);
    doc.line(120, 250, 180, 250); doc.text("Trabajador", 140, 255);

    doc.save(`Boleta_${p.document_number}.pdf`);
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Planillas y Pagos
          </h1>
          <p className="text-slate-500 text-sm">Cálculo de remuneraciones y emisión de boletas.</p>
        </div>
        
        {/* Selector de Rango */}
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

      {/* TABS DE SELECCIÓN (Igual que en RRHH y Tareo) */}
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

      {/* Tabla de Resultados */}
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
                  <th className="px-6 py-4">Cargo / Categoría</th>
                  <th className="px-6 py-4 text-center">Días Trab.</th>
                  <th className="px-6 py-4 text-right">Total Ingresos</th>
                  <th className="px-6 py-4 text-right text-red-500">Descuentos</th>
                  <th className="px-6 py-4 text-right font-black text-green-700">Neto a Pagar</th>
                  <th className="px-6 py-4 text-center">Boleta</th>
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
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${activeTab === 'workers' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                           {activeTab === 'workers' ? <HardHat size={16}/> : <UserCog size={16}/>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700">{item.person.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.person.document_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {activeTab === 'workers' ? item.person.category : item.person.position}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 border border-slate-200">
                        {item.daysWorked} días
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
                        title="Descargar Boleta PDF"
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