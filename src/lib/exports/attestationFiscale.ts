import jsPDF from 'jspdf';
// @ts-ignore - la lib n'expose pas de types officiels
import autoTable from 'jspdf-autotable';

export interface FiscalAttestationParty {
  name: string;
  company?: string;
  ownerName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  siret?: string;
  siren?: string;
  vatNumber?: string;
}

export interface FiscalAttestationInvoice {
  number: string;
  issueDate: string;
  paidDate?: string;
  description?: string;
  amount: number;
  status: string;
  paidAmount?: number;
}

export interface FiscalAttestationPayload {
  year: number;
  issueDate: string;
  client: FiscalAttestationParty;
  provider: FiscalAttestationParty;
  invoices: FiscalAttestationInvoice[];
  totals: {
    totalBilled: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
  };
  vatExempt?: boolean;
  notes?: string[];
  fileName?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

const drawLabelValue = (doc: jsPDF, label: string, value: string, x: number, y: number) => {
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 41, 59);
  const lines = doc.splitTextToSize(value, 220);
  doc.text(lines, x, y + 16);
  return y + 16 + lines.length * 14;
};

const drawInfoCard = (
  doc: jsPDF,
  title: string,
  lines: string[],
  x: number,
  y: number,
  width: number,
  accentColor: [number, number, number]
) => {
  const contentLines = lines.flatMap((line) =>
    doc.splitTextToSize(line, width - 40)
  );
  const height = Math.max(110, 56 + contentLines.length * 14);

  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, width, height, 12, 12, 'DF');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text(title, x + 20, y + 30);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(55, 65, 81);
  const startY = y + 52;
  contentLines.forEach((line, index) => {
    doc.text(line, x + 20, startY + index * 14);
  });
};

const statusChip = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || normalized === 'payée') {
    return { label: 'Payée', color: [16, 185, 129] };
  }
  if (normalized === 'partial' || normalized === 'partielle') {
    return { label: 'Paiement partiel', color: [59, 130, 246] };
  }
  if (normalized === 'overdue' || normalized === 'en retard') {
    return { label: 'En retard', color: [239, 68, 68] };
  }
  if (normalized === 'sent' || normalized === 'envoyée') {
    return { label: 'Envoyée', color: [249, 115, 22] };
  }
  return { label: 'Brouillon', color: [148, 163, 184] };
};

export function exportFiscalAttestationToPdf(payload: FiscalAttestationPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;

  const primaryColor: [number, number, number] = [79, 70, 229];
  const secondaryColor: [number, number, number] = [14, 165, 233];
  const neutralColor: [number, number, number] = [30, 41, 59];

  // Background accents
  doc.setFillColor(247, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0);
  doc.triangle(
    pageWidth * 0.7,
    -40,
    pageWidth + 80,
    -40,
    pageWidth + 80,
    pageHeight * 0.35,
    'F'
  );

  // Header block
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, margin, pageWidth - margin * 2, 120, 18, 18, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Attestation fiscale annuelle', margin + 28, margin + 42);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text(
    [
      `Année fiscale ${payload.year}`,
      `Document généré le ${formatDate(payload.issueDate)}`
    ],
    margin + 28,
    margin + 68
  );

  if (payload.vatExempt !== false) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('TVA non applicable, article 293 B du CGI', margin + 28, margin + 96);
  }

  // Provider & client cards
  const providerLines = [
    payload.provider.company || payload.provider.name,
    payload.provider.company ? payload.provider.name : undefined,
    payload.provider.address,
    [payload.provider.postalCode, payload.provider.city].filter(Boolean).join(' '),
    payload.provider.country,
    payload.provider.email,
    payload.provider.phone,
    payload.provider.siret ? `SIRET : ${payload.provider.siret}` : undefined,
    payload.provider.siren ? `SIREN : ${payload.provider.siren}` : undefined,
    payload.provider.vatNumber ? `TVA : ${payload.provider.vatNumber}` : undefined
  ].filter((line): line is string => Boolean(line));

  const clientLines = [
    payload.client.company || payload.client.name,
    payload.client.company ? payload.client.name : undefined,
    payload.client.address,
    [payload.client.postalCode, payload.client.city].filter(Boolean).join(' '),
    payload.client.country,
    payload.client.email,
    payload.client.phone
  ].filter((line): line is string => Boolean(line));

  const cardWidth = (pageWidth - margin * 2 - 24) / 2;
  const cardsY = margin + 150;
  const leftCardHeight = Math.max(110, 56 + providerLines.flatMap((line) => doc.splitTextToSize(line, cardWidth - 40)).length * 14);
  const rightCardHeight = Math.max(110, 56 + clientLines.flatMap((line) => doc.splitTextToSize(line, cardWidth - 40)).length * 14);
  drawInfoCard(doc, 'Émetteur', providerLines, margin, cardsY, cardWidth, primaryColor);
  drawInfoCard(doc, 'Destinataire', clientLines, margin + cardWidth + 24, cardsY, cardWidth, secondaryColor);

  let cursorY = cardsY + Math.max(leftCardHeight, rightCardHeight) + 30;

  // Declaration
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  doc.text('Déclaration', margin, cursorY);
  cursorY += 22;

  const declaration = [
    `Je soussigné(e) ${payload.provider.ownerName || payload.provider.name}, ${
      payload.provider.company ? `représentant(e) légal(e) de ${payload.provider.company}` : 'entrepreneur'
    }, certifie sur l'honneur que le montant total des prestations facturées à ${
      payload.client.company || payload.client.name
    } durant l'année fiscale ${payload.year} s'élève à ${formatCurrency(payload.totals.totalBilled)} TTC, dont ${
      formatCurrency(payload.totals.totalPaid)
    } encaissés au ${formatDate(payload.issueDate)}.`,
    `Cette attestation reprend l'intégralité des factures émises et réglées pour l'exercice concerné, conformément aux informations détaillées ci-après.`
  ];

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const declarationLines = doc.splitTextToSize(declaration.join('\n\n'), pageWidth - margin * 2);
  doc.text(declarationLines, margin, cursorY);
  cursorY += declarationLines.length * 14 + 20;

  // Summary chips
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  doc.setFontSize(12);
  doc.text('Synthèse annuelle', margin, cursorY);
  cursorY += 20;

  const summaryWidth = (pageWidth - margin * 2 - 30) / 3;
  const summaryItems = [
    { label: 'Total facturé', value: formatCurrency(payload.totals.totalBilled), color: primaryColor },
    { label: 'Total encaissé', value: formatCurrency(payload.totals.totalPaid), color: [16, 185, 129] },
    { label: 'En attente', value: formatCurrency(payload.totals.totalOutstanding), color: [249, 115, 22] },
    { label: 'Factures', value: `${payload.totals.invoiceCount}`, color: [59, 130, 246] }
  ];

  summaryItems.forEach((item, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const boxX = margin + col * (summaryWidth + 15);
    const boxY = cursorY + row * 66;

    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(boxX, boxY, summaryWidth, 60, 10, 10, 'DF');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label.toUpperCase(), boxX + 16, boxY + 22);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.value, boxX + 16, boxY + 44);
  });

  cursorY += Math.ceil(summaryItems.length / 3) * 70 + 20;

  // Invoice table
  if (payload.invoices.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
    doc.text('Détail des factures', margin, cursorY);
    cursorY += 12;

    const rows = payload.invoices.map((invoice) => {
      const chip = statusChip(invoice.status);
      return [
        invoice.number,
        formatDate(invoice.issueDate),
        formatDate(invoice.paidDate),
        formatCurrency(invoice.amount),
        chip,
        invoice.description ? invoice.description.replace(/\s+/g, ' ') : '—'
      ];
    });

    autoTable(doc, {
      startY: cursorY + 10,
      head: [['Facture', 'Émise le', 'Réglée le', 'Montant TTC', 'Statut', 'Description']],
      body: rows,
      styles: {
        font: 'Helvetica',
        fontSize: 9.5,
        cellPadding: { top: 6, right: 6, bottom: 6, left: 6 },
        textColor: [55, 65, 81],
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 252]
      },
      columnStyles: {
        0: { cellWidth: 82 },
        1: { cellWidth: 82 },
        2: { cellWidth: 82 },
        3: { cellWidth: 82, halign: 'right' },
        4: {
          cellWidth: 80,
          halign: 'center',
          fontStyle: 'bold',
          textColor: [30, 41, 59]
        },
        5: { cellWidth: 'auto' }
      },
      willDrawCell: (data: any) => {
        if (data.column.index !== 4) {
          return true;
        }
        const chip = data.cell?.raw as { label?: string; color?: [number, number, number] } | undefined;
        if (!chip || !Array.isArray(chip.color) || chip.color.length < 3 || typeof chip.label !== 'string') {
          return true;
        }
        const { x = 0, y = 0, width = 0, height = 0 } = data.cell || {};
        doc.setFillColor(chip.color[0], chip.color[1], chip.color[2]);
        doc.roundedRect(x + 6, y + 4, Math.max(0, width - 12), Math.max(0, height - 8), 11, 11, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(chip.label, x + width / 2, y + height / 2 + 3, { align: 'center' });
        return false;
      },
      didDrawPage: () => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 20, {
          align: 'right'
        });
      },
      theme: 'plain',
      margin: { left: margin, right: margin }
    });

    cursorY = (doc as any).lastAutoTable.finalY + 20;
  }

  // Notes
  if (payload.notes && payload.notes.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
    doc.text('Notes complémentaires', margin, cursorY);
    cursorY += 18;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105);

    payload.notes.forEach((note) => {
      const noteLines = doc.splitTextToSize(`• ${note}`, pageWidth - margin * 2);
      doc.text(noteLines, margin, cursorY);
      cursorY += noteLines.length * 14;
    });
    cursorY += 10;
  }

  // Signature
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  doc.text('Signature', margin, cursorY);
  cursorY += 24;

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(1);
  doc.line(margin, cursorY, margin + 220, cursorY);
  cursorY += 18;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Fait à ${payload.provider.city || payload.provider.country || '…'}, le ${formatDate(payload.issueDate)}`,
    margin,
    cursorY
  );
  cursorY += 18;
  doc.text(payload.provider.ownerName || payload.provider.name, margin, cursorY);

  const fileName =
    payload.fileName ||
    `attestation-fiscale-${payload.year}-${slugify(payload.client.company || payload.client.name || 'client')}.pdf`;
  doc.save(fileName);
}

