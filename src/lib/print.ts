import { Invoice, Service } from '../types';

function euro(amount: number): string {
  return `${amount.toFixed(2)}€`;
}

export function openInvoicePrintWindow(invoice: Invoice) {
  // Read saved business settings (from SettingsPage)
  let settings: any = null;
  try {
    const raw = localStorage.getItem('business-settings');
    settings = raw ? JSON.parse(raw) : null;
  } catch {}

  const servicesRows = (invoice.services || ([] as Service[]))
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

  const html = `<!doctype html>
  <html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Facture ${invoice.invoice_number}</title>
    <style>
      @page { size: A4 portrait; margin: 16mm; }
      html, body { height: 100%; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; padding: 0; color: #111827; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.5; }
      .container { padding: 48px 28px 28px 28px; }
      .brand { color: #1d4ed8; }
      .brand-bg { background: #1d4ed8; }
      .brand-weak-bg { background: #eff6ff; }
      .brand-border { border-color: #1d4ed8; }
      .chip { display:inline-block; padding: 4px 10px; border-radius: 9999px; background: #1d4ed8; color: #ffffff; font-weight: 600; font-size: 12px; letter-spacing: 0.4px; }
      .divider { height: 0; background: transparent; margin: 0; }
      h1 { font-size: 22px; margin: 0 0 10px; }
      h2 { font-size: 16px; margin: 20px 0 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom: none; padding: 10px; font-size: 12px; }
      thead th:not(:last-child), tbody td:not(:last-child) { border-right: 1px solid #e5e7eb; }
      th { text-align: left; color: #1d4ed8; background: #eff6ff; }
      .table-card { border:1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background:#ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .table-card table { margin: 0; }
      .table-card thead th { border-bottom: 1px solid #dbe2ea; }
      .table-card tbody tr:nth-child(even) { background: #f8fafc; }
      .table-card tbody td { border-bottom: 1px solid #eef2f7; }
      .totals { margin-top: 16px; width: auto; margin-left: auto; }
      .totals td { padding: 2px 0; font-size: 14px; border: none !important; }
      .totals td:first-child { padding-right: 4px; white-space: nowrap; }
      .right { text-align: right; }
      .muted { color: #6b7280; font-size: 12px; }
      .row { display:flex; justify-content: space-between; gap: 28px; }
      .card { border:1px solid #e5e7eb; border-radius:8px; padding:14px; background: #ffffff; }
      .header-bar { height: 8px; width: 100%; margin-bottom: 32px; }
      @media print { .no-print { display:none; } .container { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="header-bar brand-bg"></div>
    <div class="container">
    <header class="row" style="align-items:flex-start">
      <div style="flex:1">
        <div style="display:flex; align-items:center; gap:12px">
          ${settings?.logoUrl ? `<img src="${settings.logoUrl}" alt="logo" style="height:56px; width:auto; object-fit:contain;" />` : ''}
          <div>
            <div class="chip">${settings?.invoicePrefix || 'FAC'}</div>
            <h1 class="brand" style="margin-top:6px">${settings?.companyName || 'Mon Entreprise'}</h1>
          </div>
        </div>
        <div class="divider"></div>
        <div style="margin-top:10px">
          <div class="muted">${settings?.address || ''}</div>
          <div class="muted">${settings?.email || ''} ${settings?.phone ? ' • ' + settings.phone : ''}</div>
          ${settings?.siret ? `<div class="muted">SIRET: ${settings.siret}</div>` : ''}
        </div>
      </div>
      <div class="card brand-border" style="min-width:280px; border-width:2px">
        <div style="font-size:14px; margin-bottom:4px"><strong class="brand">Facture</strong> ${invoice.invoice_number}</div>
        <div style="display:flex; justify-content:space-between"><span class="muted">Date</span><span>${new Date(invoice.date).toLocaleDateString('fr-FR')}</span></div>
        <div style="display:flex; justify-content:space-between"><span class="muted">Échéance</span><span>${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</span></div>
      </div>
    </header>

    <section class="row" style="margin-top:24px">
      <div class="card" style="flex:1;">
        <div style="font-weight:600; margin-bottom:4px" class="brand">Facturer à</div>
        <div>${invoice.client?.name || ''}</div>
        <div class="muted">${invoice.client?.email || ''}</div>
      </div>
    </section>
    <main>
      <h2 class="brand" style="margin-top:24px">Détails des prestations</h2>
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
          ${servicesRows}
        </tbody>
      </table>
      </div>

      <table class="totals">
        <tr>
          <td class="right muted">Total à payer&nbsp;:</td>
          <td class="right">${euro(invoice.subtotal)}</td>
        </tr>
      </table>
    </main>
    <footer style="margin-top:24px" class="muted">
      ${settings?.invoiceTerms || `Conditions de paiement: ${settings?.paymentTerms || 30} jours. Aucune TVA applicable (franchise de base).`}
    </footer>
    <script>window.onload = () => { window.print(); };</script>
    </div>
  </body>
  </html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}


