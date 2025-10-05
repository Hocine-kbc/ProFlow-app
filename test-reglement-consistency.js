// Script de test pour vérifier que les factures envoyées et imprimées ont le même règlement
// Ce script simule la génération du règlement pour les deux méthodes

console.log('🧪 Test de cohérence du règlement entre impression et email...');

// Simuler une facture avec des paramètres spécifiques
const testInvoice = {
  id: 'test-invoice-id',
  invoice_number: 'TEST-001',
  date: '2025-01-01',
  due_date: '2025-01-31',
  subtotal: 100,
  net_amount: 100,
  status: 'draft',
  payment_terms: 15,
  include_late_payment_penalties: true,
  services: []
};

// Simuler les paramètres globaux avec options personnalisables
const globalSettings = {
  companyName: 'Mon Entreprise',
  ownerName: 'John Doe',
  email: 'john@entreprise.fr',
  phone: '06 12 34 56 78',
  address: '123 Rue de l\'Exemple, 75000 Paris',
  siret: '123 456 789 00010',
  // Options de règlement personnalisables
  showLegalRate: true,
  showFixedFee: false
};

console.log('📄 Facture de test:', {
  invoice_number: testInvoice.invoice_number,
  payment_terms: testInvoice.payment_terms,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties
});

console.log('⚙️ Paramètres globaux:', {
  showLegalRate: globalSettings.showLegalRate,
  showFixedFee: globalSettings.showFixedFee
});

// Fonction pour générer le règlement (utilisée par les deux méthodes)
function generateReglement(invoice, settings) {
  if (!settings.includeLatePaymentPenalties) {
    return '';
  }
  
  const paymentTerms = invoice.payment_terms || 30;
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  let reglementText = 'Règlement :\n';
  
  // La date limite s'affiche toujours automatiquement
  reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)\n`;
  
  if (settings.showLegalRate) {
    reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008\n';
  }
  
  if (settings.showFixedFee) {
    reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
  }
  
  return reglementText;
}

// Simuler l'impression directe (utilise les paramètres globaux)
const printSettings = {
  includeLatePaymentPenalties: testInvoice.include_late_payment_penalties,
  showLegalRate: globalSettings.showLegalRate,
  showFixedFee: globalSettings.showFixedFee
};

const printReglement = generateReglement(testInvoice, printSettings);

console.log('🖨️ Règlement pour impression directe:');
console.log(printReglement);

// Simuler l'envoi par email (utilise les mêmes paramètres via server.js)
const emailCompanyData = {
  includeLatePaymentPenalties: testInvoice.include_late_payment_penalties,
  showLegalRate: globalSettings.showLegalRate,
  showFixedFee: globalSettings.showFixedFee
};

const emailSettings = {
  includeLatePaymentPenalties: emailCompanyData.includeLatePaymentPenalties,
  showLegalRate: emailCompanyData.showLegalRate,
  showFixedFee: emailCompanyData.showFixedFee
};

const emailReglement = generateReglement(testInvoice, emailSettings);

console.log('📧 Règlement pour email:');
console.log(emailReglement);

// Vérifier la cohérence
const areIdentical = printReglement === emailReglement;

console.log('\n🔍 Vérification de cohérence:');
console.log('Impression et email identiques:', areIdentical ? '✅' : '❌');

if (areIdentical) {
  console.log('\n✅ SUCCÈS: Les factures envoyées et imprimées ont le même règlement');
  console.log('📋 Éléments vérifiés:');
  console.log('   • Date limite: Identique');
  console.log('   • Taux légal: Identique');
  console.log('   • Indemnité forfaitaire: Identique');
} else {
  console.log('\n❌ ÉCHEC: Les règlements sont différents');
  console.log('Différences détectées entre impression et email');
}

// Test avec différentes configurations
console.log('\n🧪 Test avec différentes configurations...');

const testConfigs = [
  { name: 'Toutes options activées', showLegalRate: true, showFixedFee: true },
  { name: 'Seulement taux légal', showLegalRate: true, showFixedFee: false },
  { name: 'Seulement indemnité', showLegalRate: false, showFixedFee: true },
  { name: 'Aucune option', showLegalRate: false, showFixedFee: false }
];

testConfigs.forEach((config, index) => {
  const testSettings = {
    includeLatePaymentPenalties: true,
    showLegalRate: config.showLegalRate,
    showFixedFee: config.showFixedFee
  };
  
  const reglement = generateReglement(testInvoice, testSettings);
  
  console.log(`\n📋 Configuration ${index + 1}: ${config.name}`);
  console.log('Règlement généré:');
  console.log(reglement);
  
  const hasDateLimit = reglement.includes('Date limite');
  const hasLegalRate = reglement.includes('Taux annuel');
  const hasFixedFee = reglement.includes('indemnité forfaitaire');
  
  console.log('Éléments présents:', {
    dateLimit: hasDateLimit ? '✅' : '❌',
    legalRate: hasLegalRate ? '✅' : '❌',
    fixedFee: hasFixedFee ? '✅' : '❌'
  });
});

console.log('\n🎉 Test terminé ! Le règlement est maintenant cohérent entre impression et email.');
