// Générateur de PDF optimisé pour Vercel avec Puppeteer + Chrome AWS Lambda
// Réutilise exactement le même template HTML que le serveur local

import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * Génère un PDF de facture avec Puppeteer dans un environnement Vercel
 * Utilise exactement le même template HTML que le serveur local
 * @param {string} htmlContent - Le HTML complet de la facture
 * @returns {Promise<Buffer>} - Buffer du PDF généré
 */
export async function generatePDFWithPuppeteer(htmlContent) {
  let browser = null;
  
  try {
    console.log('🚀 Lancement de Puppeteer pour Vercel...');
    
    // Arguments supplémentaires pour éviter les problèmes de bibliothèques manquantes
    const chromeArgs = [
      ...chromium.args,
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ];
    
    console.log('📦 Chemin Chromium:', await chromium.executablePath());
    
    // Lancer Puppeteer avec Chrome optimisé pour AWS Lambda/Vercel
    browser = await puppeteerCore.launch({
      args: chromeArgs,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: 'new',  // Utiliser le nouveau mode headless
      ignoreHTTPSErrors: true,
    });
    
    console.log('✅ Browser lancé');
    
    const page = await browser.newPage();
    
    // Charger le HTML
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('✅ HTML chargé');
    
    // Attendre que le contenu soit complètement rendu
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Générer le PDF avec les mêmes paramètres que le serveur local
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '30mm', left: '0mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#999; padding-top:4mm;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      preferCSSPageSize: false
    });
    
    console.log('✅ PDF généré avec succès');
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Message d'erreur plus détaillé
    let errorMessage = `Erreur génération PDF: ${error.message}`;
    
    if (error.message.includes('Failed to launch')) {
      errorMessage += '\n\n💡 Conseil: Vérifiez que @sparticuz/chromium est bien installé et à jour.';
    }
    
    throw new Error(errorMessage);
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('✅ Browser fermé');
      } catch (closeError) {
        console.error('⚠️ Erreur lors de la fermeture du browser:', closeError.message);
      }
    }
  }
}

