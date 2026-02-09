import React, { useState, useEffect, useRef } from 'react';
import { Bell, Info, UserCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { getNotifications, markAsRead, deleteNotification } from '../../services/notificationsService';
import { useUnifiedAuth } from '../../hooks/useUnifiedAuth';

// --- COMPONENTE DE ELEMENTO CON ANIMACIÓN SWIPE (ALTA SENSIBILIDAD) ---
const NotificationItem = ({ notif, onDismiss, onClick }) => {
  const x = useMotionValue(0);
  
  // 1. AJUSTES DE SENSIBILIDAD VISUAL
  const bgOpacity = useTransform(x, [0, 50], [0, 1]);
  const iconScale = useTransform(x, [0, 50], [0.5, 1.2]);
  const textOpacity = useTransform(x, [20, 50], [0, 1]);

  const handleDragEnd = (event, info) => {
    // Si arrastramos más de 60px se borra
    if (info.offset.x > 60) {
      onDismiss(notif.id);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="relative w-full overflow-hidden border-b border-slate-50 bg-white group"
    >
        {/* --- CAPA DE FONDO (ACCIÓN ELIMINAR) --- */}
        <motion.div 
            style={{ opacity: bgOpacity }}
            className="absolute inset-0 bg-red-500 flex items-center justify-start pl-6 z-0"
        >
            <motion.div style={{ scale: iconScale, opacity: textOpacity }} className="flex items-center gap-2 text-white font-bold text-xs">
                <Trash2 size={20} strokeWidth={2.5} />
                <span className="tracking-wide">ELIMINAR</span>
            </motion.div>
        </motion.div>

        {/* --- CAPA SUPERIOR (CONTENIDO) --- */}
        <motion.div
            style={{ x }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2} 
            onDragEnd={handleDragEnd}
            onClick={() => onClick(notif)}
            className={`relative z-10 p-4 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50/60' : 'bg-white'}`}
        >
            <div className="flex gap-3 items-start select-none">
                {/* Icono Tipo */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    notif.type === 'unlock_request' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'
                }`}>
                    {notif.type === 'unlock_request' ? <UserCheck size={18}/> : <Info size={18}/>}
                </div>

                {/* Texto */}
                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold mb-0.5 ${!notif.read ? 'text-slate-800' : 'text-slate-500'}`}>
                        {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                        {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-300 mt-1 block">
                        {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>
                
                {/* Punto Azul (No leído) */}
                {!notif.read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 shrink-0 shadow-sm shadow-blue-300"></div>
                )}
            </div>
        </motion.div>
    </motion.div>
  );
};

const NotificationsMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Eliminamos useNavigate porque ya no redirigimos
  
  const { currentUser } = useUnifiedAuth();
  const userRole = currentUser?.role || currentUser?.position || 'staff'; 

  useEffect(() => {
    if (!userRole) return;

    fetchData();

    // Suscripción Realtime
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
         const newNotif = payload.new;
         if (!newNotif.target_roles || newNotif.target_roles.includes(userRole)) {
             setNotifications(prev => [newNotif, ...prev]);
             setUnreadCount(prev => prev + 1);
         }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  // --- ELIMINADO: useEffect que detectaba clics fuera para cerrar ---
  // Ahora solo se cierra con el botón o la campana.

  const fetchData = async () => {
    if (!userRole) return;
    const data = await getNotifications(userRole);
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.read).length);
  };

  const handleDismiss = async (id) => {
    const prevNotifications = [...notifications];
    setNotifications(prev => prev.filter(n => n.id !== id));
    
    const wasUnread = notifications.find(n => n.id === id && !n.read);
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));

    try {
        await deleteNotification(id);
    } catch (error) {
        console.error("Error al borrar", error);
        setNotifications(prevNotifications);
        if (wasUnread) setUnreadCount(prev => prev + 1);
    }
  };

  const handleClick = async (notification) => {
    // Solo marcamos como leída, NO REDIRIGIMOS
    if (!notification.read) {
        markAsRead(notification.id);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="relative">
      
      {/* Botón Campana */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
            isOpen ? 'bg-blue-50 text-blue-600 scale-105' : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
               <h3 className="font-bold text-slate-700 text-sm">Notificaciones</h3>
               {unreadCount > 0 && (
                 <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} nuevas
                 </span>
               )}
            </div>

            {/* Lista Scrollable */}
            <div className="max-h-[400px] overflow-y-auto overflow-x-hidden bg-slate-50">
               {notifications.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Bell size={20} className="opacity-30"/>
                    </div>
                    <p className="text-xs font-medium">Estás al día.</p>
                    <p className="text-[10px] opacity-70">No hay notificaciones nuevas.</p>
                 </div>
               ) : (
                 <div className="flex flex-col">
                    <AnimatePresence mode="popLayout">
                        {notifications.map((notif) => (
                            <NotificationItem 
                                key={notif.id} 
                                notif={notif} 
                                onDismiss={handleDismiss} 
                                onClick={handleClick} 
                            />
                        ))}
                    </AnimatePresence>
                 </div>
               )}
            </div>
            
            {/* Footer con Botón Cerrar */}
            <div className="p-2 border-t border-slate-100 bg-white text-center sticky bottom-0 z-20">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors py-1.5 block w-full hover:bg-slate-50 rounded-lg"
               >
                 Cerrar bandeja
               </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsMenu;