// Script de débogage pour vérifier les données de facture
// Ce script simule l'envoi d'une facture et affiche toutes les données récupérées

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

async function debugInvoiceData(invoiceId) {
  try {
    console.log(`🔍 Débogage facture ID: ${invoiceId}`);
    console.log('='.repeat(50));

    // 1. Récupérer la facture
    console.log('1️⃣ Récupération de la facture...');
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('❌ Erreur facture:', invoiceError);
      return;
    }

    console.log('✅ Facture trouvée:');
    console.log('   - ID:', invoice.id);
    console.log('   - Numéro:', invoice.invoice_number);
    console.log('   - Client ID:', invoice.client_id);
    console.log('   - Sous-total:', invoice.subtotal);
    console.log('   - Montant net:', invoice.net_amount);
    console.log('   - Date:', invoice.date);
    console.log('   - Échéance:', invoice.due_date);

    // 2. Récupérer le client
    console.log('\n2️⃣ Récupération du client...');
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError) {
      console.error('❌ Erreur client:', clientError);
      return;
    }

    console.log('✅ Client trouvé:');
    console.log('   - ID:', client.id);
    console.log('   - Nom:', client.name);
    console.log('   - Email:', client.email);
    console.log('   - Téléphone:', client.phone || 'Non renseigné');
    console.log('   - Adresse:', client.address || 'Non renseignée');

    // 3. Récupérer les services
    console.log('\n3️⃣ Récupération des services...');
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('client_id', invoice.client_id);

    if (servicesError) {
      console.error('❌ Erreur services:', servicesError);
      return;
    }

    console.log(`✅ Services trouvés: ${services ? services.length : 0}`);
    if (services && services.length > 0) {
      services.forEach((service, index) => {
        console.log(`   Service ${index + 1}:`);
        console.log('     - Description:', service.description);
        console.log('     - Heures:', service.hours);
        console.log('     - Tarif horaire:', service.hourly_rate);
        console.log('     - Total:', (service.hours * service.hourly_rate).toFixed(2) + ' €');
      });
    } else {
      console.log('⚠️ AUCUN SERVICE TROUVÉ ! C\'est probablement le problème.');
    }

    // 4. Vérifier la cohérence des données
    console.log('\n4️⃣ Vérification de la cohérence...');
    
    if (services && services.length > 0) {
      const calculatedSubtotal = services.reduce((sum, service) => 
        sum + (service.hours * service.hourly_rate), 0
      );
      
      console.log('   - Sous-total calculé:', calculatedSubtotal.toFixed(2) + ' €');
      console.log('   - Sous-total en base:', invoice.subtotal + ' €');
      console.log('   - Différence:', Math.abs(calculatedSubtotal - invoice.subtotal).toFixed(2) + ' €');
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎯 CONCLUSION:');
    
    if (!services || services.length === 0) {
      console.log('❌ PROBLÈME: Aucun service trouvé pour cette facture');
      console.log('💡 SOLUTION: Ajoutez des services pour ce client avant d\'envoyer la facture');
    } else {
      console.log('✅ Données cohérentes, la facture devrait être générée correctement');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Utilisation
const invoiceId = process.argv[2];
if (!invoiceId) {
  console.log('Usage: node debug-invoice-data.js <invoice-id>');
  console.log('Exemple: node debug-invoice-data.js 123e4567-e89b-12d3-a456-426614174000');
  process.exit(1);
}

debugInvoiceData(invoiceId);
