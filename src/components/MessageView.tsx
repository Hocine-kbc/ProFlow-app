import React from 'react';
import { 
  Reply, Archive, ArchiveRestore, Trash2, Star, Download,
  Paperclip, User, ArrowLeft, ArrowRight,
  ChevronDown, X, ChevronLeft
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
  isArchived = false
}: MessageViewProps) {
  const hasAttachments = message.attachments && message.attachments.length > 0;

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

  const dateFormatted = format(new Date(message.created_at), 'EEE d MMM HH:mm', { locale: fr });

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
      {/* Navigation Bar - Fixe */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Retour à la liste"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-600"></div>
          <button
            onClick={onPrevious}
            disabled={!onPrevious}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Message précédent"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Message suivant"
          >
            <ArrowRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          
          {messageIndex !== undefined && totalMessages !== undefined && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 px-2">
              {messageIndex + 1} sur {totalMessages}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onArchive}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title={isArchived ? 'Désarchiver' : 'Archiver'}
          >
            {isArchived ? (
              <ArchiveRestore className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            ) : (
              <Archive className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={onStar}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ${message.is_starred ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}
            title="Marquer comme favori"
          >
            <Star className={`w-4 h-4 ${message.is_starred ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Message Header - Fixe */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                {message.subject || '(Sans objet)'}
              </h1>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">De:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  {message.sender?.email || 'Expéditeur inconnu'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">À:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  {message.recipient?.email || 'Destinataire inconnu'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600 dark:text-gray-400 min-w-[50px]">Date:</span>
                <span className="text-gray-900 dark:text-gray-100">{dateFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-6 bg-white dark:bg-gray-800">
        <div className="max-w-none">
          <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Pièces jointes ({message.attachments!.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {message.attachments!.map((attachment, index) => {
                const isImage = attachment.type?.startsWith('image/');
                const isPdf = attachment.type === 'application/pdf';
                const fileSizeKB = (attachment.size / 1024).toFixed(1);
                
                return (
                  <div
                    key={index}
                    className="relative group bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleDownloadAttachment(attachment)}
                  >
                    {isImage ? (
                      <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-600">
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : isPdf ? (
                      <div className="aspect-square flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                        <Paperclip className="w-10 h-10 text-red-500 dark:text-red-400" />
                      </div>
                    ) : (
                      <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-600">
                        <Paperclip className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    
                    <div className="p-2.5">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate" title={attachment.name}>
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{fileSizeKB} KB</p>
                    </div>
                    
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                        <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reply Button */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onReply}
            className="px-5 py-2.5 bg-blue-600 dark:bg-blue-500 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Reply className="w-4 h-4" />
            <span>Répondre</span>
          </button>
        </div>
      </div>
    </div>
  );
}
