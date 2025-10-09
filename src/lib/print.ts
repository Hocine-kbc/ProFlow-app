import { Invoice } from '../types/index.ts';
import { generateSharedInvoiceHTML } from './sharedInvoiceTemplate.ts';

export function openInvoicePrintWindow(invoice: Invoice, clients?: any[], services?: any[]) {
  // Read saved business settings (from SettingsPage)
  let settings: any = null;
  try {
    const raw = localStorage.getItem('business-settings');
    settings = raw ? JSON.parse(raw) : null;
  } catch {}

  // Use passed clients/services or fallback to localStorage
  const clientsData = clients || (() => {
    try {
      const raw = localStorage.getItem('clients');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const servicesData = services || (() => {
    try {
      const raw = localStorage.getItem('services');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  // Get client data with fallback
  const client = invoice.client || clientsData.find((c: any) => c.id === invoice.client_id);

  // Get services for this invoice - try from invoice.services first, then from passed services
  let invoiceServices = invoice.services || [];
  
  // If no services in invoice, try to find them from passed services
  if (invoiceServices.length === 0 && servicesData.length > 0) {
    console.log('No services found in invoice, trying to find from passed services...');
    
    // Find services that are marked as 'invoiced' and belong to the same client
    const clientServices = servicesData.filter((s: any) => 
      s.client_id === invoice.client_id && s.status === 'invoiced'
    );
    
    if (clientServices.length > 0) {
      console.log('Found invoiced services for this client:', clientServices);
      invoiceServices = clientServices;
    } else {
      // If no invoiced services found, try to find completed services for this client
      // This is a fallback for cases where services might not be marked as 'invoiced'
      const completedServices = servicesData.filter((s: any) => 
        s.client_id === invoice.client_id && s.status === 'completed'
      );
      
      if (completedServices.length > 0) {
        console.log('Found completed services for this client (fallback):', completedServices);
        invoiceServices = completedServices;
      }
    }
  }

  // Recalculer le montant total à partir des services
  const calculatedAmount = invoiceServices.reduce((acc: number, service: any) => {
    const hours = Number(service.hours) || 0;
    const rate = Number(service.hourly_rate) || 0;
    return acc + (hours * rate);
  }, 0);

  // Créer une copie de la facture avec le montant recalculé
  const invoiceWithCalculatedAmount = {
    ...invoice,
    subtotal: calculatedAmount,
    net_amount: calculatedAmount
  };

  // Debug: Log invoice data
  console.log('Print invoice data:', {
    invoice: invoiceWithCalculatedAmount,
    client: client,
    services: invoiceServices,
    servicesCount: invoiceServices?.length || 0,
    allServicesCount: servicesData.length,
    calculatedAmount: calculatedAmount,
    originalAmount: invoice.subtotal
  });

  // Utiliser le template partagé avec le montant recalculé
  const html = generateSharedInvoiceHTML(invoiceWithCalculatedAmount, client, invoiceServices, settings);

  // Check if we're on mobile or if window.open is blocked
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  console.log('Print function called:', { isMobile, userAgent: navigator.userAgent });
  
  if (isMobile) {
    // For mobile devices, use a simpler approach
    console.log('Mobile detected, attempting to open window...');
    try {
      // Try to open in new window first
      const win = window.open('', '_blank');
      console.log('Window opened:', !!win);
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        console.log('HTML written to window');
      } else {
        console.log('Window.open failed, trying alternative methods...');
        // Method 1: Try to create a blob and download directly
        try {
          // Try with application/octet-stream to force download
          const blob = new Blob([html], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `facture-${invoice.invoice_number}.html`;
          link.style.display = 'none';
          // Force download instead of opening
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log('Blob download attempted with octet-stream');
        } catch (blobError) {
          console.log('Octet-stream failed, trying text/html...');
          // Fallback to text/html
          try {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `facture-${invoice.invoice_number}.html`;
            link.style.display = 'none';
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('Blob download attempted with text/html');
          } catch (blobError2) {
            console.log('Blob download failed, trying data URL...');
            // Method 2: Try data URL with forced download
            try {
              const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
              const link = document.createElement('a');
              link.href = dataUrl;
              link.download = `facture-${invoice.invoice_number}.html`;
              link.style.display = 'none';
              // Force download instead of opening
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              console.log('Data URL download attempted');
            } catch (dataError) {
              console.log('Data URL failed, showing content in current window...');
              // Method 3: Show content in current window with print button
            const printWindow = document.createElement('div');
            printWindow.innerHTML = html;
            printWindow.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: white;
              z-index: 9999;
              overflow: auto;
            `;
            
            // Add print button
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '🖨️ Imprimer/PDF';
            printBtn.style.cssText = `
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 10000;
              background: #1d4ed8;
              color: white;
              border: none;
              padding: 15px 20px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            printBtn.onclick = () => {
              window.print();
              document.body.removeChild(printWindow);
            };
            
            // Add close button
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕ Fermer';
            closeBtn.style.cssText = `
              position: fixed;
              top: 10px;
              left: 10px;
              z-index: 10000;
              background: #dc2626;
              color: white;
              border: none;
              padding: 15px 20px;
              border-radius: 8px;
              font-weight: bold;
              font-size: 16px;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            closeBtn.onclick = () => {
              document.body.removeChild(printWindow);
            };
            
            printWindow.appendChild(printBtn);
            printWindow.appendChild(closeBtn);
            document.body.appendChild(printWindow);
            console.log('Content displayed in current window');
            }
          }
        }
      }
    } catch (error) {
      console.error('Mobile download failed:', error);
      // Show a simple alert
      alert('Impossible d\'ouvrir la facture. Veuillez réessayer.');
    }
  } else {
    // For desktop, use the original method
    console.log('Desktop detected, opening window...');
    const win = window.open('', '_blank');
    if (!win) {
      console.log('Window.open failed on desktop, trying fallback...');
      // Fallback for desktop too
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `facture-${invoice.invoice_number}.html`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    console.log('HTML written to desktop window');
  }
}


