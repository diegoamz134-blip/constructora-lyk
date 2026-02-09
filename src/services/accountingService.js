import { supabase } from './supabase';

// --- NUEVO: OBTENER EJECUCIÓN PRESUPUESTAL ---
export const getBudgetExecution = async () => {
  try {
    // 1. Traer proyectos activos
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, budget, status')
      .neq('status', 'Finalizado'); // Traemos los que no están cerrados

    if (projectsError) throw projectsError;

    // 2. Traer gastos asignados a proyectos
    const { data: transactions, error: transError } = await supabase
      .from('finance_transactions')
      .select('amount, project_id, type')
      .eq('type', 'Gasto')
      .not('project_id', 'is', null);

    if (transError) throw transError;

    // 3. Calcular gasto por proyecto
    const stats = projects.map(p => {
      const spent = transactions
        .filter(t => t.project_id === p.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const percentage = p.budget > 0 ? (spent / p.budget) * 100 : 0;
      
      return { 
        ...p, 
        spent, 
        percentage,
        remaining: p.budget - spent
      };
    });

    // Ordenar por mayor porcentaje de gasto
    return stats.sort((a, b) => b.percentage - a.percentage);
  } catch (error) {
    console.error("Error calculando presupuestos:", error);
    return [];
  }
};

// --- NUEVO: EXPORTAR A CSV ---
export const exportTransactionsToCSV = (transactions) => {
  // Encabezados
  const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Proyecto', 'Documento', 'Usuario'];
  
  // Filas
  const rows = transactions.map(t => [
    t.id,
    t.date,
    t.type,
    t.category,
    `"${t.description.replace(/"/g, '""')}"`, // Escapar comillas
    t.amount,
    t.projects ? t.projects.name : 'Gasto General',
    t.reference_document || '-',
    'Sistema'
  ]);

  // Unir todo
  const csvContent = [
    headers.join(','), 
    ...rows.map(r => r.join(','))
  ].join('\n');

  // Crear Blob y descargar
  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `reporte_contable_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- (El resto de funciones se mantienen igual) ---

export const getTransactions = async ({ page = 1, pageSize = 5, filters = {} }) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('finance_transactions')
      .select(`
        *,
        projects ( id, name )
      `, { count: 'exact' });

    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);
    if (filters.category && filters.category !== 'Todas') query = query.eq('category', filters.category);
    if (filters.projectId) query = query.eq('project_id', filters.projectId);
    if (filters.search) query = query.ilike('description', `%${filters.search}%`);

    query = query.order('date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count };
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw error;
  }
};

export const uploadFinanceFile = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('finance')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('finance').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    throw error;
  }
};

export const createTransaction = async (transaction) => {
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert([transaction])
    .select();

  if (error) throw error;
  return data[0];
};

export const updateTransaction = async (id, updates) => {
  const { data, error } = await supabase
    .from('finance_transactions')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteTransaction = async (id) => {
  const { error } = await supabase
    .from('finance_transactions')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const getFinancialSummary = async () => {
  const { data: transactions } = await supabase
    .from('finance_transactions')
    .select('amount, type');

  const { data: payrolls } = await supabase
    .from('payrolls')
    .select('total_income')
    .eq('status', 'Cerrado');

  let totalIncome = 0;
  let totalExpenses = 0;

  (transactions || []).forEach(t => {
    const amount = parseFloat(t.amount);
    if (t.type === 'Ingreso') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }
  });

  (payrolls || []).forEach(p => {
    totalExpenses += parseFloat(p.total_income || 0);
  });

  return {
    income: totalIncome,
    expenses: totalExpenses,
    balance: totalIncome - totalExpenses
  };
};