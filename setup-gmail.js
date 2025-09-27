// Script pour configurer Gmail comme alternative à SendGrid
// Plus simple et plus fiable pour les tests

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testGmailConfig() {
  console.log('📧 Test configuration Gmail:');
  console.log('='.repeat(50));
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log('❌ Gmail non configuré');
    console.log('\n🔧 Pour configurer Gmail:');
    console.log('1. Activez l\'authentification à 2 facteurs sur votre compte Google');
    console.log('2. Générez un mot de passe d\'application:');
    console.log('   - Allez sur https://myaccount.google.com/security');
    console.log('   - Appareils > Mots de passe des applications');
    console.log('   - Générez un mot de passe pour "Mail"');
    console.log('3. Ajoutez dans votre .env:');
    console.log('   GMAIL_USER=kebcihocine94@gmail.com');
    console.log('   GMAIL_APP_PASSWORD=votre-mot-de-passe-app');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    console.log('✅ Configuration Gmail trouvée');
    console.log('📧 Email:', process.env.GMAIL_USER);
    
    // Test d'envoi
    console.log('\n🧪 Test d\'envoi...');
    const testEmail = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Envoi à soi-même pour test
      subject: 'Test Gmail - Facture',
      text: 'Ceci est un test d\'envoi d\'email avec Gmail.',
      html: '<p>Ceci est un test d\'envoi d\'email avec Gmail.</p>'
    };
    
    const result = await transporter.sendMail(testEmail);
    console.log('✅ Email de test envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Erreur Gmail:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Solution: Vérifiez votre mot de passe d\'application');
    } else if (error.message.includes('Less secure app access')) {
      console.log('\n💡 Solution: Activez l\'accès aux applications moins sécurisées');
    }
  }
}

testGmailConfig();
