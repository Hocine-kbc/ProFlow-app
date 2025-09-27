// Test d'envoi d'email avec Gmail
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Configuration Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kebcihocine94@gmail.com',
    pass: 'vmyz bzte yumy zcaj' // Mot de passe d'application
  }
});

// Fonction de test
const testEmail = async () => {
  try {
    console.log('📧 Test d\'envoi d\'email avec Gmail...');
    
    // Trouver le dernier PDF généré
    const tempDir = './temp';
    const files = fs.readdirSync(tempDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => ({
        name: file,
        path: path.join(tempDir, file),
        time: fs.statSync(path.join(tempDir, file)).mtime
      }))
      .sort((a, b) => b.time - a.time);
    
    const latestPdf = files[0];
    console.log('📄 PDF trouvé:', latestPdf.name);
    
    const mailOptions = {
      from: 'kebcihocine94@gmail.com',
      to: 'kebcihocine94@gmail.com', // Envoi à vous-même pour test
      subject: 'Test Facture - CleanBiz Pro',
      text: 'Test d\'envoi de facture PDF',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1d4ed8;">Test d'envoi de facture</h2>
          <p>Ceci est un test d'envoi de facture PDF.</p>
          <p>Si vous recevez cet email, le système fonctionne !</p>
          <p>Cordialement,<br><strong>CleanBiz Pro</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: latestPdf.name,
          path: latestPdf.path,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé avec succès !');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Vérifiez votre boîte email (kebcihocine94@gmail.com)');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
};

// Exécuter le test
testEmail();
