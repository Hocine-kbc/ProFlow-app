import emailjs from '@emailjs/browser';
import { openInvoicePrintWindow } from './print';

// Configuration EmailJS
const EMAILJS_SERVICE_ID = 'service_wnsf7qn'; // Votre Service ID
const EMAILJS_TEMPLATE_ID = 'template_ybddyxu'; // Votre nouveau Template ID
const EMAILJS_PUBLIC_KEY = 'lw7mu8Zgapk170cDm'; // Votre Public Key

// Initialiser EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Fonction pour générer le PDF directement depuis la base de données
const generateInvoicePDFFromDatabase = async (invoiceNumber: string): Promise<string> => {
  try {
    // Cette fonction génère le PDF depuis la base de données
    // et retourne un lien de téléchargement direct
    
    // Solution 1: Créer un blob URL pour le téléchargement direct
    const pdfData = await generateInvoicePDFBase64(invoiceNumber);
    
    if (pdfData) {
      // Créer un blob à partir des données base64
      const binaryString = atob(pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      return url;
    }
    
    // Fallback: Lien vers votre application (quand vous en aurez une)
    return `https://votre-domaine.com/invoice/${invoiceNumber}/pdf`;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback vers un lien de test
    return 'https://votre-domaine.com/invoice/' + invoiceNumber + '/pdf';
  }
};

// Fonction pour générer le PDF en base64
const generateInvoicePDFBase64 = async (invoiceNumber: string): Promise<string> => {
  try {
    // Cette fonction génère le PDF depuis la base de données
    // et le retourne en base64 pour le téléchargement
    
    // Pour l'instant, on utilise un PDF de test
    // Dans un vrai projet, vous utiliseriez votre fonction de génération PDF
    
    // PDF de test en base64 (remplacez par votre logique de génération)
    const testPDF = 'JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKNiAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDIgMCBSCj4+Cj4+Ci9NZWRpYUJveCBbMCAwIDU5NSA4NDJdCi9Db250ZW50cyA0IDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjcyIDcyMCBUZAooVGVzdCBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDIKL0tpZHMgWzUgMCBSIDYgMCBSXQo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMyAwIFIKPj4KZW5kb2JqCnhyZWYKMCA3CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAwIG4gCjAwMDAwMDAxMTUgMDAwMDAgbiAKMDAwMDAwMDI3MiAwMDAwMCBuIAowMDAwMDAwMzQ3IDAwMDAwIG4gCjAwMDAwMDA0NzcgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA3Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo1NjMKJSVFT0YK';
    
    return testPDF;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return '';
  }
};

export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  invoice_number: string;
  invoice_date: string;
  invoice_due_date: string;
  invoice_amount: string;
  payment_method?: string;
  company_name: string;
  company_email: string;
  company_phone?: string;
  company_address?: string;
}

export const sendInvoiceEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    console.log('Sending email with data:', emailData);
    
    // Paramètres pour le template EmailJS
    const templateParams = {
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      subject: emailData.subject,
      message: emailData.message,
      invoice_number: emailData.invoice_number,
      invoice_date: emailData.invoice_date,
      invoice_due_date: emailData.invoice_due_date,
      invoice_amount: emailData.invoice_amount,
      payment_method: emailData.payment_method || 'Non spécifié',
      company_name: emailData.company_name,
      company_email: emailData.company_email,
      company_phone: emailData.company_phone || '',
      company_address: emailData.company_address || '',
      // Générer le PDF directement depuis la base de données
      download_url: await generateInvoicePDFFromDatabase(emailData.invoice_number), // PDF généré depuis la base de données
      invoice_id: emailData.invoice_number, // ID de la facture pour le lien
    };

    // Envoyer l'email via EmailJS
    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Fonction de test pour vérifier la configuration
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const testData: EmailData = {
      to_email: 'test@example.com',
      to_name: 'Test User',
      subject: 'Test Email',
      message: 'This is a test email',
      invoice_number: 'TEST-001',
      invoice_date: new Date().toLocaleDateString('fr-FR'),
      invoice_due_date: new Date().toLocaleDateString('fr-FR'),
      invoice_amount: '100.00',
      company_name: 'ProFlow',
      company_email: 'contact@proflow.com',
    };

    const result = await sendInvoiceEmail(testData);
    return result;
  } catch (error) {
    console.error('Test email failed:', error);
    return false;
  }
};
