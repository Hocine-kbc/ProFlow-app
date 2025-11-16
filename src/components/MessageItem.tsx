import React, { useState } from 'react';
import { Star, Paperclip, Mail, MailOpen, Trash2, Archive, Clock } from 'lucide-react';
import { EmailMessage } from '../types/index.ts';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageItemProps {
  message: EmailMessage;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onStar: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSnooze?: () => void;
  onMarkRead?: (read: boolean) => void;
  currentUserId: string | null;
  isFirst?: boolean;
  isLast?: boolean;
}

export default function MessageItem({
  message,
  isSelected,
  onSelect,
  onClick,
  onStar,
  onArchive,
  onDelete,
  onSnooze,
  onMarkRead,
  currentUserId,
  isFirst = false,
  isLast = false
}: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isFromMe = message.sender_id === currentUserId;
  const displayName = isFromMe 
    ? (message.recipient?.email || 'Destinataire inconnu')
    : (message.sender?.email || 'Expéditeur inconnu');
  
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const date = new Date(message.created_at);
  const isToday = date.toDateString() === new Date().toDateString();
  const timeAgo = isToday 
    ? formatDistanceToNow(date, { addSuffix: true, locale: fr })
    : format(date, 'd MMM', { locale: fr });

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStar();
  };

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const isUnread = !message.read && !isFromMe;

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleSnoozeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSnooze) onSnooze();
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        px-3 sm:px-4 md:px-6 py-3 cursor-pointer transition-[background-color,box-shadow,transform] duration-200 ease-in-out 
        grid grid-cols-[32px_32px_minmax(0,2fr)] sm:grid-cols-[40px_40px_280px_1fr_120px_auto] gap-2 sm:gap-3
        ${isFirst ? '' : 'border-t border-gray-200 dark:border-gray-700'}
        items-center transform overflow-x-hidden
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-600 dark:border-l-blue-400 shadow-sm' 
          : ''
        }
        ${!isSelected && isUnread
          ? 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md hover:scale-[1.01] font-semibold'
          : !isSelected
          ? 'hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md hover:scale-[1.01]'
          : ''
        }
      `}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleSelectClick}
          className={`p-1 rounded transition-all duration-200 ${isSelected || isHovered ? 'opacity-100 scale-100 hover:bg-gray-200 dark:hover:bg-gray-600' : 'opacity-20 scale-90'}`}
        >
          <div className={`w-4 h-4 border-2 rounded-full transition-all ${isSelected ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 shadow-sm' : 'border-gray-400 dark:border-gray-500 hover:border-gray-500 dark:hover:border-gray-400'}`}>
            {isSelected && (
              <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Star */}
      <div className="flex items-center justify-center">
        <button
          onClick={handleStarClick}
          className={`p-1 rounded transition-all duration-200 ${isSelected || isHovered || message.is_starred ? 'opacity-100 scale-100 text-gray-400 hover:text-yellow-500' : 'opacity-20 scale-90 text-gray-400'}`}
        >
          <Star 
            className={`w-4 h-4 transition-all ${message.is_starred ? 'fill-yellow-500 text-yellow-500 scale-110' : 'hover:scale-110'}`}
          />
        </button>
      </div>

      {/* Expéditeur + sujet (stack sur mobile) */}
      <div className="col-span-1 sm:col-span-1 truncate">
        <span className={`block text-xs sm:text-sm ${isUnread ? 'text-gray-900 dark:text-gray-100 font-bold' : 'text-gray-900 dark:text-gray-200 font-medium'}`}>
          {displayName}
        </span>
        <div className="mt-0.5 flex items-center gap-1 sm:hidden">
          <span className={`text-xs truncate ${isUnread ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
            {message.subject || '(Sans objet)'}
          </span>
          {hasAttachments && (
            <Paperclip className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Sujet (desktop) */}
      <div className="hidden sm:flex truncate items-center gap-2">
        <span className={`text-sm truncate ${isUnread ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
          {message.subject || '(Sans objet)'}
        </span>
        {hasAttachments && (
          <Paperclip className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
      </div>

      {/* Date */}
      <div className="hidden sm:block text-right">
        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          {timeAgo}
        </span>
      </div>

      {/* Boutons d'action au survol (desktop) */}
      <div className="hidden sm:flex items-center justify-center gap-1">
        {isHovered && (
          <>
            {!isFromMe && onMarkRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(!message.read);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                title={message.read ? 'Marquer comme non lu' : 'Marquer comme lu'}
              >
                {message.read ? (
                  <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400" />
                ) : (
                  <MailOpen className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                )}
              </button>
            )}
            {onSnooze && (
              <button
                onClick={handleSnoozeClick}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                title="Mettre en attente"
              >
                <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
              </button>
            )}
            <button
              onClick={handleArchiveClick}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Archiver"
            >
              <Archive className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400" />
            </button>
            <button
              onClick={handleDeleteClick}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
