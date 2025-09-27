// Script pour tester l'envoi d'une facture
// Simule l'appel à l'API /api/send-invoice

import fetch from 'node-fetch';

async function testSendInvoice(invoiceId) {
  try {
    console.log(`🚀 Test envoi facture ID: ${invoiceId}`);
    
    const response = await fetch('http://localhost:3001/api/send-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ invoiceId })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Facture envoyée avec succès !');
      console.log('📧 Réponse:', result);
    } else {
      console.log('❌ Erreur lors de l\'envoi:');
      console.log('📧 Réponse:', result);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Utilisation
const invoiceId = process.argv[2];
if (!invoiceId) {
  console.log('Usage: node test-send-invoice.js <invoice-id>');
  console.log('Exemple: node test-send-invoice.js ba4fb9c9-e460-4d53-b299-08f54a7b09fb');
  process.exit(1);
}

testSendInvoice(invoiceId);
