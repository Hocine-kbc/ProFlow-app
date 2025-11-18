import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import { BusinessNotification } from '../types/index.ts';
import { 
  fetchNotifications, 
  getUnreadNotificationsCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications
} from '../lib/api.ts';

interface NotificationBellProps {
  onNavigate?: (page: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<BusinessNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Charger les notifications et le compteur
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifs, count] = await Promise.all([
        fetchNotifications(),
        getUnreadNotificationsCount()
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Recharger quand le panel s'ouvre
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification: BusinessNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
    }

    setIsOpen(false);
    
    // Naviguer vers le lien si disponible
    if (notification.link) {
      // Les liens peuvent être des routes internes (ex: /invoices/123) ou des pages (ex: invoices)
      // On supprime le / initial et on extrait la page
      const page = notification.link.replace(/^\//, '').split('/')[0];
      if (onNavigate && page) {
        onNavigate(page);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      const deletedNotif = notifications.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleDeleteRead = async () => {
    try {
      await deleteReadNotifications();
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Error deleting read notifications:', error);
    }
  };

  const getNotificationIcon = (type: BusinessNotification['type']) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'message':
        return '💬';
      case 'invoice':
        return '📄';
      case 'reminder':
        return '⏰';
      case 'warning':
        return '⚠️';
      case 'system':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: BusinessNotification['type']) => {
    switch (type) {
      case 'payment':
        return 'border-l-green-500';
      case 'message':
        return 'border-l-blue-500';
      case 'invoice':
        return 'border-l-purple-500';
      case 'reminder':
        return 'border-l-yellow-500';
      case 'warning':
        return 'border-l-red-500';
      case 'system':
        return 'border-l-gray-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 7) return `Il y a ${days} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const hasReadNotifications = notifications.some(n => n.read);

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      {/* Bouton avec badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell 
          className="w-5 h-5 transition-transform duration-300 ease-in-out"
          style={isHovered ? {
            animation: 'bell-swing 0.5s ease-in-out',
            transformOrigin: 'top center'
          } : {}}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des notifications */}
      {isOpen && createPortal(
        <>
          {/* Overlay - Fermeture en cliquant en dehors */}
          <div 
            className="fixed inset-0 z-[100] bg-black/40 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="fixed inset-x-0 top-[76px] px-4 pb-6 md:inset-x-auto md:px-0 md:pb-0 md:fixed md:right-6 md:left-auto md:top-[72px] z-[110]">
            <div 
              className="mx-auto md:mx-0 w-full md:w-[420px] max-w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[85vh] md:max-h-[700px] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec gradient et traits décoratifs */}
              <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 px-5 py-4 overflow-hidden">
                {/* Traits décoratifs */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-2 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                  <div className="absolute bottom-2 left-0 right-0 w-full h-0.5 bg-white/20 transform -rotate-6"></div>
                  <div className="absolute top-0 bottom-0 left-8 w-0.5 h-full bg-white/20 transform rotate-6"></div>
                  <div className="absolute top-0 bottom-0 right-8 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
                </div>
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <p className="text-xs text-white/80 mt-0.5">
                          {unreadCount} non {unreadCount > 1 ? 'lues' : 'lue'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="p-2 rounded-lg text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200"
                        title="Tout marquer comme lu"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {hasReadNotifications && (
                      <button
                        type="button"
                        onClick={handleDeleteRead}
                        className="p-2 rounded-lg text-white/90 hover:bg-white/20 hover:text-white transition-all duration-200"
                        title="Supprimer les notifications lues"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Liste des notifications */}
              <div className="flex-1 overflow-y-auto overscroll-contain bg-gray-50/50 dark:bg-gray-900/50">
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-3"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucune notification</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Vous serez notifié des nouveaux événements</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`group relative p-4 rounded-xl cursor-pointer transition-all duration-200 border-l-4 ${
                          !notification.read 
                            ? 'bg-white dark:bg-gray-800 shadow-sm border-r border-t border-b border-blue-200 dark:border-blue-800/50' 
                            : 'bg-white/80 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 border-r border-t border-b border-gray-200 dark:border-gray-700'
                        } ${getNotificationColor(notification.type)}`}
                      >
                        
                        <div className="flex items-start gap-3 pl-1">
                          {/* Icône */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                            !notification.read 
                              ? 'bg-blue-100 dark:bg-blue-900/30' 
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className={`text-sm font-semibold leading-tight ${
                                !notification.read 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                              )}
                            </div>
                            
                            {notification.message && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                                {notification.message}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-2.5">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(notification.created_at)}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;

