// Générateur de PDF avec Puppeteer
// Remplace PDFKit par une solution basée sur HTML + TailwindCSS

import fs from 'fs';
import path from 'path';
import { generateSharedInvoiceHTML } from './sharedInvoiceTemplate.js';
import { browserPool } from './browserPool.js';

/**
 * Génère un PDF de facture avec Puppeteer à partir d'un template HTML
 * @param {Object} invoiceData - Données de la facture
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Promise<{buffer: Buffer, filePath: string, fileName: string}>}
 */
export async function generateInvoicePDFWithPuppeteer(invoiceData, companyData) {
  let browser;
  let page;
  
  try {
    console.log('⏱️ Début génération PDF...');
    const startTime = Date.now();
    
    // Créer le répertoire temp s'il n'existe pas
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Générer le nom de fichier
    const fileName = `facture_${invoiceData.invoice_number}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    // Préparer les données pour le template partagé
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
      additionalTerms: companyData.additionalTerms
    };

    // Générer le HTML avec le template partagé
    const htmlContent = generateSharedInvoiceHTML(invoiceData, invoiceData.client, invoiceData.services, settings);

    // Utiliser le pool de navigateurs pour de meilleures performances
    browser = await browserPool.getBrowser();
    page = await browser.newPage();

    // Configurer la page pour le PDF avec optimisations
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded' // Plus rapide que networkidle0
    });

    // Attendre que le contenu soit rendu (temps réduit)
    await new Promise(resolve => setTimeout(resolve, 500));

    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true
    });

    // Sauvegarder le fichier
    fs.writeFileSync(filePath, pdfBuffer);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ PDF généré avec succès en ${duration}ms: ${fileName}`);

    return {
      buffer: pdfBuffer,
      filePath,
      fileName
    };

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    throw new Error(`Erreur génération PDF: ${error.message}`);
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      browserPool.releaseBrowser(browser);
    }
  }
}

/**
 * Version alternative avec options avancées pour le PDF
 * @param {Object} invoiceData - Données de la facture
 * @param {Object} companyData - Données de l'entreprise
 * @param {Object} options - Options supplémentaires pour Puppeteer
 */
export async function generateInvoicePDFWithPuppeteerAdvanced(invoiceData, companyData, options = {}) {
  let browser;
  let page;
  
  try {
    console.log('⏱️ Début génération PDF avancé...');
    const startTime = Date.now();
    
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `facture_${invoiceData.invoice_number}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    // Préparer les données pour le template partagé
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
      additionalTerms: companyData.additionalTerms
    };

    // Générer le HTML avec le template partagé
    const htmlContent = generateSharedInvoiceHTML(invoiceData, invoiceData.client, invoiceData.services, settings);

    // Utiliser le pool de navigateurs
    browser = await browserPool.getBrowser();
    page = await browser.newPage();

    // Injecter des styles CSS personnalisés si nécessaire
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .print-break { page-break-inside: avoid; }
        }
      `;
      document.head.appendChild(style);
    });

    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded' // Plus rapide
    });

    await new Promise(resolve => setTimeout(resolve, 500)); // Temps réduit

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      printBackground: true,
      margin: options.margin || {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in'
      },
      displayHeaderFooter: options.displayHeaderFooter || false,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
      preferCSSPageSize: true
    });

    fs.writeFileSync(filePath, pdfBuffer);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ PDF avancé généré avec succès en ${duration}ms: ${fileName}`);

    return {
      buffer: pdfBuffer,
      filePath,
      fileName
    };

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF avancé:', error);
    throw new Error(`Erreur génération PDF avancé: ${error.message}`);
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      browserPool.releaseBrowser(browser);
    }
  }
}
