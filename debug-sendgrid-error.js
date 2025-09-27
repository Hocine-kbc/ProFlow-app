// Script pour déboguer l'erreur SendGrid en détail
// Affiche les détails complets de l'erreur SendGrid

import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function debugSendGridError() {
  console.log('🔍 Débogage erreur SendGrid:');
  console.log('='.repeat(50));
  
  try {
    // Test d'envoi simple
    const testMsg = {
      to: 'kebcihocine94@gmail.com', // Votre email
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: 'Test SendGrid - Debug',
      text: 'Test d\'envoi SendGrid pour déboguer l\'erreur.',
      html: '<p>Test d\'envoi SendGrid pour déboguer l\'erreur.</p>'
    };
    
    console.log('📧 Test d\'envoi simple:');
    console.log('   From:', testMsg.from);
    console.log('   To:', testMsg.to);
    console.log('   Subject:', testMsg.subject);
    
    const result = await sgMail.send(testMsg);
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    
  } catch (error) {
    console.error('❌ Erreur SendGrid détaillée:');
    console.log('   Code:', error.code);
    console.log('   Message:', error.message);
    
    if (error.response) {
      console.log('\n📋 Détails de la réponse:');
      console.log('   Status:', error.response.status);
      console.log('   Headers:', error.response.headers);
      
      if (error.response.body && error.response.body.errors) {
        console.log('\n🚨 Erreurs spécifiques:');
        error.response.body.errors.forEach((err, index) => {
          console.log(`   Erreur ${index + 1}:`);
          console.log('     Message:', err.message);
          console.log('     Field:', err.field || 'N/A');
          console.log('     Help:', err.help || 'N/A');
        });
      }
    }
    
    // Solutions possibles
    console.log('\n💡 Solutions possibles:');
    if (error.message.includes('Bad Request')) {
      console.log('1. Vérifiez le format de l\'email d\'expéditeur');
      console.log('2. Assurez-vous que l\'email est bien vérifié');
      console.log('3. Vérifiez les permissions de votre clé API');
    }
  }
}

debugSendGridError();
