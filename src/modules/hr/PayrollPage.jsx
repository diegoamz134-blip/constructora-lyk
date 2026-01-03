import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Calculator, Printer, HardHat, UserCog, 
  FileSpreadsheet, FileDown, Calendar, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, Edit3 
} from 'lucide-react';

// Servicios
import { 
  getActivePersonnelCount,
  getPaginatedActivePersonnel,
  getActivePersonnel, 
  getAttendanceByRange, 
  getAdvancesByRange 
} from '../../services/payrollService';

// Contexto Global
import { useCompany } from '../../context/CompanyContext';

// Cálculos matemáticos
import { calculateWorkerPay, calculateStaffPay } from '../../utils/payrollCalculations';

import { generatePayslip, generateBulkPayslips } from '../../utils/pdfGenerator';
import PayrollModal from './components/PayrollModal';
import AdjustmentsModal from './components/AdjustmentsModal'; 

// IMÁGENES
import logoLyk from '../../assets/images/logo-lk-full.png';
import firmaGerente from '../../assets/images/firma-gerente.png';

const PayrollPage = () => {
  // --- ESTADOS CON PERSISTENCIA ---
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('payroll_activeTab') || 'workers';
  });

  const [weekRange, setWeekRange] = useState(() => {
    const saved = localStorage.getItem('payroll_weekRange');
    if (saved) return JSON.parse(saved);
    return {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    };
  });

  const [adjustments, setAdjustments] = useState(() => {
    const saved = localStorage.getItem('payroll_adjustments');
    return saved ? JSON.parse(saved) : {};
  });

  // Efectos de Guardado
  useEffect(() => { localStorage.setItem('payroll_activeTab', activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem('payroll_weekRange', JSON.stringify(weekRange)); }, [weekRange]);
  useEffect(() => { localStorage.setItem('payroll_adjustments', JSON.stringify(adjustments)); }, [adjustments]);

  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { constants, afpRates, refreshConfig } = useCompany();

  const [calculatedPayroll, setCalculatedPayroll] = useState([]);
  const [fullPayrollData, setFullPayrollData] = useState([]);
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [advancesData, setAdvancesData] = useState([]);

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  
  const [editingPerson, setEditingPerson] = useState(null);
  const [currentCalculation, setCurrentCalculation] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0); 
  const itemsPerPage = 10;

  useEffect(() => {
    setCalculatedPayroll([]);
    setAttendanceData([]);
    setAdvancesData([]);
    setCurrentPage(1); 
    setTotalRecords(0);
  }, [activeTab]);

  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      calculatePayroll(pageNumber); 
    }
  };

  const calculatePayroll = async (pageToLoad = 1) => {
    setLoading(true);
    try {
        await refreshConfig(); 
        const table = activeTab === 'workers' ? 'workers' : 'employees';
        const count = await getActivePersonnelCount(table);
        setTotalRecords(count);
        const freshPeople = await getPaginatedActivePersonnel(table, pageToLoad, itemsPerPage);
        
        const attData = await getAttendanceByRange(weekRange.start, weekRange.end);
        const advData = await getAdvancesByRange(weekRange.start, weekRange.end);

        setAttendanceData(attData);
        setAdvancesData(advData);

        const results = (freshPeople || []).map(person => {
           return performCalculation(person, attData, advData, adjustments);
        });

        setCalculatedPayroll(results.filter(r => r !== null));
        setCurrentPage(pageToLoad);

    } catch (err) {
        console.error(err);
        alert("Error al calcular: " + err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleGlobalExport = async (type) => {
    setIsExporting(true);
    try {
        await refreshConfig();

        const table = activeTab === 'workers' ? 'workers' : 'employees';
        const allPeople = await getActivePersonnel(table); 

        const attData = await getAttendanceByRange(weekRange.start, weekRange.end);
        const advData = await getAdvancesByRange(weekRange.start, weekRange.end);

        const allResults = (allPeople || []).map(person => {
            return performCalculation(person, attData, advData, adjustments);
        }).filter(r => r !== null);

        if (allResults.length === 0) {
            alert("No hay datos para exportar en este periodo.");
            setIsExporting(false);
            return;
        }

        if (type === 'pdf') {
            generateBulkPayslips(allResults, weekRange, logoLyk, firmaGerente);
        } else if (type === 'excel') {
            setFullPayrollData(allResults); 
            setIsPayrollModalOpen(true);
        }

    } catch (error) {
        console.error("Error en exportación masiva:", error);
        alert("Hubo un error al generar la exportación.");
    } finally {
        setIsExporting(false);
    }
  };

  const performCalculation = (person, attData, advData, currentAdjustments) => {
    try {
        const personId = person.id;
        
        const myAtt = (attData || []).filter(a => activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId);
        const myAdv = (advData || []).filter(a => activeTab === 'workers' ? a.worker_id === personId : a.employee_id === personId);
        
        const daysWorked = myAtt.filter(a => a.status === 'Presente').length;
        const totalAdvances = myAdv.reduce((sum, a) => sum + (Number(a.amount)||0), 0);

        // CLAVE ÚNICA PARA EVITAR CONFLICTOS ENTRE TABLAS
        const uniqueKey = `${activeTab}_${personId}`;
        const myAdjustments = currentAdjustments[uniqueKey] || {};

        if (activeTab === 'workers') {
            let totalHe60 = 0;
            let totalHe100 = 0;
            let autoHolidayDays = 0;

            myAtt.forEach(record => {
                const dailyOvertime = Number(record.overtime_hours) || 0;
                if (dailyOvertime > 0) {
                    if (dailyOvertime <= 2) {
                        totalHe60 += dailyOvertime;
                    } else {
                        totalHe60 += 2;
                        totalHe100 += (dailyOvertime - 2);
                    }
                }
                if (record.worked_holiday_days) {
                    autoHolidayDays += Number(record.worked_holiday_days);
                }
            });
            
            const attendanceDetails = { 
                he60: totalHe60, 
                he100: totalHe100,
                holidayDays: autoHolidayDays
            };

            return calculateWorkerPay(person, daysWorked, totalAdvances, constants, afpRates, attendanceDetails, myAdjustments);
        } else {
            return calculateStaffPay(person, daysWorked, totalAdvances, constants, afpRates, myAdjustments);
        }
    } catch (e) { 
        console.error("Error en performCalculation:", e);
        return null; 
    }
  };

  const handleDownloadSingle = (item) => {
      generatePayslip(item, weekRange, logoLyk, firmaGerente);
  };

  const openAdjustmentModal = (item) => {
      setEditingPerson(item.person);
      setCurrentCalculation(item);
      setIsAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = (data) => {
      if (!editingPerson) return;
      
      const uniqueKey = `${activeTab}_${editingPerson.id}`;

      const newAdjustments = {
          ...adjustments,
          [uniqueKey]: data 
      };
      setAdjustments(newAdjustments);

      const updatedResult = performCalculation(editingPerson, attendanceData, advancesData, newAdjustments);
      
      setCalculatedPayroll(prev => prev.map(item => 
          item.person.id === editingPerson.id ? updatedResult : item
      ));
  };

  return (
    <div className="space-y-6 pb-24"> 
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="text-green-600" /> Planillas y Pagos
          </h1>
          <p className="text-slate-500 text-sm">Gestión de nómina Semanal (Obreros) y Mensual (Staff).</p>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap justify-end bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-2">
                <Calendar size={16} className="text-slate-400"/>
                <input type="date" value={weekRange.start} onChange={(e) => setWeekRange({...weekRange, start: e.target.value})} className="font-bold text-slate-600 outline-none text-sm bg-transparent"/>
                <span className="text-slate-300">-</span>
                <input type="date" value={weekRange.end} onChange={(e) => setWeekRange({...weekRange, end: e.target.value})} className="font-bold text-slate-600 outline-none text-sm bg-transparent"/>
            </div>
            <button onClick={() => calculatePayroll(1)} disabled={loading || isExporting} className="bg-[#003366] text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition flex items-center gap-2 disabled:opacity-70 shadow-md">
              {loading ? <RefreshCw className="animate-spin" size={18}/> : <Calculator size={18} />} 
              <span className="font-bold text-sm hidden md:inline">{loading ? 'Calculando...' : 'Calcular'}</span>
            </button>
        </div>
      </div>

      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveTab('workers')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab==='workers' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <HardHat size={18}/> Obreros
        </button>
        <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab==='staff' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            <UserCog size={18}/> Staff
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
         {calculatedPayroll.length === 0 && !loading ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><Calculator size={32} className="text-slate-300"/></div>
                <div className="text-center">
                    <p className="font-medium text-slate-600">Sin datos calculados</p>
                    <p className="text-sm">Selecciona las fechas y presiona <b>Calcular</b> para ver la vista previa.</p>
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
                                {calculatedPayroll.map((item, idx) => (
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
                                                {(item.details.manualBonus > 0 || item.details.manualDeduction > 0) && (
                                                    <span className="w-2 h-2 rounded-full bg-yellow-400" title="Tiene novedades manuales"></span>
                                                )}
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
                                            <div className="flex items-center justify-center gap-2">
                                                {/* --- CORRECCIÓN: Botón visible para todos --- */}
                                                <button 
                                                    onClick={() => openAdjustmentModal(item)} 
                                                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 p-2 rounded-lg transition-all" 
                                                    title="Editar Conceptos"
                                                >
                                                    <Edit3 size={20}/>
                                                </button>
                                                
                                                <button onClick={() => handleDownloadSingle(item)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition-all" title="Imprimir Boleta">
                                                    <Printer size={20}/>
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 relative flex flex-col md:flex-row justify-center items-center gap-4">
                        <div className="md:absolute md:left-6 text-xs text-slate-400 font-medium order-2 md:order-1">
                            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalRecords)} de {totalRecords}
                        </div>
                        <div className="flex items-center gap-1 order-1 md:order-2 z-10 bg-white/50 p-1 rounded-xl border border-slate-100 shadow-sm">
                            <button onClick={() => goToPage(1)} disabled={currentPage === 1 || loading} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronsLeft size={18}/></button>
                            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || loading} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronLeft size={18}/></button>
                            
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                                    .map((page, i, arr) => (
                                        <React.Fragment key={page}>
                                            {i > 0 && arr[i - 1] !== page - 1 && <span className="text-slate-300 text-xs px-1">...</span>}
                                            <button 
                                                onClick={() => goToPage(page)} 
                                                disabled={loading}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-[#003366] text-white shadow-md scale-110' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || loading} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronRight size={18}/></button>
                            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || loading} className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-all"><ChevronsRight size={18}/></button>
                        </div>
                    </div>
                )}
            </>
         )}
      </div>

      <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end z-40">
          <motion.div initial={{ scale: 0 }} animate={{ scale: calculatedPayroll.length > 0 ? 1 : 0 }}>
              <button 
                onClick={() => handleGlobalExport('pdf')}
                disabled={isExporting}
                className="bg-[#003366] text-white p-4 rounded-full shadow-xl hover:bg-blue-900 transition-all hover:scale-105 flex items-center gap-3 border-2 border-white/20 disabled:opacity-70 disabled:scale-100"
                title="Descargar boletas de TODOS (Completo)"
              >
                  {isExporting ? <Loader2 className="animate-spin" size={24} /> : <FileDown size={24} />}
                  <span className="font-bold hidden md:inline pr-2">
                    {isExporting ? 'Generando...' : 'Boletas (Todos)'}
                  </span>
              </button>
          </motion.div>

          <button 
            onClick={() => handleGlobalExport('excel')}
            disabled={isExporting}
            className="bg-green-600 text-white p-4 rounded-full shadow-xl hover:bg-green-700 transition-all hover:scale-105 flex items-center gap-3 border-2 border-white/20 disabled:opacity-70 disabled:scale-100"
            title="Exportar Reporte Excel Completo"
          >
              {isExporting ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
              <span className="font-bold hidden md:inline pr-2">
                {isExporting ? 'Procesando...' : 'Excel (Todos)'}
              </span>
          </button>
      </div>

      <AdjustmentsModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        onSave={handleSaveAdjustment}
        initialData={editingPerson ? adjustments[`${activeTab}_${editingPerson.id}`] : null}
        autoCalculatedData={currentCalculation}
        workerName={editingPerson?.full_name}
      />

      <PayrollModal 
        isOpen={isPayrollModalOpen} 
        onClose={() => setIsPayrollModalOpen(false)} 
        payrollData={fullPayrollData} 
        dateRange={weekRange} 
      />
    </div>
  );
};

export default PayrollPage;