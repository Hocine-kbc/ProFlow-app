import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 Configuration Gmail pour l\'envoi de factures');
console.log('==================================================');

// Vérifier les variables d'environnement
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;

console.log('📧 Email Gmail:', gmailUser || '❌ Non configuré');
console.log('🔑 Mot de passe d\'application:', gmailPassword ? '✅ Configuré' : '❌ Non configuré');

if (!gmailUser || !gmailPassword) {
  console.log('\n❌ Configuration Gmail incomplète !');
  console.log('\n📋 Pour configurer Gmail :');
  console.log('1. Allez sur https://myaccount.google.com/security');
  console.log('2. Activez l\'authentification à 2 facteurs');
  console.log('3. Générez un mot de passe d\'application pour "Mail"');
  console.log('4. Ajoutez ces variables à votre fichier .env :');
  console.log('   GMAIL_USER=kebcihocine94@gmail.com');
  console.log('   GMAIL_APP_PASSWORD=votre-mot-de-passe-de-16-caractères');
  console.log('\n💡 Le serveur utilisera Gmail automatiquement si SendGrid échoue !');
  process.exit(1);
}

// Tester la connexion Gmail
console.log('\n🧪 Test de connexion Gmail...');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPassword
  }
});

try {
  await transporter.verify();
  console.log('✅ Connexion Gmail réussie !');
  
  // Test d'envoi d'email
  console.log('📧 Test d\'envoi d\'email...');
  
  const testEmail = {
    from: gmailUser,
    to: gmailUser, // Envoi à soi-même pour test
    subject: 'Test configuration Gmail - Factures',
    text: 'Ceci est un test de configuration Gmail pour l\'envoi de factures. Si vous recevez cet email, la configuration est correcte !'
  };
  
  await transporter.sendMail(testEmail);
  console.log('✅ Email de test envoyé avec succès !');
  console.log('📬 Vérifiez votre boîte de réception (et les spams)');
  
} catch (error) {
  console.error('❌ Erreur de configuration Gmail:', error.message);
  
  if (error.message.includes('Invalid login')) {
    console.log('\n💡 Solution : Vérifiez votre mot de passe d\'application');
    console.log('   - Il doit faire exactement 16 caractères');
    console.log('   - Pas d\'espaces avant/après');
    console.log('   - Généré pour "Mail" spécifiquement');
  } else if (error.message.includes('Less secure app access')) {
    console.log('\n💡 Solution : Activez l\'authentification à 2 facteurs et utilisez un mot de passe d\'application');
  }
}
