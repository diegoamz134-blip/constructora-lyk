// Fíjate cómo importamos desde services
import { supabase } from '../services/supabase'; 

export const getUsuarios = async () => {
  const { data, error } = await supabase.from('users').select('*');
  return data;
};