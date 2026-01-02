/**
 * src/utils/payrollCalculations.js
 * Lógica de Planilla - Régimen Construcción Civil Perú
 * VERSIÓN FINAL: Ajuste de redondeo decimal para cuadrar con Excel (Diferencia S/. 0.00).
 */

// Helper para redondear a 2 decimales exactos (evita errores de 0.01)
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

export const calculateWorkerPay = (person, daysWorked, totalAdvances, constants, afpRates, attendanceDetails = {}, manualAdjustments = {}) => {
    // 1. Identificar Categoría
    const catUpper = (person.category || 'PEON').toUpperCase();
    
    // 2. Obtener Tasa Diaria
    let dailyRate = 0;
    if (manualAdjustments.dailyRate !== undefined && manualAdjustments.dailyRate !== null) {
        dailyRate = Number(manualAdjustments.dailyRate);
    } else if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) {
        dailyRate = Number(person.custom_daily_rate);
    } else {
        dailyRate = Number(constants[`JORNAL_${catUpper}`]) || 0;
    }
    
    const hourlyRate = dailyRate / 8; 

    // --- A. LÓGICA DE DÍAS ---
    const daysForSalary = daysWorked; 
    const paidHolidaysNotWorked = Number(manualAdjustments.paidHolidays || 0);
    let daysForBonuses = daysForSalary - paidHolidaysNotWorked;
    if (daysForBonuses < 0) daysForBonuses = 0;

    const getValue = (manualKey, calculatedValue) => {
        if (manualAdjustments[manualKey] !== undefined && manualAdjustments[manualKey] !== null) {
            return Number(manualAdjustments[manualKey]);
        }
        return calculatedValue;
    };

    // --- B. INGRESOS ---
    const basicSalaryCalc = daysForSalary * dailyRate;
    const basicSalary = getValue('basicSalary', basicSalaryCalc);
    
    const dominicalDays = (daysForSalary >= 6) ? 1 : (daysForSalary / 6); 
    const dominicalCalc = dominicalDays * dailyRate;
    const dominical = getValue('dominical', dominicalCalc);

    let holidayDaysCount = 0;
    if (manualAdjustments.workedHolidayDays !== undefined && manualAdjustments.workedHolidayDays !== null) {
        holidayDaysCount = Number(manualAdjustments.workedHolidayDays);
    } else {
        holidayDaysCount = Number(attendanceDetails.holidayDays) || 0;
    }
    const holidayFactor = Number(constants['TASA_FERIADO_TRABAJADO']) || 2.0; 
    const holidayPayCalc = holidayDaysCount * dailyRate * holidayFactor;
    const holidayPay = getValue('holidayPay', holidayPayCalc);

    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0; 
    const bucCalc = (dailyRate * daysForBonuses) * bucFactor;
    const buc = getValue('buc', bucCalc);

    const mobilityRate = Number(constants['MOVILIDAD']) || 0; 
    const mobilityCalc = daysForBonuses * mobilityRate;
    const mobility = getValue('mobility', mobilityCalc);

    const schoolRate = person.has_children ? (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0) : 0;
    const schoolAssignCalc = daysForSalary * schoolRate;
    const schoolAssign = getValue('schoolAssign', schoolAssignCalc);

    const he60Hours = Number(attendanceDetails.he60) || 0;
    const he100Hours = Number(attendanceDetails.he100) || 0;
    
    const rate60 = Number(constants['HE_60_PCT']) || 0.60;
    const rate100 = Number(constants['HE_100_PCT']) || 1.00;
    
    const unitHe60 = hourlyRate * (1 + rate60);
    const unitHe100 = hourlyRate * (1 + rate100);
    
    const amountHe60Calc = he60Hours * unitHe60;
    const amountHe100Calc = he100Hours * unitHe100;

    const amountHe60 = getValue('amountHe60', amountHe60Calc);
    const amountHe100 = getValue('amountHe100', amountHe100Calc);

    const indemnizacionHe = Number(manualAdjustments.indemnizacionHe) || 0;

    const baePercent = Number(person.bae_percent || 0) / 100;
    const baeBonus = basicSalary * baePercent; 

    const sundayWorkHours = Number(manualAdjustments.sundayHours || 0);
    const sundayWorkAmount = (hourlyRate * 2.00) * sundayWorkHours;

    const manualBonus = Number(manualAdjustments.bonus) || 0;

    // --- D. BENEFICIOS SOCIALES ---
    const pctIndemnity = Number(constants['PCT_CTS']) || 0.15;
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;
    const pctGratification = Number(constants['PCT_GRATIFICACION']) || 0.21;

    const indemnityCalc = basicSalary * pctIndemnity; 
    const indemnity = getValue('indemnity', indemnityCalc);

    const vacationCalc = basicSalary * pctVacation;   
    const vacation = getValue('vacation', vacationCalc);

    const gratificationCalc = basicSalary * pctGratification; 
    const gratification = getValue('gratification', gratificationCalc);

    // --- E. TOTALES ---
    
    // 1. Base Imponible (Afecto a AFP)
    // Se excluyen: Gratificación, CTS e Indemnización H.E.
    const taxableIncome = basicSalary + dominical + buc + schoolAssign + 
                          amountHe60 + amountHe100 + 
                          baeBonus + sundayWorkAmount + holidayPay + 
                          vacation + manualBonus;

    // 2. Base Conafovicer
    // Incluye Indemnización HE y Bono Manual para cuadrar con boleta anterior
    const conafovicerBase = basicSalary + dominical + holidayPay + manualBonus + indemnizacionHe;

    const viaticos = Number(manualAdjustments.viaticos || 0); 
    
    // Total Bruto
    let totalIncome = taxableIncome + 
                      mobility + viaticos + 
                      indemnity + gratification + indemnizacionHe;

    // --- F. DESCUENTOS (Con Redondeo corregido) ---
    let pensionName = person.pension_system || 'ONP';
    let breakdown = { obligatory: 0, insurance: 0, commission: 0, total: 0 };
    let pensionRateLabel = '';

    if (pensionName === 'ONP') {
        const rate = Number(constants['ONP_TASA']) || 0.13;
        breakdown.obligatory = round2(taxableIncome * rate);
        breakdown.total = breakdown.obligatory;
        pensionRateLabel = '13%';
    } else if (pensionName !== 'Sin Régimen') {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const obligRate = Number(myAfp.aporte_obligatorio);
            const insuranceRate = Number(myAfp.prima_seguro);
            const commissionRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);

            // CORRECCIÓN: Redondeamos cada componente individualmente
            breakdown.obligatory = round2(taxableIncome * obligRate);
            breakdown.insurance = round2(taxableIncome * insuranceRate);
            breakdown.commission = round2(taxableIncome * commissionRate);
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
            pensionRateLabel = `${((obligRate + insuranceRate + commissionRate) * 100).toFixed(2)}%`;
        } else {
            // Fallback
            breakdown.total = round2(taxableIncome * 0.13);
            pensionName = person.pension_system + ' (Ref)';
        }
    }

    const conafovicer = round2(conafovicerBase * (Number(constants['CONAFOVICER']) || 0.02));
    const manualDeduction = Number(manualAdjustments.deduction) || 0;
    
    const totalDiscounts = breakdown.total + conafovicer + totalAdvances + manualDeduction;
    const essalud = round2(taxableIncome * (Number(constants['ESSALUD']) || 0.09));

    // --- G. NETO ---
    let netPay = totalIncome - totalDiscounts;
    let salaryAdjustment = 0;

    if (person.agreed_weekly_salary && Number(person.agreed_weekly_salary) > 0) {
        const agreed = Number(person.agreed_weekly_salary);
        if (netPay < agreed) {
            salaryAdjustment = agreed - netPay;
            netPay = agreed; 
            totalIncome += salaryAdjustment; 
        }
    }

    return {
        person,
        daysWorked: daysForSalary,
        details: { 
            basicSalary, dominical, buc, mobility, schoolAssign, 
            indemnity, vacation, gratification, holidayPay,
            amountHe60, amountHe100, indemnizacionHe, 
            baeBonus, sundayWorkAmount, viaticos, salaryAdjustment,
            manualBonus, manualDeduction,
            pensionAmount: breakdown.total, pensionBreakdown: breakdown,
            conafovicer, essalud, pensionName, pensionRateLabel,
            he60: { hours: he60Hours, amount: amountHe60 },
            he100: { hours: he100Hours, amount: amountHe100 },
            unitRates: { daily: dailyRate, school: schoolRate, mobility: mobilityRate },
            factors: { buc: bucFactor, dominicalDays: dominicalDays, holidayFactor: holidayFactor, pctVacation: pctVacation, pctGratification: pctGratification, pctIndemnity: pctIndemnity }, 
            holidayDaysCount, 
            daysForBonuses
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay
    };
};

export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    // Staff con redondeo aplicado
    const monthlySalary = Number(person.salary) || 0;
    const payBasico = (monthlySalary / 30) * daysWorked;
    const rmv = Number(constants['STAFF_RMV']) || 1025;
    const asigFamPct = Number(constants['STAFF_ASIG_FAMILIAR_PCT']) || 0.10;
    const monthlyAsigFam = person.has_children ? (rmv * asigFamPct) : 0;
    const payAsigFam = (monthlyAsigFam / 30) * daysWorked; 
    
    const totalIncome = payBasico + payAsigFam; 
    let pensionName = person.pension_system || 'ONP';
    let breakdown = { obligatory: 0, insurance: 0, commission: 0, total: 0 };
    
    if (pensionName === 'ONP') {
        breakdown.total = round2(totalIncome * (Number(constants['STAFF_TASA_ONP']) || 0.13));
        breakdown.obligatory = breakdown.total;
    } else if (pensionName !== 'Sin Régimen') {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const commRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            
            breakdown.obligatory = round2(totalIncome * Number(myAfp.aporte_obligatorio));
            breakdown.insurance = round2(totalIncome * Number(myAfp.prima_seguro));
            breakdown.commission = round2(totalIncome * commRate);
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
        } else {
            breakdown.total = round2(totalIncome * 0.13);
        }
    }

    const totalDiscounts = breakdown.total + totalAdvances;
    const essalud = round2(totalIncome * (Number(constants['STAFF_TASA_ESSALUD']) || 0.09));

    return {
        person, type: 'staff', daysWorked,
        details: { basicSalary: payBasico, familyAllowance: payAsigFam, pensionAmount: breakdown.total, pensionBreakdown: breakdown, pensionName, essalud },
        totalIncome, totalDiscounts, totalAdvances, netPay: totalIncome - totalDiscounts
    };
};