import React, { useState } from 'react';
import { Menu, X, Home, Users, Clock, FileText, BarChart3, Settings, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'services', label: 'Prestations', icon: Clock },
  { id: 'invoices', label: 'Factures', icon: FileText },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'profile', label: 'Profil', icon: User },
];

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="ProFlow Logo" className="w-8 h-8" />
            <h1 className="text-xl font-bold text-blue-600">ProFlow</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-700 lg:hidden"
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors duration-200 ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={20} className="mr-3" />
                {item.label}
              </button>
            );
          })}
          <div className="px-6 mt-6">
            <button
              onClick={async () => { await supabase.auth.signOut(); }}
              className="w-full flex items-center px-4 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <LogOut size={20} className="mr-3" />
              Se déconnecter
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 lg:hidden"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex items-center space-x-3">
              <img src="/logo.png" alt="ProFlow Logo" className="w-6 h-6" />
              <span className="text-lg font-semibold text-gray-800">ProFlow</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}