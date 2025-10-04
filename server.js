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
  gmailTransporter = nodemailer.createTransporter({
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

    // Récup facture
    console.log(`🔍 Récupération facture ID: ${invoiceId}`);
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('❌ Erreur récupération facture:', invoiceError);
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

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
    
    // Utiliser les données d'entreprise fournies par le frontend ou des paramètres par défaut
    const companyData = companySettings ? {
      name: companySettings.companyName || 'ProFlow',
      owner: companySettings.ownerName || 'Votre flux professionnel simplifié',
      address: companySettings.address || '',
      email: companySettings.email || '',
      phone: companySettings.phone || '',
      siret: companySettings.siret || '',
      logoUrl: companySettings.logoUrl || null,
      // Paramètres de conditions de paiement
      invoiceTerms: companySettings.invoiceTerms || null,
      paymentTerms: companySettings.paymentTerms || null,
      paymentDays: companySettings.paymentDays || 30,
      paymentMethod: companySettings.paymentMethod || null,
      additionalTerms: companySettings.additionalTerms || null
    } : {
      name: 'ProFlow',
      owner: 'Votre flux professionnel simplifié',
      address: '123 Rue ProFlow, 75001 Paris',
      email: 'contact@proflow.com',
      phone: '01 23 45 67 89',
      siret: '123 456 789 00010',
      logoUrl: null,
      // Paramètres par défaut pour les conditions de paiement
      invoiceTerms: null,
      paymentTerms: null,
      paymentDays: 30,
      paymentMethod: null,
      additionalTerms: null
    };
    
    console.log('🏢 Données d\'entreprise utilisées:', companyData);

    // Générer le PDF avec Puppeteer
    const pdfData = await generateInvoicePDFWithPuppeteer(invoice, companyData);
    
    console.log('📊 PDF généré:');
    console.log('   Taille:', (pdfData.buffer.length / 1024).toFixed(1) + ' KB');
    console.log('   Nom:', pdfData.fileName);
    console.log('   Chemin:', pdfData.filePath);

    // Envoyer email (version simplifiée pour déboguer)
    const msg = {
      to: invoice.client.email,
      from: process.env.SENDGRID_FROM_EMAIL, // Simplifié : pas d'objet avec name
      subject: `Facture ${invoice.invoice_number}`,
      text: `Bonjour ${invoice.client.name}, veuillez trouver ci-joint votre facture.`,
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
            from: process.env.GMAIL_USER,
            to: invoice.client.email,
            subject: `Facture ${invoice.invoice_number}`,
            text: `Bonjour ${invoice.client.name}, veuillez trouver ci-joint votre facture.`,
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