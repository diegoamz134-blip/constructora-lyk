import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Calculator, Printer, HardHat, UserCog, 
  AlertCircle, FileSpreadsheet, FileDown, Calendar, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// Importamos las funciones de PDF
import { generatePayslip, generateBulkPayslips } from '../../utils/pdfGenerator';

// Importamos el Modal de Excel
import PayrollModal from './components/PayrollModal';

// Importamos Logo
import logoLyk from '../../assets/images/logo-lk-full.png';

const PayrollPage = () => {
  const [activeTab, setActiveTab] = useState('workers'); 
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]); 
  
  // Datos Globales
  const [constants, setConstants] = useState({});
  const [afpRates, setAfpRates] = useState([]);

  // Rango de Fechas
  const [weekRange, setWeekRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Resultados
  const [calculatedPayroll, setCalculatedPayroll] = useState([]);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Cargar Datos Maestros
  useEffect(() => {
    fetchGlobals();
  }, []);

  // 2. Cargar Personas
  useEffect(() => {
    fetchPeople();
    setCalculatedPayroll([]);
    setCurrentPage(1); // Resetear página al cambiar tab
  }, [activeTab]);

  // --- LÓGICA DE PAGINACIÓN ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = calculatedPayroll.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(calculatedPayroll.length / itemsPerPage);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- FUNCIONES DE CARGA ---
  const fetchGlobals = async () => {
    try {
        const { data: constData } = await supabase.from('payroll_constants').select('*');
        const { data: afpData } = await supabase.from('afp_rates').select('*');
        const constMap = (constData || []).reduce((acc, item) => ({...acc, [item.key_name]: Number(item.value)}), {});
        setConstants(constMap);
        setAfpRates(afpData || []);
    } catch (e) { console.error("Error config:", e); }
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
        const table = activeTab === 'workers' ? 'workers' : 'employees';
        const { data } = await supabase.from(table).select('*').eq('status', 'Activo');
        setPeople(data || []);
    } catch (error) { console.error("Error personal:", error); } 
    finally { setLoading(false); }
  };

  // --- CÁLCULO DE PLANILLA ---
  const calculatePayroll = async () => {
    setLoading(true);
    setCurrentPage(1); // Resetear a página 1 al calcular nuevo
    
    try {
        let currentConstants = constants;
        let currentAfps = afpRates;

        // Recargar si faltan datos
        if (!currentConstants.JORNAL_OPERARIO || currentAfps.length === 0) {
            const { data: cData } = await supabase.from('payroll_constants').select('*');
            const { data: aData } = await supabase.from('afp_rates').select('*');
            currentConstants = (cData || []).reduce((acc, item) => ({...acc, [item.key_name]: Number(item.value)}), {});
            currentAfps = aData || [];
            setConstants(currentConstants);
            setAfpRates(currentAfps);
        }

        const table = activeTab === 'workers' ? 'workers' : 'employees';
        const { data: freshPeople } = await supabase.from(table).select('*').eq('status', 'Activo');
        setPeople(freshPeople || []);

        const { data: attData } = await supabase.from('attendance').select('*').gte('date', weekRange.start).lte('date', weekRange.end);
        const { data: advData } = await supabase.from('advances').select('*').gte('date', weekRange.start).lte('date', weekRange.end);

        const results = (freshPeople || []).map(person => {
            try {
                const personId = person.id;
                const myAtt = (attData || []).filter(a => activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId);
                const myAdv = (advData || []).filter(a => activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId);
                
                const daysWorked = myAtt.filter(a => a.status === 'Presente').length;
                const totalAdvances = myAdv.reduce((sum, a) => sum + (Number(a.amount)||0), 0);

                let calc = {};

                if (activeTab === 'workers') {
                    const catUpper = (person.category || 'PEON').toUpperCase(); 
                    let dailyRate = Number(currentConstants[`JORNAL_${catUpper}`]) || 0;
                    if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) dailyRate = Number(person.custom_daily_rate);

                    const basicSalary = daysWorked * dailyRate;
                    const dominical = (daysWorked === 6) ? dailyRate : 0; 
                    const buc = basicSalary * (Number(currentConstants[`BUC_${catUpper}`]) || 0);
                    const mobility = daysWorked * (Number(currentConstants['MOVILIDAD']) || 0);
                    const schoolAssign = person.has_children ? (daysWorked * (Number(currentConstants['ASIG_ESCOLAR_DIARIO']) || 0)) : 0;
                    const totalIncome = basicSalary + dominical + buc + mobility + schoolAssign;

                    let pensionAmount = 0;
                    let pensionName = person.pension_system || 'ONP';

                    if (pensionName === 'ONP') {
                        pensionAmount = totalIncome * (Number(currentConstants['ONP_TASA']) || 0.13);
                    } else {
                        const myAfp = currentAfps.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
                        if (myAfp) {
                            const commission = person.commission_type === 'Mixta' ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
                            const totalRate = Number(myAfp.aporte_obligatorio) + Number(myAfp.prima_seguro) + commission;
                            pensionAmount = totalIncome * totalRate;
                            pensionName = `AFP ${myAfp.name} (${person.commission_type || 'Flujo'})`;
                        } else {
                            pensionAmount = totalIncome * 0.13; 
                            pensionName += ' (Ref. 13%)';
                        }
                    }

                    const conafovicer = basicSalary * (Number(currentConstants['CONAFOVICER']) || 0.02);
                    const totalDiscounts = pensionAmount + conafovicer + totalAdvances;
                    const essalud = totalIncome * (Number(currentConstants['ESSALUD']) || 0.09);

                    calc = {
                        person, type: 'worker', daysWorked,
                        details: { basicSalary, dominical, buc, mobility, schoolAssign, pensionAmount, conafovicer, essalud, pensionName },
                        totalIncome, totalDiscounts, totalAdvances, netPay: totalIncome - totalDiscounts
                    };
                } else {
                    const monthlySalary = Number(person.salary) || 0;
                    const earned = (monthlySalary / 30) * (daysWorked > 0 ? 30 : 0);
                    const pensionDesc = earned * 0.13;
                    calc = {
                        person, type: 'staff', daysWorked,
                        details: { basicSalary: earned, pensionAmount: pensionDesc, pensionName: 'ONP', essalud: earned * 0.09 },
                        totalIncome: earned, totalDiscounts: pensionDesc + totalAdvances, totalAdvances,
                        netPay: earned - pensionDesc - totalAdvances
                    };
                }
                return calc;
            } catch (e) { return null; }
        });

        setCalculatedPayroll(results.filter(r => r !== null));
    } catch (err) {
        console.error(err);
        alert("Error al calcular: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24"> 
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Planillas y Pagos
          </h1>
          <p className="text-slate-500 text-sm">Cálculo dinámico con paginación optimizada.</p>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap justify-end bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-2">
                <Calendar size={16} className="text-slate-400"/>
                <input type="date" value={weekRange.start} onChange={(e) => setWeekRange({...weekRange, start: e.target.value})} className="font-bold text-slate-600 outline-none text-sm bg-transparent"/>
                <span className="text-slate-300">-</span>
                <input type="date" value={weekRange.end} onChange={(e) => setWeekRange({...weekRange, end: e.target.value})} className="font-bold text-slate-600 outline-none text-sm bg-transparent"/>
            </div>
            <button onClick={calculatePayroll} disabled={loading} className="bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-70 shadow-md">
              {loading ? <RefreshCw className="animate-spin" size={18}/> : <Calculator size={18} />} 
              <span className="font-bold text-sm hidden md:inline">{loading ? 'Calculando...' : 'Calcular'}</span>
            </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveTab('workers')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab==='workers' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <HardHat size={18}/> Obreros
        </button>
        <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab==='staff' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <UserCog size={18}/> Staff
        </button>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
         {calculatedPayroll.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><Calculator size={32} className="text-slate-300"/></div>
                <div className="text-center">
                    <p className="font-medium text-slate-600">Sin datos calculados</p>
                    <p className="text-sm">Selecciona las fechas y presiona <b>Calcular</b>.</p>
                </div>
             </div>
         ) : (
            <>
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Colaborador</th>
                                <th className="px-6 py-4 text-center">Días</th>
                                <th className="px-6 py-4 text-right">Ingresos</th>
                                <th className="px-6 py-4 text-right text-red-500">Descuentos</th>
                                <th className="px-6 py-4 text-right font-black text-green-700">Neto</th>
                                <th className="px-6 py-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            <AnimatePresence mode='wait'>
                                {currentItems.map((item, idx) => (
                                    <motion.tr 
                                        key={item.person.id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                                        className="hover:bg-blue-50/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-700">{item.person.full_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-bold border border-slate-200">{item.person.category || 'Staff'}</span>
                                                <span className="text-[10px] text-blue-600 font-medium truncate max-w-[150px]">{item.details.pensionName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-200 shadow-sm">{item.daysWorked}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-slate-700">S/. {item.totalIncome.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-red-500">- S/. {item.totalDiscounts.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-mono font-bold text-lg text-green-600 bg-green-50 px-2 py-1 rounded">S/. {item.netPay.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => generatePayslip(item, weekRange, logoLyk)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Imprimir Boleta">
                                                <Printer size={20}/>
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* --- COMPONENTE DE PAGINACIÓN CENTRADO --- */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 relative flex flex-col md:flex-row justify-center items-center gap-4">
                        
                        {/* Texto Informativo (Posicionado Absoluto a la izquierda para no empujar el centro) */}
                        <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium order-2 md:order-1">
                            Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, calculatedPayroll.length)} de {calculatedPayroll.length}
                        </div>
                        
                        {/* Botones de Paginación (En el centro del contenedor) */}
                        <div className="flex items-center gap-1 order-1 md:order-2 z-10 bg-white/50 p-1 rounded-xl border border-slate-100 shadow-sm">
                            <button 
                                onClick={() => goToPage(1)} disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                            >
                                <ChevronsLeft size={18}/>
                            </button>
                            <button 
                                onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                            >
                                <ChevronLeft size={18}/>
                            </button>
                            
                            {/* Números de Página */}
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                    .map((page, i, arr) => (
                                        <React.Fragment key={page}>
                                            {i > 0 && arr[i - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                            <button
                                                onClick={() => goToPage(page)}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                                    currentPage === page 
                                                    ? 'bg-[#003366] text-white shadow-md scale-110' 
                                                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            <button 
                                onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                            >
                                <ChevronRight size={18}/>
                            </button>
                            <button 
                                onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"
                            >
                                <ChevronsRight size={18}/>
                            </button>
                        </div>
                    </div>
                )}
            </>
         )}
      </div>

      {/* --- BOTONES FLOTANTES DE ACCIÓN --- */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end z-40">
          <motion.div initial={{ scale: 0 }} animate={{ scale: calculatedPayroll.length > 0 ? 1 : 0 }}>
              <button 
                onClick={() => generateBulkPayslips(calculatedPayroll, weekRange, logoLyk)}
                className="bg-[#003366] text-white p-4 rounded-full shadow-xl hover:bg-blue-900 transition-all hover:scale-105 flex items-center gap-3 border-2 border-white/20"
                title="Descargar todas las boletas en PDF"
              >
                  <FileDown size={24} /> 
                  <span className="font-bold hidden md:inline pr-2">Descargar Boletas (PDF)</span>
              </button>
          </motion.div>

          <button 
            onClick={() => setIsPayrollModalOpen(true)} 
            className="bg-green-600 text-white p-4 rounded-full shadow-xl hover:bg-green-700 transition-all hover:scale-105 flex items-center gap-3 border-2 border-white/20"
            title="Exportar Reporte Excel"
          >
              <FileSpreadsheet size={24} /> 
              <span className="font-bold hidden md:inline pr-2">Exportar Excel</span>
          </button>
      </div>

      <PayrollModal 
        isOpen={isPayrollModalOpen} 
        onClose={() => setIsPayrollModalOpen(false)} 
        payrollData={calculatedPayroll} 
        dateRange={weekRange} 
      />
    </div>
  );
};

export default PayrollPage;