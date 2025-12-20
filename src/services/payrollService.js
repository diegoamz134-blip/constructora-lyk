// src/services/payrollService.js
import { supabase } from './supabase';

/**
 * Obtiene todas las constantes de nómina (UIT, RMV, Tasas).
 */
export const getPayrollConstants = async () => {
  const { data, error } = await supabase.from('payroll_constants').select('*');
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene las tasas de AFP actuales.
 */
export const getAfpRates = async () => {
  const { data, error } = await supabase.from('afp_rates').select('*');
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene el personal activo (TODOS - Versión Legacy/Pequeña).
 * Útil para selectores o listas pequeñas.
 */
export const getActivePersonnel = async (table) => {
  const { data, error } = await supabase.from(table).select('*').eq('status', 'Activo');
  if (error) throw error;
  return data || [];
};

// --- NUEVAS FUNCIONES PARA PAGINACIÓN EN SERVIDOR ---

/**
 * Obtiene la CANTIDAD TOTAL de personal activo (para calcular número de páginas).
 */
export const getActivePersonnelCount = async (table) => {
  // count: 'exact' nos devuelve el número total sin traer los datos
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true }) 
    .eq('status', 'Activo');
  
  if (error) throw error;
  return count || 0;
};

/**
 * Obtiene el personal activo PAGINADO (Solo el bloque solicitado).
 * Usa .range(desde, hasta) de Supabase.
 */
export const getPaginatedActivePersonnel = async (table, page, pageSize) => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('status', 'Activo')
    .order('full_name', { ascending: true }) // Importante ordenar para que la paginación sea consistente
    .range(from, to);
  
  if (error) throw error;
  return data || [];
};

// ----------------------------------------------------

/**
 * Obtiene los registros de asistencia dentro de un rango de fechas.
 */
export const getAttendanceByRange = async (start, end) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return data || [];
};

/**
 * Obtiene los adelantos otorgados dentro de un rango de fechas.
 */
export const getAdvancesByRange = async (start, end) => {
  const { data, error } = await supabase
    .from('advances')
    .select('*')
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return data || [];
};