// Script de test pour vérifier la logique d'affichage du règlement dans le template
// Ce script simule les différentes conditions d'affichage du règlement

console.log('🧪 Test de la logique d\'affichage du règlement dans le template...');

// Simuler une facture avec différents paramètres
const testScenarios = [
  {
    name: 'Pénalités activées dans la facture',
    invoice: {
      include_late_payment_penalties: true,
      payment_terms: 15
    },
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: false,
      showFixedFee: false
    }
  },
  {
    name: 'Pénalités désactivées dans la facture, mais options de règlement activées',
    invoice: {
      include_late_payment_penalties: false,
      payment_terms: 15
    },
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: true,
      showFixedFee: false
    }
  },
  {
    name: 'Pénalités désactivées dans la facture et options de règlement désactivées',
    invoice: {
      include_late_payment_penalties: false,
      payment_terms: 15
    },
    settings: {
      includeLatePaymentPenalties: false,
      showLegalRate: false,
      showFixedFee: false
    }
  },
  {
    name: 'Pénalités activées globalement',
    invoice: {
      include_late_payment_penalties: null,
      payment_terms: 15
    },
    settings: {
      includeLatePaymentPenalties: true,
      showLegalRate: true,
      showFixedFee: true
    }
  }
];

// Fonction pour simuler la logique du template
function shouldShowReglement(invoice, settings) {
  // Logique originale : pénalités de retard activées
  const originalLogic = invoice.include_late_payment_penalties !== null ? 
    invoice.include_late_payment_penalties : 
    settings?.includeLatePaymentPenalties;
  
  // Nouvelle logique : pénalités OU options de règlement
  const newLogic = originalLogic || (settings?.showLegalRate || settings?.showFixedFee);
  
  return {
    originalLogic,
    newLogic,
    showReglement: newLogic
  };
}

// Fonction pour générer le règlement
function generateReglement(invoice, settings) {
  const logic = shouldShowReglement(invoice, settings);
  
  if (!logic.showReglement) {
    return '';
  }
  
  const paymentTerms = invoice.payment_terms || settings?.paymentTerms || 30;
  const invoiceDate = new Date('2025-01-01');
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

// Tester chaque scénario
testScenarios.forEach((scenario, index) => {
  console.log(`\n📋 Scénario ${index + 1}: ${scenario.name}`);
  console.log('📄 Facture:', {
    include_late_payment_penalties: scenario.invoice.include_late_payment_penalties,
    payment_terms: scenario.invoice.payment_terms
  });
  console.log('⚙️ Paramètres:', {
    includeLatePaymentPenalties: scenario.settings.includeLatePaymentPenalties,
    showLegalRate: scenario.settings.showLegalRate,
    showFixedFee: scenario.settings.showFixedFee
  });
  
  const logic = shouldShowReglement(scenario.invoice, scenario.settings);
  console.log('🔍 Logique d\'affichage:', {
    originalLogic: logic.originalLogic,
    newLogic: logic.newLogic,
    showReglement: logic.showReglement
  });
  
  const reglement = generateReglement(scenario.invoice, scenario.settings);
  
  if (reglement) {
    console.log('🎯 Règlement généré:');
    console.log(reglement);
  } else {
    console.log('❌ Aucun règlement généré');
  }
  
  // Vérifier si le résultat est cohérent
  const expectedShow = scenario.settings.showLegalRate || scenario.settings.showFixedFee || logic.originalLogic;
  const actualShow = logic.showReglement;
  
  console.log('✅ Cohérence:', expectedShow === actualShow ? '✅' : '❌');
});

console.log('\n🔍 Analyse de la logique:');
console.log('Ancienne logique: Seulement si includeLatePaymentPenalties = true');
console.log('Nouvelle logique: Si includeLatePaymentPenalties = true OU si showLegalRate/showFixedFee = true');
console.log('Avantage: Le règlement s\'affiche même si les pénalités sont désactivées mais que des options de règlement sont configurées');
