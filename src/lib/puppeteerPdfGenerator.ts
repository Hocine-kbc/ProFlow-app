// Générateur de PDF avec Puppeteer
// Remplace PDFKit par une solution basée sur HTML + TailwindCSS

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { generateInvoiceHTML, InvoiceData, CompanyData } from './invoiceTemplate';

/**
 * Génère un PDF de facture avec Puppeteer à partir d'un template HTML
 * @param invoiceData - Données de la facture
 * @param companyData - Données de l'entreprise
 * @returns Promise avec le buffer PDF et le chemin du fichier
 */
export async function generateInvoicePDFWithPuppeteer(
  invoiceData: InvoiceData, 
  companyData: CompanyData
): Promise<{ buffer: Buffer; filePath: string; fileName: string }> {
  let browser;
  
  try {
    // Créer le répertoire temp s'il n'existe pas
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Générer le nom de fichier
    const fileName = `facture_${invoiceData.invoice_number}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    // Générer le HTML avec le template
    const htmlContent = generateInvoiceHTML(invoiceData, companyData);

    // Lancer Puppeteer
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Configurer la page pour le PDF
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Attendre que TailwindCSS soit chargé
    await page.waitForTimeout(1000);

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

    console.log(`✅ PDF généré avec succès: ${fileName}`);

    return {
      buffer: pdfBuffer,
      filePath,
      fileName
    };

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error);
    throw new Error(`Erreur génération PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Version alternative avec options avancées pour le PDF
 * @param invoiceData - Données de la facture
 * @param companyData - Données de l'entreprise
 * @param options - Options supplémentaires pour Puppeteer
 */
export async function generateInvoicePDFWithPuppeteerAdvanced(
  invoiceData: InvoiceData, 
  companyData: CompanyData,
  options: {
    format?: 'A4' | 'A3' | 'Letter';
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
  } = {}
): Promise<{ buffer: Buffer; filePath: string; fileName: string }> {
  let browser;
  
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `facture_${invoiceData.invoice_number}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);

    const htmlContent = generateInvoiceHTML(invoiceData, companyData);

    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Injecter des styles CSS personnalisés si nécessaire
    await page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = \`
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .print-break { page-break-inside: avoid; }
        }
      \`;
      document.head.appendChild(style);
    });

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    await page.waitForTimeout(1000);

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

    console.log(`✅ PDF avancé généré avec succès: ${fileName}`);

    return {
      buffer: pdfBuffer,
      filePath,
      fileName
    };

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF avancé:', error);
    throw new Error(`Erreur génération PDF avancé: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
