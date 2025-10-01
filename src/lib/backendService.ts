// Service pour communiquer avec le backend Express
const BACKEND_URL = 'http://localhost:3001/api';

export interface BackendResponse {
  success: boolean;
  message: string;
  emailStatus?: string;
  invoiceId?: string;
  pdfGenerated?: boolean;
}

// Envoyer une facture via le backend
export const sendInvoiceViaBackend = async (invoiceId: string): Promise<BackendResponse> => {
  try {
    console.log(`📧 Envoi de la facture ${invoiceId} via le backend...`);
    
    // Récupérer les données d'entreprise depuis localStorage
    let companySettings = null;
    try {
      const raw = localStorage.getItem('business-settings');
      companySettings = raw ? JSON.parse(raw) : null;
      console.log('🏢 Données d\'entreprise récupérées:', companySettings);
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les données d\'entreprise:', error);
    }
    
    const response = await fetch(`${BACKEND_URL}/send-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        invoiceId,
        companySettings 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de l\'envoi de la facture');
    }

    console.log('✅ Facture envoyée avec succès:', data);
    return data;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la facture:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

// Tester la connexion au backend
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    console.log('🔍 Test de connexion au backend...');
    
    const response = await fetch(`${BACKEND_URL}/test-connection`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Backend connecté et prêt');
      return true;
    } else {
      console.error('❌ Backend non connecté');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion au backend:', error);
    return false;
  }
};
