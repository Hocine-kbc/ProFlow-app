// Service pour communiquer avec le backend Express
import {
  fetchSettings,
} from './api.ts';

// URL du backend - utilise VITE_BACKEND_URL si définie, sinon localhost en dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:3001/api';

console.log('🔗 Backend URL configurée:', BACKEND_URL);

export interface BackendResponse {
  success: boolean;
  message: string;
  emailStatus?: string;
  invoiceId?: string;
  pdfGenerated?: boolean;
}

// Envoyer une facture via le backend
export const sendInvoiceViaBackend = async (invoiceId: string, invoiceData?: unknown, customEmailData?: unknown): Promise<BackendResponse> => {
  try {
    console.log(`📧 Envoi de la facture ${invoiceId} via le backend...`);
    
    // Récupérer les données d'entreprise depuis la base de données
    let companySettings = null;
    try {
      companySettings = await fetchSettings();
      console.log('🏢 Données d\'entreprise récupérées depuis la base de données:', companySettings);
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les données d\'entreprise depuis la base de données:', error);
      // Fallback vers localStorage si la base de données échoue
      try {
        const raw = localStorage.getItem('business-settings');
        companySettings = raw ? JSON.parse(raw) : null;
        console.log('🏢 Données d\'entreprise récupérées depuis localStorage (fallback):', companySettings);
      } catch (localError) {
        console.warn('⚠️ Impossible de récupérer les données d\'entreprise depuis localStorage:', localError);
      }
    }
    
    // Récupérer les services de la facture depuis localStorage
    let invoiceServices = [];
    try {
      const storedServices = JSON.parse(localStorage.getItem('invoice-services') || '{}');
      invoiceServices = storedServices[invoiceId] || [];
      console.log(`🔍 Services récupérés pour la facture ${invoiceId}:`, invoiceServices.length);
      console.log(`🔍 Détails des services récupérés:`, invoiceServices);
      console.log(`🔍 Contenu complet de localStorage:`, storedServices);
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer les services de la facture:', error);
    }
    
    // Log des données personnalisées
    if (customEmailData) {
      console.log('📧 Données email personnalisées envoyées au backend:', customEmailData);
    }
    
    const response = await fetch(`${BACKEND_URL}/send-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        invoiceId,
        companySettings,
        invoiceData,
        services: invoiceServices,
        customEmailData
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
      message: error instanceof Error ? error.message : 'Erreur inconnue'
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
