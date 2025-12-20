import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, RefreshCw, DollarSign, 
  Briefcase, HardHat, Percent, Calculator, AlertCircle, 
  Shield, TrendingUp
} from 'lucide-react';
import { supabase } from '../../services/supabase';
// Importamos tu Modal Personalizado
import StatusModal from '../../components/common/StatusModal';

const ConfigurationPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('workers'); // 'workers' | 'staff'
  
  // Estado para Constantes Generales
  const [formValues, setFormValues] = useState({});
  
  // Estado para AFPs
  const [afpRates, setAfpRates] = useState([]);

  // Estado para el Modal de Alertas
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Constantes (Obreros/Staff)
      const { data: constants, error: errorConst } = await supabase
        .from('payroll_constants')
        .select('*')
        .order('key_name', { ascending: true });

      if (errorConst) throw errorConst;
      
      const initialValues = {};
      (constants || []).forEach(item => {
        initialValues[item.key_name] = item.value;
      });
      setFormValues(initialValues);

      // 2. Cargar Tasas de AFP
      const { data: afps, error: errorAfps } = await supabase
        .from('afp_rates')
        .select('*')
        .order('name', { ascending: true });

      if (errorAfps) throw errorAfps;
      setAfpRates(afps || []);

    } catch (error) {
      console.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAfpChange = (id, field, value) => {
    setAfpRates(prevAfps => prevAfps.map(afp => 
      afp.id === id ? { ...afp, [field]: value } : afp
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Guardar Constantes Generales
      const updates = Object.keys(formValues).map(key => ({
        key_name: key,
        value: parseFloat(formValues[key])
      }));

      const { error: errorConst } = await supabase
        .from('payroll_constants')
        .upsert(updates, { onConflict: 'key_name' });

      if (errorConst) throw errorConst;

      // 2. Guardar Tasas de AFP
      const afpUpdates = afpRates.map(afp => ({
        id: afp.id,
        name: afp.name,
        comision_flujo: parseFloat(afp.comision_flujo),
        comision_mixta: parseFloat(afp.comision_mixta),
        prima_seguro: parseFloat(afp.prima_seguro),
        aporte_obligatorio: parseFloat(afp.aporte_obligatorio)
      }));

      const { error: errorAfps } = await supabase
        .from('afp_rates')
        .upsert(afpUpdates, { onConflict: 'id' });

      if (errorAfps) throw errorAfps;

      // ÉXITO: Mostramos el StatusModal
      setModalConfig({
        isOpen: true,
        type: 'success',
        title: '¡Configuración Guardada!',
        message: 'Todos los cambios han sido actualizados correctamente en el sistema.'
      });
      
      fetchData(); 

    } catch (error) {
      // ERROR: Mostramos el StatusModal
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'Error al guardar',
        message: 'No se pudieron guardar los cambios: ' + error.message
      });
    } finally {
      setSaving(false);
    }
  };

  // --- COMPONENTE REUTILIZABLE PARA AFPs ---
  const renderAfpGrid = (contextColor = "text-slate-700") => (
    <div className="mt-8 pt-8 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${contextColor}`}>
        <TrendingUp size={20}/> Tasas de AFP (Aplicable al Régimen)
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {afpRates.map((afp) => (
          <div key={afp.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
             <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800">{afp.name}</span>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">Com. Flujo (%)</label>
                   <input 
                     type="number" step="0.01"
                     value={afp.comision_flujo}
                     onChange={(e) => handleAfpChange(afp.id, 'comision_flujo', e.target.value)}
                     className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right text-sm font-bold text-slate-700 focus:border-blue-500 outline-none"
                   />
                </div>
                
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">Com. Mixta (%)</label>
                   <input 
                     type="number" step="0.01"
                     value={afp.comision_mixta}
                     onChange={(e) => handleAfpChange(afp.id, 'comision_mixta', e.target.value)}
                     className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right text-sm font-bold text-slate-700 focus:border-blue-500 outline-none"
                   />
                </div>

                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-bold text-slate-500 uppercase">Seguro (%)</label>
                   <input 
                     type="number" step="0.01"
                     value={afp.prima_seguro}
                     onChange={(e) => handleAfpChange(afp.id, 'prima_seguro', e.target.value)}
                     className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-right text-sm font-bold text-slate-700 focus:border-blue-500 outline-none"
                   />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Aporte Obl. (%)</label>
                   <input 
                     type="number" step="0.01"
                     value={afp.aporte_obligatorio}
                     onChange={(e) => handleAfpChange(afp.id, 'aporte_obligatorio', e.target.value)}
                     className="w-16 px-2 py-1 bg-transparent text-right text-sm font-bold text-slate-400 focus:text-slate-700 outline-none"
                   />
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- SECCIÓN OBREROS ---
  const renderWorkersConfig = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Jornales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <HardHat size={18} className="text-orange-600"/> Jornales (Construcción Civil)
          </h3>
          <div className="space-y-4">
            {['OPERARIO', 'OFICIAL', 'PEON'].map(cat => (
              <div key={`JORNAL_${cat}`} className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Jornal {cat}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                  <input 
                    type="number" step="0.10"
                    value={formValues[`JORNAL_${cat}`] || ''}
                    onChange={(e) => handleChange(`JORNAL_${cat}`, e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Bonificaciones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <DollarSign size={18} className="text-green-600"/> Bonificaciones Semanales
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3"><label className="text-xs font-bold text-slate-500 uppercase">Factores BUC (%)</label></div>
              {['OPERARIO', 'OFICIAL', 'PEON'].map(cat => (
                  <div key={`BUC_${cat}`}>
                      <label className="text-[10px] font-bold text-slate-400">{cat}</label>
                      <input 
                        type="number" step="0.01" placeholder="0.32"
                        value={formValues[`BUC_${cat}`] || ''}
                        onChange={(e) => handleChange(`BUC_${cat}`, e.target.value)}
                        className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-center focus:border-green-500 outline-none"
                      />
                  </div>
              ))}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Movilidad (Por Día)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                <input 
                  type="number" step="0.10"
                  value={formValues['MOVILIDAD'] || ''}
                  onChange={(e) => handleChange('MOVILIDAD', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Asig. Escolar (Diaria)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">S/</span>
                <input 
                  type="number" step="0.01"
                  value={formValues['ASIG_ESCOLAR_DIARIO'] || ''}
                  onChange={(e) => handleChange('ASIG_ESCOLAR_DIARIO', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Descuentos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <Shield size={18} className="text-red-500"/> Descuentos y Aportes
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Tasa ONP</label>
                <input 
                    type="number" step="0.01"
                    value={formValues['ONP_TASA'] || '0.13'}
                    onChange={(e) => handleChange('ONP_TASA', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Conafovicer</label>
                <input 
                    type="number" step="0.001"
                    value={formValues['CONAFOVICER'] || '0.02'}
                    onChange={(e) => handleChange('CONAFOVICER', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">EsSalud (Empleador)</label>
                <input 
                    type="number" step="0.01"
                    value={formValues['ESSALUD'] || '0.09'}
                    onChange={(e) => handleChange('ESSALUD', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-red-500"
                />
            </div>
          </div>
        </div>
      </div>

      {/* AFPs Integrado en Obreros */}
      {renderAfpGrid("text-orange-600")}
    </div>
  );

  // --- SECCIÓN STAFF ---
  const renderStaffConfig = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Parámetros Legales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8"></div>
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 relative z-10 border-b pb-2">
            <Briefcase size={18} className="text-[#003366]"/> Parámetros de Ley
          </h3>
          
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Remuneración Mínima Vital (RMV)</label>
              <div className="relative group">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366]"/>
                <input 
                  type="number" 
                  value={formValues['STAFF_RMV'] || '1025'}
                  onChange={(e) => handleChange('STAFF_RMV', e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-blue-50/50 border border-blue-100 rounded-xl font-bold text-[#003366] focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">UIT</label>
              <div className="relative group">
                <Calculator size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#003366]"/>
                <input 
                  type="number" 
                  value={formValues['STAFF_UIT'] || '5150'}
                  onChange={(e) => handleChange('STAFF_UIT', e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tasas Staff */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 border-b pb-2">
            <Percent size={18} className="text-green-600"/> Tasas y Porcentajes Staff
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-slate-500">Asig. Familiar (% de RMV)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.01"
                    value={formValues['STAFF_ASIG_FAMILIAR_PCT'] || '0.10'}
                    onChange={(e) => handleChange('STAFF_ASIG_FAMILIAR_PCT', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:border-green-500"
                  />
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                    {(parseFloat(formValues['STAFF_ASIG_FAMILIAR_PCT'] || 0) * 100).toFixed(0)}%
                  </span>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Tasa ONP</label>
                <input 
                    type="number" step="0.01"
                    value={formValues['STAFF_TASA_ONP'] || '0.13'}
                    onChange={(e) => handleChange('STAFF_TASA_ONP', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">EsSalud</label>
                <input 
                    type="number" step="0.01"
                    value={formValues['STAFF_TASA_ESSALUD'] || '0.09'}
                    onChange={(e) => handleChange('STAFF_TASA_ESSALUD', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-green-500"
                />
            </div>
          </div>
        </div>

        <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 flex flex-col justify-center gap-3">
          <div className="flex items-center gap-2 text-orange-700 font-bold">
              <AlertCircle size={20}/> Nota
          </div>
          <p className="text-xs text-orange-800/80 leading-relaxed">
            Staff (Mensual): Asig. Familiar basada en RMV.
            <br/>
            Obreros (Semanal): Asig. Escolar basada en Jornal/Días.
          </p>
        </div>
      </div>

      {/* AFPs Integrado en Staff */}
      {renderAfpGrid("text-blue-600")}
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-[#003366]" /> Configuración del Sistema
          </h1>
          <p className="text-slate-500 text-sm">Gestiona variables de nómina para cada régimen.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-xl text-sm font-bold hover:bg-blue-900 shadow-lg active:scale-95 transition-all disabled:opacity-70 w-full md:w-auto justify-center"
        >
          {saving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18} />}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex p-1 bg-white rounded-2xl border border-slate-200 w-fit shadow-sm">
        <button onClick={() => setActiveTab('workers')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'workers' ? 'bg-orange-50 text-orange-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
          <HardHat size={18} /> Obreros
        </button>
        <button onClick={() => setActiveTab('staff')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'staff' ? 'bg-blue-50 text-[#003366] shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
          <Briefcase size={18} /> Staff
        </button>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
            <div className="flex justify-center p-12 text-slate-400">
                <RefreshCw className="animate-spin mr-2"/> Cargando datos...
            </div>
        ) : (
            <>
                {activeTab === 'workers' && renderWorkersConfig()}
                {activeTab === 'staff' && renderStaffConfig()}
            </>
        )}
      </div>

      {/* MODAL DE ESTADO */}
      <StatusModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </div>
  );
};

export default ConfigurationPage;