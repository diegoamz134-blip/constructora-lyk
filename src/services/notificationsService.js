import { supabase } from './supabase';

// Enviar solicitud
export const sendUnlockRequest = async (user, status, isWorker) => {
  try {
    const roleType = isWorker ? 'Obrero' : 'Administrativo';
    const targetRoles = ['jefe_rrhh', 'asistente_rrhh', 'admin', 'gerencia_general'];

    const { error } = await supabase.from('notifications').insert([{
      type: 'unlock_request',
      title: `Solicitud de Acceso: ${user.full_name}`,
      message: `El usuario ${roleType} intenta ingresar pero está en estado "${status}". Solicita habilitación.`,
      target_roles: targetRoles,
      data: {
        user_id: user.id,
        user_name: user.full_name,
        document: user.document_number,
        current_status: status,
        user_type: isWorker ? 'worker' : 'staff'
      }
    }]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error enviando notificación:", error);
    throw error;
  }
};

// Obtener notificaciones
export const getNotifications = async (userRole) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('read', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(20);

    if (userRole) {
       query = query.contains('target_roles', [userRole]);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return [];
  }
};

// Marcar como leída
export const markAsRead = async (id) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
      
    if (error) throw error;
  } catch (error) {
    console.error("Error marcando lectura:", error);
  }
};

// --- NUEVO: ELIMINAR NOTIFICACIÓN ---
export const deleteNotification = async (id) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (error) {
    console.error("Error eliminando notificación:", error);
    throw error;
  }
};