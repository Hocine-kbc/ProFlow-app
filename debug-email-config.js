// Script pour déboguer la configuration email
// Vérifie les variables d'environnement et teste l'envoi

import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();

function debugEmailConfig() {
  console.log('🔍 Débogage configuration email:');
  console.log('='.repeat(50));
  
  // Vérifier les variables d'environnement
  console.log('📧 Variables d\'environnement:');
  console.log('   SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? '✅ Configurée' : '❌ Manquante');
  console.log('   SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL || '❌ Manquante');
  console.log('   GMAIL_USER:', process.env.GMAIL_USER || '❌ Manquante');
  console.log('   GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Configurée' : '❌ Manquante');
  
  // Vérifier la clé SendGrid
  if (process.env.SENDGRID_API_KEY) {
    const apiKey = process.env.SENDGRID_API_KEY;
    console.log('\n🔑 Clé SendGrid:');
    console.log('   Longueur:', apiKey.length);
    console.log('   Commence par SG.:', apiKey.startsWith('SG.'));
    console.log('   Format valide:', /^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(apiKey));
  }
  
  // Vérifier l'email d'expéditeur
  if (process.env.SENDGRID_FROM_EMAIL) {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    console.log('\n📤 Email d\'expéditeur:');
    console.log('   Email:', fromEmail);
    console.log('   Format valide:', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail));
  }
  
  console.log('\n💡 Solutions possibles:');
  console.log('1. Vérifiez que SENDGRID_FROM_EMAIL est vérifié dans SendGrid');
  console.log('2. Utilisez un email de votre domaine vérifié');
  console.log('3. Ou configurez Gmail comme alternative');
}

debugEmailConfig();
