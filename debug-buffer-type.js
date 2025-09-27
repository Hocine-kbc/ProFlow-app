// Debug pour vérifier le type de buffer retourné par Puppeteer
// Pour comprendre pourquoi l'encodage base64 échoue

import { generateInvoicePDFWithPuppeteer } from './src/lib/puppeteerPdfGenerator.js';

async function debugBufferType() {
  try {
    console.log('🔍 Debug type de buffer:');
    console.log('='.repeat(50));
    
    // Données de test
    const testInvoiceData = {
      id: 'test-invoice-id',
      invoice_number: 'FAC-2025-001',
      date: '2025-01-27',
      due_date: '2025-02-27',
      subtotal: 200.00,
      urssaf_deduction: 22,
      net_amount: 156.00,
      client: {
        name: 'Client Test',
        email: 'client@test.com',
        phone: '0123456789',
        address: '123 Rue de Test, 69000 Lyon'
      },
      services: [
        {
          description: 'Développement application web',
          hours: 4,
          hourly_rate: 50.00
        }
      ]
    };

    const testCompanyData = {
      name: 'CleanBiz Pro',
      owner: 'KEBCI Hocine',
      address: '6 avenue Salvador Allende, 69100 Villeurbanne',
      email: 'kebcihocine94@gmail.com',
      phone: '0603543524',
      siret: '123 456 789 00010'
    };
    
    // Générer PDF
    console.log('📄 Génération PDF...');
    const pdfData = await generateInvoicePDFWithPuppeteer(testInvoiceData, testCompanyData);
    
    console.log('📊 Analyse du buffer:');
    console.log('   Type:', typeof pdfData.buffer);
    console.log('   Constructor:', pdfData.buffer.constructor.name);
    console.log('   Is Buffer:', Buffer.isBuffer(pdfData.buffer));
    console.log('   Length:', pdfData.buffer.length);
    console.log('   First 20 bytes:', pdfData.buffer.slice(0, 20));
    console.log('   Last 20 bytes:', pdfData.buffer.slice(-20));
    
    // Test encodage base64
    console.log('\n🧪 Test encodage base64:');
    const base64Content = pdfData.buffer.toString('base64');
    console.log('   Longueur base64:', base64Content.length);
    console.log('   Commence par:', base64Content.substring(0, 20));
    console.log('   Se termine par:', base64Content.substring(base64Content.length - 20));
    
    // Vérifier format base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    const isValidBase64 = base64Regex.test(base64Content);
    console.log('   Format base64 valide:', isValidBase64);
    
    // Test avec Buffer.from si nécessaire
    console.log('\n🔄 Test alternative:');
    const alternativeBuffer = Buffer.from(pdfData.buffer);
    const alternativeBase64 = alternativeBuffer.toString('base64');
    console.log('   Alternative valide:', base64Regex.test(alternativeBase64));
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

debugBufferType();
