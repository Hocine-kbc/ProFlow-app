// Script simple pour envoyer une facture par email
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Configuration email simple avec Gmail
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: 'kebcihocine94@gmail.com',
      pass: 'vmyz bzte yumy zcaj' // Mot de passe d'application Gmail
    }
  });
};

// Fonction pour envoyer une facture
export const sendInvoiceEmail = async (clientEmail, clientName, invoiceNumber, pdfPath) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: 'kebcihocine94@gmail.com',
      to: clientEmail,
      subject: `Facture ${invoiceNumber} - CleanBiz Pro`,
      text: `Bonjour ${clientName},\n\nVeuillez trouver ci-joint votre facture N° ${invoiceNumber}.\n\nCordialement,\nCleanBiz Pro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1d4ed8;">Facture N° ${invoiceNumber}</h2>
          <p>Bonjour <strong>${clientName}</strong>,</p>
          <p>Veuillez trouver ci-joint votre facture.</p>
          <p>Cordialement,<br><strong>CleanBiz Pro</strong></p>
        </div>
      `,
      attachments: [
        {
          filename: path.basename(pdfPath),
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email envoyé avec succès:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// Test d'envoi
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEmail = 'kebcihocine94@gmail.com';
  const testName = 'Test Client';
  const testInvoice = 'FAC-TEST-001';
  const testPdf = './temp/facture_test.pdf';
  
  console.log('🧪 Test d\'envoi d\'email...');
  sendInvoiceEmail(testEmail, testName, testInvoice, testPdf);
}
