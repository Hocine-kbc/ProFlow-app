// Générateur de PDF avec Puppeteer
// Remplace PDFKit par une solution basée sur HTML + TailwindCSS

import fs from 'fs';
import path from 'path';
import os from 'os';
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
    
    // Utiliser le dossier "Factures ProFlow" dans Downloads
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const facturesDir = path.join(downloadsDir, 'Factures ProFlow');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(facturesDir)) {
      fs.mkdirSync(facturesDir, { recursive: true });
    }
    
    const tempDir = facturesDir;

    // Générer le nom de fichier (inclure le nom du client si disponible)
    const clientName = (invoiceData.client && invoiceData.client.name) || '';
    const safeClientName = clientName
      ? `_${clientName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : '';
    const fileName = `facture_${invoiceData.invoice_number}${safeClientName}.pdf`;
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
      additionalTerms: companyData.additionalTerms,
      // Paramètre de pénalités de retard
      // Nouvelles options de règlement personnalisables
      showLegalRate: companyData.showLegalRate,
      showFixedFee: companyData.showFixedFee
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

    // Générer le PDF avec des marges adaptées et pagination
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '30mm', left: '0mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center; color:#999; padding-top:4mm;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      preferCSSPageSize: false
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
    
    // Utiliser le dossier "Factures ProFlow" dans Downloads
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    const facturesDir = path.join(downloadsDir, 'Factures ProFlow');
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(facturesDir)) {
      fs.mkdirSync(facturesDir, { recursive: true });
    }
    
    const tempDir = facturesDir;

    const clientName = (invoiceData.client && invoiceData.client.name) || '';
    const safeClientName = clientName
      ? `_${clientName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_')
      : '';
    const fileName = `facture_${invoiceData.invoice_number}${safeClientName}.pdf`;
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
      additionalTerms: companyData.additionalTerms,
      // Paramètre de pénalités de retard
      // Nouvelles options de règlement personnalisables
      showLegalRate: companyData.showLegalRate,
      showFixedFee: companyData.showFixedFee
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
