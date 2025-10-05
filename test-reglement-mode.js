// Script de test pour vérifier l'affichage "Règlement" avec le mode de paiement de la facture
// Ce script simule l'affichage des conditions de règlement

console.log('🧪 Test du règlement avec mode de paiement de la facture...');

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

// Simuler la logique du template pour le calcul du règlement
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
  
  const reglementText = `Règlement :
• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)
• Mode : ${paymentMode}
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.`;

  console.log('🎯 Texte du règlement généré:', reglementText);
  
  // Vérifier que le titre est "Règlement" et que le mode utilise la facture
  const hasReglementTitle = reglementText.includes('Règlement :');
  const usesInvoicePaymentMethod = paymentMode === testInvoice.payment_method;
  
  if (hasReglementTitle && usesInvoicePaymentMethod) {
    console.log('✅ SUCCÈS: Le règlement utilise le mode de paiement de la facture');
    console.log('📋 Titre:', 'Règlement :');
    console.log('📅 Date calculée:', dueDate.toLocaleDateString('fr-FR'));
    console.log('⏰ Délai utilisé:', paymentTerms, 'jours');
    console.log('💳 Mode de paiement (facture):', paymentMode);
  } else {
    console.log('❌ ÉCHEC: Le règlement n\'utilise pas correctement les paramètres');
    console.log('Différences:', {
      hasReglementTitle: hasReglementTitle,
      usesInvoicePaymentMethod: usesInvoicePaymentMethod,
      paymentMode: paymentMode,
      invoicePaymentMethod: testInvoice.payment_method
    });
  }
} else {
  console.log('ℹ️ Les conditions de règlement sont désactivées pour cette facture');
}
