import { supabase } from './supabase';

// Obtener historial de un obrero
export const getWorkerEPPs = async (workerId) => {
  const { data, error } = await supabase
    .from('epp_records')
    .select('*')
    .eq('worker_id', workerId)
    .order('delivery_date', { ascending: false });

  if (error) throw error;
  return data;
};

// Registrar nueva entrega de EPP
export const assignEPP = async (eppData, file) => {
  try {
    let fileUrl = null;

    // 1. Subir foto del cargo (si hay)
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `epp_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ssoma')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('ssoma').getPublicUrl(filePath);
      fileUrl = data.publicUrl;
    }

    // 2. Guardar registro en base de datos
    const { data, error } = await supabase
      .from('epp_records')
      .insert([{
        ...eppData,
        file_url: fileUrl
      }])
      .select();

    if (error) throw error;
    return data[0];

  } catch (error) {
    console.error("Error asignando EPP:", error);
    throw error;
  }
};

// Eliminar registro (por si hubo error)
export const deleteEPPRecord = async (id) => {
  const { error } = await supabase
    .from('epp_records')
    .delete()
    .eq('id', id);
  if (error) throw error;
};