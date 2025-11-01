import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Clock, Mail, AlertCircle, Save, FileText } from 'lucide-react';
import { EmailMessage, MessageAttachment, SendOptions, ScheduleOptions } from '../types/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useApp } from '../contexts/AppContext.tsx';
import { format } from 'date-fns';

interface EmailComposerProps {
  onClose: () => void;
  replyTo?: EmailMessage;
  onSent?: () => void;
}

export default function EmailComposer({ onClose, replyTo, onSent }: EmailComposerProps) {
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [sendExternal, setSendExternal] = useState(false);
  const [externalRecipients, setExternalRecipients] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useApp();

  // Remplir les champs si c'est une réponse
  useEffect(() => {
    if (replyTo) {
      const recipientEmail = replyTo.sender?.email || '';
      setTo(recipientEmail);
      setSubject(replyTo.subject?.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject || ''}`);
      setContent(`\n\n--- Message original ---\n${replyTo.content}`);
    }
  }, [replyTo]);

  // Upload de fichiers
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const uploadedFiles: MessageAttachment[] = [];

      for (const file of Array.from(files)) {
        // Vérifier la taille (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          showNotification('error', 'Erreur', `Le fichier ${file.name} est trop volumineux (max 10MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${user.id}/${fileName}`;

        // Upload vers Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Obtenir l'URL publique
        const { data: { publicUrl } } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          url: publicUrl,
          size: file.size,
          type: file.type || 'application/octet-stream'
        });
      }

      setAttachments(prev => [...prev, ...uploadedFiles]);
      showNotification('success', 'Succès', 'Fichiers téléversés avec succès');
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification('error', 'Erreur', 'Impossible de téléverser les fichiers');
    } finally {
      setUploading(false);
    }
  };

  // Supprimer une pièce jointe
  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Sauvegarder comme brouillon
  const handleSaveDraft = async () => {
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          recipient_id: to, // Temporaire, sera mis à jour à l'envoi
          subject: subject || '(Sans objet)',
          content: content || '',
          attachments: attachments,
          status: 'draft',
          folder: 'drafts',
          priority: priority
        });

      if (error) throw error;
      showNotification('success', 'Succès', 'Brouillon sauvegardé');
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      showNotification('error', 'Erreur', 'Impossible de sauvegarder le brouillon');
    } finally {
      setSending(false);
    }
  };

  // Envoyer le message
  const handleSend = async () => {
    if (!to.trim()) {
      showNotification('error', 'Erreur', 'Veuillez saisir un destinataire');
      return;
    }

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // On ne peut pas interroger auth.users depuis le client
      // Le backend va gérer la recherche de l'utilisateur par email

      // Préparer les options d'envoi
      const sendOptions: SendOptions = {
        send_immediately: !showSchedule,
        schedule: showSchedule ? {
          scheduled_at: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        } : undefined,
        send_external_email: sendExternal,
        external_recipients: sendExternal && externalRecipients 
          ? externalRecipients.split(',').map(e => e.trim())
          : []
      };

      // Créer le message
      // Le backend va résoudre l'email du destinataire en ID
      const messageData = {
        sender_id: user.id,
        recipient_email: to.trim(), // Envoyer l'email au lieu de l'ID
        recipient_id: null, // Sera résolu par le backend
        subject: subject || '(Sans objet)',
        content: content,
        attachments: attachments,
        status: showSchedule ? 'scheduled' : 'sent',
        folder: showSchedule ? 'drafts' : 'sent',
        priority: priority,
        scheduled_at: showSchedule ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
        reply_to_id: replyTo?.id || null
      };

      // Appeler l'API backend pour envoyer
      const backendUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      const response = await fetch(`${backendUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          message: messageData,
          options: sendOptions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'envoi');
      }

      showNotification('success', 'Succès', showSchedule ? 'Message programmé' : 'Message envoyé');
      if (onSent) onSent();
      onClose();
    } catch (error: any) {
      console.error('Error sending message:', error);
      showNotification('error', 'Erreur', error.message || 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-800/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-t-3xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {replyTo ? 'Répondre' : 'Nouveau message'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white/40 dark:bg-gray-900/40">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              À
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              placeholder="email@exemple.com"
              required
            />
          </div>

          {/* CC / BCC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CC
              </label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                placeholder="cc@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                BCC
              </label>
              <input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                placeholder="bcc@exemple.com"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
              placeholder="Objet du message"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priorité
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
            >
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pièces jointes ({attachments.length})
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {attachments.map((att, index) => {
                  const isImage = att.type?.startsWith('image/');
                  const isPdf = att.type === 'application/pdf';
                  const fileSizeKB = (att.size / 1024).toFixed(1);
                  
                  return (
                    <div
                      key={index}
                      className="relative group bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                    >
                      {/* Aperçu pour les images */}
                      {isImage ? (
                        <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img
                            src={att.url}
                            alt={att.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ) : isPdf ? (
                        <div className="aspect-square flex items-center justify-center bg-red-50 dark:bg-red-900/20">
                          <FileText className="w-12 h-12 text-red-500" />
                        </div>
                      ) : (
                        <div className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <Paperclip className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      
                      {/* Nom du fichier et actions */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{fileSizeKB} KB</p>
                      </div>
                      
                      {/* Bouton supprimer */}
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
                        title="Supprimer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule */}
          {showSchedule && (
            <div className="grid grid-cols-2 gap-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Heure
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                />
              </div>
            </div>
          )}

          {/* External Email */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendExternal"
              checked={sendExternal}
              onChange={(e) => setSendExternal(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="sendExternal" className="text-sm text-gray-700 dark:text-gray-300">
              Envoyer aussi par email externe (SendGrid)
            </label>
          </div>

          {sendExternal && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Emails externes (séparés par des virgules)
              </label>
              <input
                type="text"
                value={externalRecipients}
                onChange={(e) => setExternalRecipients(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                placeholder="externe1@example.com, externe2@example.com"
              />
            </div>
          )}

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none transition-all"
              placeholder="Tapez votre message ici..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 rounded-b-3xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-full text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className={`p-2.5 rounded-full transition-colors ${showSchedule ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Brouillon</span>
            </button>
            <button
              onClick={handleSend}
              disabled={sending || uploading}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

