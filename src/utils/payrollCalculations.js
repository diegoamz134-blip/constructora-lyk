/**
 * Calcula la planilla semanal para un OBRERO (Régimen Construcción Civil)
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
    // Dominical: Si 6 días trabajados, 1 jornal completo. Si menos, proporcional (aquí simplificado a 1/6 por día trabajado)
    // Para ser exactos con la tabla "X 6 = Total", si daysWorked = 6, dominical = 1 jornal.
    const dominicalUnit = dailyRate; // El valor unitario para mostrar es el jornal
    const dominicalDays = (daysWorked >= 6) ? 1 : (daysWorked / 6); 
    const dominical = dominicalDays * dailyRate;

    const bucFactor = Number(constants[`BUC_${catUpper}`]) || 0;
    const buc = basicSalary * bucFactor;

    const mobilityRate = Number(constants['MOVILIDAD']) || 0;
    const mobility = daysWorked * mobilityRate;

    const schoolRate = person.has_children ? (Number(constants['ASIG_ESCOLAR_DIARIO']) || 0) : 0;
    const schoolAssign = daysWorked * schoolRate;

    // 3. Horas Extras
    const rate60 = Number(constants['HE_60_PCT']) || 0.60;
    const rate100 = Number(constants['HE_100_PCT']) || 1.00;
    // Valor unitario de la hora extra (Hora base + sobretasa)
    const unitHe60 = hourlyRate * (1 + rate60);
    const unitHe100 = hourlyRate * (1 + rate100);
    const amountHe60 = (heHours.he60 || 0) * unitHe60;
    const amountHe100 = (heHours.he100 || 0) * unitHe100;

    // 4. Liquidación Semanal (15% Indemnización + 10% Vacaciones)
    const pctIndemnity = Number(constants['PCT_INDEMNIZACION']) || 0.15;
    const pctVacation = Number(constants['PCT_VACACIONES']) || 0.10;
    
    const indemnity = basicSalary * pctIndemnity;
    const vacation = basicSalary * pctVacation;

    // TOTAL INGRESOS
    const totalIncome = basicSalary + dominical + buc + mobility + schoolAssign + amountHe60 + amountHe100 + indemnity + vacation;

    // 5. Descuentos
    let pensionAmount = 0;
    let pensionName = person.pension_system || 'ONP';
    let pensionRateLabel = '';

    if (pensionName === 'ONP') {
        const rate = Number(constants['ONP_TASA']) || 0.13;
        pensionAmount = totalIncome * rate;
        pensionRateLabel = `${(rate*100).toFixed(0)}%`;
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const commission = person.commission_type === 'Mixta' ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            const totalRate = Number(myAfp.aporte_obligatorio) + Number(myAfp.prima_seguro) + commission;
            pensionAmount = totalIncome * totalRate;
            pensionName = `AFP ${myAfp.name}`;
            pensionRateLabel = `${(totalRate*100).toFixed(2)}%`;
        } else {
            pensionAmount = totalIncome * 0.13;
            pensionRateLabel = '13%';
        }
    }

    const conafovicer = basicSalary * (Number(constants['CONAFOVICER']) || 0.02);
    const totalDiscounts = pensionAmount + conafovicer + totalAdvances;
    
    const essalud = totalIncome * (Number(constants['ESSALUD']) || 0.09);

    return {
        person,
        type: 'worker',
        daysWorked,
        details: { 
            // Valores Totales
            basicSalary, dominical, buc, mobility, schoolAssign, indemnity, vacation,
            pensionAmount, conafovicer, essalud, pensionName, pensionRateLabel,
            // Valores Unitarios para el PDF
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

export const calculateStaffPay = (person, daysWorked, totalAdvances, constants, afpRates) => {
    // Lógica estándar para staff (mensual)
    const monthlySalary = Number(person.salary) || 0;
    const payBasico = (monthlySalary / 30) * daysWorked;
    const rmv = Number(constants['STAFF_RMV']) || 1025;
    const asigFamPct = Number(constants['STAFF_ASIG_FAMILIAR_PCT']) || 0.10;
    const monthlyAsigFam = person.has_children ? (rmv * asigFamPct) : 0;
    const payAsigFam = (monthlyAsigFam / 30) * daysWorked; 
    const totalIncome = payBasico + payAsigFam;

    let pensionAmount = 0;
    let pensionName = person.pension_system || 'ONP';
    if (pensionName === 'ONP') {
        pensionAmount = totalIncome * (Number(constants['STAFF_TASA_ONP']) || 0.13);
    } else {
        const myAfp = afpRates.find(a => pensionName.includes(a.name) || a.name.includes(pensionName));
        if (myAfp) {
            const commission = person.commission_type === 'Mixta' ? Number(myAfp.comision_mixta) : Number(myAfp.comision_flujo);
            const totalRate = Number(myAfp.aporte_obligatorio) + Number(myAfp.prima_seguro) + commission;
            pensionAmount = totalIncome * totalRate;
            pensionName = `AFP ${myAfp.name}`;
        } else {
            pensionAmount = totalIncome * 0.13;
        }
    }

    const totalDiscounts = pensionAmount + totalAdvances;
    const essalud = totalIncome * (Number(constants['STAFF_TASA_ESSALUD']) || 0.09);

    return {
        person,
        type: 'staff',
        daysWorked,
        details: { 
            basicSalary: payBasico, familyAllowance: payAsigFam, pensionAmount, pensionName, essalud 
        },
        totalIncome, totalDiscounts, totalAdvances,
        netPay: totalIncome - totalDiscounts
    };
};