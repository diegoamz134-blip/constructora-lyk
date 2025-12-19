import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Save, Settings, DollarSign, Percent, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ConfigurationPage = () => {
  const [constants, setConstants] = useState([]);
  const [afps, setAfps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: constData } = await supabase.from('payroll_constants').select('*').order('id');
      const { data: afpData } = await supabase.from('afp_rates').select('*').order('name');
      setConstants(constData || []);
      setAfps(afpData || []);
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConstantChange = (id, value) => {
    setConstants(prev => prev.map(c => c.id === id ? { ...c, value: parseFloat(value) } : c));
  };

  const handleAfpChange = (id, field, value) => {
    setAfps(prev => prev.map(a => a.id === id ? { ...a, [field]: parseFloat(value) } : a));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Guardar Constantes
      for (const c of constants) {
        await supabase.from('payroll_constants').update({ value: c.value }).eq('id', c.id);
      }
      // Guardar AFPs
      for (const a of afps) {
        await supabase.from('afp_rates').update({
          comision_flujo: a.comision_flujo,
          prima_seguro: a.prima_seguro,
          aporte_obligatorio: a.aporte_obligatorio
        }).eq('id', a.id);
      }
      alert('¡Configuración actualizada correctamente!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando configuración...</div>;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Settings className="text-[#003366]" size={32}/> Configuración del Sistema
            </h1>
            <p className="text-slate-500 mt-1">Administra los valores globales de planilla (Sueldos, AFP, Tasas).</p>
        </div>
        <button 
            onClick={saveChanges}
            disabled={saving}
            className="bg-[#003366] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/20"
        >
            <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* SECCIÓN 1: PARAMETROS SALARIALES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="text-green-600"/> Parámetros de Construcción Civil
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {constants.map((item) => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        {item.description}
                    </label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 focus-within:ring-2 ring-blue-100">
                        <input 
                            type="number" 
                            step={item.key_name.includes('PORCENTAJE') || item.key_name.includes('TASA') ? "0.001" : "0.1"}
                            value={item.value}
                            onChange={(e) => handleConstantChange(item.id, e.target.value)}
                            className="w-full outline-none font-mono font-bold text-slate-700 bg-transparent"
                        />
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                           {item.value < 1 ? '%' : 'S/.'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{item.key_name}</p>
                </div>
            ))}
        </div>
      </div>

      {/* SECCIÓN 2: TASAS AFP */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="text-orange-500"/> Tasas de AFP (Mensual)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">AFP</th>
                        <th className="px-6 py-4">Comisión Flujo</th>
                        <th className="px-6 py-4">Prima Seguro</th>
                        <th className="px-6 py-4">Aporte Obligatorio</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {afps.map((afp) => (
                        <tr key={afp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-700">{afp.name}</td>
                            <td className="px-6 py-4">
                                <input type="number" className="w-24 p-2 border rounded-lg text-center font-mono" step="0.0001" 
                                    value={afp.comision_flujo} onChange={(e) => handleAfpChange(afp.id, 'comision_flujo', e.target.value)} />
                            </td>
                            <td className="px-6 py-4">
                                <input type="number" className="w-24 p-2 border rounded-lg text-center font-mono" step="0.0001" 
                                    value={afp.prima_seguro} onChange={(e) => handleAfpChange(afp.id, 'prima_seguro', e.target.value)} />
                            </td>
                            <td className="px-6 py-4">
                                <input type="number" className="w-24 p-2 border rounded-lg text-center font-mono" step="0.0001" 
                                    value={afp.aporte_obligatorio} onChange={(e) => handleAfpChange(afp.id, 'aporte_obligatorio', e.target.value)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
            <AlertCircle size={16} className="mt-0.5 shrink-0"/>
            <p>Recuerda actualizar estos valores mensualmente según la publicación de la SBS. Los cambios afectarán al cálculo de nuevas planillas.</p>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;