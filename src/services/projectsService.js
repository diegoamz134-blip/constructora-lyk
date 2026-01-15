// src/services/projectsService.js
import { supabase } from './supabase';

/**
 * Obtiene la lista completa de proyectos ordenada por fecha de creación.
 * (Usado por Admins)
 */
export const getProjects = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

/**
 * Elimina un proyecto y todos sus datos relacionados (Tareas, Logs, Galería)
 * y libera a los obreros asignados.
 * @param {object} project - El objeto proyecto completo a eliminar
 */
export const deleteProjectCascade = async (project) => {
  const id = project.id;
  const projectName = project.name;

  try {
    // 1. Borrar tareas relacionadas
    const { error: taskError } = await supabase.from('project_tasks').delete().eq('project_id', id);
    if (taskError) throw taskError;

    // 2. Borrar bitácoras diarias (logs)
    const { error: logError } = await supabase.from('daily_logs').delete().eq('project_id', id);
    if (logError) throw logError;

    // 3. Borrar galería de fotos
    const { error: galleryError } = await supabase.from('project_gallery').delete().eq('project_id', id);
    if (galleryError) throw galleryError;

    // 4. Liberar obreros asignados (Actualizar estado a 'Sin asignar')
    await supabase
      .from('workers')
      .update({ project_assigned: 'Sin asignar' })
      .eq('project_assigned', projectName);

    // 5. Borrar asignaciones de Residentes/Staff (Tabla intermedia)
    const { error: assignError } = await supabase.from('project_assignments').delete().eq('project_id', id);
    if (assignError) console.warn("No se pudieron borrar asignaciones de staff, posiblemente no existían o ya se borraron por cascada.");

    // 6. Finalmente, borrar el proyecto
    const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
    if (projectError) throw projectError;

    return true;
  } catch (error) {
    console.error("Error en deleteProjectCascade service:", error);
    throw error;
  }
};

// --- NUEVAS FUNCIONES DE ASIGNACIÓN (SISTEMA DE PERMISOS) ---

/**
 * Obtiene los IDs de los proyectos asignados a un empleado específico.
 */
export const getUserProjectIds = async (employeeId) => {
  const { data, error } = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('employee_id', employeeId);

  if (error) throw error;
  return data.map(item => item.project_id);
};

/**
 * Actualiza las asignaciones de proyectos para un empleado.
 * Borra las anteriores y crea las nuevas.
 */
export const updateUserProjectAssignments = async (employeeId, projectIds) => {
  // 1. Eliminar asignaciones existentes para este empleado
  const { error: deleteError } = await supabase
    .from('project_assignments')
    .delete()
    .eq('employee_id', employeeId);
  
  if (deleteError) throw deleteError;

  // 2. Si hay nuevos proyectos seleccionados, insertarlos
  if (projectIds.length > 0) {
    const updates = projectIds.map(pid => ({
      employee_id: employeeId,
      project_id: pid
    }));

    const { error: insertError } = await supabase
      .from('project_assignments')
      .insert(updates);
    
    if (insertError) throw insertError;
  }
};

/**
 * Obtiene Proyectos según el ROL del usuario logueado.
 * - Admin: Ve TODOS los proyectos.
 * - Residente/Staff: Ve SOLO los asignados en project_assignments.
 */
export const getProjectsForUser = async (user) => {
  const role = user?.role || 'staff';
  const userId = user?.id;

  // Si es Admin, retornamos todo
  if (role === 'admin') {
    return await getProjects();
  } 
  
  // Si NO es admin, buscamos sus asignaciones
  else {
    if (!userId) return []; // Seguridad extra

    // 1. Obtener IDs asignados
    const assignedIds = await getUserProjectIds(userId);
    
    // Si no tiene asignaciones, retornamos array vacío
    if (assignedIds.length === 0) return [];

    // 2. Obtener los detalles de esos proyectos específicos
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('id', assignedIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};