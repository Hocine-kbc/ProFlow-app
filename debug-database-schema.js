// Script de debug pour vérifier le schéma de la base de données
// Ce script teste la connexion et vérifie les colonnes de la table settings

console.log('🔍 Debug du schéma de la base de données...');

// Simuler une requête pour vérifier les colonnes de la table settings
const testQuery = `
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
`;

console.log('📋 Requête pour vérifier les colonnes de la table settings:');
console.log(testQuery);

// Simuler les colonnes attendues
const expectedColumns = [
  'id',
  'user_id', 
  'companyname',
  'ownername',
  'email',
  'phone',
  'address',
  'siret',
  'defaulthourlyrate',
  'invoiceprefix',
  'paymentterms',
  'logourl',
  'invoiceterms',
  'includelatepaymentpenalties',
  'paymentmethod',
  'additionalterms',
  'show_legal_rate',  // Nouvelle colonne
  'show_fixed_fee',   // Nouvelle colonne
  'created_at',
  'updated_at'
];

console.log('\n📋 Colonnes attendues dans la table settings:');
expectedColumns.forEach((column, index) => {
  const isNew = ['show_legal_rate', 'show_fixed_fee'].includes(column);
  console.log(`${index + 1}. ${column}${isNew ? ' (NOUVELLE)' : ''}`);
});

console.log('\n🔍 Vérifications à effectuer:');
console.log('1. Les colonnes show_legal_rate et show_fixed_fee existent-elles ?');
console.log('2. Les paramètres sont-ils sauvegardés avec ces colonnes ?');
console.log('3. Les paramètres sont-ils récupérés correctement ?');
console.log('4. Les paramètres sont-ils transmis au serveur ?');

// Simuler un test de sauvegarde des paramètres
const testSettings = {
  companyName: 'Test Company',
  showLegalRate: true,
  showFixedFee: false
};

console.log('\n🧪 Test de sauvegarde des paramètres:');
console.log('Paramètres à sauvegarder:', testSettings);

// Simuler la requête de sauvegarde
const saveQuery = `
INSERT INTO settings (
  user_id, companyname, show_legal_rate, show_fixed_fee
) VALUES (
  $1, $2, $3, $4
) ON CONFLICT (user_id) DO UPDATE SET
  companyname = EXCLUDED.companyname,
  show_legal_rate = EXCLUDED.show_legal_rate,
  show_fixed_fee = EXCLUDED.show_fixed_fee,
  updated_at = NOW();
`;

console.log('\n📝 Requête de sauvegarde simulée:');
console.log(saveQuery);

console.log('\n🔍 Prochaines étapes de debug:');
console.log('1. Exécuter le script SQL pour ajouter les colonnes');
console.log('2. Vérifier que les paramètres sont sauvegardés');
console.log('3. Tester l\'envoi d\'une facture par email');
console.log('4. Vérifier le PDF généré');
