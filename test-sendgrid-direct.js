// Test direct SendGrid avec les vraies données de facture
// Pour voir l'erreur exacte sans passer par le serveur

import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import { generateInvoicePDFWithPuppeteer } from './src/lib/puppeteerPdfGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

async function testSendGridDirect(invoiceId) {
  try {
    console.log('🔍 Test direct SendGrid avec facture:', invoiceId);
    console.log('='.repeat(60));
    
    // Récupérer les données (même logique que le serveur)
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();
    
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();
    
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('client_id', invoice.client_id);
    
    // Données entreprise
    const companyData = {
      name: 'CleanBiz Pro',
      owner: 'KEBCI Hocine',
      address: '6 avenue Salvador Allende, 69100 Villeurbanne',
      email: 'kebcihocine94@gmail.com',
      phone: '0603543524',
      siret: '123 456 789 00010'
    };
    
    // Fusionner données
    invoice.client = client;
    invoice.services = services;
    
    console.log('📋 Données récupérées:');
    console.log('   Facture:', invoice.invoice_number);
    console.log('   Client:', invoice.client.name, `(${invoice.client.email})`);
    console.log('   Services:', invoice.services.length);
    
    // Générer PDF
    console.log('\n📄 Génération PDF...');
    const pdfData = await generateInvoicePDFWithPuppeteer(invoice, companyData);
    console.log('✅ PDF généré:', (pdfData.buffer.length / 1024).toFixed(1) + ' KB');
    
    // Test SendGrid
    console.log('\n📧 Test SendGrid...');
    const msg = {
      to: invoice.client.email,
      from: process.env.SENDGRID_FROM_EMAIL,
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
    
    console.log('📧 Détails email:');
    console.log('   To:', msg.to);
    console.log('   From:', msg.from);
    console.log('   Subject:', msg.subject);
    console.log('   Attachment:', msg.attachments[0].filename);
    console.log('   Attachment size:', (msg.attachments[0].content.length / 1024).toFixed(1) + ' KB');
    
    const result = await sgMail.send(msg);
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    
  } catch (error) {
    console.error('❌ Erreur SendGrid:');
    console.log('   Message:', error.message);
    console.log('   Code:', error.code);
    
    if (error.response && error.response.body && error.response.body.errors) {
      console.log('\n🚨 Erreurs détaillées:');
      error.response.body.errors.forEach((err, index) => {
        console.log(`   Erreur ${index + 1}:`);
        console.log('     Message:', err.message);
        console.log('     Field:', err.field || 'N/A');
        console.log('     Help:', err.help || 'N/A');
      });
    }
  }
}

// Utilisation
const invoiceId = process.argv[2];
if (!invoiceId) {
  console.log('Usage: node test-sendgrid-direct.js <invoice-id>');
  process.exit(1);
}

testSendGridDirect(invoiceId);
