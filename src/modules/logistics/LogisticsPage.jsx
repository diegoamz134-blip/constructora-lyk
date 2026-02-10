import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, ShoppingCart, Wrench, 
  AlertTriangle, Plus, FileText, Search, 
  ArrowUpRight, ArrowDownRight, Archive,
  Building2, Phone, Mail, MapPin, Star, User,
  MessageCircle, Pencil, Trash2, Calendar, DollarSign,
  FileCheck, Clock, XCircle, MoreVertical, CheckCircle
} from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import CreateProductModal from './components/CreateProductModal';
import CreateProviderModal from './components/CreateProviderModal';
import CreateOrderModal from './components/CreateOrderModal';
import KardexModal from './components/KardexModal';
import PurchaseRequestModal from './components/PurchaseRequestModal';
import Swal from 'sweetalert2';
import { format } from 'date-fns';

// --- VISTA DE INVENTARIO ---
const InventoryView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false); 

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await logisticsService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setProductToEdit(product);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (product) => {
    const result = await Swal.fire({
      title: '¿Eliminar producto?',
      text: `Se eliminará "${product.name}" del inventario.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await logisticsService.deleteProduct(product.id);
        fetchProducts();
        Swal.fire('Eliminado', 'Producto eliminado correctamente.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar (puede tener movimientos asociados).', 'error');
      }
    }
  };

  const handleRestock = (product) => {
    setSelectedProduct(product);
    setIsPurchaseOpen(true);
  };

  const handleOpenKardex = (product) => {
    setSelectedProduct(product);
    setIsKardexOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setProductToEdit(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="font-bold text-slate-800 text-lg">Inventario General</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
             <input 
               type="text" 
               placeholder="Buscar producto..." 
               className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 w-full md:w-64"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20"
          >
             <Plus size={18}/> Nuevo Producto
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-10 text-slate-500">Cargando inventario...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <Package size={48} className="mx-auto text-slate-300 mb-3"/>
           <p className="text-slate-500 font-medium">No se encontraron productos.</p>
        </div>
      ) : (
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-100 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Ubicación</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filteredProducts.map((product) => {
                const isLowStock = product.stock_current <= product.stock_min;
                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLowStock ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Package size={16} />
                      </div>
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">
                        {product.category?.name || 'Gral.'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{product.location || '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">
                      {product.stock_current} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLowStock ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">
                            <AlertTriangle size={12}/> Bajo Stock
                          </span>
                          <button 
                             onClick={() => handleRestock(product)}
                             className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 underline decoration-dotted flex items-center gap-1 animate-pulse"
                          >
                             <ShoppingCart size={10}/> Reponer
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                          <Archive size={12}/> En Stock
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenKardex(product)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Movimientos">
                          <FileText size={16}/>
                        </button>
                        <button onClick={() => handleEdit(product)} className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Editar">
                          <Pencil size={16}/>
                        </button>
                        <button onClick={() => handleDelete(product)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALES */}
      <CreateProductModal 
        isOpen={isCreateModalOpen} 
        onClose={handleCloseCreateModal}
        onProductCreated={fetchProducts}
        productToEdit={productToEdit}
      />

      <KardexModal 
        isOpen={isKardexOpen}
        onClose={() => setIsKardexOpen(false)}
        product={selectedProduct}
      />

      <PurchaseRequestModal 
        isOpen={isPurchaseOpen}
        onClose={() => setIsPurchaseOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};

// --- VISTA DE PROVEEDORES ---
const ProvidersView = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchProviders(); }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await logisticsService.getProviders();
      setProviders(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleEdit = (provider) => { setEditingProvider(provider); setIsModalOpen(true); };
  
  const handleDelete = async (provider) => {
    const result = await Swal.fire({
      title: '¿Eliminar proveedor?', text: `Se borrará a "${provider.name}".`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Eliminar'
    });
    if (result.isConfirmed) {
      await logisticsService.deleteProvider(provider.id);
      fetchProviders();
      Swal.fire('Eliminado', '', 'success');
    }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingProvider(null); };

  const filteredProviders = providers.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
         <h3 className="font-bold text-slate-800 text-lg">Directorio de Proveedores</h3>
         <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:flex-none">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
             <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
           </div>
           <button onClick={() => {setEditingProvider(null); setIsModalOpen(true);}} className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900"><Plus size={18}/> Nuevo</button>
         </div>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {filteredProviders.map(provider => (
           <div key={provider.id} className="relative border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all group bg-white">
             <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(provider)} className="p-1.5 bg-slate-100 hover:text-blue-600 rounded-lg"><Pencil size={14}/></button>
                <button onClick={() => handleDelete(provider)} className="p-1.5 bg-slate-100 hover:text-red-600 rounded-lg"><Trash2 size={14}/></button>
             </div>
             <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Building2 size={20}/></div>
                <div><h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{provider.name}</h4><p className="text-xs text-slate-500 font-mono">{provider.ruc || 'Sin RUC'}</p></div>
             </div>
             <div className="flex gap-2 mt-4">
                 <a href={`https://wa.me/51${provider.phone?.replace(/[^0-9]/g, '')}`} target="_blank" className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl text-center hover:bg-emerald-100 flex items-center justify-center gap-2"><MessageCircle size={16}/> WhatsApp</a>
             </div>
           </div>
         ))}
       </div>
       <CreateProviderModal isOpen={isModalOpen} onClose={handleCloseModal} onProviderSaved={fetchProviders} providerToEdit={editingProvider}/>
    </div>
  );
};

// --- VISTA DE ÓRDENES ---
const OrdersView = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await logisticsService.getOrders();
      setOrders(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDeleteOrder = async (orderId) => {
    const r = await Swal.fire({ title: 'Eliminar Orden?', text: 'Esta acción no se puede deshacer.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' });
    if(r.isConfirmed) { await logisticsService.deleteOrder(orderId); fetchOrders(); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    // Si vamos a recibir, pedir confirmación especial
    if (newStatus === 'Recibido') {
       const confirm = await Swal.fire({
          title: '¿Confirmar Recepción?',
          text: "Al marcar como 'Recibido', el stock de los productos se actualizará automáticamente en el inventario.",
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#10b981',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Sí, recibir mercadería'
       });

       if (!confirm.isConfirmed) return;
    }

    try {
      await logisticsService.updateOrderStatus(orderId, newStatus);
      
      if (newStatus === 'Recibido') {
         Swal.fire({
            icon: 'success',
            title: '¡Stock Actualizado!',
            text: 'Los productos han sido sumados al inventario.',
            timer: 2000
         });
      }
      fetchOrders();

    } catch (error) {
       console.error(error);
       Swal.fire('Error', error.message || 'No se pudo actualizar la orden', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pendiente': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case 'Aprobado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Recibido': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Cancelado': return 'bg-slate-50 text-slate-500 border-slate-200';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
       <div className="flex justify-between items-center mb-6">
         <h3 className="font-bold text-slate-800 text-lg">Órdenes de Compra</h3>
         <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900 shadow-lg shadow-blue-900/20">
           <Plus size={18}/> Nueva Orden
         </button>
       </div>

       {loading ? (
         <div className="text-center py-10 text-slate-500">Cargando órdenes...</div>
       ) : orders.length === 0 ? (
         <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <ShoppingCart size={48} className="mx-auto text-slate-300 mb-3"/>
            <p className="text-slate-500">No hay órdenes de compra registradas.</p>
         </div>
       ) : (
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
               <tr>
                 <th className="p-4">ID</th>
                 <th className="p-4">Proveedor</th>
                 <th className="p-4">Fecha</th>
                 <th className="p-4 text-center">Estado</th>
                 <th className="p-4 text-right">Total</th>
                 <th className="p-4 text-center">Acciones</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {orders.map(order => (
                 <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                   <td className="p-4 font-mono font-bold text-slate-600">#{String(order.id).padStart(5, '0')}</td>
                   <td className="p-4">
                     <div className="font-bold text-slate-800">{order.provider?.name}</div>
                     <div className="text-xs text-slate-400">RUC: {order.provider?.ruc}</div>
                   </td>
                   <td className="p-4 text-slate-600 flex items-center gap-2">
                     <Calendar size={14}/> {format(new Date(order.issue_date), 'dd/MM/yyyy')}
                   </td>
                   <td className="p-4 text-center">
                     <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
                       {order.status}
                     </span>
                   </td>
                   <td className="p-4 text-right font-black text-slate-700">
                     S/ {order.total_amount.toFixed(2)}
                   </td>
                   <td className="p-4 flex justify-center gap-2">
                     {/* Acciones por Estado */}
                     {order.status === 'Pendiente' && (
                       <button onClick={() => handleStatusChange(order.id, 'Aprobado')} className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100" title="Aprobar Orden"><FileCheck size={16}/></button>
                     )}
                     
                     {order.status === 'Aprobado' && (
                       <button 
                          onClick={() => handleStatusChange(order.id, 'Recibido')} 
                          className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 animate-pulse" 
                          title="Recibir Mercadería (Sumar Stock)"
                        >
                          <CheckCircle size={16}/>
                        </button>
                     )}

                     <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Eliminar"><Trash2 size={16}/></button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
       
       <CreateOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onOrderCreated={fetchOrders} />
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const LogisticsPage = () => {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Logística y Almacén</h1>
          <p className="text-slate-500 text-sm">Control integral de recursos y suministros.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Ítems" value="--" icon={Package} color="bg-blue-600" />
        <SummaryCard title="Stock Crítico" value="--" icon={AlertTriangle} color="bg-red-500" />
        <SummaryCard title="Órdenes Activas" value="--" icon={ShoppingCart} color="bg-emerald-600" />
        <SummaryCard title="Gasto Mes" value="--" icon={DollarSign} color="bg-orange-600" />
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 no-scrollbar">
          {[
            { id: 'inventory', label: 'Inventario & Kardex', icon: Package },
            { id: 'providers', label: 'Proveedores', icon: Truck },
            { id: 'orders', label: 'Compras / Órdenes', icon: ShoppingCart },
            { id: 'assets', label: 'Maquinaria', icon: Wrench },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-[#003366] text-[#003366] bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'providers' && <ProvidersView />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'assets' && <div className="text-center py-10 text-slate-400 font-medium">Módulo de Activos Fijos en construcción...</div>}
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
    <div><p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p><h3 className="text-2xl font-black text-slate-800">{value}</h3></div>
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}><Icon size={22} /></div>
  </div>
);

export default LogisticsPage;