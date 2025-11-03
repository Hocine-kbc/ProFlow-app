import React from 'react';
import { 
  Reply, Archive, ArchiveRestore, Trash2, Star, Download,
  Paperclip, User, ArrowLeft, ArrowRight,
  ChevronDown, X, ChevronLeft, Mail, MailOpen, Calendar, Clock, MoreVertical, Tag
} from 'lucide-react';
import { EmailMessage } from '../types/index.ts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageViewProps {
  message: EmailMessage;
  messageIndex?: number;
  totalMessages?: number;
  onBack: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onReply: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  onMarkRead?: (read: boolean) => void;
  currentUserId?: string | null;
  isArchived?: boolean;
}

export default function MessageView({
  message,
  messageIndex,
  totalMessages,
  onBack,
  onNext,
  onPrevious,
  onReply,
  onArchive,
  onDelete,
  onStar,
  onMarkRead,
  currentUserId,
  isArchived = false
}: MessageViewProps) {
  const hasAttachments = message.attachments && message.attachments.length > 0;
  const [showActionsMenu, setShowActionsMenu] = React.useState(false);

  const handleDownloadAttachment = async (attachment: { name: string; url: string }) => {
    try {
      const response = await fetch(attachment.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  const dateFormatted = format(new Date(message.created_at), 'EEEE d MMMM yyyy à HH:mm', { locale: fr });
  const dateShort = format(new Date(message.created_at), 'EEE d MMM yyyy à HH:mm', { locale: fr });
  const isRead = message.read;
  const isFromMe = message.sender_id === currentUserId;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header fixe avec navigation */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {/* Barre de navigation supérieure */}
        <div className="px-6 py-2 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300"
              title="Retour à la liste"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevious}
                disabled={!onPrevious}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="Message précédent"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={onNext}
                disabled={!onNext}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="Message suivant"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              
              {messageIndex !== undefined && totalMessages !== undefined && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                  {messageIndex + 1} / {totalMessages}
                </span>
              )}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="flex items-center gap-2">
            {!isFromMe && onMarkRead && (
              <button
                onClick={() => onMarkRead(!message.read)}
                className={`p-2 rounded-full transition-all ${
                  message.read
                    ? 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                    : 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
                title={message.read ? 'Marquer comme non lu' : 'Marquer comme lu'}
              >
                {message.read ? (
                  <Mail className="w-5 h-5" />
                ) : (
                  <MailOpen className="w-5 h-5" />
                )}
              </button>
            )}
            
            <button
              onClick={onStar}
              className={`p-2 rounded-full transition-all ${
                message.is_starred 
                  ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
              }`}
              title="Marquer comme favori"
            >
              <Star className={`w-5 h-5 ${message.is_starred ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={onArchive}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 rounded-full transition-colors"
              title={isArchived ? 'Désarchiver' : 'Archiver'}
            >
              {isArchived ? (
                <ArchiveRestore className="w-5 h-5" />
              ) : (
                <Archive className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={onDelete}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Supprimer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={onReply}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Reply className="w-4 h-4" />
              <span>Répondre</span>
            </button>
          </div>
        </div>

        {/* En-tête du message - Compact */}
        <div className="px-6 py-3">
          {/* Sujet et badges compacts */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {message.subject || '(Sans objet)'}
                </h1>
                {!isRead && (
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded-full flex-shrink-0">
                    Non lu
                  </span>
                )}
                {message.priority && message.priority !== 'normal' && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full flex-shrink-0 ${
                    message.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                    message.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}>
                    {message.priority === 'urgent' ? 'Urgent' : message.priority === 'high' ? 'Important' : 'Faible'}
                  </span>
                )}
              </div>
              
              {/* Métadonnées très compactes */}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{message.sender?.email || 'Expéditeur inconnu'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{message.recipient?.email || 'Destinataire inconnu'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <time title={dateFormatted} className="whitespace-nowrap">{dateShort}</time>
                </div>
              </div>
            </div>
          </div>

          {/* Pièces jointes - prévisualisation compacte */}
          {hasAttachments && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Paperclip className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {message.attachments!.length} pièce{message.attachments!.length > 1 ? 's' : ''} jointe{message.attachments!.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Contenu du message - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-visible bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Contenu principal dans une carte */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 mb-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 text-base leading-relaxed">
                {message.content || <span className="text-gray-400 italic">Aucun contenu</span>}
              </div>
            </div>
          </div>

          {/* Pièces jointes détaillées */}
          {hasAttachments && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Pièces jointes
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({message.attachments!.length})
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {message.attachments!.map((attachment, index) => {
                  const isImage = attachment.type?.startsWith('image/');
                  const isPdf = attachment.type === 'application/pdf';
                  const fileSizeKB = (attachment.size / 1024).toFixed(1);
                  const fileSizeMB = (attachment.size / (1024 * 1024)).toFixed(2);
                  const displaySize = attachment.size > 1024 * 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
                  
                  return (
                    <div
                      key={index}
                      className="group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => handleDownloadAttachment(attachment)}
                    >
                      {isImage ? (
                        <div className="aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
                          {isPdf ? (
                            <div className="text-center">
                              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Paperclip className="w-6 h-6 text-red-500 dark:text-red-400" />
                              </div>
                              <p className="text-xs font-semibold text-red-600 dark:text-red-400">PDF</p>
                            </div>
                          ) : (
                            <Paperclip className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                      )}
                      
                      <div className="p-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{displaySize}</p>
                          <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                        </div>
                      </div>
                      
                      {/* Overlay au survol */}
                      <div className="absolute inset-0 bg-blue-600/90 dark:bg-blue-700/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="text-white text-center">
                          <Download className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm font-medium">Cliquer pour télécharger</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Zone d'actions en bas */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {!isFromMe && onMarkRead && (
                <button
                  onClick={() => onMarkRead(!message.read)}
                  className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 text-sm font-medium ${
                    message.read
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                      : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                  }`}
                >
                  {message.read ? (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Marquer comme non lu</span>
                    </>
                  ) : (
                    <>
                      <MailOpen className="w-4 h-4" />
                      <span>Marquer comme lu</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={onStar}
                className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 text-sm font-medium ${
                  message.is_starred 
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Star className={`w-4 h-4 ${message.is_starred ? 'fill-current' : ''}`} />
                <span>{message.is_starred ? 'Favori' : 'Ajouter aux favoris'}</span>
              </button>
              
              <button
                onClick={onArchive}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                {isArchived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4" />
                    <span>Désarchiver</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Archiver</span>
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={onReply}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-full transition-colors flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
            >
              <Reply className="w-5 h-5" />
              <span>Répondre</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
