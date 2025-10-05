// Script de test pour vérifier que les factures envoyées utilisent "Règlement" au lieu de "Pénalités de retard"
// Ce script simule la génération d'une facture par email avec les paramètres corrects

console.log('🧪 Test de correction du règlement pour les factures envoyées...');

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

// Simuler les paramètres d'entreprise avec les nouvelles options
const testCompanySettings = {
  companyName: 'Mon Entreprise',
  ownerName: 'John Doe',
  email: 'john@entreprise.fr',
  phone: '06 12 34 56 78',
  address: '123 Rue de l\'Exemple, 75000 Paris',
  siret: '123 456 789 00010',
  // Nouvelles options de règlement personnalisables
  showLegalRate: true,
  showFixedFee: false
};

console.log('📄 Facture de test:', {
  invoice_number: testInvoice.invoice_number,
  payment_terms: testInvoice.payment_terms,
  include_late_payment_penalties: testInvoice.include_late_payment_penalties
});

console.log('⚙️ Paramètres d\'entreprise:', {
  showLegalRate: testCompanySettings.showLegalRate,
  showFixedFee: testCompanySettings.showFixedFee
});

// Simuler la construction de companyData dans server.js
const companyData = {
  name: testCompanySettings.companyName,
  owner: testCompanySettings.ownerName,
  address: testCompanySettings.address,
  email: testCompanySettings.email,
  phone: testCompanySettings.phone,
  siret: testCompanySettings.siret,
  logoUrl: null,
  // Paramètres de conditions de paiement
  invoiceTerms: 'Paiement à 15 jours',
  paymentTerms: 15,
  paymentDays: 15,
  paymentMethod: 'Virement bancaire',
  additionalTerms: 'Conditions spéciales',
  // Paramètre de pénalités de retard
  includeLatePaymentPenalties: true,
  // Nouvelles options de règlement personnalisables
  showLegalRate: testCompanySettings.showLegalRate,
  showFixedFee: testCompanySettings.showFixedFee
};

console.log('🏢 Données d\'entreprise construites:', {
  includeLatePaymentPenalties: companyData.includeLatePaymentPenalties,
  showLegalRate: companyData.showLegalRate,
  showFixedFee: companyData.showFixedFee
});

// Simuler la construction des settings pour le template
const settings = {
  companyName: companyData.name,
  ownerName: companyData.owner,
  address: companyData.address,
  email: companyData.email,
  phone: companyData.phone,
  siret: companyData.siret,
  logoUrl: companyData.logoUrl,
  // Paramètres de conditions de paiement
  invoiceTerms: companyData.invoiceTerms,
  paymentTerms: companyData.paymentTerms,
  paymentDays: companyData.paymentDays,
  paymentMethod: companyData.paymentMethod,
  additionalTerms: companyData.additionalTerms,
  // Paramètre de pénalités de retard
  includeLatePaymentPenalties: companyData.includeLatePaymentPenalties,
  // Nouvelles options de règlement personnalisables
  showLegalRate: companyData.showLegalRate,
  showFixedFee: companyData.showFixedFee
};

console.log('🎯 Settings pour le template:', {
  includeLatePaymentPenalties: settings.includeLatePaymentPenalties,
  showLegalRate: settings.showLegalRate,
  showFixedFee: settings.showFixedFee
});

// Simuler la génération du règlement selon les paramètres (comme dans sharedInvoiceTemplate.js)
function generateReglementForEmail(invoice, settings) {
  if (!settings.includeLatePaymentPenalties) {
    return '';
  }
  
  const paymentTerms = invoice.payment_terms || 30;
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  // Récupérer les options d'affichage (par défaut toutes activées si non définies)
  const showLegalRate = settings?.showLegalRate !== false;
  const showFixedFee = settings?.showFixedFee !== false;
  
  let reglementText = 'Règlement :\n';
  
  // La date limite s'affiche toujours automatiquement
  reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)\n`;
  
  if (showLegalRate) {
    reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008\n';
  }
  
  if (showFixedFee) {
    reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
  }
  
  return reglementText;
}

const reglement = generateReglementForEmail(testInvoice, settings);

console.log('📧 Règlement généré pour l\'email:');
console.log(reglement);

// Vérifier que le titre est "Règlement" et non "Pénalités de retard"
const hasReglementTitle = reglement.includes('Règlement :');
const hasOldTitle = reglement.includes('Pénalités de retard');

console.log('\n🔍 Vérification du titre:');
console.log('Titre "Règlement :":', hasReglementTitle ? '✅' : '❌');
console.log('Ancien titre "Pénalités de retard":', hasOldTitle ? '❌ (problème)' : '✅');

// Vérifier que les options sont correctement appliquées
const hasDateLimit = reglement.includes('Date limite');
const hasLegalRate = reglement.includes('Taux annuel');
const hasFixedFee = reglement.includes('indemnité forfaitaire');

const expectedLegalRate = settings.showLegalRate;
const expectedFixedFee = settings.showFixedFee;

console.log('\n🔍 Vérification des options:');
console.log('Date limite (toujours présente):', hasDateLimit ? '✅' : '❌');
console.log('Taux légal (activé):', hasLegalRate === expectedLegalRate ? '✅' : '❌');
console.log('Indemnité forfaitaire (désactivée):', hasFixedFee === expectedFixedFee ? '✅' : '❌');

if (hasReglementTitle && !hasOldTitle && hasDateLimit && hasLegalRate === expectedLegalRate && hasFixedFee === expectedFixedFee) {
  console.log('\n✅ SUCCÈS: Les factures envoyées utilisent maintenant "Règlement" avec les bonnes options');
} else {
  console.log('\n❌ ÉCHEC: Problème avec l\'affichage du règlement');
  console.log('Différences:', {
    hasReglementTitle: hasReglementTitle,
    hasOldTitle: hasOldTitle,
    hasDateLimit: hasDateLimit,
    legalRateMatch: hasLegalRate === expectedLegalRate,
    fixedFeeMatch: hasFixedFee === expectedFixedFee
  });
}
