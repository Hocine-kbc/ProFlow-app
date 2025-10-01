// API pour récupérer les détails complets d'un client
import { supabase } from './supabase';
import { ClientDetail, InvoiceDetail, ServiceDetail, ContactEntry } from '../types/clientDetail';

export interface ClientDetailResponse {
  success: boolean;
  data?: ClientDetail;
  error?: string;
}

// Exemple de structure JSON complète pour un client détaillé
export const exampleClientDetailJSON = {
  "id": "client_123",
  "name": "Jean Dupont",
  "email": "jean.dupont@example.com",
  "phone": "+33 6 12 34 56 78",
  "address": "123 Rue de la Paix",
  "city": "Paris",
  "postalCode": "75001",
  "country": "France",
  "company": "Dupont SARL",
  "vatNumber": "FR12345678901",
  "status": "active",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z",
  "notes": "Client fidèle, paiements toujours à l'heure. Préfère les communications par email.",
  
  "kpis": {
    "totalRevenue": 15750,
    "totalInvoices": 12,
    "paidAmount": 14250,
    "pendingAmount": 1500,
    "overdueAmount": 0,
    "firstInvoiceDate": "2024-01-20",
    "lastPaymentDate": "2024-01-18",
    "lastPaymentAmount": 1250,
    "averageInvoiceAmount": 1312.5,
    "totalHours": 78.5,
    "averageHourlyRate": 200.6
  },
  
  "invoices": [
    {
      "id": "invoice_1",
      "number": "FAC-2024-001",
      "date": "2024-01-20",
      "dueDate": "2024-02-19",
      "amount": 1250,
      "status": "paid",
      "paidDate": "2024-01-18",
      "paidAmount": 1250,
      "description": "Développement site web",
      "services": ["service_1", "service_2"]
    },
    {
      "id": "invoice_2",
      "number": "FAC-2024-002",
      "date": "2024-01-25",
      "dueDate": "2024-02-24",
      "amount": 1500,
      "status": "sent",
      "description": "Maintenance et support",
      "services": ["service_3"]
    },
    {
      "id": "invoice_3",
      "number": "FAC-2024-003",
      "date": "2024-02-01",
      "dueDate": "2024-03-02",
      "amount": 2000,
      "status": "overdue",
      "description": "Formation et conseil",
      "services": ["service_4", "service_5"]
    }
  ],
  
  "services": [
    {
      "id": "service_1",
      "date": "2024-01-15",
      "description": "Développement frontend React",
      "hours": 8,
      "hourlyRate": 150,
      "amount": 1200,
      "status": "completed",
      "invoiceId": "invoice_1"
    },
    {
      "id": "service_2",
      "date": "2024-01-18",
      "description": "Intégration API",
      "hours": 2,
      "hourlyRate": 150,
      "amount": 300,
      "status": "completed",
      "invoiceId": "invoice_1"
    },
    {
      "id": "service_3",
      "date": "2024-01-20",
      "description": "Maintenance système",
      "hours": 4,
      "hourlyRate": 120,
      "amount": 480,
      "status": "completed",
      "invoiceId": "invoice_2"
    },
    {
      "id": "service_4",
      "date": "2024-01-25",
      "description": "Formation utilisateurs",
      "hours": 6,
      "hourlyRate": 200,
      "amount": 1200,
      "status": "completed",
      "invoiceId": "invoice_3"
    },
    {
      "id": "service_5",
      "date": "2024-02-01",
      "description": "Conseil stratégique",
      "hours": 4,
      "hourlyRate": 200,
      "amount": 800,
      "status": "completed",
      "invoiceId": "invoice_3"
    }
  ],
  
  "paymentInfo": {
    "preferredMethod": "bank_transfer",
    "lastPaymentDate": "2024-01-18",
    "lastPaymentAmount": 1250,
    "totalPayments": 10,
    "averagePaymentTime": 5
  },
  
  "pipeline": {
    "draftInvoices": 1,
    "pendingQuotes": 2,
    "plannedServices": 3,
    "estimatedRevenue": 4500
  },
  
  "contactHistory": [
    {
      "id": "contact_1",
      "date": "2024-01-18",
      "type": "email",
      "subject": "Facture payée",
      "description": "Confirmation de paiement reçue pour la facture FAC-2024-001",
      "outcome": "Paiement confirmé et enregistré"
    },
    {
      "id": "contact_2",
      "date": "2024-01-15",
      "type": "phone",
      "subject": "Appel de suivi",
      "description": "Appel téléphonique pour faire le point sur le projet en cours",
      "outcome": "Client satisfait, demande de nouvelles prestations"
    },
    {
      "id": "contact_3",
      "date": "2024-01-10",
      "type": "meeting",
      "subject": "Réunion projet",
      "description": "Réunion en présentiel pour définir les spécifications du nouveau projet",
      "outcome": "Spécifications validées, devis en cours de préparation"
    },
    {
      "id": "contact_4",
      "date": "2024-01-05",
      "type": "note",
      "subject": "Note interne",
      "description": "Client très réactif, toujours disponible pour les échanges. Bon payeur.",
      "outcome": null
    }
  ]
};

// Fonction pour récupérer les détails complets d'un client
export async function getClientDetail(clientId: string): Promise<ClientDetailResponse> {
  try {
    // 1. Récupérer les informations de base du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      return { success: false, error: `Erreur client: ${clientError.message}` };
    }

    // 2. Récupérer les factures du client
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        *,
        services:services(id, description, hours, hourly_rate, amount)
      `)
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (invoicesError) {
      return { success: false, error: `Erreur factures: ${invoicesError.message}` };
    }

    // 3. Récupérer les prestations du client
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    if (servicesError) {
      return { success: false, error: `Erreur prestations: ${servicesError.message}` };
    }

    // 4. Calculer les KPIs
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingAmount = invoices
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    const totalHours = services.reduce((sum, service) => sum + (service.hours || 0), 0);
    const averageHourlyRate = totalHours > 0 
      ? services.reduce((sum, service) => sum + (service.amount || 0), 0) / totalHours 
      : 0;

    // 5. Récupérer l'historique des contacts (si table existe)
    const { data: contacts } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false });

    // 6. Construire la réponse
    const clientDetail: ClientDetail = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      city: client.city,
      postalCode: client.postal_code,
      country: client.country,
      company: client.company,
      vatNumber: client.vat_number,
      status: client.status || 'active',
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      notes: client.notes,

      kpis: {
        totalRevenue,
        totalInvoices: invoices.length,
        paidAmount,
        pendingAmount,
        overdueAmount,
        firstInvoiceDate: invoices.length > 0 ? invoices[invoices.length - 1].date : undefined,
        lastPaymentDate: paidInvoices.length > 0 ? paidInvoices[0].paid_date : undefined,
        lastPaymentAmount: paidInvoices.length > 0 ? paidInvoices[0].amount : undefined,
        averageInvoiceAmount: invoices.length > 0 ? totalRevenue / invoices.length : 0,
        totalHours,
        averageHourlyRate
      },

      invoices: invoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.due_date,
        amount: invoice.amount,
        status: invoice.status,
        paidDate: invoice.paid_date,
        paidAmount: invoice.paid_amount,
        description: invoice.description,
        services: invoice.services?.map((s: any) => s.id) || []
      })),

      services: services.map(service => ({
        id: service.id,
        date: service.date,
        description: service.description,
        hours: service.hours,
        hourlyRate: service.hourly_rate,
        amount: service.amount,
        status: service.status,
        invoiceId: service.invoice_id
      })),

      paymentInfo: {
        preferredMethod: client.preferred_payment_method,
        lastPaymentDate: paidInvoices.length > 0 ? paidInvoices[0].paid_date : undefined,
        lastPaymentAmount: paidInvoices.length > 0 ? paidInvoices[0].amount : undefined,
        totalPayments: paidInvoices.length,
        averagePaymentTime: 5 // À calculer selon vos besoins
      },

      pipeline: {
        draftInvoices: invoices.filter(inv => inv.status === 'draft').length,
        pendingQuotes: 0, // À implémenter selon vos besoins
        plannedServices: services.filter(s => s.status === 'planned').length,
        estimatedRevenue: services
          .filter(s => s.status === 'planned')
          .reduce((sum, s) => sum + (s.amount || 0), 0)
      },

      contactHistory: contacts?.map(contact => ({
        id: contact.id,
        date: contact.date,
        type: contact.type,
        subject: contact.subject,
        description: contact.description,
        outcome: contact.outcome
      })) || []
    };

    return { success: true, data: clientDetail };

  } catch (error) {
    console.error('Erreur lors de la récupération des détails du client:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

// Fonction pour mettre à jour les informations d'un client
export async function updateClientDetail(clientId: string, updates: Partial<ClientDetail>): Promise<ClientDetailResponse> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        address: updates.address,
        city: updates.city,
        postal_code: updates.postalCode,
        country: updates.country,
        company: updates.company,
        vat_number: updates.vatNumber,
        status: updates.status,
        notes: updates.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      return { success: false, error: `Erreur mise à jour: ${error.message}` };
    }

    // Recharger les détails complets
    return await getClientDetail(clientId);

  } catch (error) {
    console.error('Erreur lors de la mise à jour du client:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

// Fonction pour ajouter une note de contact
export async function addClientContact(
  clientId: string, 
  contact: Omit<ContactEntry, 'id'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('client_contacts')
      .insert({
        client_id: clientId,
        date: contact.date,
        type: contact.type,
        subject: contact.subject,
        description: contact.description,
        outcome: contact.outcome
      });

    if (error) {
      return { success: false, error: `Erreur ajout contact: ${error.message}` };
    }

    return { success: true };

  } catch (error) {
    console.error('Erreur lors de l\'ajout du contact:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}
