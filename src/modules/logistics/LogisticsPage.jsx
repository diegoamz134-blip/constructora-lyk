import React, { useState, useEffect } from 'react';
import { 
  Package, Truck, ShoppingCart, Wrench, 
  AlertTriangle, Plus, FileText, Search, 
  ArrowUpRight, ArrowDownRight, Archive,
  Building2, Phone, Mail, MapPin, Star, User,
  MessageCircle, Pencil, Trash2, MoreHorizontal
} from 'lucide-react';
import { logisticsService } from '../../services/logisticsService';
import CreateProductModal from './components/CreateProductModal';
import CreateProviderModal from './components/CreateProviderModal';
import KardexModal from './components/KardexModal';
import Swal from 'sweetalert2';

// --- VISTA DE INVENTARIO ---
const InventoryView = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKardexOpen, setIsKardexOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

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

  const handleOpenKardex = (product) => {
    setSelectedProduct(product);
    setIsKardexOpen(true);
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
           <button onClick={() => setIsCreateModalOpen(true)} className="text-[#003366] font-bold text-sm mt-2 hover:underline">
             Registrar el primero
           </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-100 uppercase tracking-wider">
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Ubicación</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
                <th className="px-4 py-3 font-semibold text-center">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Package size={16} />
                    </div>
                    {product.name}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">
                      {product.category?.name || 'Sin Categoría'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{product.location || '-'}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                    {product.stock_current} <span className="text-xs font-normal text-slate-400">{product.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.stock_current <= product.stock_min ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">
                        <AlertTriangle size={12}/> Bajo Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                        <Archive size={12}/> En Stock
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleOpenKardex(product)}
                      className="text-slate-400 hover:text-[#003366] transition-colors font-medium text-xs underline decoration-dotted cursor-pointer"
                    >
                      Ver Kardex
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProductModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        onProductCreated={fetchProducts}
      />

      <KardexModal 
        isOpen={isKardexOpen}
        onClose={() => setIsKardexOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
};

// --- VISTA DE PROVEEDORES ---
const ProvidersView = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para el modal y edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const data = await logisticsService.getProviders();
      setProviders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setIsModalOpen(true);
  };

  const handleDelete = async (provider) => {
    const result = await Swal.fire({
      title: '¿Eliminar proveedor?',
      text: `Estás a punto de eliminar a "${provider.name}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await logisticsService.deleteProvider(provider.id);
        fetchProviders();
        Swal.fire('Eliminado', 'El proveedor ha sido eliminado.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo eliminar el proveedor.', 'error');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProvider(null); // Limpiar estado de edición
  };

  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ruc?.includes(searchTerm)
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="font-bold text-slate-800 text-lg">Directorio de Proveedores</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
             <input 
               type="text" 
               placeholder="Buscar empresa o RUC..." 
               className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 w-full md:w-64"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900 transition-all shadow-lg shadow-blue-900/20"
          >
             <Plus size={18}/> Registrar Proveedor
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando proveedores...</div>
      ) : filteredProviders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <Truck size={48} className="mx-auto text-slate-300 mb-3"/>
           <p className="text-slate-500 font-medium">No hay proveedores registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map(provider => (
            <div key={provider.id} className="relative border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all hover:border-blue-200 group bg-white">
              
              {/* Botones de Edición (Flotantes) */}
              <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(provider)}
                  className="p-1.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => handleDelete(provider)}
                  className="p-1.5 bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex justify-between items-start mb-3 pr-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                     <Building2 size={20} />
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={provider.name}>{provider.name}</h4>
                     <p className="text-xs text-slate-500 font-mono">{provider.ruc || 'Sin RUC'}</p>
                   </div>
                </div>
              </div>
              
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-lg w-fit mb-4">
                 <Star size={12} className="text-amber-400 fill-amber-400 mr-1"/>
                 <span className="text-xs font-bold text-amber-700">{provider.rating}.0</span>
              </div>

              <div className="space-y-2.5 mt-2 pt-2 border-t border-slate-100">
                 {provider.contact_name && (
                   <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User size={14} className="text-slate-400"/>
                      {provider.contact_name}
                   </div>
                 )}
                 {provider.phone && (
                   <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Phone size={14} className="text-slate-400"/>
                      {provider.phone}
                   </div>
                 )}
                 {provider.email && (
                   <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                      <Mail size={14} className="text-slate-400"/>
                      {provider.email}
                   </div>
                 )}
                 {provider.address && (
                   <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                      <MapPin size={14} className="text-slate-400"/>
                      {provider.address}
                   </div>
                 )}
              </div>

              <div className="flex gap-2 mt-4">
                 {/* BOTÓN WHATSAPP */}
                 <a 
                   href={`https://wa.me/51${provider.phone?.replace(/[^0-9]/g, '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="flex-1 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-xl text-center hover:bg-emerald-100 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                 >
                    <MessageCircle size={16} /> WhatsApp
                 </a>
                 <a 
                   href={`mailto:${provider.email}`} 
                   className="flex-1 py-2 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl text-center hover:bg-slate-100 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2"
                 >
                    <Mail size={16} /> Email
                 </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CONFIGURADO PARA CREAR Y EDITAR */}
      <CreateProviderModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onProviderSaved={fetchProviders}
        providerToEdit={editingProvider}
      />
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
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm">
              <FileText size={18}/> Reportes PDF
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Ítems" value="--" icon={Package} color="bg-blue-600" />
        <SummaryCard title="Stock Crítico" value="--" icon={AlertTriangle} color="bg-red-500" />
        <SummaryCard title="Entradas Mes" value="--" icon={ArrowDownRight} color="bg-emerald-600" />
        <SummaryCard title="Salidas Mes" value="--" icon={ArrowUpRight} color="bg-orange-600" />
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 no-scrollbar">
          {[
            { id: 'inventory', label: 'Inventario & Kardex', icon: Package },
            { id: 'providers', label: 'Proveedores', icon: Truck },
            { id: 'orders', label: 'Compras / Órdenes', icon: ShoppingCart },
            { id: 'assets', label: 'Maquinaria', icon: Wrench },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'border-[#003366] text-[#003366] bg-blue-50/50' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'providers' && <ProvidersView />}
        
        {(activeTab === 'orders' || activeTab === 'assets') && (
           <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
              <Wrench size={48} className="mx-auto text-slate-200 mb-4"/>
              <h3 className="text-lg font-bold text-slate-400">En Desarrollo</h3>
              <p className="text-slate-400 text-sm">Este módulo se habilitará en la siguiente fase.</p>
           </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
    <div>
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
      <Icon size={22} />
    </div>
  </div>
);

export default LogisticsPage;