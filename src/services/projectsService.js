// src/services/projectsService.js
import { supabase } from './supabase';

/**
 * Obtiene la lista completa de proyectos ordenada por fecha de creación.
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
    // Nota: No lanzamos error si no hay obreros, es una operación segura.
    await supabase
      .from('workers')
      .update({ project_assigned: 'Sin asignar' })
      .eq('project_assigned', projectName);
      
    // 5. Finalmente, borrar el proyecto
    const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
    if (projectError) throw projectError;

    return true;
  } catch (error) {
    console.error("Error en deleteProjectCascade service:", error);
    throw error;
  }
};