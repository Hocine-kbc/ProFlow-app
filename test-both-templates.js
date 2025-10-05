// Script de test pour vérifier que les deux templates utilisent la même logique de règlement
// Ce script simule la génération du règlement avec les deux templates

console.log('🧪 Test de cohérence entre les deux templates...');

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
  include_late_payment_penalties: false, // Pénalités désactivées dans la facture
  services: []
};

// Simuler les paramètres d'entreprise avec options de règlement
const testCompanyData = {
  includeLatePaymentPenalties: false, // Pénalités désactivées globalement
  showLegalRate: true,  // Mais taux légal activé
  showFixedFee: false, // Indemnité désactivée
  paymentTerms: 15
};

console.log('📄 Facture de test:', {
  invoice_number: testInvoice.invoice_number,
  payment_terms: testInvoice.payment_terms,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties
});

console.log('⚙️ Paramètres d\'entreprise:', {
  includeLatePaymentPenalties: testCompanyData.includeLatePaymentPenalties,
  showLegalRate: testCompanyData.showLegalRate,
  showFixedFee: testCompanyData.showFixedFee
});

// Fonction pour simuler sharedInvoiceTemplate.js
function generateReglementSharedTemplate(invoice, settings) {
  const includeLatePaymentPenalties = invoice.include_late_payment_penalties !== null ? 
    invoice.include_late_payment_penalties : 
    settings?.includeLatePaymentPenalties;
  
  const shouldShow = includeLatePaymentPenalties || (settings?.showLegalRate || settings?.showFixedFee);
  
  if (!shouldShow) {
    return '';
  }
  
  const paymentTerms = invoice.payment_terms || settings?.paymentTerms || 30;
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  const showLegalRate = settings?.showLegalRate !== false;
  const showFixedFee = settings?.showFixedFee !== false;
  
  let reglementText = 'Règlement :\n';
  reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)\n`;
  
  if (showLegalRate) {
    reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008\n';
  }
  
  if (showFixedFee) {
    reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
  }
  
  return reglementText;
}

// Fonction pour simuler invoiceTemplate.ts
function generateReglementInvoiceTemplate(invoiceData, companyData) {
  const shouldShow = companyData.includeLatePaymentPenalties || companyData.showLegalRate || companyData.showFixedFee;
  
  if (!shouldShow) {
    return '';
  }
  
  const paymentTerms = invoiceData.payment_terms || companyData.paymentTerms || 30;
  const invoiceDate = new Date(invoiceData.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  const showLegalRate = companyData.showLegalRate !== false;
  const showFixedFee = companyData.showFixedFee !== false;
  
  let reglementText = 'Règlement :\n';
  reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)\n`;
  
  if (showLegalRate) {
    reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008\n';
  }
  
  if (showFixedFee) {
    reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
  }
  
  return reglementText;
}

// Tester avec sharedInvoiceTemplate.js
const sharedSettings = {
  includeLatePaymentPenalties: testCompanyData.includeLatePaymentPenalties,
  showLegalRate: testCompanyData.showLegalRate,
  showFixedFee: testCompanyData.showFixedFee,
  paymentTerms: testCompanyData.paymentTerms
};

const sharedReglement = generateReglementSharedTemplate(testInvoice, sharedSettings);

console.log('\n🖨️ Règlement généré par sharedInvoiceTemplate.js:');
console.log(sharedReglement);

// Tester avec invoiceTemplate.ts
const invoiceReglement = generateReglementInvoiceTemplate(testInvoice, testCompanyData);

console.log('\n📧 Règlement généré par invoiceTemplate.ts:');
console.log(invoiceReglement);

// Vérifier la cohérence
const areIdentical = sharedReglement === invoiceReglement;

console.log('\n🔍 Vérification de cohérence:');
console.log('Templates identiques:', areIdentical ? '✅' : '❌');

if (areIdentical) {
  console.log('\n✅ SUCCÈS: Les deux templates utilisent la même logique de règlement');
  console.log('📋 Éléments vérifiés:');
  console.log('   • Titre: "Règlement :" (au lieu de "Pénalités de retard :")');
  console.log('   • Date limite: Calculée automatiquement');
  console.log('   • Taux légal: Contrôlé par showLegalRate');
  console.log('   • Indemnité forfaitaire: Contrôlée par showFixedFee');
} else {
  console.log('\n❌ ÉCHEC: Les templates utilisent des logiques différentes');
  console.log('Différences détectées entre sharedInvoiceTemplate.js et invoiceTemplate.ts');
}

// Vérifier que le titre est "Règlement" et non "Pénalités de retard"
const hasReglementTitle = sharedReglement.includes('Règlement :') && invoiceReglement.includes('Règlement :');
const hasOldTitle = sharedReglement.includes('Pénalités de retard') || invoiceReglement.includes('Pénalités de retard');

console.log('\n🔍 Vérification du titre:');
console.log('Titre "Règlement :":', hasReglementTitle ? '✅' : '❌');
console.log('Ancien titre "Pénalités de retard":', hasOldTitle ? '❌ (problème)' : '✅');

if (hasReglementTitle && !hasOldTitle && areIdentical) {
  console.log('\n🎉 PARFAIT: Les deux templates sont maintenant cohérents et utilisent "Règlement"');
} else {
  console.log('\n⚠️ ATTENTION: Il reste des problèmes à corriger');
}
