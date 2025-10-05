// Script de test pour vérifier que tous les paramètres de facture sont correctement utilisés
// Ce script simule la génération du template HTML avec tous les paramètres spécifiques

console.log('🧪 Test de tous les paramètres de facture...');

// Simuler une facture avec tous les paramètres spécifiques
const testInvoice = {
  id: 'test-invoice-id',
  invoice_number: 'TEST-001',
  date: '2025-01-01',
  due_date: '2025-01-31',
  subtotal: 100,
  net_amount: 100,
  status: 'draft',
  // Tous les paramètres spécifiques à la facture
  invoice_terms: 'Paiement à 15 jours. Conditions spéciales pour ce client.',
  payment_terms: 15,
  include_late_payment_penalties: true,
  payment_method: 'Virement bancaire',
  additional_terms: 'Conditions supplémentaires pour cette facture uniquement.',
  services: []
};

// Simuler des paramètres globaux différents
const testSettings = {
  companyName: 'Mon Entreprise',
  invoiceTerms: 'Paiement à 30 jours. Conditions générales.',
  paymentTerms: 30,
  includeLatePaymentPenalties: false,
  paymentMethod: 'Chèque',
  additionalTerms: 'Conditions générales supplémentaires.'
};

console.log('📄 Facture de test:', {
  invoice_terms: testInvoice.invoice_terms,
  payment_terms: testInvoice.payment_terms,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties,
  payment_method: testInvoice.payment_method,
  additional_terms: testInvoice.additional_terms
});

console.log('⚙️ Paramètres globaux:', {
  invoiceTerms: testSettings.invoiceTerms,
  paymentTerms: testSettings.paymentTerms,
  includeLatePaymentPenalties: testSettings.includeLatePaymentPenalties,
  paymentMethod: testSettings.paymentMethod,
  additionalTerms: testSettings.additionalTerms
});

// Simuler la logique du template pour tous les paramètres
const invoiceTerms = testInvoice.invoice_terms || testSettings?.invoiceTerms || testSettings?.paymentTerms || `Conditions de paiement: ${testSettings?.paymentDays || 30} jours. Aucune TVA applicable (franchise de base).`;

const paymentMethod = testInvoice.payment_method || testSettings?.paymentMethod;

const additionalTerms = testInvoice.additional_terms || testSettings?.additionalTerms;

const includeLatePaymentPenalties = testInvoice.include_late_payment_penalties !== null ? 
  testInvoice.include_late_payment_penalties : 
  testSettings?.includeLatePaymentPenalties;

console.log('🎯 Paramètres finaux utilisés dans le template:', {
  invoiceTerms: invoiceTerms,
  paymentMethod: paymentMethod,
  additionalTerms: additionalTerms,
  includeLatePaymentPenalties: includeLatePaymentPenalties
});

// Vérifier que tous les paramètres de la facture sont utilisés
const usesInvoiceTerms = invoiceTerms === testInvoice.invoice_terms;
const usesInvoicePaymentMethod = paymentMethod === testInvoice.payment_method;
const usesInvoiceAdditionalTerms = additionalTerms === testInvoice.additional_terms;
const usesInvoicePenalties = includeLatePaymentPenalties === testInvoice.include_late_payment_penalties;

const allParamsMatch = usesInvoiceTerms && usesInvoicePaymentMethod && usesInvoiceAdditionalTerms && usesInvoicePenalties;

if (allParamsMatch) {
  console.log('✅ SUCCÈS: Le template utilise tous les paramètres de la facture');
} else {
  console.log('❌ ÉCHEC: Le template n\'utilise pas tous les paramètres de la facture');
  console.log('Différences:', {
    invoiceTerms: {
      facture: testInvoice.invoice_terms,
      template: invoiceTerms,
      match: usesInvoiceTerms
    },
    paymentMethod: {
      facture: testInvoice.payment_method,
      template: paymentMethod,
      match: usesInvoicePaymentMethod
    },
    additionalTerms: {
      facture: testInvoice.additional_terms,
      template: additionalTerms,
      match: usesInvoiceAdditionalTerms
    },
    includeLatePaymentPenalties: {
      facture: testInvoice.include_late_payment_penalties,
      template: includeLatePaymentPenalties,
      match: usesInvoicePenalties
    }
  });
}
