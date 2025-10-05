// Script de test pour vérifier l'affichage des points du règlement
// Ce script simule l'affichage avec différentes configurations

console.log('🧪 Test de l\'affichage des points du règlement...');

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
  include_late_payment_penalties: false,
  services: []
};

// Simuler différentes configurations de paramètres
const testConfigurations = [
  {
    name: 'Toutes les options activées',
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: true,
      showFixedFee: true
    }
  },
  {
    name: 'Seulement le taux légal',
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: true,
      showFixedFee: false
    }
  },
  {
    name: 'Seulement l\'indemnité forfaitaire',
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: false,
      showFixedFee: true
    }
  },
  {
    name: 'Aucune option (seulement date limite)',
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: false,
      showFixedFee: false
    }
  },
  {
    name: 'Pénalités activées (ancien comportement)',
    settings: {
      includeLatePaymentPenalties: true,
      showLegalRate: true,
      showFixedFee: true
    }
  }
];

// Fonction pour générer le règlement selon les paramètres
function generateReglement(invoice, settings) {
  // Logique d'affichage
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

// Tester chaque configuration
testConfigurations.forEach((config, index) => {
  console.log(`\n📋 Configuration ${index + 1}: ${config.name}`);
  console.log('⚙️ Paramètres:', config.settings);
  
  const reglement = generateReglement(testInvoice, config.settings);
  
  if (reglement) {
    console.log('🎯 Règlement généré:');
    console.log(reglement);
    
    // Analyser les points affichés
    const hasDateLimit = reglement.includes('Date limite');
    const hasLegalRate = reglement.includes('Taux annuel');
    const hasFixedFee = reglement.includes('indemnité forfaitaire');
    
    console.log('📊 Points affichés:');
    console.log('   • Date limite:', hasDateLimit ? '✅' : '❌');
    console.log('   • Taux légal:', hasLegalRate ? '✅' : '❌');
    console.log('   • Indemnité forfaitaire:', hasFixedFee ? '✅' : '❌');
    
    // Vérifier la cohérence avec les paramètres
    const expectedLegalRate = config.settings.showLegalRate;
    const expectedFixedFee = config.settings.showFixedFee;
    
    const legalRateMatch = hasLegalRate === expectedLegalRate;
    const fixedFeeMatch = hasFixedFee === expectedFixedFee;
    
    console.log('🔍 Cohérence:');
    console.log('   • Taux légal (attendu/affiché):', expectedLegalRate, '/', hasLegalRate, legalRateMatch ? '✅' : '❌');
    console.log('   • Indemnité (attendu/affiché):', expectedFixedFee, '/', hasFixedFee, fixedFeeMatch ? '✅' : '❌');
    
    if (legalRateMatch && fixedFeeMatch) {
      console.log('✅ Configuration correcte');
    } else {
      console.log('❌ Problème de cohérence détecté');
    }
  } else {
    console.log('❌ Aucun règlement généré');
  }
});

console.log('\n🔍 Diagnostic des problèmes possibles:');
console.log('1. Les paramètres showLegalRate et showFixedFee sont-ils transmis au template ?');
console.log('2. Les paramètres sont-ils correctement sauvegardés en base ?');
console.log('3. Les paramètres sont-ils correctement récupérés par le serveur ?');
console.log('4. La logique d\'affichage fonctionne-t-elle correctement ?');

console.log('\n📋 Pour déboguer:');
console.log('1. Vérifiez les paramètres dans l\'interface utilisateur');
console.log('2. Vérifiez que les paramètres sont sauvegardés en base');
console.log('3. Vérifiez les logs du serveur pour voir les paramètres transmis');
console.log('4. Testez avec différentes configurations');
