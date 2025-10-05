// Script de debug pour vérifier la persistance des paramètres
// Ce script simule le processus complet de sauvegarde et récupération

console.log('🔍 Debug de la persistance des paramètres...');

// Simuler l'interface utilisateur avec les nouvelles options
const userInterfaceSettings = {
  companyName: 'Mon Entreprise',
  ownerName: 'John Doe',
  email: 'john@entreprise.fr',
  phone: '06 12 34 56 78',
  address: '123 Rue de l\'Exemple, 75000 Paris',
  siret: '123 456 789 00010',
  defaultHourlyRate: 25,
  invoicePrefix: 'FAC',
  paymentTerms: 30,
  logoUrl: '',
  invoiceTerms: 'Paiement à 30 jours',
  includeLatePaymentPenalties: false, // Pénalités désactivées
  paymentMethod: 'Virement bancaire',
  additionalTerms: 'Conditions spéciales',
  // Nouvelles options de règlement
  showLegalRate: true,  // Taux légal activé
  showFixedFee: false   // Indemnité désactivée
};

console.log('📋 Paramètres de l\'interface utilisateur:');
console.log({
  includeLatePaymentPenalties: userInterfaceSettings.includeLatePaymentPenalties,
  showLegalRate: userInterfaceSettings.showLegalRate,
  showFixedFee: userInterfaceSettings.showFixedFee
});

// Simuler la sauvegarde via upsertSettings()
const upsertData = {
  id: 'test-user-id',
  user_id: 'test-user-id',
  companyname: userInterfaceSettings.companyName,
  ownername: userInterfaceSettings.ownerName,
  email: userInterfaceSettings.email,
  phone: userInterfaceSettings.phone,
  address: userInterfaceSettings.address,
  siret: userInterfaceSettings.siret,
  defaulthourlyrate: userInterfaceSettings.defaultHourlyRate,
  invoiceprefix: userInterfaceSettings.invoicePrefix,
  paymentterms: userInterfaceSettings.paymentTerms,
  logourl: userInterfaceSettings.logoUrl,
  invoiceterms: userInterfaceSettings.invoiceTerms,
  includelatepaymentpenalties: userInterfaceSettings.includeLatePaymentPenalties,
  paymentmethod: userInterfaceSettings.paymentMethod,
  additionalterms: userInterfaceSettings.additionalTerms,
  show_legal_rate: userInterfaceSettings.showLegalRate,
  show_fixed_fee: userInterfaceSettings.showFixedFee,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString()
};

console.log('\n💾 Données sauvegardées en base de données:');
console.log({
  includelatepaymentpenalties: upsertData.includelatepaymentpenalties,
  show_legal_rate: upsertData.show_legal_rate,
  show_fixed_fee: upsertData.show_fixed_fee
});

// Simuler la récupération via fetchSettings()
const dbData = {
  id: 'test-user-id',
  user_id: 'test-user-id',
  companyname: 'Mon Entreprise',
  ownername: 'John Doe',
  email: 'john@entreprise.fr',
  phone: '06 12 34 56 78',
  address: '123 Rue de l\'Exemple, 75000 Paris',
  siret: '123 456 789 00010',
  defaulthourlyrate: 25,
  invoiceprefix: 'FAC',
  paymentterms: 30,
  logourl: '',
  invoiceterms: 'Paiement à 30 jours',
  includelatepaymentpenalties: false,
  paymentmethod: 'Virement bancaire',
  additionalterms: 'Conditions spéciales',
  show_legal_rate: true,
  show_fixed_fee: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log('\n📥 Données récupérées de la base de données:');
console.log({
  includelatepaymentpenalties: dbData.includelatepaymentpenalties,
  show_legal_rate: dbData.show_legal_rate,
  show_fixed_fee: dbData.show_fixed_fee
});

// Simuler le mapping dans fetchSettings()
const mappedSettings = {
  id: dbData.id,
  companyName: dbData.companyname ?? '',
  ownerName: dbData.ownername ?? '',
  email: dbData.email ?? '',
  phone: dbData.phone ?? '',
  address: dbData.address ?? '',
  siret: dbData.siret ?? '',
  defaultHourlyRate: dbData.defaulthourlyrate ?? 0,
  invoicePrefix: dbData.invoiceprefix ?? '',
  paymentTerms: dbData.paymentterms ?? 0,
  logoUrl: dbData.logourl ?? '',
  invoiceTerms: dbData.invoiceterms ?? '',
  includeLatePaymentPenalties: dbData.includelatepaymentpenalties ?? false,
  paymentMethod: dbData.paymentmethod,
  additionalTerms: dbData.additionalterms,
  showLegalRate: dbData.show_legal_rate ?? true,
  showFixedFee: dbData.show_fixed_fee ?? true,
  created_at: dbData.created_at,
  updated_at: dbData.updated_at
};

console.log('\n🔄 Paramètres mappés pour l\'application:');
console.log({
  includeLatePaymentPenalties: mappedSettings.includeLatePaymentPenalties,
  showLegalRate: mappedSettings.showLegalRate,
  showFixedFee: mappedSettings.showFixedFee
});

// Vérifier la cohérence
const saveSuccess = 
  upsertData.show_legal_rate === userInterfaceSettings.showLegalRate &&
  upsertData.show_fixed_fee === userInterfaceSettings.showFixedFee;

const retrieveSuccess = 
  mappedSettings.showLegalRate === userInterfaceSettings.showLegalRate &&
  mappedSettings.showFixedFee === userInterfaceSettings.showFixedFee;

console.log('\n🔍 Vérification de la persistance:');
console.log('Sauvegarde réussie:', saveSuccess ? '✅' : '❌');
console.log('Récupération réussie:', retrieveSuccess ? '✅' : '❌');

if (saveSuccess && retrieveSuccess) {
  console.log('\n✅ SUCCÈS: Les paramètres sont correctement sauvegardés et récupérés');
} else {
  console.log('\n❌ ÉCHEC: Problème avec la persistance des paramètres');
  console.log('Différences:', {
    saveSuccess: saveSuccess,
    retrieveSuccess: retrieveSuccess,
    expectedShowLegalRate: userInterfaceSettings.showLegalRate,
    savedShowLegalRate: upsertData.show_legal_rate,
    retrievedShowLegalRate: mappedSettings.showLegalRate,
    expectedShowFixedFee: userInterfaceSettings.showFixedFee,
    savedShowFixedFee: upsertData.show_fixed_fee,
    retrievedShowFixedFee: mappedSettings.showFixedFee
  });
}

console.log('\n🔍 Actions à vérifier:');
console.log('1. Le script SQL a-t-il été exécuté dans Supabase ?');
console.log('2. Les colonnes show_legal_rate et show_fixed_fee existent-elles ?');
console.log('3. Les paramètres sont-ils sauvegardés avec ces colonnes ?');
console.log('4. Les paramètres sont-ils récupérés avec ces colonnes ?');
console.log('5. Le mapping dans fetchSettings() fonctionne-t-il ?');
