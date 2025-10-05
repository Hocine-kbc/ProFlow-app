// Script de test pour vérifier le calcul des pénalités de retard
// Ce script simule le calcul de la date limite et l'affichage des pénalités

console.log('🧪 Test du calcul des pénalités de retard...');

// Simuler une facture avec des paramètres spécifiques
const testInvoice = {
  id: 'test-invoice-id',
  invoice_number: 'TEST-001',
  date: '2025-01-01',
  due_date: '2025-01-31',
  subtotal: 100,
  net_amount: 100,
  status: 'draft',
  // Paramètres spécifiques à la facture
  payment_terms: 15,
  payment_method: 'Virement bancaire',
  include_late_payment_penalties: true,
  services: []
};

// Simuler des paramètres globaux différents
const testSettings = {
  paymentTerms: 30,
  paymentMethod: 'Chèque',
  includeLatePaymentPenalties: false
};

console.log('📄 Facture de test:', {
  date: testInvoice.date,
  payment_terms: testInvoice.payment_terms,
  payment_method: testInvoice.payment_method,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties
});

console.log('⚙️ Paramètres globaux:', {
  paymentTerms: testSettings.paymentTerms,
  paymentMethod: testSettings.paymentMethod,
  includeLatePaymentPenalties: testSettings.includeLatePaymentPenalties
});

// Simuler la logique du template pour le calcul des pénalités
const includeLatePaymentPenalties = testInvoice.include_late_payment_penalties !== null ? 
  testInvoice.include_late_payment_penalties : 
  testSettings?.includeLatePaymentPenalties;

if (includeLatePaymentPenalties) {
  // Calculer la date limite à partir des paramètres de la facture
  const paymentTerms = testInvoice.payment_terms || testSettings?.paymentTerms || 30;
  const invoiceDate = new Date(testInvoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  // Utiliser le mode de paiement de la facture en priorité
  const paymentMode = testInvoice.payment_method || testSettings?.paymentMethod || 'Non spécifié';
  
  const penaltiesText = `Pénalités de retard :
• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)
• Mode : ${paymentMode}
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.`;

  console.log('🎯 Texte des pénalités généré:', penaltiesText);
  
  // Vérifier que les paramètres de la facture sont utilisés
  const usesInvoicePaymentTerms = paymentTerms === testInvoice.payment_terms;
  const usesInvoicePaymentMethod = paymentMode === testInvoice.payment_method;
  
  if (usesInvoicePaymentTerms && usesInvoicePaymentMethod) {
    console.log('✅ SUCCÈS: Les pénalités utilisent les paramètres de la facture');
    console.log('📅 Date calculée:', dueDate.toLocaleDateString('fr-FR'));
    console.log('⏰ Délai utilisé:', paymentTerms, 'jours');
    console.log('💳 Mode de paiement:', paymentMode);
  } else {
    console.log('❌ ÉCHEC: Les pénalités n\'utilisent pas les paramètres de la facture');
    console.log('Différences:', {
      paymentTerms: {
        facture: testInvoice.payment_terms,
        calculé: paymentTerms,
        match: usesInvoicePaymentTerms
      },
      paymentMethod: {
        facture: testInvoice.payment_method,
        utilisé: paymentMode,
        match: usesInvoicePaymentMethod
      }
    });
  }
} else {
  console.log('ℹ️ Les pénalités de retard sont désactivées pour cette facture');
}
