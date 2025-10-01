// Wrapper TypeScript pour le template partagé
import { generateSharedInvoiceHTML as generateSharedInvoiceHTMLJS } from './sharedInvoiceTemplate.js';

export function generateSharedInvoiceHTML(
  invoice: any,
  client: any,
  invoiceServices: any[],
  settings: any
): string {
  return generateSharedInvoiceHTMLJS(invoice, client, invoiceServices, settings);
}
