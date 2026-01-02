import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Calculator, Wallet, DollarSign, HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componente auxiliar fuera para evitar pérdida de foco
const MoneyInput = ({ label, value, onChange, readOnlyLabel, isHighlight }) => (
  <div>
    <label className={`block text-xs font-bold mb-1 uppercase tracking-wide ${isHighlight ? 'text-blue-600' : 'text-slate-500'}`}>{label}</label>
    <div className="relative group">
      <span className={`absolute left-3 top-2.5 font-bold ${isHighlight ? 'text-blue-500' : 'text-slate-400 group-focus-within:text-blue-500'}`}>S/.</span>
      <input 
        type="number" step="0.01"
        value={value}
        onChange={onChange}
        onFocus={(e) => e.target.select()}
        className={`w-full pl-9 p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm transition-all ${isHighlight ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white text-slate-700'}`}
      />
      {readOnlyLabel && <span className="absolute right-2 top-2 text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-400">{readOnlyLabel}</span>}
    </div>
  </div>
);

const AdjustmentsModal = ({ isOpen, onClose, onSave, initialData, autoCalculatedData, workerName }) => {
  const [formData, setFormData] = useState({
    sundayHours: 0,
    holidayHours: 0,
    paidHolidays: 0, 
    dailyRate: 0,        
    workedHolidayDays: 0, 
    basicSalary: 0,
    dominical: 0,
    buc: 0,
    mobility: 0,
    schoolAssign: 0,
    amountHe60: 0,
    amountHe100: 0,
    indemnizacionHe: 0, 
    holidayPay: 0, 
    vacation: 0,      
    gratification: 0, 
    indemnity: 0,     
    bonus: 0,
    viaticos: 0,
    deduction: 0,
  });

  const [factors, setFactors] = useState({ 
    holidayFactor: 2.0, 
    bucFactor: 0, 
    dominicalDays: 1,
    pctVacation: 0.10,     
    pctGratification: 0.21, 
    pctIndemnity: 0.15     
  });

  useEffect(() => {
    if (isOpen) {
      const d = autoCalculatedData?.details || {};
      const f = d.factors || {};

      setFactors({
          holidayFactor: Number(f.holidayFactor) || 2.0,
          bucFactor: Number(f.buc) || 0,
          dominicalDays: Number(f.dominicalDays) || 1,
          pctVacation: Number(f.pctVacation) || 0.10,
          pctGratification: Number(f.pctGratification) || 0.21,
          pctIndemnity: Number(f.pctIndemnity) || 0.15
      });

      setFormData({
        sundayHours: initialData?.sundayHours || 0,
        holidayHours: initialData?.holidayHours || 0,
        paidHolidays: initialData?.paidHolidays || 0,

        dailyRate: initialData?.dailyRate !== undefined ? initialData.dailyRate : (d.unitRates?.daily || 0),
        workedHolidayDays: initialData?.workedHolidayDays !== undefined ? initialData.workedHolidayDays : (d.holidayDaysCount || 0),

        basicSalary: initialData?.basicSalary !== undefined ? initialData.basicSalary : (d.basicSalary || 0),
        dominical: initialData?.dominical !== undefined ? initialData.dominical : (d.dominical || 0),
        buc: initialData?.buc !== undefined ? initialData.buc : (d.buc || 0),
        mobility: initialData?.mobility !== undefined ? initialData.mobility : (d.mobility || 0),
        schoolAssign: initialData?.schoolAssign !== undefined ? initialData.schoolAssign : (d.schoolAssign || 0),
        
        amountHe60: initialData?.amountHe60 !== undefined ? initialData.amountHe60 : (d.he60?.amount || 0),
        amountHe100: initialData?.amountHe100 !== undefined ? initialData.amountHe100 : (d.he100?.amount || 0),
        indemnizacionHe: initialData?.indemnizacionHe !== undefined ? initialData.indemnizacionHe : (d.indemnizacionHe || 0),
        
        holidayPay: initialData?.holidayPay !== undefined ? initialData.holidayPay : (d.holidayPay || 0),

        vacation: initialData?.vacation !== undefined ? initialData.vacation : (d.vacation || 0),
        gratification: initialData?.gratification !== undefined ? initialData.gratification : (d.gratification || 0),
        indemnity: initialData?.indemnity !== undefined ? initialData.indemnity : (d.indemnity || 0),

        bonus: initialData?.bonus || 0,
        viaticos: initialData?.viaticos || 0,
        deduction: initialData?.deduction || 0,
      });
    }
  }, [isOpen, initialData, autoCalculatedData]);

  const handleDailyRateChange = (val) => {
    const newRate = val === '' ? 0 : Number(val);
    const d = autoCalculatedData?.details || {};
    const daysForBonuses = d.daysForBonuses || 0;
    const daysWorked = autoCalculatedData?.daysWorked || 0; 

    const newBasic = newRate * daysWorked;
    const newDominical = newRate * factors.dominicalDays;
    const newBuc = (newRate * daysForBonuses) * factors.bucFactor;
    const newHolidayPay = formData.workedHolidayDays * newRate * factors.holidayFactor;

    const newVacation = newBasic * factors.pctVacation;
    const newGratification = newBasic * factors.pctGratification;
    const newIndemnity = newBasic * factors.pctIndemnity;

    setFormData(prev => ({
        ...prev,
        dailyRate: val, 
        basicSalary: parseFloat(newBasic.toFixed(2)),
        dominical: parseFloat(newDominical.toFixed(2)),
        buc: parseFloat(newBuc.toFixed(2)),
        holidayPay: parseFloat(newHolidayPay.toFixed(2)),
        vacation: parseFloat(newVacation.toFixed(2)),
        gratification: parseFloat(newGratification.toFixed(2)),
        indemnity: parseFloat(newIndemnity.toFixed(2))
    }));
  };

  const handleHolidayDaysChange = (val) => {
    const days = val === '' ? 0 : Number(val);
    const rate = Number(formData.dailyRate);
    const amount = days * rate * factors.holidayFactor;

    setFormData(prev => ({
        ...prev,
        workedHolidayDays: val,
        holidayPay: parseFloat(amount.toFixed(2))
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      sundayHours: Number(formData.sundayHours),
      holidayHours: Number(formData.holidayHours),
      paidHolidays: Number(formData.paidHolidays),
      
      dailyRate: Number(formData.dailyRate),
      workedHolidayDays: Number(formData.workedHolidayDays),

      basicSalary: Number(formData.basicSalary),
      dominical: Number(formData.dominical),
      buc: Number(formData.buc),
      mobility: Number(formData.mobility),
      schoolAssign: Number(formData.schoolAssign),
      amountHe60: Number(formData.amountHe60),
      amountHe100: Number(formData.amountHe100),
      indemnizacionHe: Number(formData.indemnizacionHe),
      holidayPay: Number(formData.holidayPay),

      vacation: Number(formData.vacation),
      gratification: Number(formData.gratification),
      indemnity: Number(formData.indemnity),

      bonus: Number(formData.bonus),
      viaticos: Number(formData.viaticos),
      deduction: Number(formData.deduction),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-4"
        >
          {/* Header */}
          <div className="bg-[#003366] px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-md">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-yellow-400"/> Edición Manual de Planilla
              </h3>
              <p className="text-xs text-blue-200 font-medium mt-0.5">{workerName}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            
            {/* JORNAL DIARIO */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex gap-3 items-start">
                  <div className="bg-white p-2 rounded-lg text-blue-600 shadow-sm"><DollarSign size={24}/></div>
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Jornal Diario (Base de Cálculo)</h4>
                    <p className="text-xs text-blue-600 max-w-[300px] leading-tight mt-1">
                      Al editar esto, se recalculan automáticamente todos los ingresos dependientes (Básico, Beneficios, etc).
                    </p>
                  </div>
               </div>
               <div className="w-full sm:w-40">
                  <MoneyInput 
                    label="Monto Diario" 
                    value={formData.dailyRate} 
                    onChange={(e) => handleDailyRateChange(e.target.value)}
                    isHighlight={true}
                  />
               </div>
            </div>

            {/* SECCIÓN 1: INGRESOS PRINCIPALES */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Wallet size={16} className="text-green-600"/> Ingresos Principales (Editables)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <MoneyInput 
                    label="Jornal Básico" 
                    value={formData.basicSalary} 
                    onChange={(e) => setFormData({...formData, basicSalary: e.target.value})}
                />
                <MoneyInput 
                    label="Dominical" 
                    value={formData.dominical} 
                    onChange={(e) => setFormData({...formData, dominical: e.target.value})}
                />
                <MoneyInput 
                    label="B.U.C." 
                    value={formData.buc} 
                    onChange={(e) => setFormData({...formData, buc: e.target.value})}
                />
                <MoneyInput 
                    label="Movilidad" 
                    value={formData.mobility} 
                    onChange={(e) => setFormData({...formData, mobility: e.target.value})}
                />
                <MoneyInput 
                    label="Asig. Escolar" 
                    value={formData.schoolAssign} 
                    onChange={(e) => setFormData({...formData, schoolAssign: e.target.value})}
                />
              </div>
            </div>

            {/* SECCIÓN 2: BENEFICIOS SOCIALES */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <HeartHandshake size={16} className="text-purple-600"/> Beneficios Sociales
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <MoneyInput 
                    label="Vacaciones" 
                    value={formData.vacation} 
                    onChange={(e) => setFormData({...formData, vacation: e.target.value})}
                />
                <MoneyInput 
                    label="Gratificación" 
                    value={formData.gratification} 
                    onChange={(e) => setFormData({...formData, gratification: e.target.value})}
                />
                <MoneyInput 
                    label="Indemnización (CTS)" 
                    value={formData.indemnity} 
                    onChange={(e) => setFormData({...formData, indemnity: e.target.value})}
                />
              </div>
            </div>

            {/* SECCIÓN 3: EXTRAS Y FERIADOS */}
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Calculator size={16} className="text-orange-600"/> Extras y Feriados
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                <MoneyInput 
                    label="Monto H.E. 60%" 
                    value={formData.amountHe60} 
                    onChange={(e) => setFormData({...formData, amountHe60: e.target.value})}
                />
                <MoneyInput 
                    label="Monto H.E. 100%" 
                    value={formData.amountHe100} 
                    onChange={(e) => setFormData({...formData, amountHe100: e.target.value})}
                />
                <MoneyInput 
                    label="Indemnización H.E." 
                    value={formData.indemnizacionHe} 
                    onChange={(e) => setFormData({...formData, indemnizacionHe: e.target.value})}
                />
                
                <div className="col-span-1 sm:col-span-2 md:col-span-1 flex gap-2">
                    <div className="w-16">
                        <label className="block text-[10px] font-bold text-orange-800 mb-1 uppercase">Días</label>
                        <input 
                            type="number" min="0" step="1"
                            value={formData.workedHolidayDays}
                            onChange={(e) => handleHolidayDaysChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            className="w-full p-2.5 rounded-xl border border-orange-200 text-center font-bold text-orange-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                    <div className="flex-1">
                        <MoneyInput 
                            label="Remun. Feriado" 
                            value={formData.holidayPay} 
                            onChange={(e) => setFormData({...formData, holidayPay: e.target.value})}
                        />
                    </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 4: OTROS AJUSTES */}
            <div className="space-y-4 pt-2">
               <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Edit3 size={16} className="text-slate-600"/> Otros Ajustes
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 <MoneyInput 
                    label="Bonif. Voluntaria" 
                    value={formData.bonus} 
                    onChange={(e) => setFormData({...formData, bonus: e.target.value})}
                />
                 <MoneyInput 
                    label="Viáticos (No Afecto)" 
                    value={formData.viaticos} 
                    onChange={(e) => setFormData({...formData, viaticos: e.target.value})}
                />
                 <div>
                  <label className="block text-xs font-bold text-red-600 mb-1 uppercase tracking-wide">Descuento Vario</label>
                  <div className="relative group">
                    <span className="absolute left-3 top-2.5 text-red-400 font-bold">S/.</span>
                    <input 
                      type="number" step="0.01"
                      value={formData.deduction}
                      onChange={(e) => setFormData({...formData, deduction: e.target.value})}
                      onFocus={(e) => e.target.select()}
                      className="w-full pl-9 p-2.5 rounded-xl border border-red-200 bg-red-50/20 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-red-800 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Informativo Feriados NO trabajados */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-700">Feriados NO TRABAJADOS (Descanso):</span><br/>
                      Días feriados que se pagaron en el básico pero no se laboraron.
                  </div>
                  <input 
                      type="number" min="0" max="7" 
                      value={formData.paidHolidays}
                      onChange={(e) => setFormData({...formData, paidHolidays: e.target.value})}
                      onFocus={(e) => e.target.select()}
                      className="w-20 p-2 text-center font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4 sticky bottom-0 bg-white py-4">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-lg text-sm transition-colors border border-slate-200">
                Cancelar
              </button>
              <button type="submit" className="bg-[#003366] text-white px-8 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-900 transition-all shadow-lg flex items-center gap-2">
                <Save size={18} /> Guardar
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdjustmentsModal;