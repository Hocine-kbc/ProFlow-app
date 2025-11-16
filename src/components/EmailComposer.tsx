import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip, Clock, Mail, Save, FileText, User, Plus, Trash2, ChevronDown, Bold, Italic, Underline, List, ListOrdered, Smile } from 'lucide-react';
import { EmailMessage, MessageAttachment, SendOptions, ScheduleOptions } from '../types/index.ts';
import { supabase } from '../lib/supabase.ts';
import { useApp } from '../contexts/AppContext.tsx';
import { format } from 'date-fns';

interface EmailComposerProps {
  onClose: () => void;
  replyTo?: EmailMessage;
  draft?: EmailMessage;
  onSent?: () => void;
  onDraftSaved?: () => void;
}

export default function EmailComposer({ onClose, replyTo, draft, onSent, onDraftSaved }: EmailComposerProps) {
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
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    list: false,
    orderedList: false
  });
  const { showNotification } = useApp();

  // Vérifier l'état actuel du formatage
  const checkFormattingState = () => {
    if (!contentEditableRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setActiveFormatting({
        bold: false,
        italic: false,
        underline: false,
        list: false,
        orderedList: false
      });
      return;
    }

    // Vérifier les commandes de formatage
    const bold = document.queryCommandState('bold');
    const italic = document.queryCommandState('italic');
    const underline = document.queryCommandState('underline');
    
    // Vérifier si on est dans une liste
    let inList = false;
    let inOrderedList = false;
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode as HTMLElement;
    }
    
    let current: HTMLElement | null = container as HTMLElement;
    while (current && current !== contentEditableRef.current) {
      if (current.tagName === 'UL') {
        inList = true;
        break;
      }
      if (current.tagName === 'OL') {
        inOrderedList = true;
        break;
      }
      current = current.parentElement;
    }

    setActiveFormatting({
      bold,
      italic,
      underline,
      list: inList,
      orderedList: inOrderedList
    });
  };

  // Remplir les champs si c'est une réponse ou un brouillon
  useEffect(() => {
    if (draft) {
      // Pré-remplir avec les données du brouillon
      setTo(draft.recipient?.email || '');
      setSubject(draft.subject || '');
      setContent(draft.content || '');
      setAttachments(draft.attachments || []);
      setPriority(draft.priority || 'normal');
    } else if (replyTo) {
      const recipientEmail = replyTo.sender?.email || '';
      setTo(recipientEmail);
      setSubject(replyTo.subject?.startsWith('Re: ') ? replyTo.subject : `Re: ${replyTo.subject || ''}`);
      setContent(`\n\n--- Message original ---\n${replyTo.content}`);
    }
  }, [replyTo, draft]);

  // Mettre à jour le contentEditable quand le contenu change depuis l'extérieur
  useEffect(() => {
    if (contentEditableRef.current && content !== contentEditableRef.current.innerHTML) {
      // Ne mettre à jour que si le contenu vient d'une source externe (draft, replyTo)
      if (draft || replyTo) {
        contentEditableRef.current.innerHTML = content || '';
      }
    }
  }, [content, draft, replyTo]);

  // Fonction pour insérer une liste
  const insertList = (ordered: boolean = false) => {
    if (!contentEditableRef.current) return;
    
    contentEditableRef.current.focus();
    
    try {
      // Utiliser execCommand en priorité car il préserve mieux le contenu
      const success = document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false, undefined);
      
      if (success) {
        // Si execCommand a réussi, mettre à jour l'état
        setTimeout(() => {
          handleContentChange();
          checkFormattingState();
        }, 10);
        return;
      }
      
      // Si execCommand a échoué, utiliser l'approche manuelle
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // Si pas de sélection, créer une liste à la fin
        const range = document.createRange();
        const editor = contentEditableRef.current;
        
        if (editor.childNodes.length > 0) {
          const lastNode = editor.childNodes[editor.childNodes.length - 1];
          if (lastNode.nodeType === Node.TEXT_NODE) {
            const text = lastNode.textContent || '';
            range.setStart(lastNode, text.length);
            range.setEnd(lastNode, text.length);
          } else {
            range.setStartAfter(lastNode);
            range.setEndAfter(lastNode);
          }
        } else {
          range.setStart(editor, 0);
          range.setEnd(editor, 0);
        }
        
        const listType = ordered ? 'ol' : 'ul';
        const listItem = document.createElement('li');
        listItem.appendChild(document.createTextNode(''));
        const list = document.createElement(listType);
        list.appendChild(listItem);
        
        // Insérer un saut de ligne avant si nécessaire
        const br = document.createElement('br');
        range.insertNode(br);
        range.setStartAfter(br);
        range.insertNode(list);
        
        // Placer le curseur
        const newRange = document.createRange();
        newRange.setStart(listItem, 0);
        newRange.setEnd(listItem, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        handleContentChange();
        return;
      }
      
      const range = selection.getRangeAt(0);
      const listType = ordered ? 'ol' : 'ul';
      
      // Vérifier si on est déjà dans une liste
      let container = range.commonAncestorContainer;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentNode as HTMLElement;
      }
      
      let parentList: HTMLElement | null = container as HTMLElement;
      while (parentList && parentList !== contentEditableRef.current) {
        if (parentList.tagName === 'UL' || parentList.tagName === 'OL') {
          // Changer le type de liste si différent
          if ((ordered && parentList.tagName === 'UL') || (!ordered && parentList.tagName === 'OL')) {
            const newList = document.createElement(listType);
            while (parentList.firstChild) {
              newList.appendChild(parentList.firstChild);
            }
            parentList.parentNode?.replaceChild(newList, parentList);
            handleContentChange();
            return;
          }
          // Si déjà dans le bon type, ne rien faire
          return;
        }
        parentList = parentList.parentElement;
      }
      
      // Si du texte est sélectionné, le convertir en liste
      if (!range.collapsed) {
        const contents = range.extractContents();
        if (contents.textContent?.trim()) {
          const listItem = document.createElement('li');
          listItem.appendChild(contents);
          const list = document.createElement(listType);
          list.appendChild(listItem);
          range.insertNode(list);
          
          const newRange = document.createRange();
          newRange.setStart(listItem, 0);
          newRange.setEnd(listItem, 0);
          selection.removeAllRanges();
          selection.addRange(newRange);
          handleContentChange();
          return;
        }
      }
      
      // Sinon, insérer une liste vide à la position du curseur
      // NE PAS supprimer le contenu existant
      const listItem = document.createElement('li');
      listItem.appendChild(document.createTextNode(''));
      const list = document.createElement(listType);
      list.appendChild(listItem);
      
      // Insérer simplement à la position du curseur
      range.insertNode(list);
      
      // Placer le curseur dans la liste
      const newRange = document.createRange();
      newRange.setStart(listItem, 0);
      newRange.setEnd(listItem, 0);
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      handleContentChange();
    } catch (error) {
      console.error('Error inserting list:', error);
    }
  };

  // Fonctions de formatage du texte
  const formatText = (command: string, value: string | null = null) => {
    if (!contentEditableRef.current) return;
    
    contentEditableRef.current.focus();
    
    try {
      // Utiliser la fonction dédiée pour les listes
      if (command === 'insertUnorderedList') {
        insertList(false);
        return;
      }
      if (command === 'insertOrderedList') {
        insertList(true);
        return;
      }
      
      // Pour les autres commandes, utiliser execCommand
      document.execCommand(command, false, value || undefined);
      
      // Mettre à jour le state après le formatage
      setTimeout(() => {
        if (contentEditableRef.current) {
          setContent(contentEditableRef.current.innerHTML);
        }
      }, 0);
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  // Mettre à jour le contenu quand l'éditeur change
  const handleContentChange = () => {
    if (contentEditableRef.current) {
      setContent(contentEditableRef.current.innerHTML);
    }
    // Vérifier l'état du formatage après chaque changement
    setTimeout(checkFormattingState, 10);
  };

  // Insérer un emoji
  const insertEmoji = (emoji: string) => {
    if (!contentEditableRef.current) return;
    
    contentEditableRef.current.focus();
    
    // Utiliser la sélection sauvegardée si disponible
    const selection = window.getSelection();
    let range: Range | null = null;
    
    // Essayer de restaurer la sélection sauvegardée
    if (savedSelectionRef.current) {
      try {
        // Vérifier que la sélection sauvegardée est toujours valide
        if (contentEditableRef.current.contains(savedSelectionRef.current.commonAncestorContainer) || 
            savedSelectionRef.current.commonAncestorContainer === contentEditableRef.current) {
          range = savedSelectionRef.current.cloneRange();
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (error) {
        // La sélection sauvegardée n'est plus valide
        savedSelectionRef.current = null;
      }
    }
    
    // Si pas de sélection sauvegardée, utiliser la sélection actuelle
    if (!range && selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      
      // Vérifier que le range est dans notre contentEditable
      if (!contentEditableRef.current.contains(range.commonAncestorContainer) && 
          range.commonAncestorContainer !== contentEditableRef.current) {
        range = null;
      }
    }
    
    // Si on a un range valide, insérer l'emoji
    if (range) {
      try {
        // Utiliser execCommand en priorité car il gère mieux le contentEditable
        const success = document.execCommand('insertText', false, emoji);
        if (success) {
          handleContentChange();
          setShowEmojiPicker(false);
          savedSelectionRef.current = null;
          return;
        }
      } catch (error) {
        // Continuer avec l'insertion manuelle
      }
      
      try {
        // Insertion manuelle
        const textNode = document.createTextNode(emoji);
        
        // Si le range est dans un nœud de texte, diviser le nœud si nécessaire
        if (range.startContainer.nodeType === Node.TEXT_NODE) {
          const textContainer = range.startContainer as Text;
          const offset = range.startOffset;
          
          if (offset > 0 && offset < textContainer.length) {
            // Diviser le nœud de texte
            const beforeText = textContainer.textContent?.substring(0, offset) || '';
            const afterText = textContainer.textContent?.substring(offset) || '';
            
            const beforeNode = document.createTextNode(beforeText);
            const afterNode = document.createTextNode(afterText);
            
            // Remplacer le nœud actuel
            textContainer.parentNode?.replaceChild(beforeNode, textContainer);
            
            // Insérer l'emoji puis le texte restant
            if (beforeNode.nextSibling) {
              beforeNode.parentNode?.insertBefore(textNode, beforeNode.nextSibling);
              textNode.parentNode?.insertBefore(afterNode, textNode.nextSibling);
            } else {
              beforeNode.parentNode?.appendChild(textNode);
              textNode.parentNode?.appendChild(afterNode);
            }
            
            // Placer le curseur après l'emoji
            const newRange = document.createRange();
            newRange.setStartAfter(textNode);
            newRange.collapse(true);
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          } else {
            // Insérer simplement
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } else {
          // Insérer simplement
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
        
        handleContentChange();
        setShowEmojiPicker(false);
        savedSelectionRef.current = null;
        return;
      } catch (error) {
        console.error('Error inserting emoji:', error);
      }
    }
    
    // Dernier recours: insérer à la fin
    try {
      const fallbackRange = document.createRange();
      const editor = contentEditableRef.current;
      
      // Trouver le dernier nœud de texte
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let lastTextNode: Node | null = null;
      let node;
      while (node = walker.nextNode()) {
        lastTextNode = node;
      }
      
      if (lastTextNode && lastTextNode.nodeType === Node.TEXT_NODE) {
        const textNode = lastTextNode as Text;
        fallbackRange.setStart(textNode, textNode.length);
        fallbackRange.setEnd(textNode, textNode.length);
      } else {
        fallbackRange.selectNodeContents(editor);
        fallbackRange.collapse(false);
      }
      
      const emojiNode = document.createTextNode(emoji);
      fallbackRange.insertNode(emojiNode);
      fallbackRange.setStartAfter(emojiNode);
      fallbackRange.collapse(true);
      
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(fallbackRange);
      }
      
      handleContentChange();
    } catch (error) {
      console.error('Final fallback failed:', error);
    }
    
    setShowEmojiPicker(false);
    savedSelectionRef.current = null;
  };

  // Emojis organisés par catégories
  const emojiCategories = {
    visages: {
      name: 'Visages',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙']
    },
    émotions: {
      name: 'Émotions',
      emojis: ['😢', '😭', '😤', '😡', '🤬', '😱', '😨', '😰', '😥', '😓', '🤔', '🤗', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄']
    },
    gestes: {
      name: 'Gestes',
      emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤝', '🙏', '👏', '💪', '🤝', '🤲', '🙌', '👐', '🤲', '✋', '🖐️', '👋', '🤚', '🖖', '🤘']
    },
    coeurs: {
      name: 'Cœurs',
      emojis: ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '❤️‍🔥', '❤️‍🩹']
    },
    symboles: {
      name: 'Symboles',
      emojis: ['✅', '❌', '⭐', '🌟', '✨', '💫', '🔥', '💯', '🎯', '⚡', '💥', '💢', '💤', '💨', '☀️', '🌙', '⭐', '🌟', '🌠', '🌈']
    },
    célébrations: {
      name: 'Célébrations',
      emojis: ['🎉', '🎊', '🎈', '🎁', '🎂', '🎄', '🎃', '🎆', '🎇', '🧨', '✨', '🎀', '🎗️', '🏆', '🥇', '🥈', '🥉', '🎖️', '🏅', '🎗️']
    },
    objets: {
      name: 'Objets',
      emojis: ['📱', '💻', '⌚', '📷', '📸', '🎥', '📺', '📻', '🔔', '📞', '📠', '💾', '💿', '📀', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '🕹️']
    },
    nature: {
      name: 'Nature',
      emojis: ['🌱', '🌲', '🌳', '🌴', '🌵', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🍄', '🌰']
    }
  };

  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<keyof typeof emojiCategories>('visages');
  const [emojiSearch, setEmojiSearch] = useState('');

  // Upload de fichiers
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const uploadedFiles: MessageAttachment[] = [];

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          showNotification('error', 'Erreur', `Le fichier ${file.name} est trop volumineux (max 10MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

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
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification('error', 'Erreur', 'Impossible de téléverser les fichiers');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Utiliser l'API backend pour sauvegarder le brouillon
      // Le backend peut gérer la résolution de l'email ou créer un recipient_id temporaire
      const messageData = {
        sender_id: user.id,
        recipient_email: to.trim() || null, // Email du destinataire si disponible
        recipient_id: null, // Sera résolu par le backend ou laissé null pour les brouillons sans destinataire
        subject: subject || '(Sans objet)',
        content: contentEditableRef.current?.innerHTML || content || '',
        attachments: attachments,
        status: 'draft',
        folder: 'drafts',
        priority: priority,
        reply_to_id: replyTo?.id || null
      };

      const backendUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      // Si c'est un brouillon existant, faire un UPDATE
      const url = draft?.id ? `${backendUrl}/messages/${draft.id}` : `${backendUrl}/messages`;
      const method = draft?.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          message: messageData,
          options: {
            send_immediately: false,
            send_external_email: false
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la sauvegarde');
      }

      if (onDraftSaved) onDraftSaved();
      onClose();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      showNotification('error', 'Erreur', error.message || 'Impossible de sauvegarder le brouillon');
    } finally {
      setSending(false);
    }
  };

  // Fonction pour extraire les emails d'une chaîne (peut contenir plusieurs emails séparés par des virgules)
  const extractEmails = (text: string): string[] => {
    if (!text.trim()) return [];
    // Expression régulière pour extraire les emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    return text.match(emailRegex) || [];
  };

  // Fonction pour vérifier si un email est valide
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    if (!to.trim()) {
      showNotification('error', 'Erreur', 'Veuillez saisir un destinataire');
      return;
    }

    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Collecter tous les emails des champs À, Cc, Cci
      const allEmails = [
        ...extractEmails(to),
        ...extractEmails(cc),
        ...extractEmails(bcc)
      ];

      // Vérifier que tous les emails sont valides
      const invalidEmails = allEmails.filter(email => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        showNotification('error', 'Erreur', `Adresse(s) email invalide(s): ${invalidEmails.join(', ')}`);
        return;
      }

      // Collecter les emails externes depuis le champ dédié si rempli
      // Le backend détectera automatiquement les emails externes dans les champs À, Cc, Cci
      let externalEmails: string[] = [];
      if (sendExternal && externalRecipients.trim()) {
        externalEmails = externalRecipients.split(',').map(e => e.trim()).filter(isValidEmail);
      }

      const sendOptions: SendOptions = {
        send_immediately: !showSchedule,
        schedule: showSchedule ? {
          scheduled_at: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        } : undefined,
        // Le backend activera automatiquement l'envoi externe si des emails externes sont détectés
        // Ici on envoie juste les emails du champ dédié s'il est rempli
        send_external_email: sendExternal && externalEmails.length > 0,
        external_recipients: externalEmails.length > 0 ? externalEmails : []
      };

      // Récupérer le contenu HTML de l'éditeur si disponible
      let finalContent = content;
      if (contentEditableRef.current) {
        finalContent = contentEditableRef.current.innerHTML;
      }

      const messageData = {
        sender_id: user.id,
        recipient_email: to.trim(),
        recipient_id: null,
        subject: subject || '(Sans objet)',
        content: finalContent,
        attachments: attachments,
        status: showSchedule ? 'scheduled' : 'sent',
        folder: showSchedule ? 'drafts' : 'sent',
        priority: priority,
        scheduled_at: showSchedule ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
        reply_to_id: replyTo?.id || null,
        // Ajouter cc et bcc pour le backend
        cc: cc.trim() || null,
        bcc: bcc.trim() || null
      };

      const backendUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';
      // Si c'est un brouillon existant, faire un UPDATE
      const url = draft?.id ? `${backendUrl}/messages/${draft.id}` : `${backendUrl}/messages`;
      const method = draft?.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
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

      const result = await response.json();
      
      // Afficher les résultats des emails externes
      if (result.external_email_results) {
        const { success, failed } = result.external_email_results;
        if (failed && failed.length > 0) {
          const firstError = failed[0]?.error || '';
          let errorMessage = `${success.length} email(s) envoyé(s) avec succès, mais ${failed.length} échec(s).`;
          
          // Afficher un message plus explicite si c'est une erreur de vérification SendGrid
          if (firstError.includes('verified Sender Identity') || firstError.includes('sender-identity')) {
            errorMessage = `Impossible d'envoyer les emails externes : l'adresse email expéditrice n'est pas vérifiée dans SendGrid. ` +
              `Vous devez vérifier votre adresse email dans votre compte SendGrid. ` +
              `Consultez les logs serveur pour plus de détails.`;
            showNotification('error', 'Erreur de configuration SendGrid', errorMessage);
          } else {
            const failedEmails = failed.map((f: any) => f.email).join(', ');
            showNotification('warning', 'Attention', 
              `${errorMessage} Destinataires en échec : ${failedEmails}. Vérifiez les logs serveur pour plus de détails.`);
          }
        } else if (success && success.length > 0) {
          showNotification('success', 'Succès', `${success.length} email(s) externe(s) envoyé(s) avec succès`);
        }
      }

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header moderne */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between relative overflow-hidden">
          {/* Traits décoratifs - consistent with other page headers */}
          <div className="absolute inset-0 opacity-20">
            {/* Traits horizontaux qui traversent */}
            <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
            <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
            <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
            <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
            <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
            
            {/* Traits verticaux */}
            <div className="absolute top-0 bottom-0 left-12 w-0.5 h-full bg-white/20 transform rotate-12"></div>
            <div className="absolute top-0 bottom-0 left-24 w-0.5 h-full bg-white/15 transform -rotate-6"></div>
            <div className="absolute top-0 bottom-0 right-12 w-0.5 h-full bg-white/20 transform rotate-45"></div>
            <div className="absolute top-0 bottom-0 right-24 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              {replyTo ? 'Répondre' : 'Nouveau message'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-colors relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <div className="p-3 sm:p-6 space-y-4">
            {/* Destinataire principal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  À
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowCc(!showCc)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Cc
                  </button>
                  <button
                    onClick={() => setShowBcc(!showBcc)}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Cci
                  </button>
                </div>
              </div>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                placeholder="destinataire@exemple.com"
                required
              />
            </div>

            {/* CC */}
            {showCc && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cc
                </label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="cc@exemple.com"
                />
              </div>
            )}

            {/* BCC */}
            {showBcc && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cci
                </label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                  placeholder="cci@exemple.com"
                />
              </div>
            )}

            {/* Objet */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Objet
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                placeholder="Objet du message"
              />
            </div>

            {/* Priorité */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priorité:</label>
              <div className="flex flex-wrap items-center gap-2">
                {(['low', 'normal', 'high', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all ${
                      priority === p
                        ? p === 'urgent' 
                          ? 'bg-red-500 text-white shadow-lg'
                          : p === 'high'
                          ? 'bg-orange-500 text-white shadow-lg'
                          : p === 'normal'
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {p === 'urgent' ? 'Urgente' : p === 'high' ? 'Haute' : p === 'normal' ? 'Normale' : 'Basse'}
                  </button>
                ))}
              </div>
            </div>

            {/* Message avec éditeur de texte riche */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Message
              </label>
              
              {/* Barre d'outils de formatage */}
              <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-t-xl border-b-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      formatText('bold');
                      setTimeout(checkFormattingState, 50);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      activeFormatting.bold
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Gras (Ctrl+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      formatText('italic');
                      setTimeout(checkFormattingState, 50);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      activeFormatting.italic
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Italique (Ctrl+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      formatText('underline');
                      setTimeout(checkFormattingState, 50);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      activeFormatting.underline
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Souligné (Ctrl+U)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      formatText('insertUnorderedList');
                      setTimeout(checkFormattingState, 100);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      activeFormatting.list
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Liste à puces"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      formatText('insertOrderedList');
                      setTimeout(checkFormattingState, 100);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      activeFormatting.orderedList
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Liste numérotée"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      // Sauvegarder la position du curseur avant d'ouvrir le picker
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && contentEditableRef.current) {
                        const range = selection.getRangeAt(0);
                        if (contentEditableRef.current.contains(range.commonAncestorContainer) || 
                            range.commonAncestorContainer === contentEditableRef.current) {
                          savedSelectionRef.current = range.cloneRange();
                        }
                      }
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      showEmojiPicker
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                    title="Ajouter un emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  {/* Picker d'emoji amélioré */}
                  {showEmojiPicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => {
                          setShowEmojiPicker(false);
                          setEmojiSearch('');
                          setSelectedEmojiCategory('visages');
                          savedSelectionRef.current = null;
                        }}
                      ></div>
                      <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 w-96 overflow-hidden">
                        {/* Header avec recherche */}
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="relative">
                            <input
                              type="text"
                              value={emojiSearch}
                              onChange={(e) => setEmojiSearch(e.target.value)}
                              placeholder="Rechercher un emoji..."
                              className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                            />
                            <Smile className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          </div>
                        </div>
                        
                        {/* Catégories */}
                        <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-none">
                          {Object.keys(emojiCategories).map((categoryKey) => {
                            const category = emojiCategories[categoryKey as keyof typeof emojiCategories];
                            return (
                              <button
                                key={categoryKey}
                                type="button"
                                onClick={() => setSelectedEmojiCategory(categoryKey as keyof typeof emojiCategories)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                  selectedEmojiCategory === categoryKey
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {category.name}
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Grille d'emojis */}
                        <div className="p-3 max-h-64 overflow-y-auto scrollbar-visible">
                          {emojiSearch ? (
                            // Recherche dans tous les emojis
                            <div className="grid grid-cols-10 gap-2">
                              {Object.values(emojiCategories)
                                .flatMap(cat => cat.emojis)
                                .filter(emoji => emojiSearch === '' || emoji.includes(emojiSearch))
                                .slice(0, 60)
                                .map((emoji, index) => (
                                  <button
                                    key={`search-${index}`}
                                    type="button"
                                    onClick={() => insertEmoji(emoji)}
                                    className="text-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg p-2 transition-all hover:scale-110 active:scale-95"
                                    title={emoji}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                            </div>
                          ) : (
                            // Emojis de la catégorie sélectionnée
                            <div className="grid grid-cols-10 gap-2">
                              {emojiCategories[selectedEmojiCategory].emojis.map((emoji, index) => (
                                <button
                                  key={`${selectedEmojiCategory}-${index}`}
                                  type="button"
                                  onClick={() => insertEmoji(emoji)}
                                  className="text-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg p-2 transition-all hover:scale-110 active:scale-95"
                                  title={emoji}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {emojiSearch && Object.values(emojiCategories)
                            .flatMap(cat => cat.emojis)
                            .filter(emoji => emojiSearch === '' || emoji.includes(emojiSearch)).length === 0 && (
                            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                              Aucun emoji trouvé
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Zone d'édition */}
              <div
                ref={contentEditableRef}
                contentEditable
                onInput={handleContentChange}
                onBlur={handleContentChange}
                onMouseUp={checkFormattingState}
                onKeyUp={checkFormattingState}
                onClick={checkFormattingState}
                onKeyDown={(e) => {
                  // Permettre d'ajouter un nouvel élément de liste en appuyant sur Entrée
                  if (e.key === 'Enter') {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      let container = range.commonAncestorContainer;
                      if (container.nodeType === Node.TEXT_NODE) {
                        container = container.parentNode as HTMLElement;
                      }
                      
                      // Si on est dans un élément de liste vide ou à la fin
                      if (container && container.tagName === 'LI') {
                        const list = container.parentElement;
                        if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
                          // Si l'élément est vide ou ne contient qu'un espace, créer un nouvel élément
                          if (!container.textContent?.trim() || container.textContent === '\u200B') {
                            e.preventDefault();
                            const newListItem = document.createElement('li');
                            newListItem.appendChild(document.createTextNode('\u200B'));
                            if (container.nextSibling) {
                              list.insertBefore(newListItem, container.nextSibling);
                            } else {
                              list.appendChild(newListItem);
                            }
                            // Placer le curseur dans le nouvel élément
                            const newRange = document.createRange();
                            newRange.setStart(newListItem.firstChild || newListItem, 1);
                            newRange.setEnd(newListItem.firstChild || newListItem, 1);
                            selection.removeAllRanges();
                            selection.addRange(newRange);
                            handleContentChange();
                          }
                        }
                      }
                    }
                  }
                  // Sortir de la liste avec Entrée + Entrée
                  if (e.key === 'Enter' && e.shiftKey === false) {
                    setTimeout(() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        let container = range.commonAncestorContainer;
                        if (container.nodeType === Node.TEXT_NODE) {
                          container = container.parentNode as HTMLElement;
                        }
                        if (container && container.tagName === 'LI') {
                          const list = container.parentElement;
                          if (list && (list.tagName === 'UL' || list.tagName === 'OL')) {
                            // Si l'élément de liste est vide deux fois de suite, sortir de la liste
                            if (!container.textContent?.trim() || container.textContent === '\u200B') {
                              const previousItem = container.previousElementSibling as HTMLElement;
                              if (previousItem && (!previousItem.textContent?.trim() || previousItem.textContent === '\u200B')) {
                                e.preventDefault();
                                const p = document.createElement('p');
                                p.appendChild(document.createTextNode('\u200B'));
                                if (list.nextSibling) {
                                  list.parentNode?.insertBefore(p, list.nextSibling);
                                } else {
                                  list.parentNode?.appendChild(p);
                                }
                                container.remove();
                                previousItem.remove();
                                if (list.children.length === 0) {
                                  list.remove();
                                }
                                const newRange = document.createRange();
                                newRange.setStart(p.firstChild || p, 1);
                                newRange.setEnd(p.firstChild || p, 1);
                                selection.removeAllRanges();
                                selection.addRange(newRange);
                                handleContentChange();
                              }
                            }
                          }
                        }
                      }
                    }, 0);
                  }
                }}
                className="w-full min-h-[300px] px-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-b-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all scrollbar-visible outline-none"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
                data-placeholder="Tapez votre message ici..."
              />
              
              {/* Style pour le placeholder et les listes */}
              <style>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: #9ca3af;
                  pointer-events: none;
                }
                [contenteditable]:focus {
                  outline: none;
                }
                [contenteditable] ul,
                [contenteditable] ol {
                  display: block;
                  list-style-position: outside;
                  padding-left: 30px !important;
                  margin: 8px 0 !important;
                }
                [contenteditable] ul {
                  list-style-type: disc !important;
                }
                [contenteditable] ol {
                  list-style-type: decimal !important;
                }
                [contenteditable] li {
                  display: list-item;
                  margin: 4px 0;
                  padding-left: 4px;
                }
              `}</style>
            </div>

            {/* Pièces jointes */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Pièces jointes ({attachments.length})
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {attachments.map((att, index) => {
                    const isImage = att.type?.startsWith('image/');
                    const isPdf = att.type === 'application/pdf';
                    const fileSizeKB = (att.size / 1024).toFixed(1);
                    
                    return (
                      <div
                        key={index}
                        className="relative group bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center gap-3 min-w-[200px]"
                      >
                        {isImage ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isPdf ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            <FileText className={`w-6 h-6 ${isPdf ? 'text-red-500' : 'text-blue-500'}`} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={att.name}>
                            {att.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{fileSizeKB} KB</p>
                        </div>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 flex-shrink-0"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Options de planification */}
            {showSchedule && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Programmer l'envoi
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Email externe - Info */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Envoi automatique aux emails externes
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Les emails saisis dans les champs À, Cc ou Cci qui ne sont pas des utilisateurs de l'application seront automatiquement envoyés par email externe via SendGrid.
                  </p>
                </div>
              </div>
              
              {/* Option supplémentaire pour ajouter d'autres emails externes */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendExternal}
                    onChange={(e) => setSendExternal(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ajouter des destinataires externes supplémentaires
                  </span>
                </label>
                {sendExternal && (
                  <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="text"
                      value={externalRecipients}
                      onChange={(e) => setExternalRecipients(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all text-sm"
                      placeholder="email1@exemple.com, email2@exemple.com"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Saisissez des adresses email supplémentaires à qui envoyer ce message (séparées par des virgules).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer avec actions */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-3 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              title="Joindre un fichier"
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
              className={`p-3 rounded-full border-2 transition-all shadow-sm hover:shadow-md ${
                showSchedule
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
              title="Programmer l'envoi"
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-stretch sm:items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={sending}
              className="px-4 sm:px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-all font-medium text-xs sm:text-sm shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Brouillon</span>
            </button>
            <button
              onClick={handleSend}
              disabled={sending || uploading || !to.trim()}
              className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl flex items-center gap-2 justify-center"
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