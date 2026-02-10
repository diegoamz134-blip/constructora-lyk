import React, { useState, useEffect } from 'react';
import { 
  X, ShoppingCart, MessageCircle, 
  ChevronDown, Truck, Calculator 
} from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import Swal from 'sweetalert2';

const PurchaseRequestModal = ({ isOpen, onClose, product }) => {
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [quantity, setQuantity] = useState(0);
  
  // Calcular cantidad sugerida (Stock Mínimo x 3 o un valor base)
  useEffect(() => {
    if (isOpen && product) {
      loadProviders();
      // Sugerencia: Si está bajo cero o stock mínimo, pedir al menos 50 o 100 unidades
      const suggested = Math.max(0, (product.stock_min * 5) - product.stock_current);
      setQuantity(suggested > 0 ? suggested : 10); 
    }
  }, [isOpen, product]);

  const loadProviders = async () => {
    try {
      const data = await logisticsService.getProviders();
      setProviders(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedProviderId) {
      Swal.fire('Atención', 'Selecciona un proveedor para enviar el pedido.', 'warning');
      return;
    }

    const provider = providers.find(p => p.id == selectedProviderId);
    if (!provider || !provider.phone) {
      Swal.fire('Error', 'El proveedor seleccionado no tiene número de teléfono.', 'error');
      return;
    }

    // Limpiar número
    const phone = provider.phone.replace(/[^0-9]/g, '');
    
    // Construir mensaje profesional
    const message = `Hola *${provider.name}*, les saluda el área de Logística de Constructora LYK.%0A%0A` +
                    `Estamos requiriendo el siguiente material:%0A` +
                    `📦 *Producto:* ${product.name}%0A` +
                    `🔢 *Cantidad:* ${quantity} ${product.unit}%0A%0A` +
                    `Por favor, confirmar disponibilidad y precio. Gracias.`;

    // Abrir WhatsApp
    window.open(`https://wa.me/51${phone}?text=${message}`, '_blank');
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header de Urgencia */}
        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
          <h3 className="text-white font-bold flex items-center gap-2">
            <ShoppingCart size={20} /> Reabastecer Stock
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
             <p className="text-xs text-slate-500 uppercase font-bold">Producto a pedir</p>
             <p className="text-lg font-black text-slate-800">{product.name}</p>
             <div className="flex gap-4 mt-2 text-sm">
                <span className="text-slate-500">Stock Actual: <b className="text-red-500">{product.stock_current} {product.unit}</b></span>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Proveedor</label>
             <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <select 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 appearance-none"
                  value={selectedProviderId}
                  onChange={(e) => setSelectedProviderId(e.target.value)}
                >
                  <option value="">Seleccionar Proveedor...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cantidad a Pedir</label>
             <div className="relative">
                <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="number" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-700"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{product.unit}</span>
             </div>
          </div>

          <button 
            onClick={handleSendWhatsApp}
            className="w-full py-3.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <MessageCircle size={20} /> Solicitar por WhatsApp
          </button>

        </div>
      </div>
    </div>
  );
};

export default PurchaseRequestModal;