import React from 'react';
import { Inbox, Send, FileText, Archive, Trash2, Star, AlertCircle, Plus } from 'lucide-react';
import { MessageFolder, MessageStats } from '../types/index.ts';

interface EmailSidebarProps {
  currentFolder: MessageFolder;
  onFolderChange: (folder: MessageFolder) => void;
  stats: MessageStats;
  onCompose: () => void;
}

export default function EmailSidebar({
  currentFolder,
  onFolderChange,
  stats,
  onCompose
}: EmailSidebarProps) {
  const folders = [
    { 
      id: 'inbox' as MessageFolder, 
      label: 'Boîte de réception', 
      icon: Inbox, 
      count: stats.inbox_count, 
      badge: stats.unread_count,
      color: 'blue'
    },
    { 
      id: 'sent' as MessageFolder, 
      label: 'Envoyés', 
      icon: Send, 
      count: stats.sent_count,
      color: 'green'
    },
    { 
      id: 'drafts' as MessageFolder, 
      label: 'Brouillons', 
      icon: FileText, 
      count: stats.drafts_count,
      color: 'gray'
    },
    { 
      id: 'archive' as MessageFolder, 
      label: 'Archivés', 
      icon: Archive, 
      count: stats.archived_count,
      color: 'purple'
    },
    { 
      id: 'trash' as MessageFolder, 
      label: 'Corbeille', 
      icon: Trash2,
      color: 'red'
    }
  ];

  const handleStarredClick = () => {
    onFolderChange('starred');
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm rounded-2xl overflow-hidden flex-shrink-0 h-full">
      {/* Compose Button */}
      <div className="px-4 py-5">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full hover:shadow-lg transition-all text-sm font-medium shadow-md border-2 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nouveau message</span>
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="space-y-1 px-2">
          {/* Favoris */}
          <button
            onClick={handleStarredClick}
            className={`
              w-full flex items-center justify-between px-4 py-2.5 rounded-r-full text-sm transition-all font-medium
              ${currentFolder === 'starred'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 shadow-sm border-r-4 border-yellow-500 dark:border-yellow-400' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <Star className={`w-5 h-5 ${currentFolder === 'starred' ? 'fill-yellow-500 dark:fill-yellow-400 text-yellow-500 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`} />
              <span>Favoris</span>
            </div>
            {stats.starred_count > 0 && (
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {stats.starred_count}
              </span>
            )}
          </button>

          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            
            // Couleurs spécifiques pour chaque dossier
            const colorClasses: Record<string, { active: string; inactive: string; border: string; icon: string }> = {
              blue: {
                active: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-blue-600 dark:border-blue-400',
                icon: 'text-blue-600 dark:text-blue-400'
              },
              green: {
                active: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-green-600 dark:border-green-400',
                icon: 'text-green-600 dark:text-green-400'
              },
              gray: {
                active: 'bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-gray-600 dark:border-gray-400',
                icon: 'text-gray-600 dark:text-gray-400'
              },
              purple: {
                active: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-purple-600 dark:border-purple-400',
                icon: 'text-purple-600 dark:text-purple-400'
              },
              red: {
                active: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-red-600 dark:border-red-400',
                icon: 'text-red-600 dark:text-red-400'
              },
              yellow: {
                active: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
                inactive: 'text-gray-700 dark:text-gray-300',
                border: 'border-yellow-500 dark:border-yellow-400',
                icon: 'text-yellow-500 dark:text-yellow-400'
              }
            };
            
            const colors = colorClasses[folder.color] || colorClasses.blue;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-2.5 rounded-r-full text-sm transition-all font-medium
                  ${isActive 
                    ? `${colors.active} shadow-sm border-r-4 ${colors.border}` 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? colors.icon : 'text-gray-500 dark:text-gray-400'}`} />
                  <span className={isActive ? '' : 'text-gray-700 dark:text-gray-300'}>{folder.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {folder.badge !== undefined && folder.badge > 0 && (
                    <span className="px-2.5 py-1 text-xs font-bold bg-red-500 dark:bg-red-600 text-white rounded-full min-w-[24px] text-center shadow-sm">
                      {folder.badge}
                    </span>
                  )}
                  {folder.count !== undefined && folder.count > 0 && !folder.badge && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {folder.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
