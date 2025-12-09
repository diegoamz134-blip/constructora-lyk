import React from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, Activity } from 'lucide-react';

const DashboardPage = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Banner de Bienvenida */}
      <div className="bg-[#0F172A] p-8 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Bienvenido al Panel de Control L&K</h2>
          <p className="text-blue-200">Resumen general de operaciones de la constructora.</p>
        </div>
        <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-white/10 w-40 h-40" />
      </div>

      {/* KPIs Generales de la Empresa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <Building2 />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">12</h3>
          <p className="text-slate-500 text-sm">Obras en Ejecución</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
            <TrendingUp />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">94%</h3>
          <p className="text-slate-500 text-sm">Cumplimiento de Plazos</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Activity />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">85</h3>
          <p className="text-slate-500 text-sm">Personal Activo Total</p>
        </div>
      </div>

    </motion.div>
  );
};

export default DashboardPage;