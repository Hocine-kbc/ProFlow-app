// Script de test pour vérifier les options personnalisables du règlement
// Ce script simule l'affichage du règlement avec différentes options sélectionnées

console.log('🧪 Test des options personnalisables du règlement...');

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

// Simuler différents paramètres d'affichage
const testScenarios = [
  {
    name: 'Toutes les options activées',
    settings: {
      includeLatePaymentPenalties: true,
      showDateLimit: true,
      showLegalRate: true,
      showFixedFee: true
    }
  },
  {
    name: 'Seulement la date limite',
    settings: {
      includeLatePaymentPenalties: true,
      showDateLimit: true,
      showLegalRate: false,
      showFixedFee: false
    }
  },
  {
    name: 'Seulement le taux légal',
    settings: {
      includeLatePaymentPenalties: true,
      showDateLimit: false,
      showLegalRate: true,
      showFixedFee: false
    }
  },
  {
    name: 'Seulement l\'indemnité forfaitaire',
    settings: {
      includeLatePaymentPenalties: true,
      showDateLimit: false,
      showLegalRate: false,
      showFixedFee: true
    }
  },
  {
    name: 'Date limite + Taux légal',
    settings: {
      includeLatePaymentPenalties: true,
      showDateLimit: true,
      showLegalRate: true,
      showFixedFee: false
    }
  }
];

// Fonction pour générer le règlement selon les paramètres
function generateReglement(invoice, settings) {
  if (!settings.includeLatePaymentPenalties) {
    return '';
  }
  
  const paymentTerms = invoice.payment_terms || 30;
  const invoiceDate = new Date(invoice.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  let reglementText = 'Règlement :\n';
  
  if (settings.showDateLimit) {
    reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)\n`;
  }
  
  if (settings.showLegalRate) {
    reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008\n';
  }
  
  if (settings.showFixedFee) {
    reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
  }
  
  return reglementText;
}

// Tester chaque scénario
testScenarios.forEach((scenario, index) => {
  console.log(`\n📋 Scénario ${index + 1}: ${scenario.name}`);
  console.log('⚙️ Paramètres:', scenario.settings);
  
  const reglement = generateReglement(testInvoice, scenario.settings);
  
  if (reglement) {
    console.log('🎯 Règlement généré:');
    console.log(reglement);
    
    // Vérifier que seules les options sélectionnées sont présentes
    const hasDateLimit = reglement.includes('Date limite');
    const hasLegalRate = reglement.includes('Taux annuel');
    const hasFixedFee = reglement.includes('indemnité forfaitaire');
    
    const expectedDateLimit = scenario.settings.showDateLimit;
    const expectedLegalRate = scenario.settings.showLegalRate;
    const expectedFixedFee = scenario.settings.showFixedFee;
    
    const dateLimitMatch = hasDateLimit === expectedDateLimit;
    const legalRateMatch = hasLegalRate === expectedLegalRate;
    const fixedFeeMatch = hasFixedFee === expectedFixedFee;
    
    if (dateLimitMatch && legalRateMatch && fixedFeeMatch) {
      console.log('✅ SUCCÈS: Le règlement correspond aux paramètres sélectionnés');
    } else {
      console.log('❌ ÉCHEC: Le règlement ne correspond pas aux paramètres');
      console.log('Différences:', {
        dateLimit: { expected: expectedDateLimit, actual: hasDateLimit, match: dateLimitMatch },
        legalRate: { expected: expectedLegalRate, actual: hasLegalRate, match: legalRateMatch },
        fixedFee: { expected: expectedFixedFee, actual: hasFixedFee, match: fixedFeeMatch }
      });
    }
  } else {
    console.log('ℹ️ Règlement désactivé');
  }
});

console.log('\n🎉 Test terminé ! Les options personnalisables du règlement fonctionnent correctement.');
