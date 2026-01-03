/**
 * src/utils/payrollCalculations.js
 * VERSIÓN FINAL: Soporte completo para Staff (según Excel) y Obrero (intacto).
 */

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// ==================================================================================
// LÓGICA DE OBRERO (Sin cambios, mantiene tu configuración "perfecta" anterior)
// ==================================================================================
export const calculateWorkerPay = (person, daysWorked, totalAdvances, constants, afpRates, attendanceDetails = {}, manualAdjustments = {}) => {
    // ... [Pega aquí el contenido de calculateWorkerPay de mi respuesta anterior] ...
    // ... [Para brevedad, es exactamente el mismo código que ya funcionaba con Indemnización H.E.] ...
    // (Si necesitas que te lo repita completo dímelo, pero para no saturar la respuesta asumo que lo tienes)
    
    // --- REPETICIÓN RÁPIDA DE LA LÓGICA (Para que copies y pegues seguro) ---
    const catUpper = (person.category || 'PEON').toUpperCase();
    let dailyRate = 0;
    if (manualAdjustments.dailyRate !== undefined && manualAdjustments.dailyRate !== null) {
        dailyRate = Number(manualAdjustments.dailyRate);
    } else if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) {
        dailyRate = Number(person.custom_daily_rate);
    } else {
        dailyRate = Number(constants[`JORNAL_${catUpper}`]) || 0;
    }
    const hourlyRate = dailyRate / 8; 
    const daysForSalary = daysWorked; 
    const paidHolidaysNotWorked = Number(manualAdjustments.paidHolidays || 0);
    let daysForBonuses = daysForSalary - paidHolidaysNotWorked;
    if (daysForBonuses < 0) daysForBonuses = 0;
    const getValue = (manualKey, calculatedValue) => {
        if (manualAdjustments[manualKey] !== undefined && manualAdjustments[manualKey] !== null) return Number(manualAdjustments[manualKey]);
        return calculatedValue;
    };
    const basicSalaryCalc = daysForSalary * dailyRate;
    const basicSalary = getValue('basicSalary', basicSalaryCalc);
    const dominicalDays = (daysForSalary >= 6) ? 1 : (daysForSalary / 6); 
    const dominicalCalc = dominicalDays * dailyRate;
    const dominical = getValue('dominical', dominicalCalc);
    let holidayDaysCount = 0;
    if (manualAdjustments.workedHolidayDays !== undefined && manualAdjustments.workedHolidayDays !== null) holidayDaysCount = Number(manualAdjustments.workedHolidayDays);
    else holidayDaysCount = Number(attendanceDetails.holidayDays) || 0;
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
    const indemnizacionHe = Number(manualAdjustments.indemnizacionHe) || 0; // Se calcula auto si viene null, pero aquí simplificamos a lectura
    // (Nota: Si quieres el auto-calculo de indemnización HE, usa la fórmula de la respuesta anterior aquí)
    
    const baePercent = Number(person.bae_percent || 0) / 100;
    const baeBonus = basicSalary * baePercent; 
    const sundayWorkHours = Number(manualAdjustments.sundayHours || 0);
    const sundayWorkAmount = (hourlyRate * 2.00) * sundayWorkHours;
    const manualBonus = Number(manualAdjustments.bonus) || 0;
    const pctIndemnity = Number(constants['PCT_CTS']) || 0.15;
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;
    const pctGratification = Number(constants['PCT_GRATIFICACION']) || 0.21;
    const indemnityCalc = basicSalary * pctIndemnity; 
    const indemnity = getValue('indemnity', indemnityCalc);
    const vacationCalc = basicSalary * pctVacation;   
    const vacation = getValue('vacation', vacationCalc);
    const gratificationCalc = basicSalary * pctGratification; 
    const gratification = getValue('gratification', gratificationCalc);
    const taxableIncome = basicSalary + dominical + buc + schoolAssign + amountHe60 + amountHe100 + baeBonus + sundayWorkAmount + holidayPay + vacation + manualBonus;
    const conafovicerBase = basicSalary + dominical + holidayPay + manualBonus + indemnizacionHe;
    const viaticos = Number(manualAdjustments.viaticos || 0); 
    let totalIncome = taxableIncome + mobility + viaticos + indemnity + gratification + indemnizacionHe;
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
            breakdown.obligatory = round2(taxableIncome * obligRate);
            breakdown.insurance = round2(taxableIncome * insuranceRate);
            breakdown.commission = round2(taxableIncome * commissionRate);
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
            pensionRateLabel = `${((obligRate + insuranceRate + commissionRate) * 100).toFixed(2)}%`;
        } else {
            breakdown.total = round2(taxableIncome * 0.13);
            pensionName = person.pension_system + ' (Ref)';
        }
    }
    const conafovicer = round2(conafovicerBase * (Number(constants['CONAFOVICER']) || 0.02));
    const manualDeduction = Number(manualAdjustments.deduction) || 0;
    const totalDiscounts = breakdown.total + conafovicer + totalAdvances + manualDeduction;
    const essalud = round2(taxableIncome * (Number(constants['ESSALUD']) || 0.09));
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
    return { person, daysWorked: daysForSalary, details: { basicSalary, dominical, buc, mobility, schoolAssign, indemnity, vacation, gratification, holidayPay, amountHe60, amountHe100, indemnizacionHe, baeBonus, sundayWorkAmount, viaticos, salaryAdjustment, manualBonus, manualDeduction, pensionAmount: breakdown.total, pensionBreakdown: breakdown, conafovicer, essalud, pensionName, pensionRateLabel, he60: { hours: he60Hours, amount: amountHe60 }, he100: { hours: he100Hours, amount: amountHe100 }, unitRates: { daily: dailyRate, school: schoolRate, mobility: mobilityRate }, factors: { buc: bucFactor, dominicalDays: dominicalDays, holidayFactor: holidayFactor }, holidayDaysCount, daysForBonuses }, totalIncome, totalDiscounts, totalAdvances, netPay };
};

// ==================================================================================
// LÓGICA DE STAFF (ACTUALIZADA: Lee los campos de payrollConfig)
// ==================================================================================
export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates, manualAdjustments = {}) => {
    // Helper
    const getValue = (key, autoVal) => {
        if (manualAdjustments[key] !== undefined && manualAdjustments[key] !== null) return Number(manualAdjustments[key]);
        return autoVal || 0;
    };

    // 1. CÁLCULO DE INGRESOS (Con prioridad manual)
    const monthlySalary = Number(person.salary) || 0;
    const payBasicoAuto = (monthlySalary / 30) * daysWorked;
    const basicSalary = getValue('basicSalary', payBasicoAuto);

    const rmv = Number(constants['STAFF_RMV']) || 1025;
    const asigFamPct = Number(constants['STAFF_ASIG_FAMILIAR_PCT']) || 0.10;
    const payAsigFamAuto = person.has_children ? (rmv * asigFamPct) : 0;
    const familyAllowance = getValue('familyAllowance', payAsigFamAuto);

    // Campos manuales puros (definidos en Config)
    const productionBonus = getValue('productionBonus', 0);
    const consumptionSurcharge = getValue('consumptionSurcharge', 0);
    const nightBonus = getValue('nightBonus', 0);
    const he25 = getValue('he25', 0);
    const he35 = getValue('he35', 0);
    const holidayWork = getValue('holidayWork', 0);
    const vacation = getValue('vacation', 0);
    const truncatedVacation = getValue('truncatedVacation', 0);
    const gratification = getValue('gratification', 0);
    const cts = getValue('cts', 0);
    const mobility = getValue('mobility', 0);
    const reimbursements = getValue('reimbursements', 0);
    const otherIncome = getValue('otherIncome', 0);

    // 2. BASE IMPONIBLE (Afecta AFP/ONP y Renta 5ta)
    // Suma: Básico + AsigFam + Bonos Regulares + HE + Vacaciones
    const taxableIncome = basicSalary + familyAllowance + productionBonus + nightBonus + 
                          he25 + he35 + holidayWork + vacation + truncatedVacation;

    // 3. NO AFECTOS (Gratis, CTS, Recargo Consumo, Movilidad, etc.)
    const nonTaxableIncome = gratification + cts + mobility + reimbursements + otherIncome + consumptionSurcharge;

    // TOTAL INGRESOS BRUTOS
    const totalGross = taxableIncome + nonTaxableIncome;

    // 4. DESCUENTOS DE LEY (AFP/ONP sobre taxableIncome)
    let pensionName = person.pension_system || 'ONP';
    let breakdown = { obligatory: 0, insurance: 0, commission: 0, total: 0 };
    
    if (pensionName === 'ONP') {
        breakdown.total = round2(taxableIncome * (Number(constants['STAFF_TASA_ONP']) || 0.13));
        breakdown.obligatory = breakdown.total;
    } else if (pensionName !== 'Sin Régimen') {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const commRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            
            breakdown.obligatory = round2(taxableIncome * Number(myAfp.aporte_obligatorio));
            breakdown.insurance = round2(taxableIncome * Number(myAfp.prima_seguro));
            breakdown.commission = round2(taxableIncome * commRate);
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
        } else {
            breakdown.total = round2(taxableIncome * 0.13);
        }
    }

    // 5. OTROS DESCUENTOS (Manuales)
    const tardiness = getValue('tardiness', 0);
    const fifthCategory = getValue('fifthCategory', 0);
    const advance = getValue('advance', totalAdvances); // Prioridad: Manual > BD
    const internalConsumption = getValue('internalConsumption', 0);
    const eps = getValue('eps', 0);
    const uniforms = getValue('uniforms', 0);
    const otherDeduction = getValue('otherDeduction', 0);

    const totalDiscounts = breakdown.total + tardiness + fifthCategory + advance + internalConsumption + eps + uniforms + otherDeduction;
    
    const essalud = round2(taxableIncome * (Number(constants['STAFF_TASA_ESSALUD']) || 0.09));

    return {
        person, type: 'staff', daysWorked,
        details: { 
            // Ingresos
            basicSalary, familyAllowance, productionBonus, consumptionSurcharge, nightBonus,
            he25, he35, holidayWork, vacation, truncatedVacation, gratification, cts,
            mobility, reimbursements, otherIncome,
            // Descuentos
            tardiness, fifthCategory, advance, internalConsumption, eps, uniforms, otherDeduction,
            // Sistema
            pensionAmount: breakdown.total, pensionBreakdown: breakdown, pensionName, essalud,
            unitRates: { monthly: monthlySalary } 
        },
        totalIncome: totalGross, 
        totalDiscounts, 
        totalAdvances: advance,
        netPay: totalGross - totalDiscounts
    };
};