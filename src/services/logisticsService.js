import { supabase } from './supabase';

export const logisticsService = {
  // --- PRODUCTOS ---
  getProducts: async () => {
    const { data, error } = await supabase
      .from('logistics_products')
      .select(`
        *,
        category:logistics_categories(name)
      `)
      .order('name');
    if (error) throw error;
    return data;
  },

  createProduct: async (productData) => {
    const { data, error } = await supabase
      .from('logistics_products')
      .insert([productData])
      .select();
    if (error) throw error;
    return data[0];
  },

  updateProduct: async (id, updates) => {
    const { data, error } = await supabase
      .from('logistics_products')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  // --- CATEGORÍAS ---
  getCategories: async () => {
    const { data, error } = await supabase
      .from('logistics_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  // --- KARDEX (MOVIMIENTOS) ---
  getKardex: async (productId) => {
    const { data, error } = await supabase
      .from('logistics_movements')
      .select(`
        *,
        project:project_id(name)
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  registerMovement: async (movementData) => {
    // 1. Registrar movimiento
    const { data: movement, error: moveError } = await supabase
      .from('logistics_movements')
      .insert([movementData])
      .select()
      .single();
    if (moveError) throw moveError;

    // 2. Actualizar stock (simple)
    const { data: product } = await supabase
      .from('logistics_products')
      .select('stock_current')
      .eq('id', movementData.product_id)
      .single();

    let newStock = Number(product.stock_current);
    if (movementData.type === 'ENTRADA') newStock += Number(movementData.quantity);
    else if (movementData.type === 'SALIDA') newStock -= Number(movementData.quantity);

    await supabase
      .from('logistics_products')
      .update({ stock_current: newStock })
      .eq('id', movementData.product_id);

    return movement;
  },

  // --- PROVEEDORES ---
  getProviders: async () => {
    const { data, error } = await supabase
      .from('logistics_providers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  createProvider: async (providerData) => {
    const { data, error } = await supabase
      .from('logistics_providers')
      .insert([providerData])
      .select();
    if (error) throw error;
    return data[0];
  },

  // [NUEVO] Actualizar proveedor
  updateProvider: async (id, updates) => {
    const { data, error } = await supabase
      .from('logistics_providers')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  deleteProvider: async (id) => {
    const { error } = await supabase
      .from('logistics_providers')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};