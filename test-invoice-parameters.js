// Script de test pour vérifier que les paramètres de facture sont correctement préservés
// Ce script simule la création d'une facture avec des paramètres spécifiques

const { createInvoice, fetchInvoices, fetchSettings } = require('./src/lib/api.ts');

async function testInvoiceParameters() {
  console.log('🧪 Test des paramètres de facture...');
  
  try {
    // 1. Récupérer les paramètres actuels
    console.log('📋 Récupération des paramètres actuels...');
    const currentSettings = await fetchSettings();
    console.log('Paramètres actuels:', {
      invoiceTerms: currentSettings?.invoiceTerms,
      paymentTerms: currentSettings?.paymentTerms,
      includeLatePaymentPenalties: currentSettings?.includeLatePaymentPenalties
    });
    
    // 2. Créer une facture de test
    console.log('📄 Création d\'une facture de test...');
    const testInvoice = await createInvoice({
      client_id: 'test-client-id',
      invoice_number: 'TEST-001',
      date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: 100,
      net_amount: 100,
      status: 'draft',
      services: []
    });
    
    console.log('Facture créée:', {
      id: testInvoice.id,
      invoice_terms: testInvoice.invoice_terms,
      payment_terms: testInvoice.payment_terms,
      include_late_payment_penalties: testInvoice.include_late_payment_penalties
    });
    
    // 3. Vérifier que les paramètres sont bien sauvegardés
    console.log('✅ Vérification des paramètres sauvegardés...');
    const invoices = await fetchInvoices();
    const createdInvoice = invoices.find(inv => inv.id === testInvoice.id);
    
    if (createdInvoice) {
      console.log('Paramètres de la facture récupérée:', {
        invoice_terms: createdInvoice.invoice_terms,
        payment_terms: createdInvoice.payment_terms,
        include_late_payment_penalties: createdInvoice.include_late_payment_penalties
      });
      
      // Vérifier que les paramètres correspondent aux paramètres actuels
      const paramsMatch = 
        createdInvoice.invoice_terms === currentSettings?.invoiceTerms &&
        createdInvoice.payment_terms === currentSettings?.paymentTerms &&
        createdInvoice.include_late_payment_penalties === currentSettings?.includeLatePaymentPenalties;
        
      if (paramsMatch) {
        console.log('✅ SUCCÈS: Les paramètres de la facture correspondent aux paramètres actuels');
      } else {
        console.log('❌ ÉCHEC: Les paramètres de la facture ne correspondent pas aux paramètres actuels');
      }
    } else {
      console.log('❌ ÉCHEC: Impossible de récupérer la facture créée');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Exécuter le test
testInvoiceParameters();
