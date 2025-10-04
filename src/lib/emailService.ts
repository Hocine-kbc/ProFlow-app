import { sendInvoiceViaBackend, testBackendConnection } from './backendService';

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

// Fonction pour envoyer une facture par email via le backend
export const sendInvoiceEmail = async (emailData: EmailData, invoiceId?: string, invoiceData?: any): Promise<boolean> => {
  try {
    console.log('📧 Envoi de facture via le backend...', emailData);
    
    // Utiliser l'ID UUID si fourni, sinon utiliser le numéro de facture
    const idToSend = invoiceId || emailData.invoice_number;
    const result = await sendInvoiceViaBackend(idToSend, invoiceData);
    
    if (result.success) {
      console.log('✅ Facture envoyée avec succès:', result);
      return true;
    } else {
      console.error('❌ Erreur lors de l\'envoi:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la facture:', error);
    return false;
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