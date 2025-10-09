// Générateur de PDF pour les factures
// Ce fichier crée une route API pour servir les PDFs directement

export const generateInvoicePDF = (invoiceId: string) => {
  try {
    // Cette fonction sera appelée par l'API route
    // Elle génère le PDF de la facture et le retourne
    
    // Pour l'instant, on retourne une URL de téléchargement
    // Dans un vrai projet, vous utiliseriez une librairie comme jsPDF ou Puppeteer
    
    const pdfUrl = `/api/invoice/${invoiceId}/pdf`;
    return pdfUrl;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Fonction pour créer un lien de téléchargement direct
export const createDownloadLink = (invoiceNumber: string, baseUrl: string = 'https://votre-domaine-proflow.com') => {
  return `${baseUrl}/api/invoice/${invoiceNumber}/pdf`;
};
