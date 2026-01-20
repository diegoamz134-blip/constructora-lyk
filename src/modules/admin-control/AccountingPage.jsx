import React from 'react';
import { Briefcase, Construction, Clock } from 'lucide-react';

const AccountingPage = () => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
      
      {/* Icono animado */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
        <div className="w-32 h-32 bg-gradient-to-br from-white to-blue-50 rounded-full shadow-xl flex items-center justify-center border border-blue-100 relative z-10">
           <Briefcase size={56} className="text-[#003366]" />
           <div className="absolute -bottom-2 -right-2 bg-amber-100 p-2 rounded-full border border-amber-200">
             <Construction size={24} className="text-amber-600" />
           </div>
        </div>
      </div>

      <h1 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">
        Módulo de Contabilidad
      </h1>
      
      <p className="text-slate-500 max-w-md mx-auto text-lg leading-relaxed mb-8">
        Estamos construyendo herramientas financieras avanzadas para optimizar la gestión contable de <span className="font-bold text-[#003366]">L&K</span>.
      </p>

      {/* Badge de estado */}
      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-[#003366] rounded-full font-bold text-sm shadow-sm border border-blue-100">
        <Clock size={16} className="animate-pulse"/>
        <span>Próximamente Disponible</span>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-2xl w-full">
         <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3 font-bold">1</div>
            <h3 className="font-bold text-slate-700">Facturación</h3>
            <p className="text-xs text-slate-400 mt-1">Gestión electrónica y control de comprobantes.</p>
         </div>
         <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-3 font-bold">2</div>
            <h3 className="font-bold text-slate-700">Caja Chica</h3>
            <p className="text-xs text-slate-400 mt-1">Registro de gastos menores y flujos diarios.</p>
         </div>
         <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 font-bold">3</div>
            <h3 className="font-bold text-slate-700">Balances</h3>
            <p className="text-xs text-slate-400 mt-1">Reportes financieros y estado de resultados.</p>
         </div>
      </div>

    </div>
  );
};

export default AccountingPage;