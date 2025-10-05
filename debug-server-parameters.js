// Script de debug pour tracer les paramètres transmis au serveur
// Ce script simule le flux complet d'envoi d'email avec les paramètres

console.log('🔍 Debug du flux de paramètres pour les factures envoyées...');

// Simuler les paramètres d'entreprise récupérés par le serveur
const mockCompanySettings = {
  companyName: 'Mon Entreprise',
  ownerName: 'John Doe',
  email: 'john@entreprise.fr',
  phone: '06 12 34 56 78',
  address: '123 Rue de l\'Exemple, 75000 Paris',
  siret: '123 456 789 00010',
  // Paramètres de règlement
  includeLatePaymentPenalties: false,
  showLegalRate: true,
  showFixedFee: false
};

console.log('📋 Paramètres d\'entreprise récupérés par le serveur:');
console.log({
  includeLatePaymentPenalties: mockCompanySettings.includeLatePaymentPenalties,
  showLegalRate: mockCompanySettings.showLegalRate,
  showFixedFee: mockCompanySettings.showFixedFee
});

// Simuler la construction de companyData dans server.js
const companyData = {
  name: mockCompanySettings.companyName,
  owner: mockCompanySettings.ownerName,
  address: mockCompanySettings.address,
  email: mockCompanySettings.email,
  phone: mockCompanySettings.phone,
  siret: mockCompanySettings.siret,
  logoUrl: null,
  // Paramètres de conditions de paiement
  invoiceTerms: 'Paiement à 15 jours',
  paymentTerms: 15,
  paymentDays: 15,
  paymentMethod: 'Virement bancaire',
  additionalTerms: 'Conditions spéciales',
  // Paramètre de pénalités de retard
  includeLatePaymentPenalties: mockCompanySettings.includeLatePaymentPenalties,
  // Nouvelles options de règlement personnalisables
  showLegalRate: mockCompanySettings.showLegalRate,
  showFixedFee: mockCompanySettings.showFixedFee
};

console.log('\n🏢 Données d\'entreprise construites (companyData):');
console.log({
  includeLatePaymentPenalties: companyData.includeLatePaymentPenalties,
  showLegalRate: companyData.showLegalRate,
  showFixedFee: companyData.showFixedFee
});

// Simuler la construction des settings dans puppeteerPdfGenerator.js
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

console.log('\n🎯 Settings transmis au template:');
console.log({
  includeLatePaymentPenalties: settings.includeLatePaymentPenalties,
  showLegalRate: settings.showLegalRate,
  showFixedFee: settings.showFixedFee
});

// Simuler la logique du template sharedInvoiceTemplate.js
const testInvoice = {
  include_late_payment_penalties: false, // Facture sans pénalités
  payment_terms: 15,
  date: '2025-01-01'
};

console.log('\n📄 Facture de test:');
console.log({
  include_late_payment_penalties: testInvoice.include_late_payment_penalties,
  payment_terms: testInvoice.payment_terms
});

// Simuler la condition du template
const includeLatePaymentPenalties = testInvoice.include_late_payment_penalties !== null ? 
  testInvoice.include_late_payment_penalties : 
  settings?.includeLatePaymentPenalties;

const shouldShowReglement = includeLatePaymentPenalties || (settings?.showLegalRate || settings?.showFixedFee);

console.log('\n🔍 Logique d\'affichage du règlement:');
console.log('includeLatePaymentPenalties (facture):', testInvoice.include_late_payment_penalties);
console.log('includeLatePaymentPenalties (settings):', settings?.includeLatePaymentPenalties);
console.log('includeLatePaymentPenalties (final):', includeLatePaymentPenalties);
console.log('showLegalRate:', settings?.showLegalRate);
console.log('showFixedFee:', settings?.showFixedFee);
console.log('shouldShowReglement:', shouldShowReglement);

if (shouldShowReglement) {
  console.log('\n✅ Règlement sera affiché');
  
  // Simuler la génération du règlement
  const paymentTerms = testInvoice.payment_terms || settings?.paymentTerms || 30;
  const invoiceDate = new Date(testInvoice.date);
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
  
  console.log('\n🎯 Règlement généré:');
  console.log(reglementText);
} else {
  console.log('\n❌ Aucun règlement ne sera affiché');
}

console.log('\n🔍 Points de vérification:');
console.log('1. Les paramètres showLegalRate et showFixedFee sont-ils sauvegardés en base ?');
console.log('2. Les paramètres sont-ils récupérés par fetchSettings() ?');
console.log('3. Les paramètres sont-ils transmis au serveur ?');
console.log('4. Les paramètres sont-ils transmis au template ?');
console.log('5. Le template utilise-t-il la bonne logique ?');
