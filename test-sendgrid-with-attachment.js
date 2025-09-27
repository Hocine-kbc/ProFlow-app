// Test SendGrid avec pièce jointe PDF
// Simule l'envoi d'une facture avec PDF pour identifier le problème

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSendGridWithAttachment() {
  console.log('🧪 Test SendGrid avec pièce jointe:');
  console.log('='.repeat(50));
  
  try {
    // Trouver un PDF existant pour le test
    const tempDir = path.join(process.cwd(), 'temp');
    const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.pdf'));
    
    if (files.length === 0) {
      console.log('❌ Aucun PDF trouvé pour le test');
      return;
    }
    
    // Prendre le PDF le plus récent
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
    
    // Test d'envoi avec pièce jointe
    const testMsg = {
      to: 'kebcihocine94@gmail.com', // Votre email
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Test SendGrid avec PDF - Debug',
      text: 'Test d\'envoi SendGrid avec pièce jointe PDF.',
      html: '<p>Test d\'envoi SendGrid avec pièce jointe PDF.</p>',
      attachments: [
        {
          content: pdfBuffer.toString('base64'),
          filename: latestPdf.name,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };
    
    console.log('\n📧 Envoi du test...');
    const result = await sgMail.send(testMsg);
    console.log('✅ Email avec PDF envoyé avec succès !');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    
  } catch (error) {
    console.error('❌ Erreur SendGrid avec pièce jointe:');
    console.log('   Code:', error.code);
    console.log('   Message:', error.message);
    
    if (error.response && error.response.body && error.response.body.errors) {
      console.log('\n🚨 Erreurs spécifiques:');
      error.response.body.errors.forEach((err, index) => {
        console.log(`   Erreur ${index + 1}:`);
        console.log('     Message:', err.message);
        console.log('     Field:', err.field || 'N/A');
        console.log('     Help:', err.help || 'N/A');
      });
    }
    
    // Solutions possibles
    console.log('\n💡 Solutions possibles:');
    if (error.message.includes('Bad Request')) {
      console.log('1. Le PDF est peut-être trop volumineux');
      console.log('2. Vérifiez le format de la pièce jointe');
      console.log('3. Vérifiez les limites de SendGrid');
    }
  }
}

testSendGridWithAttachment();
