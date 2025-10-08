import React, { useState } from 'react';
import { X, Home, Users, Clock, FileText, BarChart3, User, ChevronLeft, ChevronRight, Moon, Sun, Power, Archive } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import NotificationContainer from './NotificationContainer';
import AlertModal from './AlertModal';
import ChatBot from './ChatBot';

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
  { id: 'stats', label: 'Statistiques', icon: BarChart3, color: 'indigo' },
  { id: 'archive', label: 'Archive', icon: Archive, color: 'gray' },
  { id: 'profile', label: 'Profil', icon: User, color: 'pink' },
];

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  // Fonction de déconnexion avec confirmation
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
      <div className={`fixed inset-y-0 left-0 z-30 ${sidebarCollapsed ? 'w-16' : 'w-72'} bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } flex flex-col`} style={{
        transition: 'width 300ms ease-in-out, transform 300ms ease-in-out',
        zIndex: 30
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
                  <div className={`rounded-lg ${
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
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1">
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                      {isActive && (
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Boutons d'action - Desktop */}
        <div className="hidden lg:block p-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="space-y-1">
            <button
              type="button"
              onClick={toggleTheme}
              className={`${sidebarCollapsed ? 'w-12' : 'w-full'} flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-1.5'} text-left rounded-xl group relative text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white`}
              style={{ height: '40px', minHeight: '40px' }}
              title={sidebarCollapsed ? (isDark ? 'Mode clair' : 'Mode sombre') : ''}
            >
              <div className="rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600" style={{ 
                minWidth: '32px', 
                minHeight: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: sidebarCollapsed ? '0' : '6px',
                padding: '6px'
              }}>
                {isDark ? <Sun size={16} className="text-yellow-600 dark:text-yellow-400" /> : <Moon size={16} className="text-gray-600 dark:text-gray-400" />}
              </div>
              {!sidebarCollapsed && (
                <span className="font-medium text-sm truncate">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => setShowLogoutAlert(true)}
              className={`${sidebarCollapsed ? 'w-12' : 'w-full'} flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-1.5'} text-left rounded-xl group relative text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400`}
              style={{ height: '40px', minHeight: '40px' }}
              title={sidebarCollapsed ? 'Se déconnecter' : ''}
            >
              <div className="rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-red-100 dark:group-hover:bg-red-900/20" style={{ 
                minWidth: '32px', 
                minHeight: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: sidebarCollapsed ? '0' : '6px',
                padding: '6px'
              }}>
                <Power size={16} className="text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
              </div>
              {!sidebarCollapsed && (
                <span className="font-medium text-sm truncate">Se déconnecter</span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Main content */}
      <div className={`transition-all duration-500 ease-in-out ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
                {/* Mobile header */}
                <div className="lg:hidden bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-1 flex items-center justify-between fixed top-0 left-0 right-0 z-40" style={{ height: '50px', zIndex: 40 }}>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <img src="/ProFlowlogo.png" alt="ProFlow" className="h-48 w-auto invert dark:invert-0" />
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title={isDark ? 'Mode clair' : 'Mode sombre'}
                    >
                      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLogoutAlert(true)}
                      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Se déconnecter"
                    >
                      <Power className="w-5 h-5" />
                    </button>
                  </div>
                </div>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 min-h-screen pb-12 pt-[70px] md:pt-[70px] lg:pt-6">
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