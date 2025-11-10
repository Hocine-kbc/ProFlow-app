import jsPDF from 'jspdf';

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

const formatCurrency = (value: number) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  return formatted
    .replace(/\u202f|\u00a0/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

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

const formatStatus = (status: string) => {
  const normalized = status?.toLowerCase() ?? '';
  if (['paid', 'payée', 'payee'].includes(normalized)) {
    return 'Payée';
  }
  if (['sent', 'envoyée', 'envoyee'].includes(normalized)) {
    return 'Envoyée';
  }
  if (['partial', 'partielle', 'partially paid'].includes(normalized)) {
    return 'Paiement partiel';
  }
  if (['overdue', 'retard', 'late'].includes(normalized)) {
    return 'En retard';
  }
  if (['draft', 'brouillon'].includes(normalized)) {
    return 'Brouillon';
  }
  return status || '—';
};

export function exportFiscalAttestationToPdf(payload: FiscalAttestationPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const mm = (value: number) => value * 2.83465;

  const margin = mm(20);
  const primaryColor: [number, number, number] = [29, 66, 138];
  const accentSolid: [number, number, number] = [46, 91, 173];
  const accentLight: [number, number, number] = [237, 244, 255];
  const accentBorder: [number, number, number] = [199, 216, 255];
  const neutralColor: [number, number, number] = [55, 65, 81];
  const mutedColor: [number, number, number] = [107, 114, 128];
  const sectionSpacing = mm(16);

  const formatShortDate = (value?: string) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const footerReserved = margin + mm(12);

  let cursorY = 0;
  let footerDrawn = false;

  const drawPageFrame = () => {
    doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  };

  const drawFooter = () => {
    if (footerDrawn) {
      return;
    }
    const lines = [
      `Document officiel - ${payload.provider.company || payload.provider.name || ''}${
        payload.provider.siret ? ` - SIRET : ${payload.provider.siret}` : ''
      }`,
      payload.provider.email || payload.provider.phone
        ? `Contact : ${[payload.provider.email, payload.provider.phone].filter(Boolean).join(' • ')}`
        : ''
    ].filter(Boolean);

    doc.setFont('Times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.setDrawColor(224, 224, 224);
    doc.line(margin, pageHeight - margin - 24, pageWidth - margin, pageHeight - margin - 24);
    lines.forEach((line, index) => {
      doc.text(line, pageWidth / 2, pageHeight - margin - 6 + index * 12, { align: 'center' });
    });
    footerDrawn = true;
  };

  const startNewPage = (isFirstPage: boolean) => {
    drawPageFrame();
    footerDrawn = false;
    cursorY = margin;
    doc.setFont('Times', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
    if (!isFirstPage) {
      doc.setFont('Times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Attestation fiscale (suite)', pageWidth / 2, cursorY + 18, { align: 'center' });
      cursorY += mm(16) + 32;
      doc.setFont('Times', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
    }
  };

  const ensureSpace = (heightNeeded: number) => {
    const limit = pageHeight - footerReserved;
    if (cursorY + heightNeeded > limit) {
      drawFooter();
      doc.addPage();
      startNewPage(false);
    }
  };

  const contentWidth = pageWidth - margin * 2;

  startNewPage(true);

  // Header
  const headerLabel = payload.provider.company || payload.provider.name || 'Votre entreprise';
  const headerBandHeight = mm(26);

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, cursorY, contentWidth, headerBandHeight, 8, 8, 'F');

  doc.setFont('Times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(headerLabel, margin + 18, cursorY + headerBandHeight / 2, {
    baseline: 'middle'
  } as any);

  doc.setFont('Times', 'italic');
  doc.setFontSize(12);
  doc.text(`Attestation fiscale – Exercice ${payload.year}`, margin + contentWidth - 18, cursorY + headerBandHeight / 2, {
    align: 'right',
    baseline: 'middle'
  } as any);

  cursorY += headerBandHeight + mm(6);

  ensureSpace(mm(36));

  // Company info strip
  const providerDetailLines = [
    payload.provider.company || payload.provider.name || '',
    payload.provider.ownerName ? `Représentant : ${payload.provider.ownerName}` : '',
    [payload.provider.address, [payload.provider.postalCode, payload.provider.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    payload.provider.country || '',
    payload.provider.siret ? `SIRET : ${payload.provider.siret}` : '',
    payload.provider.siren ? `SIREN : ${payload.provider.siren}` : '',
    payload.provider.vatNumber ? `N° TVA : ${payload.provider.vatNumber}` : '',
    payload.provider.phone ? `Téléphone : ${payload.provider.phone}` : '',
    payload.provider.email ? `Courriel : ${payload.provider.email}` : ''
  ].filter(Boolean);

  const providerWrapped = providerDetailLines.map((line) =>
    doc.splitTextToSize(line, contentWidth - 48)
  );
  const providerBoxHeight = providerWrapped.reduce((acc, rows) => acc + rows.length * 14, 0) + 36;
  ensureSpace(providerBoxHeight);

  doc.setFont('Times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFillColor(accentLight[0], accentLight[1], accentLight[2]);
  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, cursorY, contentWidth, providerBoxHeight, 6, 6, 'FD');

  let providerLineY = cursorY + 22;
  providerWrapped.forEach((rows) => {
    doc.text(rows, margin + 24, providerLineY);
    providerLineY += rows.length * 14;
  });

  cursorY = cursorY + providerBoxHeight + sectionSpacing / 2;

  // Intro
  doc.setFont('Times', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(51, 51, 51);
  const introLines = doc.splitTextToSize(
    `Je soussigné(e), représentant(e) légal(e) de ${payload.provider.company || payload.provider.name}, atteste que les informations suivantes reflètent fidèlement les prestations réalisées au bénéfice de ${payload.client.company || payload.client.name}.`,
    contentWidth
  );
  ensureSpace(introLines.length * 14 + 10);
  doc.text(introLines, margin, cursorY);
  cursorY += introLines.length * 14 + 10;

  ensureSpace(mm(12) + 24);
  doc.setFont('Times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CERTIFIE QUE', pageWidth / 2, cursorY + 18, { align: 'center' });
  cursorY += mm(10) + 16;

  // Client info box
  const infoRows: Array<[string, string]> = [
    ['Nom et prénom', payload.client.name || '—'],
    ['Entreprise / structure', payload.client.company || '—'],
    [
      'Adresse complète',
      [payload.client.address, [payload.client.postalCode, payload.client.city].filter(Boolean).join(' ')].filter(Boolean).join(' • ') ||
        '—'
    ],
    ['Courriel', payload.client.email || '—'],
    ['Téléphone', payload.client.phone || '—'],
    ['Période couverte', `Du 01/01/${payload.year} au 31/12/${payload.year}`]
  ];

  const infoLabelWidth = 120;
  const infoValueWidth = contentWidth - 48 - infoLabelWidth - 12;
  const infoLinesCount = infoRows.reduce((accumulator, [label, value]) => {
    const labelText = doc.splitTextToSize(`${label} :`, infoLabelWidth);
    const valueText = doc.splitTextToSize(value || '—', infoValueWidth);
    return accumulator + Math.max(labelText.length, valueText.length);
  }, 0);
  const clientBoxHeight = mm(24) + infoLinesCount * 16;

  ensureSpace(clientBoxHeight + sectionSpacing / 2);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, cursorY, contentWidth, clientBoxHeight, 6, 6, 'FD');

  doc.setFont('Times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Bénéficiaire', margin + 18, cursorY + 18);

  doc.setLineWidth(1);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin + 18, cursorY + 24, margin + contentWidth - 18, cursorY + 24);

  doc.setFont('Times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);

  let infoY = cursorY + 40;
  infoRows.forEach(([label, value]) => {
    const labelText = doc.splitTextToSize(`${label} :`, infoLabelWidth);
    const valueText = doc.splitTextToSize(value || '—', infoValueWidth);
    doc.setFont('Times', 'bold');
    doc.text(labelText, margin + 24, infoY);
    doc.setFont('Times', 'normal');
    doc.text(valueText, margin + 24 + infoLabelWidth + 12, infoY);
    const consumed = Math.max(labelText.length, valueText.length);
    infoY += consumed * 16;
  });

  cursorY = cursorY + clientBoxHeight + sectionSpacing / 2;

  // Legal paragraph
  doc.setFont('Times', 'normal');
  doc.setFontSize(13);
  const legalLines = doc.splitTextToSize(
    `A bénéficié de prestations de services à la personne conformément aux dispositions des articles L. 7231-1 et suivants du Code du travail. Ces prestations ouvrent droit au crédit d'impôt prévu à l'article 199 sexdecies du Code général des impôts, sous réserve du respect des plafonds en vigueur.`,
    contentWidth
  );
  ensureSpace(legalLines.length * 14 + mm(10));
  doc.text(legalLines, margin, cursorY);
  cursorY += legalLines.length * 14 + mm(10);

  // Tableau des factures
  const headerHeight = 26;
  const rowPaddingY = 5;
  const baseColumnWidths = {
    date: mm(32),
    statut: mm(36),
    amount: mm(48)
  };
  const descriptionWidth = Math.max(
    contentWidth - baseColumnWidths.date - baseColumnWidths.statut - baseColumnWidths.amount,
    140
  );
  const tableColumns = [
    { label: 'DATE', width: baseColumnWidths.date, align: 'left' as const },
    { label: 'DESCRIPTION', width: descriptionWidth, align: 'left' as const },
    { label: 'STATUT', width: baseColumnWidths.statut, align: 'center' as const },
    { label: 'MONTANT TTC', width: baseColumnWidths.amount, align: 'right' as const }
  ];
  const paddingX = 8;
  const lineHeight = 12;

  const maxRows = 12;
  const sortedInvoices = [...payload.invoices].sort(
    (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
  );
  const rowsToRender = sortedInvoices.slice(0, maxRows);

  const preparedRows = rowsToRender.map((invoice) => {
    const cells = [
      formatShortDate(invoice.issueDate),
      invoice.description || `Facture ${invoice.number}`,
      formatStatus(invoice.status),
      formatCurrency(invoice.amount)
    ];
    const linesPerCell = cells.map((value, index) => {
      const availableWidth = Math.max(tableColumns[index].width - paddingX * 2, 16);
      const wrapped = doc.splitTextToSize(value, availableWidth);
      return wrapped.slice(0, 3);
    });
    const maxLines = Math.max(...linesPerCell.map((arr) => Math.max(arr.length, 1)));
    const rowHeight = rowPaddingY * 2 + maxLines * lineHeight;
    return { linesPerCell, rowHeight };
  });

  const tableBodyHeight = preparedRows.reduce((sum, row) => sum + row.rowHeight, 0);
  const tableHeight = headerHeight + tableBodyHeight;
  const extraNoticeHeight = sortedInvoices.length > maxRows ? mm(16) : mm(6);
  ensureSpace(tableHeight + extraNoticeHeight);

  const tableTop = cursorY;
  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, tableTop, contentWidth, tableHeight, 6, 6, 'S');

  doc.setFillColor(accentSolid[0], accentSolid[1], accentSolid[2]);
  doc.roundedRect(margin, tableTop, contentWidth, headerHeight, 6, 6, 'F');

  doc.setFont('Times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);

  let headerX = margin;
  tableColumns.forEach((column) => {
    const textX =
      column.align === 'right'
        ? headerX + column.width - paddingX
        : column.align === 'center'
        ? headerX + column.width / 2
        : headerX + paddingX;
    doc.text(column.label, textX, tableTop + headerHeight / 2 + 1, {
      align: column.align,
      baseline: 'middle'
    } as any);
    headerX += column.width;
  });

  doc.setFont('Times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);

  let rowY = tableTop + headerHeight;
  preparedRows.forEach((row, index) => {
    const effectiveHeight = Math.max(row.rowHeight, rowPaddingY * 2 + lineHeight);

    if (index % 2 === 1) {
      doc.setFillColor(accentLight[0], accentLight[1], accentLight[2]);
      doc.rect(margin, rowY, contentWidth, effectiveHeight, 'F');
    }

    let cellX = margin;
    row.linesPerCell.forEach((lines, columnIndex) => {
      const column = tableColumns[columnIndex];
      const textX =
        column.align === 'right'
          ? cellX + column.width - paddingX
          : column.align === 'center'
          ? cellX + column.width / 2
          : cellX + paddingX;

      lines.forEach((line: string, lineIdx: number) => {
        doc.text(line, textX, rowY + rowPaddingY + lineHeight + lineIdx * lineHeight, {
          align: column.align
        });
      });

      cellX += column.width;
    });

    doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
    doc.line(margin, rowY + effectiveHeight, margin + contentWidth, rowY + effectiveHeight);
    rowY += effectiveHeight;
  });

  cursorY = rowY;

  if (sortedInvoices.length > maxRows) {
    doc.setFont('Times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(
      `(Liste tronquée – ${sortedInvoices.length - maxRows} factures supplémentaires disponibles sur demande)`,
      margin + contentWidth / 2,
      cursorY + 10,
      { align: 'center' }
    );
    cursorY += mm(16);
  } else {
    cursorY += mm(6);
  }

  // Totals section
  const totalsLines = [
    `Nombre total de factures : ${payload.totals.invoiceCount}`,
    `Montant total facturé : ${formatCurrency(payload.totals.totalBilled)}`,
    `Montant encaissé : ${formatCurrency(payload.totals.totalPaid)}`,
    `Solde restant dû : ${formatCurrency(payload.totals.totalOutstanding)}`
  ];

  const totalsWrapped = totalsLines.map((line) => doc.splitTextToSize(line, contentWidth - 36));
  const totalsHeight = totalsWrapped.reduce((acc, lines) => acc + lines.length * 14, 0) + 36;
  ensureSpace(totalsHeight);

  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setFillColor(accentLight[0], accentLight[1], accentLight[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, cursorY, contentWidth, totalsHeight, 6, 6, 'FD');

  const totalsInnerX = margin + 18;
  doc.setFont('Times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Synthèse des montants', totalsInnerX, cursorY + 18);

  doc.setFont('Times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  let totalY = cursorY + 34;
  totalsWrapped.forEach((lines) => {
    doc.text(lines, totalsInnerX, totalY);
    totalY += lines.length * 14;
  });

  cursorY = cursorY + totalsHeight + sectionSpacing / 2;

  // Tax benefit
  const creditAmount = formatCurrency(Math.max(0, payload.totals.totalPaid / 2));
  const taxLines = [
    `Montant estimé du crédit d'impôt (50 % des dépenses déclarées) : ${creditAmount}.`,
    `Ce montant reste soumis aux plafonds annuels et conditions prévues à l'article 199 sexdecies du CGI.`
  ];

  const taxWrapped = taxLines.map((line) => doc.splitTextToSize(line, contentWidth - 36));
  const taxHeight = taxWrapped.reduce((acc, lines) => acc + lines.length * 14, 0) + 36;
  ensureSpace(taxHeight);

  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(1);
  doc.roundedRect(margin, cursorY, contentWidth, taxHeight, 6, 6, 'FD');

  const taxInnerX = margin + 18;
  doc.setFont('Times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Avantage fiscal', taxInnerX, cursorY + 18);

  doc.setFont('Times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  let taxY = cursorY + 34;
  taxWrapped.forEach((lines) => {
    doc.text(lines, taxInnerX, taxY);
    taxY += lines.length * 14;
  });

  cursorY = cursorY + taxHeight + sectionSpacing / 2;

  // Notes / legal info
  const legalNotes =
    payload.notes && payload.notes.length > 0
      ? payload.notes
      : [
          'Conservez cette attestation et reportez les montants sur le formulaire 2042 RICI (cases 7DB à 7GG selon votre situation).',
          'Le crédit d’impôt est plafonné à 12 000 € de dépenses annuelles, majorations comprises selon les situations particulières.',
          'Les prestations doivent avoir été réalisées à votre résidence située en France.',
          'En cas de contrôle, la présente attestation tient lieu de justificatif des sommes effectivement acquittées.'
        ];

  const notesWrapped = legalNotes.map((note) => doc.splitTextToSize(`• ${note}`, contentWidth - 36));
  const notesHeight = notesWrapped.reduce((acc, lines) => acc + lines.length * 14, 0) + 36;

  ensureSpace(notesHeight);
  doc.setDrawColor(accentBorder[0], accentBorder[1], accentBorder[2]);
  doc.setFillColor(accentLight[0], accentLight[1], accentLight[2]);
  doc.setLineWidth(1);
  doc.roundedRect(margin, cursorY, contentWidth, notesHeight, 6, 6, 'FD');

  const notesInnerX = margin + 18;
  doc.setFont('Times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Rappels utiles', notesInnerX, cursorY + 18);

  doc.setFont('Times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(neutralColor[0], neutralColor[1], neutralColor[2]);
  let noteY = cursorY + 34;
  notesWrapped.forEach((lines) => {
    doc.text(lines, notesInnerX, noteY);
    noteY += lines.length * 14;
  });

  cursorY = cursorY + notesHeight + sectionSpacing / 2;

  // Signature
  ensureSpace(mm(36) + mm(12));
  doc.setFont('Times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(102, 102, 102);
  doc.text(
    `Fait à ${payload.provider.city || payload.provider.country || '…'}, le ${formatDate(payload.issueDate)}`,
    margin,
    cursorY + 18
  );

  doc.setFont('Times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(payload.provider.ownerName || payload.provider.name || '', margin, cursorY + 36);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(pageWidth - margin - mm(70), cursorY + 32, pageWidth - margin, cursorY + 32);
  doc.setFont('Times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(102, 102, 102);
  doc.text('Signature et cachet', pageWidth - margin - mm(35), cursorY + 46, { align: 'center' });

  drawFooter();

  const fileName =
    payload.fileName ||
    `attestation-fiscale-${payload.year}-${slugify(payload.client.company || payload.client.name || 'client')}.pdf`;
  doc.save(fileName);
}

