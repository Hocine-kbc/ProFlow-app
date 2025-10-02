// Script pour corriger les montants des factures affectés par l'URSSAF
import { supabase } from './supabase';

export interface InvoiceAmountFix {
  id: string;
  oldSubtotal: number;
  oldNetAmount: number;
  newAmount: number;
  servicesCount: number;
}

/**
 * Recalcule et corrige les montants de toutes les factures
 * en se basant sur les prestations réellement liées
 */
export async function fixAllInvoiceAmounts(): Promise<{
  success: boolean;
  fixed: InvoiceAmountFix[];
  errors: string[];
}> {
  const fixed: InvoiceAmountFix[] = [];
  const errors: string[] = [];

  try {
    console.log('🔧 Début de la correction des montants des factures...');

    // 1. Récupérer toutes les factures
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*');

    if (invoicesError) {
      throw new Error(`Erreur lors de la récupération des factures: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      console.log('ℹ️ Aucune facture trouvée');
      return { success: true, fixed: [], errors: [] };
    }

    console.log(`📋 ${invoices.length} factures trouvées`);

    // 2. Récupérer tous les services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*');

    if (servicesError) {
      throw new Error(`Erreur lors de la récupération des services: ${servicesError.message}`);
    }

    console.log(`🔧 ${services?.length || 0} services trouvés`);

    // 3. Pour chaque facture, recalculer le montant
    for (const invoice of invoices) {
      try {
        // Trouver les services liés à cette facture
        const invoiceServices = services?.filter(s => s.client_id === invoice.client_id) || [];
        
        // Calculer le montant correct
        const correctAmount = invoiceServices.reduce((acc, service) => {
          const hours = Number(service.hours) || 0;
          const rate = Number(service.hourly_rate) || 0;
          return acc + (hours * rate);
        }, 0);

        // Vérifier si une correction est nécessaire
        const currentSubtotal = Number(invoice.subtotal) || 0;
        const currentNetAmount = Number(invoice.net_amount) || 0;
        
        // Si le montant calculé est différent des montants stockés
        if (correctAmount > 0 && (
          Math.abs(correctAmount - currentSubtotal) > 0.01 || 
          Math.abs(correctAmount - currentNetAmount) > 0.01
        )) {
          console.log(`🔄 Correction de la facture ${invoice.invoice_number}:`, {
            oldSubtotal: currentSubtotal,
            oldNetAmount: currentNetAmount,
            newAmount: correctAmount,
            servicesCount: invoiceServices.length
          });

          // Mettre à jour la facture
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              subtotal: correctAmount,
              net_amount: correctAmount,
              urssaf_deduction: 0, // Toujours 0 maintenant
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice.id);

          if (updateError) {
            errors.push(`Erreur lors de la mise à jour de la facture ${invoice.invoice_number}: ${updateError.message}`);
          } else {
            fixed.push({
              id: invoice.id,
              oldSubtotal: currentSubtotal,
              oldNetAmount: currentNetAmount,
              newAmount: correctAmount,
              servicesCount: invoiceServices.length
            });
          }
        } else {
          console.log(`✅ Facture ${invoice.invoice_number} déjà correcte (${correctAmount}€)`);
        }
      } catch (error) {
        const errorMsg = `Erreur lors du traitement de la facture ${invoice.invoice_number}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    console.log(`✅ Correction terminée: ${fixed.length} factures corrigées, ${errors.length} erreurs`);

    return {
      success: errors.length === 0,
      fixed,
      errors
    };

  } catch (error) {
    const errorMsg = `Erreur générale lors de la correction: ${error}`;
    console.error(errorMsg);
    return {
      success: false,
      fixed,
      errors: [errorMsg]
    };
  }
}

/**
 * Fonction pour vérifier les montants sans les corriger
 */
export async function checkInvoiceAmounts(): Promise<{
  total: number;
  needsFixing: number;
  details: Array<{
    id: string;
    invoice_number: string;
    currentSubtotal: number;
    currentNetAmount: number;
    calculatedAmount: number;
    difference: number;
  }>;
}> {
  try {
    // Récupérer toutes les factures
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*');

    if (invoicesError) {
      throw new Error(`Erreur: ${invoicesError.message}`);
    }

    // Récupérer tous les services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*');

    if (servicesError) {
      throw new Error(`Erreur: ${servicesError.message}`);
    }

    const details = [];
    let needsFixing = 0;

    for (const invoice of invoices || []) {
      const invoiceServices = services?.filter(s => s.client_id === invoice.client_id) || [];
      
      const calculatedAmount = invoiceServices.reduce((acc, service) => {
        const hours = Number(service.hours) || 0;
        const rate = Number(service.hourly_rate) || 0;
        return acc + (hours * rate);
      }, 0);

      const currentSubtotal = Number(invoice.subtotal) || 0;
      const currentNetAmount = Number(invoice.net_amount) || 0;
      const difference = calculatedAmount - currentSubtotal;

      if (calculatedAmount > 0 && Math.abs(difference) > 0.01) {
        needsFixing++;
      }

      details.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        currentSubtotal,
        currentNetAmount,
        calculatedAmount,
        difference
      });
    }

    return {
      total: invoices?.length || 0,
      needsFixing,
      details
    };

  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    throw error;
  }
}
