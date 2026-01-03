// src/utils/payrollConfig.js

export const STAFF_FIELDS = [
  {
    title: "Ingresos Regulares (Afectos)",
    fields: [
      { key: 'basicSalary', label: 'Sueldo Básico', type: 'money', highlight: true },
      { key: 'familyAllowance', label: 'Asignación Familiar', type: 'money' },
      { key: 'productionBonus', label: 'Rem. Adic. por Proy.', type: 'money' },
      { key: 'nightBonus', label: 'Bonif. Nocturna', type: 'money' },
      { key: 'holidayWork', label: 'Trabajo Feriado/Descanso', type: 'money' },
    ]
  },
  {
    title: "Horas Extras (Cálculo Manual)",
    fields: [
      { key: 'he25', label: 'Horas Extras 25% (S/.)', type: 'money' },
      { key: 'he35', label: 'Horas Extras 35% (S/.)', type: 'money' },
    ]
  },
  {
    title: "Ingresos No Afectos / Beneficios",
    fields: [
      { key: 'consumptionSurcharge', label: 'Recargo de Consumo', type: 'money' },
      { key: 'vacation', label: 'Vacaciones Pagadas', type: 'money' },
      { key: 'truncatedVacation', label: 'Vacaciones Truncas', type: 'money' },
      { key: 'gratification', label: 'Gratificación Legal', type: 'money' },
      { key: 'cts', label: 'CTS / Liquidación', type: 'money' },
      { key: 'mobility', label: 'Movilidad (Libre Disp.)', type: 'money' },
      { key: 'reimbursements', label: 'Reembolsos / Viáticos', type: 'money' },
      { key: 'otherIncome', label: 'Otros Pagos', type: 'money' },
    ]
  },
  {
    title: "Descuentos al Trabajador",
    fields: [
      { key: 'tardiness', label: 'Tardanza', type: 'money', isDeduction: true },
      { key: 'fifthCategory', label: 'Renta 5ta Categoría', type: 'money', isDeduction: true },
      { key: 'advance', label: 'Adelanto / 1ra Quinc.', type: 'money', isDeduction: true },
      { key: 'internalConsumption', label: 'Consumos / Pavo', type: 'money', isDeduction: true },
      { key: 'eps', label: 'EPS (Salud)', type: 'money', isDeduction: true },
      { key: 'uniforms', label: 'Uniformes / Menaje', type: 'money', isDeduction: true },
      { key: 'otherDeduction', label: 'Otros Descuentos', type: 'money', isDeduction: true },
    ]
  }
];