import { sendInvoiceViaBackend, testBackendConnection } from './backendService.ts';

// Service email moderne pour l'envoi de factures PDF via backend
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

// Résultat de l'envoi d'email
export interface EmailSendResult {
  success: boolean;
  message: string;
  error?: string;
  hint?: string;
}

// Fonction pour envoyer une facture par email via le backend
export const sendInvoiceEmail = async (emailData: EmailData, invoiceId?: string, invoiceData?: any): Promise<EmailSendResult> => {
  try {
    console.log('📧 Envoi de facture via le backend...', emailData);
    
    // Utiliser l'ID UUID si fourni, sinon utiliser le numéro de facture
    const idToSend = invoiceId || emailData.invoice_number;
    
    // Préparer les données personnalisées pour le backend
    const customEmailData = {
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      subject: emailData.subject,
      message: emailData.message,
      company_name: emailData.company_name,
      company_email: emailData.company_email,
      company_phone: emailData.company_phone,
      company_address: emailData.company_address
    };
    
    const result = await sendInvoiceViaBackend(idToSend, invoiceData, customEmailData);
    
    if (result.success) {
      console.log('✅ Facture envoyée avec succès:', result);
      return {
        success: true,
        message: result.message || 'Facture envoyée avec succès'
      };
    } else {
      console.error('❌ Erreur lors de l\'envoi:', result.message);
      
      // Analyser le message d'erreur pour donner des conseils
      let hint = '';
      const errorMsg = result.message?.toLowerCase() || '';
      
      if (errorMsg.includes('sendgrid') && errorMsg.includes('verified')) {
        hint = 'Vérifiez que SENDGRID_FROM_EMAIL est vérifié dans votre compte SendGrid.';
      } else if (errorMsg.includes('sendgrid') && errorMsg.includes('api key')) {
        hint = 'Vérifiez que SENDGRID_API_KEY est correctement configuré sur votre plateforme de déploiement.';
      } else if (errorMsg.includes('gmail') && errorMsg.includes('password')) {
        hint = 'Vérifiez que GMAIL_APP_PASSWORD est un mot de passe d\'application (pas votre mot de passe Gmail normal).';
      } else if (errorMsg.includes('configuration') || errorMsg.includes('manquante')) {
        hint = 'Configurez soit Gmail (GMAIL_USER + GMAIL_APP_PASSWORD) soit SendGrid (SENDGRID_API_KEY + SENDGRID_FROM_EMAIL) sur votre plateforme de déploiement.';
      }
      
      return {
        success: false,
        message: result.message || 'Erreur lors de l\'envoi de l\'email',
        error: result.message,
        hint
      };
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la facture:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return {
      success: false,
      message: 'Erreur de connexion au backend',
      error: errorMessage,
      hint: 'Vérifiez que le backend est démarré et accessible.'
    };
  }
};

// Fonction de test pour vérifier la configuration
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    console.log('🧪 Test de configuration email...');
    
    const backendConnected = await testBackendConnection();
    
    if (backendConnected) {
      console.log('✅ Configuration email OK');
      return true;
    } else {
      console.error('❌ Backend non connecté');
      return false;
    }
  } catch (error) {
    console.error('❌ Test de configuration échoué:', error);
    return false;
  }
};