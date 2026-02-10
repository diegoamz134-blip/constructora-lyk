import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Calendar, Hash, MapPin, FileText } from 'lucide-react';
import { logisticsService } from '../../../services/logisticsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const KardexModal = ({ isOpen, onClose, product }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && product) {
      fetchKardex();
    }
  }, [isOpen, product]);

  const fetchKardex = async () => {
    setLoading(true);
    try {
      const data = await logisticsService.getKardex(product.id);
      setMovements(data);
    } catch (error) {
      console.error("Error cargando kardex", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20 flex flex-col max-h-[85vh]">
        
        {/* Encabezado */}
        <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <FileText size={20} className="text-[#003366]"/> 
              Kardex: {product.name}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              Historial de movimientos y trazabilidad
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="p-0 overflow-y-auto flex-1 bg-white">
          {loading ? (
             <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003366] mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm">Cargando historial...</p>
             </div>
          ) : movements.length === 0 ? (
             <div className="py-20 text-center text-slate-400">
                <FileText size={48} className="mx-auto text-slate-200 mb-3"/>
                <p>No hay movimientos registrados para este producto.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Detalle / Proyecto</th>
                  <th className="px-6 py-4 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 text-slate-600 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400"/>
                        {format(new Date(mov.created_at), 'dd MMM yyyy', { locale: es })}
                      </div>
                      <div className="text-xs text-slate-400 pl-6">
                        {format(new Date(mov.created_at), 'HH:mm aaa')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {mov.type === 'ENTRADA' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100/50">
                          <ArrowDownRight size={14}/> Entrada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold border border-orange-100/50">
                          <ArrowUpRight size={14}/> Salida
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {mov.project ? mov.project.name : (mov.reason || 'Sin detalle')}
                        </span>
                        {mov.project && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10}/> Obra designada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">
                       {mov.type === 'ENTRADA' ? '+' : '-'}{mov.quantity} 
                       <span className="text-xs font-normal text-slate-400 ml-1">{product.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
           <div className="text-xs text-slate-400 flex items-center gap-2">
              <Hash size={14} />
              {/* AQUÍ ESTABA EL ERROR: Ahora convertimos a String y usamos padStart */}
              ID Sistema: <span className="font-mono text-slate-600 font-bold">#{String(product.id).padStart(6, '0')}</span>
           </div>
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all shadow-sm"
           >
             Cerrar
           </button>
        </div>
      </div>
    </div>
  );
};

export default KardexModal;