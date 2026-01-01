/**
 * src/utils/payrollCalculations.js
 * Lógica de Planilla - Régimen Construcción Civil Perú
 * ACTUALIZADO: Corrige BUC y Movilidad en semanas con feriados (se pagan sobre días efectivos).
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

    // --- A. LÓGICA DE DÍAS (EFECTIVOS VS PAGADOS) ---
    // En semanas con feriados (ej. 28 y 29 Julio), se paga el jornal completo (6 días),
    // pero el BUC y la Movilidad solo se pagan por los días que realmente se pisó la obra (4 días).

    // Días marcados en asistencia (que generan pago de jornal)
    const daysForSalary = daysWorked; 

    // Feriados pagados pero NO trabajados (Ingresados en el Modal)
    const paidHolidaysNotWorked = Number(manualAdjustments.paidHolidays || 0);

    // Días Efectivos (Para BUC y Movilidad)
    let daysForBonuses = daysForSalary - paidHolidaysNotWorked;
    if (daysForBonuses < 0) daysForBonuses = 0;

    // --- B. INGRESOS AUTOMÁTICOS ---

    // B1. Básico (Se paga completo, incluyendo feriados)
    const basicSalary = daysForSalary * dailyRate;
    
    // B2. Dominical (1 jornal si semana completa o proporcional)
    const dominicalDays = (daysForSalary >= 6) ? 1 : (daysForSalary / 6); 
    const dominical = dominicalDays * dailyRate;

    // B3. Feriados TRABAJADOS (Override manual o detección automática)
    // Esto es para pagar la SOBRETASA del feriado si se trabajó.
    let holidayDaysWorked = 0;
    if (manualAdjustments.holidayDaysOverride !== undefined && manualAdjustments.holidayDaysOverride !== null && manualAdjustments.holidayDaysOverride !== "") {
         holidayDaysWorked = Number(manualAdjustments.holidayDaysOverride);
    } else {
         holidayDaysWorked = Number(attendanceDetails.holidayDays) || 0;
    }
    // Sobretasa (normalmente se paga doble extra por trabajar feriado)
    const holidayFactor = Number(constants['TASA_FERIADO_TRABAJADO']) || 2.0; 
    const holidayPay = holidayDaysWorked * dailyRate * holidayFactor;

    // B4. BUC (CORREGIDO: Usa daysForBonuses)
    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0; 
    const buc = (dailyRate * daysForBonuses) * bucFactor;

    // B5. Movilidad (CORREGIDO: Usa daysForBonuses)
    const mobilityRate = Number(constants['MOVILIDAD']) || 0; 
    const mobility = daysForBonuses * mobilityRate;

    // B6. Asignación Escolar (30 jornales al año prorrateados sobre días pagados)
    const schoolRate = person.has_children ? (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0) : 0;
    const schoolAssign = daysForSalary * schoolRate;

    // B7. Horas Extras (Reloj Control)
    const he60Hours = Number(attendanceDetails.he60) || 0;
    const he100Hours = Number(attendanceDetails.he100) || 0;
    
    const rate60 = Number(constants['HE_60_PCT']) || 0.60;
    const rate100 = Number(constants['HE_100_PCT']) || 1.00;
    
    const unitHe60 = hourlyRate * (1 + rate60);
    const unitHe100 = hourlyRate * (1 + rate100);
    
    const amountHe60 = he60Hours * unitHe60;
    const amountHe100 = he100Hours * unitHe100;

    // --- C. INGRESOS MANUALES Y BONIFICACIONES ESPECIALES ---
    
    // C1. Bonificación por Altura (7% del Básico por día efectivo)
    const heightDays = Number(manualAdjustments.heightDays || 0);
    const heightBonus = (dailyRate * 0.07) * heightDays;

    // C2. Bonificación por Contacto con Agua (20% del Básico por día efectivo)
    const waterDays = Number(manualAdjustments.waterDays || 0);
    const waterBonus = (dailyRate * 0.20) * waterDays;

    // C3. BAE (Bonificación Alta Especialización)
    const baePercent = Number(person.bae_percent || 0) / 100;
    const baeBonus = basicSalary * baePercent;

    // C4. Horas Extras Manuales / Especiales
    const sundayWorkHours = Number(manualAdjustments.sundayHours || 0);
    const holidayWorkHours = Number(manualAdjustments.holidayHours || 0);
    
    const sundayWorkAmount = (hourlyRate * 2.00) * sundayWorkHours;
    const holidayWorkAmount = (hourlyRate * 2.00) * holidayWorkHours;

    // C5. Bono Voluntario (Imponible)
    const manualBonus = Number(manualAdjustments.bonus) || 0;

    // --- D. BENEFICIOS SOCIALES (Liquidación semanal) ---
    // Se calculan sobre el BÁSICO PAGADO (daysForSalary), igual que en tu Excel (CTS salía 61.32 = 6 días)
    const pctIndemnity = Number(constants['PCT_CTS']) || 0.15;
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;
    const pctGratification = Number(constants['PCT_GRATIFICACION']) || 0.21;

    const indemnity = basicSalary * pctIndemnity; 
    const vacation = basicSalary * pctVacation;   
    const gratification = basicSalary * pctGratification; 

    // --- E. TOTALES ---
    // Total Imponible (Afecto a AFP/ONP)
    const taxableIncome = basicSalary + dominical + buc + schoolAssign + 
                          amountHe60 + amountHe100 + 
                          heightBonus + waterBonus + baeBonus + 
                          sundayWorkAmount + holidayWorkAmount + holidayPay + 
                          vacation + gratification + manualBonus;

    // Base imponible para Conafovicer (suele excluir gratificaciones/CTS en algunos criterios, pero aquí usamos el estándar)
    // Ajusta según tu criterio exacto si difiere.
    const conafovicerBase = basicSalary + dominical + holidayPay + manualBonus;

    // Ingresos NO Imponibles
    const viaticos = Number(manualAdjustments.viaticos || 0); 
    
    // Total Bruto
    let totalIncome = taxableIncome + indemnity + mobility + viaticos;

    // --- F. DESCUENTOS ---
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
    const manualDeduction = Number(manualAdjustments.deduction) || 0;
    
    const totalDiscounts = breakdown.total + conafovicer + totalAdvances + manualDeduction;
    
    // Aportes Empleador
    const essalud = taxableIncome * (Number(constants['ESSALUD']) || 0.09);

    // --- G. NETO Y AJUSTE SUELDO PACTADO ---
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
        daysWorked: daysForSalary, // Mostramos los días pagados (6)
        details: { 
            // Conceptos Base
            basicSalary, dominical, buc, mobility, schoolAssign, 
            indemnity, vacation, gratification, holidayPay,
            
            // Conceptos Especiales
            heightBonus, waterBonus, baeBonus,
            sundayWorkAmount, holidayWorkAmount,
            viaticos, salaryAdjustment,

            // Manuales y Descuentos
            manualBonus, manualDeduction,
            pensionAmount: breakdown.total, pensionBreakdown: breakdown,
            conafovicer, essalud, pensionName, pensionRateLabel,
            
            // Metadatos para debug/visualización
            he60: { hours: he60Hours, amount: amountHe60 },
            he100: { hours: he100Hours, amount: amountHe100 },
            unitRates: { daily: dailyRate, school: schoolRate, mobility: mobilityRate },
            daysForBonuses // Útil si quieres mostrar "4 días" en el PDF para BUC
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay
    };
};

export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    // Cálculo simplificado para Staff (Sin cambios)
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