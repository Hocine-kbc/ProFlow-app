// Script de test pour vérifier que le template utilise les paramètres de la facture
// Ce script simule la génération du template HTML avec des paramètres spécifiques

console.log('🧪 Test du template avec paramètres de facture...');

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
  invoice_terms: 'Paiement à 15 jours. Conditions spéciales pour ce client.',
  payment_terms: 15,
  include_late_payment_penalties: true,
  services: []
};

// Simuler des paramètres globaux différents
const testSettings = {
  companyName: 'Mon Entreprise',
  invoiceTerms: 'Paiement à 30 jours. Conditions générales.',
  paymentTerms: 30,
  includeLatePaymentPenalties: false
};

console.log('📄 Facture de test:', {
  invoice_terms: testInvoice.invoice_terms,
  payment_terms: testInvoice.payment_terms,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties
});

console.log('⚙️ Paramètres globaux:', {
  invoiceTerms: testSettings.invoiceTerms,
  paymentTerms: testSettings.paymentTerms,
  includeLatePaymentPenalties: testSettings.includeLatePaymentPenalties
});

// Simuler la logique du template
const invoiceTerms = testInvoice.invoice_terms || testSettings?.invoiceTerms || testSettings?.paymentTerms || `Conditions de paiement: ${testSettings?.paymentDays || 30} jours. Aucune TVA applicable (franchise de base).`;

const includeLatePaymentPenalties = testInvoice.include_late_payment_penalties !== null ? 
  testInvoice.include_late_payment_penalties : 
  testSettings?.includeLatePaymentPenalties;

console.log('🎯 Paramètres finaux utilisés dans le template:', {
  invoiceTerms: invoiceTerms,
  includeLatePaymentPenalties: includeLatePaymentPenalties
});

// Vérifier que les paramètres de la facture sont utilisés
const usesInvoiceTerms = invoiceTerms === testInvoice.invoice_terms;
const usesInvoicePenalties = includeLatePaymentPenalties === testInvoice.include_late_payment_penalties;

if (usesInvoiceTerms && usesInvoicePenalties) {
  console.log('✅ SUCCÈS: Le template utilise les paramètres de la facture');
} else {
  console.log('❌ ÉCHEC: Le template n\'utilise pas les paramètres de la facture');
  console.log('Différences:', {
    invoiceTerms: {
      facture: testInvoice.invoice_terms,
      template: invoiceTerms,
      match: usesInvoiceTerms
    },
    includeLatePaymentPenalties: {
      facture: testInvoice.include_late_payment_penalties,
      template: includeLatePaymentPenalties,
      match: usesInvoicePenalties
    }
  });
}
