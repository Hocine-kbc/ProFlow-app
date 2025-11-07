import jsPDF from 'jspdf';
// @ts-ignore - typage manquant côté jspdf-autotable
import autoTable from 'jspdf-autotable';
// @ts-ignore - typage partiel de SheetJS en ESM
import * as XLSX from 'xlsx';

export interface ReceiptEntry {
  date: string; // ISO string YYYY-MM-DD
  invoiceNumber: string;
  clientName: string;
  description: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
}

export interface ReceiptsLedgerPayload {
  year: number;
  companyName?: string;
  generatedAt: string; // locale string
  entries: ReceiptEntry[];
  totalAmount: number;
}

const formatDisplayDate = (isoDate: string) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
};

const buildFileSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'livret-recettes';
};

export const exportReceiptsLedgerToExcel = (payload: ReceiptsLedgerPayload) => {
  const workbook = XLSX.utils.book_new();

  const header = [
    ['Livret des recettes - Micro-entreprise'],
    ['Année', String(payload.year)],
    ['Entreprise', payload.companyName || ''],
    ['Généré le', payload.generatedAt],
    [],
    ['Date de l\'encaissement', 'Référence', 'Client / Nature', 'Montant TTC', 'Mode de paiement', 'Observations']
  ];

  const body = payload.entries.map((entry) => [
    formatDisplayDate(entry.date),
    entry.invoiceNumber || '–',
    entry.description ? `${entry.clientName} — ${entry.description}` : entry.clientName,
    `${entry.amount.toFixed(2)} €`,
    entry.paymentMethod,
    entry.notes || ''
  ]);

  const totalRow = [
    'TOTAL',
    '',
    '',
    `${payload.totalAmount.toFixed(2)} €`,
    '',
    ''
  ];

  const sheet = XLSX.utils.aoa_to_sheet([...header, ...body, [], totalRow]);
  sheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 45 },
    { wch: 16 },
    { wch: 20 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Livret recettes');

  const fileName = `livret-recettes-${payload.year}-${buildFileSlug(payload.companyName || '')}.xlsx`;
  XLSX.writeFileXLSX(workbook, fileName);
};

export const exportReceiptsLedgerToPdf = (payload: ReceiptsLedgerPayload) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let cursorY = margin;

  doc.setFillColor(13, 148, 136);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 60, 10, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Livret des recettes', margin + 20, cursorY + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Année : ${payload.year}`, margin + 20, cursorY + 48);

  cursorY += 80;
  doc.setTextColor(15, 23, 42);

  // Summary chips
  const chips = [
    { label: 'Entreprise', value: payload.companyName || '—' },
    { label: 'Généré le', value: payload.generatedAt },
    { label: 'Total encaissé', value: `${payload.totalAmount.toFixed(2)} €` }
  ];

  const chipHeight = 40;
  const chipGap = 12;
  const chipWidth = (pageWidth - margin * 2 - chipGap * (chips.length - 1)) / chips.length;

  chips.forEach((chip, index) => {
    const x = margin + index * (chipWidth + chipGap);
    const y = cursorY;

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(x, y, chipWidth, chipHeight, 8, 8, 'F');
    doc.setDrawColor(13, 148, 136);
    doc.roundedRect(x, y, chipWidth, chipHeight, 8, 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(14, 116, 144);
    doc.text(chip.label, x + 12, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(chip.value, x + 12, y + 30);
  });

  cursorY += chipHeight + 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(12, 74, 110);
  doc.text('Détail chronologique des recettes', margin, cursorY);

  const tableWidth = pageWidth - margin * 2;
  const horizontalMargin = margin;
  autoTable(doc, {
    startY: cursorY + 14,
    margin: { left: horizontalMargin, right: horizontalMargin },
    bodyStyles: { valign: 'middle' },
    head: [[
      'Date',
      'Référence',
      'Client / Nature',
      'Montant TTC',
      'Mode de paiement',
      'Observations'
    ]],
    body: payload.entries.map((entry) => [
      formatDisplayDate(entry.date),
      entry.invoiceNumber || '–',
      entry.description ? `${entry.clientName}\n${entry.description}` : entry.clientName,
      `${entry.amount.toFixed(2)} €`,
      entry.paymentMethod,
      entry.notes || ''
    ]),
    styles: {
      fontSize: 9,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      textColor: [55, 65, 81],
      overflow: 'linebreak',
      cellWidth: 'wrap'
    },
    headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    tableLineColor: [209, 213, 219],
    tableLineWidth: 0.3,
    tableWidth,
    columnStyles: {
      0: { minCellWidth: 50, maxCellWidth: 60, halign: 'center' },
      1: { minCellWidth: 55, maxCellWidth: 65, halign: 'center' },
      2: { minCellWidth: 150, maxCellWidth: 200, halign: 'left' },
      3: { minCellWidth: 60, maxCellWidth: 70, halign: 'right' },
      4: { minCellWidth: 85, maxCellWidth: 100, halign: 'center' },
      5: { minCellWidth: 85, maxCellWidth: 110, halign: 'left' }
    },
    didDrawPage: () => {
      const table = (doc as any).lastAutoTable;
      if (!table) return;
      const width = typeof table.table?.width === 'number' ? table.table.width : tableWidth;
      const height = typeof table.table?.height === 'number' ? table.table.height : 0;
      const left = horizontalMargin;
      const top = typeof table.settings?.margin?.top === 'number' ? table.settings.margin.top : margin;
      if (height > 0) {
        doc.setDrawColor(148, 163, 184);
        doc.roundedRect(left, top, width, height, 12, 12);
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total encaissé : ${payload.totalAmount.toFixed(2)} €`, margin, finalY + 24);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Conservez ce livret, vos factures et relevés bancaires pendant au moins 10 ans conformément à vos obligations.',
    margin,
    finalY + 40
  );

  const fileName = `livret-recettes-${payload.year}-${buildFileSlug(payload.companyName || '')}.pdf`;
  doc.save(fileName);
};

