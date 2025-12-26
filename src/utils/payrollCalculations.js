/**
 * Calcula la planilla semanal para un OBRERO (Régimen Construcción Civil)
 * CORREGIDO: Base imponible correcta, Conafovicer ajustado y Gratificación añadida.
 */
export const calculateWorkerPay = (person, daysWorked, totalAdvances, constants, afpRates, heHours = { he60: 0, he100: 0 }) => {
    const catUpper = (person.category || 'PEON').toUpperCase();
    
    // 1. Tasas Unitarias
    let dailyRate = Number(constants[`JORNAL_${catUpper}`]) || 0;
    if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) {
        dailyRate = Number(person.custom_daily_rate);
    }
    const hourlyRate = dailyRate / 8; 

    // 2. Ingresos Básicos
    const basicSalary = daysWorked * dailyRate;
    
    // Dominical: Se paga 1 jornal si trabajó la semana completa (o proporcional)
    // Nota: En construcción a veces es proporcional, a veces fijo por semana completa. Usamos la lógica estándar.
    const dominicalDays = (daysWorked >= 6) ? 1 : (daysWorked / 6); 
    const dominical = dominicalDays * dailyRate;

    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0; // Ej: 0.32 Operario, 0.30 Peon
    const buc = basicSalary * bucFactor;

    const mobilityRate = Number(constants['MOVILIDAD']) || 0; // Ej: 8.00
    const mobility = daysWorked * mobilityRate;

    const schoolRate = person.has_children ? (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0) : 0;
    const schoolAssign = daysWorked * schoolRate;

    // 3. Horas Extras
    const rate60 = Number(constants['HE_60_PCT']) || 0.60;
    const rate100 = Number(constants['HE_100_PCT']) || 1.00;
    
    const unitHe60 = hourlyRate * (1 + rate60);
    const unitHe100 = hourlyRate * (1 + rate100);
    const amountHe60 = (heHours.he60 || 0) * unitHe60;
    const amountHe100 = (heHours.he100 || 0) * unitHe100;

    // 4. Liquidación Semanal (Beneficios Sociales)
    const pctIndemnity = Number(constants['PCT_INDEMNIZACION']) || 0.15; // CTS (15%) - NO AFECTO
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;     // Vacaciones (10%) - AFECTO
    const pctGratification = Number(constants['PCT_GRATIFICACION']) || 0.21; // Gratificación (aprox 21% o según param) - AFECTO

    const indemnity = basicSalary * pctIndemnity; // CTS
    const vacation = basicSalary * pctVacation;   // Vacaciones
    const gratification = basicSalary * pctGratification; // Gratificaciones Truncas

    // ----------------------------------------------------------------------
    // CÁLCULO DE BASES IMPONIBLES (CRUCIAL PARA QUE CUADRE CON EXCEL)
    // ----------------------------------------------------------------------
    
    // A. Base para AFP/ONP y EsSalud (Remuneración Asegurable)
    // Generalmente: Básico + Dominical + BUC + Vacaciones + Gratificación + H.E. + Asig. Escolar
    // EXCLUYE: CTS (Indemnity) y Movilidad
    const taxableIncome = basicSalary + dominical + buc + schoolAssign + amountHe60 + amountHe100 + vacation + gratification;

    // B. Base para Conafovicer (Básico + Dominical)
    const conafovicerBase = basicSalary + dominical;

    // C. Total de Ingresos (Bolsillo del trabajador)
    const totalIncome = taxableIncome + indemnity + mobility;

    // 5. Descuentos
    let pensionName = person.pension_system || 'ONP';
    let pensionRateLabel = '';
    
    // Desglose de Pensiones
    let breakdown = {
        obligatory: 0,
        insurance: 0, 
        commission: 0,
        total: 0
    };

    if (pensionName === 'ONP') {
        const rate = Number(constants['ONP_TASA']) || 0.13;
        breakdown.obligatory = taxableIncome * rate; // USA BASE IMPONIBLE, NO TOTAL
        breakdown.total = breakdown.obligatory;
        pensionRateLabel = `${(rate*100).toFixed(0)}%`;
        pensionName = 'ONP';
    } else if (pensionName === 'Sin Régimen') {
        pensionName = 'Sin Régimen';
        pensionRateLabel = '0%';
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const commissionRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            const insuranceRate = Number(myAfp.prima_seguro);
            const obligRate = Number(myAfp.aporte_obligatorio);

            breakdown.obligatory = taxableIncome * obligRate; // USA BASE IMPONIBLE
            breakdown.insurance = taxableIncome * insuranceRate;
            breakdown.commission = taxableIncome * commissionRate;
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            
            const typeLabel = isMixta ? '(M)' : '(F)';
            pensionName = `AFP ${myAfp.name} ${typeLabel}`;
            pensionRateLabel = `${((obligRate+insuranceRate+commissionRate)*100).toFixed(2)}%`;
        } else {
            // Fallback
            breakdown.total = taxableIncome * 0.13; 
            breakdown.obligatory = breakdown.total;
            pensionRateLabel = 'Ref';
        }
    }

    // CONAFOVICER: 2% del (Básico + Dominical)
    const conafovicer = conafovicerBase * (Number(constants['CONAFOVICER']) || 0.02);
    const unionDues = 0; 

    const totalDiscounts = breakdown.total + conafovicer + unionDues + totalAdvances;
    
    // Aportes Empleador (EsSalud sobre Base Imponible)
    const essalud = taxableIncome * (Number(constants['ESSALUD']) || 0.09);
    const sctrPension = 0; 
    const sctrSalud = 0; 

    return {
        person,
        type: 'worker',
        daysWorked,
        details: { 
            basicSalary, dominical, buc, mobility, schoolAssign, 
            indemnity, vacation, gratification, // Agregado Gratificación
            pensionAmount: breakdown.total, 
            pensionBreakdown: breakdown,
            conafovicer, unionDues,
            essalud, sctrPension, sctrSalud,
            pensionName, pensionRateLabel,
            unitRates: {
                daily: dailyRate,
                mobility: mobilityRate,
                school: schoolRate,
                he60: unitHe60,
                he100: unitHe100
            },
            dominicalDays,
            he60: { hours: heHours.he60 || 0, amount: amountHe60 },
            he100: { hours: heHours.he100 || 0, amount: amountHe100 },
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};

// ... (calculateStaffPay se mantiene igual o puedes aplicar lógica similar si es necesario)
export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    // Lógica staff (similar ajuste en desglose si fuera necesario, por ahora mantenemos estructura básica compatible)
    const monthlySalary = Number(person.salary) || 0;
    const payBasico = (monthlySalary / 30) * daysWorked;
    const rmv = Number(constants['STAFF_RMV']) || 1025;
    const asigFamPct = Number(constants['STAFF_ASIG_FAMILIAR_PCT']) || 0.10;
    const monthlyAsigFam = person.has_children ? (rmv * asigFamPct) : 0;
    const payAsigFam = (monthlyAsigFam / 30) * daysWorked; 
    
    // STAFF usualmente todo es imponible excepto movilidad supeditada, aquí asumimos simple
    const totalIncome = payBasico + payAsigFam; 

    // Descuentos Staff
    let pensionName = person.pension_system || 'ONP';
    let breakdown = { obligatory: 0, insurance: 0, commission: 0, total: 0 };
    
    if (pensionName === 'ONP') {
        breakdown.total = totalIncome * (Number(constants['STAFF_TASA_ONP']) || 0.13);
        breakdown.obligatory = breakdown.total;
        pensionName = 'ONP';
    } else if (pensionName === 'Sin Régimen') {
        breakdown.total = 0;
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const isMixta = person.commission_type === 'Mixta';
            const commRate = isMixta ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            breakdown.obligatory = totalIncome * Number(myAfp.aporte_obligatorio);
            breakdown.insurance = totalIncome * Number(myAfp.prima_seguro);
            breakdown.commission = totalIncome * commRate;
            breakdown.total = breakdown.obligatory + breakdown.insurance + breakdown.commission;
            
            const typeLabel = isMixta ? '(M)' : '(F)';
            pensionName = `AFP ${myAfp.name} ${typeLabel}`;
        } else {
            breakdown.total = totalIncome * 0.13;
            breakdown.obligatory = breakdown.total;
        }
    }

    const totalDiscounts = breakdown.total + totalAdvances;
    const essalud = totalIncome * (Number(constants['STAFF_TASA_ESSALUD']) || 0.09);

    return {
        person,
        type: 'staff',
        daysWorked,
        details: { 
            basicSalary: payBasico, familyAllowance: payAsigFam, 
            pensionAmount: breakdown.total, pensionBreakdown: breakdown, // Compatible
            pensionName, essalud 
        },
        totalIncome, totalDiscounts, totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};