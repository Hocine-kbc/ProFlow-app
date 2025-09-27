// Test pour corriger l'encodage base64
// Vérifie que le buffer PDF est correctement encodé

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testBase64Fix() {
  try {
    console.log('🔍 Test correction base64:');
    console.log('='.repeat(50));
    
    // Trouver un PDF existant
    const tempDir = path.join(process.cwd(), 'temp');
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
    const latestPdf = files
      .map(file => ({
        name: file,
        path: path.join(tempDir, file),
        stats: fs.statSync(path.join(tempDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime)[0];
    
    console.log('📄 PDF de test:', latestPdf.name);
    
    // Lire le PDF
    const pdfBuffer = fs.readFileSync(latestPdf.path);
    console.log('📏 Taille buffer:', (pdfBuffer.length / 1024).toFixed(1) + ' KB');
    
    // Test 1: Encodage direct
    console.log('\n🧪 Test 1: Encodage direct');
    const base64Direct = pdfBuffer.toString('base64');
    console.log('   Longueur base64:', base64Direct.length);
    console.log('   Commence par:', base64Direct.substring(0, 20));
    console.log('   Se termine par:', base64Direct.substring(base64Direct.length - 20));
    
    // Test 2: Vérifier si c'est du vrai base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isValidDirect = base64Regex.test(base64Direct);
    console.log('   Format valide:', isValidDirect);
    
    // Test d'envoi avec encodage direct
    console.log('\n📧 Test d\'envoi avec encodage direct...');
    const msg = {
      to: 'kebcihocine94@gmail.com',
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Test base64 direct',
      text: 'Test avec encodage base64 direct.',
      attachments: [
        {
          content: base64Direct,
          filename: latestPdf.name,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    const result = await sgMail.send(msg);
    console.log('✅ Email envoyé avec succès !');
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

testBase64Fix();
