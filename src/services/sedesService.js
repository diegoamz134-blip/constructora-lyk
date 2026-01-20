import { supabase } from './supabase';

// --- GESTIÓN DE SEDES ---

export const getSedes = async () => {
  const { data, error } = await supabase
    .from('sedes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createSede = async (sedeData) => {
  const { error } = await supabase.from('sedes').insert([sedeData]);
  if (error) throw error;
  return true;
};

export const updateSede = async (id, sedeData) => {
  const { error } = await supabase.from('sedes').update(sedeData).eq('id', id);
  if (error) throw error;
  return true;
};

export const deleteSede = async (id) => {
  const { error } = await supabase.from('sedes').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- GESTIÓN DE PERSONAL CON PAGINACIÓN ---

/**
 * Obtiene personal paginado y busca por nombre/cargo.
 * @param {number} page - Número de página actual (inicia en 1)
 * @param {number} pageSize - Cantidad de registros por página
 * @param {string} search - Texto para filtrar
 */
export const getStaffWithSedePaginated = async (page = 1, pageSize = 10, search = '') => {
  try {
    // Calcular rango para Supabase (índice 0)
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 1. Consulta base de empleados
    let query = supabase
      .from('employees')
      .select('id, full_name, document_number, position, avatar_url, sede_id, status', { count: 'exact' })
      .eq('status', 'Activo')
      .order('full_name');

    // 2. Aplicar filtro de búsqueda si existe
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,position.ilike.%${search}%`);
    }

    // 3. Obtener rango (Paginación)
    const { data: employees, count, error: empError } = await query.range(from, to);

    if (empError) throw empError;

    // 4. Traer sedes para el cruce manual (son pocas, se traen todas rápido)
    const { data: sedes, error: sedeError } = await supabase
      .from('sedes')
      .select('id, name');

    if (sedeError) throw sedeError;

    // 5. Cruzamos la información manualmente
    const staffWithSede = employees.map(emp => {
      const sedeInfo = sedes.find(s => s.id === emp.sede_id);
      return {
        ...emp,
        sedes: sedeInfo ? { name: sedeInfo.name } : null
      };
    });
    
    return { data: staffWithSede, total: count };

  } catch (err) {
    console.error("Error en getStaffWithSedePaginated:", err);
    return { data: [], total: 0 }; 
  }
};

export const assignStaffToSede = async (employeeId, sedeId) => {
  if (!employeeId) return;
  const { error } = await supabase
    .from('employees')
    .update({ sede_id: sedeId })
    .eq('id', employeeId);
  if (error) throw error;
  return true;
};

export const removeStaffFromSede = async (employeeId) => {
  return assignStaffToSede(employeeId, null);
};