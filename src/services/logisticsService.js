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

  deleteProduct: async (id) => {
    const { error } = await supabase
      .from('logistics_products')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
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

  // --- KARDEX ---
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
    const { data: movement, error: moveError } = await supabase
      .from('logistics_movements')
      .insert([movementData])
      .select()
      .single();
    if (moveError) throw moveError;

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
  },

  // --- ÓRDENES DE COMPRA ---
  getOrders: async () => {
    const { data, error } = await supabase
      .from('logistics_orders')
      .select(`
        *,
        provider:logistics_providers(name, ruc),
        items:logistics_order_items(*)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createOrder: async (orderData, items) => {
    // 1. Crear cabecera
    const { data: order, error: orderError } = await supabase
      .from('logistics_orders')
      .insert([orderData])
      .select()
      .single();
    
    if (orderError) throw orderError;

    // 2. Preparar ítems
    const itemsWithOrderId = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    // 3. Insertar ítems
    const { error: itemsError } = await supabase
      .from('logistics_order_items')
      .insert(itemsWithOrderId);

    if (itemsError) throw itemsError;

    return order;
  },

  // --- AQUÍ ESTÁ LA MAGIA ---
  updateOrderStatus: async (id, status) => {
    // 1. Si el estado es "Recibido", actualizamos el inventario
    if (status === 'Recibido') {
        // A. Verificar que no haya sido recibido antes para no duplicar
        const { data: currentOrder } = await supabase
            .from('logistics_orders')
            .select('status')
            .eq('id', id)
            .single();

        if (currentOrder.status === 'Recibido') {
             throw new Error('Esta orden ya fue recibida anteriormente.');
        }

        // B. Traer los productos de la orden
        const { data: items, error: itemsError } = await supabase
            .from('logistics_order_items')
            .select('*')
            .eq('order_id', id);

        if (itemsError) throw itemsError;

        // C. Bucle: Actualizar cada producto
        for (const item of items) {
            // Traer stock actual
            const { data: product } = await supabase
                .from('logistics_products')
                .select('stock_current')
                .eq('id', item.product_id)
                .single();

            if (product) {
                const newStock = Number(product.stock_current) + Number(item.quantity);

                // Actualizar Producto
                await supabase
                    .from('logistics_products')
                    .update({ stock_current: newStock })
                    .eq('id', item.product_id);

                // Crear movimiento en Kardex
                await supabase
                    .from('logistics_movements')
                    .insert([{
                        product_id: item.product_id,
                        type: 'ENTRADA',
                        quantity: item.quantity,
                        reason: `Recepción Orden Compra #${id}`,
                        created_at: new Date()
                    }]);
            }
        }
    }

    // 2. Finalmente cambiar el estado de la orden
    const { data, error } = await supabase
      .from('logistics_orders')
      .update({ status })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },
  
  deleteOrder: async (id) => {
    const { error } = await supabase
      .from('logistics_orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};