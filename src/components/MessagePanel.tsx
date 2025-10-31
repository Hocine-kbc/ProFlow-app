import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Search, User, Trash2, Check, CheckCheck } from 'lucide-react';
import { Conversation, Message } from '../types/index.ts';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationAsRead,
  markMessageAsRead,
  deleteMessage,
  getUnreadMessagesCount,
} from '../lib/api.ts';
import { useApp } from '../contexts/AppContext.tsx';
import { supabase } from '../lib/supabase.ts';

interface MessagePanelProps {
  onNavigate?: (page: string) => void;
}

const MessagePanel: React.FC<MessagePanelProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useApp();

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
        // Mettre à jour le compteur local
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
    if (isOpen) {
      loadConversations();
      const interval = setInterval(loadConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

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

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!selectedConversation || !messageContent.trim()) return;

    try {
      setSending(true);
      const newMessage = await sendMessage(
        selectedConversation.other_user_id,
        messageContent.trim(),
        messageSubject.trim() || undefined
      );
      
      setMessages(prev => [...prev, newMessage]);
      setMessageContent('');
      setMessageSubject('');
      
      // Recharger les conversations pour mettre à jour le dernier message
      await loadConversations();
      
      // Scroll vers le bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      showNotification('error', 'Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // Supprimer un message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      showNotification('success', 'Message supprimé', 'Le message a été supprimé');
    } catch (error) {
      console.error('Error deleting message:', error);
      showNotification('error', 'Erreur', 'Impossible de supprimer le message');
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

  const filteredConversations = conversations.filter(c =>
    c.other_user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id || null);
    });
  }, []);

  return (
    <div className="relative">
      {/* Bouton avec badge - Redirige vers la page messages */}
      <button
        type="button"
        onClick={() => {
          if (onNavigate) {
            onNavigate('messages');
          }
        }}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Messages"
      >
        <MessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel des messages */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-[45]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-12 w-[480px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[50] max-h-[700px] flex flex-col">
            {!selectedConversation ? (
              /* Liste des conversations */
              <>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Messages
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const recipientId = prompt('Entrez l\'ID utilisateur du destinataire:');
                        if (recipientId) {
                          // Créer une conversation temporaire pour permettre l'envoi
                          setSelectedConversation({
                            id: recipientId,
                            other_user_id: recipientId,
                            other_user_email: 'Nouveau destinataire',
                            unread_count: 0,
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Nouveau message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                {/* Barre de recherche */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une conversation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Liste des conversations */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      Chargement...
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="mb-4">{searchQuery ? 'Aucune conversation trouvée' : 'Aucune conversation'}</p>
                      <button
                        type="button"
                        onClick={() => {
                          const recipientId = prompt('Entrez l\'ID utilisateur du destinataire:');
                          if (recipientId) {
                            setSelectedConversation({
                              id: recipientId,
                              other_user_id: recipientId,
                              other_user_email: 'Nouveau destinataire',
                              unread_count: 0,
                            });
                          }
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                      >
                        Nouveau message
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredConversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => setSelectedConversation(conversation)}
                          className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors relative"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {conversation.client?.name || conversation.other_user_email}
                                </h4>
                                {conversation.unread_count > 0 && (
                                  <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                  </span>
                                )}
                              </div>
                              {conversation.last_message && (
                                <>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                                    {conversation.last_message.subject && (
                                      <span className="font-medium">{conversation.last_message.subject}: </span>
                                    )}
                                    {conversation.last_message.content}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    {formatDate(conversation.last_message.created_at)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Vue de conversation */
              <>
                {/* Header de conversation */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedConversation(null)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {selectedConversation.client?.name || selectedConversation.other_user_email}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedConversation.other_user_email}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                  {loading && messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      Chargement...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      <p>Aucun message</p>
                      <p className="text-sm mt-2">Commencez la conversation !</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender_id === currentUser;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg p-3 ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            {message.subject && (
                              <div className={`text-xs font-semibold mb-1 ${isOwn ? 'text-blue-100' : 'text-blue-600 dark:text-blue-400'}`}>
                                {message.subject}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className={`flex items-center gap-2 mt-2 text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                              <span>{formatDate(message.created_at)}</span>
                              {isOwn && (
                                message.read ? (
                                  <CheckCheck className="w-3 h-3" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(message.id)}
                                className={`ml-auto ${isOwn ? 'text-blue-100 hover:text-white' : 'text-gray-400 hover:text-red-500'} transition-colors`}
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Formulaire d'envoi */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Sujet (optionnel)"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full mb-2 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-end gap-2">
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
                      rows={2}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!messageContent.trim() || sending}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Envoyer (Entrée)"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MessagePanel;

