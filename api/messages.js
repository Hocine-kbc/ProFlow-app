import express from 'express';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configuration Supabase (avec vérification des variables)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables Supabase manquantes. Vérifiez votre fichier .env');
  console.error('Variables requises: VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_KEY (ou VITE_SUPABASE_ANON_KEY)');
}

// Utiliser un client avec service_role pour avoir accès à admin API
// Si SUPABASE_SERVICE_KEY n'est pas défini, on utilisera la clé anon (limité)
const supabaseAdminKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAdminKey || 'placeholder-key'
);

// Vérifier que la clé service_role est bien configurée
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY non défini. L\'API Admin ne fonctionnera pas correctement.');
  console.warn('⚠️ Les emails des utilisateurs ne pourront pas être récupérés.');
}

// Configuration SendGrid
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.test-key-not-configured') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Configuration Multer pour l'upload de fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter tous les types de fichiers pour les messages
    cb(null, true);
  }
});

// Middleware d'authentification
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token invalide' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Erreur d\'authentification' });
  }
};

// Fonction pour calculer un score de spam basique
function calculateSpamScore(senderEmail, content, subject) {
  let score = 0;
  const spamKeywords = ['viagra', 'casino', 'gagner', 'gratuit', 'cliquez ici', 'urgent'];
  const lowerContent = (content || '').toLowerCase();
  const lowerSubject = (subject || '').toLowerCase();

  spamKeywords.forEach(keyword => {
    if (lowerContent.includes(keyword) || lowerSubject.includes(keyword)) {
      score += 20;
    }
  });

  if (senderEmail && (senderEmail.includes('noreply') || senderEmail.includes('no-reply'))) {
    score += 10;
  }

  return Math.min(score, 100);
}

// Fonction pour envoyer un email via SendGrid
async function sendExternalEmail(to, subject, content, attachments = []) {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@proflow.com',
      subject,
      html: content.replace(/\n/g, '<br>'),
      attachments: attachments.map(att => ({
        content: att.base64 || '',
        filename: att.name,
        type: att.type,
        disposition: 'attachment'
      }))
    };

    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('SendGrid error:', error);
    return { success: false, error: error.message };
  }
}

// POST /api/messages - Envoyer un message
router.post('/', authenticate, upload.array('attachments'), async (req, res) => {
  try {
    const { message, options = {} } = req.body;
    const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;

    // Validation
    if (!parsedMessage.subject && parsedMessage.status !== 'draft') {
      return res.status(400).json({ error: 'L\'objet est requis' });
    }
    if (!parsedMessage.content && parsedMessage.status !== 'draft') {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }

    // Traiter les pièces jointes uploadées
    let attachments = parsedMessage.attachments || [];
    if (req.files && req.files.length > 0) {
      // Upload vers Supabase Storage
      for (const file of req.files) {
        const fileName = `${Date.now()}_${file.originalname}`;
        const filePath = `${req.user.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('message-attachments')
            .getPublicUrl(filePath);

          attachments.push({
            name: file.originalname,
            url: publicUrl,
            size: file.size,
            type: file.mimetype
          });
        }
      }
    }

    // Récupérer l'ID du destinataire si c'est un email
    let recipientId = parsedMessage.recipient_id;
    if (!recipientId && parsedMessage.recipient_email) {
      try {
        // Utiliser l'API Admin pour chercher l'utilisateur par email
        // Note: listUsers() peut être lent avec beaucoup d'utilisateurs
        // En production, considérez créer une fonction Edge ou une table de profils
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && users) {
          const recipient = users.find(u => u.email && u.email.toLowerCase() === parsedMessage.recipient_email.toLowerCase());
          if (recipient) {
            recipientId = recipient.id;
          } else {
            // Si l'utilisateur n'existe pas et qu'on ne veut pas envoyer d'email externe
            if (!options.send_external_email && parsedMessage.status !== 'draft') {
              return res.status(404).json({ 
                error: `Destinataire "${parsedMessage.recipient_email}" introuvable dans l'application. Activez l'option "Envoyer aussi par email externe" pour envoyer à un email externe.` 
              });
            }
          }
        } else if (listError) {
          console.error('Error listing users:', listError);
          // Si erreur de listing mais qu'on peut envoyer un email externe, continuer
          if (!options.send_external_email && parsedMessage.status !== 'draft') {
            return res.status(500).json({ error: 'Erreur lors de la recherche du destinataire' });
          }
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
        // Si l'utilisateur n'est pas trouvé mais qu'on peut envoyer un email externe, continuer
        if (!options.send_external_email && parsedMessage.status !== 'draft') {
          return res.status(404).json({ error: 'Destinataire introuvable dans l\'application' });
        }
      }
    }

    // Calculer le score de spam
    const spamScore = calculateSpamScore(
      req.user.email,
      parsedMessage.content,
      parsedMessage.subject
    );
    const isSpam = spamScore >= 50;

    // Préparer les données du message
    // Si c'est un brouillon ou qu'on n'a pas de recipientId, utiliser l'ID de l'expéditeur
    const finalRecipientId = parsedMessage.status === 'draft' 
      ? req.user.id 
      : (recipientId || req.user.id);
    
    // Pour un message envoyé, le folder par défaut est 'inbox' pour le destinataire
    // Le folder sera déterminé dynamiquement selon la perspective de l'utilisateur
    // (inbox pour le destinataire, sent pour l'expéditeur)
    const messageData = {
      sender_id: req.user.id,
      recipient_id: finalRecipientId,
      subject: parsedMessage.subject || '(Sans objet)',
      content: parsedMessage.content || '',
      attachments: attachments,
      status: parsedMessage.status || 'sent',
      folder: parsedMessage.status === 'draft' ? 'drafts' : 
              parsedMessage.status === 'scheduled' ? 'drafts' : 'inbox', // Par défaut inbox pour le destinataire
      priority: parsedMessage.priority || 'normal',
      scheduled_at: parsedMessage.scheduled_at || null,
      reply_to_id: parsedMessage.reply_to_id || null,
      spam_score: spamScore,
      is_spam: isSpam,
      read: false,
      is_starred: false,
      is_archived: false,
      is_deleted: false
    };

    // Si c'est un brouillon ou programmé, ne pas envoyer maintenant
    if (messageData.status === 'draft') {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: data });
    }

    // Envoyer le message immédiatement
    if (options.send_immediately !== false && messageData.status === 'sent') {
      // Insérer dans la base de données
      const { data: savedMessage, error: insertError } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (insertError) throw insertError;

      // Envoyer via SendGrid si demandé
      if (options.send_external_email && options.external_recipients) {
        for (const email of options.external_recipients) {
          await sendExternalEmail(
            email,
            messageData.subject,
            messageData.content,
            attachments
          );
        }
      }

      return res.json({ 
        success: true, 
        message: savedMessage,
        external_emails_sent: options.send_external_email ? options.external_recipients?.length || 0 : 0
      });
    }

    // Message programmé
    if (messageData.status === 'scheduled' && messageData.scheduled_at) {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: data, scheduled: true });
    }

    return res.status(400).json({ error: 'Données invalides' });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de l\'envoi du message' });
  }
});

// GET /api/messages/inbox - Liste des messages reçus
router.get('/inbox', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, folder = 'inbox' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Pour la boîte de réception : messages reçus avec folder='inbox' ou null
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('recipient_id', req.user.id)
      .or('folder.eq.inbox,folder.is.null'); // Accepter folder='inbox' ou folder null
    
    // Exclure les messages supprimés
    query = query.or('is_deleted.is.null,is_deleted.eq.false');
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      messages: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        total_pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching inbox:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// GET /api/messages/sent - Liste des messages envoyés
router.get('/sent', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Pour les messages envoyés : messages envoyés par l'utilisateur
    let query = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('sender_id', req.user.id)
      .or('folder.eq.sent,folder.eq.inbox'); // Accepter folder='sent' ou 'inbox'
    
    // Exclure les messages supprimés
    query = query.or('is_deleted.is.null,is_deleted.eq.false');
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      messages: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        total_pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des messages envoyés' });
  }
});

// GET /api/messages/drafts - Liste des brouillons
router.get('/drafts', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', req.user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.json({ messages: data || [] });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des brouillons' });
  }
});

// GET /api/messages/:id - Détails d'un message
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Vérifier que l'utilisateur peut voir ce message
    if (data.sender_id !== req.user.id && data.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    return res.json({ message: data });
  } catch (error) {
    console.error('Error fetching message:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du message' });
  }
});

// PUT /api/messages/:id - Mettre à jour un message
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Vérifier que le message existe et appartient à l'utilisateur
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (existingMessage.sender_id !== req.user.id && existingMessage.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Mettre à jour
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, message: data });
  } catch (error) {
    console.error('Error updating message:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du message' });
  }
});

// DELETE /api/messages/:id - Supprimer un message
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le message existe et appartient à l'utilisateur
    const { data: existingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (existingMessage.sender_id !== req.user.id && existingMessage.recipient_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    // Suppression par utilisateur : ajouter l'ID à deleted_by_users
    // Récupérer le message actuel pour obtenir deleted_by_users
    const { data: existingMessageData, error: fetchError2 } = await supabase
      .from('messages')
      .select('deleted_by_users')
      .eq('id', id)
      .single();

    if (fetchError2) throw fetchError2;

    // Ajouter l'ID de l'utilisateur actuel au tableau deleted_by_users
    const deletedByUsers = existingMessageData?.deleted_by_users || [];
    if (!deletedByUsers.includes(req.user.id)) {
      deletedByUsers.push(req.user.id);
    }

    // Mettre à jour le message avec le nouveau tableau deleted_by_users
    const { error } = await supabase
      .from('messages')
      .update({
        deleted_by_users: deletedByUsers,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du message' });
  }
});

// POST /api/messages/:id/archive - Archiver un message
router.post('/:id/archive', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('messages')
      .update({
        is_archived: true,
        folder: 'archive'
      })
      .eq('id', id)
      .or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Error archiving message:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'archivage' });
  }
});

// POST /api/messages/:id/star - Marquer comme favori
router.post('/:id/star', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_starred = true } = req.body;

    const { error } = await supabase
      .from('messages')
      .update({ is_starred })
      .eq('id', id)
      .or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Error starring message:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du favori' });
  }
});

// POST /api/messages/:id/read - Marquer comme lu
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('messages')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('recipient_id', req.user.id);

    if (error) throw error;

    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// POST /api/messages/search - Recherche de messages
router.post('/search', authenticate, async (req, res) => {
  try {
    const { query, filters = {}, page = 1, limit = 50 } = req.body;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let supabaseQuery = supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`)
      .or('is_deleted.is.null,is_deleted.eq.false');

    // Recherche textuelle
    if (query) {
      supabaseQuery = supabaseQuery.or(`subject.ilike.%${query}%,content.ilike.%${query}%`);
    }

    // Filtres
    if (filters.folder) {
      supabaseQuery = supabaseQuery.eq('folder', filters.folder);
    }
    if (filters.is_starred !== undefined) {
      supabaseQuery = supabaseQuery.eq('is_starred', filters.is_starred);
    }
    if (filters.is_read !== undefined) {
      supabaseQuery = supabaseQuery.eq('read', filters.is_read);
    }
    if (filters.priority) {
      supabaseQuery = supabaseQuery.eq('priority', filters.priority);
    }
    if (filters.has_attachments) {
      supabaseQuery = supabaseQuery.not('attachments', 'eq', '[]');
    }

    // Date range
    if (filters.date_from) {
      supabaseQuery = supabaseQuery.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      supabaseQuery = supabaseQuery.lte('created_at', filters.date_to);
    }

    const { data, error, count } = await supabaseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    return res.json({
      messages: data || [],
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil((count || 0) / parseInt(limit))
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    return res.status(500).json({ error: 'Erreur lors de la recherche' });
  }
});

// GET /api/messages/stats - Statistiques
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Récupérer les données pour pouvoir filtrer par deleted_by_users
    const [
      { data: inboxMessages },
      { data: unreadMessages },
      { data: draftsMessages },
      { data: sentMessages },
      { data: archivedMessages },
      { data: starredMessages },
      { data: spamMessages }
    ] = await Promise.all([
      supabase.from('messages').select('id,deleted_by_users').eq('folder', 'inbox').eq('recipient_id', req.user.id).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').eq('read', false).eq('recipient_id', req.user.id).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').eq('status', 'draft').eq('sender_id', req.user.id).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').eq('folder', 'sent').eq('sender_id', req.user.id).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`).eq('is_archived', true).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`).eq('is_starred', true).neq('is_deleted', true),
      supabase.from('messages').select('id,deleted_by_users').or(`sender_id.eq.${req.user.id},recipient_id.eq.${req.user.id}`).eq('is_spam', true).neq('is_deleted', true)
    ]);

    // Filtrer les messages supprimés par l'utilisateur actuel
    const filterDeleted = (messages) => {
      if (!messages) return [];
      return messages.filter((msg) => {
        const deletedByUsers = msg.deleted_by_users || [];
        return !deletedByUsers.includes(req.user.id);
      });
    };

    return res.json({
      inbox_count: filterDeleted(inboxMessages || []).length,
      unread_count: filterDeleted(unreadMessages || []).length,
      drafts_count: filterDeleted(draftsMessages || []).length,
      sent_count: filterDeleted(sentMessages || []).length,
      archived_count: filterDeleted(archivedMessages || []).length,
      starred_count: filterDeleted(starredMessages || []).length,
      spam_count: filterDeleted(spamMessages || []).length
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// POST /api/messages/get-users-emails - Récupérer les emails de plusieurs utilisateurs
router.post('/get-users-emails', authenticate, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Liste d\'IDs utilisateurs requise' });
    }
    
    // Vérifier que la clé service_role est disponible
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ SUPABASE_SERVICE_KEY non définie - impossible d\'utiliser admin.listUsers()');
      // Fallback : retourner un map vide (les emails seront "inconnu")
      const emailMap = {};
      userIds.forEach((userId) => {
        emailMap[userId] = 'Email inconnu (clé admin manquante)';
      });
      return res.json({ emails: emailMap });
    }
    
    // Récupérer tous les utilisateurs en une seule fois
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs: ' + error.message });
    }
    
    // Créer un map des emails
    const emailMap = {};
    userIds.forEach((userId) => {
      const user = users?.find(u => u.id === userId);
      if (user) {
        emailMap[userId] = user.email || 'Email inconnu';
      } else {
        emailMap[userId] = 'Email inconnu';
      }
    });
    
    return res.json({ emails: emailMap });
  } catch (error) {
    console.error('Error in getUsersEmails:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des emails' });
  }
});

export default router;

