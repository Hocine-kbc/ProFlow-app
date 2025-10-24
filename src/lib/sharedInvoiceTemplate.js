// Template HTML partagé pour les factures
// Utilisé à la fois par print.ts et par le serveur backend

export function generateSharedInvoiceHTML(invoice, client, invoiceServices, settings) {
  const servicesRows = (invoiceServices || [])
    .map(
      (s) => `
        <tr>
          <td>${new Date(s.date).toLocaleDateString('fr-FR')}</td>
          <td>${s.description || ''}</td>
          <td class="right">${s.hours}</td>
          <td class="right">${s.hourly_rate.toFixed(2)}€</td>
          <td class="right">${(s.hours * s.hourly_rate).toFixed(2)}€</td>
        </tr>`
    )
    .join('');

  function euro(amount) {
    return `${amount.toFixed(2)}€`;
  }

  return `<!doctype html>
  <html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Facture ${invoice.invoice_number}</title>
    <style>
      @page { 
        size: A4 portrait; 
        margin: 10mm; 
        padding: 0;
      }
      html, body { 
        height: auto; 
        margin: 0; 
        padding: 0;
      }
      body { 
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; 
        padding: 0; 
        color: #111827; 
        background: #ffffff; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
        line-height: 1.4; 
        font-size: 12px;
      }
      .container { 
        padding: 20px 15px; 
        max-width: 100%;
        box-sizing: border-box;
      }
      .brand { color: #1d4ed8; }
      .brand-bg { background: #1d4ed8; }
      .brand-weak-bg { background: #eff6ff; }
      .brand-border { border-color: #1d4ed8; }
      .chip { display:inline-block; padding: 4px 10px; border-radius: 9999px; background: #1d4ed8; color: #ffffff; font-weight: 600; font-size: 12px; letter-spacing: 0.4px; }
      .divider { height: 0; background: transparent; margin: 0; }
      h1 { font-size: 18px; margin: 0 0 8px; }
      h2 { font-size: 14px; margin: 15px 0 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; }
      th, td { border-bottom: none; padding: 6px 8px; font-size: 11px; }
      thead th:not(:last-child), tbody td:not(:last-child) { border-right: 1px solid #e5e7eb; }
      th { text-align: left; color: #1d4ed8; background: #eff6ff; }
      .table-card { border:1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background:#ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .table-card table { margin: 0; }
      .table-card thead th { border-bottom: 1px solid #dbe2ea; }
      .table-card tbody tr:nth-child(even) { background: #f8fafc; }
      .table-card tbody td { border-bottom: 1px solid #eef2f7; }
      .totals { margin-top: 12px; width: auto; margin-left: auto; }
      .totals td { padding: 1px 0; font-size: 12px; border: none !important; }
      .totals td:first-child { padding-right: 4px; white-space: nowrap; }
      .right { text-align: right; }
      .muted { color: #6b7280; font-size: 10px; }
      .row { display:flex; justify-content: space-between; gap: 20px; }
      .card { border:1px solid #e5e7eb; border-radius:6px; padding:10px; background: #ffffff; }
      .header-bar { height: 4px; width: 100%; margin-bottom: 20px; }
      @media print { 
        .no-print { display:none; } 
        .container { padding: 0; }
        
        /* Configuration des pages */
        @page {
          margin: 0.5in;
        }
        
        /* Marge supplémentaire pour les pages suivantes */
        .table-card {
          page-break-inside: auto;
        }
        
        /* Ajouter un espacement au début des pages suivantes */
        .table-card {
          margin-top: 20px;
        }
        
        /* Espacement supplémentaire pour les pages suivantes */
        @media print {
          .table-card {
            margin-top: 40px;
          }
        }
        
        
        /* Empêcher la division des éléments importants */
        .invoice-header { page-break-inside: avoid; }
        .client-info { page-break-inside: avoid; }
        .section-title { page-break-inside: avoid; }
        
        /* Permettre seulement la division du tableau */
        .table-card { page-break-inside: auto; }
        table { page-break-inside: auto; }
        thead { display: table-header-group; }
        tbody { page-break-inside: auto; }
        tr { page-break-inside: auto; page-break-after: auto; }
        td, th { page-break-inside: avoid; }
        
        /* Totaux et footer uniquement à la fin */
        .totals { page-break-inside: avoid; }
        footer { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="header-bar brand-bg"></div>
    
    <div class="container">
    <header class="row invoice-header" style="align-items:flex-start">
      <div style="flex:1">
        <div style="display:flex; align-items:center; gap:12px">
          ${(invoice.company_logo_url !== null ? invoice.company_logo_url : settings?.logoUrl) ? `<img src="${invoice.company_logo_url !== null ? invoice.company_logo_url : settings.logoUrl}" alt="logo" style="height:56px; width:auto; object-fit:contain;" />` : ''}
          <div>
            <h1 class="brand" style="margin:0">${invoice.company_name !== null ? invoice.company_name : (settings?.companyName || 'ProFlow')}</h1>
            <div class="muted" style="margin-top:4px">${invoice.company_owner !== null ? invoice.company_owner : (settings?.ownerName || 'Votre flux professionnel simplifié')}</div>
          </div>
        </div>
        <div class="divider"></div>
        <div style="margin-top:10px">
          <div class="muted">${invoice.company_address !== null ? invoice.company_address : (settings?.address || '')}</div>
          <div class="muted">${invoice.company_email !== null ? invoice.company_email : (settings?.email || '')} ${(invoice.company_phone !== null ? invoice.company_phone : settings?.phone) ? ' • ' + (invoice.company_phone !== null ? invoice.company_phone : settings.phone) : ''}</div>
          ${(invoice.company_siret !== null ? invoice.company_siret : settings?.siret) ? `<div class="muted">SIRET: ${invoice.company_siret !== null ? invoice.company_siret : settings.siret}</div>` : ''}
        </div>
      </div>
      <div class="card brand-border" style="min-width:280px; border-width:2px">
        <div style="font-size:18px; margin-bottom:8px; font-weight:700" class="brand">Facture N° : ${invoice.invoice_number}</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px"><span class="muted">Date d'émission</span><span>${new Date(invoice.date).toLocaleDateString('fr-FR')}</span></div>
        <div style="display:flex; justify-content:space-between"><span class="muted">Date d'échéance</span><span>${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span></div>
      </div>
    </header>

    <section class="row client-info" style="margin-top:24px">
      <div style="flex:1;"></div>
      <div class="card" style="flex:1; max-width:400px;">
        <div style="font-weight:600; margin-bottom:8px" class="brand">Facturer à</div>
        <div style="font-weight:600; margin-bottom:4px">${client?.name || 'Client inconnu'}</div>
        <div class="muted" style="margin-bottom:2px">${client?.email || ''}</div>
        <div class="muted" style="margin-bottom:2px">${client?.phone || ''}</div>
        <div class="muted">${client?.address || ''}</div>
      </div>
    </section>
    <main>
      <h2 class="brand section-title" style="margin-top:24px">Détails des prestations</h2>
      <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th class="right">Heures</th>
            <th class="right">Tarif</th>
            <th class="right">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${servicesRows || '<tr><td colspan="5" class="text-center muted">Aucune prestation trouvée</td></tr>'}
        </tbody>
      </table>
      </div>
      

      <table class="totals">
        <tr>
          <td class="right muted">Total à payer&nbsp;:</td>
          <td class="right">${euro(invoice.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="2" class="right muted" style="font-size:11px; padding-top:8px;">TVA non applicable, art.293 B du CGI</td>
        </tr>
      </table>
    </main>
    <footer style="margin-top:24px" class="muted">
      ${invoice.invoice_terms || settings?.invoiceTerms || settings?.paymentTerms || `Conditions de paiement: ${settings?.paymentDays || 30} jours. Aucune TVA applicable (franchise de base).`}
      ${(invoice.payment_method || settings?.paymentMethod) ? `<br><br><strong>Mode de paiement :</strong> ${invoice.payment_method || settings.paymentMethod}` : ''}
      ${(invoice.additional_terms || settings?.additionalTerms) ? `<br><br>${invoice.additional_terms || settings.additionalTerms}` : ''}
        ${(invoice.show_legal_rate !== null ? invoice.show_legal_rate : (settings?.showLegalRate || false)) || (invoice.show_fixed_fee !== null ? invoice.show_fixed_fee : (settings?.showFixedFee || false)) ? (() => {
        // Calculer la date limite à partir des paramètres de la facture
        const paymentTerms = invoice.payment_terms || settings?.paymentTerms || 30;
        const invoiceDate = new Date(invoice.date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        
        // Récupérer les options d'affichage spécifiques à la facture
        const showLegalRate = invoice.show_legal_rate !== null ? invoice.show_legal_rate : (settings?.showLegalRate !== false);
        const showFixedFee = invoice.show_fixed_fee !== null ? invoice.show_fixed_fee : (settings?.showFixedFee !== false);
        
        let reglementText = '<br><br><strong>Règlement :</strong><br>';
        
        // La date limite s'affiche toujours automatiquement
        reglementText += `• Date limite : ${dueDate.toLocaleDateString('fr-FR')} (${paymentTerms} jours)<br>`;
        
        if (showLegalRate) {
          reglementText += '• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008<br>';
        }
        
        if (showFixedFee) {
          reglementText += '• En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.';
        }
        
        return reglementText;
      })() : ''}
    </footer>
    <script>window.onload = () => { window.print(); };</script>
    </div>
  </body>
  </html>`;
}
