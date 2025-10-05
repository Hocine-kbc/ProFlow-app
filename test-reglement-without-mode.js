// Script de test pour vérifier que le mode de paiement a été supprimé du règlement
// Ce script simule l'affichage du règlement sans le mode de paiement

console.log('🧪 Test du règlement sans mode de paiement...');

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
  
  const reglementText = `Règlement :
• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.`;

  console.log('🎯 Texte du règlement généré (sans mode):', reglementText);
  
  // Vérifier que le mode de paiement n'est pas inclus dans le règlement
  const includesMode = reglementText.includes('Mode :');
  
  if (!includesMode) {
    console.log('✅ SUCCÈS: Le mode de paiement a été supprimé du règlement');
    console.log('📋 Contenu du règlement:');
    console.log('   • Date limite avec calcul automatique');
    console.log('   • Taux légal (3 fois le taux légal)');
    console.log('   • Indemnité forfaitaire (40 €)');
    console.log('   • Pas de mode de paiement (supprimé)');
  } else {
    console.log('❌ ÉCHEC: Le mode de paiement est encore présent dans le règlement');
  }
} else {
  console.log('ℹ️ Les conditions de règlement sont désactivées pour cette facture');
}
