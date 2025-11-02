import express from 'express';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import multer from 'multer';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

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
  console.log('✅ SendGrid API Key configuré');
  
  // Vérifier également la configuration de l'adresse expéditrice
  if (process.env.SENDGRID_FROM_EMAIL && process.env.SENDGRID_FROM_EMAIL !== 'noreply@proflow.com') {
    console.log(`✅ Adresse expéditrice configurée: ${process.env.SENDGRID_FROM_EMAIL}`);
    console.log('⚠️ Assurez-vous que cette adresse est vérifiée dans SendGrid (Sender Verification)');
  } else {
    console.warn('⚠️ SENDGRID_FROM_EMAIL non configuré ou utilise la valeur par défaut.');
    console.warn('   Veuillez définir SENDGRID_FROM_EMAIL dans votre fichier .env avec une adresse email vérifiée dans SendGrid.');
    console.warn('   Les emails externes ne fonctionneront pas tant que SENDGRID_FROM_EMAIL n\'est pas configuré.');
  }
} else {
  console.warn('⚠️ SENDGRID_API_KEY non configuré ou invalide. Les emails externes ne fonctionneront pas.');
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

// Fonction pour télécharger un fichier depuis une URL et le convertir en base64
async function downloadFileAsBase64(url) {
  return new Promise((resolve, reject) => {
    try {
      // Utiliser le module http/https natif pour être compatible avec toutes les versions de Node.js
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Erreur lors du téléchargement: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const base64 = buffer.toString('base64');
          resolve(base64);
        });
        
        response.on('error', (error) => {
          reject(error);
        });
      }).on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement du fichier:', error);
      reject(error);
    }
  });
}

// Fonction pour envoyer un email via SendGrid
export async function sendExternalEmail(to, subject, content, attachments = [], senderEmail = null) {
  try {
    // Vérifier que SendGrid est configuré
    if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'SG.test-key-not-configured') {
      console.error('❌ SENDGRID_API_KEY non configuré');
      throw new Error('SendGrid n\'est pas configuré. Vérifiez SENDGRID_API_KEY dans votre fichier .env');
    }

    // Vérifier que SENDGRID_FROM_EMAIL est configuré et vérifié
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail || fromEmail === 'noreply@proflow.com') {
      const errorMsg = 'SENDGRID_FROM_EMAIL n\'est pas configuré dans votre fichier .env. ' +
        'Vous devez définir SENDGRID_FROM_EMAIL avec une adresse email vérifiée dans SendGrid. ' +
        'Exemple: SENDGRID_FROM_EMAIL=votre_email@exemple.com';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`📧 Préparation de l'email pour: ${to}`);
    console.log(`📧 Sujet: ${subject}`);
    console.log(`📧 Pièces jointes: ${attachments.length}`);

    // Préparer les pièces jointes
    const preparedAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        try {
          let attachmentContent = '';
          
          // Si le fichier a déjà du contenu base64, l'utiliser
          if (att.base64) {
            attachmentContent = att.base64;
          } 
          // Sinon, si c'est une URL Supabase, télécharger le fichier
          else if (att.url) {
            console.log(`📎 Téléchargement de la pièce jointe: ${att.name} depuis ${att.url}`);
            attachmentContent = await downloadFileAsBase64(att.url);
          }
          
          if (attachmentContent) {
            preparedAttachments.push({
              content: attachmentContent,
              filename: att.name || 'attachment',
              type: att.type || 'application/octet-stream',
              disposition: 'attachment'
            });
            console.log(`✅ Pièce jointe préparée: ${att.name}`);
          } else {
            console.warn(`⚠️ Impossible de préparer la pièce jointe: ${att.name}`);
          }
        } catch (attError) {
          console.error(`❌ Erreur lors de la préparation de la pièce jointe ${att.name}:`, attError);
          // Continuer même si une pièce jointe échoue
        }
      }
    }

    // Préparer le contenu HTML
    let htmlContent = content;
    // Convertir les sauts de ligne en <br>
    htmlContent = htmlContent.replace(/\n/g, '<br>');
    // Encapsuler dans un HTML de base si ce n'est pas déjà du HTML
    if (!htmlContent.includes('<html')) {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;
    }

    // Toujours utiliser l'email vérifié dans SendGrid (SENDGRID_FROM_EMAIL)
    // Ignorer senderEmail car les emails des utilisateurs ne sont pas vérifiés dans SendGrid
    // fromEmail est déjà vérifié plus haut, pas besoin de le re-vérifier ici
    const fromName = process.env.SENDGRID_FROM_NAME || 'ProFlow';

    console.log(`📧 Adresse expéditrice vérifiée: ${fromEmail}`);

    const msg = {
      to: to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: subject,
      html: htmlContent,
      text: content.replace(/<[^>]*>/g, ''), // Version texte sans HTML
      attachments: preparedAttachments
    };

    console.log(`📤 Envoi de l'email via SendGrid...`);
    const result = await sgMail.send(msg);
    console.log(`✅ Email envoyé avec succès à ${to}. Code: ${result[0]?.statusCode}`);
    return { success: true, result };
  } catch (error) {
    console.error('❌ Erreur SendGrid:', error);
    // Log détaillé de l'erreur
    if (error.response && error.response.body) {
      const errorDetails = error.response.body;
      console.error('Détails de l\'erreur SendGrid:', JSON.stringify(errorDetails, null, 2));
      
      // Créer un message d'erreur plus explicite
      let errorMessage = 'Erreur lors de l\'envoi de l\'email externe';
      
      if (errorDetails.errors && errorDetails.errors.length > 0) {
        const firstError = errorDetails.errors[0];
        
        if (firstError.field === 'from' && firstError.message.includes('verified Sender Identity')) {
          errorMessage = `L'adresse email expéditrice "${process.env.SENDGRID_FROM_EMAIL || senderEmail || 'noreply@proflow.com'}" n'est pas vérifiée dans SendGrid. ` +
            `Vous devez vérifier cette adresse dans votre compte SendGrid (Sender Verification). ` +
            `Consultez: https://sendgrid.com/docs/for-developers/sending-email/sender-identity/`;
        } else {
          errorMessage = firstError.message || errorMessage;
        }
      }
      
      const detailedError = new Error(errorMessage);
      detailedError.originalError = error;
      detailedError.sendgridDetails = errorDetails;
      throw detailedError;
    }
    throw error; // Propager l'erreur pour qu'elle soit gérée par l'appelant
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

    // Collecter tous les emails (À, Cc, Cci)
    const allRecipients = [];
    if (parsedMessage.recipient_email) {
      allRecipients.push(parsedMessage.recipient_email);
    }
    if (parsedMessage.cc) {
      // Extraire les emails du champ Cc
      const ccEmails = parsedMessage.cc.split(',').map(e => e.trim()).filter(e => e);
      allRecipients.push(...ccEmails);
    }
    if (parsedMessage.bcc) {
      // Extraire les emails du champ Cci
      const bccEmails = parsedMessage.bcc.split(',').map(e => e.trim()).filter(e => e);
      allRecipients.push(...bccEmails);
    }

    // Récupérer l'ID du destinataire principal et détecter les emails externes
    let recipientId = parsedMessage.recipient_id;
    const externalEmails = new Set(); // Pour stocker les emails externes sans doublons
    
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
            // Email externe détecté - l'ajouter à la liste
            externalEmails.add(parsedMessage.recipient_email.toLowerCase());
          }
        } else if (listError) {
          console.error('Error listing users:', listError);
          // En cas d'erreur, considérer comme email externe pour permettre l'envoi
          if (parsedMessage.recipient_email) {
            externalEmails.add(parsedMessage.recipient_email.toLowerCase());
          }
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
        // En cas d'erreur, considérer comme email externe
        if (parsedMessage.recipient_email) {
          externalEmails.add(parsedMessage.recipient_email.toLowerCase());
        }
      }
    }

    // Vérifier les emails dans Cc et Cci
    try {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      if (!listError && users) {
        // Vérifier chaque email dans Cc et Cci
        const userEmails = new Set(users.map(u => u.email?.toLowerCase()).filter(Boolean));
        
        if (parsedMessage.cc) {
          const ccEmails = parsedMessage.cc.split(',').map(e => e.trim()).filter(e => e);
          ccEmails.forEach(email => {
            if (!userEmails.has(email.toLowerCase())) {
              externalEmails.add(email.toLowerCase());
            }
          });
        }
        
        if (parsedMessage.bcc) {
          const bccEmails = parsedMessage.bcc.split(',').map(e => e.trim()).filter(e => e);
          bccEmails.forEach(email => {
            if (!userEmails.has(email.toLowerCase())) {
              externalEmails.add(email.toLowerCase());
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking Cc/Bcc emails:', error);
    }

    // Activer automatiquement l'envoi externe si des emails externes sont détectés
    if (externalEmails.size > 0 && parsedMessage.status !== 'draft') {
      options.send_external_email = true;
      // Fusionner les emails externes détectés avec ceux fournis manuellement
      const manualExternal = (options.external_recipients || []).map(e => e.toLowerCase());
      options.external_recipients = [...new Set([...Array.from(externalEmails), ...manualExternal])];
      console.log(`📧 Email(s) externe(s) détecté(s): ${Array.from(externalEmails).join(', ')}`);
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
      recipient_email: parsedMessage.recipient_email || null,
      subject: parsedMessage.subject || '(Sans objet)',
      content: parsedMessage.content || '',
      attachments: attachments,
      status: parsedMessage.status || 'sent',
      folder: parsedMessage.status === 'draft' ? 'drafts' : 
              parsedMessage.status === 'scheduled' ? 'drafts' : 'inbox', // Par défaut inbox pour le destinataire
      priority: parsedMessage.priority || 'normal',
      scheduled_at: parsedMessage.scheduled_at || null,
      reply_to_id: parsedMessage.reply_to_id || null,
      cc: parsedMessage.cc || null,
      bcc: parsedMessage.bcc || null,
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

      // Envoyer via SendGrid si demandé ou si des emails externes sont détectés
      const emailResults = {
        success: [],
        failed: []
      };

      if (options.send_external_email && options.external_recipients && options.external_recipients.length > 0) {
        console.log(`📤 Envoi de ${options.external_recipients.length} email(s) externe(s) via SendGrid...`);
        
        // Vérifier que SENDGRID_FROM_EMAIL est configuré avant d'essayer d'envoyer
        const verifiedSenderEmail = process.env.SENDGRID_FROM_EMAIL;
        
        if (!verifiedSenderEmail || verifiedSenderEmail === 'noreply@proflow.com') {
          const errorMsg = 'SENDGRID_FROM_EMAIL n\'est pas configuré. Vous devez définir SENDGRID_FROM_EMAIL dans votre fichier .env avec une adresse email vérifiée dans SendGrid.';
          console.error('❌', errorMsg);
          emailResults.failed = options.external_recipients.map(email => ({
            email,
            error: errorMsg
          }));
          return res.json({ 
            success: true, 
            message: savedMessage,
            external_emails_sent: 0,
            external_emails_failed: emailResults.failed.length,
            external_email_results: emailResults,
            error: errorMsg
          });
        }
        
        console.log(`📧 Email expéditrice vérifié utilisé: ${verifiedSenderEmail}`);
        
        // Ajouter l'email de l'utilisateur réel dans le corps du message pour information
        const originalContent = messageData.content;
        const userEmail = req.user.email;
        const enhancedContent = `${originalContent}\n\n---\nCet email a été envoyé via ProFlow par ${userEmail}`;
        
        for (const email of options.external_recipients) {
          try {
            await sendExternalEmail(
              email,
              messageData.subject,
              enhancedContent, // Contenu avec information sur l'expéditeur réel
              attachments,
              null // Passer null pour utiliser l'email vérifié de la config
            );
            emailResults.success.push(email);
            console.log(`✅ Email externe envoyé avec succès à: ${email}`);
          } catch (emailError) {
            const errorMessage = emailError.message || emailError.sendgridDetails?.errors?.[0]?.message || 'Erreur inconnue';
            emailResults.failed.push({
              email,
              error: errorMessage
            });
            console.error(`❌ Erreur lors de l'envoi à ${email}:`, errorMessage);
            
            // Si l'erreur concerne la vérification de l'expéditeur, on n'essaie pas les autres
            if (errorMessage.includes('verified Sender Identity') || errorMessage.includes('sender-identity')) {
              console.error('❌ Erreur de vérification de l\'expéditeur. Arrêt de l\'envoi des autres emails.');
              // Ajouter les emails restants comme échoués avec le même message
              const remainingEmails = options.external_recipients.slice(options.external_recipients.indexOf(email) + 1);
              remainingEmails.forEach(remainingEmail => {
                emailResults.failed.push({
                  email: remainingEmail,
                  error: errorMessage
                });
              });
              break; // Arrêter la boucle
            }
            // Continuer avec les autres emails même si un échoue (sauf erreur de vérification)
          }
        }
      }

      return res.json({ 
        success: true, 
        message: savedMessage,
        external_emails_sent: emailResults.success.length,
        external_emails_failed: emailResults.failed.length,
        external_email_results: emailResults
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

// Fonction pour traiter et envoyer un message programmé
async function processScheduledMessage(message) {
  try {
    console.log(`📅 Traitement du message programmé ID: ${message.id} (programmé pour: ${message.scheduled_at})`);
    
    // Récupérer les informations complètes du message
    const { data: fullMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*, sender:sender_id(*), recipient:recipient_id(*)')
      .eq('id', message.id)
      .single();
    
    if (fetchError || !fullMessage) {
      console.error(`❌ Erreur récupération message ${message.id}:`, fetchError);
      return { success: false, error: fetchError };
    }
    
    // Vérifier que le message est toujours programmé et que la date est passée
    const scheduledDate = new Date(fullMessage.scheduled_at);
    const now = new Date();
    
    if (fullMessage.status !== 'scheduled') {
      console.log(`⚠️ Message ${message.id} n'est plus programmé (statut: ${fullMessage.status})`);
      return { success: false, error: 'Message already processed' };
    }
    
    if (scheduledDate > now) {
      console.log(`⏰ Message ${message.id} n'est pas encore prêt à être envoyé`);
      return { success: false, error: 'Not ready yet' };
    }
    
    // Récupérer le destinataire
    let recipientEmail = fullMessage.recipient_email;
    let recipientId = fullMessage.recipient_id;
    
    // Si pas de recipient_id, essayer de trouver l'utilisateur par email
    if (!recipientId && recipientEmail) {
      const { data: recipientUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', recipientEmail)
        .maybeSingle();
      
      if (recipientUser) {
        recipientId = recipientUser.id;
      }
    }
    
    // Préparer les données du message
    const messageData = {
      sender_id: fullMessage.sender_id,
      recipient_email: recipientEmail,
      recipient_id: recipientId,
      subject: fullMessage.subject,
      content: fullMessage.content,
      attachments: fullMessage.attachments || [],
      status: 'sent',
      folder: 'sent',
      priority: fullMessage.priority || 'normal',
      reply_to_id: fullMessage.reply_to_id || null,
      cc: fullMessage.cc || null,
      bcc: fullMessage.bcc || null
    };
    
    // Détecter les emails externes
    const allRecipients = [
      recipientEmail,
      ...(fullMessage.cc ? fullMessage.cc.split(',').map(e => e.trim()) : []),
      ...(fullMessage.bcc ? fullMessage.bcc.split(',').map(e => e.trim()) : [])
    ].filter(Boolean);
    
    // Vérifier quels emails sont externes
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .in('email', allRecipients);
    
    const existingEmails = new Set((existingUsers || []).map(u => u.email));
    const externalEmails = allRecipients.filter(email => !existingEmails.has(email));
    
    // Envoyer les emails externes si nécessaire
    if (externalEmails.length > 0) {
      console.log(`📧 Envoi d'emails externes pour le message ${message.id}:`, externalEmails);
      
      for (const externalEmail of externalEmails) {
        try {
          await sendExternalEmail(
            externalEmail,
            fullMessage.subject,
            fullMessage.content,
            fullMessage.attachments || []
          );
          console.log(`✅ Email externe envoyé à ${externalEmail}`);
        } catch (extError) {
          console.error(`❌ Erreur envoi email externe à ${externalEmail}:`, extError);
          // Continuer même si un email externe échoue
        }
      }
    }
    
    // Créer le message pour le destinataire interne (si existe)
    if (recipientId) {
      const recipientMessage = {
        ...messageData,
        folder: 'inbox',
        recipient_id: recipientId,
        read: false
      };
      
      const { data: sentMessage, error: sendError } = await supabase
        .from('messages')
        .insert(recipientMessage)
        .select()
        .single();
      
      if (sendError) {
        console.error(`❌ Erreur création message destinataire:`, sendError);
        throw sendError;
      }
    }
    
    // Mettre à jour le message original à 'sent'
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        status: 'sent',
        folder: 'sent',
        scheduled_at: null
      })
      .eq('id', message.id);
    
    if (updateError) {
      console.error(`❌ Erreur mise à jour message:`, updateError);
      throw updateError;
    }
    
    console.log(`✅ Message programmé ${message.id} envoyé avec succès`);
    return { success: true, message: fullMessage };
    
  } catch (error) {
    console.error(`❌ Erreur lors du traitement du message programmé ${message.id}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

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

// PUT /api/messages/:id - Mettre à jour un message (gère aussi l'envoi de brouillons)
router.put('/:id', authenticate, upload.array('attachments'), async (req, res) => {
  try {
    const { id } = req.params;
    const { message, options = {} } = req.body;
    
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

    // Si le body contient { message, options }, c'est une mise à jour complète avec potentiel envoi
    if (message) {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;

      // Traiter les pièces jointes uploadées
      let attachments = parsedMessage.attachments || existingMessage.attachments || [];
      if (req.files && req.files.length > 0) {
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
      let recipientId = parsedMessage.recipient_id || existingMessage.recipient_id;
      if (!recipientId && parsedMessage.recipient_email) {
        try {
          const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
          
          if (!listError && users) {
            const recipient = users.find(u => u.email && u.email.toLowerCase() === parsedMessage.recipient_email.toLowerCase());
            if (recipient) {
              recipientId = recipient.id;
            } else if (!options.send_external_email && parsedMessage.status !== 'draft') {
              return res.status(404).json({ 
                error: `Destinataire "${parsedMessage.recipient_email}" introuvable dans l'application. Activez l'option "Envoyer aussi par email externe" pour envoyer à un email externe.` 
              });
            }
          }
        } catch (error) {
          console.error('Error finding user by email:', error);
          if (!options.send_external_email && parsedMessage.status !== 'draft') {
            return res.status(404).json({ error: 'Destinataire introuvable dans l\'application' });
          }
        }
      }

      // Calculer le score de spam
      const spamScore = calculateSpamScore(
        req.user.email,
        parsedMessage.content || existingMessage.content,
        parsedMessage.subject || existingMessage.subject
      );
      const isSpam = spamScore >= 50;

      // Préparer les données du message
      const finalRecipientId = parsedMessage.status === 'draft' 
        ? req.user.id 
        : (recipientId || req.user.id);

      // Déterminer le status final
      // Si un status est fourni dans parsedMessage, l'utiliser (important pour l'envoi de brouillons)
      const finalStatus = parsedMessage.status !== undefined ? parsedMessage.status : 
                         (existingMessage.status || 'sent');
      
      // Déterminer le folder : 
      // - Si c'est un brouillon, garder 'drafts'
      // - Si c'est un envoi et que le frontend envoie un folder, l'utiliser
      // - Sinon, utiliser 'inbox' pour le destinataire
      const finalFolder = finalStatus === 'draft' ? 'drafts' : 
                          finalStatus === 'scheduled' ? 'drafts' : 
                          (parsedMessage.folder !== undefined ? parsedMessage.folder : 'inbox');
      
      const messageData = {
        subject: parsedMessage.subject || existingMessage.subject || '(Sans objet)',
        content: parsedMessage.content !== undefined ? parsedMessage.content : existingMessage.content || '',
        attachments: attachments,
        status: finalStatus,
        folder: finalFolder,
        priority: parsedMessage.priority || existingMessage.priority || 'normal',
        scheduled_at: parsedMessage.scheduled_at || existingMessage.scheduled_at || null,
        reply_to_id: parsedMessage.reply_to_id || existingMessage.reply_to_id || null,
        spam_score: spamScore,
        is_spam: isSpam,
        recipient_id: finalRecipientId
      };

      // Si c'est un brouillon, juste mettre à jour
      if (messageData.status === 'draft') {
        const { data, error } = await supabase
          .from('messages')
          .update(messageData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.json({ success: true, message: data });
      }

      // Si on envoie le message (status !== 'draft')
      // Pour l'expéditeur, le folder doit être 'sent' pour qu'il disparaisse des brouillons
      // Pour le destinataire, le folder reste 'inbox'
      if (options.send_immediately !== false && messageData.status === 'sent') {
        // Le folder 'inbox' est pour le destinataire, mais comme le message est envoyé
        // par l'expéditeur, il doit être dans 'sent' depuis sa perspective
        // On laisse le folder à 'inbox' car il sera filtré dynamiquement côté client
        // L'important est que le status ne soit plus 'draft'
        // Mettre à jour le message
        const { data: updatedMessage, error: updateError } = await supabase
          .from('messages')
          .update(messageData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

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
          message: updatedMessage,
          external_emails_sent: options.send_external_email ? options.external_recipients?.length || 0 : 0
        });
      }

      // Message programmé
      if (messageData.status === 'scheduled' && messageData.scheduled_at) {
        const { data, error } = await supabase
          .from('messages')
          .update(messageData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.json({ success: true, message: data, scheduled: true });
      }
    } else {
      // Format simple: mettre à jour directement avec les champs fournis
      const { data, error } = await supabase
        .from('messages')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return res.json({ success: true, message: data });
    }

    return res.status(400).json({ error: 'Données invalides' });
  } catch (error) {
    console.error('Error updating message:', error);
    return res.status(500).json({ error: error.message || 'Erreur lors de la mise à jour du message' });
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

