import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// Configuration
const app = express();
app.use(cors());
app.use(express.json());

// Configuration SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY && SENDGRID_API_KEY !== 'SG.test-key-not-configured') {
  sgMail.setApiKey(SENDGRID_API_KEY);
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
}

// Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Fonction principale pour Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId, companySettings, services, customEmailData } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ error: 'ID requis' });
    }

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, user_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    // Récupérer l'utilisateur
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(invoice.user_id);
    if (userError) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const userEmail = user.user?.email;

    // Récupérer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    // Utiliser les services envoyés par le frontend
    let invoiceServices = services || [];
    
    if (!invoiceServices || invoiceServices.length === 0) {
      // Fallback : récupérer tous les services du client
      const { data: allServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', invoice.client_id);

      if (servicesError) {
        return res.status(404).json({ error: 'Services non trouvés' });
      }
      
      invoiceServices = allServices || [];
    }

    if (!invoiceServices || invoiceServices.length === 0) {
      return res.status(400).json({ 
        error: 'Aucun service trouvé pour cette facture. Veuillez d\'abord ajouter des services.' 
      });
    }

    // Fusionner les données
    invoice.client = client;
    invoice.services = invoiceServices;

    // Données d'entreprise
    const companyData = {
      name: invoice.company_name !== null ? invoice.company_name : (companySettings?.companyName || 'ProFlow'),
      owner: invoice.company_owner !== null ? invoice.company_owner : (companySettings?.ownerName || 'Votre flux professionnel simplifié'),
      address: invoice.company_address !== null ? invoice.company_address : (companySettings?.address || ''),
      email: invoice.company_email !== null ? invoice.company_email : (companySettings?.email || ''),
      phone: invoice.company_phone !== null ? invoice.company_phone : (companySettings?.phone || ''),
      siret: invoice.company_siret !== null ? invoice.company_siret : (companySettings?.siret || ''),
      logoUrl: invoice.company_logo_url !== null ? invoice.company_logo_url : (companySettings?.logoUrl || null),
      invoiceTerms: invoice.invoice_terms || companySettings?.invoiceTerms || null,
      paymentTerms: invoice.payment_terms || companySettings?.paymentTerms || null,
      paymentDays: invoice.payment_terms || companySettings?.paymentDays || 30,
      paymentMethod: companySettings?.paymentMethod || null,
      additionalTerms: companySettings?.additionalTerms || null,
      showLegalRate: companySettings?.showLegalRate !== false,
      showFixedFee: companySettings?.showFixedFee !== false
    };

    // Pour Vercel, on génère un PDF simple (sans Puppeteer)
    // Vous pouvez utiliser une bibliothèque comme jsPDF ou générer un HTML simple
    const pdfContent = generateSimplePDF(invoice, companyData);

    // Données email
    const emailMessage = customEmailData?.message || `Bonjour ${invoice.client.name}, veuillez trouver ci-joint votre facture.`;
    const emailSubject = customEmailData?.subject || `Facture ${invoice.invoice_number}`;
    const fromEmail = userEmail || process.env.SENDGRID_FROM_EMAIL;
    const fromName = companyData.name || 'ProFlow';

    // Template HTML simple
    const htmlContent = generateEmailHTML(invoice, companyData, emailMessage);

    // Envoyer email
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
          content: pdfContent,
          filename: `facture-${invoice.invoice_number}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    try {
      await sgMail.send(msg);
      res.json({ success: true, message: 'Facture envoyée avec succès' });
    } catch (emailError) {
      // Essayer Gmail comme solution de secours
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
                filename: `facture-${invoice.invoice_number}.pdf`,
                content: pdfContent,
                contentType: 'application/pdf'
              }
            ]
          };
          
          await gmailTransporter.sendMail(gmailMsg);
          res.json({ success: true, message: 'Facture envoyée avec succès (Gmail)' });
        } catch (gmailError) {
          res.json({ 
            success: false, 
            message: 'Email non envoyé (SendGrid et Gmail ont échoué)', 
            error: `SendGrid: ${emailError.message}, Gmail: ${gmailError.message}`
          });
        }
      } else {
        res.json({ 
          success: false, 
          message: 'Email non envoyé (SendGrid échoué, Gmail non configuré)', 
          error: emailError.message 
        });
      }
    }

  } catch (err) {
    console.error('❌ Erreur:', err);
    res.status(500).json({ error: err.message });
  }
}

// Fonction pour générer un PDF simple (sans Puppeteer)
function generateSimplePDF(invoice, companyData) {
  // Pour Vercel, on génère un PDF basique
  // Vous pouvez utiliser jsPDF ou une autre bibliothèque compatible
  const pdfContent = `
    Facture ${invoice.invoice_number}
    
    Client: ${invoice.client.name}
    Email: ${invoice.client.email}
    
    Services:
    ${invoice.services.map(service => 
      `${service.description} - ${service.hours}h - ${service.hourly_rate}€/h`
    ).join('\n')}
    
    Total: ${invoice.subtotal}€
    
    ${companyData.name}
    ${companyData.address}
    ${companyData.email}
    ${companyData.phone}
  `;
  
  // Convertir en base64 pour l'attachement
  return Buffer.from(pdfContent).toString('base64');
}

// Fonction pour générer le HTML de l'email
function generateEmailHTML(invoice, companyData, message) {
  let servicesRows = '';
  let totalAmount = 0;
  
  if (invoice.services && invoice.services.length > 0) {
    invoice.services.forEach(service => {
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

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Facture ${invoice.invoice_number}</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
            .invoice-info { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #667eea; color: white; }
            .total { background: #2c3e50; color: white; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${companyData.name}</h1>
            <p>Votre partenaire professionnel</p>
        </div>
        <div class="content">
            <h2>Bonjour ${invoice.client.name},</h2>
            <div class="invoice-info">
                <h3>📄 Détails de la facture</h3>
                <p><strong>Numéro :</strong> ${invoice.invoice_number}</p>
                <p><strong>Date :</strong> ${invoice.date}</p>
                <p><strong>Échéance :</strong> ${invoice.due_date}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${message}
            </div>
            
            <h3>💰 Services facturés</h3>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Heures</th>
                        <th style="text-align: right;">Taux HT</th>
                        <th style="text-align: right;">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${servicesRows}
                </tbody>
                <tfoot>
                    <tr class="total">
                        <td colspan="3" style="text-align: right;">TOTAL :</td>
                        <td style="text-align: right;">${totalAmount.toFixed(2)} €</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="margin-top: 30px; padding: 15px; background: #f0f8ff; border-radius: 8px;">
                <p><strong>${companyData.name}</strong><br>
                ${companyData.address}<br>
                📧 ${companyData.email} | 📞 ${companyData.phone}</p>
            </div>
        </div>
    </body>
    </html>
  `;
}
