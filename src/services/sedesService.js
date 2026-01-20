import { supabase } from './supabase';

// --- GESTIÓN DE SEDES (CRUD) ---

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

// --- GESTIÓN DE PERSONAL EN SEDES ---

/**
 * Obtiene TODO el personal (Staff) y su sede actual.
 * Usamos 'sedes:sede_id(name)' para ser explícitos con la relación.
 */
export const getStaffWithSede = async () => {
  try {
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, 
        full_name, 
        document_number, 
        position, 
        photo_url,
        sede_id,
        status,
        sedes:sede_id ( name ) 
      `)
      .eq('status', 'Activo') // Solo personal activo
      .order('full_name');

    if (error) {
      console.error("Error Supabase al traer staff:", error);
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error("Error en getStaffWithSede:", err);
    return []; // Retornar array vacío en vez de romper la app
  }
};

/**
 * Asigna (o mueve) un empleado a una sede
 */
export const assignStaffToSede = async (employeeId, sedeId) => {
  const { error } = await supabase
    .from('employees')
    .update({ sede_id: sedeId })
    .eq('id', employeeId);

  if (error) throw error;
  return true;
};

/**
 * Remueve un empleado de una sede
 */
export const removeStaffFromSede = async (employeeId) => {
  const { error } = await supabase
    .from('employees')
    .update({ sede_id: null })
    .eq('id', employeeId);

  if (error) throw error;
  return true;
};