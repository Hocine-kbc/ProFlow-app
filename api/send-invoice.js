import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { generatePDFWithPuppeteer } from './pdf-generator-vercel.js';
import { generateSharedInvoiceHTML } from './invoice-template.js';
import { generatePDFWithJsPDF } from './pdf-generator-fallback.js';

// Fonction principale pour Vercel
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Début de l\'envoi de facture...');
    console.log('📦 Variables d\'environnement présentes:', {
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
      SENDGRID_FROM_EMAIL: !!process.env.SENDGRID_FROM_EMAIL,
    });

    // Vérifier les variables d'environnement critiques
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ Variables Supabase manquantes');
      return res.status(500).json({ 
        success: false,
        error: 'Configuration serveur manquante (Supabase)',
        message: 'Les variables d\'environnement Supabase ne sont pas configurées sur Vercel'
      });
    }

    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.warn('⚠️ SendGrid non configuré');
      return res.status(500).json({ 
        success: false,
        error: 'Configuration email manquante',
        message: 'Veuillez configurer SENDGRID_API_KEY et SENDGRID_FROM_EMAIL dans les variables d\'environnement Vercel'
      });
    }

    // Initialiser SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid initialisé');

    // Initialiser Supabase
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase initialisé');

    const { invoiceId, companySettings, services, customEmailData } = req.body;
    console.log('📨 Données reçues:', { invoiceId, hasServices: !!services });
    
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

    // Générer le PDF (essai avec Puppeteer, fallback sur jsPDF si échec)
    console.log('📄 Génération du PDF...');
    let pdfBuffer;
    let pdfMethod = 'puppeteer';
    
    try {
      // TENTATIVE 1 : Puppeteer (MÊME RENDU qu'en local !)
      console.log('🎯 Tentative avec Puppeteer...');
      
      // Générer le HTML avec le template exact utilisé en local
      const htmlContent = generateSharedInvoiceHTML(
        invoice,
        invoice.client,
        invoice.services,
        companyData
      );
      
      // Générer le PDF avec Puppeteer
      pdfBuffer = await generatePDFWithPuppeteer(htmlContent);
      console.log('✅ PDF généré avec Puppeteer (taille:', pdfBuffer.length, 'octets)');
      
    } catch (puppeteerError) {
      console.warn('⚠️ Puppeteer a échoué:', puppeteerError.message);
      console.log('🔄 Utilisation de la solution de secours (jsPDF)...');
      
      // TENTATIVE 2 : jsPDF (solution de secours)
      try {
        pdfBuffer = generatePDFWithJsPDF(
          invoice,
          invoice.client,
          invoice.services,
          companyData
        );
        pdfMethod = 'jspdf';
        console.log('✅ PDF généré avec jsPDF (fallback) (taille:', pdfBuffer.length, 'octets)');
      } catch (jsPdfError) {
        console.error('❌ jsPDF a également échoué:', jsPdfError);
        return res.status(500).json({ 
          success: false,
          error: 'Erreur lors de la génération du PDF',
          message: 'Impossible de générer le PDF avec Puppeteer et jsPDF',
          details: {
            puppeteer: puppeteerError.message,
            jspdf: jsPdfError.message
          }
        });
      }
    }

    // Données email
  const emailMessage = customEmailData?.message || `Bonjour ${invoice.client.name},\n\nVeuillez trouver ci-joint votre facture au format PDF.\n\nJe vous remercie de bien vouloir me confirmer la bonne réception de ce message et de la pièce jointe. Pour toute question ou précision, je reste à votre disposition.\n\nCordialement,\n${companyData.name || 'ProFlow'}`;
    const emailSubject = customEmailData?.subject || `Facture N° ${invoice.invoice_number} - ${new Date().toLocaleDateString('fr-FR')}`;
    
    // 🔑 SOLUTION AU PROBLÈME 1 : Email expéditeur
    // Utiliser un email FIXE vérifié sur SendGrid comme expéditeur
    // L'email de l'utilisateur sera en "replyTo" pour que le client puisse répondre directement
    const fromEmail = process.env.SENDGRID_FROM_EMAIL; // ✅ Email fixe vérifié
    const fromName = companyData.name || 'ProFlow';

    // Template HTML simple
    const htmlContent = generateEmailHTML(invoice, companyData, emailMessage);

    // Préparer le message email
    console.log('📧 Préparation du message email...');
    const msg = {
      to: invoice.client.email,
      from: {
        email: fromEmail,  // ✅ Email fixe vérifié sur SendGrid
        name: fromName
      },
      replyTo: userEmail,  // ✅ Le client peut répondre directement à l'utilisateur
      subject: emailSubject,
      text: emailMessage,
      html: htmlContent,
      attachments: [
        {
          content: pdfBuffer.toString('base64'),  // ✅ PDF en base64
          filename: `facture-${invoice.invoice_number}.pdf`,  // ✅ Vrai fichier PDF
          type: 'application/pdf',  // ✅ Type MIME PDF
          disposition: 'attachment'
        }
      ]
    };
    console.log('✅ Message préparé');
    console.log('📧 Expéditeur (From):', fromEmail);
    console.log('📧 Répondre à (ReplyTo):', userEmail || 'Non configuré');
    console.log('📄 Méthode PDF utilisée:', pdfMethod === 'puppeteer' ? 'Puppeteer (rendu exact)' : 'jsPDF (fallback)');

    try {
      console.log('📧 Tentative d\'envoi via SendGrid...');
      console.log('📧 De:', fromEmail, 'Vers:', invoice.client.email);
      console.log('📧 Sujet:', emailSubject);
      
      await sgMail.send(msg);
      
      console.log('✅ Email envoyé avec succès via SendGrid');
      return res.json({ 
        success: true, 
        message: 'Facture envoyée avec succès',
        emailStatus: 'sent',
        pdfMethod: pdfMethod,  // Indiquer quelle méthode a été utilisée
        info: pdfMethod === 'jspdf' ? 'PDF généré avec solution de secours (rendu légèrement différent)' : 'PDF généré avec le template exact'
      });
    } catch (emailError) {
      console.error('❌ Erreur SendGrid:', emailError.message);
      console.error('❌ Code:', emailError.code);
      console.error('❌ Response body:', JSON.stringify(emailError.response?.body));
      
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de l\'envoi de l\'email', 
        error: emailError.message,
        code: emailError.code,
        details: emailError.response?.body?.errors || [],
        hint: 'Vérifiez que SENDGRID_API_KEY est valide et que SENDGRID_FROM_EMAIL est vérifié sur SendGrid'
      });
    }

  } catch (err) {
    console.error('❌ Erreur globale:', err);
    console.error('Stack trace:', err.stack);
    
    // S'assurer de toujours retourner du JSON
    return res.status(500).json({ 
      success: false,
      error: err.message || 'Une erreur serveur est survenue',
      message: 'Erreur lors de l\'envoi de la facture',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

// Fonction pour générer le HTML de l'email (ultra compatible)
function generateEmailHTML(invoice, companyData, message) {
  const companyName = companyData.name || 'ENTREPRISE SAS';
  const invoiceNumber = invoice.invoice_number || '';
  const invoiceDate = invoice.date || '';
  const dueDate = invoice.due_date || '';
  const client = invoice.client || {};

  // Construire les lignes prestations
  let totalAmount = 0;
  let servicesRows = '';
  if (invoice.services && invoice.services.length > 0) {
    servicesRows = invoice.services.map(s => {
      const qty = s.hours != null ? `${s.hours}h` : (s.quantity != null ? String(s.quantity) : '1');
      const unit = (s.hourly_rate != null ? s.hourly_rate : (s.unit_price != null ? s.unit_price : 0));
      const lineTotal = (s.hours != null ? s.hours * unit : (s.quantity != null ? s.quantity * unit : unit)) || 0;
      totalAmount += lineTotal;
      return `
        <tr>
          <td style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;">
            ${s.description || 'Prestation'}
          </td>
          <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;">
            ${qty}
          </td>
          <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;">
            ${Number(unit).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </td>
          <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; padding: 12px; border-bottom: 1px solid #e0e0e0;">
            ${Number(lineTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </td>
        </tr>`;
    }).join('');
  } else {
    servicesRows = `
      <tr>
        <td colspan="4" style="color:#666; font-family: Arial, sans-serif; font-size: 14px; padding: 12px;">
          Aucune prestation.
        </td>
      </tr>`;
  }

  // Micro-entreprise: TVA souvent à 0; on garde la ligne TVA mais à 0
  const sousTotal = totalAmount;
  const tva = 0;
  const totalAPayer = sousTotal + tva;

  // Client fields
  const clientName = client.name || '';
  const clientAddress = client.address || '';
  const clientEmail = client.email || '';
  const clientPhone = client.phone || '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
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
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width: 600px;">
          <tr>
            <td bgcolor="#1e3c72" style="padding: 30px 30px 25px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 28px; font-weight: bold;">${companyName}</td>
                        <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 20px; font-weight: bold;">FACTURE</td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; padding-top: 5px;">Votre partenaire de confiance</td>
                        <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; padding-top: 5px;">N° ${invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 5px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px;">Date: ${invoiceDate}</td>
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
                    <strong>${companyName}</strong><br/>
                    ${companyData.address || ''}<br/>
                    ${companyData.city || ''} ${companyData.zip || ''} ${companyData.country || ''}<br/>
                    ${companyData.siret ? `SIRET: ${companyData.siret}` : ''} ${companyData.vat ? `| TVA: ${companyData.vat}` : ''}<br/>
                    ${companyData.phone ? `Tél: ${companyData.phone}` : ''} ${companyData.email ? ` | Email: <a href=\"mailto:${companyData.email}\" style=\"color:#ffffff; text-decoration:none;\">${companyData.email}</a>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="48%" valign="top" bgcolor="#f8f9fa" style="padding: 20px; border-left: 4px solid #1e3c72;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; padding-bottom: 10px; text-transform: uppercase;">FACTURÉ À</td>
                      </tr>
                      <tr>
                        <td style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                          <strong>${clientName}</strong><br/>
                          ${client.company || ''}<br/>
                          ${clientAddress}<br/>
                          ${clientEmail ? `<strong>Email:</strong> ${clientEmail}<br/>` : ''}
                          ${clientPhone ? `<strong>Tél:</strong> ${clientPhone}` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" valign="top" bgcolor="#f8f9fa" style="padding: 20px; border-left: 4px solid #1e3c72;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold; padding-bottom: 10px; text-transform: uppercase;">DÉTAILS DE PAIEMENT</td>
                      </tr>
                      <tr>
                        <td style="color: #333333; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                          <strong>Date d'échéance:</strong><br/>
                          ${dueDate || ''}<br/>
                          <strong>Conditions:</strong> Net 30 jours<br/>
                          <strong>Mode de paiement:</strong><br/>
                          Virement bancaire<br/>
                          <strong>Référence:</strong> ${invoiceNumber}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e0e0e0;">
                <tr bgcolor="#1e3c72">
                  <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Description</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Qté</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">P.U.</td>
                  <td align="right" style="color: #ffffff; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold; padding: 12px; text-transform: uppercase;">Montant</td>
                </tr>
                ${servicesRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f8f9fa" style="padding: 20px;">
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0; border-bottom: 1px solid #dee2e6;">Sous-total HT</td>
                  <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0; border-bottom: 1px solid #dee2e6;">${Number(sousTotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                </tr>
                <tr>
                  <td style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0;">TVA (0%)</td>
                  <td align="right" style="color: #333333; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding: 10px 0;">${Number(tva).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                </tr>
                <tr>
                  <td style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; padding: 15px 0 0 0; border-top: 3px solid #1e3c72;">TOTAL À PAYER</td>
                  <td align="right" style="color: #1e3c72; font-family: Arial, sans-serif; font-size: 22px; font-weight: bold; padding: 15px 0 0 0; border-top: 3px solid #1e3c72;">${Number(totalAPayer).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 30px 30px 30px;">
              <table border="0" cellspacing="0" cellpadding="0" width="100%" style="max-width:600px;">
                <tr>
                  <td align="center" style="font-family: Arial, sans-serif; font-size:18px; font-weight:bold; font-style:italic; color:#0f172a; background:#eef6ff; border:1px solid #bfdbfe; padding:16px 18px; border-radius:12px;">
                    Votre facture (PDF) est jointe à cet email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#fff3cd" style="padding: 20px; border-left: 4px solid #ffc107;">
                <tr>
                  <td style="color: #856404; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding-bottom: 10px;">💳 Informations bancaires</td>
                </tr>
                <tr>
                  <td style="color: #856404; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                    ${companyData.bank_name ? `<strong>Banque:</strong> ${companyData.bank_name}<br/>` : ''}
                    ${companyData.iban ? `<strong>IBAN:</strong> ${companyData.iban}<br/>` : ''}
                    ${companyData.bic ? `<strong>BIC:</strong> ${companyData.bic}<br/>` : ''}
                    <strong>Référence à mentionner:</strong> ${invoiceNumber}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#e7f3ff" style="padding: 20px; border-left: 4px solid #0066cc;">
                <tr>
                  <td style="color: #004085; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; padding-bottom: 10px;">📋 Notes importantes</td>
                </tr>
                <tr>
                  <td style="color: #004085; font-family: Arial, sans-serif; font-size: 14px; line-height: 22px;">
                    ${message || 'Merci pour votre confiance.'}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f8f9fa" style="padding: 25px 30px; border-top: 1px solid #e0e0e0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="color: #666666; font-family: Arial, sans-serif; font-size: 12px; line-height: 20px;">
                    <strong>${companyName}</strong>${companyData.rcs ? ` - ${companyData.rcs}` : ''}<br/>
                    ${companyData.address || ''}${companyData.city ? `, ${companyData.city}` : ''}${companyData.zip ? `, ${companyData.zip}` : ''}${companyData.country ? `, ${companyData.country}` : ''}<br/>
                    ${companyData.phone ? `Tél: ${companyData.phone}` : ''}${companyData.email ? ` | Email: ${companyData.email}` : ''}<br/>
                    ${companyData.website ? `Site web: ${companyData.website}` : ''}
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

  // Retourner le HTML (les styles sont déjà inline)
  return html;
}
