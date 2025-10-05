// Template HTML pour les factures avec TailwindCSS
// Ce template génère un HTML moderne et professionnel pour les factures

export interface InvoiceData {
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  net_amount: number;
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  services: Array<{
    description: string;
    hours: number;
    hourly_rate: number;
  }>;
  payment_terms?: number;
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
}

export interface CompanyData {
  name: string;
  owner: string;
  address: string;
  email: string;
  phone: string;
  siret: string;
  logoUrl?: string;
  invoiceTerms?: string;
  paymentTerms?: number;
  showLegalRate?: boolean;
  showFixedFee?: boolean;
}

/**
 * Génère le template HTML de la facture avec TailwindCSS
 * @param invoiceData - Données de la facture
 * @param companyData - Données de l'entreprise
 * @returns HTML string avec TailwindCSS inline
 */
export function generateInvoiceHTML(invoiceData: InvoiceData, companyData: CompanyData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };



  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${invoiceData.invoice_number}</title>
  <style>
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      background: #fff;
      color: #333;
      margin: 40px;
    }

    .invoice-box {
      max-width: 800px;
      margin: auto;
    }

    /* Header entreprise + bloc facture */
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .company {
      font-size: 14px;
      line-height: 1.6;
    }

    .company h2 {
      margin: 0;
      font-size: 20px;
      color: #1d4ed8 !important;
    }

    .invoice-info {
      border: 1px solid #ddd;
      padding: 15px 20px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
      background: #f9fafb;
    }

    .invoice-info h1 {
      margin: 0 0 10px;
      font-size: 18px;
      color: #1d4ed8 !important;
    }

    /* Section client */
    .client {
      margin-bottom: 30px;
    }

    .client h3 {
      color: #1d4ed8 !important;
      margin-bottom: 8px;
      font-size: 16px;
    }

    /* Tableau prestations */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 14px;
    }

    table th, table td {
      padding: 10px;
      border: 1px solid #ddd;
      text-align: left;
    }

    table th {
      background: #f3f4f6 !important;
      color: #1d4ed8 !important;
      font-weight: 600;
    }

    /* Total */
    .total {
      text-align: right;
      margin-top: 10px;
      font-size: 16px;
    }

    .total strong {
      font-size: 18px;
      color: #1d4ed8 !important;
    }

    /* Footer */
    footer {
      margin-top: 40px;
      font-size: 12px;
      color: #666;
      line-height: 1.6;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <!-- Header -->
    <div class="header">
      <div class="company">
        <h2>${companyData.name}</h2>
        <p>
          ${companyData.owner}<br>
          ${companyData.address}<br>
          ${companyData.email} • ${companyData.phone}<br>
          SIRET: ${companyData.siret}
        </p>
      </div>
      <div class="invoice-info">
        <h1>Facture N° : ${invoiceData.invoice_number}</h1>
        <p>
          Date d'émission : ${formatDate(invoiceData.date)}<br>
          Date d'échéance : ${formatDate(invoiceData.due_date)}
        </p>
      </div>
    </div>

    <!-- Client -->
    <div class="client">
      <h3>Facturer à</h3>
      <p>
        ${invoiceData.client.name}<br>
        ${invoiceData.client.email}<br>
        ${invoiceData.client.phone || ''}<br>
        ${invoiceData.client.address || ''}
      </p>
    </div>

    <!-- Tableau prestations -->
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Heures</th>
          <th>Tarif</th>
          <th>Montant</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceData.services.map((service) => `
        <tr>
          <td>${formatDate(invoiceData.date)}</td>
          <td>${service.description}</td>
          <td>${service.hours}</td>
          <td>${service.hourly_rate.toFixed(2)}€</td>
          <td>${(service.hours * service.hourly_rate).toFixed(2)}€</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totaux -->
    <div class="total">
      <p><strong>Total à payer : ${invoiceData.subtotal.toFixed(2)} €</strong></p>
    </div>

    <!-- Footer -->
    <footer>
      TVA non applicable, art.293 B du CGI<br>
      ${companyData.invoiceTerms || 'Paiement à 30 jours. Pas de TVA (franchise en base).'}
        ${(invoiceData.show_legal_rate !== null ? invoiceData.show_legal_rate : (companyData.showLegalRate || false)) || (invoiceData.show_fixed_fee !== null ? invoiceData.show_fixed_fee : (companyData.showFixedFee || false)) ? (() => {
        // Calculer la date limite à partir des paramètres de la facture
        const paymentTerms = invoiceData.payment_terms || companyData.paymentTerms || 30;
        const invoiceDate = new Date(invoiceData.date);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentTerms);
        
        // Récupérer les options d'affichage spécifiques à la facture
        const showLegalRate = invoiceData.show_legal_rate !== null ? invoiceData.show_legal_rate : (companyData.showLegalRate !== false);
        const showFixedFee = invoiceData.show_fixed_fee !== null ? invoiceData.show_fixed_fee : (companyData.showFixedFee !== false);
        
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
  </div>
</body>
</html>`;
}
