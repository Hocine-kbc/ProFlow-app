// Solution de secours : Génération PDF avec html-pdf-node si Puppeteer échoue
// Ce générateur utilise le MÊME TEMPLATE HTML que Puppeteer !

import htmlPdf from 'html-pdf-node';
import { generateSharedInvoiceHTML } from './invoice-template.js';

/**
 * Génère un PDF de facture avec html-pdf-node (solution de secours)
 * Utilise le MÊME TEMPLATE HTML que Puppeteer !
 * @param {Object} invoice - Données de la facture
 * @param {Object} client - Données du client
 * @param {Array} services - Liste des services
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<Buffer>} - Buffer du PDF généré
 */
export async function generatePDFWithHtmlPdfNode(invoice, client, services, companyData) {
  console.log('📄 Génération PDF avec html-pdf-node (fallback)...');
  console.log('✨ Utilisation du MÊME TEMPLATE que Puppeteer !');
  
  try {
    // Générer le HTML avec le template EXACT utilisé par Puppeteer
    const htmlContent = generateSharedInvoiceHTML(
      invoice,
      client,
      services,
      companyData
    );
    
    console.log('✅ HTML généré avec le template exact');
    
    // Options pour html-pdf-node (similaires à Puppeteer)
    const options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '30mm',
        left: '0mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#999; padding-top:4mm;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      preferCSSPageSize: false,
      // Options spécifiques pour html-pdf-node
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer'
      ]
    };
    
    const file = { content: htmlContent };
    
    console.log('🚀 Génération du PDF...');
    const pdfBuffer = await htmlPdf.generatePdf(file, options);
    
    console.log('✅ PDF généré avec succès (html-pdf-node)');
    console.log('📊 Taille:', pdfBuffer.length, 'octets');
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erreur html-pdf-node:', error);
    console.error('❌ Stack:', error.stack);
    throw new Error(`Erreur génération PDF (html-pdf-node): ${error.message}`);
  }
}
