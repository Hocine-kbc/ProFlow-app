import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, MailOpen, Archive, ArchiveRestore, Trash2, Star, RefreshCw, User, FileText, Calendar, Clock, ChevronDown } from 'lucide-react';
import { EmailMessage, MessageFolder, MessageFilters, MessageStats } from '../types/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useApp } from '../contexts/AppContext.tsx';
import EmailComposer from './EmailComposer.tsx';
import MessageItem from './MessageItem.tsx';
import MessageView from './MessageView.tsx';
import EmailSidebar from './EmailSidebar.tsx';
import SearchBar from './SearchBar.tsx';

export default function EmailInboxPage() {
  const [currentFolder, setCurrentFolder] = useState<MessageFolder>('inbox');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const selectedMessageRef = useRef<EmailMessage | null>(null);
  const messagesScrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectionFilter, setSelectionFilter] = useState<'all' | 'unread' | 'read' | 'starred' | 'unstarred'>('all');
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const selectionMenuRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<MessageStats>({
    inbox_count: 0,
    unread_count: 0,
    drafts_count: 0,
    sent_count: 0,
    archived_count: 0,
    starred_count: 0,
    spam_count: 0
  });
  const [loading, setLoading] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MessageFilters>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { showNotification } = useApp();

  // Récupérer l'utilisateur actuel
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Remettre le body en haut quand on arrive sur la page messages
  useEffect(() => {
    // Remettre le body en haut au montage
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    return () => {
      // Nettoyer la position du body quand on quitte la page
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
  }, []);

  // Charger les messages selon le dossier
  const loadMessages = useCallback(async (folder: MessageFolder) => {
    if (!currentUserId) {
      console.warn('No currentUserId, skipping loadMessages');
      return;
    }

    try {
      setLoading(true);
      setSelectedMessages(new Set());
      setSelectedMessage(null);

      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer par dossier et utilisateur
      if (folder === 'inbox') {
        query = query.eq('recipient_id', currentUserId)
          .or('folder.eq.inbox,folder.is.null')
          .neq('is_archived', true);
      } else if (folder === 'sent') {
        query = query
          .eq('sender_id', currentUserId)
          .neq('status', 'draft');  // Exclure les brouillons
        // Inclure tous les messages envoyés par l'utilisateur (peu importe le folder)
        // car les nouveaux messages ont folder='inbox' par défaut (pour le destinataire)
      } else if (folder === 'drafts') {
        query = query.eq('sender_id', currentUserId)
          .eq('status', 'draft');
      } else if (folder === 'archive') {
        query = query.eq('is_archived', true)
          .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);
      } else if (folder === 'trash') {
        query = query.or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);
      } else if (folder === 'spam') {
        query = query.eq('is_spam', true)
          .eq('recipient_id', currentUserId);
      } else if (folder === 'starred') {
        query = query.eq('is_starred', true)
          .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      // Filtrer côté client selon deleted_by_users et is_archived
      let filteredData = data || [];
      if (folder === 'trash' && data) {
        filteredData = data.filter((msg: any) => {
          const deletedBy = Array.isArray(msg.deleted_by_users) ? msg.deleted_by_users : [];
          return deletedBy.includes(currentUserId);
        });
      } else if (folder !== 'trash' && data) {
        filteredData = data.filter((msg: any) => {
          const deletedBy = Array.isArray(msg.deleted_by_users) ? msg.deleted_by_users : [];
          const notDeleted = !deletedBy.includes(currentUserId);
          
          // Pour la boîte de réception, exclure aussi les messages archivés
          if (folder === 'inbox') {
            return notDeleted && !msg.is_archived;
          }
          
          return notDeleted;
        });
      }

      // Enrichir avec les emails des utilisateurs
      if (filteredData && filteredData.length > 0) {
        const userIds = new Set<string>();
        filteredData.forEach((msg: any) => {
          if (msg.sender_id) userIds.add(msg.sender_id);
          if (msg.recipient_id) userIds.add(msg.recipient_id);
        });

        try {
          // Récupérer le token d'authentification
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          
          const backendUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          
          // Ajouter le token d'authentification si disponible
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const response = await fetch(`${backendUrl}/messages/get-users-emails`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ userIds: Array.from(userIds) })
          });

          if (response.ok) {
            const result = await response.json();
            // Le backend retourne { emails: emailMap }
            const emailMap = result.emails || result;
            const enrichedMessages = filteredData.map((msg: any) => ({
              ...msg,
              sender: msg.sender_id ? { email: emailMap[msg.sender_id] || null } : null,
              recipient: msg.recipient_id ? { email: emailMap[msg.recipient_id] || null } : null
            }));
            setMessages(enrichedMessages);
          } else {
            console.warn('Failed to fetch user emails, using messages without enrichment');
            setMessages(filteredData as EmailMessage[]);
          }
        } catch (fetchError) {
          console.error('Error fetching user emails:', fetchError);
          setMessages(filteredData as EmailMessage[]);
        }
      } else {
        setMessages([]);
      }

      // Mettre à jour le message sélectionné si nécessaire
      if (selectedMessageRef.current && filteredData) {
        const updated = filteredData.find((m: any) => m.id === selectedMessageRef.current?.id);
        if (updated) {
          setSelectedMessage(updated as EmailMessage);
          selectedMessageRef.current = updated as EmailMessage;
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      showNotification('error', 'Erreur', 'Impossible de charger les messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showNotification]);

  useEffect(() => {
    loadMessages(currentFolder);
  }, [currentFolder, loadMessages]);

  // Charger les stats
  const loadStats = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('id, deleted_by_users, recipient_id, sender_id, read, is_starred, is_archived, is_deleted, is_spam, status, folder')
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

      if (error) throw error;

      if (!messagesData) return;

      const userMessages = messagesData.filter(msg => {
        const deletedBy = msg.deleted_by_users as string[] || [];
        return !deletedBy.includes(currentUserId);
      });

      const inbox = userMessages.filter(m => 
        m.recipient_id === currentUserId && 
        (m.folder === 'inbox' || !m.folder) && 
        !m.is_deleted && 
        !m.is_archived && 
        !m.is_spam
      );
      
      const sent = userMessages.filter(m => 
        m.sender_id === currentUserId && 
        !m.is_deleted && 
        m.status !== 'draft'
      );
      
      const drafts = userMessages.filter(m => 
        m.sender_id === currentUserId && 
        m.status === 'draft' && 
        !m.is_deleted
      );
      
      const archived = userMessages.filter(m => m.is_archived && !m.is_deleted);
      const starred = userMessages.filter(m => m.is_starred && !m.is_deleted);
      const spam = userMessages.filter(m => m.is_spam && !m.is_deleted);
      const unread = inbox.filter(m => !m.read);

      setStats({
        inbox_count: inbox.length,
        unread_count: unread.length,
        drafts_count: drafts.length,
        sent_count: sent.length,
        archived_count: archived.length,
        starred_count: starred.length,
        spam_count: spam.length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadStats();
    
    // Rafraîchir les stats automatiquement toutes les 30 secondes
    const statsInterval = setInterval(() => {
      loadStats();
    }, 30000);
    
    return () => {
      clearInterval(statsInterval);
    };
  }, [loadStats]);

  // Sauvegarder la position de scroll
  useEffect(() => {
    const scrollContainer = messagesScrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollKey = `email-messages-scroll-${currentFolder}`;
      try {
        sessionStorage.setItem(scrollKey, scrollContainer.scrollTop.toString());
      } catch (error) {
        console.warn('Impossible de sauvegarder la position de scroll:', error);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [currentFolder]);

  // Restaurer la position de scroll quand on revient sur la page ou change de dossier
  useEffect(() => {
    const scrollContainer = messagesScrollContainerRef.current;
    if (!scrollContainer) return;

    if (loading) {
      // Pendant le chargement, remettre le scroll en haut
      scrollContainer.scrollTop = 0;
      return;
    }

    // Après le chargement, restaurer la position sauvegardée
    const scrollKey = `email-messages-scroll-${currentFolder}`;
    try {
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll !== null) {
        // Petit délai pour s'assurer que le contenu est rendu
        setTimeout(() => {
          if (scrollContainer) {
            scrollContainer.scrollTop = parseInt(savedScroll, 10);
          }
        }, 100);
      } else {
        // Pas de position sauvegardée, remettre en haut
        scrollContainer.scrollTop = 0;
      }
    } catch (error) {
      console.warn('Impossible de restaurer la position de scroll:', error);
    }
  }, [currentFolder, loading, messages]);

  // Filtrer les messages selon la recherche et le filtre de sélection
  const getFilteredMessages = (): EmailMessage[] => {
    let filtered = messages;

    // Filtrer par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => {
        const subject = (m.subject || '').toLowerCase();
        const senderEmail = (m.sender?.email || '').toLowerCase();
        const recipientEmail = (m.recipient?.email || '').toLowerCase();
        const content = (m.content || '').toLowerCase();
        
        return subject.includes(query) ||
               senderEmail.includes(query) ||
               recipientEmail.includes(query) ||
               content.includes(query);
      });
    }

    // Filtrer par sélection
    switch (selectionFilter) {
      case 'unread':
        return filtered.filter(m => !m.read && m.sender_id !== currentUserId);
      case 'read':
        return filtered.filter(m => m.read && m.sender_id !== currentUserId);
      case 'starred':
        return filtered.filter(m => m.is_starred);
      case 'unstarred':
        return filtered.filter(m => !m.is_starred);
      default:
        return filtered;
    }
  };

  // Sélectionner selon le filtre
  const handleSelectByFilter = (filter: 'all' | 'unread' | 'read' | 'starred' | 'unstarred') => {
    setSelectionFilter(filter);
    // Utiliser getFilteredMessages() pour prendre en compte la recherche ET le filtre
    const filtered = getFilteredMessages();
    if (selectedMessages.size === filtered.length && filtered.length > 0) {
      // Tous sont déjà sélectionnés, on désélectionne
      setSelectedMessages(new Set());
    } else {
      // Sélectionner tous les messages filtrés
      setSelectedMessages(new Set(filtered.map(m => m.id)));
    }
    setShowSelectionMenu(false);
  };


  // Sélection multiple
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredMessages();
    if (selectedMessages.size === filtered.length && filtered.length > 0) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filtered.map(m => m.id)));
    }
    setShowSelectionMenu(false);
  };

  // Fermer le menu quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionMenuRef.current && !selectionMenuRef.current.contains(event.target as Node)) {
        setShowSelectionMenu(false);
      }
    };

    if (showSelectionMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSelectionMenu]);

  // Actions groupées
  const handleBulkArchive = async () => {
    if (selectedMessages.size === 0) return;
    try {
      const shouldArchive = currentFolder !== 'archive';
      
      const { error } = await supabase
        .from('messages')
        .update({ is_archived: shouldArchive })
        .in('id', Array.from(selectedMessages));

      if (error) throw error;
      
      if (shouldArchive || currentFolder === 'archive') {
        // Retirer de la liste si on archive depuis un autre dossier ou désarchive depuis archive
        setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
      } else {
        // Sinon, juste mettre à jour l'état
        setMessages(prev => prev.map(m => 
          selectedMessages.has(m.id) ? { ...m, is_archived: shouldArchive } : m
        ));
      }
      
      setSelectedMessages(new Set());
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de modifier l\'état d\'archivage des messages');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.size === 0 || !currentUserId) return;
    try {
      const messagesToDelete = messages.filter(m => selectedMessages.has(m.id));
      
      // Si on est dans la corbeille, supprimer définitivement
      if (currentFolder === 'trash') {
        const messageIds = Array.from(selectedMessages);
        const { error } = await supabase
          .from('messages')
          .delete()
          .in('id', messageIds);
        
        if (error) throw error;
        
        if (selectedMessage && selectedMessages.has(selectedMessage.id)) {
          setSelectedMessage(null);
        }
        setSelectedMessages(new Set());
        
        // Recharger les messages pour refléter la suppression
        await loadMessages(currentFolder);
        await loadStats();
      } else {
        // Sinon, ajouter à deleted_by_users (va dans la corbeille)
        for (const message of messagesToDelete) {
          const deletedBy = Array.isArray(message.deleted_by_users)
            ? [...message.deleted_by_users]
            : [];
          if (!deletedBy.includes(currentUserId)) {
            deletedBy.push(currentUserId);
          }
          const { error } = await supabase
            .from('messages')
            .update({ deleted_by_users: deletedBy })
            .eq('id', message.id);
          
          if (error) throw error;
        }
        
        if (selectedMessage && selectedMessages.has(selectedMessage.id)) {
          setSelectedMessage(null);
        }
        setSelectedMessages(new Set());
        
        // Recharger les messages pour refléter la suppression
        await loadMessages(currentFolder);
        await loadStats();
      }
    } catch (error) {
      console.error('Error bulk deleting messages:', error);
      showNotification('error', 'Erreur', 'Impossible de supprimer les messages');
    }
  };

  const handleBulkMarkRead = async (read: boolean) => {
    if (selectedMessages.size === 0 || !currentUserId) return;
    
    try {
      // Filtrer pour ne traiter que les messages reçus (pas ceux envoyés par l'utilisateur)
      const selectedMessagesData = messages.filter(m => 
        selectedMessages.has(m.id) && m.sender_id !== currentUserId
      );
      
      if (selectedMessagesData.length === 0) {
        return;
      }
      
      const messageIds = selectedMessagesData.map(m => m.id);
      
      const updateData: { read: boolean; read_at: string | null } = { 
        read, 
        read_at: read ? new Date().toISOString() : null 
      };
      
      const { error } = await supabase
        .from('messages')
        .update(updateData)
        .in('id', messageIds);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }
      
      // Mettre à jour l'état local
      setMessages(prev => prev.map(m => {
        if (messageIds.includes(m.id)) {
          return { 
            ...m, 
            read, 
            read_at: updateData.read_at ? updateData.read_at : undefined 
          };
        }
        return m;
      }));
      
      // Mettre à jour le message sélectionné s'il est concerné
      if (selectedMessage && messageIds.includes(selectedMessage.id)) {
        setSelectedMessage(prev => prev ? { 
          ...prev, 
          read, 
          read_at: updateData.read_at ? updateData.read_at : undefined 
        } : null);
      }
      
      // Ne pas désélectionner automatiquement pour permettre d'autres actions
      // La sélection reste intacte
      loadStats();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSnooze = async (messageId: string) => {
    try {
      // Pour l'instant, on utilise scheduled_at pour mettre en attente
      // On pourrait créer un champ snoozed_until dans le futur
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const { error } = await supabase
        .from('messages')
        .update({ scheduled_at: tomorrow.toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(null);
      }
      
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de mettre en attente');
    }
  };

  const handleBulkSnooze = async () => {
    if (selectedMessages.size === 0) return;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const { error } = await supabase
        .from('messages')
        .update({ scheduled_at: tomorrow.toISOString() })
        .in('id', Array.from(selectedMessages));

      if (error) throw error;
      
      setMessages(prev => prev.filter(m => !selectedMessages.has(m.id)));
      setSelectedMessages(new Set());
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de mettre en attente');
    }
  };

  const handleStar = async (messageId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_starred: !currentValue })
        .eq('id', messageId);

      if (error) throw error;
      
      const newStarredValue = !currentValue;
      
      // Si on retire l'étoile et qu'on est dans le dossier favoris, retirer le message de la liste
      if (!newStarredValue && currentFolder === 'starred') {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        // Si le message est actuellement ouvert, retourner à la liste
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      } else {
        // Sinon, mettre à jour le message
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, is_starred: newStarredValue } : m
        ));
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, is_starred: newStarredValue } : null);
        }
      }
      
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de modifier le favori');
    }
  };

  const handleArchive = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      const shouldArchive = currentFolder !== 'archive' && !message?.is_archived;
      
      const { error } = await supabase
        .from('messages')
        .update({ is_archived: shouldArchive })
        .eq('id', messageId);

      if (error) throw error;
      
      if (currentFolder === 'archive' && !shouldArchive) {
        // Si on désarchive depuis le dossier archive, retirer de la liste
        setMessages(prev => prev.filter(m => m.id !== messageId));
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      } else if (shouldArchive) {
        // Si on archive depuis un autre dossier, retirer de la liste
        setMessages(prev => prev.filter(m => m.id !== messageId));
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
      } else {
        // Sinon, juste mettre à jour l'état
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, is_archived: shouldArchive } : m
        ));
      }
      
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de modifier l\'état d\'archivage du message');
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!currentUserId) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Si on est dans la corbeille, supprimer définitivement
      if (currentFolder === 'trash') {
        const { error } = await supabase
          .from('messages')
          .delete()
          .eq('id', messageId);

        if (error) throw error;
        
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
        
        // Recharger les messages pour refléter la suppression
        await loadMessages(currentFolder);
        await loadStats();
      } else {
        // Sinon, ajouter à deleted_by_users (va dans la corbeille)
        const deletedBy = Array.isArray(message.deleted_by_users) 
          ? [...message.deleted_by_users] 
          : [];
        if (!deletedBy.includes(currentUserId)) {
          deletedBy.push(currentUserId);
        }

        const { error } = await supabase
          .from('messages')
          .update({ deleted_by_users: deletedBy })
          .eq('id', messageId);

        if (error) throw error;
        
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null);
        }
        
        // Recharger les messages pour refléter la suppression
        await loadMessages(currentFolder);
        await loadStats();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      showNotification('error', 'Erreur', 'Impossible de supprimer le message');
    }
  };

  const handleMarkAsRead = async (messageId: string, read: boolean = true) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read, read_at: read ? new Date().toISOString() : null })
        .eq('id', messageId);

      if (error) throw error;
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, read } : m
      ));
      
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => prev ? { ...prev, read } : null);
      }
      
      loadStats();
    } catch (error) {
      showNotification('error', 'Erreur', 'Impossible de marquer comme lu');
    }
  };

  const hasSelection = selectedMessages.size > 0;

  return (
    <div className="email-inbox-container flex bg-gray-100 dark:bg-gray-900 overflow-hidden overflow-x-hidden p-3 gap-3 -m-4 md:-m-6 lg:-m-8" style={{ height: 'calc(100vh - 64px)', maxHeight: 'calc(100vh - 64px)', minWidth: '100%', width: '100%' }}>
      {/* Sidebar */}
      <EmailSidebar
        currentFolder={currentFolder}
        onFolderChange={(folder) => {
          setCurrentFolder(folder);
          // Revenir à la vue tableau si un message est ouvert
          if (selectedMessage) {
            setSelectedMessage(null);
            selectedMessageRef.current = null;
          }
        }}
        stats={stats}
        onCompose={() => setShowComposer(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800 shadow-lg rounded-2xl min-w-0">
        {/* Gmail-like Header - Fixe */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 shadow-sm rounded-t-2xl">
          <div className="flex items-center gap-3">
            {/* Logo/Titre */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-500 dark:via-indigo-500 dark:to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30 dark:shadow-blue-400/20 transition-transform hover:scale-105">
                <Mail className="w-5 h-5 text-white drop-shadow-sm" />
              </div>
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Messagerie</span>
            </div>

            {/* Barre de recherche */}
            <div className="flex-1 max-w-2xl mx-4">
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          </div>
        </div>

        {/* Toolbar - Fixe */}
        {!selectedMessage && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => loadMessages(currentFolder)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                {hasSelection && (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedMessages.size} sélectionné(s)
                  </span>
                )}
              </div>
              
              <div className={`flex items-center gap-1 transition-opacity duration-200 ${hasSelection ? 'opacity-100' : 'opacity-30'}`}>
                {(() => {
                  // Vérifier si tous les messages sélectionnés sont lus ou non
                  const selectedMessagesData = messages.filter(m => selectedMessages.has(m.id) && m.sender_id !== currentUserId);
                  const hasReceivableMessages = selectedMessagesData.length > 0;
                  const allRead = hasReceivableMessages && selectedMessagesData.every(m => m.read);
                  
                  // Si tous sont lus, afficher enveloppe fermée (pour marquer comme non lu)
                  // Si tous sont non lus ou mixte, afficher enveloppe ouverte (pour marquer comme lu)
                  const shouldMarkAsUnread = allRead;
                  const actionRead = !shouldMarkAsUnread; // true = marquer comme lu, false = marquer comme non lu
                  
                  const handleClick = () => {
                    if (hasSelection && hasReceivableMessages) {
                      handleBulkMarkRead(actionRead);
                    }
                  };
                  
                  return (
                    <button
                      onClick={handleClick}
                      disabled={!hasSelection || !hasReceivableMessages}
                      className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all ${
                        hasSelection && hasReceivableMessages ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                      }`}
                      title={hasReceivableMessages 
                        ? (shouldMarkAsUnread ? 'Marquer comme non lu' : 'Marquer comme lu')
                        : 'Vous ne pouvez marquer que les messages reçus'
                      }
                    >
                      {shouldMarkAsUnread ? (
                        <Mail className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      )}
                    </button>
                  );
                })()}
                <button
                  onClick={handleBulkSnooze}
                  disabled={!hasSelection}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all ${
                    hasSelection ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                  title="Mettre en attente"
                >
                  <Clock className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                  onClick={handleBulkArchive}
                  disabled={!hasSelection}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all ${
                    hasSelection ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                  title={currentFolder === 'archive' ? 'Désarchiver' : 'Archiver'}
                >
                  {currentFolder === 'archive' ? (
                    <ArchiveRestore className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <Archive className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={!hasSelection}
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all ${
                    hasSelection ? 'cursor-pointer' : 'cursor-not-allowed'
                  }`}
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages List or View - Scrollable */}
        {!selectedMessage ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800">
            {/* Table Header - Fixe */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-800">
              <div className="grid grid-cols-[40px_40px_280px_1fr_140px_auto] gap-3 px-6 py-3 items-center">
                {/* Colonne checkbox */}
                <div className="flex items-center justify-center relative" ref={selectionMenuRef}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAll();
                      }}
                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Sélectionner tout"
                    >
                      <div className={`w-4 h-4 border-2 rounded-full transition-all flex items-center justify-center ${
                        (() => {
                          const filtered = getFilteredMessages();
                          return selectedMessages.size > 0 && selectedMessages.size === filtered.length && filtered.length > 0;
                        })()
                          ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 shadow-sm'
                          : 'border-gray-400 dark:border-gray-500'
                      }`}>
                        {(() => {
                          const filtered = getFilteredMessages();
                          return selectedMessages.size > 0 && selectedMessages.size === filtered.length && filtered.length > 0;
                        })() && (
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSelectionMenu(!showSelectionMenu);
                      }}
                      className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Filtres de sélection"
                    >
                      <ChevronDown className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform ${showSelectionMenu ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Menu déroulant */}
                  {showSelectionMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                      <button
                        onClick={() => handleSelectByFilter('all')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                          selectionFilter === 'all' ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectionFilter === 'all' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className={selectionFilter === 'all' ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Tous</span>
                      </button>
                      <button
                        onClick={() => handleSelectByFilter('unread')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                          selectionFilter === 'unread' ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectionFilter === 'unread' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <Mail className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        <span className={selectionFilter === 'unread' ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Non lus</span>
                      </button>
                      <button
                        onClick={() => handleSelectByFilter('read')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                          selectionFilter === 'read' ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectionFilter === 'read' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <MailOpen className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        <span className={selectionFilter === 'read' ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Lus</span>
                      </button>
                      <button
                        onClick={() => handleSelectByFilter('starred')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                          selectionFilter === 'starred' ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectionFilter === 'starred' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <Star className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 fill-yellow-400" />
                        <span className={selectionFilter === 'starred' ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Suivis</span>
                      </button>
                      <button
                        onClick={() => handleSelectByFilter('unstarred')}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                      >
                        <div className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                          selectionFilter === 'unstarred' ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectionFilter === 'unstarred' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <Star className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                        <span className={selectionFilter === 'unstarred' ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}>Non suivis</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Colonne star */}
                <div className="flex items-center justify-center">
                  <Star className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Expéditeur</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sujet</span>
                </div>
                <div></div>
                <div className="flex items-center justify-end gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Date</span>
                </div>
              </div>
            </div>

            {/* Messages List - Scrollable */}
            <div ref={messagesScrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-visible">
              {(() => {
                if (loading) {
                  return (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-3"></div>
                      <p className="text-sm font-medium">Chargement des messages...</p>
                    </div>
                  );
                }

                const filteredMessages = getFilteredMessages();

                if (filteredMessages.length === 0) {
                  return (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                      <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                        {searchQuery.trim() ? 'Aucun résultat' : 'Aucun message'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {searchQuery.trim() 
                          ? `Aucun message ne correspond à "${searchQuery}"` 
                          : 'Votre boîte de réception est vide'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div>
                    {filteredMessages.map((message, index) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isSelected={selectedMessages.has(message.id)}
                        onSelect={() => toggleMessageSelection(message.id)}
                        onClick={() => {
                          // Si c'est un brouillon, ouvrir le composeur au lieu de la vue message
                          if (message.status === 'draft') {
                            setSelectedMessage(message);
                            setShowComposer(true);
                          } else {
                            setSelectedMessage(message);
                            selectedMessageRef.current = message;
                            if (!message.read) {
                              handleMarkAsRead(message.id);
                            }
                          }
                        }}
                        onStar={() => handleStar(message.id, message.is_starred)}
                        onArchive={() => handleArchive(message.id)}
                        onDelete={() => handleDelete(message.id)}
                        onSnooze={() => handleSnooze(message.id)}
                        onMarkRead={(read) => handleMarkAsRead(message.id, read)}
                        currentUserId={currentUserId}
                        isFirst={index === 0}
                        isLast={index === filteredMessages.length - 1}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
            <MessageView
              message={selectedMessage}
              messageIndex={messages.findIndex(m => m.id === selectedMessage.id)}
              totalMessages={messages.length}
              onBack={() => {
                setSelectedMessage(null);
                selectedMessageRef.current = null;
              }}
              onNext={() => {
                const currentIndex = messages.findIndex(m => m.id === selectedMessage.id);
                if (currentIndex < messages.length - 1) {
                  const nextMessage = messages[currentIndex + 1];
                  setSelectedMessage(nextMessage);
                  selectedMessageRef.current = nextMessage;
                  if (!nextMessage.read) {
                    handleMarkAsRead(nextMessage.id);
                  }
                }
              }}
              onPrevious={() => {
                const currentIndex = messages.findIndex(m => m.id === selectedMessage.id);
                if (currentIndex > 0) {
                  const prevMessage = messages[currentIndex - 1];
                  setSelectedMessage(prevMessage);
                  selectedMessageRef.current = prevMessage;
                  if (!prevMessage.read) {
                    handleMarkAsRead(prevMessage.id);
                  }
                }
              }}
              onReply={() => setShowComposer(true)}
              onArchive={() => {
                handleArchive(selectedMessage.id);
                setSelectedMessage(null);
              }}
              isArchived={currentFolder === 'archive' || selectedMessage.is_archived}
              onDelete={() => {
                handleDelete(selectedMessage.id);
                setSelectedMessage(null);
              }}
              onStar={() => handleStar(selectedMessage.id, selectedMessage.is_starred)}
              onMarkRead={(read) => handleMarkAsRead(selectedMessage.id, read)}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>

      {/* Composer Modal */}
      {showComposer && (
        <EmailComposer
          onClose={() => {
            setShowComposer(false);
            setSelectedMessage(null);
          }}
          replyTo={selectedMessage?.status !== 'draft' ? selectedMessage || undefined : undefined}
          draft={selectedMessage?.status === 'draft' ? selectedMessage : undefined}
          onSent={() => {
            setShowComposer(false);
            setSelectedMessage(null);
            loadMessages(currentFolder);
            loadStats();
          }}
          onDraftSaved={() => {
            loadMessages(currentFolder);
            loadStats();
          }}
        />
      )}
    </div>
  );
}
