// Script pour lister toutes les factures disponibles
// Utile pour identifier quelle facture vous voulez tester

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY
);

async function listInvoices() {
  try {
    console.log('📋 Liste des factures disponibles:');
    console.log('='.repeat(80));

    // Récupérer toutes les factures
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (!invoices || invoices.length === 0) {
      console.log('⚠️ Aucune facture trouvée dans la base de données');
      return;
    }

    console.log(`✅ ${invoices.length} facture(s) trouvée(s):\n`);

    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      
      // Récupérer les infos client pour chaque facture
      const { data: client } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', invoice.client_id)
        .single();

      console.log(`${i + 1}. Facture ${invoice.invoice_number}`);
      console.log(`   📄 ID: ${invoice.id}`);
      console.log(`   👤 Client: ${client ? client.name : 'Client inconnu'} (${client ? client.email : 'Email inconnu'})`);
      console.log(`   📅 Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}`);
      console.log(`   💰 Sous-total: ${invoice.subtotal} €`);
      console.log(`   💰 Net: ${invoice.net_amount} €`);
      console.log(`   🔗 Test: node debug-invoice-data.js ${invoice.id}`);
      console.log('');
    }

    console.log('💡 Pour déboguer une facture spécifique:');
    console.log('   node debug-invoice-data.js <invoice-id>');
    console.log('\n💡 Pour tester l\'envoi d\'une facture:');
    console.log('   curl -X POST http://localhost:3001/api/send-invoice \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"invoiceId": "<invoice-id>"}\'');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

listInvoices();
