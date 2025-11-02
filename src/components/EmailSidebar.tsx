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
    <div className="w-64 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-lg rounded-2xl overflow-hidden flex-shrink-0 h-full">
      {/* Compose Button */}
      <div className="px-4 py-4">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-full hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau message</span>
        </button>
      </div>

      {/* Folders */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
        <div className="space-y-1 px-3">
          {/* Boîte de réception - Premier */}
          {(() => {
            const inboxFolder = folders.find(f => f.id === 'inbox');
            if (!inboxFolder) return null;
            const Icon = inboxFolder.icon;
            const isActive = currentFolder === 'inbox';
            const colors = {
              blue: {
                activeBg: 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40',
                activeText: 'text-blue-900 dark:text-blue-200',
                activeIconBg: 'bg-blue-200 dark:bg-blue-800',
                iconColor: 'text-blue-600 dark:text-blue-400',
                inactiveHover: 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20',
                badgeBg: 'bg-blue-200 dark:bg-blue-800',
                badgeText: 'text-blue-900 dark:text-blue-300'
              }
            };
            const colorClasses = colors.blue;
            
            return (
              <button
                onClick={() => onFolderChange('inbox')}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all duration-200 font-medium relative overflow-hidden group
                  ${isActive 
                    ? `${colorClasses.activeBg} ${colorClasses.activeText} shadow-md` 
                    : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${colorClasses.inactiveHover}`
                  }
                `}
              >
                <div className="flex items-center gap-2 relative z-10">
                  <div className={`p-1.5 rounded-full transition-colors ${
                    isActive 
                      ? colorClasses.activeIconBg
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-opacity-80'
                  }`}>
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive 
                        ? colorClasses.iconColor 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <span className={`font-medium ${isActive ? colorClasses.activeText : ''}`}>
                    {inboxFolder.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {inboxFolder.badge !== undefined && inboxFolder.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full min-w-[22px] text-center shadow-sm ${
                      isActive 
                        ? colorClasses.badgeBg + ' ' + colorClasses.badgeText
                        : 'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white'
                    }`}>
                      {inboxFolder.badge}
                    </span>
                  )}
                  {inboxFolder.count !== undefined && inboxFolder.count > 0 && !inboxFolder.badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isActive 
                        ? colorClasses.badgeBg + ' ' + colorClasses.badgeText
                        : 'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {inboxFolder.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })()}

          {/* Favoris */}
          <button
            onClick={handleStarredClick}
            className={`
              w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all duration-200 font-medium relative overflow-hidden group
              ${currentFolder === 'starred'
                ? 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-900 dark:text-amber-300 shadow-md' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }
            `}
          >
            <div className="flex items-center gap-2 relative z-10">
              <div className={`p-1.5 rounded-full ${currentFolder === 'starred' ? 'bg-amber-200 dark:bg-amber-800' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30'}`}>
                <Star className={`w-4 h-4 ${currentFolder === 'starred' ? 'fill-amber-600 dark:fill-amber-400 text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <span className="font-medium">Favoris</span>
            </div>
            {stats.starred_count > 0 && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center relative z-10 ${
                currentFolder === 'starred' 
                  ? 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-300' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                {stats.starred_count}
              </span>
            )}
          </button>

          {folders.filter(f => f.id !== 'inbox').map((folder) => {
            const Icon = folder.icon;
            const isActive = currentFolder === folder.id;
            
            // Palette de couleurs modernisée pour chaque dossier
            const colorClasses: Record<string, { 
              activeBg: string; 
              activeText: string; 
              activeIconBg: string; 
              iconColor: string; 
              inactiveHover: string;
              badgeBg: string;
              badgeText: string;
            }> = {
              blue: {
                activeBg: 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40',
                activeText: 'text-blue-900 dark:text-blue-200',
                activeIconBg: 'bg-blue-200 dark:bg-blue-800',
                iconColor: 'text-blue-600 dark:text-blue-400',
                inactiveHover: 'group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20',
                badgeBg: 'bg-blue-200 dark:bg-blue-800',
                badgeText: 'text-blue-900 dark:text-blue-300'
              },
              green: {
                activeBg: 'bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40',
                activeText: 'text-emerald-900 dark:text-emerald-200',
                activeIconBg: 'bg-emerald-200 dark:bg-emerald-800',
                iconColor: 'text-emerald-600 dark:text-emerald-400',
                inactiveHover: 'group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20',
                badgeBg: 'bg-emerald-200 dark:bg-emerald-800',
                badgeText: 'text-emerald-900 dark:text-emerald-300'
              },
              gray: {
                activeBg: 'bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800/40 dark:to-gray-800/40',
                activeText: 'text-slate-900 dark:text-slate-200',
                activeIconBg: 'bg-slate-200 dark:bg-slate-700',
                iconColor: 'text-slate-600 dark:text-slate-400',
                inactiveHover: 'group-hover:bg-slate-50 dark:group-hover:bg-slate-800/20',
                badgeBg: 'bg-slate-200 dark:bg-slate-700',
                badgeText: 'text-slate-900 dark:text-slate-300'
              },
              purple: {
                activeBg: 'bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40',
                activeText: 'text-violet-900 dark:text-violet-200',
                activeIconBg: 'bg-violet-200 dark:bg-violet-800',
                iconColor: 'text-violet-600 dark:text-violet-400',
                inactiveHover: 'group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20',
                badgeBg: 'bg-violet-200 dark:bg-violet-800',
                badgeText: 'text-violet-900 dark:text-violet-300'
              },
              red: {
                activeBg: 'bg-gradient-to-r from-rose-100 to-red-100 dark:from-rose-900/40 dark:to-red-900/40',
                activeText: 'text-rose-900 dark:text-rose-200',
                activeIconBg: 'bg-rose-200 dark:bg-rose-800',
                iconColor: 'text-rose-600 dark:text-rose-400',
                inactiveHover: 'group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20',
                badgeBg: 'bg-rose-200 dark:bg-rose-800',
                badgeText: 'text-rose-900 dark:text-rose-300'
              },
              yellow: {
                activeBg: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40',
                activeText: 'text-amber-900 dark:text-amber-200',
                activeIconBg: 'bg-amber-200 dark:bg-amber-800',
                iconColor: 'text-amber-600 dark:text-amber-400',
                inactiveHover: 'group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20',
                badgeBg: 'bg-amber-200 dark:bg-amber-800',
                badgeText: 'text-amber-900 dark:text-amber-300'
              }
            };
            
            const colors = colorClasses[folder.color] || colorClasses.blue;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-full text-xs transition-all duration-200 font-medium relative overflow-hidden group
                  ${isActive 
                    ? `${colors.activeBg} ${colors.activeText} shadow-md` 
                    : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 ${colors.inactiveHover}`
                  }
                `}
              >
                <div className="flex items-center gap-2 relative z-10">
                  <div className={`p-1.5 rounded-full transition-colors ${
                    isActive 
                      ? colors.activeIconBg
                      : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-opacity-80'
                  }`}>
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive 
                        ? colors.iconColor 
                        : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <span className={`font-medium ${isActive ? colors.activeText : ''}`}>
                    {folder.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  {folder.badge !== undefined && folder.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full min-w-[22px] text-center shadow-sm ${
                      isActive 
                        ? colors.badgeBg + ' ' + colors.badgeText
                        : 'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white'
                    }`}>
                      {folder.badge}
                    </span>
                  )}
                  {folder.count !== undefined && folder.count > 0 && !folder.badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isActive 
                        ? colors.badgeBg + ' ' + colors.badgeText
                        : 'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700'
                    }`}>
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
