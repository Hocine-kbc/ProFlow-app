import React, { useState, useEffect } from 'react';
import { X, Home, Users, Clock, FileText, BarChart3, User, ChevronLeft, ChevronRight, Moon, Sun, Power, Archive, Scale, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { supabase } from '../lib/supabase.ts';
import NotificationContainer from './NotificationContainer.tsx';
import NotificationBell from './NotificationBell.tsx';
import AlertModal from './AlertModal.tsx';
import ChatBot from './ChatBot.tsx';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home, color: 'blue' },
  { id: 'clients', label: 'Clients', icon: Users, color: 'green' },
  { id: 'services', label: 'Prestations', icon: Clock, color: 'orange' },
  { id: 'invoices', label: 'Factures', icon: FileText, color: 'purple' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'cyan' },
  { id: 'stats', label: 'Statistiques', icon: BarChart3, color: 'indigo' },
  { id: 'urssaf', label: 'URSSAF', icon: Scale, color: 'red' },
  { id: 'archive', label: 'Archive', icon: Archive, color: 'gray' },
  { id: 'profile', label: 'Profil', icon: User, color: 'pink' },
];

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  // Fonction de déconnexion avec confirmation
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Charger le nombre de messages email non lus
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUnreadMessagesCount(0);
          return;
        }

        const { data: messagesData, error } = await supabase
          .from('messages')
          .select('id, deleted_by_users, recipient_id, read, folder, is_archived, is_deleted, is_spam')
          .eq('recipient_id', user.id);

        if (error) throw error;

        if (!messagesData) {
          setUnreadMessagesCount(0);
          return;
        }

        // Filtrer les messages non lus dans la boîte de réception
        const unread = messagesData.filter(msg => {
          const deletedBy = Array.isArray(msg.deleted_by_users) ? msg.deleted_by_users : [];
          const notDeleted = !deletedBy.includes(user.id);
          const inInbox = (msg.folder === 'inbox' || !msg.folder) && !msg.is_archived && !msg.is_deleted && !msg.is_spam;
          return notDeleted && inInbox && !msg.read;
        });

        setUnreadMessagesCount(unread.length);
      } catch (error) {
        console.error('Error fetching unread messages count:', error);
        setUnreadMessagesCount(0);
      }
    };

    fetchUnreadCount();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fonction pour obtenir les classes de couleur
  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        active: 'bg-gradient-to-r from-blue-500 to-blue-600',
        icon: 'bg-blue-100 dark:bg-blue-900/30',
        iconHover: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30',
        iconColor: 'text-blue-600 dark:text-blue-400'
      },
      green: {
        active: 'bg-gradient-to-r from-green-500 to-green-600',
        icon: 'bg-green-100 dark:bg-green-900/30',
        iconHover: 'group-hover:bg-green-100 dark:group-hover:bg-green-900/30',
        iconColor: 'text-green-600 dark:text-green-400'
      },
      orange: {
        active: 'bg-gradient-to-r from-orange-500 to-orange-600',
        icon: 'bg-orange-100 dark:bg-orange-900/30',
        iconHover: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30',
        iconColor: 'text-orange-600 dark:text-orange-400'
      },
      purple: {
        active: 'bg-gradient-to-r from-purple-500 to-purple-600',
        icon: 'bg-purple-100 dark:bg-purple-900/30',
        iconHover: 'group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400'
      },
      indigo: {
        active: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
        icon: 'bg-indigo-100 dark:bg-indigo-900/30',
        iconHover: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30',
        iconColor: 'text-indigo-600 dark:text-indigo-400'
      },
      gray: {
        active: 'bg-gradient-to-r from-gray-500 to-gray-600',
        icon: 'bg-gray-100 dark:bg-gray-700',
        iconHover: 'group-hover:bg-gray-100 dark:group-hover:bg-gray-700',
        iconColor: 'text-gray-600 dark:text-gray-400'
      },
      pink: {
        active: 'bg-gradient-to-r from-pink-500 to-pink-600',
        icon: 'bg-pink-100 dark:bg-pink-900/30',
        iconHover: 'group-hover:bg-pink-100 dark:group-hover:bg-pink-900/30',
        iconColor: 'text-pink-600 dark:text-pink-400'
      },
      red: {
        active: 'bg-gradient-to-r from-red-500 to-red-600',
        icon: 'bg-red-100 dark:bg-red-900/30',
        iconHover: 'group-hover:bg-red-100 dark:group-hover:bg-red-900/30',
        iconColor: 'text-red-600 dark:text-red-400'
      }
    };

    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed top-0 left-0 right-0 bottom-0 w-full h-full z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 ${sidebarCollapsed ? 'w-16' : 'w-72'} bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } flex flex-col`} style={{
        transition: 'width 300ms ease-in-out, transform 300ms ease-in-out',
        zIndex: 40
      }}>
        {/* Header avec gradient - Masqué sur mobile */}
        <div className="hidden lg:block relative h-20 p-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700">
          <div className="flex items-center justify-between h-full">
            {!sidebarCollapsed && (
              <div className="flex items-center justify-center w-full h-full">
                <img src="/ProFlowlogo.png" alt="ProFlow Logo" className="w-full h-full object-cover" />
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center w-full h-full">
                <img src="/logoPF.png" alt="ProFlow Logo" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`flex items-center space-x-2 absolute top-1 h-auto ${sidebarCollapsed ? 'right-1' : 'right-1'}`}>
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`h-5 w-5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-300 hidden lg:block z-10 border border-white/30 hover:border-white/50 hover:scale-110 hover:shadow-lg`}
                title={sidebarCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
              >
                <div className="flex items-center justify-center h-full">
                  {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors lg:hidden z-10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Navigation moderne */}
        <nav className="p-4 pt-[60px] lg:pt-4 space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            const colors = getColorClasses(item.color);
            
            return (
              <div key={item.id} className={`${sidebarCollapsed ? 'flex justify-center' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    onPageChange(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`${sidebarCollapsed ? 'w-12' : 'w-full'} flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-1.5'} text-left rounded-xl group relative ${
                    isActive
                      ? `${colors.active} text-white`
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  style={{ height: '54px', minHeight: '54px' }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <div className={`rounded-lg relative ${
                    isActive 
                      ? 'bg-white/20' 
                      : `${colors.icon} ${colors.iconHover}`
                  }`} style={{ 
                    minWidth: '42px', 
                    minHeight: '42px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginRight: sidebarCollapsed ? '0' : '8px',
                    padding: '8px'
                  }}>
                    <Icon size={18} className={isActive ? 'text-white' : `${colors.iconColor} group-hover:${colors.iconColor.split(' ')[0]}`} />
                    {/* Badge pour les messages non lus - visible même quand la sidebar est réduite */}
                    {item.id === 'messages' && unreadMessagesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 dark:bg-red-600 rounded-full shadow-lg z-10">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                      {isActive && item.id !== 'messages' && (
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

      </div>

      {/* Header fixe en haut - Toute la largeur, derrière le menu */}
      <div className="bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 shadow-md border-b border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between fixed top-0 left-0 right-0 z-30" style={{ height: '64px' }}>
        {/* Mobile: Menu hamburger */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Mobile: Logo */}
        <div className="lg:hidden flex items-center">
          <img src="/ProFlowlogo.png" alt="ProFlow" className="h-10 w-auto invert dark:invert-0" />
        </div>
        
        {/* Desktop: Espace vide à gauche */}
        <div className="hidden lg:block flex-1" />
        
        {/* Actions à droite */}
        <div className="flex items-center gap-1.5">
          <NotificationBell onNavigate={onPageChange} />
          <button
            type="button"
            onClick={toggleTheme}
            className="relative p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 active:scale-95 group"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            <div className="relative">
              {isDark ? (
                <Sun className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" />
              ) : (
                <Moon className="w-5 h-5 transition-transform group-hover:rotate-12 duration-300" />
              )}
            </div>
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => setShowLogoutAlert(true)}
            className="relative p-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 active:scale-95 group"
            title="Se déconnecter"
          >
            <Power className="w-5 h-5 transition-transform group-hover:scale-110 duration-200" />
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
        {/* Espace pour le header */}
        <div className="h-[64px]"></div>
        
        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 min-h-screen pb-12">
          {children}
        </main>
      </div>
      
      {/* Notification Container */}
      <NotificationContainer />

      {/* ChatBot */}
      <ChatBot />

      {/* Modal de confirmation de déconnexion */}
      <AlertModal
        isOpen={showLogoutAlert}
        onClose={() => setShowLogoutAlert(false)}
        onConfirm={handleLogout}
        title="Se déconnecter"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Déconnexion"
        cancelText="Annuler"
        type="warning"
      />
    </div>
  );
}