// Solution de secours : Génération PDF avec jsPDF si Puppeteer échoue
// Ce générateur fonctionne à 100% sur Vercel mais avec un rendu légèrement différent

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Génère un PDF de facture avec jsPDF (solution de secours)
 * @param {Object} invoice - Données de la facture
 * @param {Object} client - Données du client
 * @param {Array} services - Liste des services
 * @param {Object} companyData - Données de l'entreprise
 * @returns {Buffer} - Buffer du PDF généré
 */
export function generatePDFWithJsPDF(invoice, client, services, companyData) {
  console.log('📄 Génération PDF avec jsPDF (fallback)...');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Couleurs
  const primaryColor = [102, 126, 234]; // #667eea
  const textColor = [51, 51, 51];
  const grayColor = [102, 102, 102];

  // En-tête : FACTURE
  doc.setFontSize(24);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 20, yPos);
  
  doc.setFontSize(20);
  doc.text(`N° ${invoice.invoice_number || 'N/A'}`, pageWidth - 20, yPos, { align: 'right' });
  yPos += 15;

  // Ligne de séparation
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  // Informations entreprise
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(companyData.name || 'ProFlow', 20, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  if (companyData.owner) {
    doc.text(companyData.owner, 20, yPos);
    yPos += 5;
  }
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

  // Encadré date/échéance (à droite)
  const boxX = pageWidth - 70;
  const boxY = 35;
  const boxWidth = 50;
  
  doc.setDrawColor(187, 187, 187);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxWidth, 25, 2, 2);
  
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Facture N° :', boxX + 3, boxY + 5);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoice_number || 'N/A', boxX + 3, boxY + 10);
  
  doc.setTextColor(...grayColor);
  doc.text('Date émission:', boxX + 3, boxY + 15);
  doc.setTextColor(...textColor);
  doc.text(formatDate(invoice.date), boxX + 3, boxY + 19);

  yPos += 20;

  // Client
  yPos += 10;
  doc.setDrawColor(187, 187, 187);
  doc.roundedRect(pageWidth - 70, yPos, 50, 25, 2, 2);
  
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURÉ À', pageWidth - 67, yPos + 5);
  
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.name || 'Client inconnu', pageWidth - 67, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  let clientY = yPos + 14;
  if (client?.email) {
    doc.text(client.email, pageWidth - 67, clientY);
    clientY += 4;
  }
  if (client?.phone) {
    doc.text(client.phone, pageWidth - 67, clientY);
    clientY += 4;
  }

  yPos += 35;

  // Titre tableau
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Détails des prestations', 20, yPos);
  yPos += 5;

  // Tableau des services
  const tableHeaders = invoice.invoice_type === 'summary'
    ? [['Description', 'Quantité', 'Tarif', 'Total']]
    : [['Date', 'Description', 'Quantité', 'Tarif', 'Total']];

  const tableData = (services || []).map(service => {
    const hours = Number(service.hours) || Number(service.quantity) || 0;
    const rate = Number(service.hourly_rate) || Number(service.unit_price) || 0;
    const total = hours * rate;
    
    const row = [
      service.description || 'Service',
      `${hours.toFixed(2)}h`,
      `${rate.toFixed(2)}€`,
      `${total.toFixed(2)}€`
    ];
    
    if (invoice.invoice_type !== 'summary') {
      row.unshift(formatDate(service.date || invoice.date));
    }
    
    return row;
  });

  doc.autoTable({
    startY: yPos,
    head: tableHeaders,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [85, 85, 85]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: invoice.invoice_type === 'summary' ? 'auto' : 25 },
      [invoice.invoice_type === 'summary' ? 1 : 2]: { halign: 'right' },
      [invoice.invoice_type === 'summary' ? 2 : 3]: { halign: 'right' },
      [invoice.invoice_type === 'summary' ? 3 : 4]: { halign: 'right' }
    },
    margin: { left: 20, right: 20 },
  });

  // Total
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
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'italic');
  doc.text('TVA non applicable, art.293 B du CGI', pageWidth - 20, yPos, { align: 'right' });
  yPos += 10;

  // Mentions de règlement
  yPos += 5;
  doc.setDrawColor(229, 231, 235);
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
  doc.setTextColor(...grayColor);
  
  const dueDays = calculateDaysDifference(invoice.date, invoice.due_date, invoice.payment_terms || 30);
  doc.text(`• Date limite : ${formatDate(invoice.due_date)} (${dueDays} jour${dueDays > 1 ? 's' : ''})`, 22, yPos);
  yPos += 5;
  
  if (invoice.show_legal_rate !== false && companyData.showLegalRate !== false) {
    const text = '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal';
    doc.text(text, 22, yPos, { maxWidth: pageWidth - 45 });
    yPos += 8;
  }
  
  if (invoice.show_fixed_fee !== false && companyData.showFixedFee !== false) {
    const text = '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 €';
    doc.text(text, 22, yPos, { maxWidth: pageWidth - 45 });
    yPos += 8;
  }

  yPos += 3;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text(`Mode de paiement : ${invoice.payment_method || companyData.paymentMethod || 'Virement bancaire'}`, 20, yPos);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(153, 153, 153);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page 1 / 1`, pageWidth / 2, footerY, { align: 'center' });

  // Retourner le buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  console.log('✅ PDF (jsPDF) généré avec succès');
  return pdfBuffer;
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

