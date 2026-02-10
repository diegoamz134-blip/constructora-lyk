import React, { useState } from 'react';
import { 
  Package, Truck, ShoppingCart, Wrench, 
  AlertTriangle, TrendingUp, Plus, FileText, 
  Search, Filter, ClipboardList, MapPin 
} from 'lucide-react';

// --- COMPONENTES SIMULADOS PARA LAS PESTAÑAS (Luego los separaremos en archivos) ---

const InventoryView = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-bold text-slate-800 text-lg">Inventario General</h3>
      <div className="flex gap-2">
        <div className="relative">
           <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
           <input type="text" placeholder="Buscar producto..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 w-64"/>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900 transition-all">
           <Plus size={18}/> Nuevo Producto
        </button>
      </div>
    </div>
    
    {/* Tabla Placeholder */}
    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
       <Package size={48} className="mx-auto text-slate-300 mb-3"/>
       <p className="text-slate-500 font-medium">Aquí cargaremos la tabla de productos desde Supabase.</p>
       <p className="text-xs text-slate-400">Tabla: logistics_products</p>
    </div>
  </div>
);

const ProvidersView = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in">
    <div className="flex justify-between items-center mb-6">
      <h3 className="font-bold text-slate-800 text-lg">Directorio de Proveedores</h3>
      <button className="flex items-center gap-2 px-4 py-2 bg-[#003366] text-white rounded-xl font-bold text-sm hover:bg-blue-900 transition-all">
           <Plus size={18}/> Registrar Proveedor
      </button>
    </div>
    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
       <Truck size={48} className="mx-auto text-slate-300 mb-3"/>
       <p className="text-slate-500 font-medium">Gestión de proveedores y calificaciones.</p>
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

const LogisticsPage = () => {
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      
      {/* ENCABEZADO PRINCIPAL */}
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

      {/* TARJETAS DE RESUMEN (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Valor Inventario" value="S/ 0.00" icon={Package} color="bg-blue-600" />
        <SummaryCard title="Alertas Stock" value="0" icon={AlertTriangle} color="bg-red-500" />
        <SummaryCard title="Órdenes Activas" value="0" icon={ShoppingCart} color="bg-indigo-600" />
        <SummaryCard title="Activos / Equipos" value="0" icon={Wrench} color="bg-orange-600" />
      </div>

      {/* BARRA DE NAVEGACIÓN (TABS) */}
      <div className="flex overflow-x-auto pb-2 gap-2 border-b border-slate-200 no-scrollbar">
          {[
            { id: 'inventory', label: 'Inventario', icon: Package },
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

      {/* CONTENIDO DINÁMICO */}
      <div className="min-h-[400px]">
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'providers' && <ProvidersView />}
        {activeTab === 'orders' && (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
                <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4"/>
                <h3 className="text-lg font-bold text-slate-400">Módulo de Compras</h3>
                <p className="text-slate-400">Próximamente: Gestión de Requerimientos y Órdenes de Compra.</p>
            </div>
        )}
        {activeTab === 'assets' && (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
                <Wrench size={48} className="mx-auto text-slate-200 mb-4"/>
                <h3 className="text-lg font-bold text-slate-400">Módulo de Activos</h3>
                <p className="text-slate-400">Próximamente: Control de Maquinaria y Mantenimientos.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Componente auxiliar para tarjetas
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