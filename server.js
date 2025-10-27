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

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

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
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

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
    const emailMessage = customEmailData?.message || `Bonjour ${invoice.client.name},\n\nNous vous remercions pour votre confiance et votre collaboration.\n\nVeuillez trouver ci-joint votre facture détaillée en format PDF pour vos archives. Nous restons à votre entière disposition pour toute question.\n\nCordialement.`;
    const emailSubject = customEmailData?.subject || `Facture ${invoice.invoice_number}`;
    
    console.log('📧 Message email utilisé:', emailMessage);
    console.log('📧 Sujet email utilisé:', emailSubject);
    
    // Utiliser l'email de l'utilisateur connecté comme expéditeur
    const fromEmail = userEmail || process.env.SENDGRID_FROM_EMAIL;
    const fromName = companyData.name || 'ProFlow';
    
    console.log('📧 Email expéditeur utilisé:', fromEmail);
    console.log('📧 Nom expéditeur utilisé:', fromName);
    
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
    const htmlTemplate = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #f0f2f5;
            padding: 0;
            min-height: 100vh;
            margin: 0;
            text-align: center;
            overflow-x: hidden;
            max-width: 100%;
        }
        
        .email-container {
            max-width: 100%;
            width: 100%;
            margin: 0 auto;
            background: white;
            overflow: hidden;
            border-radius: 15px;
            box-sizing: border-box;
        }
        
        * {
            box-sizing: border-box;
        }
        
        table {
            width: 100%;
            table-layout: auto;
            border-collapse: collapse;
        }
        
        td, th {
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        
        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            padding: 40px 40px 30px;
            color: white;
            border-radius: 15px 15px 0 0;
        }
        
        .company-info {
            display: table;
            width: 100%;
            margin-bottom: 30px;
        }
        
        .logo-section, .invoice-number {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        
        .logo-section h1 {
            font-size: 32px;
            margin-bottom: 5px;
            font-weight: 700;
        }
        
        .logo-section p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .invoice-number {
            text-align: right;
        }
        
        .invoice-number h2 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .invoice-number p {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .company-details {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        
        .company-details p {
            font-size: 14px;
            line-height: 1.6;
            margin: 3px 0;
        }
        
        .content {
            padding: 40px;
        }
        
        .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 40px;
            border-spacing: 30px;
        }
        
        .info-section {
            display: table-cell;
            width: 50%;
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            border-left: 4px solid #1e3c72;
        }
        
        .info-section h3 {
            color: #1e3c72;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .info-section p {
            color: #333;
            font-size: 15px;
            line-height: 1.7;
            margin: 5px 0;
        }
        
        .info-section strong {
            color: #000;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .invoice-table thead {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
        }
        
        .invoice-table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .invoice-table td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            color: #333;
            font-size: 15px;
        }
        
        .invoice-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .invoice-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .text-right {
            text-align: right;
        }
        
        .totals-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-radius: 10px;
            margin: 30px 0;
        }
        
        .total-row {
            display: table;
            width: 100%;
            padding: 12px 0;
            font-size: 16px;
            color: #333;
        }
        
        .total-row .label {
            display: table-cell;
            width: 70%;
            text-align: left;
        }
        
        .total-row .amount {
            display: table-cell;
            width: 30%;
            text-align: right;
        }
        
        .total-row.subtotal {
            border-bottom: 1px solid #dee2e6;
        }
        
        .total-row.final {
            border-top: 3px solid #1e3c72;
            margin-top: 15px;
            padding-top: 20px;
            font-size: 24px;
            font-weight: 700;
            color: #1e3c72;
        }
        
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        
        .download-button {
            display: inline-block;
            background: #10b981 !important;
            color: white !important;
            padding: 18px 50px;
            border-radius: 50px;
            text-decoration: none !important;
            font-weight: 700;
            font-size: 16px;
            border: none !important;
        }
        
        .download-button::before {
            content: '⬇ ';
            font-size: 18px;
            margin-right: 8px;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e9ecef;
            border-radius: 0 0 15px 15px;
        }
        
        .footer p {
            color: #6c757d;
            font-size: 13px;
            line-height: 1.7;
            margin: 5px 0;
        }
        
        .footer a {
            color: #1e3c72;
            text-decoration: none;
            font-weight: 600;
        }
        
        @media (max-width: 600px) {
            .info-section {
                display: block;
                width: 100% !important;
            }
            
            .logo-section, .invoice-number {
                display: block;
                width: 100% !important;
                text-align: left !important;
                margin-bottom: 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="company-info">
                <div class="logo-section">
                    <h1>{{company_name}}</h1>
                    <p>Votre partenaire de confiance</p>
                </div>
                <div class="invoice-number">
                    <h2>FACTURE</h2>
                    <p>N° {{invoice_number}}</p>
                    <p>Date: {{invoice_date}}</p>
                </div>
            </div>
            
            <div class="company-details">
                <p><strong>{{company_name}}</strong></p>
                <p>{{company_address}}</p>
                <p>SIRET: {{company_siret}}</p>
                <p>Tél: {{company_phone}}</p>
                <p style="color: white;">Email: <a href="mailto:{{company_email}}" style="color: white; text-decoration: underline;">{{company_email}}</a></p>
            </div>
        </div>
        
        <div class="content">
            <div class="info-grid">
                <div class="info-section">
                    <h3>Facturé à</h3>
                    <p><strong>{{client_name}}</strong></p>
                    <p>{{client_address}}</p>
                    <p>Email: {{client_email}}</p>
                    <p>Tél: {{client_phone}}</p>
                </div>
                
                <div class="info-section">
                    <h3>Détails de paiement</h3>
                    <p><strong>Date d'échéance:</strong> {{due_date}}</p>
                    <p><strong>Conditions:</strong> Net 30 jours</p>
                    <p><strong>Mode de paiement:</strong> Virement bancaire</p>
                    <p><strong>Référence:</strong> {{invoice_number}}</p>
                </div>
            </div>
            
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th class="text-right">Quantité</th>
                        <th class="text-right">Prix unitaire</th>
                        <th class="text-right">Montant</th>
                    </tr>
                </thead>
                <tbody>
                    {{services_rows}}
                </tbody>
            </table>
            
            <div class="totals-section">
                <div class="total-row subtotal">
                    <span class="label">Sous-total HT</span>
                    <span class="amount">{{total_amount}} €</span>
                </div>
                <div class="total-row final">
                    <span class="label">TOTAL À PAYER</span>
                    <span class="amount">{{total_amount}} €</span>
                </div>
            </div>
            
            <div class="button-container">
                <a href="{{download_url}}" class="download-button" style="display: inline-block; background: #10b981; color: white; padding: 18px 50px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 16px; border: none;">⬇ Télécharger la facture (PDF)</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>{{company_name}}</strong></p>
            <p>{{company_address}}</p>
            <p>Email: {{company_email}} | Tél: {{company_phone}}</p>
        </div>
    </div>
</body>
</html>`;

    // Calculer les montants
    let totalAmount = 0;
    let servicesRows = '';
    
    // Générer les lignes de services
    if (services && services.length > 0) {
      services.forEach(service => {
        const serviceTotal = (service.hours || 0) * (service.hourly_rate || 0);
        totalAmount += serviceTotal;
        
        const serviceDate = service.date ? formatDateFR(service.date) : '';
        
        servicesRows += `
          <tr>
            <td>${serviceDate}</td>
            <td>${service.description || 'Service'}</td>
            <td class="text-right">${service.hours || 0}</td>
            <td class="text-right">${(service.hourly_rate || 0).toFixed(2)} €</td>
            <td class="text-right">${serviceTotal.toFixed(2)} €</td>
          </tr>
        `;
      });
    }

    // Remplacer les variables du template
    const htmlContent = htmlTemplate
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
      .replace(/\{\{download_url\}\}/g, downloadUrl);

    // Envoyer email avec template HTML
    const msg = {
      to: invoice.client.email,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: emailSubject,
      text: emailMessage,
      html: htmlContent,
      attachments: [
        {
          content: Buffer.from(pdfData.buffer).toString('base64'),
          filename: pdfData.fileName,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    try {
      console.log('📤 Tentative d\'envoi SendGrid à:', invoice.client.email);
      console.log('📤 Expéditeur:', fromEmail);
      console.log('📤 Destinataire:', invoice.client.email);
      console.log('📤 Taille PDF:', pdfData.buffer.length, 'octets');
      
      await sgMail.send(msg);
      console.log('✅ Email envoyé avec succès (SendGrid) à:', invoice.client.email);
      
      // Toujours essayer Gmail en backup car SendGrid peut rejeter certains emails
      console.log('📤 Tentative backup Gmail pour:', invoice.client.email);
      if (gmailTransporter) {
        try {
          const gmailMsg = {
            from: {
              address: fromEmail,
              name: fromName
            },
            to: invoice.client.email,
            subject: emailSubject,
            text: emailMessage,
            html: htmlContent,
            attachments: [
              {
                filename: pdfData.fileName,
                content: pdfData.buffer,
                contentType: 'application/pdf'
              }
            ]
          };
          
          await gmailTransporter.sendMail(gmailMsg);
          console.log('✅ Email backup envoyé avec succès (Gmail) à:', invoice.client.email);
        } catch (gmailError) {
          console.error('⚠️ Erreur Gmail backup (non bloquant):', gmailError.message);
        }
      }
      
      res.json({ success: true, message: 'Facture envoyée avec succès' });
    } catch (emailError) {
      console.error('❌ Erreur SendGrid:', emailError.message);
      console.error('❌ Détails complets:', JSON.stringify(emailError.response?.body, null, 2));
      
      // Essayer Gmail comme solution de secours
      if (gmailTransporter) {
        try {
          console.log('🔄 Tentative d\'envoi avec Gmail...');
          
          const gmailMsg = {
            from: {
              address: fromEmail,
              name: fromName
            },
            to: invoice.client.email,
            subject: emailSubject,
            text: emailMessage,
            html: htmlContent,
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

  } catch (err) {
    console.error('❌ Erreur:', err);
    res.status(500).json({ error: err.message });
  }
});

// Test
app.get('/api/test', (req, res) => res.json({ ok: true }));

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
      address: invoice.company_address || companySettings?.address || '',
      email: invoice.company_email || companySettings?.email || '',
      phone: invoice.company_phone || companySettings?.phone || '',
      siret: invoice.company_siret || companySettings?.siret || '',
      logoUrl: invoice.company_logo_url || companySettings?.logoUrl || null,
    };

    // Récupérer les services
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('client_id', invoice.client_id);

    invoice.services = services || [];

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

app.listen(PORT, () => console.log(`🚀 Serveur sur port ${PORT}`));