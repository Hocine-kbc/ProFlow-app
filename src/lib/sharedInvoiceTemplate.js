// Template HTML partagé pour les factures
// Utilisé à la fois par print.ts et par le serveur backend

export function generateSharedInvoiceHTML(invoice, client, invoiceServices, settings) {
  const DEFAULT_SERVICE_PRICING_TYPE = 'hourly';

  const SERVICE_PRICING_CONFIG = {
    hourly: {
      unitSuffix: 'h',
      rateSuffix: '€/h',
    },
    daily: {
      unitSuffix: 'j',
      rateSuffix: '€/jour',
    },
    project: {
      unitSuffix: '',
      rateSuffix: '€',
    },
  };

  const getPricingConfig = (pricingType) => {
    const key = pricingType && SERVICE_PRICING_CONFIG[pricingType] ? pricingType : DEFAULT_SERVICE_PRICING_TYPE;
    return SERVICE_PRICING_CONFIG[key];
  };

  const formatServiceQuantity = (quantity, pricingType) => {
    const config = getPricingConfig(pricingType);
    const value = Number(quantity) || 0;
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?(0)+$/, '');
    return `${formatted}${config.unitSuffix}`.trim();
  };

  const formatServiceRate = (rate, pricingType) => {
    const config = getPricingConfig(pricingType);
    if (rate === undefined || rate === null) {
      return `0${config.rateSuffix}`;
    }
    const value = Number(rate) || 0;
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(2);
    return `${formatted}${config.rateSuffix}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculer la différence en jours entre la date de facturation et la date d'échéance
  const calculateDaysDifference = (invoiceDate, dueDate) => {
    if (!invoiceDate || !dueDate) return invoice.payment_terms || settings?.paymentTerms || 30;
    
    const invoice = new Date(invoiceDate);
    const due = new Date(dueDate);
    const diffTime = due - invoice;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : (invoice.payment_terms || settings?.paymentTerms || 30);
  };

  const daysDifference = calculateDaysDifference(invoice.date, invoice.due_date);

  // Trier les services par date (plus ancienne à plus récente)
  const allServices = (invoiceServices || []).sort((a, b) => {
    const dateA = new Date(a.date || invoice.date);
    const dateB = new Date(b.date || invoice.date);
    return dateA - dateB;
  });

  const summaryFromServices = (invoiceServices || []).some((service) => service && service.summary_group);

  const isSummary = invoice.invoice_type === 'summary' || summaryFromServices;

  const normalizeSummaryDescription = (description) => {
    const trimmed = (description || '').trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const groupServicesForSummary = (services) => {
    const normalizeDescription = (description) => {
      const trimmed = (description || '').trim();
      return trimmed.length > 0 ? trimmed : 'Prestations regroupées';
    };

    const map = new Map();

    services.forEach((service) => {
      const description = normalizeDescription(service?.description);
      const hours = Number(service?.hours) || 0;
      const hourlyRate = Number(service?.hourly_rate) || 0;
      const amount = hours * hourlyRate;
      const pricingType = service?.pricing_type || DEFAULT_SERVICE_PRICING_TYPE;
      const key = `${description.toLowerCase()}|${hourlyRate.toFixed(4)}|${pricingType}`;

      if (!map.has(key)) {
        map.set(key, {
          description,
          hours: 0,
          hourlyRate,
          amount: 0,
          count: 0,
          pricingType,
        });
      }

      const group = map.get(key);
      group.hours += hours;
      group.amount += amount;
      group.count += 1;
    });

    return Array.from(map.values()).sort((a, b) => a.description.localeCompare(b.description, 'fr', { sensitivity: 'base' }));
  };

  const displaySummaryDescription = normalizeSummaryDescription(invoice.summary_description);

  const summaryEntries = (invoiceServices || []).filter((service) => service && service.summary_group);

  let displayServices;

  if (isSummary) {
    if (summaryEntries.length > 0) {
      const useCustomDescription = Boolean(displaySummaryDescription) && summaryEntries.length === 1;
      displayServices = summaryEntries.map((service) => {
        const hours = Number(service.hours) || 0;
        const hourlyRate = Number(service.hourly_rate) || 0;
        const pricingType = service?.pricing_type || DEFAULT_SERVICE_PRICING_TYPE;
        const total = typeof service.total === 'number' ? service.total : hours * hourlyRate;
        const description = useCustomDescription
          ? displaySummaryDescription
          : (service.description && service.description.trim().length > 0)
              ? service.description.trim()
              : `Prestations regroupées (${service.summary_source_count || 1})`;
        return {
          description,
          quantityDisplay: formatServiceQuantity(hours, pricingType),
          rateDisplay: formatServiceRate(hourlyRate, pricingType),
          total,
        };
      });
    } else {
      const grouped = groupServicesForSummary(allServices);
      const useCustomDescription = Boolean(displaySummaryDescription) && grouped.length === 1;
      displayServices = grouped.map((group) => ({
        description: useCustomDescription ? displaySummaryDescription : group.description,
        quantityDisplay: formatServiceQuantity(group.hours, group.pricingType),
        rateDisplay: formatServiceRate(group.hourlyRate, group.pricingType),
        total: group.amount,
      }));
    }
  } else {
    displayServices = allServices.map((service) => {
      const hours = Number(service.hours) || 0;
      const hourlyRate = Number(service.hourly_rate) || 0;
      const pricingType = service?.pricing_type || DEFAULT_SERVICE_PRICING_TYPE;
      return {
        date: service.date,
        description: service.description || '',
        quantityDisplay: formatServiceQuantity(hours, pricingType),
        rateDisplay: formatServiceRate(hourlyRate, pricingType),
        total: hours * hourlyRate,
      };
    });
  }

  const tableHeaders = isSummary
    ? `
        <th>Description</th>
        <th class="text-right">Quantité</th>
        <th class="text-right">Tarif</th>
        <th class="text-right">Total</th>
      `
    : `
        <th>Date</th>
        <th>Description</th>
        <th class="text-right">Quantité</th>
        <th class="text-right">Tarif</th>
        <th class="text-right">Total</th>
      `;

  const servicesRows = displayServices
    .map((s) => `
        <tr>
          ${
            isSummary
              ? ''
              : `<td>${formatDate(s.date || invoice.date)}</td>`
          }
          <td>${s.description || ''}</td>
          <td class="text-right">${s.quantityDisplay || '—'}</td>
          <td class="text-right">${s.rateDisplay || '—'}</td>
          <td class="text-right">${(typeof s.total === 'number' ? s.total : 0).toFixed(2)}€</td>
        </tr>`
    )
    .join('');

  const total = invoice.subtotal ?? displayServices.reduce((acc, s) => {
    if (typeof s.total === 'number') {
      return acc + s.total;
    }
    return acc;
  }, 0);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            padding: 0;
            background: #f5f5f5;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
        }
        
        .facture {
            width: 210mm;
            /* Supprimer la hauteur minimale pour éviter de forcer une nouvelle page */
            min-height: auto;
            margin: 10mm auto 0;
            background: white;
            padding: 10mm;
            padding-top: 0;
            position: relative;
            box-shadow: none;
        }
        
    
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .page-title {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
        }
        
        .page-numero {
            font-size: 24px;
            font-weight: 700;
            color: #667eea;
            text-transform: uppercase;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-top: 8px;
            border-top: 2px solid #667eea;
        }
        
        .entreprise {
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        
        .logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        
        .logo-img {
            width: 35px;
            height: 35px;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="35" r="15" fill="%23fff"/><path d="M 30 50 Q 30 45 35 45 L 45 45 L 45 70 Q 45 75 50 75 Q 55 75 55 70 L 55 45 L 65 45 Q 70 45 70 50 L 70 80 Q 70 85 65 85 L 35 85 Q 30 85 30 80 Z" fill="%23fff"/></svg>') center/contain no-repeat;
        }
        
        .entreprise-info h1 {
            color: #667eea;
            font-size: 20px;
            margin-bottom: 3px;
            font-weight: 700;
        }
        
        .entreprise-info .subtitle {
            color: #666;
            font-size: 12px;
            margin-bottom: 8px;
        }
        
        .entreprise-info p {
            color: #555;
            line-height: 1.4;
            font-size: 12px;
        }
        
        .facture-info {
            border: 1px solid #bbbbbb;
            padding: 10px 15px;
            border-radius: 6px;
            background: transparent;
            min-width: 240px;
        }
        
        .facture-info h2 {
            color: #667eea;
            font-size: 12px;
            margin-bottom: 6px;
            font-weight: 700;
        }
        
        .facture-info .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 12px;
        }
        
        .facture-info .info-row label {
            color: #666;
        }
        
        .facture-info .info-row span {
            color: #333;
            font-weight: 600;
        }
        
        .client-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 50px;
        }
        
        .client-box {
            border: 1px solid #bbbbbb;
            padding: 8px 12px;
            border-radius: 4px;
            background: #fff;
            min-width: 280px;
        }
        
        .client-box h3 {
            color: #667eea;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        .client-box p {
            color: #555;
            line-height: 1.4;
            font-size: 12px;
        }
        
        .client-box strong {
            color: #333;
            font-size: 12px;
        }
        
        .table-title {
            color: #667eea;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
            /* Aligner le titre avec le tableau (95% centré) */
            width: 95%;
            margin-left: auto;
            margin-right: auto;
            padding-left: 2px;
        }
        
        table {
            width: 95%;
            margin: 0 auto;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 8px;
            font-size: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: visible;
            table-layout: auto;
            page-break-inside: auto;
        }
        
        
        thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: table-header-group;
        }
        
        tr {
            page-break-inside: auto;
            page-break-after: auto;
        }
        
        tbody {
            page-break-inside: auto;
        }
        
        /* Gérer l'espacement en haut d'une nouvelle page pour les tableaux */
        thead tr {
            page-break-after: auto;
            page-break-before: auto;
        }
        
        
        
        
        th {
            padding: 8px 5px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            white-space: nowrap;
        }
        
        th.text-right {
            text-align: left;
        }
        
        th:last-child {
            border-right: none;
        }
        
        td {
            padding: 6px 9px;
            border-bottom: 1px solid #e5e7eb;
            border-right: 1px solid #e5e7eb;
            font-size: 12px;
            color: #555;
            text-align: left;
        }
        
        /* Assurer que toutes les lignes ont une bordure en bas */
        @media print {
            td {
                border-bottom: 1px solid #e5e7eb !important;
            }
        }
        
        td:last-child {
            border-right: none;
        }
        
        /* Garder les bordures en bas pour toutes les lignes */
        @media print {
            tbody tr:last-child td {
                border-bottom: 1px solid #e5e7eb !important;
            }
        }
        
        /* Bordures arrondies sur l'en-tête du tableau */
        thead tr:first-child th:first-child {
            border-top-left-radius: 6px;
        }
        
        thead tr:first-child th:last-child {
            border-top-right-radius: 6px;
        }
        
        /* Bordures arrondies sur la dernière ligne du tbody - seulement si pas de page break */
        tbody tr:last-child td:first-child {
            border-bottom-left-radius: 6px;
        }
        
        tbody tr:last-child td:last-child {
            border-bottom-right-radius: 6px;
        }
        
        /* Garder les bordures arrondies même en cas de page break */
        @media print {
            tbody tr:last-child td:first-child {
                border-bottom-left-radius: 6px;
            }
            
            tbody tr:last-child td:last-child {
                border-bottom-right-radius: 6px;
            }
        }
        
        tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        tbody tr:hover {
            background: #f3f4f6;
        }
        
        .text-right {
            text-align: left;
        }
        
        .totaux-section {
            display: flex;
            margin-top: 20px;
            justify-content: flex-end;
            margin-bottom: 100px;
            width: 95%;
            margin-left: auto;
            margin-right: auto;
        }
        
        .totaux {
            width: 280px;
            text-align: right;
        }
        
        .totaux-ligne {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 12px;
            color: #555;
        }
        
        .totaux-ligne.total {
            border-top: 2px solid #667eea;
            margin-top: 6px;
            padding-top: 8px;
            font-weight: bold;
            font-size: 16px;
            color: #667eea;
        }
        
        .tva-notice {
            text-align: right;
            color: #666;
            font-size: 12px;
            font-style: italic;
            margin-top: 3px;
        }
        
        .mentions {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            page-break-inside: avoid;
        }
        
        .final-section {
            page-break-inside: avoid;
        }
        
        .mentions h3 {
            color: #333;
            font-size: 12px;
            margin-bottom: 4px;
            font-weight: 700;
        }
        
        .mentions p {
            color: #666;
            font-size: 12px;
            line-height: 1.3;
            margin-bottom: 3px;
        }
        
        .mentions ul {
            list-style-type: disc;
            margin-left: 15px;
            color: #666;
            font-size: 12px;
            line-height: 1.3;
        }
        
        .page-footer {
            margin-top: 20px;
            text-align: right;
            color: #999;
            font-size: 10px;
        }
        
        @media print {
            body {
                padding: 0;
                background: white;
                margin: 0;
            }
            
            .facture {
                width: 210mm;
                /* aucune hauteur minimale en print */
                min-height: auto;
                margin: 0 auto 0;
                padding: 10mm;
                padding-top: 0;
                box-shadow: none;
            }
            
            
            .mentions {
                page-break-inside: avoid;
            }
            
            .final-section {
                page-break-inside: avoid;
            }
            
            .page-footer {
                margin-top: 20px;
            }
            
            @page {
                size: A4;
                /* Marges par défaut (pages 2+) */
                margin: 12mm 0 18mm 0;
            }
            @page :first {
                /* Plus d'espace en bas de la 1ère page */
                margin: 8mm 0 24mm 0;
            }
            
            /* Assurer un espace en haut de chaque nouvelle page pour les tableaux */
            thead {
                display: table-header-group;
            }
            
        }
    </style>
</head>
<body>
    <div class="facture">
        <div class="page-header">
            <div class="page-title">FACTURE</div>
            <div class="page-numero">N° ${invoice.invoice_number}</div>
        </div>
        
        <div class="header">
            <div class="entreprise">
                ${(invoice.company_logo_url || settings?.logoUrl) ? `
                <div class="logo" style="background: transparent;">
                    <img src="${invoice.company_logo_url || settings?.logoUrl}" alt="Logo" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />
                </div>
                ` : `
                <div class="logo">
                    <div class="logo-img"></div>
                </div>
                `}
                <div class="entreprise-info">
                    <h1>${invoice.company_name || settings?.companyName || 'ProFlow'}</h1>
                    <div class="subtitle">${invoice.company_owner || settings?.ownerName || ''}</div>
                    <p>${invoice.company_address || settings?.address || ''}<br>
                    ${(invoice.company_email || settings?.email || '')}${(invoice.company_phone || settings?.phone) ? ' • ' + (invoice.company_phone || settings?.phone) : ''}<br>
                    ${invoice.company_siret || settings?.siret || ''}</p>
                </div>
            </div>
            <div class="facture-info">
                <h2>Facture N° : ${invoice.invoice_number}</h2>
                <div class="info-row">
                    <label>Date d'émission</label>
                    <span>${formatDate(invoice.date)}</span>
                </div>
                <div class="info-row">
                    <label>Date d'échéance</label>
                    <span>${formatDate(invoice.due_date)}</span>
                </div>
            </div>
        </div>
        
        <div class="client-section">
            <div class="client-box">
                <h3>Facturer à</h3>
                <p><strong>${client?.name || 'Client inconnu'}</strong><br>
                ${client?.email ? client.email + '<br>' : ''}
                ${client?.phone ? client.phone + '<br>' : ''}
                ${client?.address || ''}${client?.siren ? '<br>SIREN: ' + client.siren : ''}</p>
            </div>
        </div>
        
        <h3 class="table-title">Détails des prestations</h3>
        
        <table>
            <thead>
                <tr>
                    ${tableHeaders}
                </tr>
            </thead>
            <tbody>
                ${servicesRows}
            </tbody>
        </table>
        
        <div class="totaux-section final-section">
            <div class="totaux">
                <div class="totaux-ligne total">
                    <span>Total à payer :</span>
                    <span>${total.toFixed(2)}€</span>
                </div>
                <div class="tva-notice">TVA non applicable, art.293 B du CGI</div>
            </div>
        </div>
        <div class="mentions final-section">
            <h3>Règlement :</h3>
            <ul>
                <li>Date limite : ${formatDate(invoice.due_date)} (${daysDifference} jour${daysDifference > 1 ? 's' : ''})</li>
                ${(invoice.show_legal_rate !== null ? invoice.show_legal_rate : (settings?.showLegalRate !== false)) ? '<li>Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008</li>' : ''}
                ${(invoice.show_fixed_fee !== null ? invoice.show_fixed_fee : (settings?.showFixedFee !== false)) ? '<li>En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.</li>' : ''}
            </ul>
            <p style="margin-top: 15px;"><strong>Mode de paiement :</strong> ${invoice.payment_method || settings?.paymentMethod || 'Virement bancaire'}</p>
        </div>

        
    </div>
</body>
</html>`;
}
