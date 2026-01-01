/**
 * src/utils/payrollCalculations.js
 * Lógica de Planilla - Régimen Construcción Civil Perú
 * VERSIÓN FINAL: Incluye Feriados (Triple), Bonos Manuales y Ajustes de Novedades.
 */

export const calculateWorkerPay = (person, daysWorked, totalAdvances, constants, afpRates, attendanceDetails = {}, manualAdjustments = {}) => {
    // 1. Identificar Categoría
    const catUpper = (person.category || 'PEON').toUpperCase();
    
    // 2. Obtener Tasa Diaria (Jornal)
    let dailyRate = 0;
    if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) {
        dailyRate = Number(person.custom_daily_rate);
    } else {
        dailyRate = Number(constants[`JORNAL_${catUpper}`]) || 0;
    }
    
    const hourlyRate = dailyRate / 8; 

    // --- A. INGRESOS AUTOMÁTICOS ---

    // A1. Básico
    const basicSalary = daysWorked * dailyRate;
    
    // A2. Dominical (1 jornal si semana completa, sino proporcional)
    const dominicalDays = (daysWorked >= 6) ? 1 : (daysWorked / 6); 
    const dominical = dominicalDays * dailyRate;

    // A3. Feriados Trabajados (CON FLEXIBILIDAD MANUAL)
    let holidayDays = 0;
    if (manualAdjustments.holidayDaysOverride !== undefined && manualAdjustments.holidayDaysOverride !== null && manualAdjustments.holidayDaysOverride !== "") {
         holidayDays = Number(manualAdjustments.holidayDaysOverride);
    } else {
         holidayDays = Number(attendanceDetails.holidayDays) || 0;
    }

    // Sobretasa Feriado (200% adicional = Pago Triple total con el día trabajado)
    const holidayFactor = Number(constants['TASA_FERIADO_TRABAJADO']) || 2.0; 
    const holidayPay = holidayDays * dailyRate * holidayFactor;

    // A4. BUC
    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0; 
    const buc = basicSalary * bucFactor;

    // A5. Movilidad (S/ 8.00 o constante)
    const mobilityRate = Number(constants['MOVILIDAD']) || 0; 
    const mobility = daysWorked * mobilityRate;

    // A6. Asignación Escolar (S/ 3.08 aprox o constante)
    const schoolRate = person.has_children ? (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0) : 0;
    const schoolAssign = daysWorked * schoolRate;

    // A7. Horas Extras
    const he60Hours = Number(attendanceDetails.he60) || 0;
    const he100Hours = Number(attendanceDetails.he100) || 0;
    
    const rate60 = Number(constants['HE_60_PCT']) || 0.60;
    const rate100 = Number(constants['HE_100_PCT']) || 1.00;
    
    const unitHe60 = hourlyRate * (1 + rate60);
    const unitHe100 = hourlyRate * (1 + rate100);
    
    const amountHe60 = he60Hours * unitHe60;
    const amountHe100 = he100Hours * unitHe100;

    // --- B. INGRESOS MANUALES (NOVEDADES) ---
    const manualBonus = Number(manualAdjustments.bonus) || 0;

    // --- C. BENEFICIOS SOCIALES ---
    const pctIndemnity = Number(constants['PCT_CTS']) || 0.15;
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;
    const pctGratification = Number(constants['PCT_GRATIFICACION']) || 0.21;

    const indemnity = basicSalary * pctIndemnity; 
    const vacation = basicSalary * pctVacation;   
    const gratification = basicSalary * pctGratification; 

    // --- D. BASES IMPONIBLES ---
    // Sumamos manualBonus asumiendo que es remunerativo
    const taxableIncome = basicSalary + dominical + buc + schoolAssign + amountHe60 + amountHe100 + vacation + holidayPay + gratification + manualBonus;
    const conafovicerBase = basicSalary + dominical + holidayPay + manualBonus;
    const totalIncome = taxableIncome + indemnity + mobility;

    // --- E. DESCUENTOS ---
    let pensionName = person.pension_system || 'ONP';
    let breakdown = { obligatory: 0, insurance: 0, commission: 0, total: 0 };
    let pensionRateLabel = '';

    if (pensionName === 'ONP') {
        const rate = Number(constants['ONP_TASA']) || 0.13;
        breakdown.obligatory = taxableIncome * rate;
        breakdown.total = breakdown.obligatory;
        pensionRateLabel = '13%';
    } else if (pensionName !== 'Sin Régimen') {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const obligRate = Number(myAfp.aporte_obligatorio);
            const insuranceRate = Number(myAfp.prima_seguro);
            const commissionRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);

            breakdown.obligatory = taxableIncome * obligRate;
            breakdown.insurance = taxableIncome * insuranceRate;
            breakdown.commission = taxableIncome * commissionRate;
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
            pensionRateLabel = `${((obligRate + insuranceRate + commissionRate) * 100).toFixed(2)}%`;
        } else {
            breakdown.total = taxableIncome * 0.13;
            pensionName = person.pension_system + ' (Ref)';
        }
    }

    const conafovicer = conafovicerBase * (Number(constants['CONAFOVICER']) || 0.02);
    
    // Descuentos Manuales
    const manualDeduction = Number(manualAdjustments.deduction) || 0;
    
    const totalDiscounts = breakdown.total + conafovicer + totalAdvances + manualDeduction;
    const essalud = taxableIncome * (Number(constants['ESSALUD']) || 0.09);

    return {
        person,
        daysWorked,
        details: { 
            basicSalary, dominical, buc, mobility, schoolAssign, 
            indemnity, vacation, gratification, holidayPay,
            manualBonus, manualDeduction,
            pensionAmount: breakdown.total, pensionBreakdown: breakdown,
            conafovicer, essalud, pensionName, pensionRateLabel,
            he60: { hours: he60Hours, amount: amountHe60 },
            he100: { hours: he100Hours, amount: amountHe100 },
            unitRates: { daily: dailyRate, school: schoolRate, mobility: mobilityRate }
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};

export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    // Cálculo simplificado para Staff (sin cambios mayores)
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
        breakdown.total = totalIncome * (Number(constants['STAFF_TASA_ONP']) || 0.13);
        breakdown.obligatory = breakdown.total;
    } else if (pensionName !== 'Sin Régimen') {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const commRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            breakdown.obligatory = totalIncome * Number(myAfp.aporte_obligatorio);
            breakdown.insurance = totalIncome * Number(myAfp.prima_seguro);
            breakdown.commission = totalIncome * commRate;
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            pensionName = `AFP ${myAfp.name} ${isMixta ? '(M)' : '(F)'}`;
        } else {
            breakdown.total = totalIncome * 0.13;
        }
    }

    const totalDiscounts = breakdown.total + totalAdvances;
    const essalud = totalIncome * (Number(constants['STAFF_TASA_ESSALUD']) || 0.09);

    return {
        person, type: 'staff', daysWorked,
        details: { basicSalary: payBasico, familyAllowance: payAsigFam, pensionAmount: breakdown.total, pensionBreakdown: breakdown, pensionName, essalud },
        totalIncome, totalDiscounts, totalAdvances, netPay: totalIncome - totalDiscounts
    };
};