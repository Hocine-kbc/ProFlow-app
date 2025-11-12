import { supabase } from './supabase.ts';
import { Service, Invoice, BusinessNotification, NotificationType, Message, Conversation, ServicePricingType } from '../types/index.ts';

// Define interfaces locally since they're not exported from types
interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  siren?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

interface Settings {
  id: string;
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  defaultHourlyRate: number;
  invoicePrefix: string;
  paymentTerms: number;
  logoUrl: string;
  invoiceTerms: string;
  paymentMethod?: string;
  additionalTerms?: string;
  showLegalRate?: boolean;
  showFixedFee?: boolean;
  urssafActivity?: 'services' | 'ventes' | 'liberale';
  created_at: string;
  updated_at: string;
}

// Interfaces pour les données de la base de données
interface DatabaseSettings {
  id: string;
  user_id: string;
  companyname: string;
  ownername: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  defaulthourlyrate: number;
  invoiceprefix: string;
  paymentterms: number;
  logourl: string;
  invoiceterms: string;
  paymentmethod?: string;
  additionalterms?: string;
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
  urssafactivity?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseClient {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  siren?: string;
  address: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseService {
  id: string;
  user_id: string;
  client_id: string;
  description: string;
  hourly_rate: number;
  hours: number;
  date: string;
  created_at: string;
  updated_at: string;
  pricing_type?: ServicePricingType | null;
}

interface DatabaseInvoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  net_amount: number;
  status: string;
  urssaf_deduction: number;
  payment_method?: string;
  paid_date?: string;
  paid_amount?: number;
  services?: unknown[];
  // Paramètres spécifiques à la facture
  invoice_terms?: string;
  payment_terms?: number;
  include_late_payment_penalties?: boolean;
  additional_terms?: string;
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
  summary_description?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseClientContact {
  id: string;
  client_id: string;
  type: string;
  subject: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Fonction pour supprimer définitivement toutes les données du compte
export async function deleteAllUserData(): Promise<void> {
  try {
    console.log('🗑️ Début de la suppression des données...');
    
    // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
    
    // 1. Supprimer tous les services (ils référencent les clients)
    console.log('Suppression des services...');
    const { error: servicesError } = await supabase
      .from('services')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tous les services
    
    if (servicesError) {
      console.error('Error deleting services:', servicesError);
      throw new Error('Erreur lors de la suppression des services');
    }
    console.log('✅ Services supprimés');

    // 2. Supprimer toutes les factures (elles référencent les clients)
    console.log('Suppression des factures...');
    const { error: invoicesError } = await supabase
      .from('invoices')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Supprimer toutes les factures
    
    if (invoicesError) {
      console.error('Error deleting invoices:', invoicesError);
      throw new Error('Erreur lors de la suppression des factures');
    }
    console.log('✅ Factures supprimées');

    // 3. Supprimer tous les clients
    console.log('Suppression des clients...');
    const { error: clientsError } = await supabase
      .from('clients')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Supprimer tous les clients
    
    if (clientsError) {
      console.error('Error deleting clients:', clientsError);
      throw new Error('Erreur lors de la suppression des clients');
    }
    console.log('✅ Clients supprimés');

    // 4. Supprimer les paramètres de l'utilisateur
    console.log('Suppression des paramètres...');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error: settingsError } = await supabase
        .from('settings')
        .delete()
        .eq('user_id', user.id); // Supprimer seulement les paramètres de cet utilisateur
      
      if (settingsError) {
        console.error('Error deleting settings:', settingsError);
        throw new Error('Erreur lors de la suppression des paramètres');
      }
      console.log('✅ Paramètres supprimés');
    }

    console.log('🎉 Toutes les données ont été supprimées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des données:', error);
    throw error;
  }
}

// Fonction pour supprimer complètement le compte utilisateur
export async function deleteUserAccount(): Promise<void> {
  try {
    console.log('🗑️ Début de la suppression complète du compte...');
    
    // 1. Supprimer toutes les données d'abord
    await deleteAllUserData();
    console.log('✅ Données supprimées');
    
    // 2. Essayer de supprimer le compte Auth via l'API REST
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Utiliser l'API REST pour supprimer l'utilisateur
        const response = await fetch(`https://tdfhqkgvcgqgkrxarmui.supabase.co/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZmhxa2d2Y2dxZ2tyeGFybXVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODY5NjgwOCwiZXhwIjoyMDc0MjcyODA4fQ.nnvJgG74iXWLV_g7t_tiy975uGd3w3axMwAB5B92i3Y`,
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZmhxa2d2Y2dxZ2tyeGFybXVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTY4MDgsImV4cCI6MjA3NDI3MjgwOH0.Kica2Zbn6aK6opqnGigAJuSNnibxWolJEBOZehD7GZo'
          }
        });
        
        if (response.ok) {
          console.log('✅ Compte Auth supprimé avec succès');
        } else {
          console.log('⚠️ Impossible de supprimer le compte Auth, déconnexion seulement');
        }
      } catch (authError) {
        console.log('⚠️ Erreur lors de la suppression Auth:', authError);
      }
    }
    
    // 3. Déconnecter l'utilisateur
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('Error signing out:', signOutError);
      throw new Error('Erreur lors de la déconnexion');
    }
    
    console.log('✅ Utilisateur déconnecté');
    
    // 4. Rediriger vers la page d'accueil
    setTimeout(() => {
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.location.href = '/';
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Erreur lors de la suppression du compte:', error);
    throw error;
  }
}

export async function fetchClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    
    return (data || []) as Client[];
  } catch (_error) {
    // Return empty array if there's any error
    return [];
  }
}

export async function createClient(payload: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const now = new Date().toISOString();
    const toInsert = { ...payload, user_id: user.id, created_at: now, updated_at: now } as DatabaseClient;
    let { data, error } = await supabase
      .from('clients')
      .insert(toInsert)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating client:', error);
      // Retry without siren if column doesn't exist
      if (String(error.message || '').includes('siren')) {
        const { siren: _siren, ...fallback } = toInsert as any;
        const retry = await supabase.from('clients').insert(fallback).select('*').single();
        if (retry.error) throw retry.error;
        data = retry.data as any;
      } else {
        throw error;
      }
    }
    
    return data as Client;
  } catch (error) {
    console.error('Failed to create client:', error);
    throw error;
  }
}

export async function updateClient(id: string, payload: Partial<Client>): Promise<Client> {
  try {
    let { data, error } = await supabase
      .from('clients')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating client:', error);
      if (String(error.message || '').includes('siren')) {
        const { siren: _siren, ...fallback } = payload as any;
        const retry = await supabase
          .from('clients')
          .update({ ...fallback, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single();
        if (retry.error) throw retry.error;
        data = retry.data as any;
      } else {
        throw error;
      }
    }
    
    return data as Client;
  } catch (error) {
    console.error('Failed to update client:', error);
    throw error;
  }
}

export async function deleteClient(id: string): Promise<void> {
  // Vérifier s'il y a des factures associées
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('client_id', id);
  
  // Si des factures existent, on ne supprime pas le client
  if (invoices && invoices.length > 0) {
    throw new Error(`Impossible de supprimer ce client car il a ${invoices.length} facture(s) associée(s). Supprimez d'abord les factures.`);
  }
  
  // Supprimer d'abord toutes les prestations associées au client
  const { error: servicesError } = await supabase
    .from('services')
    .delete()
    .eq('client_id', id);
  
  if (servicesError) {
    console.error('Error deleting services:', servicesError);
    throw new Error('Erreur lors de la suppression des prestations associées');
  }
  
  // Puis supprimer le client
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

// Services
export async function fetchServices(): Promise<Service[]> {
  const selectionVariants = [
    'id, client_id, description, hourly_rate, hours, date, status, article_id, created_at, updated_at, pricing_type, user_id',
    'id, client_id, description, hourly_rate, hours, date, status, article_id, created_at, updated_at, pricing_type',
    'id, client_id, description, hourly_rate, hours, date, status, article_id, created_at, updated_at'
  ];

  let servicesData: DatabaseService[] = [];
  let lastError: any = null;

  for (const selection of selectionVariants) {
    const { data, error } = await supabase
      .from('services')
      .select(selection)
      .order('date', { ascending: false });

    if (error) {
      lastError = error;
      const message = typeof error.message === 'string' ? error.message : '';
      if (error.code === 'PGRST204' && (message.includes('pricing_type') || message.includes('user_id'))) {
        continue;
      }
      console.warn('Failed to fetch services with selection', selection, error);
      continue;
    }

    servicesData = (data || []) as DatabaseService[];
    lastError = null;
    break;
  }

  if (!servicesData.length && lastError) {
    console.error('Failed to fetch services from Supabase, falling back to local storage:', lastError);
    try {
      const storedServices = JSON.parse(localStorage.getItem('services-cache') || '[]');
      if (Array.isArray(storedServices) && storedServices.length > 0) {
        return storedServices as Service[];
      }
    } catch (storageError) {
      console.warn('Unable to read services from local storage fallback:', storageError);
    }
    throw lastError;
  }

  const mappedServices = servicesData.map((service) => {
    const pricingType = resolveServicePricingType(service) ?? 'hourly';
    if (pricingType) {
      persistServicePricingType(service.id, pricingType);
    }
    return {
      ...(service as Service),
      pricing_type: pricingType,
    } as Service;
  });
 
  try {
    localStorage.setItem('services-cache', JSON.stringify(mappedServices));
  } catch (storageError) {
    console.warn('Unable to persist services cache:', storageError);
  }

  return mappedServices;
}

export async function createService(payload: Omit<Service, 'id' | 'client' | 'created_at' | 'updated_at'>): Promise<Service> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const now = new Date().toISOString();
  const requestedPricingType = normalizeServicePricingType((payload as Service).pricing_type) ?? 'hourly';
  const baseInsert: Partial<DatabaseService> = {
    ...payload,
    pricing_type: requestedPricingType,
    user_id: user.id,
    created_at: now,
    updated_at: now,
  };

  const attemptInsert = async (
    includePricingType: boolean,
    includeUserId: boolean
  ): Promise<DatabaseService> => {
    const insertPayload = { ...baseInsert };
    if (!includePricingType) {
      delete (insertPayload as Partial<DatabaseService>).pricing_type;
    }
    if (!includeUserId) {
      delete (insertPayload as Partial<DatabaseService>).user_id;
    }
    const response = await supabase
      .from('services')
      .insert(insertPayload)
      .select('*')
      .single();
    if (response.error) {
      throw response.error;
    }
    return response.data as DatabaseService;
  };

  const variants: Array<{ includePricingType: boolean; includeUserId: boolean }> = [
    { includePricingType: true, includeUserId: true },
    { includePricingType: false, includeUserId: true },
    { includePricingType: true, includeUserId: false },
    { includePricingType: false, includeUserId: false },
  ];

  let insertedService: DatabaseService | null = null;
  let pricingColumnMissing = false;
  let userColumnMissing = false;
  let lastError: any = null;

  for (const variant of variants) {
    try {
      insertedService = await attemptInsert(variant.includePricingType, variant.includeUserId);
      pricingColumnMissing = pricingColumnMissing || !variant.includePricingType;
      userColumnMissing = userColumnMissing || !variant.includeUserId;
      break;
    } catch (error: any) {
      lastError = error;
      const message = typeof error?.message === 'string' ? error.message : '';
      const isMissingPricingColumn = message.includes('pricing_type');
      const isMissingUserColumn = message.includes('user_id');

      if (!isMissingPricingColumn && !isMissingUserColumn) {
        throw error;
      }

      if (isMissingPricingColumn) {
        pricingColumnMissing = true;
      }
      if (isMissingUserColumn) {
        userColumnMissing = true;
      }

      // Try next variant without the problematic column
      continue;
    }
  }

  if (!insertedService) {
    console.warn('Supabase services insert failed, falling back to local storage:', lastError);
    const fallbackId = `local-service-${Date.now()}`;
    const fallbackService: Service = {
      ...(payload as Service),
      id: fallbackId,
      created_at: now,
      updated_at: now,
      pricing_type: requestedPricingType,
    } as Service;

    try {
      const stored = JSON.parse(localStorage.getItem('services-local-fallback') || '[]');
      if (Array.isArray(stored)) {
        stored.push(fallbackService);
        localStorage.setItem('services-local-fallback', JSON.stringify(stored));
      } else {
        localStorage.setItem('services-local-fallback', JSON.stringify([fallbackService]));
      }
    } catch (storageError) {
      console.warn('Unable to persist local fallback service:', storageError);
    }

    persistServicePricingType(fallbackId, requestedPricingType);
    return fallbackService;
  }

  const resolvedPricingType = pricingColumnMissing
    ? requestedPricingType
    : normalizeServicePricingType((insertedService as any).pricing_type) ?? requestedPricingType;

  if (userColumnMissing) {
    console.warn('services.user_id column missing in database, continuing without user association');
  }

  persistServicePricingType(insertedService.id, resolvedPricingType);

  return {
    ...(insertedService as Service),
    pricing_type: resolvedPricingType,
  } as Service;
}

export async function updateService(id: string, payload: Partial<Service>): Promise<Service> {
  const now = new Date().toISOString();
  const includesPricingType = Object.prototype.hasOwnProperty.call(payload, 'pricing_type');
  const requestedPricingType = includesPricingType
    ? normalizeServicePricingType((payload as Service).pricing_type) ?? 'hourly'
    : undefined;

  const baseUpdate: Partial<DatabaseService> = {
    ...payload,
    updated_at: now,
  };

  if (includesPricingType) {
    (baseUpdate as Partial<DatabaseService>).pricing_type = requestedPricingType;
  }

  const attemptUpdate = async (includePricingType: boolean): Promise<DatabaseService> => {
    const updatePayload = { ...baseUpdate };
    if (!includePricingType) {
      delete (updatePayload as Partial<DatabaseService>).pricing_type;
    }
    const response = await supabase
      .from('services')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();
    if (response.error) {
      throw response.error;
    }
    return response.data as DatabaseService;
  };

  let updatedService: DatabaseService;
  let pricingColumnMissing = false;

  try {
    updatedService = await attemptUpdate(true);
  } catch (error: any) {
    const missingPricingColumn = typeof error?.message === 'string' && error.message.includes('pricing_type');
    if (includesPricingType && missingPricingColumn) {
      pricingColumnMissing = true;
      updatedService = await attemptUpdate(false);
    } else {
      throw error;
    }
  }

  const resolvedPricingType = includesPricingType
    ? pricingColumnMissing
      ? requestedPricingType
      : normalizeServicePricingType((updatedService as any).pricing_type) ?? requestedPricingType
    : resolveServicePricingType(updatedService);

  persistServicePricingType(updatedService.id, resolvedPricingType);

  return {
    ...(updatedService as Service),
    pricing_type: resolvedPricingType,
  } as Service;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
  persistServicePricingType(id, undefined);
}

// Invoices
export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    // Simple query without relationships first
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('invoice_number', { ascending: false });
    
    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    
    // Transform the data to match the Invoice interface
    const invoices = (data || []).map((invoice: DatabaseInvoice) => {
      // Get payment_method from localStorage if not in database
      let paymentMethod = invoice.payment_method;
      if (!paymentMethod) {
        try {
          const paymentMethods = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
          paymentMethod = paymentMethods[invoice.id] || null;
        } catch (_e) {
          // Gestion silencieuse des erreurs
        }
      }

      let invoiceType: 'detailed' | 'summary' | null = (invoice as any).invoice_type ?? null;
      if (!invoiceType) {
        try {
          const invoiceTypes = JSON.parse(localStorage.getItem('invoice-types') || '{}');
          invoiceType = invoiceTypes[invoice.id] || null;
        } catch (_e) {
          // Gestion silencieuse des erreurs
        }
      }
      
      let summaryDescription: string | null = (invoice as any).summary_description ?? null;
      if (!summaryDescription) {
        try {
          const summaryDescriptions = JSON.parse(localStorage.getItem('invoice-summary-descriptions') || '{}');
          summaryDescription = summaryDescriptions[invoice.id] || null;
        } catch (_e) {
          summaryDescription = null;
        }
      }
      
      // Get services from localStorage if not in database
      let invoiceServices = invoice.services || [];
      if (invoiceServices.length === 0) {
        try {
          const storedServices = JSON.parse(localStorage.getItem('invoice-services') || '{}');
          invoiceServices = storedServices[invoice.id] || [];
          if (invoiceServices.length > 0) {
            console.log(`📋 Services chargés pour la facture ${invoice.id}:`, invoiceServices.length, 'services');
          }
        } catch (_e) {
          console.warn('Could not load services from localStorage:', _e);
        }
      }
      
      let companySnapshot: any = null;
      try {
        const storedCompany = JSON.parse(localStorage.getItem('invoice-company-snapshots') || '{}');
        companySnapshot = storedCompany[invoice.id] || null;
      } catch (_e) {
        // Ignorer
      }
      
      let servicesResult = invoiceServices as any[];
      if (invoiceType === 'summary') {
        const hasSummaryGroup = servicesResult.some(service => service && (service as any).summary_group);
        if (hasSummaryGroup) {
          servicesResult = servicesResult.map(service => {
            if (service && (service as any).summary_group) {
              return {
                ...service,
                description: summaryDescription || service.description,
                summary_source_count: (service as any).summary_source_count ?? servicesResult.length,
                total: service.total ?? ((Number(service.hours) || 0) * (Number(service.hourly_rate) || 0)),
              };
            }
            return service;
          });
        } else {
          const sourceCount = servicesResult.length || invoiceServices.length || 0;
          const aggregated = servicesResult.reduce(
            (acc, service) => {
              const hours = Number(service.hours) || 0;
              const rate = Number(service.hourly_rate) || 0;
              return {
                hours: acc.hours + hours,
                amount: acc.amount + hours * rate,
              };
            },
            { hours: 0, amount: 0 }
          );
          const hours = aggregated.hours;
          const amount = aggregated.amount;
          servicesResult = [
            {
              id: `summary-${invoice.id}`,
              client_id: invoice.client_id,
              date: invoice.date,
              hours,
              hourly_rate: hours > 0 ? amount / hours : 0,
              description: summaryDescription || `Prestations regroupées (${sourceCount || 1})`,
              status: 'invoiced',
              summary_group: true,
              summary_source_count: sourceCount || 1,
              total: amount,
            },
          ];
        }
      }
      
      return {
        ...invoice,
        // Use services from localStorage if available
        services: servicesResult,
        // Client will be fetched separately if needed
        client: null,
        // Add payment_method from localStorage if not in database
        payment_method: paymentMethod,
        invoice_type: invoiceType,
        summary_description: summaryDescription,
        // Map database fields to camelCase for the new invoice-specific fields
        invoice_terms: invoice.invoice_terms ?? companySnapshot?.invoice_terms ?? null,
        payment_terms: invoice.payment_terms ?? companySnapshot?.payment_terms ?? null,
        include_late_payment_penalties: invoice.include_late_payment_penalties,
        additional_terms: invoice.additional_terms,
        // Paramètres de Règlement spécifiques à la facture
        show_legal_rate: invoice.show_legal_rate ?? companySnapshot?.show_legal_rate ?? null,
        show_fixed_fee: invoice.show_fixed_fee ?? companySnapshot?.show_fixed_fee ?? null,
        // Données d'entreprise au moment de la création (pour immutabilité)
        company_name: invoice.company_name ?? companySnapshot?.company_name ?? null,
        company_owner: invoice.company_owner ?? companySnapshot?.company_owner ?? null,
        company_email: invoice.company_email ?? companySnapshot?.company_email ?? null,
        company_phone: invoice.company_phone ?? companySnapshot?.company_phone ?? null,
        company_address: invoice.company_address ?? companySnapshot?.company_address ?? null,
        company_siret: invoice.company_siret ?? companySnapshot?.company_siret ?? null,
        company_logo_url: invoice.company_logo_url ?? companySnapshot?.company_logo_url ?? null,
      };
    });
    
    return invoices as unknown as Invoice[];
  } catch (_error) {
    // Return empty array if there's any error
    return [];
  }
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'client' | 'created_at' | 'updated_at'>): Promise<Invoice> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const now = new Date().toISOString();
  // Extract services from payload and create a clean invoice object
  const { services, ...invoiceData } = payload;
  
  // Récupérer les paramètres actuels pour les sauvegarder dans la facture
  let currentSettings: Settings | null = null;
  try {
    currentSettings = await fetchSettings();
  } catch (error) {
    console.warn('Could not fetch current settings for invoice:', error);
  }
  
  const summaryDescription = (invoiceData as Invoice).summary_description ?? null;
  
  // Map camelCase to snake_case for database
  const toInsert: Partial<DatabaseInvoice> = {
    user_id: user.id,
    created_at: now,
    updated_at: now
  };
  
  // Map fields from camelCase to snake_case
  if (invoiceData.client_id !== undefined) toInsert.client_id = invoiceData.client_id;
  if (invoiceData.invoice_number !== undefined) toInsert.invoice_number = invoiceData.invoice_number;
  if (invoiceData.date !== undefined) toInsert.date = invoiceData.date;
  if (invoiceData.due_date !== undefined) toInsert.due_date = invoiceData.due_date;
  // Sauvegarder le mode de paiement de la facture
  if (invoiceData.payment_method !== undefined) toInsert.payment_method = invoiceData.payment_method;
  if (invoiceData.subtotal !== undefined) toInsert.subtotal = invoiceData.subtotal;
  if (invoiceData.net_amount !== undefined) toInsert.net_amount = invoiceData.net_amount;
  if (invoiceData.status !== undefined) toInsert.status = invoiceData.status;
  
  const invoiceType = (invoiceData as Invoice).invoice_type;
  const baseInsert: Partial<DatabaseInvoice> = {
    ...toInsert,
  };

  if (currentSettings) {
    baseInsert.invoice_terms = currentSettings.invoiceTerms;
    baseInsert.payment_terms = currentSettings.paymentTerms;
    baseInsert.additional_terms = currentSettings.additionalTerms;
    baseInsert.show_legal_rate = currentSettings.showLegalRate ?? true;
    baseInsert.show_fixed_fee = currentSettings.showFixedFee ?? true;
    baseInsert.company_name = currentSettings.companyName;
    baseInsert.company_owner = currentSettings.ownerName;
    baseInsert.company_email = currentSettings.email;
    baseInsert.company_phone = currentSettings.phone;
    baseInsert.company_address = currentSettings.address;
    baseInsert.company_siret = currentSettings.siret;
    baseInsert.company_logo_url = currentSettings.logoUrl;
  }

  const hasInvoiceType = Boolean(invoiceType);
  const hasServices = Array.isArray(services) && services.length > 0;
  const hasSummaryDescription = typeof summaryDescription === 'string' && summaryDescription.length > 0;

  const combine = (includeInvoiceType: boolean, includeServices: boolean, includeUrssaf: boolean, includeSummary: boolean) => ({
    ...baseInsert,
    ...(includeUrssaf ? { urssaf_deduction: 0 } : {}),
    ...(includeInvoiceType && hasInvoiceType ? { invoice_type: invoiceType } : {}),
    ...(includeServices && hasServices ? { services } : {}),
    ...(includeSummary && hasSummaryDescription ? { summary_description: summaryDescription } : {}),
  } as Partial<DatabaseInvoice>);

  const variantSet = new Map<string, Partial<DatabaseInvoice>>();
  const addVariant = (variant: Partial<DatabaseInvoice>) => {
    const key = JSON.stringify(variant);
    if (!variantSet.has(key)) {
      variantSet.set(key, variant);
    }
  };

  addVariant(combine(true, true, true, true));
  addVariant(combine(true, false, true, true));
  addVariant(combine(false, true, true, true));
  addVariant(combine(true, true, true, false));
  addVariant(combine(true, false, true, false));
  addVariant(combine(false, true, true, false));
  addVariant(combine(true, true, false, true));
  addVariant(combine(true, false, false, true));
  addVariant(combine(false, true, false, true));
  addVariant(combine(true, true, false, false));
  addVariant(combine(true, false, false, false));
  addVariant(combine(false, true, false, false));
  addVariant({ ...baseInsert, urssaf_deduction: 0 });
  addVariant(baseInsert);

  let insertedInvoice: DatabaseInvoice | null = null;
  let lastError: any = null;

  for (const variant of variantSet.values()) {
    const { data: insertData, error: insertError } = await supabase
        .from('invoices')
      .insert(variant)
        .select('*')
        .single();
        
    if (!insertError && insertData) {
      insertedInvoice = insertData;
      break;
    }

    lastError = insertError;

    if (!insertError || insertError.code !== 'PGRST204') {
      break;
    }
  }

  if (!insertedInvoice) {
    if (lastError) {
      console.error('Error creating invoice:', lastError);
      throw lastError;
    }
    throw new Error('Unknown error creating invoice');
  }

  if (invoiceData.payment_method) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
      existingData[insertedInvoice.id] = invoiceData.payment_method;
      localStorage.setItem('invoice-payment-methods', JSON.stringify(existingData));
    } catch (e) {
      console.warn('Could not store payment method in localStorage:', e);
    }
  }
  
  if (invoiceType) {
    try {
      const existingTypes = JSON.parse(localStorage.getItem('invoice-types') || '{}');
      existingTypes[insertedInvoice.id] = invoiceType;
      localStorage.setItem('invoice-types', JSON.stringify(existingTypes));
    } catch (e) {
      console.warn('Could not store invoice type in localStorage:', e);
    }
  }

  if (summaryDescription) {
    try {
      const existingSummaries = JSON.parse(localStorage.getItem('invoice-summary-descriptions') || '{}');
      if (summaryDescription) {
        existingSummaries[insertedInvoice.id] = summaryDescription;
      } else if (existingSummaries[insertedInvoice.id]) {
        delete existingSummaries[insertedInvoice.id];
      }
      localStorage.setItem('invoice-summary-descriptions', JSON.stringify(existingSummaries));
    } catch (e) {
      console.warn('Could not store invoice summary description in localStorage:', e);
    }
  }

  if (summaryDescription === null) {
    try {
      const existingSummaries = JSON.parse(localStorage.getItem('invoice-summary-descriptions') || '{}');
      if (existingSummaries[insertedInvoice.id]) {
        delete existingSummaries[insertedInvoice.id];
        localStorage.setItem('invoice-summary-descriptions', JSON.stringify(existingSummaries));
      }
    } catch (e) {
      console.warn('Could not clear invoice summary description in localStorage:', e);
    }
  }

  if (currentSettings) {
    try {
      const existingCompanySnapshots = JSON.parse(localStorage.getItem('invoice-company-snapshots') || '{}');
      existingCompanySnapshots[insertedInvoice.id] = {
        company_name: baseInsert.company_name ?? null,
        company_owner: baseInsert.company_owner ?? null,
        company_email: baseInsert.company_email ?? null,
        company_phone: baseInsert.company_phone ?? null,
        company_address: baseInsert.company_address ?? null,
        company_siret: baseInsert.company_siret ?? null,
        company_logo_url: baseInsert.company_logo_url ?? null,
        invoice_terms: baseInsert.invoice_terms ?? null,
        payment_terms: baseInsert.payment_terms ?? null,
        show_legal_rate: baseInsert.show_legal_rate ?? null,
        show_fixed_fee: baseInsert.show_fixed_fee ?? null,
      };
      localStorage.setItem('invoice-company-snapshots', JSON.stringify(existingCompanySnapshots));
    } catch (e) {
      console.warn('Could not store invoice company snapshot in localStorage:', e);
    }
  }

  if (services && services.length > 0) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-services') || '{}');
      existingData[insertedInvoice.id] = services;
      localStorage.setItem('invoice-services', JSON.stringify(existingData));
      console.log(`💾 Services stockés pour la facture ${insertedInvoice.id}:`, services.length, 'services');
    } catch (e) {
      console.warn('Could not store services in localStorage:', e);
    }
  }
  
  return { ...insertedInvoice, services: services || [], invoice_type: invoiceType } as Invoice;
}

export async function updateInvoice(id: string, payload: Partial<Invoice>): Promise<Invoice> {
  // Extract services from payload if present
  const { services, ...updateData } = payload;
  
  // Map camelCase to snake_case for database
  const dbUpdateData: Partial<DatabaseInvoice> = {
    updated_at: new Date().toISOString()
  };
  
  // Map fields from camelCase to snake_case
  if (updateData.client_id !== undefined) dbUpdateData.client_id = updateData.client_id;
  if (updateData.invoice_number !== undefined) dbUpdateData.invoice_number = updateData.invoice_number;
  if (updateData.date !== undefined) dbUpdateData.date = updateData.date;
  if (updateData.due_date !== undefined) dbUpdateData.due_date = updateData.due_date;
  // Note: payment_method column might not exist in database yet
  // if (updateData.payment_method !== undefined) dbUpdateData.payment_method = updateData.payment_method;
  if (updateData.subtotal !== undefined) dbUpdateData.subtotal = updateData.subtotal;
  if (updateData.net_amount !== undefined) dbUpdateData.net_amount = updateData.net_amount;
  if (updateData.status !== undefined) {
    dbUpdateData.status = updateData.status;
    // Si la facture est marquée comme payée et qu'il n'y a pas de paid_date, définir la date actuelle
    if (updateData.status === 'paid' && !updateData.paid_date) {
      (dbUpdateData as any).paid_date = new Date().toISOString();
    }
  }
  // Gérer summary_description
  if (updateData.summary_description !== undefined) {
    (dbUpdateData as any).summary_description = updateData.summary_description ?? null;
  }
  // Gérer paid_date explicitement si fourni
  if (updateData.paid_date !== undefined) {
    (dbUpdateData as any).paid_date = updateData.paid_date;
  }
  // Gérer paid_amount si fourni
  if (updateData.paid_amount !== undefined) {
    (dbUpdateData as any).paid_amount = updateData.paid_amount;
  }
  // Toujours définir urssaf_deduction à 0 pour éviter les erreurs de contrainte
  if (updateData.subtotal !== undefined || updateData.net_amount !== undefined) {
    dbUpdateData.urssaf_deduction = 0;
  }
  
  (dbUpdateData as any).urssaf_deduction = dbUpdateData.urssaf_deduction ?? 0;

  const updatedInvoiceType = (payload as Invoice).invoice_type;
  if (updatedInvoiceType) {
    (dbUpdateData as any).invoice_type = updatedInvoiceType;
  }
  
  const hasInvoiceType = Boolean(updatedInvoiceType);
  const hasServices = Array.isArray(services) && services.length > 0;
  const hasSummaryDescription = updateData.summary_description !== undefined;

  const combineUpdateVariant = (includeInvoiceType: boolean, includeServices: boolean, includeSummary: boolean) => {
    const variant: Partial<DatabaseInvoice> = { ...dbUpdateData, urssaf_deduction: dbUpdateData.urssaf_deduction ?? 0 };

    if (!includeInvoiceType || !hasInvoiceType) {
      delete (variant as any).invoice_type;
    } else {
      (variant as any).invoice_type = updatedInvoiceType;
    }
    if (!includeServices || !hasServices) {
      delete (variant as any).services;
    } else if (hasServices) {
      (variant as any).services = services;
    }
    if (!includeSummary || !hasSummaryDescription) {
      delete (variant as any).summary_description;
    } else if (hasSummaryDescription) {
      (variant as any).summary_description = updateData.summary_description ?? null;
    }

    return variant;
  };
  
  const variantSet = new Map<string, Partial<DatabaseInvoice>>();
  const pushVariant = (variant: Partial<DatabaseInvoice>) => {
    const key = JSON.stringify(variant);
    if (!variantSet.has(key)) {
      variantSet.set(key, variant);
    }
  };
  
  pushVariant(combineUpdateVariant(true, true, true));
  pushVariant(combineUpdateVariant(true, false, true));
  pushVariant(combineUpdateVariant(false, true, true));
  pushVariant(combineUpdateVariant(true, true, false));
  pushVariant(combineUpdateVariant(true, false, false));
  pushVariant(combineUpdateVariant(false, true, false));
  pushVariant(combineUpdateVariant(false, false, true));
  pushVariant(combineUpdateVariant(false, false, false));

  let updatedInvoice: DatabaseInvoice | null = null;
  let lastError: any = null;

  for (const variant of variantSet.values()) {
    const { data: updateResult, error: updateError } = await supabase
        .from('invoices')
      .update(variant)
        .eq('id', id)
        .select('*')
        .single();
        
    if (!updateError && updateResult) {
      updatedInvoice = updateResult;
      break;
    }

    lastError = updateError;

    if (!updateError || updateError.code !== 'PGRST204') {
      break;
    }
  }

  if (!updatedInvoice) {
    if (lastError) {
      console.error('Error updating invoice:', lastError);
      throw lastError;
    }
    throw new Error('Unknown error updating invoice');
  }
  
  // Store payment_method in localStorage if column doesn't exist in database
  if (updateData.payment_method) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
      existingData[id] = updateData.payment_method;
      localStorage.setItem('invoice-payment-methods', JSON.stringify(existingData));
    } catch (e) {
      console.warn('Could not store payment method in localStorage:', e);
    }
  }

  if (updatedInvoiceType) {
    try {
      const existingTypes = JSON.parse(localStorage.getItem('invoice-types') || '{}');
      existingTypes[id] = updatedInvoiceType;
      localStorage.setItem('invoice-types', JSON.stringify(existingTypes));
    } catch (e) {
      console.warn('Could not store invoice type in localStorage:', e);
    }
  }
  
  // Store services in localStorage if provided
  if (services && services.length > 0) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-services') || '{}');
      existingData[id] = services;
      localStorage.setItem('invoice-services', JSON.stringify(existingData));
      console.log(`💾 Services mis à jour pour la facture ${id}:`, services.length, 'services');
    } catch (e) {
      console.warn('Could not store services in localStorage:', e);
    }
  }

  if (updateData.summary_description !== undefined) {
    try {
      const existingSummaries = JSON.parse(localStorage.getItem('invoice-summary-descriptions') || '{}');
      if (updateData.summary_description) {
        existingSummaries[id] = updateData.summary_description;
      } else if (existingSummaries[id]) {
        delete existingSummaries[id];
      }
      localStorage.setItem('invoice-summary-descriptions', JSON.stringify(existingSummaries));
    } catch (e) {
      console.warn('Could not store invoice summary description in localStorage (update):', e);
    }
  }
  
  // Return the invoice with services array if provided
  return { ...updatedInvoice, services: services || [], invoice_type: updatedInvoiceType } as Invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw error;
}




// Storage - Logo upload
export async function uploadLogo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'image/png',
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
  if (!data || !data.publicUrl) {
    throw new Error('Impossible de récupérer l\'URL publique du logo');
  }
  return data.publicUrl;
}

// Settings (user-specific)
export async function fetchSettings(): Promise<Settings | null> {
  console.log('🔍 fetchSettings: Vérification de l\'authentification...');
  const { data: { user } } = await supabase.auth.getUser();
  console.log('🔍 fetchSettings: Utilisateur:', user);
  if (!user) {
    console.log('❌ fetchSettings: Utilisateur non authentifié');
    return null;
  }
  
  // Essayer de récupérer depuis la base de données
  try {
    console.log('🔍 fetchSettings: Recherche des paramètres pour user_id:', user.id);
  const { data, error } = await supabase
    .from('settings')
    .select('*')
      .eq('user_id', user.id)
    .maybeSingle();
    
    console.log('🔍 fetchSettings: Résultat de la requête:', { data, error });
  if (error) throw error;
    if (data) {
      console.log('🔍 fetchSettings: Paramètres trouvés en base:', data);
      // Map DB lowercase columns -> app camelCase
      const dbData = data as DatabaseSettings;
      console.log('🔍 fetchSettings: Toutes les colonnes:', Object.keys(dbData));
      const mapped: Settings = {
        id: dbData.id,
        companyName: dbData.companyname ?? '',
        ownerName: dbData.ownername ?? '',
        email: dbData.email ?? '',
        phone: dbData.phone ?? '',
        address: dbData.address ?? '',
        siret: dbData.siret ?? '',
        defaultHourlyRate: dbData.defaulthourlyrate ?? 0,
        invoicePrefix: dbData.invoiceprefix ?? '',
        paymentTerms: dbData.paymentterms ?? 0,
        logoUrl: dbData.logourl ?? '',
        invoiceTerms: dbData.invoiceterms ?? '',
        paymentMethod: dbData.paymentmethod,
        additionalTerms: dbData.additionalterms,
        showLegalRate: dbData.show_legal_rate ?? true,
        showFixedFee: dbData.show_fixed_fee ?? true,
        urssafActivity: dbData.urssafactivity as 'services' | 'ventes' | 'liberale' | undefined,
        created_at: dbData.created_at,
        updated_at: dbData.updated_at,
      };
  return mapped;
    } else {
      console.log('🔍 fetchSettings: Aucun paramètre en base, recherche dans localStorage...');
    }
  } catch (error) {
    console.log('Erreur lors de la récupération des paramètres depuis la DB:', error);
  }
  
  // Fallback: récupérer depuis localStorage
  try {
    console.log('🔍 fetchSettings: Recherche dans localStorage...');
    const stored = localStorage.getItem('user-settings');
    console.log('🔍 fetchSettings: Données localStorage:', stored);
    if (stored) {
      const data = JSON.parse(stored);
      console.log('🔍 fetchSettings: Paramètres localStorage parsés:', data);
      console.log('🔍 fetchSettings: Comparaison user_id - localStorage:', data.user_id, 'vs utilisateur actuel:', user.id);
      if (data.user_id === user.id) {
        console.log('✅ fetchSettings: Paramètres localStorage trouvés pour cet utilisateur');
        return {
          id: 'local',
          companyName: data.companyName || '',
          ownerName: data.ownerName || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          siret: data.siret || '',
          defaultHourlyRate: data.defaultHourlyRate || 0,
          invoicePrefix: data.invoicePrefix || '',
          paymentTerms: data.paymentTerms || 0,
          logoUrl: data.logoUrl || '',
          invoiceTerms: data.invoiceTerms || '',
          urssafActivity: data.urssafActivity || 'services',
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
      } else {
        console.log('🧹 fetchSettings: Paramètres localStorage appartiennent à un autre utilisateur, nettoyage...');
        localStorage.removeItem('user-settings');
        localStorage.removeItem('business-settings');
      }
    }
  } catch (error) {
    console.log('❌ fetchSettings: Erreur lors de la récupération depuis localStorage:', error);
  }
  
  console.log('❌ fetchSettings: Aucun paramètre trouvé nulle part');
  return null;
}

export async function upsertSettings(payload: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<Settings> {
  console.log('🔍 upsertSettings: Début de la fonction avec payload:', payload);
  const { data: { user } } = await supabase.auth.getUser();
  console.log('🔍 upsertSettings: Utilisateur authentifié:', user?.id);
  if (!user) throw new Error('User not authenticated');
  
  const now = new Date().toISOString();
  
  // Sauvegarder dans localStorage comme fallback
  const settingsData = {
    user_id: user.id,
    companyName: payload.companyName,
    ownerName: payload.ownerName,
    email: payload.email,
    phone: payload.phone,
    address: payload.address,
    siret: payload.siret,
    defaultHourlyRate: payload.defaultHourlyRate,
    invoicePrefix: payload.invoicePrefix,
    paymentTerms: payload.paymentTerms,
    logoUrl: payload.logoUrl,
    invoiceTerms: payload.invoiceTerms,
    paymentMethod: payload.paymentMethod,
    additionalTerms: payload.additionalTerms,
    showLegalRate: payload.showLegalRate,
    showFixedFee: payload.showFixedFee,
    urssafActivity: (payload as any).urssafActivity,
    updated_at: now,
    created_at: now,
  };
  
  // Sauvegarder dans localStorage
  localStorage.setItem('user-settings', JSON.stringify(settingsData));
  
  // Essayer de sauvegarder dans la base de données
  try {
    console.log('🔍 upsertSettings: Début de la sauvegarde pour user_id:', user.id);
    
    // D'abord supprimer les anciens paramètres de l'utilisateur
    console.log('🗑️ upsertSettings: Suppression des anciens paramètres...');
    const { error: deleteError } = await supabase
      .from('settings')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('❌ upsertSettings: Erreur lors de la suppression:', deleteError);
    } else {
      console.log('✅ upsertSettings: Anciens paramètres supprimés');
    }
    
    // Puis insérer les nouveaux paramètres avec un ID généré
    console.log('➕ upsertSettings: Insertion des nouveaux paramètres...');
    const insertData = {
      id: user.id, // Utiliser l'ID de l'utilisateur comme ID de la table
      user_id: user.id,
      companyname: payload.companyName || '',
      ownername: payload.ownerName || '',
      email: payload.email || '',
      phone: payload.phone || '',
      address: payload.address || '',
      siret: payload.siret || '',
      defaulthourlyrate: payload.defaultHourlyRate || 0,
      invoiceprefix: payload.invoicePrefix || 'FAC',
      paymentterms: payload.paymentTerms || 30,
      logourl: payload.logoUrl || '',
      invoiceterms: payload.invoiceTerms || '',
      updated_at: now,
      created_at: now,
    };
    
    console.log('📝 upsertSettings: Données à insérer:', insertData);
    
  const { data, error } = await supabase
    .from('settings')
      .insert(insertData)
      .select('*')
      .single();
    
    if (error) {
      console.error('❌ upsertSettings: Erreur lors de l\'insertion:', error);
      console.error('❌ upsertSettings: Détails de l\'erreur:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Si l'erreur est liée à la colonne includelatepaymentpenalties, essayer sans cette colonne
      if (error.message.includes('includelatepaymentpenalties')) {
        console.log('🔄 upsertSettings: Tentative sans la colonne includelatepaymentpenalties...');
        const insertDataWithoutPenalties = {
          user_id: user.id,
          companyname: payload.companyName || '',
          ownername: payload.ownerName || '',
          email: payload.email || '',
          phone: payload.phone || '',
          address: payload.address || '',
          siret: payload.siret || '',
          defaulthourlyrate: payload.defaultHourlyRate || 0,
          invoiceprefix: payload.invoicePrefix || 'FAC',
          paymentterms: payload.paymentTerms || 30,
          logourl: payload.logoUrl || '',
          invoiceterms: payload.invoiceTerms || '',
          updated_at: now,
          created_at: now,
        };
        
        const { data: retryData, error: retryError } = await supabase
          .from('settings')
          .insert(insertDataWithoutPenalties)
    .select('*')
    .single();
          
        if (retryError) {
          console.error('❌ upsertSettings: Erreur même sans la colonne:', retryError);
          throw retryError;
        }
        
        console.log('✅ upsertSettings: Sauvegarde réussie sans la colonne includelatepaymentpenalties');
        return {
          id: retryData.id,
          companyName: retryData.companyname || '',
          ownerName: retryData.ownername || '',
          email: retryData.email || '',
          phone: retryData.phone || '',
          address: retryData.address || '',
          siret: retryData.siret || '',
          defaultHourlyRate: retryData.defaulthourlyrate || 0,
          invoicePrefix: retryData.invoiceprefix || 'FAC',
          paymentTerms: retryData.paymentterms || 30,
          logoUrl: retryData.logourl || '',
          invoiceTerms: retryData.invoiceterms || '',
          urssafActivity: (retryData as any).urssafactivity || 'services',
          created_at: retryData.created_at,
          updated_at: retryData.updated_at,
        };
      }
      
      throw error;
    }
    
    console.log('✅ upsertSettings: Paramètres insérés avec succès:', data);
    
    // Map back to app shape
    const dbData = data as DatabaseSettings;
    const mapped: Settings = {
      id: dbData.id,
      companyName: dbData.companyname ?? '',
      ownerName: dbData.ownername ?? '',
      email: dbData.email ?? '',
      phone: dbData.phone ?? '',
      address: dbData.address ?? '',
      siret: dbData.siret ?? '',
      defaultHourlyRate: dbData.defaulthourlyrate ?? 0,
      invoicePrefix: dbData.invoiceprefix ?? '',
      paymentTerms: dbData.paymentterms ?? 0,
      logoUrl: dbData.logourl ?? '',
      invoiceTerms: dbData.invoiceterms ?? '',
      urssafActivity: dbData.urssafactivity as 'services' | 'ventes' | 'liberale' | undefined,
      created_at: dbData.created_at,
      updated_at: dbData.updated_at,
    };
  return mapped;
  } catch (error) {
    console.log('Erreur lors de la sauvegarde en base, utilisation du localStorage:', error);
    // Retourner les données du localStorage
    return {
      id: 'local',
      companyName: payload.companyName,
      ownerName: payload.ownerName,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      siret: payload.siret,
      defaultHourlyRate: payload.defaultHourlyRate,
      invoicePrefix: payload.invoicePrefix,
      paymentTerms: payload.paymentTerms,
      logoUrl: payload.logoUrl,
      invoiceTerms: payload.invoiceTerms,
      urssafActivity: (payload as any).urssafActivity,
      created_at: now,
      updated_at: now,
    };
  }
}

// ===== FONCTIONS POUR LES NOTES =====

export interface ClientNote {
  id: string;
  client_id: string;
  type: 'general' | 'call' | 'email' | 'meeting';
  content: string;
  created_at: string;
  updated_at: string;
}

export async function fetchClientNotes(clientId: string): Promise<ClientNote[]> {
  try {
    const { data, error } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', clientId)
      .eq('type', 'note')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching client notes:', error);
      throw error;
    }
    
    // Mapper les données de la base vers notre interface
    return (data || []).map((note: DatabaseClientContact) => ({
      id: note.id,
      client_id: note.client_id,
      type: note.type as 'general' | 'call' | 'email' | 'meeting',
      content: note.description || note.subject,
      created_at: note.created_at,
      updated_at: note.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch client notes:', error);
    return [];
  }
}

export async function createClientNote(payload: {
  client_id: string;
  type: 'general' | 'call' | 'email' | 'meeting';
  content: string;
}): Promise<ClientNote> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const now = new Date().toISOString();
    const toInsert = {
      client_id: payload.client_id,
      type: 'note', // Toujours 'note' pour les notes
      subject: payload.type === 'general' ? 'Note générale' : 
               payload.type === 'call' ? 'Appel téléphonique' :
               payload.type === 'email' ? 'Email' : 'Rendez-vous',
      description: payload.content,
      created_at: now,
      updated_at: now
    };
    
    const { data, error } = await supabase
      .from('client_contacts')
      .insert(toInsert)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating client note:', error);
      throw error;
    }
    
    return {
      id: data.id,
      client_id: data.client_id,
      type: payload.type,
      content: data.description,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  } catch (error) {
    console.error('Failed to create client note:', error);
    throw error;
  }
}

export async function deleteClientNote(noteId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('client_contacts')
      .delete()
      .eq('id', noteId);
    
    if (error) {
      console.error('Error deleting client note:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to delete client note:', error);
    throw error;
  }
}

// ==================== NOTIFICATIONS ====================

interface DatabaseNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Récupérer toutes les notifications de l'utilisateur
export async function fetchNotifications(): Promise<BusinessNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data as DatabaseNotification[]).map((n) => ({
      id: n.id,
      user_id: n.user_id,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message || undefined,
      link: n.link || undefined,
      read: n.read,
      metadata: n.metadata || undefined,
      created_at: n.created_at,
      updated_at: n.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

// Récupérer le nombre de notifications non lues
export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}

// Créer une notification
export async function createNotification(
  type: NotificationType,
  title: string,
  message?: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<BusinessNotification> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        message: message || null,
        link: link || null,
        read: false,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    const n = data as DatabaseNotification;
    return {
      id: n.id,
      user_id: n.user_id,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message || undefined,
      link: n.link || undefined,
      read: n.read,
      metadata: n.metadata || undefined,
      created_at: n.created_at,
      updated_at: n.updated_at,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Marquer une notification comme lue
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Marquer toutes les notifications comme lues
export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Supprimer une notification
export async function deleteNotification(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

// Supprimer toutes les notifications lues
export async function deleteReadNotifications(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('read', true);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    throw error;
  }
}

// ==================== MESSAGES ====================

interface DatabaseMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  client_id: string | null;
  subject: string | null;
  content: string;
  attachments: unknown[] | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

// Récupérer toutes les conversations de l'utilisateur
export async function fetchConversations(): Promise<Conversation[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Récupérer tous les messages où l'utilisateur est expéditeur ou destinataire
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Récupérer les emails des utilisateurs impliqués
    const userIds = new Set<string>();
    if (messages) {
      for (const msg of messages as any[]) {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      }
    }

    const userIdsArray = Array.from(userIds);
    const userEmailsMap = new Map<string, string>();
    
    // Pour chaque utilisateur, récupérer son email depuis auth.users
    // Note: On ne peut pas directement interroger auth.users, donc on utilise l'email du user actuel
    // et pour les autres, on essaie de trouver l'email dans les messages existants ou on utilise un placeholder
    for (const userId of Array.from(userIds)) {
      try {
        // Si c'est l'utilisateur actuel, on récupère son email
        if (userId === user.id) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser?.email) {
            userEmailsMap.set(userId, currentUser.email);
            continue;
          }
        }
        
        // Pour les autres utilisateurs, on cherche leur email dans les messages existants
        // ou on utilise un placeholder
        // Note: Dans un vrai système, il faudrait une table de profils ou utiliser l'API Admin
        let foundEmail = false;
        if (messages) {
          for (const msg of messages as any[]) {
            // Si on trouve un message où cet utilisateur est impliqué et qu'on a son email quelque part
            // On va plutôt utiliser un identifiant basé sur l'ID pour l'instant
            // et améliorer plus tard avec une vraie table de profils
          }
        }
        
        // Si pas trouvé, utiliser un identifiant basé sur l'ID
        userEmailsMap.set(userId, `user-${userId.substring(0, 8)}`);
      } catch {
        userEmailsMap.set(userId, `user-${userId.substring(0, 8)}`);
      }
    }

    // Grouper les messages par conversation (par autre utilisateur)
    const conversationsMap = new Map<string, Conversation>();
    
    if (messages) {
      for (const msg of messages as any[]) {
        const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        const otherUserEmail = userEmailsMap.get(otherUserId) || 'Utilisateur inconnu';
        
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            id: otherUserId,
            other_user_id: otherUserId,
            other_user_email: otherUserEmail,
            unread_count: 0,
            client: msg.client_id ? { id: msg.client_id, name: '' } : undefined,
          });
        }
        
        const conversation = conversationsMap.get(otherUserId)!;
        
        // Mettre à jour le dernier message si nécessaire
        if (!conversation.last_message || new Date(msg.created_at) > new Date(conversation.last_message.created_at)) {
          conversation.last_message = {
            id: msg.id,
            sender_id: msg.sender_id,
            recipient_id: msg.recipient_id,
            client_id: msg.client_id || undefined,
            subject: msg.subject || undefined,
            content: msg.content,
            attachments: Array.isArray(msg.attachments) ? msg.attachments as any[] : undefined,
            read: msg.read,
            read_at: msg.read_at || undefined,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
          };
        }
        
        // Compter les messages non lus
        if (msg.recipient_id === user.id && !msg.read) {
          conversation.unread_count++;
        }
      }
    }

    // Récupérer les noms des clients si nécessaire
    const clientIds = Array.from(conversationsMap.values())
      .map(c => c.client?.id)
      .filter(Boolean) as string[];
    
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .in('id', clientIds);
      
      if (clients) {
        for (const conversation of conversationsMap.values()) {
          if (conversation.client?.id) {
            const client = clients.find(c => c.id === conversation.client?.id);
            if (client) {
              conversation.client.name = client.name;
            }
          }
        }
      }
    }

    return Array.from(conversationsMap.values()).sort((a, b) => {
      const aDate = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const bDate = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return bDate - aDate;
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

// Récupérer les messages d'une conversation
export async function fetchMessages(otherUserId: string, limit: number = 50): Promise<Message[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Valider que otherUserId est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(otherUserId)) {
      throw new Error('L\'ID de l\'utilisateur doit être un UUID valide');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Récupérer les emails des utilisateurs
    const userIds = new Set<string>();
    userIds.add(user.id);
    userIds.add(otherUserId);
    
    const userEmailsMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        // Valider que c'est un UUID valide
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          // Si ce n'est pas un UUID valide, on ne peut pas continuer
          console.warn(`Invalid UUID format: ${userId}`);
          userEmailsMap.set(userId, 'ID invalide');
          continue;
        }
        
        if (userId === user.id) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser?.email) {
            userEmailsMap.set(userId, currentUser.email);
          } else {
            userEmailsMap.set(userId, `user-${userId.substring(0, 8)}`);
          }
        } else {
          // Pour l'autre utilisateur, on utilise un identifiant basé sur l'ID
          // Dans un vrai système, il faudrait une table de profils ou API Admin
          userEmailsMap.set(userId, `user-${userId.substring(0, 8)}`);
        }
      } catch {
        userEmailsMap.set(userId, `user-${userId.substring(0, 8)}`);
      }
    }

    return (data as any[]).map((msg: any) => ({
      id: msg.id,
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      client_id: msg.client_id || undefined,
      subject: msg.subject || undefined,
      content: msg.content,
      attachments: Array.isArray(msg.attachments) ? msg.attachments as any[] : undefined,
      read: msg.read,
      read_at: msg.read_at || undefined,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: { id: msg.sender_id, email: userEmailsMap.get(msg.sender_id) || 'Utilisateur' },
      recipient: { id: msg.recipient_id, email: userEmailsMap.get(msg.recipient_id) || 'Utilisateur' },
    })).reverse(); // Inverser pour afficher du plus ancien au plus récent
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// Envoyer un message
export async function sendMessage(
  recipientId: string,
  content: string,
  subject?: string,
  clientId?: string,
  attachments?: { name: string; url: string; size: number; type: string }[]
): Promise<Message> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Valider que recipientId est un UUID valide
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(recipientId)) {
      throw new Error('L\'ID du destinataire doit être un UUID valide');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        client_id: clientId || null,
        subject: subject || null,
        content,
        attachments: attachments && attachments.length > 0 ? attachments : null,
        read: false,
      })
      .select()
      .single();

    if (error) throw error;

    const msg = data as DatabaseMessage;
    return {
      id: msg.id,
      sender_id: msg.sender_id,
      recipient_id: msg.recipient_id,
      client_id: msg.client_id || undefined,
      subject: msg.subject || undefined,
      content: msg.content,
      attachments: Array.isArray(msg.attachments) ? msg.attachments as any[] : undefined,
      read: msg.read,
      read_at: msg.read_at || undefined,
      created_at: msg.created_at,
      updated_at: msg.updated_at,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Uploader une pièce jointe
export async function uploadMessageAttachment(file: File): Promise<{ name: string; url: string; size: number; type: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Créer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Upload vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(fileName);

    return {
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type || 'application/octet-stream'
    };
  } catch (error) {
    console.error('Error uploading attachment:', error);
    throw error;
  }
}

// Marquer un message comme lu
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

// Marquer tous les messages d'une conversation comme lus
export async function markConversationAsRead(otherUserId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    const { error } = await supabase
      .from('messages')
      .update({ 
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('recipient_id', user.id)
      .eq('sender_id', otherUserId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
}

// Récupérer le nombre de messages non lus
export async function getUnreadMessagesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting unread messages count:', error);
    return 0;
  }
}

// Supprimer un message
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Vérifier que l'utilisateur est soit le sender soit le recipient
    const { data: message } = await supabase
      .from('messages')
      .select('sender_id, recipient_id')
      .eq('id', messageId)
      .single();

    if (!message) {
      throw new Error('Message non trouvé');
    }

    // Permettre la suppression si l'utilisateur est l'expéditeur OU le destinataire
    if (message.sender_id !== user.id && message.recipient_id !== user.id) {
      throw new Error('Vous ne pouvez supprimer que vos propres messages ou les messages que vous avez reçus');
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
}

const conversationCache = new Map<string, Conversation>();

const SERVICE_PRICING_STORAGE_KEY = 'service-pricing-types';
const SERVICE_PRICING_VALUES: ServicePricingType[] = ['hourly', 'daily', 'project'];

const readServicePricingTypes = (): Record<string, ServicePricingType> => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(SERVICE_PRICING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, ServicePricingType>;
    }
  } catch (error) {
    console.warn('Could not read service pricing types from localStorage:', error);
  }
  return {};
};

const writeServicePricingTypes = (map: Record<string, ServicePricingType>) => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return;
  }
  try {
    window.localStorage.setItem(SERVICE_PRICING_STORAGE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('Could not write service pricing types to localStorage:', error);
  }
};

const persistServicePricingType = (serviceId: string, pricingType?: ServicePricingType | null) => {
  try {
    const map = readServicePricingTypes();
    if (pricingType && SERVICE_PRICING_VALUES.includes(pricingType)) {
      map[serviceId] = pricingType;
    } else if (serviceId in map) {
      delete map[serviceId];
    }
    writeServicePricingTypes(map);
  } catch (error) {
    console.warn('Could not persist service pricing type to localStorage:', error);
  }
};

const loadPricingTypeForService = (serviceId: string): ServicePricingType | undefined => {
  const map = readServicePricingTypes();
  const stored = map[serviceId];
  return SERVICE_PRICING_VALUES.includes(stored as ServicePricingType) ? (stored as ServicePricingType) : undefined;
};

const normalizeServicePricingType = (value: unknown): ServicePricingType | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  return SERVICE_PRICING_VALUES.includes(value as ServicePricingType) ? (value as ServicePricingType) : undefined;
};

const resolveServicePricingType = (service: DatabaseService): ServicePricingType | undefined => {
  const direct = normalizeServicePricingType((service as any).pricing_type);
  if (direct) {
    return direct;
  }
  return loadPricingTypeForService(service.id);
};