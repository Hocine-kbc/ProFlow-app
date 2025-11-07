import jsPDF from 'jspdf';
// @ts-ignore - la lib n'expose pas de types officiels
import autoTable from 'jspdf-autotable';
// @ts-ignore - SheetJS ne fournit pas tous les types ESM
import * as XLSX from 'xlsx';

type ValueFormat = 'currency' | 'number' | 'percent' | 'days';

export interface StatsExportMetadata {
  chartLabel: string;
  kpiLabel: string;
  generatedAt: string;
}

export interface StatsExportKpiEntry {
  label: string;
  value: number;
  format: ValueFormat;
}

export interface StatsExportPeriodRow {
  label: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  invoices: number;
  contributionRate: number;
}

export interface StatsExportInvoiceRow {
  label: string;
  paid: number;
  pending: number;
  overdue: number;
  total: number;
}

export interface StatsExportClientRow {
  name: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  invoices: number;
  percentage: number;
}

export interface StatsExportPayload {
  metadata: StatsExportMetadata;
  kpis: StatsExportKpiEntry[];
  periodRows: StatsExportPeriodRow[];
  invoicesRows: StatsExportInvoiceRow[];
  topClients: StatsExportClientRow[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
    .format(value)
    .replace(/[\u00A0\u202F]/g, ' ');

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})
  .format(value)
  .replace(/[\u00A0\u202F]/g, ' ');

const formatPercent = (value: number) => `${value.toFixed(1)} %`;

const formatDays = (value: number) => `${value.toFixed(1)} j`;

const formatValue = (value: number, format: ValueFormat) => {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'days':
      return formatDays(value);
    default:
      return formatNumber(value);
  }
};

const buildSlug = (label: string) => {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'rapport';
};

export const exportStatsToExcel = (payload: StatsExportPayload) => {
  const workbook = XLSX.utils.book_new();

  const overviewSheetData = [
    ['Rapport statistiques ProFlow'],
    ['Généré le', payload.metadata.generatedAt],
    ['Périmètre KPI', payload.metadata.kpiLabel],
    ['Périmètre analyses', payload.metadata.chartLabel],
    [],
    ['Indicateur', 'Valeur'],
    ...payload.kpis.map((entry) => [entry.label, formatValue(entry.value, entry.format)])
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewSheetData);
  overviewSheet['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Résumé');

  const periodSheetData = [
    ['Période', 'CA Brut', 'CA Net', 'Cotisations', 'Factures', 'Taux cotisations'],
    ...payload.periodRows.map((row) => [
      row.label,
      formatCurrency(row.revenueBrut),
      formatCurrency(row.revenueNet),
      formatCurrency(row.contributions),
      formatNumber(row.invoices),
      formatPercent(row.contributionRate)
    ])
  ];

  const periodSheet = XLSX.utils.aoa_to_sheet(periodSheetData);
  periodSheet['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, periodSheet, 'Évolution');

  const invoicesSheetData = [
    ['Période', 'Payées', 'En attente', 'En retard', 'Total'],
    ...payload.invoicesRows.map((row) => [
      row.label,
      formatNumber(row.paid),
      formatNumber(row.pending),
      formatNumber(row.overdue),
      formatNumber(row.total)
    ])
  ];

  const invoicesSheet = XLSX.utils.aoa_to_sheet(invoicesSheetData);
  invoicesSheet['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Factures');

  if (payload.topClients.length > 0) {
    const clientsSheetData = [
      ['Client', 'CA Brut', 'CA Net', 'Cotisations', 'Factures', 'Part du CA'],
      ...payload.topClients.map((client) => [
        client.name,
        formatCurrency(client.revenueBrut),
        formatCurrency(client.revenueNet),
        formatCurrency(client.contributions),
        formatNumber(client.invoices),
        formatPercent(client.percentage)
      ])
    ];

    const clientsSheet = XLSX.utils.aoa_to_sheet(clientsSheetData);
    clientsSheet['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Top clients');
  }

  const fileName = `proflow-statistiques-${buildSlug(payload.metadata.chartLabel)}.xlsx`;
  XLSX.writeFileXLSX(workbook, fileName);
};

export const exportStatsToPdf = (payload: StatsExportPayload) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let cursorY = margin;

  // Header banner
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(margin, cursorY, pageWidth - margin * 2, 60, 10, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Rapport Statistiques ProFlow', margin + 20, cursorY + 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Généré le : ${payload.metadata.generatedAt}`, margin + 20, cursorY + 48);

  cursorY += 80;
  doc.setTextColor(31, 41, 55);

  // Summary blocks
  const summary = payload.kpis.slice(0, 6);
  const columnCount = 3;
  const gap = 16;
  const boxWidth = (pageWidth - margin * 2 - gap * (columnCount - 1)) / columnCount;
  const boxHeight = 56;
  summary.forEach((entry, index) => {
    const col = index % columnCount;
    const row = Math.floor(index / columnCount);
    const x = margin + col * (boxWidth + gap);
    const y = cursorY + row * (boxHeight + gap);

    doc.setFillColor(240, 246, 255);
    doc.roundedRect(x, y, boxWidth, boxHeight, 8, 8, 'F');
    doc.setDrawColor(79, 70, 229);
    doc.roundedRect(x, y, boxWidth, boxHeight, 8, 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(entry.label, x + 12, y + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(formatValue(entry.value, entry.format), x + 12, y + 38);
  });

  const summaryRows = Math.ceil(summary.length / columnCount);
  cursorY += summaryRows * (boxHeight + gap) + 20;

  const tableSection = (
    title: string,
    head: string[],
    rows: string[][],
    colors: { head: [number, number, number]; alternate: [number, number, number] }
  ) => {
    if (!rows.length) {
      return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138);
    doc.text(title, margin, cursorY + 16);

    autoTable(doc, {
      startY: cursorY + 30,
      head: [head],
      body: rows,
      styles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: [55, 65, 81],
        cellWidth: 'wrap',
        overflow: 'linebreak'
      },
      headStyles: { fillColor: colors.head, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: colors.alternate },
      tableLineColor: [209, 213, 219],
      tableLineWidth: 0.3,
      columnStyles: {
        0: { minCellWidth: 110 },
        1: { minCellWidth: 80 },
        2: { minCellWidth: 80 },
        3: { minCellWidth: 80 },
        4: { minCellWidth: 70 },
        5: { minCellWidth: 90 }
      },
      tableWidth: pageWidth - margin * 2,
      didDrawPage: () => {
        const table = (doc as any).lastAutoTable;
        const tableStruct = table?.table;
        const margins = table?.settings?.margin;
        const left = typeof margins?.left === 'number' ? margins.left : margin;
        const top = typeof margins?.top === 'number' ? margins.top : margin;
        const width = typeof tableStruct?.width === 'number' ? tableStruct.width : 0;
        const height = typeof tableStruct?.height === 'number' ? tableStruct.height : 0;

        if (width > 0 && height > 0) {
          doc.setDrawColor(180, 189, 203);
          doc.roundedRect(left, top, width, height, 10, 10);
        }
      }
    });

    cursorY = (doc as any).lastAutoTable.finalY + 24;
  };

  tableSection(
    'Performance par période',
    ['Période', 'CA Brut', 'CA Net', 'Cotisations', 'Factures', 'Taux cotisations'],
    payload.periodRows.map((row) => [
      row.label,
      formatCurrency(row.revenueBrut),
      formatCurrency(row.revenueNet),
      formatCurrency(row.contributions),
      formatNumber(row.invoices),
      formatPercent(row.contributionRate)
    ]),
    { head: [59, 130, 246], alternate: [239, 246, 255] }
  );

  tableSection(
    'Suivi des factures',
    ['Période', 'Payées', 'En attente', 'En retard', 'Total'],
    payload.invoicesRows.map((row) => [
      row.label,
      formatNumber(row.paid),
      formatNumber(row.pending),
      formatNumber(row.overdue),
      formatNumber(row.total)
    ]),
    { head: [14, 165, 233], alternate: [240, 253, 250] }
  );

  if (payload.topClients.length) {
    tableSection(
      'Top clients',
      ['Client', 'CA Brut', 'CA Net', 'Cotisations', 'Factures', 'Part du CA'],
      payload.topClients.map((client) => [
        client.name,
        formatCurrency(client.revenueBrut),
        formatCurrency(client.revenueNet),
        formatCurrency(client.contributions),
        formatNumber(client.invoices),
        formatPercent(client.percentage)
      ]),
      { head: [129, 140, 248], alternate: [237, 233, 254] }
    );
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(
    'Rapport généré automatiquement. Vérifiez vos données avant communication externe.',
    margin,
    cursorY + 10
  );

  const fileName = `proflow-statistiques-${buildSlug(payload.metadata.chartLabel)}.pdf`;
  doc.save(fileName);
};

