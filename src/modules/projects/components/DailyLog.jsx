import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase'; //
import { Send, AlertTriangle, Cloud, Hammer, Info, Loader2, MessageSquare } from 'lucide-react';

const DailyLog = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [category, setCategory] = useState('Avance');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Cargar historial inicial
    fetchLogs();
    
    // 2. Configurar suscripción en TIEMPO REAL
    const channel = supabase
      .channel(`realtime-logs-${projectId}`) // Nombre único para depuración
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'daily_logs', 
          filter: `project_id=eq.${projectId}` // Solo escuchar este proyecto
        }, 
        (payload) => {
          console.log("🔔 Nuevo mensaje recibido en vivo:", payload.new);
          // Actualizamos la lista instantáneamente agregando el nuevo elemento al inicio
          setLogs((prevLogs) => [payload.new, ...prevLogs]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log("✅ Conectado al chat en tiempo real.");
        }
      });

    // Limpieza al salir
    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [projectId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from('daily_logs').insert([{
        project_id: projectId,
        message: newMessage,
        category: category
      }]);

      if (error) throw error;
      
      // Limpiamos el input inmediatamente (el mensaje aparecerá solo gracias al listener de arriba)
      setNewMessage('');
    } catch (error) {
      alert("Error al enviar mensaje: " + error.message);
    } finally {
      setSending(false);
    }
  };

  const getCategoryStyles = (cat) => {
    switch(cat) {
      case 'Incidencia': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: <AlertTriangle size={16} /> };
      case 'Clima': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: <Cloud size={16} /> };
      case 'Material': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: <Info size={16} /> };
      default: return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: <Hammer size={16} /> };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[500px]">
      
      {/* COLUMNA IZQUIERDA: FORMULARIO */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm sticky top-6">
          <h3 className="font-bold text-slate-800 mb-4 text-lg">Nueva Entrada</h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {['Avance', 'Incidencia', 'Clima', 'Material'].map(cat => (
                  <button 
                    key={cat} type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      category === cat 
                        ? 'bg-[#003366] text-white border-[#003366] shadow-md' 
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Detalle</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:bg-white transition-all resize-none"
                rows="5"
                placeholder="¿Qué sucedió hoy en obra?"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>

            <button 
              disabled={sending || !newMessage.trim()} 
              className="w-full py-3 bg-[#003366] text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 hover:bg-blue-900 transition shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {sending ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18} /> Publicar</>}
            </button>
          </form>
        </div>
      </div>

      {/* COLUMNA DERECHA: LISTA DE LOGS (TIMELINE) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700">Historial de Eventos</h3>
            <span className="text-xs font-medium text-slate-400">{logs.length} registros</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center items-center h-full text-slate-400">
                <Loader2 className="animate-spin mr-2" /> Conectando...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 border-2 border-dashed border-slate-100 rounded-xl m-4">
                <MessageSquare size={40} className="mb-2 opacity-20" />
                <p>No hay registros aún.</p>
                <p className="text-xs opacity-70">Sé el primero en escribir algo.</p>
              </div>
            ) : (
              logs.map((log) => {
                const style = getCategoryStyles(log.category);
                return (
                  <div key={log.id} className="flex gap-4 group animate-in slide-in-from-top-2 duration-300">
                    {/* Columna Fecha/Hora */}
                    <div className="flex flex-col items-end min-w-[80px] pt-1">
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(log.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Línea de Tiempo Visual */}
                    <div className="relative flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${style.border} ${style.bg} z-10`}></div>
                      <div className="w-0.5 h-full bg-slate-100 absolute top-3 group-last:hidden"></div>
                    </div>

                    {/* Tarjeta de Contenido */}
                    <div className={`flex-1 p-4 rounded-xl border ${style.bg} ${style.border} bg-opacity-30 mb-2 transition-all hover:shadow-sm`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`p-1 rounded-md ${style.bg} ${style.text}`}>
                          {style.icon}
                        </span>
                        <span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>
                          {log.category}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                        {log.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default DailyLog;