// Service pour communiquer avec le backend Express
import {
  fetchSettings,
} from './api.ts';

// URL du backend - utilise VITE_BACKEND_URL si définie, sinon localhost en dev
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL 
  ? `${import.meta.env.VITE_BACKEND_URL}/api`
  : 'http://localhost:3001/api';
export interface BackendResponse {
  success: boolean;
  message: string;
  emailStatus?: string;
  invoiceId?: string;
  pdfGenerated?: boolean;
  error?: string;
  hint?: string;
  emailService?: string;
}

// Envoyer une facture via le backend
export const sendInvoiceViaBackend = async (invoiceId: string, invoiceData?: unknown, customEmailData?: unknown): Promise<BackendResponse> => {
  try {
    // Récupérer les données d'entreprise depuis la base de données
    let companySettings = null;
    try {
      companySettings = await fetchSettings();
    } catch (error) {
      // Fallback vers localStorage si la base de données échoue
      try {
        const raw = localStorage.getItem('business-settings');
        companySettings = raw ? JSON.parse(raw) : null;
      } catch (localError) {
      }
    }
    
    // Récupérer les services de la facture depuis localStorage
    let invoiceServices = [];
    try {
      const storedServices = JSON.parse(localStorage.getItem('invoice-services') || '{}');
      invoiceServices = storedServices[invoiceId] || [];
    } catch (error) {
    }
    
    // Log des données personnalisées
    if (customEmailData) {
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
      // Retourner les détails de l'erreur du backend
      return {
        success: false,
        message: data.message || 'Erreur lors de l\'envoi de la facture',
        error: data.error || data.message,
        hint: data.hint
      };
    }
    return data;
  } catch (error) {
    // Détecter les erreurs de connexion réseau
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');
    
    return {
      success: false,
      message: isNetworkError ? 'Impossible de se connecter au backend' : 'Erreur lors de l\'envoi de la facture',
      error: errorMessage,
      hint: isNetworkError ? 'Vérifiez que le backend est démarré et que VITE_BACKEND_URL est correctement configuré.' : undefined
    };
  }
};

// Tester la connexion au backend
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/test-connection`);
    const data = await response.json();
    
    if (response.ok && data.success) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};
