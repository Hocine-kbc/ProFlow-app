import emailjs from '@emailjs/browser';

// Configuration EmailJS
const EMAILJS_SERVICE_ID = 'service_wnsf7qn'; // Votre Service ID
const EMAILJS_TEMPLATE_ID = 'template_j4dpozm'; // Votre Template ID
const EMAILJS_PUBLIC_KEY = 'lw7mu8Zgapk170cDm'; // Votre Public Key

// Initialiser EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

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
