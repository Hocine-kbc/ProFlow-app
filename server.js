import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { generateInvoicePDFWithPuppeteer } from './src/lib/puppeteerPdfGenerator.js';
import messagesRouter from './api/messages.js';
import juice from 'juice';

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Debug : Afficher les variables d'environnement détectées (sans les valeurs sensibles)
console.log('🔍 Variables d\'environnement détectées:');
console.log('   PORT:', process.env.PORT || '3001 (default)');
console.log('   VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? '✅ Définie' : '❌ Manquante');
console.log('   VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? '✅ Définie' : '❌ Manquante');
console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Définie' : '❌ Manquante');
console.log('   GMAIL_USER:', process.env.GMAIL_USER ? `✅ ${process.env.GMAIL_USER}` : '❌ Manquante');
console.log('   GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Définie' : '❌ Manquante');
console.log('   SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Définie' : '❌ Manquante');

// Configuration SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test-key-not-configured';
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.test-key-not-configured') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid configuré');
} else {
  console.log('⚠️ SENDGRID_API_KEY non configurée. SendGrid ne sera pas utilisé.');
}

// Configuration Gmail (solution de secours)
let gmailTransporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  console.log('✅ Gmail configuré comme solution de secours');
} else {
  console.log('⚠️ Gmail non configuré. Variables GMAIL_USER et GMAIL_APP_PASSWORD manquantes.');
}

// Middleware
app.use(cors());
app.use(express.json());

// Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('');
  console.error('❌❌❌ ERREUR CRITIQUE ❌❌❌');
  console.error('Les variables Supabase sont OBLIGATOIRES :');
  console.error('  - VITE_SUPABASE_URL (ou SUPABASE_URL)');
  console.error('  - SUPABASE_SERVICE_KEY (ou VITE_SUPABASE_ANON_KEY)');
  console.error('');
  console.error('📋 Sur Railway.app :');
  console.error('  1. Allez dans votre projet');
  console.error('  2. Cliquez sur votre service');
  console.error('  3. Onglet "Variables"');
  console.error('  4. Ajoutez VITE_SUPABASE_URL et SUPABASE_SERVICE_KEY');
  console.error('');
  console.error('⚠️ Le serveur va quand même démarrer en mode dégradé pour le debugging...');
  console.error('⚠️ Les fonctionnalités nécessitant Supabase ne fonctionneront pas.');
  console.error('');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase initialisé avec succès');
}

// Fonction : Génération de facture PDF moderne avec Puppeteer
// Cette fonction utilise maintenant Puppeteer au lieu de PDFKit pour un rendu HTML/CSS moderne

// Route pour envoyer une facture
app.post('/api/send-invoice', async (req, res) => {
  try {
    const { invoiceId, companySettings } = req.body;
    if (!invoiceId) return res.status(400).json({ error: 'ID requis' });

    // Récupérer l'utilisateur connecté via l'ID de la facture
    console.log(`🔍 Récupération facture ID: ${invoiceId}`);
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, user_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('❌ Erreur récupération facture:', invoiceError);
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Récupérer l'utilisateur connecté
    console.log(`🔍 Récupération utilisateur ID: ${invoice.user_id}`);
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(invoice.user_id);
    
    if (userError) {
      console.error('❌ Erreur récupération utilisateur:', userError);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const userEmail = user.user?.email;
    console.log('✅ Utilisateur récupéré:', { email: userEmail });

    console.log('✅ Facture récupérée:', {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_id: invoice.client_id,
      subtotal: invoice.subtotal,
      net_amount: invoice.net_amount
    });

    // Récup client
    console.log(`🔍 Récupération client ID: ${invoice.client_id}`);
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      console.error('❌ Erreur récupération client:', clientError);
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    console.log('✅ Client récupéré:', {
      id: client.id,
      name: client.name,
      email: client.email
    });

    // Récupérer les services spécifiques à cette facture depuis les données envoyées par le frontend
    const { services: invoiceServices, invoiceData } = req.body;
    
    console.log(`🔍 Données complètes reçues du frontend:`, req.body);
    console.log(`🔍 Services reçus du frontend pour la facture ${invoiceId}:`, invoiceServices ? invoiceServices.length : 0);
    console.log(`🔍 Détails des services reçus:`, invoiceServices);
    
    let services = [];
    
    // Utiliser les services envoyés par le frontend s'ils existent
    if (invoiceServices && invoiceServices.length > 0) {
      console.log('✅ Utilisation des services spécifiques à la facture envoyés par le frontend');
      services = invoiceServices;
    } else {
      console.log('⚠️ Aucun service spécifique reçu, récupération de tous les services du client');
      // Fallback : récupérer tous les services du client (ancien comportement)
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', invoice.client_id);

      if (servicesError) {
        console.error('❌ Erreur récupération services:', servicesError);
        return res.status(404).json({ error: 'Services non trouvés' });
      }
      
      services = allServices || [];
    }

    console.log(`✅ Services à utiliser: ${services.length} service(s)`, 
      services.map(s => ({ description: s.description, hours: s.hours, rate: s.hourly_rate }))
    );

    // Fusionner données
    invoice.client = client;
    
    // Vérifier si des services existent
    if (!services || services.length === 0) {
      console.warn('⚠️ Aucun service trouvé pour cette facture !');
      return res.status(400).json({ 
        error: 'Aucun service trouvé pour cette facture. Veuillez d\'abord ajouter des services.' 
      });
    }
    
    invoice.services = services;
    
    console.log('📋 Données finales de la facture:', {
      invoice_number: invoice.invoice_number,
      client_name: invoice.client.name,
      services_count: invoice.services.length,
      subtotal: invoice.subtotal,
      net_amount: invoice.net_amount
    });

    // Debug: Log des données d'entreprise reçues
    console.log('🏢 Données d\'entreprise reçues:', companySettings);
    
    // Utiliser les paramètres stockés dans la facture en priorité, sinon les paramètres globaux
    const companyData = {
      // Utiliser les données sauvegardées dans la facture en priorité, sinon les paramètres globaux
      name: invoice.company_name !== null ? invoice.company_name : (companySettings?.companyName || 'ProFlow'),
      owner: invoice.company_owner !== null ? invoice.company_owner : (companySettings?.ownerName || 'Votre flux professionnel simplifié'),
      address: invoice.company_address !== null ? invoice.company_address : (companySettings?.address || ''),
      email: invoice.company_email !== null ? invoice.company_email : (companySettings?.email || ''),
      phone: invoice.company_phone !== null ? invoice.company_phone : (companySettings?.phone || ''),
      siret: invoice.company_siret !== null ? invoice.company_siret : (companySettings?.siret || ''),
      logoUrl: invoice.company_logo_url !== null ? invoice.company_logo_url : (companySettings?.logoUrl || null),
      // Utiliser les paramètres spécifiques de la facture en priorité
      invoiceTerms: invoice.invoice_terms || companySettings?.invoiceTerms || null,
      paymentTerms: invoice.payment_terms || companySettings?.paymentTerms || null,
      paymentDays: invoice.payment_terms || companySettings?.paymentDays || 30,
      paymentMethod: companySettings?.paymentMethod || null,
      additionalTerms: companySettings?.additionalTerms || null,
      // Options de règlement personnalisables
      showLegalRate: companySettings?.showLegalRate !== false,
      showFixedFee: companySettings?.showFixedFee !== false
    };
    
    console.log('🏢 Données d\'entreprise utilisées:', companyData);

    // Générer le PDF avec Puppeteer
    const pdfData = await generateInvoicePDFWithPuppeteer(invoice, companyData);
    
    console.log('📊 PDF généré:');
    console.log('   Taille:', (pdfData.buffer.length / 1024).toFixed(1) + ' KB');
    console.log('   Nom:', pdfData.fileName);
    console.log('   Chemin:', pdfData.filePath);

    // Récupérer les données personnalisées du frontend
    const { customEmailData } = req.body;
    console.log('📧 Données email personnalisées reçues:', customEmailData);
    
    // Utiliser le message personnalisé ou le message par défaut
    const emailMessage = customEmailData?.message || `Bonjour ${invoice.client.name},\n\nVeuillez trouver ci-joint votre facture au format PDF.\n\nJe vous remercie de bien vouloir me confirmer la bonne réception de ce message et de la pièce jointe. Pour toute question ou précision, je reste à votre disposition.\n\nCordialement,\n${companyData.name}`;
    const emailSubject = customEmailData?.subject || `Facture ${invoice.invoice_number}`;
    
    console.log('📧 Message email utilisé:', emailMessage);
    console.log('📧 Sujet email utilisé:', emailSubject);
    
    // Utiliser une adresse fixe vérifiée comme expéditeur
    // L'email de l'utilisateur sera en Reply-To pour que les clients puissent répondre
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || userEmail;
    const fromName = companyData.name || 'ProFlow';
    const replyToEmail = userEmail; // Email de l'utilisateur pour les réponses
    
    console.log('📧 Email expéditeur utilisé:', fromEmail);
    console.log('📧 Nom expéditeur utilisé:', fromName);
    console.log('📧 Reply-To (réponses vers):', replyToEmail);
    
    // Fonction pour convertir date YYYY-MM-DD en DD-MM-YYYY
    const formatDateFR = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    // Construire l'URL de téléchargement
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const downloadUrl = `${baseUrl}/api/download-invoice/${invoiceId}`;
    
    // Template HTML intégré (pour éviter les problèmes d'import)
    const htmlTemplate = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Facture</title>
  <style type="text/css">
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: none; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; }
      .stack { display: block !important; width: 100% !important; }
      .center { text-align: center !important; }
      .px { padding-left: 16px !important; padding-right: 16px !important; }
      .btn-full { display: block !important; width: 100% !important; }
      .hide-mobile { display: none !important; }
      .mt-12 { margin-top: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="800" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width: 800px; border-radius: 14px; overflow: hidden;" class="container">
          <tr>
            <td bgcolor="#1e3c72" style="padding: 18px 30px;">
              <!-- Header band on white card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="background:#ffffff; border-radius:12px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Logo + company name -->
                        <td valign="middle">
                          <table border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              {{LOGO_HTML}}
                              <td valign="middle">
                                <div style="font-family: Arial, sans-serif; font-size:20px; font-weight:700; color:#1e3c72;">{{company_name}}</div>
                                <div style="font-family: Arial, sans-serif; font-size:12px; color:#6b7280; padding-top:2px;">Votre partenaire de confiance</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Invoice info on the right -->
                        <td align="right" valign="middle">
                          <table border="0" cellspacing="0" cellpadding="0" align="right">
                            <tr>
                              <td align="right" style="font-family: Arial, sans-serif; font-size:13px; color:#374151; padding-bottom:2px;">FACTURE</td>
                            </tr>
                            <tr>
                              <td align="right" style="font-family: Arial, sans-serif; font-size:12px; color:#6b7280;">N° {{invoice_number}}</td>
                            </tr>
                            <tr>
                              <td align="right" style="font-family: Arial, sans-serif; font-size:12px; color:#6b7280;">Date: {{invoice_date}}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#2a5298" style="padding: 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; line-height: 20px;">
                    <strong>{{company_name}}</strong><br/>
                    {{company_address}}<br/>
                    SIRET: {{company_siret}}<br/>
                    Tél: {{company_phone}} | Email: <a href="mailto:{{company_email}}" style="color:#ffffff; text-decoration:none;">{{company_email}}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" valign="top" bgcolor="#ffffff" style="padding: 0; border-radius: 10px;" class="stack mt-12">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="10%" fillcolor="#f8f9fa" strokecolor="#f8f9fa" style="width:360px;">
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8f9fa; border-radius:10px; overflow:hidden; border-top-right-radius:10px; border-bottom-right-radius:10px;">
                      <tr>
                        <td bgcolor="#1e3c72" style="height:4px; line-height:4px; font-size:0; border-top-left-radius:10px; border-top-right-radius:10px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8f9fa;">
                            <tr>
                              <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; padding-bottom: 10px; text-transform: uppercase;">FACTURÉ À</td>
                            </tr>
                            <tr>
                              <td style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                                <strong>{{client_name}}</strong><br/>
                                {{client_address}}<br/>
                                Email: {{client_email}}<br/>
                                Tél: {{client_phone}}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!--[if mso]>
                      </v:textbox>
                    </v:roundrect>
                    <![endif]-->
                  </td>
                  <td width="4%" class="hide-mobile"></td>
                  <td width="48%" valign="top" bgcolor="#ffffff" style="padding: 0; border-radius: 10px;" class="stack mt-12">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" arcsize="10%" fillcolor="#f8f9fa" strokecolor="#f8f9fa" style="width:360px;">
                      <v:textbox inset="0,0,0,0">
                    <![endif]-->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8f9fa; border-radius:10px; overflow:hidden; border-top-right-radius:10px; border-bottom-right-radius:10px;">
                      <tr>
                        <td bgcolor="#1e3c72" style="height:4px; line-height:4px; font-size:0; border-top-left-radius:10px; border-top-right-radius:10px;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 20px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#f8f9fa;">
                            <tr>
                              <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; padding-bottom: 10px; text-transform: uppercase;">DÉTAILS DE PAIEMENT</td>
                            </tr>
                            <tr>
                              <td style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                                <strong>Date d'échéance:</strong><br/>
                                {{due_date}}<br/>
                                <strong>Conditions:</strong> Net 30 jours<br/>
                                <strong>Mode de paiement:</strong><br/>
                                Virement bancaire<br/>
                                <strong>Référence:</strong> {{invoice_number}}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <!--[if mso]>
                      </v:textbox>
                    </v:roundrect>
                    <![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Zone de texte avant le tableau des prestations -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="background:#ffffff; border-radius: 10px;">
                <tr>
                  <td style="padding:16px 18px; color:#333333; font-family: Arial, sans-serif; font-size:16px; font-weight:bold; font-style:italic; line-height:24px;">
                    <div style="white-space:pre-line;">{{intro_message}}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
                <tr bgcolor="#1e3c72">
                  <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Date</td>
                  <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Description</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Qté</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">P.U.</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Montant</td>
                </tr>
                {{services_rows}}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8f9fa" style="padding: 20px; border-radius: 10px;">
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0; padding-left: 10px; border-bottom: 1px solid #dee2e6;">Sous-total HT</td>
                  <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 10px 10px 0; border-bottom: 1px solid #dee2e6;">{{total_amount}} €</td>
                </tr>
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0; padding-left: 10px;">TVA (0%)
                    <div style="font-weight: normal; font-size: 12px; color: #6b7280; padding-top: 2px;">TVA non applicable, art. 293 B du CGI</div>
                  </td>
                  <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 10px 10px 0;">0,00 €</td>
                </tr>
                <tr>
                  <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; padding: 15px 0 0 10px; border-top: 3px solid #1e3c72;">TOTAL À PAYER</td>
                  <td align="right" style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; padding: 15px 10px 0 0; border-top: 3px solid #1e3c72;">{{total_amount}} €</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Extra spacer after totals -->
          <tr>
            <td style="padding: 0 30px 6px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                <tr>
                  <td style="height: 14px; line-height: 14px; font-size: 0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 30px 30px 30px;">
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" style="width:100%; max-width:680px;">
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; font-size:18px; font-weight:bold; font-style:italic; color:#0f172a; background:#eef6ff; border:1px solid #bfdbfe; padding:16px 18px; border-radius:12px;">
                    Votre facture (PDF) est jointe à cet email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8f9fa" style="padding: 25px 30px; border-top: 1px solid #e0e0e0; border-bottom-left-radius: 14px; border-bottom-right-radius: 14px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="color: #666666; font-family: Arial, sans-serif; font-size: 12px; line-height: 20px;">
                    <strong>{{company_name}}</strong><br/>
                    {{company_address}}<br/>
                    Tél: {{company_phone}} | Email: {{company_email}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Calculer les montants
    let totalAmount = 0;
    let servicesRows = '';
    
    // Générer les lignes de services (Date, Description, Qté, P.U., Montant)
    if (services && services.length > 0) {
      let rowIndex = 0;
      services.forEach(service => {
        const qty = service.hours != null ? `${service.hours}h` : (service.quantity != null ? String(service.quantity) : '1');
        const unit = (service.hourly_rate != null ? service.hourly_rate : (service.unit_price != null ? service.unit_price : 0));
        const lineTotal = (service.hours != null ? service.hours * unit : (service.quantity != null ? service.quantity * unit : unit)) || 0;
        totalAmount += lineTotal;
        const serviceDate = service.date ? formatDateFR(service.date) : '';
        const rowBg = (rowIndex % 2 === 0) ? '#f7f7f7' : '#ffffff';

        servicesRows += `
          <tr>
            <td style=\"background:${rowBg}; color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;\">${serviceDate}</td>
            <td style=\"background:${rowBg}; color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;\">${service.description || 'Prestation'}</td>
            <td align=\"right\" style=\"background:${rowBg}; color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;\">${qty}</td>
            <td align=\"right\" style=\"background:${rowBg}; color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;\">${Number(unit).toFixed(2)} €</td>
            <td align=\"right\" style=\"background:${rowBg}; color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;\">${Number(lineTotal).toFixed(2)} €</td>
          </tr>
        `;
        rowIndex++;
      });
    } else {
      servicesRows = `
        <tr>
          <td colspan=\"5\" style=\"padding:14px; color:#666; font-family: Arial, sans-serif; font-size: 14px;\">Aucune prestation.</td>
        </tr>
      `;
    }

    // Générer le HTML du logo seulement si l'URL existe
    const logoHtml = companyData.logoUrl && companyData.logoUrl.trim() !== '' 
      ? `<td align="center" valign="middle" style="padding-right:12px;">
           <img src="${companyData.logoUrl}" alt="Logo" width="48" height="48" style="display:block; width:48px; height:48px; border-radius:48px; object-fit:cover;" />
         </td>`
      : '';
    
    console.log('🖼️ Logo URL:', companyData.logoUrl);
    console.log('🖼️ Logo HTML généré:', logoHtml ? 'OUI' : 'NON (pas de logo)');

    // Remplacer les variables du template
    const htmlContent = htmlTemplate
      .replace(/\{\{LOGO_HTML\}\}/g, logoHtml)
      .replace(/\{\{company_name\}\}/g, companyData.name || 'ProFlow')
      .replace(/\{\{client_name\}\}/g, invoice.client.name)
      .replace(/\{\{client_email\}\}/g, invoice.client.email || '')
      .replace(/\{\{client_address\}\}/g, invoice.client.address || '')
      .replace(/\{\{client_phone\}\}/g, invoice.client.phone || '')
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{invoice_date\}\}/g, formatDateFR(invoice.date))
      .replace(/\{\{due_date\}\}/g, formatDateFR(invoice.due_date))
      .replace(/\{\{services_rows\}\}/g, servicesRows)
      .replace(/\{\{total_amount\}\}/g, totalAmount.toFixed(2))
      .replace(/\{\{company_address\}\}/g, companyData.address || '')
      .replace(/\{\{company_email\}\}/g, companyData.email || '')
      .replace(/\{\{company_phone\}\}/g, companyData.phone || '')
      .replace(/\{\{company_siret\}\}/g, companyData.siret || '')
      .replace(/\{\{download_url\}\}/g, downloadUrl)
      .replace(/\{\{intro_message\}\}/g, emailMessage || '');

    const inlinedHtml = juice(htmlContent, { removeStyleTags: false, preserveImportant: true, applyStyleTags: true });

    // Envoyer email avec template HTML
    const msg = {
      to: invoice.client.email,
      from: {
        email: fromEmail,
        name: fromName
      },
      replyTo: {
        email: replyToEmail,
        name: fromName
      },
      subject: emailSubject,
      text: emailMessage,
      html: inlinedHtml,
      attachments: [
        {
          content: Buffer.from(pdfData.buffer).toString('base64'),
          filename: pdfData.fileName,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    // Utiliser SendGrid en priorité - Gmail timeout depuis Railway
    // Gmail ne fonctionne pas de manière fiable depuis les serveurs cloud
    const useGmailFirst = false;
    
    if (useGmailFirst && gmailTransporter) {
      // PRIORITÉ 1 : Gmail
      try {
        console.log('📤 Tentative d\'envoi Gmail à:', invoice.client.email);
        console.log('📤 Expéditeur:', replyToEmail); // Avec Gmail, on envoie depuis l'email de l'utilisateur
        console.log('📤 Destinataire:', invoice.client.email);
        console.log('📤 Taille PDF:', pdfData.buffer.length, 'octets');
        
        const gmailMsg = {
          from: {
            address: replyToEmail, // Envoyer depuis l'email de l'utilisateur
            name: fromName
          },
          to: invoice.client.email,
          subject: emailSubject,
          text: emailMessage,
          html: inlinedHtml,
          attachments: [
            {
              filename: pdfData.fileName,
              content: pdfData.buffer,
              contentType: 'application/pdf'
            }
          ]
        };
        
        await gmailTransporter.sendMail(gmailMsg);
        console.log('✅ Email envoyé avec succès (Gmail) à:', invoice.client.email);
        res.json({ success: true, message: 'Facture envoyée avec succès (Gmail)' });
      } catch (gmailError) {
        console.error('❌ Erreur Gmail:', gmailError.message);
        
        // FALLBACK : Essayer SendGrid
        if (process.env.SENDGRID_API_KEY) {
          try {
            console.log('🔄 Tentative d\'envoi avec SendGrid (fallback)...');
            await sgMail.send(msg);
            console.log('✅ Email envoyé avec succès (SendGrid fallback) à:', invoice.client.email);
            res.json({ success: true, message: 'Facture envoyée avec succès (SendGrid)' });
          } catch (sendgridError) {
            console.error('❌ Erreur SendGrid:', sendgridError.message);
            res.json({ 
              success: false, 
              message: 'PDF généré mais email non envoyé (Gmail et SendGrid ont échoué)', 
              pdfPath: pdfData.filePath,
              error: `Gmail: ${gmailError.message}, SendGrid: ${sendgridError.message}`
            });
          }
        } else {
          res.json({ 
            success: false, 
            message: 'PDF généré mais email non envoyé (Gmail échoué, SendGrid non configuré)', 
            pdfPath: pdfData.filePath,
            error: gmailError.message 
          });
        }
      }
    } else {
      // PRIORITÉ 1 : SendGrid (si Gmail n'est pas configuré)
      try {
        console.log('📤 Tentative d\'envoi SendGrid à:', invoice.client.email);
        console.log('📤 Expéditeur:', fromEmail);
        console.log('📤 Destinataire:', invoice.client.email);
        console.log('📤 Taille PDF:', pdfData.buffer.length, 'octets');
        
        await sgMail.send(msg);
        console.log('✅ Email envoyé avec succès (SendGrid) à:', invoice.client.email);
        res.json({ success: true, message: 'Facture envoyée avec succès (SendGrid)' });
      } catch (emailError) {
        console.error('❌ Erreur SendGrid:', emailError.message);
        console.error('❌ Détails complets:', JSON.stringify(emailError.response?.body, null, 2));
        
        // FALLBACK : Essayer Gmail
        if (gmailTransporter) {
          try {
            console.log('🔄 Tentative d\'envoi avec Gmail (fallback)...');
            
            const gmailMsg = {
              from: {
                address: replyToEmail,
                name: fromName
              },
              to: invoice.client.email,
              subject: emailSubject,
              text: emailMessage,
              html: inlinedHtml,
              attachments: [
                {
                  filename: pdfData.fileName,
                  content: pdfData.buffer,
                  contentType: 'application/pdf'
                }
              ]
            };
            
            await gmailTransporter.sendMail(gmailMsg);
            console.log('✅ Email envoyé avec succès (Gmail fallback) à:', invoice.client.email);
            res.json({ success: true, message: 'Facture envoyée avec succès (Gmail)' });
          } catch (gmailError) {
            console.error('❌ Erreur Gmail:', gmailError.message);
            res.json({ 
              success: false, 
              message: 'PDF généré mais email non envoyé (SendGrid et Gmail ont échoué)', 
              pdfPath: pdfData.filePath,
              error: `SendGrid: ${emailError.message}, Gmail: ${gmailError.message}`
            });
          }
        } else {
          // Logs détaillés pour déboguer SendGrid
          if (emailError.response && emailError.response.body && emailError.response.body.errors) {
            console.log('🚨 Détails de l\'erreur SendGrid:');
            emailError.response.body.errors.forEach((err, index) => {
              console.log(`   Erreur ${index + 1}: ${err.message}`);
              if (err.field) console.log(`   Champ: ${err.field}`);
              if (err.help) console.log(`   Aide: ${err.help}`);
            });
          }
          
          res.json({ 
            success: false, 
            message: 'PDF généré mais email non envoyé (SendGrid échoué, Gmail non configuré)', 
            pdfPath: pdfData.filePath,
            error: emailError.message 
          });
        }
      }
    }

  } catch (err) {
    console.error('❌ Erreur:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test
app.get('/api/test', (req, res) => res.json({ ok: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    env: {
      supabaseConfigured: !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      gmailConfigured: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
      sendgridConfigured: !!process.env.SENDGRID_API_KEY
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ProFlow API is running',
    endpoints: {
      health: '/health',
      test: '/api/test',
      testConnection: '/api/test-connection'
    }
  });
});

// Test de connexion pour le frontend
app.get('/api/test-connection', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Backend connecté et prêt',
    timestamp: new Date().toISOString()
  });
});

// Route pour télécharger une facture PDF
app.get('/api/download-invoice/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const summaryDescriptionOverride = typeof req.query.summaryDescription === 'string' && req.query.summaryDescription.trim() !== ''
      ? req.query.summaryDescription.trim()
      : null;
    
    console.log(`📥 Demande de téléchargement PDF pour facture ${invoiceId}`);
    
    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('❌ Facture non trouvée:', invoiceError);
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    if (summaryDescriptionOverride) {
      invoice.summary_description = summaryDescriptionOverride;
    }

    // Récupérer les paramètres de l'entreprise
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    // Récupérer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    invoice.client = client;

    // Préparer les données de l'entreprise
    const companyData = {
      name: invoice.company_name || companySettings?.companyName || 'ProFlow',
      owner: invoice.company_owner || companySettings?.ownerName || '',
      address: invoice.company_address || companySettings?.address || '',
      email: invoice.company_email || companySettings?.email || '',
      phone: invoice.company_phone || companySettings?.phone || '',
      siret: invoice.company_siret || companySettings?.siret || '',
      logoUrl: invoice.company_logo_url || companySettings?.logoUrl || null,
      invoiceTerms: invoice.invoice_terms || companySettings?.invoiceTerms || '',
      paymentTerms: invoice.payment_terms || companySettings?.paymentTerms || 30,
      showLegalRate: invoice.show_legal_rate ?? companySettings?.showLegalRate ?? true,
      showFixedFee: invoice.show_fixed_fee ?? companySettings?.showFixedFee ?? true,
    };

    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('client_id', invoice.client_id);

    let invoiceServices = Array.isArray(invoice.services) ? invoice.services : [];

    if (!invoiceServices || invoiceServices.length === 0) {
      let filteredServices = services || [];

      if (filteredServices.length > 0) {
        const servicesForInvoiceId = filteredServices.filter((service) => service.invoice_id === invoice.id);
        if (servicesForInvoiceId.length > 0) {
          filteredServices = servicesForInvoiceId;
        } else {
          filteredServices = filteredServices.filter((service) => service.status === 'invoiced');
        }
      }

      invoiceServices = filteredServices;
    }

    if (invoice.invoice_type === 'summary') {
      const availableServices = invoiceServices && invoiceServices.length > 0 ? invoiceServices : (services || []);
      const summaryEntries = availableServices.filter((service) => service && service.summary_group);
      const hasSummaryGroup = summaryEntries.length > 0;
      const trimmedSummaryOverride = (summaryDescriptionOverride || invoice.summary_description || '').trim();

      const groupServicesForSummary = (sourceServices) => {
        const normalizeDescription = (description) => {
          const trimmed = (description || '').trim();
          return trimmed.length > 0 ? trimmed : 'Prestations regroupées';
        };

        const map = new Map();

        sourceServices.forEach((service) => {
          const description = normalizeDescription(service?.description);
          const hours = Number(service?.hours) || 0;
          const hourlyRate = Number(service?.hourly_rate) || 0;
          const amount = hours * hourlyRate;
          const pricingType = service?.pricing_type || 'hourly';
          const key = `${description.toLowerCase()}|${hourlyRate.toFixed(4)}|${pricingType}`;

          if (!map.has(key)) {
            map.set(key, {
              description,
              hours: 0,
              hourlyRate,
              amount: 0,
              count: 0,
              pricingType,
            });
          }

          const group = map.get(key);
          group.hours += hours;
          group.amount += amount;
          group.count += 1;
        });

        return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description, 'fr', { sensitivity: 'base' }));
      };

      if (hasSummaryGroup) {
        const useSummaryOverride = Boolean(trimmedSummaryOverride) && summaryEntries.length === 1;
        invoiceServices = availableServices.map((service) => {
          if (service && service.summary_group) {
            const hours = Number(service.hours) || 0;
            const rate = Number(service.hourly_rate) || 0;
            const amount = service.total ?? hours * rate;
            return {
              ...service,
              description: useSummaryOverride
                ? trimmedSummaryOverride
                : (service.description && service.description.trim().length > 0)
                    ? service.description.trim()
                    : `Prestations regroupées (${service.summary_source_count ?? summaryEntries.length})`,
              summary_source_count: service.summary_source_count ?? summaryEntries.length,
              total: amount,
            };
          }
          return service;
        });
      } else if (availableServices.length > 0) {
        const grouped = groupServicesForSummary(availableServices);
        const useSummaryOverride = Boolean(trimmedSummaryOverride) && grouped.length === 1;
        invoiceServices = grouped.map((group, index) => ({
          id: `summary-${invoice.id}-${index}`,
          client_id: invoice.client_id,
          date: invoice.date,
          hours: group.hours,
          hourly_rate: group.hourlyRate,
          description: useSummaryOverride ? trimmedSummaryOverride : group.description,
          status: 'invoiced',
          summary_group: true,
          summary_source_count: group.count,
          total: group.amount,
          pricing_type: group.pricingType,
        }));
      }
    }

    invoice.summary_description = (summaryDescriptionOverride || invoice.summary_description || '').trim() || null;
    invoice.services = invoiceServices || [];

    // Générer le PDF
    const pdfData = await generateInvoicePDFWithPuppeteer(invoice, companyData);

    // Définir les en-têtes avant d'envoyer
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfData.fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Envoyer le PDF
    res.end(Buffer.from(pdfData.buffer));

    console.log(`✅ PDF envoyé pour facture ${invoiceId}`);

  } catch (error) {
    console.error('❌ Erreur téléchargement PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Routes de messagerie
app.use('/api/messages', messagesRouter);

// Fonction pour traiter les messages programmés
async function checkAndProcessScheduledMessages() {
  try {
    // Vérifier que Supabase est configuré
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('⚠️ Supabase non configuré. Variables d\'environnement manquantes.');
      return;
    }
    
    const now = new Date().toISOString();
    
    // Récupérer tous les messages programmés dont la date est passée
    const { data: scheduledMessages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('status', 'scheduled')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now);
    
    if (error) {
      // Détecter les erreurs de connexion réseau (fetch failed, timeout, etc.)
      const isNetworkError = 
        (error.message && (error.message.includes('fetch failed') || error.message.includes('Timeout'))) ||
        (error.details && typeof error.details === 'string' && error.details.includes('fetch failed')) ||
        error.name === 'TypeError';
      
      if (isNetworkError) {
        // Logger seulement une fois toutes les 10 minutes pour éviter le spam
        const lastErrorLog = checkAndProcessScheduledMessages.lastErrorLog || 0;
        const currentTime = Date.now();
        if (currentTime - lastErrorLog > 600000) { // 10 minutes
          console.error('⚠️ Erreur de connexion Supabase (réseau/timeout). Vérifiez votre connexion internet et les variables d\'environnement.');
          checkAndProcessScheduledMessages.lastErrorLog = currentTime;
        }
      } else {
        console.error('❌ Erreur récupération messages programmés:', error);
      }
      return;
    }
    
    if (!scheduledMessages || scheduledMessages.length === 0) {
      return;
    }
    
    console.log(`📬 ${scheduledMessages.length} message(s) programmé(s) à envoyer`);
    
    // Importer dynamiquement le router messages pour accéder aux fonctions
    const messagesModule = await import('./api/messages.js');
    const sendExternalEmail = messagesModule.sendExternalEmail;
    
    // Traiter chaque message
    for (const message of scheduledMessages) {
      try {
        // Récupérer le destinataire
        let recipientEmail = message.recipient_email;
        let recipientId = message.recipient_id;
        
        // Si pas de recipient_id, essayer de trouver l'utilisateur par email
        if (!recipientId && recipientEmail) {
          try {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            if (users) {
              const recipient = users.find(u => u.email && u.email.toLowerCase() === recipientEmail.toLowerCase());
              if (recipient) {
                recipientId = recipient.id;
              }
            }
          } catch (userError) {
            console.error('Erreur recherche utilisateur:', userError);
          }
        }
        
        // Détecter les emails externes
        const allRecipients = [
          recipientEmail,
          ...(message.cc ? message.cc.split(',').map(e => e.trim()) : []),
          ...(message.bcc ? message.bcc.split(',').map(e => e.trim()) : [])
        ].filter(Boolean);
        
        // Vérifier quels emails sont externes
        const { data: existingUsers } = await supabase
          .from('users')
          .select('email')
          .in('email', allRecipients);
        
        const existingEmails = new Set((existingUsers || []).map(u => u.email));
        const externalEmails = allRecipients.filter(email => !existingEmails.has(email));
        
        // Envoyer les emails externes si nécessaire
        if (externalEmails.length > 0 && sendExternalEmail) {
          console.log(`📧 Envoi d'emails externes pour le message ${message.id}:`, externalEmails);
          
          for (const externalEmail of externalEmails) {
            try {
              await sendExternalEmail(
                externalEmail,
                message.subject,
                message.content,
                message.attachments || []
              );
              console.log(`✅ Email externe envoyé à ${externalEmail}`);
            } catch (extError) {
              console.error(`❌ Erreur envoi email externe à ${externalEmail}:`, extError);
            }
          }
        }
        
        // Créer le message pour le destinataire interne (si existe)
        if (recipientId) {
          const recipientMessage = {
            sender_id: message.sender_id,
            recipient_email: recipientEmail,
            recipient_id: recipientId,
            subject: message.subject,
            content: message.content,
            attachments: message.attachments || [],
            status: 'sent',
            folder: 'inbox',
            priority: message.priority || 'normal',
            reply_to_id: message.reply_to_id || null,
            read: false
          };
          
          // Ajouter cc et bcc seulement s'ils existent dans le message
          // (ces colonnes peuvent ne pas exister dans la table)
          if (message.cc !== undefined && message.cc !== null) {
            recipientMessage.cc = message.cc;
          }
          if (message.bcc !== undefined && message.bcc !== null) {
            recipientMessage.bcc = message.bcc;
          }
          
          const { error: sendError } = await supabase
            .from('messages')
            .insert(recipientMessage);
          
          if (sendError) {
            console.error(`❌ Erreur création message destinataire:`, sendError);
            continue;
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
        } else {
          console.log(`✅ Message programmé ${message.id} envoyé avec succès`);
        }
      } catch (msgError) {
        console.error(`❌ Erreur traitement message ${message.id}:`, msgError);
      }
    }
  } catch (error) {
    // Détecter les erreurs de connexion réseau
    const isNetworkError = 
      (error.message && (error.message.includes('fetch failed') || error.message.includes('Timeout'))) ||
      (error.details && typeof error.details === 'string' && error.details.includes('fetch failed')) ||
      error.name === 'TypeError';
    
    if (isNetworkError) {
      // Logger seulement une fois toutes les 10 minutes pour éviter le spam
      const lastErrorLog = checkAndProcessScheduledMessages.lastErrorLog || 0;
      const currentTime = Date.now();
      if (currentTime - lastErrorLog > 600000) { // 10 minutes
        console.error('⚠️ Erreur de connexion Supabase (réseau/timeout). Vérifiez votre connexion internet et les variables d\'environnement.');
        checkAndProcessScheduledMessages.lastErrorLog = currentTime;
      }
    } else {
      console.error('❌ Erreur lors du traitement des messages programmés:', error);
    }
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  
  // Vérifier les messages programmés toutes les minutes
  setInterval(checkAndProcessScheduledMessages, 60000); // 60000ms = 1 minute
  console.log('⏰ Vérification des messages programmés activée (toutes les minutes)');
  
  // Vérifier immédiatement au démarrage
  setTimeout(checkAndProcessScheduledMessages, 5000); // Attendre 5 secondes après le démarrage
});