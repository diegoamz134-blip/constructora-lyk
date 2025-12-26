import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, DollarSign, 
  Briefcase, HardHat, Percent, Calculator, AlertCircle, 
  Shield, TrendingUp, Clock, Award
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import StatusModal from '../../components/common/StatusModal';

const ConfigurationPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('workers'); 
  
  const [formValues, setFormValues] = useState({});
  const [afpRates, setAfpRates] = useState([]);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: constants } = await supabase.from('payroll_constants').select('*');
      const initialValues = {};
      (constants || []).forEach(item => { initialValues[item.key_name] = item.value; });
      setFormValues(initialValues);

      const { data: afps } = await supabase.from('afp_rates').select('*').order('name');
      setAfpRates(afps || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAfpChange = (id, field, value) => {
    setAfpRates(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Guardar Constantes Generales
      const updates = Object.keys(formValues).map(key => ({ key_name: key, value: parseFloat(formValues[key]) }));
      await supabase.from('payroll_constants').upsert(updates, { onConflict: 'key_name' });

      // Guardar Tasas de AFP (Flujo y Mixta)
      const afpUpdates = afpRates.map(afp => ({
        id: afp.id, name: afp.name, 
        comision_flujo: parseFloat(afp.comision_flujo || 0), 
        comision_mixta: parseFloat(afp.comision_mixta || 0),
        prima_seguro: parseFloat(afp.prima_seguro || 0), 
        aporte_obligatorio: parseFloat(afp.aporte_obligatorio || 0)
      }));
      await supabase.from('afp_rates').upsert(afpUpdates, { onConflict: 'id' });

      setModalConfig({ isOpen: true, type: 'success', title: 'Guardado', message: 'Configuración actualizada correctamente.' });
      fetchData(); 
    } catch (error) {
      setModalConfig({ isOpen: true, type: 'error', title: 'Error', message: error.message });
    } finally { setSaving(false); }
  };

  // --- SECCIÓN OBREROS ---
  const renderWorkersConfig = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. JORNALES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <HardHat size={18} className="text-orange-600"/> Jornales Básicos
          </h3>
          <div className="space-y-4">
            {['OPERARIO', 'OFICIAL', 'PEON'].map(cat => (
              <div key={`JORNAL_${cat}`} className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Jornal {cat}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                  <input type="number" step="0.10" value={formValues[`JORNAL_${cat}`] || ''} onChange={(e) => handleChange(`JORNAL_${cat}`, e.target.value)} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-orange-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. BONIFICACIONES COMUNES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <DollarSign size={18} className="text-green-600"/> Bonificaciones
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3"><label className="text-xs font-bold text-slate-500 uppercase">BUC (%)</label></div>
              {['OPERARIO', 'OFICIAL', 'PEON'].map(cat => (
                  <div key={`BUC_${cat}`}>
                      <label className="text-[10px] font-bold text-slate-400">{cat}</label>
                      <input type="number" step="0.01" value={formValues[`BUC_${cat}`] || ''} onChange={(e) => handleChange(`BUC_${cat}`, e.target.value)} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:border-green-500 outline-none" />
                  </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Movilidad (Diaria)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                <input type="number" step="0.10" value={formValues['MOVILIDAD'] || ''} onChange={(e) => handleChange('MOVILIDAD', e.target.value)} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Asig. Escolar (Diaria)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                <input type="number" step="0.01" value={formValues['ASIG_ESCOLAR_DIARIO'] || ''} onChange={(e) => handleChange('ASIG_ESCOLAR_DIARIO', e.target.value)} className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. LIQUIDACIÓN SEMANAL */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <Award size={18} className="text-purple-600"/> Liquidación Semanal
          </h3>
          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 text-xs font-bold text-slate-400 uppercase">Porcentajes de Ley</div>
                
                {/* CTS / INDEMNIZACION */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500">CTS / Indemniz. (%)</label>
                    <div className="relative">
                        <input type="number" step="0.0001" value={formValues['PCT_INDEMNIZACION'] || '0.15'} onChange={(e) => handleChange('PCT_INDEMNIZACION', e.target.value)} className="w-full px-2 py-1 bg-slate-50 border rounded text-sm font-bold text-slate-700 outline-none focus:border-purple-500"/>
                    </div>
                </div>

                {/* VACACIONES */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500">Vacaciones (%)</label>
                    <div className="relative">
                        <input type="number" step="0.0001" value={formValues['PCT_VACACIONES'] || '0.10'} onChange={(e) => handleChange('PCT_VACACIONES', e.target.value)} className="w-full px-2 py-1 bg-slate-50 border rounded text-sm font-bold text-slate-700 outline-none focus:border-purple-500"/>
                    </div>
                </div>

                {/* NUEVO: GRATIFICACIÓN */}
                <div className="col-span-2 mt-2">
                    <label className="text-[10px] font-bold text-slate-500">Gratificación Proporcional (%)</label>
                    <div className="relative flex items-center gap-2">
                        <input type="number" step="0.0001" value={formValues['PCT_GRATIFICACION'] || '0.21'} onChange={(e) => handleChange('PCT_GRATIFICACION', e.target.value)} className="w-full px-2 py-1 bg-purple-50 border border-purple-200 rounded text-sm font-bold text-purple-700 outline-none focus:border-purple-500"/>
                        <span className="text-xs font-bold text-purple-400 bg-purple-100 px-2 py-1 rounded">{(parseFloat(formValues['PCT_GRATIFICACION'] || 0) * 100).toFixed(2)}%</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">Suele ser entre 19% y 21% (Ej: 0.1905)</p>
                </div>

             </div>
             <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 text-[10px] text-purple-800">
                <strong>Nota:</strong> Estos porcentajes se calculan sobre el Jornal Básico acumulado de la semana.
             </div>
          </div>
        </div>

        {/* 4. HORAS EXTRAS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <Clock size={18} className="text-blue-600"/> Horas Extras
          </h3>
          <div className="space-y-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Primeras 2 Horas (60%)</label>
                <div className="flex items-center gap-2">
                    <input type="number" step="0.01" value={formValues['HE_60_PCT'] || '0.60'} onChange={(e) => handleChange('HE_60_PCT', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" />
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{(parseFloat(formValues['HE_60_PCT'] || 0) * 100).toFixed(0)}%</span>
                </div>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">A partir de 2 Horas (100%)</label>
                <div className="flex items-center gap-2">
                    <input type="number" step="0.01" value={formValues['HE_100_PCT'] || '1.00'} onChange={(e) => handleChange('HE_100_PCT', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-blue-500" />
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{(parseFloat(formValues['HE_100_PCT'] || 0) * 100).toFixed(0)}%</span>
                </div>
             </div>
          </div>
        </div>

        {/* 5. DESCUENTOS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <Shield size={18} className="text-red-500"/> Descuentos de Ley
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Tasa ONP</label>
                <input type="number" step="0.01" value={formValues['ONP_TASA'] || '0.13'} onChange={(e) => handleChange('ONP_TASA', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500" />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Conafovicer</label>
                <input type="number" step="0.001" value={formValues['CONAFOVICER'] || '0.02'} onChange={(e) => handleChange('CONAFOVICER', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500" />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">EsSalud (Empleador)</label>
                <input type="number" step="0.01" value={formValues['ESSALUD'] || '0.09'} onChange={(e) => handleChange('ESSALUD', e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500" />
            </div>
          </div>
        </div>

      </div>
      
      {/* SECCIÓN AFP (ACTUALIZADA: CON PASO DECIMAL) */}
      <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-orange-700"><TrendingUp size={20}/> Tasas de AFP</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {afpRates.map((afp) => (
              <div key={afp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                 <div className="font-bold text-slate-800 border-b pb-2 mb-3 flex justify-between">
                    <span>{afp.name}</span>
                    <Percent size={14} className="text-slate-400 mt-1"/>
                 </div>
                 <div className="space-y-3 text-xs">
                    {/* COMISIÓN SOBRE FLUJO */}
                    <div className="flex justify-between items-center">
                       <span className="text-slate-600 font-medium">Com. Flujo</span> 
                       <div className="relative w-20">
                          <input 
                            type="number" step="0.01" 
                            className="w-full text-right bg-slate-50 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 font-mono text-slate-700" 
                            value={afp.comision_flujo} 
                            onChange={(e)=>handleAfpChange(afp.id, 'comision_flujo', e.target.value)} 
                          />
                       </div>
                    </div>
                    {/* COMISIÓN MIXTA */}
                    <div className="flex justify-between items-center">
                       <span className="text-slate-600 font-medium">Com. Mixta</span>
                       <div className="relative w-20">
                          <input 
                            type="number" step="0.01" 
                            className="w-full text-right bg-slate-50 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 font-mono text-slate-700" 
                            value={afp.comision_mixta} 
                            onChange={(e)=>handleAfpChange(afp.id, 'comision_mixta', e.target.value)} 
                          />
                       </div>
                    </div>
                    {/* PRIMA SEGURO */}
                    <div className="flex justify-between items-center">
                       <span className="text-slate-600 font-medium">Prima Seguro</span>
                       <div className="relative w-20">
                          <input 
                            type="number" step="0.01" 
                            className="w-full text-right bg-slate-50 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 font-mono text-slate-700" 
                            value={afp.prima_seguro} 
                            onChange={(e)=>handleAfpChange(afp.id, 'prima_seguro', e.target.value)} 
                          />
                       </div>
                    </div>
                    {/* APORTE OBLIGATORIO */}
                    <div className="flex justify-between items-center">
                       <span className="text-slate-600 font-medium">Aporte Obl.</span>
                       <div className="relative w-20">
                          <input 
                            type="number" step="0.01" 
                            className="w-full text-right bg-slate-50 border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 font-mono text-slate-700" 
                            value={afp.aporte_obligatorio} 
                            onChange={(e)=>handleAfpChange(afp.id, 'aporte_obligatorio', e.target.value)} 
                          />
                       </div>
                    </div>
                 </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );

  const renderStaffConfig = () => (
    <div className="p-10 text-center text-slate-400">
        <Briefcase size={40} className="mx-auto mb-4 opacity-50"/>
        <p>La configuración de Staff se mantiene igual.</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-[#003366]" /> Configuración</h1>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl font-bold shadow-lg hover:bg-blue-900 transition-colors">
          {saving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18} />} Guardar
        </button>
      </div>
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit">
        <button onClick={() => setActiveTab('workers')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'workers' ? 'bg-orange-50 text-orange-700' : 'text-slate-500'}`}>Obreros</button>
        <button onClick={() => setActiveTab('staff')} className={`px-6 py-2 rounded-xl font-bold ${activeTab === 'staff' ? 'bg-blue-50 text-blue-700' : 'text-slate-500'}`}>Staff</button>
      </div>
      {activeTab === 'workers' ? renderWorkersConfig() : renderStaffConfig()}
      <StatusModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig({...modalConfig, isOpen: false})} type={modalConfig.type} title={modalConfig.title} message={modalConfig.message} />
    </div>
  );
};

export default ConfigurationPage;