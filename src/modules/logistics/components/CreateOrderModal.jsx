import React, { useState, useEffect } from 'react';
import { 
  X, Save, ShoppingCart, Plus, Trash2, 
  Calendar, Truck, Calculator 
} from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';

const CreateOrderModal = ({ isOpen, onClose, onOrderCreated }) => {
  const [loading, setLoading] = useState(false); // Cargando al guardar
  const [loadingData, setLoadingData] = useState(false); // Cargando listas (proveedores/productos)
  
  const [providers, setProviders] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Datos de cabecera
  const [header, setHeader] = useState({
    provider_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    notes: ''
  });

  // Lista de ítems (filas de la orden)
  const [items, setItems] = useState([
    { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  // Cargar datos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setLoadingData(true); // Activamos el indicador de "Cargando..."
    try {
      // Usamos Promise.all para cargar ambos a la vez (más rápido)
      const [provs, prods] = await Promise.all([
        logisticsService.getProviders(),
        logisticsService.getProducts()
      ]);
      setProviders(provs);
      setProducts(prods);
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Error de conexión al cargar listas.', 'error');
    } finally {
      setLoadingData(false); // Desactivamos el indicador
    }
  };

  // Manejar cambios en una fila de ítems
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Calcular subtotal si cambia cantidad o precio
    if (field === 'quantity' || field === 'unit_price') {
      const qty = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].unit_price) || 0;
      newItems[index].total_price = qty * price;
    }

    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.provider_id) {
      Swal.fire('Atención', 'Selecciona un proveedor para continuar.', 'warning');
      return;
    }
    
    // Validar ítems
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      Swal.fire('Atención', 'Agrega al menos un producto válido a la lista.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = calculateTotal();
      const orderData = {
        provider_id: header.provider_id,
        issue_date: header.issue_date,
        delivery_date: header.delivery_date || null,
        notes: header.notes,
        total_amount: totalAmount,
        status: 'Pendiente'
      };

      await logisticsService.createOrder(orderData, validItems);

      Swal.fire({
        icon: 'success',
        title: '¡Orden Generada!',
        text: `Se ha registrado la orden por S/ ${totalAmount.toFixed(2)}`,
        timer: 2000
      });

      onOrderCreated();
      handleClose();

    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo crear la orden. Intente nuevamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Resetear formulario un poco después para que no se vea el parpadeo al cerrar
    setTimeout(() => {
        setHeader({ provider_id: '', issue_date: new Date().toISOString().split('T')[0], delivery_date: '', notes: '' });
        setItems([{ product_id: '', quantity: 1, unit_price: 0, total_price: 0 }]);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-[#003366] px-8 py-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShoppingCart size={24} /> Nueva Orden de Compra
            </h2>
            <p className="text-blue-200 text-sm">Registrar adquisición de materiales</p>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* 1. Datos del Proveedor y Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="space-y-2 md:col-span-1">
               <label className="text-xs font-bold text-slate-500 uppercase">Proveedor</label>
               <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <select 
                    required
                    disabled={loadingData} // Bloqueamos si está cargando
                    className={`w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-[#003366] bg-white appearance-none ${loadingData ? 'text-slate-400' : 'text-slate-700'}`}
                    value={header.provider_id}
                    onChange={(e) => setHeader({...header, provider_id: e.target.value})}
                  >
                    <option value="">
                        {loadingData ? '⏳ Cargando lista...' : 'Seleccionar Proveedor...'}
                    </option>
                    {!loadingData && providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">Fecha Emisión</label>
               <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    type="date" 
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-[#003366]"
                    value={header.issue_date}
                    onChange={(e) => setHeader({...header, issue_date: e.target.value})}
                  />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">Fecha Entrega (Est.)</label>
               <input 
                  type="date" 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:border-[#003366]"
                  value={header.delivery_date}
                  onChange={(e) => setHeader({...header, delivery_date: e.target.value})}
               />
            </div>
          </div>

          {/* 2. Lista de Ítems */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-bold text-slate-700">Detalle de Productos</label>
              <button 
                type="button" 
                onClick={addItemRow}
                className="text-xs font-bold text-[#003366] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Plus size={14}/> Agregar Fila
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 font-semibold text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left w-[40%]">Producto</th>
                    <th className="px-4 py-3 text-center w-[15%]">Cantidad</th>
                    <th className="px-4 py-3 text-right w-[20%]">Precio Unit.</th>
                    <th className="px-4 py-3 text-right w-[20%]">Subtotal</th>
                    <th className="px-2 py-3 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-2 py-2">
                        <select 
                          className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-[#003366]"
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          disabled={loadingData}
                        >
                          <option value="">
                             {loadingData ? 'Cargando...' : 'Seleccionar producto...'}
                          </option>
                          {!loadingData && products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="number" min="1" step="0.01"
                          className="w-full p-2 border border-slate-200 rounded-lg text-center outline-none focus:border-[#003366]"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                           <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">S/</span>
                           <input 
                            type="number" min="0" step="0.01"
                            className="w-full p-2 pl-6 border border-slate-200 rounded-lg text-right outline-none focus:border-[#003366]"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700">
                        S/ {item.total_price.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeItemRow(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end mt-4">
               <div className="bg-[#003366] text-white px-6 py-3 rounded-xl flex items-center gap-4 shadow-lg">
                  <span className="text-sm font-medium opacity-80">TOTAL ORDEN</span>
                  <span className="text-2xl font-black">S/ {calculateTotal().toFixed(2)}</span>
               </div>
            </div>
          </div>

          {/* 3. Notas Adicionales */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Observaciones / Notas</label>
            <textarea 
              rows="3"
              className="w-full mt-1 p-3 border border-slate-300 rounded-xl outline-none focus:border-[#003366]"
              placeholder="Ej: Entrega en la puerta 4, llamar antes de llegar..."
              value={header.notes}
              onChange={(e) => setHeader({...header, notes: e.target.value})}
            />
          </div>

        </form>

        {/* Footer */}
        <div className="border-t border-slate-200 p-6 flex justify-end gap-3 bg-white shrink-0">
          <button onClick={handleClose} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || loadingData} // Bloqueamos si está guardando O cargando datos
            className="px-8 py-3 bg-[#003366] hover:bg-[#002244] text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
                <span>Guardando...</span>
            ) : (
                <><Save size={20}/> Generar Orden</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateOrderModal;