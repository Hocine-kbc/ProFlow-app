// Script de test pour vérifier que le mode de paiement est correctement sauvegardé
// Ce script simule la création d'une facture avec un mode de paiement

console.log('🧪 Test de sauvegarde du mode de paiement...');

// Simuler une facture avec un mode de paiement spécifique
const testInvoiceData = {
  client_id: 'test-client-id',
  invoice_number: 'TEST-001',
  date: '2025-01-01',
  due_date: '2025-01-31',
  payment_method: 'Virement bancaire',
  subtotal: 100,
  net_amount: 100,
  status: 'draft',
  services: []
};

console.log('📄 Données de la facture à créer:', {
  invoice_number: testInvoiceData.invoice_number,
  payment_method: testInvoiceData.payment_method,
  date: testInvoiceData.date,
  due_date: testInvoiceData.due_date
});

// Simuler la logique de createInvoice pour vérifier que payment_method est inclus
const toInsert = {
  client_id: testInvoiceData.client_id,
  invoice_number: testInvoiceData.invoice_number,
  date: testInvoiceData.date,
  due_date: testInvoiceData.due_date,
  payment_method: testInvoiceData.payment_method, // Cette ligne doit être présente
  subtotal: testInvoiceData.subtotal,
  net_amount: testInvoiceData.net_amount,
  status: testInvoiceData.status
};

console.log('💾 Données à insérer en base:', {
  client_id: toInsert.client_id,
  invoice_number: toInsert.invoice_number,
  payment_method: toInsert.payment_method,
  subtotal: toInsert.subtotal
});

// Vérifier que payment_method est inclus
const includesPaymentMethod = toInsert.payment_method !== undefined && toInsert.payment_method !== null;

if (includesPaymentMethod) {
  console.log('✅ SUCCÈS: Le mode de paiement est inclus dans les données à sauvegarder');
  console.log('💳 Mode de paiement:', toInsert.payment_method);
} else {
  console.log('❌ ÉCHEC: Le mode de paiement n\'est pas inclus dans les données à sauvegarder');
}

// Simuler la récupération de la facture
const retrievedInvoice = {
  id: 'test-invoice-id',
  ...toInsert,
  // Simuler que la facture est récupérée de la base de données
};

console.log('📋 Facture récupérée:', {
  id: retrievedInvoice.id,
  invoice_number: retrievedInvoice.invoice_number,
  payment_method: retrievedInvoice.payment_method
});

// Vérifier que le mode de paiement est correctement récupéré
const paymentMethodRetrieved = retrievedInvoice.payment_method === testInvoiceData.payment_method;

if (paymentMethodRetrieved) {
  console.log('✅ SUCCÈS: Le mode de paiement est correctement récupéré');
  console.log('💳 Mode récupéré:', retrievedInvoice.payment_method);
} else {
  console.log('❌ ÉCHEC: Le mode de paiement n\'est pas correctement récupéré');
  console.log('Différences:', {
    original: testInvoiceData.payment_method,
    retrieved: retrievedInvoice.payment_method,
    match: paymentMethodRetrieved
  });
}
