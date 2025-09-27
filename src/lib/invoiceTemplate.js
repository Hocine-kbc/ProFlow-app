// Template HTML pour les factures avec TailwindCSS
// Ce template génère un HTML moderne et professionnel pour les factures

/**
 * Génère le template HTML de la facture avec TailwindCSS
 * @param {Object} invoiceData - Données de la facture
 * @param {Object} companyData - Données de l'entreprise
 * @returns {string} HTML string avec TailwindCSS inline
 */
export function generateInvoiceHTML(invoiceData, companyData) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };


  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceData.invoice_number}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: 'Arial', sans-serif; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    @media print {
      .print-break {
        page-break-before: always;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body class="bg-white text-gray-800">
  <div class="max-w-3xl mx-auto p-10">
    
    <!-- En-tête -->
    <div class="flex justify-between items-start mb-10">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-2">${companyData.name}</h1>
        <p class="text-sm">${companyData.owner}</p>
        <p class="text-sm">${companyData.address}</p>
        <p class="text-sm">${companyData.email} • ${companyData.phone}</p>
        <p class="text-sm">SIRET : ${companyData.siret}</p>
      </div>
      <div class="text-right">
        <h2 class="text-xl font-semibold mb-2">Facture</h2>
        <p class="text-sm"><strong>N° :</strong> ${invoiceData.invoice_number}</p>
        <p class="text-sm"><strong>Date :</strong> ${formatDate(invoiceData.date)}</p>
        <p class="text-sm"><strong>Échéance :</strong> ${formatDate(invoiceData.due_date)}</p>
      </div>
    </div>

    <!-- Infos client -->
    <div class="mb-10">
      <h3 class="text-lg font-semibold mb-2">Facturer à :</h3>
      <p class="text-sm">${invoiceData.client.name}</p>
      <p class="text-sm">${invoiceData.client.address || 'Adresse non renseignée'}</p>
      <p class="text-sm">${invoiceData.client.email} • ${invoiceData.client.phone || ''}</p>
    </div>

    <!-- Tableau des prestations -->
    <table class="w-full border-collapse mb-10 text-sm table-auto">
      <thead>
        <tr class="bg-gray-100 border-b">
          <th class="p-3 text-left">Description</th>
          <th class="p-3 text-left">Qté/Heures</th>
          <th class="p-3 text-left">Tarif H</th>
          <th class="p-3 text-right">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.services.map((service, index) => `
        <tr class="border-b">
          <td class="p-3">${service.description}</td>
          <td class="p-3">${service.hours}</td>
          <td class="p-3">${formatCurrency(service.hourly_rate)}</td>
          <td class="p-3 text-right">${formatCurrency(service.hours * service.hourly_rate)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totaux -->
    <div class="text-right mb-16">
      <p class="text-base mb-2"><strong>Sous-total :</strong> ${formatCurrency(invoiceData.subtotal)}</p>
      <p class="text-2xl font-bold text-gray-900">TOTAL : ${formatCurrency(invoiceData.subtotal)} €</p>
    </div>

    <!-- Mentions légales -->
    <div class="text-xs text-gray-600 border-t pt-6 leading-relaxed">
      <p>TVA non applicable, art. 293 B du CGI.</p>
      <p>Paiement sous 30 jours par virement bancaire.</p>
      <p>Merci de votre confiance.</p>
    </div>

  </div>
</body>
</html>`;
}
