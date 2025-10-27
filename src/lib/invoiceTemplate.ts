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
    date?: string;
  }>;
  payment_terms?: number;
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
  // Données d'entreprise au moment de la création (pour immutabilité)
  company_name?: string;
  company_owner?: string;
  company_email?: string;
  company_phone?: string;
  company_address?: string;
  company_siret?: string;
  company_logo_url?: string;
  payment_method?: string;
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
  paymentMethod?: string;
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
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Services rows
  const servicesRows = invoiceData.services.map((service) => `
    <tr>
      <td>${formatDate(service.date || invoiceData.date)}</td>
      <td>${service.description}</td>
      <td class="text-right">${service.hours}</td>
      <td class="text-right">${service.hourly_rate.toFixed(2)}€</td>
      <td class="text-right">${(service.hours * service.hourly_rate).toFixed(2)}€</td>
    </tr>
  `).join('');

  const total = invoiceData.subtotal || 0;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
            height: 297mm;
            margin: 20px auto;
            background: white;
            padding: 10mm;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
    
        
        .page-numero {
            text-align: right;
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
            font-size: 10px;
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
            font-size: 10px;
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
            margin-bottom: 10px;
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
            font-size: 10px;
        }
        
        .client-box strong {
            color: #333;
            font-size: 10px;
        }
        
        .table-title {
            color: #667eea;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        
        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 8px;
            font-size: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
            table-layout: auto;
        }
        
        thead {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        th {
            padding: 8px 5px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
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
            font-size: 10px;
            color: #555;
            text-align: left;
        }
        
        td:last-child {
            border-right: none;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
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
            justify-content: flex-end;
            margin-bottom: 8px;
        }
        
        .totaux {
            width: 280px;
            text-align: right;
        }
        
        .totaux-ligne {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 10px;
            color: #555;
        }
        
        .totaux-ligne.total {
            border-top: 2px solid #667eea;
            margin-top: 6px;
            padding-top: 8px;
            font-weight: bold;
            font-size: 12px;
            color: #667eea;
        }
        
        .tva-notice {
            text-align: right;
            color: #666;
            font-size: 10px;
            font-style: italic;
            margin-top: 3px;
        }
        
        .mentions {
            position: absolute;
            bottom: 5mm;
            left: 10mm;
            right: 10mm;
            margin-top: 0;
            padding-top: 8px;
            border-top: 1px solid #e5e7eb;
        }
        
        .mentions h3 {
            color: #333;
            font-size: 12px;
            margin-bottom: 4px;
            font-weight: 700;
        }
        
        .mentions p {
            color: #666;
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 3px;
        }
        
        .mentions ul {
            list-style-type: disc;
            margin-left: 15px;
            color: #666;
            font-size: 10px;
            line-height: 1.3;
        }
        
        .page-footer {
            position: absolute;
            bottom: 10mm;
            left: 10mm;
            right: 10mm;
            display: flex;
            justify-content: flex-end;
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
                height: 297mm;
                margin: 0;
                padding: 10mm;
                box-shadow: none;
            }
            
            .page-footer {
                position: absolute;
                bottom: 10mm;
            }
            
            @page {
                size: A4;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="facture">
        <div class="page-header">
            <div class="page-numero">FACTURE</div>
        </div>
        
        <div class="header">
            <div class="entreprise">
                <div class="logo">
                    <div class="logo-img"></div>
                </div>
                <div class="entreprise-info">
                    <h1>${invoiceData.company_name !== null ? invoiceData.company_name : companyData.name}</h1>
                    <div class="subtitle">${invoiceData.company_owner !== null ? invoiceData.company_owner : companyData.owner}</div>
                    <p>${invoiceData.company_address !== null ? invoiceData.company_address : companyData.address}<br>
                    ${invoiceData.company_email !== null ? invoiceData.company_email : companyData.email} • ${invoiceData.company_phone !== null ? invoiceData.company_phone : companyData.phone}<br>
                    SIRET: ${invoiceData.company_siret !== null ? invoiceData.company_siret : companyData.siret}</p>
                </div>
            </div>
            <div class="facture-info">
                <h2>Facture N° : ${invoiceData.invoice_number}</h2>
                <div class="info-row">
                    <label>Date d'émission</label>
                    <span>${formatDate(invoiceData.date)}</span>
                </div>
                <div class="info-row">
                    <label>Date d'échéance</label>
                    <span>${formatDate(invoiceData.due_date)}</span>
                </div>
            </div>
        </div>
        
        <div class="client-section">
            <div class="client-box">
                <h3>Facturer à</h3>
                <p><strong>${invoiceData.client.name}</strong><br>
                ${invoiceData.client.email}<br>
                ${invoiceData.client.phone || ''}<br>
                ${invoiceData.client.address || ''}</p>
            </div>
        </div>
        
        <h3 class="table-title">Détails des prestations</h3>
        
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th class="text-right">Heures</th>
                    <th class="text-right">Tarif</th>
                    <th class="text-right">Montant</th>
                </tr>
            </thead>
            <tbody>
                ${servicesRows}
            </tbody>
        </table>
        
        <div class="totaux-section">
            <div class="totaux">
                <div class="totaux-ligne total">
                    <span>Total à payer :</span>
                    <span>${total.toFixed(2)}€</span>
                </div>
                <div class="tva-notice">TVA non applicable, art.293 B du CGI</div>
            </div>
        </div>
        <div class="mentions">
            <h3>Règlement :</h3>
            <ul>
                <li>Date limite : ${formatDate(invoiceData.due_date)} (30 jours)</li>
                ${invoiceData.show_legal_rate !== false && (companyData?.showLegalRate !== false) ? '<li>Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008</li>' : ''}
                ${invoiceData.show_fixed_fee !== false && (companyData?.showFixedFee !== false) ? '<li>En cas de retard de paiement, application d\'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l\'article D. 441-5 du code du commerce.</li>' : ''}
            </ul>
            <p style="margin-top: 15px;"><strong>Mode de paiement :</strong> ${invoiceData.payment_method || companyData.paymentMethod || 'Virement bancaire'}</p>
        </div>

        <div class="page-footer">
             <div>1/1</div>
        </div>
        
    </div>
</body>
</html>`;
}
