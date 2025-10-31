import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Search, User, Trash2, Check, CheckCheck, Paperclip, X, Download, File, Image, FileText, FileJson, Plus, Mail } from 'lucide-react';
import { Conversation, Message, MessageAttachment } from '../types/index.ts';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
  getUnreadMessagesCount,
  uploadMessageAttachment,
  fetchClients,
} from '../lib/api.ts';
import { useApp } from '../contexts/AppContext.tsx';
import { supabase } from '../lib/supabase.ts';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [uploadedAttachments, setUploadedAttachments] = useState<MessageAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ isOpen: boolean; messageId: string | null; type: 'message' | 'conversation' }>({
    isOpen: false,
    messageId: null,
    type: 'message'
  });
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useApp();

  // Récupérer l'utilisateur actuel
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id || null);
    });
  }, []);

  // Charger les clients pour le nouveau message
  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientsData = await fetchClients();
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };
    loadClients();
  }, []);

  // Charger les conversations et le compteur
  const loadConversations = async () => {
    try {
      setLoading(true);
      const [convs, count] = await Promise.all([
        fetchConversations(),
        getUnreadMessagesCount()
      ]);
      setConversations(convs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showNotification('error', 'Erreur', 'Impossible de charger les conversations');
    } finally {
      setLoading(false);
    }
  };

  // Charger les messages d'une conversation
  const loadMessages = async (conversation: Conversation) => {
    try {
      setLoading(true);
      const msgs = await fetchMessages(conversation.other_user_id);
      setMessages(msgs);

      // Marquer la conversation comme lue
      if (conversation.unread_count > 0) {
        await markConversationAsRead(conversation.other_user_id);
        setUnreadCount(prev => Math.max(0, prev - conversation.unread_count));
        setConversations(prev => prev.map(c =>
          c.id === conversation.id ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showNotification('error', 'Erreur', 'Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et toutes les 10 secondes
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Recharger les messages quand la conversation change
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      const interval = setInterval(() => {
        if (selectedConversation) {
          fetchMessages(selectedConversation.other_user_id).then(setMessages);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gérer la sélection des fichiers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => uploadMessageAttachment(file));
      const uploaded = await Promise.all(uploadPromises);
      setUploadedAttachments(prev => [...prev, ...uploaded]);
      showNotification('success', 'Fichier(s) ajouté(s)', `${files.length} fichier(s) prêt(s) à être envoyé(s)`);
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification('error', 'Erreur', 'Impossible de télécharger les fichiers');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Supprimer une pièce jointe
  const removeAttachment = (index: number) => {
    setUploadedAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!selectedConversation || (!messageContent.trim() && uploadedAttachments.length === 0)) return;

    try {
      setSending(true);
      const newMessage = await sendMessage(
        selectedConversation.other_user_id,
        messageContent.trim() || '(Aucun texte)',
        messageSubject.trim() || undefined,
        undefined,
        uploadedAttachments.length > 0 ? uploadedAttachments : undefined
      );
      
      setMessages(prev => [...prev, newMessage]);
      setMessageContent('');
      setMessageSubject('');
      setUploadedAttachments([]);
      
      // Recharger les conversations pour mettre à jour le dernier message
      await loadConversations();
      
      // Scroll vers le bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      showNotification('success', 'Message envoyé', 'Votre message a été envoyé avec succès');
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('error', 'Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // Ouvrir la modal de confirmation de suppression
  const handleDeleteClick = (messageId: string, type: 'message' | 'conversation' = 'message') => {
    setShowDeleteConfirm({ isOpen: true, messageId, type });
  };

  // Supprimer un message confirmé
  const confirmDelete = async () => {
    try {
      if (showDeleteConfirm.type === 'message' && showDeleteConfirm.messageId) {
        // Supprimer un message individuel
        await deleteMessage(showDeleteConfirm.messageId);
        setMessages(prev => prev.filter(m => m.id !== showDeleteConfirm.messageId));
        showNotification('success', 'Message supprimé', 'Le message a été supprimé avec succès');
      } else if (showDeleteConfirm.type === 'conversation') {
        // Supprimer tous les messages de la conversation
        let messagesToDelete: Message[] = [];
        
        // Déterminer quelle conversation supprimer
        const conversationToDelete = selectedConversation || 
          (showDeleteConfirm.messageId ? conversations.find(c => c.other_user_id === showDeleteConfirm.messageId) : null);
        
        if (conversationToDelete && messages.length > 0) {
          // Utiliser les messages déjà chargés
          messagesToDelete = messages.filter(m => 
            (m.sender_id === currentUser || m.recipient_id === currentUser)
          );
        } else if (showDeleteConfirm.messageId) {
          // Charger les messages de la conversation si nécessaire
          try {
            const convMessages = await fetchMessages(showDeleteConfirm.messageId);
            messagesToDelete = convMessages.filter(m => 
              (m.sender_id === currentUser || m.recipient_id === currentUser)
            );
          } catch (error) {
            console.error('Error fetching messages for deletion:', error);
            throw new Error('Impossible de charger les messages à supprimer');
          }
        }
        
        // Supprimer tous les messages de la conversation (envoyés ET reçus)
        let deletedCount = 0;
        for (const msg of messagesToDelete) {
          try {
            await deleteMessage(msg.id);
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting message ${msg.id}:`, error);
            // Continue avec les autres messages même si l'un échoue
          }
        }
        
        // Mettre à jour l'interface
        if (selectedConversation) {
          setMessages([]);
          setSelectedConversation(null);
        }
        
        // Recharger les conversations
        await loadConversations();
        
        if (deletedCount > 0) {
          showNotification('success', 'Conversation supprimée', `${deletedCount} message${deletedCount > 1 ? 's' : ''} supprimé${deletedCount > 1 ? 's' : ''}`);
        } else {
          showNotification('info', 'Aucun message supprimé', 'Aucun message n\'a pu être supprimé');
        }
      } else {
        // Cas non géré
        throw new Error('Type de suppression non reconnu');
      }
      
      // Fermer la modal
      setShowDeleteConfirm({ isOpen: false, messageId: null, type: 'message' });
    } catch (error) {
      console.error('Error deleting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      showNotification('error', 'Erreur', `Impossible de supprimer : ${errorMessage}`);
      setShowDeleteConfirm({ isOpen: false, messageId: null, type: 'message' });
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
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf')) return FileText;
    if (type.includes('json')) return FileJson;
    return File;
  };

  const filteredConversations = conversations.filter(c =>
    c.other_user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Créer une nouvelle conversation
  const handleNewConversation = async () => {
    if (!recipientEmail.trim()) {
      showNotification('error', 'Erreur', 'Veuillez entrer un email ou un ID utilisateur');
      return;
    }

    try {
      // Chercher l'utilisateur par email ou utiliser l'ID directement
      let userId = recipientId;
      
      if (!userId && recipientEmail.includes('@')) {
        // Chercher par email dans les clients d'abord
        const matchingClient = clients.find(c => c.email?.toLowerCase() === recipientEmail.toLowerCase());
        if (matchingClient) {
          // Pour l'instant, on utilise l'email comme identifiant
          // Dans un vrai système, il faudrait lier les clients aux utilisateurs
          userId = recipientEmail;
        } else {
          // Chercher dans auth.users (nécessite une fonction Supabase ou API)
          // Pour l'instant, on va utiliser l'email comme placeholder
          userId = recipientEmail;
        }
      } else if (!userId) {
        userId = recipientEmail; // Assume que c'est un ID
      }

      // Créer la conversation
      const newConversation: Conversation = {
        id: userId,
        other_user_id: userId,
        other_user_email: recipientEmail,
        unread_count: 0,
      };

      setSelectedConversation(newConversation);
      setShowNewMessageModal(false);
      setRecipientEmail('');
      setRecipientId('');
      
      showNotification('success', 'Nouvelle conversation', 'Vous pouvez maintenant envoyer un message');
    } catch (error) {
      console.error('Error creating conversation:', error);
      showNotification('error', 'Erreur', 'Impossible de créer la conversation');
    }
  };


  return (
    <div className="flex h-[calc(100vh-120px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm">
      {/* Sidebar des conversations - Design moderne */}
      <div className="w-96 border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg">
        {/* Header sidebar avec gradient */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-700">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">
                Messages
              </h2>
            </div>
            {unreadCount > 0 && (
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">
                {unreadCount} nouveau{unreadCount > 1 ? 'x' : ''}
              </span>
            )}
          </div>
          
          {/* Bouton Nouveau message - Style premium */}
          <button
            type="button"
            onClick={() => setShowNewMessageModal(true)}
            className="w-full mb-4 px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] border border-white/30 hover:border-white/40"
          >
            <Plus className="w-5 h-5" />
            Nouveau message
          </button>
          
          {/* Barre de recherche - Design épuré et moderne */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm">
                <Search className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <input
              type="text"
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-[52px] pr-11 py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 backdrop-blur-md border-2 border-white/10 hover:border-white/20 focus:border-white/30 rounded-2xl text-sm font-medium text-white placeholder-white/40 focus:placeholder-white/50 focus:outline-none transition-all duration-300 shadow-md hover:shadow-lg focus:shadow-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 z-10"
                title="Effacer la recherche"
              >
                <div className="p-1 rounded-full hover:bg-white/20 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Liste des conversations - Design moderne avec cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-6 font-medium">
                  {searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewMessageModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 text-sm font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto transform hover:scale-105"
                >
                  <Plus className="w-5 h-5" />
                  Nouveau message
                </button>
              </div>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group w-full p-4 rounded-xl transition-all duration-200 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-md border-2 border-blue-300 dark:border-blue-600 transform scale-[1.02]'
                    : 'bg-white/50 dark:bg-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedConversation(conversation)}
                    className="flex-1 flex items-start gap-4 text-left min-w-0"
                  >
                    {/* Avatar avec badge */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-lg ${
                        selectedConversation?.id === conversation.id ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''
                      }`}>
                        <User className="w-7 h-7 text-white" />
                      </div>
                      {conversation.unread_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
                          {conversation.client?.name || conversation.other_user_email}
                        </h4>
                        {conversation.last_message && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                            {formatDate(conversation.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <div className="space-y-1">
                          {conversation.last_message.subject && (
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                              {conversation.last_message.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate leading-relaxed">
                            {conversation.last_message.content}
                          </p>
                          {conversation.last_message.attachments && conversation.last_message.attachments.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <Paperclip className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {conversation.last_message.attachments.length} pièce{conversation.last_message.attachments.length > 1 ? 's' : ''} jointe{conversation.last_message.attachments.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {/* Bouton de suppression */}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      try {
                        handleDeleteClick(conversation.other_user_id, 'conversation');
                      } catch (error) {
                        console.error('Error opening delete modal:', error);
                        showNotification('error', 'Erreur', 'Impossible d\'ouvrir la confirmation de suppression');
                      }
                    }}
                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 transform hover:scale-110"
                    title="Supprimer la conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Zone principale de conversation - Design moderne */}
      <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        {selectedConversation ? (
          <>
            {/* Header de conversation avec gradient */}
            <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900/50 backdrop-blur-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 dark:from-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-lg">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {selectedConversation.client?.name || selectedConversation.other_user_email}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedConversation.other_user_email}
                    </p>
                  </div>
                </div>
                
                {/* Menu actions conversation */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteClick('', 'conversation')}
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200 hover:scale-110"
                    title="Supprimer tous mes messages de cette conversation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages - Design moderne avec bulles */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-900/30 dark:to-transparent">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Chargement des messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
                      <MessageCircle className="w-12 h-12 text-blue-500 dark:text-blue-400 opacity-50" />
                    </div>
                    <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Aucun message</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Commencez la conversation !</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.sender_id === currentUser;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className={`flex items-start gap-3 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar pour les messages reçus */}
                        {!isOwn && (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center flex-shrink-0 shadow-md">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          {message.subject && (
                            <div className={`text-xs font-bold mb-1 px-2 ${isOwn ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {message.subject}
                            </div>
                          )}
                          
                          <div
                            className={`rounded-2xl px-5 py-4 shadow-lg ${
                              isOwn
                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            
                            {/* Pièces jointes */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className={`mt-4 space-y-2 ${isOwn ? 'border-t border-blue-400/30 pt-3' : 'border-t border-gray-200 dark:border-gray-600 pt-3'}`}>
                                {message.attachments.map((attachment, idx) => {
                                  const FileIcon = getFileIcon(attachment.type);
                                  return (
                                    <a
                                      key={idx}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] ${
                                        isOwn
                                          ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                                          : 'bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-900 dark:text-white'
                                      }`}
                                    >
                                      <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                        <FileIcon className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate">{attachment.name}</p>
                                        <p className="text-xs opacity-75">{formatFileSize(attachment.size)}</p>
                                      </div>
                                      <Download className="w-4 h-4 opacity-75" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-2 mt-2 text-xs ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span className="text-gray-500 dark:text-gray-400">{formatDate(message.created_at)}</span>
                            {isOwn && (
                              <span className={message.read ? 'text-blue-500' : 'text-gray-400'}>
                                {message.read ? <CheckCheck className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </span>
                            )}
                            {/* Bouton de suppression - visible pour tous les messages (envoyés et reçus) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  handleDeleteClick(message.id, 'message');
                                } catch (error) {
                                  console.error('Error opening delete modal:', error);
                                  showNotification('error', 'Erreur', 'Impossible d\'ouvrir la confirmation de suppression');
                                }
                              }}
                              className={`text-gray-400 hover:text-red-500 transition-all duration-200 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 ${
                                hoveredMessageId === message.id ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title={isOwn ? 'Supprimer le message' : 'Supprimer ce message reçu'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Avatar pour les messages envoyés */}
                        {isOwn && (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-md">
                            <User className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulaire d'envoi - Design moderne */}
            <div className="p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900/50 backdrop-blur-lg">
              {/* Pièces jointes uploadées */}
              {uploadedAttachments.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {uploadedAttachments.map((attachment, index) => {
                    const FileIcon = getFileIcon(attachment.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-full shadow-sm"
                      >
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                          <FileIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                          {attachment.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <input
                type="text"
                placeholder="Sujet (optionnel)"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                className="w-full mb-3 px-5 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              />
              <div className="flex items-end gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer shadow-sm hover:shadow-md"
                  title="Ajouter des pièces jointes"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </label>
                
                <textarea
                  placeholder="Tapez votre message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={3}
                  className="flex-1 px-5 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={(!messageContent.trim() && uploadedAttachments.length === 0) || sending || uploading}
                  className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                  title="Envoyer (Entrée)"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                💡 Appuyez sur <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Entrée</kbd> pour envoyer, <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Shift+Entrée</kbd> pour une nouvelle ligne
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/30 dark:to-transparent">
            <div className="text-center p-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center shadow-xl">
                <MessageCircle className="w-16 h-16 text-blue-500 dark:text-blue-400 opacity-60" />
              </div>
              <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-3">
                Sélectionnez une conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
                Choisissez une conversation dans la liste ou créez-en une nouvelle
              </p>
              <button
                type="button"
                onClick={() => setShowNewMessageModal(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Nouveau message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm({ isOpen: false, messageId: null, type: 'message' })}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Confirmer la suppression
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm({ isOpen: false, messageId: null, type: 'message' })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {showDeleteConfirm.type === 'conversation' 
                  ? 'Êtes-vous sûr de vouloir supprimer tous vos messages de cette conversation ? Cette action est irréversible. Note: Seuls vos propres messages seront supprimés.'
                  : 'Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.'}
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm({ isOpen: false, messageId: null, type: 'message' })}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouveau message */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowNewMessageModal(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nouveau message
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewMessageModal(false);
                  setRecipientEmail('');
                  setRecipientId('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ID utilisateur (UUID) du destinataire
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (UUID)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && recipientEmail.trim()) {
                        handleNewConversation();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">ℹ️ Note importante</p>
                <p>Pour envoyer un message, vous devez connaître l'UUID de l'utilisateur destinataire. Les clients ne sont pas directement liés aux utilisateurs dans le système actuel.</p>
              </div>

              {recipientId && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                    ✓ ID sélectionné: {recipientId}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNewConversation}
                  disabled={!recipientEmail.trim()}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  Créer la conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

