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
    const emailMessage = customEmailData?.message || `Bonjour ${invoice.client.name}, veuillez trouver ci-joint votre facture.`;
    const emailSubject = customEmailData?.subject || `Facture ${invoice.invoice_number}`;
    
    console.log('📧 Message email utilisé:', emailMessage);
    console.log('📧 Sujet email utilisé:', emailSubject);
    
    // Utiliser l'email de l'utilisateur connecté comme expéditeur
    const fromEmail = userEmail || process.env.SENDGRID_FROM_EMAIL;
    const fromName = companyData.name || 'ProFlow';
    
    console.log('📧 Email expéditeur utilisé:', fromEmail);
    console.log('📧 Nom expéditeur utilisé:', fromName);
    
    // Template HTML intégré (pour éviter les problèmes d'import)
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture ProFlow</title>
        <style>
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #1a1a1a;
                max-width: 650px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .email-container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                position: relative;
            }
            .email-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4);
            }
            .header {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
                position: relative;
            }
            .header::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 15px solid transparent;
                border-right: 15px solid transparent;
                border-top: 15px solid #34495e;
            }
            .header h1 {
                margin: 0;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .header p {
                margin: 10px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
                font-weight: 300;
            }
            .content {
                padding: 40px 30px;
                background: #fafbfc;
            }
            .greeting {
                font-size: 24px;
                color: #2c3e50;
                margin-bottom: 25px;
                font-weight: 600;
            }
            .message {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin: 25px 0;
                font-size: 16px;
                line-height: 1.7;
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            }
            .invoice-info {
                background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
                padding: 25px;
                border-radius: 15px;
                margin: 25px 0;
                border: 2px solid #b3d9ff;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
            }
            .invoice-info h3 {
                color: #2c3e50;
                margin: 0 0 15px 0;
                font-size: 20px;
                font-weight: 600;
            }
            .footer {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .services-table {
                margin: 30px 0;
            }
            .services-table h3 {
                color: #2c3e50;
                font-size: 22px;
                font-weight: 600;
                margin-bottom: 20px;
                text-align: center;
            }
            .services-table table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                border: none;
            }
            .services-table th {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 18px 15px;
                text-align: left;
                font-weight: 600;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .services-table td {
                padding: 18px 15px;
                border-bottom: 1px solid #f1f3f4;
                font-size: 15px;
            }
            .services-table tr:nth-child(even) {
                background: #fafbfc;
            }
            .services-table tr:hover {
                background: #f0f8ff;
                transform: scale(1.01);
                transition: all 0.2s ease;
            }
            .services-table tfoot tr {
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%) !important;
                color: white !important;
            }
            .services-table tfoot td {
                font-size: 18px;
                font-weight: 700;
                padding: 20px 15px;
            }
            .company-info {
                color: #bdc3c7;
                font-size: 14px;
                margin: 15px 0;
                line-height: 1.5;
            }
            .company-info strong {
                color: white;
                font-size: 16px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>{{company_name}}</h1>
                <p>Votre partenaire professionnel</p>
            </div>
            <div class="content">
                <div class="greeting">Bonjour {{client_name}},</div>
                <div class="message">{{message}}</div>
                <div class="invoice-info">
                    <h3>📄 Détails de la facture</h3>
                    <p><strong>Numéro :</strong> {{invoice_number}}</p>
                    <p><strong>Date :</strong> {{invoice_date}}</p>
                    <p><strong>Échéance :</strong> {{due_date}}</p>
                </div>
                
                <div class="services-table">
                    <h3>💰 Services facturés</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Description</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Heures</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Taux HT</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total HT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {{services_rows}}
                        </tbody>
                        <tfoot style="background: #e8f4fd;">
                            <tr style="background: #667eea; color: white;">
                                <td colspan="3" style="padding: 15px; font-weight: bold; text-align: right; font-size: 18px;">TOTAL :</td>
                                <td style="padding: 15px; font-weight: bold; text-align: right; font-size: 18px;">{{total_amount}} €</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            <div class="footer">
                <p><strong>{{company_name}}</strong><br>
                {{company_address}}<br>
                📧 {{company_email}} | 📞 {{company_phone}}</p>
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
        
        servicesRows += `
          <tr>
            <td style="padding: 12px;">${service.description || 'Service'}</td>
            <td style="padding: 12px; text-align: center;">${service.hours || 0}h</td>
            <td style="padding: 12px; text-align: right;">${(service.hourly_rate || 0).toFixed(2)} €</td>
            <td style="padding: 12px; text-align: right; font-weight: bold;">${serviceTotal.toFixed(2)} €</td>
          </tr>
        `;
      });
    }

    // Remplacer les variables du template
    const htmlContent = htmlTemplate
      .replace(/\{\{company_name\}\}/g, companyData.name || 'ProFlow')
      .replace(/\{\{client_name\}\}/g, invoice.client.name)
      .replace(/\{\{message\}\}/g, emailMessage)
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{invoice_date\}\}/g, invoice.date)
      .replace(/\{\{due_date\}\}/g, invoice.due_date)
      .replace(/\{\{services_rows\}\}/g, servicesRows)
      .replace(/\{\{total_amount\}\}/g, totalAmount.toFixed(2))
      .replace(/\{\{company_address\}\}/g, companyData.address || '')
      .replace(/\{\{company_email\}\}/g, companyData.email || '')
      .replace(/\{\{company_phone\}\}/g, companyData.phone || '');

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
      await sgMail.send(msg);
      console.log('✅ Email envoyé avec succès (SendGrid) à:', invoice.client.email);
      res.json({ success: true, message: 'Facture envoyée avec succès' });
    } catch (emailError) {
      console.error('❌ Erreur SendGrid:', emailError.message);
      
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

app.listen(PORT, () => console.log(`🚀 Serveur sur port ${PORT}`));