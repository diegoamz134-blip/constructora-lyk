// src/utils/payrollCalculations.js

/**
 * Calcula la planilla semanal para un OBRERO (Régimen Construcción Civil)
 */
export const calculateWorkerPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    const catUpper = (person.category || 'PEON').toUpperCase();
    
    // 1. Determinar Jornal Diario
    let dailyRate = Number(constants[`JORNAL_${catUpper}`]) || 0;
    if (person.custom_daily_rate && Number(person.custom_daily_rate) > 0) {
        dailyRate = Number(person.custom_daily_rate);
    }

    // 2. Calcular Ingresos
    const basicSalary = daysWorked * dailyRate;
    const dominical = (daysWorked === 6) ? dailyRate : 0; // Se paga si cumple la semana (6 días)
    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0;
    const buc = basicSalary * bucFactor;
    const mobility = daysWorked * (Number(constants['MOVILIDAD']) || 0);
    const schoolAssign = person.has_children ? (daysWorked * (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0)) : 0;

    const totalIncome = basicSalary + dominical + buc + mobility + schoolAssign;

    // 3. Calcular Descuentos (Pensiones)
    let pensionAmount = 0;
    let pensionName = person.pension_system || 'ONP';

    if (pensionName === 'ONP') {
        pensionAmount = totalIncome * (Number(constants['ONP_TASA']) || 0.13);
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const commission = person.commission_type === 'Mixta' ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            const totalRate = Number(myAfp.aporte_obligatorio) + Number(myAfp.prima_seguro) + commission;
            pensionAmount = totalIncome * totalRate;
            pensionName = `AFP ${myAfp.name} (${person.commission_type || 'Flujo'})`;
        } else {
            // Fallback si no encuentra la AFP
            pensionAmount = totalIncome * 0.13;
            pensionName += ' (Ref. 13%)';
        }
    }

    // Otros Descuentos
    const conafovicer = basicSalary * (Number(constants['CONAFOVICER']) || 0.02);
    const totalDiscounts = pensionAmount + conafovicer + totalAdvances;
    
    // Aportes del Empleador (Info)
    const essalud = totalIncome * (Number(constants['ESSALUD']) || 0.09);

    return {
        person,
        type: 'worker',
        daysWorked,
        details: { 
            basicSalary, 
            dominical, 
            buc, 
            mobility, 
            schoolAssign, 
            pensionAmount, 
            conafovicer, 
            essalud, 
            pensionName 
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};

/**
 * Calcula la planilla mensual para STAFF (Régimen Común)
 */
export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    const monthlySalary = Number(person.salary) || 0;

    // 1. Ingresos (Prorrateados a 30 días)
    const payBasico = (monthlySalary / 30) * daysWorked;

    const rmv = Number(constants['STAFF_RMV']) || 1025;
    const asigFamPct = Number(constants['STAFF_ASIG_FAMILIAR_PCT']) || 0.10;
    const monthlyAsigFam = person.has_children ? (rmv * asigFamPct) : 0;
    const payAsigFam = (monthlyAsigFam / 30) * daysWorked; 

    const totalIncome = payBasico + payAsigFam;

    // 2. Descuentos (Pensiones)
    let pensionAmount = 0;
    let pensionName = person.pension_system || 'ONP';

    if (pensionName === 'ONP') {
        const onpRate = Number(constants['STAFF_TASA_ONP']) || 0.13;
        pensionAmount = totalIncome * onpRate;
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
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

    const totalDiscounts = pensionAmount + totalAdvances;

    // Aportes Empleador
    const essaludRate = Number(constants['STAFF_TASA_ESSALUD']) || 0.09;
    const essalud = totalIncome * essaludRate;

    return {
        person,
        type: 'staff',
        daysWorked,
        details: { 
            basicSalary: payBasico, 
            familyAllowance: payAsigFam, 
            pensionAmount, 
            pensionName, 
            essalud 
        },
        totalIncome,
        totalDiscounts,
        totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};