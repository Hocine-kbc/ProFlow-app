// Script pour déboguer la structure exacte de l'email
// Compare l'email qui fonctionne vs celui qui échoue

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Configuration SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function debugEmailStructure() {
  console.log('🔍 Débogage structure email:');
  console.log('='.repeat(50));
  
  // Email qui fonctionne (test simple)
  const workingEmail = {
    to: 'kebcihocine94@gmail.com',
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Test simple - OK',
    text: 'Test simple qui fonctionne'
  };
  
  // Email qui échoue (avec pièce jointe et structure complexe)
  const failingEmail = {
    to: 'kebcihocine94@gmail.com',
    from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'CleanBiz Pro' },
    subject: 'Facture FAC-202509-003 - CleanBiz Pro',
    text: 'Bonjour houhou, veuillez trouver ci-joint votre facture.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Facture FAC-202509-003</h2>
        <p>Bonjour houhou,</p>
        <p>Veuillez trouver ci-joint votre facture en PDF.</p>
        <p>Merci de votre confiance.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          CleanBiz Pro<br>
          6 avenue Salvador Allende, 69100 Villeurbanne<br>
          kebcihocine94@gmail.com • 0603543524
        </p>
      </div>
    `,
    attachments: [
      {
        content: 'fake-base64-content', // Contenu factice pour le test
        filename: 'facture_test.pdf',
        type: 'application/pdf',
        disposition: 'attachment'
      }
    ]
  };
  
  console.log('📧 Test 1: Email simple (devrait fonctionner)');
  try {
    await sgMail.send(workingEmail);
    console.log('✅ Email simple envoyé avec succès');
  } catch (error) {
    console.log('❌ Erreur email simple:', error.message);
  }
  
  console.log('\n📧 Test 2: Email complexe (devrait échouer)');
  try {
    await sgMail.send(failingEmail);
    console.log('✅ Email complexe envoyé avec succès');
  } catch (error) {
    console.log('❌ Erreur email complexe:', error.message);
    
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
  
  console.log('\n🔍 Analyse des différences:');
  console.log('   Email simple: from = string');
  console.log('   Email complexe: from = object avec name');
  console.log('   Email complexe: contient HTML');
  console.log('   Email complexe: contient pièce jointe');
  
  console.log('\n💡 Solutions à tester:');
  console.log('1. Simplifier l\'objet from');
  console.log('2. Vérifier le format HTML');
  console.log('3. Tester sans pièce jointe');
}

debugEmailStructure();
