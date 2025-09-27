// Script pour vérifier l'encodage base64 du PDF
// Teste si le buffer PDF est correctement encodé

import fs from 'fs';
import path from 'path';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function debugBase64Encoding() {
  console.log('🔍 Débogage encodage base64:');
  console.log('='.repeat(50));
  
  try {
    // Trouver un PDF existant
    const tempDir = path.join(process.cwd(), 'temp');
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('❌ Aucun PDF trouvé');
      return;
    }
    
    const latestPdf = files
      .map(file => ({
        name: file,
        path: path.join(tempDir, file),
        stats: fs.statSync(path.join(tempDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime)[0];
    
    console.log('📄 PDF de test:', latestPdf.name);
    console.log('📏 Taille:', (latestPdf.stats.size / 1024).toFixed(1) + ' KB');
    
    // Lire le PDF
    const pdfBuffer = fs.readFileSync(latestPdf.path);
    const base64Content = pdfBuffer.toString('base64');
    
    console.log('\n🔍 Analyse base64:');
    console.log('   Longueur buffer:', pdfBuffer.length);
    console.log('   Longueur base64:', base64Content.length);
    console.log('   Commence par:', base64Content.substring(0, 20) + '...');
    console.log('   Se termine par:', '...' + base64Content.substring(base64Content.length - 20));
    
    // Vérifier si c'est du vrai base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isValidBase64 = base64Regex.test(base64Content);
    console.log('   Format base64 valide:', isValidBase64);
    
    // Test d'envoi avec le vrai PDF
    console.log('\n📧 Test d\'envoi avec vrai PDF...');
    const testMsg = {
      to: 'kebcihocine94@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Test PDF réel - Debug',
      text: 'Test avec PDF réel encodé en base64.',
      attachments: [
        {
          content: base64Content,
          filename: latestPdf.name,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    const result = await sgMail.send(testMsg);
    console.log('✅ Email avec PDF réel envoyé avec succès !');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    
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

debugBase64Encoding();
