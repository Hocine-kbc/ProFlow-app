// Solution de secours FINALE : Génération PDF avec jsPDF
// Cette version fonctionne à 100% sur Vercel et reproduit le design au maximum

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Génère un PDF de facture avec jsPDF (version améliorée)
 * Design inspiré du template Puppeteer mais adapté aux limitations de jsPDF
 * @param {Object} invoice - Données de la facture
 * @param {Object} client - Données du client  
 * @param {Array} services - Liste des services
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Buffer} - Buffer du PDF généré
 */
export function generatePDFWithJsPDF(invoice, client, services, companyData) {
  console.log('📄 Génération PDF avec jsPDF (version améliorée)...');
  console.log('✨ Design optimisé pour Vercel');
  
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Couleurs (inspirées du template)
    const primaryColor = [102, 126, 234]; // #667eea
    const secondaryColor = [118, 75, 162]; // #764ba2
    const textColor = [51, 51, 51];
    const lightGray = [249, 250, 251];
    const borderGray = [229, 231, 235];

    // ===== EN-TÊTE : FACTURE =====
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', 20, yPos);
    
    doc.setFontSize(20);
    doc.text(`N° ${invoice.invoice_number || 'N/A'}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 3;

    // Ligne de séparation violette
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // ===== INFORMATIONS ENTREPRISE =====
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(companyData.name || 'ProFlow', 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    if (companyData.owner) {
      doc.setTextColor(102, 102, 102);
      doc.text(companyData.owner, 20, yPos);
      yPos += 5;
    }
    
    doc.setTextColor(...textColor);
    if (companyData.address) {
      doc.text(companyData.address, 20, yPos);
      yPos += 5;
    }
    
    const contactLine = [
      companyData.email,
      companyData.phone
    ].filter(Boolean).join(' • ');
    
    if (contactLine) {
      doc.text(contactLine, 20, yPos);
      yPos += 5;
    }
    
    if (companyData.siret) {
      doc.text(`SIRET: ${companyData.siret}`, 20, yPos);
      yPos += 5;
    }

    // ===== ENCADRÉ INFORMATIONS FACTURE (à droite) =====
    const boxX = pageWidth - 65;
    const boxY = 35;
    const boxWidth = 45;
    const boxHeight = 25;
    
    // Bordure de l'encadré
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2);
    
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Facture N° :', boxX + 3, boxY + 5);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.invoice_number || 'N/A', boxX + 3, boxY + 10);
    
    doc.setTextColor(102, 102, 102);
    doc.text('Date d\'émission:', boxX + 3, boxY + 15);
    doc.setTextColor(...textColor);
    doc.text(formatDate(invoice.date), boxX + 3, boxY + 19);

    yPos += 20;

    // ===== CLIENT (aligné à droite) =====
    yPos += 10;
    const clientBoxX = pageWidth - 65;
    const clientBoxY = yPos;
    const clientBoxWidth = 45;
    const clientBoxHeight = 25;
    
    doc.setDrawColor(...borderGray);
    doc.roundedRect(clientBoxX, clientBoxY, clientBoxWidth, clientBoxHeight, 2, 2);
    
    doc.setFontSize(9);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURÉ À', clientBoxX + 3, clientBoxY + 5);
    
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(client?.name || 'Client inconnu', clientBoxX + 3, clientBoxY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let clientY = clientBoxY + 14;
    if (client?.email) {
      doc.text(client.email, clientBoxX + 3, clientY, { maxWidth: clientBoxWidth - 6 });
      clientY += 4;
    }
    if (client?.phone) {
      doc.text(client.phone, clientBoxX + 3, clientY);
    }

    yPos += 35;

    // ===== TITRE TABLEAU =====
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Détails des prestations', 20, yPos);
    yPos += 5;

    // ===== TABLEAU DES SERVICES =====
    const isSummary = invoice.invoice_type === 'summary';
    const tableHeaders = isSummary
      ? [['Description', 'Quantité', 'Tarif', 'Total']]
      : [['Date', 'Description', 'Quantité', 'Tarif', 'Total']];

    const tableData = (services || []).map(service => {
      const hours = Number(service.hours) || Number(service.quantity) || 0;
      const rate = Number(service.hourly_rate) || Number(service.unit_price) || 0;
      const total = hours * rate;
      
      const formatServiceQuantity = (qty, pricingType) => {
        const suffixes = { hourly: 'h', daily: 'j', project: '' };
        const suffix = suffixes[pricingType || 'hourly'] || 'h';
        return `${qty.toFixed(2).replace(/\.?0+$/, '')}${suffix}`;
      };
      
      const formatServiceRate = (r, pricingType) => {
        const suffixes = { hourly: '€/h', daily: '€/jour', project: '€' };
        const suffix = suffixes[pricingType || 'hourly'] || '€/h';
        return `${r.toFixed(2)}${suffix}`;
      };
      
      const row = [
        service.description || 'Service',
        formatServiceQuantity(hours, service.pricing_type),
        formatServiceRate(rate, service.pricing_type),
        `${total.toFixed(2)}€`
      ];
      
      if (!isSummary) {
        row.unshift(formatDate(service.date || invoice.date));
      }
      
      return row;
    });

    doc.autoTable({
      startY: yPos,
      head: tableHeaders,
      body: tableData,
      theme: 'plain',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 3
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [85, 85, 85],
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      columnStyles: {
        0: { cellWidth: isSummary ? 'auto' : 25 },
        [isSummary ? 1 : 2]: { halign: 'left' },
        [isSummary ? 2 : 3]: { halign: 'left' },
        [isSummary ? 3 : 4]: { halign: 'left', fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 },
      styles: {
        lineColor: borderGray,
        lineWidth: 0.1
      }
    });

    // ===== TOTAL =====
    yPos = doc.lastAutoTable.finalY + 10;
    
    const total = invoice.subtotal || (services || []).reduce((acc, s) => {
      const hours = Number(s.hours) || Number(s.quantity) || 0;
      const rate = Number(s.hourly_rate) || Number(s.unit_price) || 0;
      return acc + (hours * rate);
    }, 0);

    const totalBoxX = pageWidth - 75;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(totalBoxX, yPos, pageWidth - 20, yPos);
    yPos += 7;

    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Total à payer :', totalBoxX, yPos);
    doc.text(`${total.toFixed(2)}€`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 5;

    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.setFont('helvetica', 'italic');
    doc.text('TVA non applicable, art.293 B du CGI', pageWidth - 20, yPos, { align: 'right' });
    yPos += 10;

    // ===== MENTIONS DE RÈGLEMENT =====
    yPos += 5;
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Règlement :', 20, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    
    const dueDays = calculateDaysDifference(invoice.date, invoice.due_date, invoice.payment_terms || 30);
    doc.text(`• Date limite : ${formatDate(invoice.due_date)} (${dueDays} jour${dueDays > 1 ? 's' : ''})`, 22, yPos);
    yPos += 5;
    
    if (invoice.show_legal_rate !== false && companyData.showLegalRate !== false) {
      const text = '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal';
      doc.text(text, 22, yPos, { maxWidth: pageWidth - 45 });
      yPos += 8;
    }
    
    if (invoice.show_fixed_fee !== false && companyData.showFixedFee !== false) {
      const text = '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais';
      doc.text(text, 22, yPos, { maxWidth: pageWidth - 45 });
      yPos += 5;
      doc.text('  de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.', 22, yPos, { maxWidth: pageWidth - 45 });
      yPos += 8;
    }

    yPos += 3;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(`Mode de paiement : ${invoice.payment_method || companyData.paymentMethod || 'Virement bancaire'}`, 20, yPos);

    // ===== FOOTER =====
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(153, 153, 153);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page 1 / 1`, pageWidth / 2, footerY, { align: 'center' });

    // Retourner le buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    console.log('✅ PDF (jsPDF) généré avec succès');
    console.log('📊 Taille:', pdfBuffer.length, 'octets');
    
    return pdfBuffer;
    
  } catch (error) {
    console.error('❌ Erreur jsPDF:', error);
    console.error('❌ Stack:', error.stack);
    throw new Error(`Erreur génération PDF (jsPDF): ${error.message}`);
  }
}

// Fonction utilitaire pour formater les dates
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Fonction utilitaire pour calculer les jours de différence
function calculateDaysDifference(invoiceDate, dueDate, defaultDays) {
  if (!invoiceDate || !dueDate) return defaultDays || 30;
  
  const invoice = new Date(invoiceDate);
  const due = new Date(dueDate);
  const diffTime = due - invoice;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : (defaultDays || 30);
}
