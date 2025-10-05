import { supabase } from './supabase.ts';
import { Client, Service, Invoice, Settings } from '../types/index.ts';

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
  created_at: string;
  updated_at: string;
}

interface DatabaseClient {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
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
  services?: unknown[];
  // Paramètres spécifiques à la facture
  invoice_terms?: string;
  payment_terms?: number;
  include_late_payment_penalties?: boolean;
  additional_terms?: string;
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
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
    const { data, error } = await supabase
      .from('clients')
      .insert(toInsert)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }
    
    return data as Client;
  } catch (error) {
    console.error('Failed to create client:', error);
    throw error;
  }
}

export async function updateClient(id: string, payload: Partial<Client>): Promise<Client> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating client:', error);
      throw error;
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
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as Service[];
}

export async function createService(payload: Omit<Service, 'id' | 'client' | 'created_at' | 'updated_at'>): Promise<Service> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  const now = new Date().toISOString();
  const toInsert = { ...payload, user_id: user.id, created_at: now, updated_at: now } as Partial<DatabaseService>;
  const { data, error } = await supabase
    .from('services')
    .insert(toInsert)
    .select('*')
    .single();
  if (error) throw error;
  return data as Service;
}

export async function updateService(id: string, payload: Partial<Service>): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Service;
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id);
  if (error) throw error;
}

// Invoices
export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    // Simple query without relationships first
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('date', { ascending: false });
    
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
      
      return {
        ...invoice,
        // Use services from localStorage if available
        services: invoiceServices,
        // Client will be fetched separately if needed
        client: null,
        // Add payment_method from localStorage if not in database
        payment_method: paymentMethod,
        // Map database fields to camelCase for the new invoice-specific fields
        invoice_terms: invoice.invoice_terms,
        payment_terms: invoice.payment_terms,
        include_late_payment_penalties: invoice.include_late_payment_penalties,
        additional_terms: invoice.additional_terms,
        // Paramètres de Règlement spécifiques à la facture
        show_legal_rate: invoice.show_legal_rate,
        show_fixed_fee: invoice.show_fixed_fee,
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
  
  // Sauvegarder les paramètres actuels dans la facture pour préserver les conditions d'origine
  if (currentSettings) {
    toInsert.invoice_terms = currentSettings.invoiceTerms;
    toInsert.payment_terms = currentSettings.paymentTerms;
    toInsert.additional_terms = currentSettings.additionalTerms;
    // Sauvegarder les paramètres de Règlement spécifiques à cette facture
    toInsert.show_legal_rate = currentSettings.showLegalRate ?? true;
    toInsert.show_fixed_fee = currentSettings.showFixedFee ?? true;
  }
  
  // Ajouter urssaf_deduction avec 0 pour satisfaire la contrainte NOT NULL de la DB
  toInsert.urssaf_deduction = 0;
  
  console.log('Creating invoice with data:', toInsert);
  
  const { data, error } = await supabase
    .from('invoices')
    .insert(toInsert)
    .select('*')
    .single();
    
  if (error) {
    console.error('Error creating invoice:', error);
    // If payment_method column doesn't exist, try without it
    if (error.code === 'PGRST204' && error.message.includes('payment_method')) {
      console.log('Payment method column not found, retrying without it...');
      // Remove payment_method from the data and try again
      const { payment_method: _payment_method } = invoiceData;
      const retryData = {
        ...toInsert,
        // Don't include payment_method
      };
      
      const { data: retryDataResult, error: retryError } = await supabase
        .from('invoices')
        .insert(retryData)
        .select('*')
        .single();
        
      if (retryError) {
        console.error('Error creating invoice (retry):', retryError);
        throw retryError;
      }
      
      return { ...retryDataResult, services: services || [] } as Invoice;
    }
    
    // If show_legal_rate or show_fixed_fee columns don't exist, try without them
    if (error.code === 'PGRST204' && (error.message.includes('show_legal_rate') || error.message.includes('show_fixed_fee'))) {
      console.log('Règlement columns not found, retrying without them...');
      // Remove règlement columns from the data and try again
      const retryData = {
        ...toInsert,
        show_legal_rate: undefined,
        show_fixed_fee: undefined,
      };
      
      const { data: retryDataResult, error: retryError } = await supabase
        .from('invoices')
        .insert(retryData)
        .select('*')
        .single();
        
      if (retryError) {
        console.error('Error creating invoice (retry):', retryError);
        throw retryError;
      }
      
      return { ...retryDataResult, services: services || [] } as Invoice;
    }
    throw error;
  }
  
  // Store payment_method in localStorage if column doesn't exist in database
  if (invoiceData.payment_method) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
      existingData[data.id] = invoiceData.payment_method;
      localStorage.setItem('invoice-payment-methods', JSON.stringify(existingData));
    } catch (e) {
      console.warn('Could not store payment method in localStorage:', e);
    }
  }
  
  // Store services in localStorage for persistence across page reloads
  if (services && services.length > 0) {
    try {
      const existingData = JSON.parse(localStorage.getItem('invoice-services') || '{}');
      existingData[data.id] = services;
      localStorage.setItem('invoice-services', JSON.stringify(existingData));
      console.log(`💾 Services stockés pour la facture ${data.id}:`, services.length, 'services');
    } catch (e) {
      console.warn('Could not store services in localStorage:', e);
    }
  }
  
  // Return the invoice with services array
  return { ...data, services: services || [] } as Invoice;
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
  if (updateData.status !== undefined) dbUpdateData.status = updateData.status;
  // Toujours définir urssaf_deduction à 0 pour éviter les erreurs de contrainte
  if (updateData.subtotal !== undefined || updateData.net_amount !== undefined) {
    dbUpdateData.urssaf_deduction = 0;
  }
  
  console.log('Updating invoice with data:', dbUpdateData);
  
  const { data, error } = await supabase
    .from('invoices')
    .update(dbUpdateData)
    .eq('id', id)
    .select('*')
    .single();
    
  if (error) {
    console.error('Error updating invoice:', error);
    // If payment_method column doesn't exist, try without it
    if (error.code === 'PGRST204' && error.message.includes('payment_method')) {
      console.log('Payment method column not found, retrying without it...');
      // Remove payment_method from the data and try again
      const { payment_method: _payment_method } = updateData;
      const retryData = {
        ...dbUpdateData,
        // Don't include payment_method
      };
      
      const { data: retryDataResult, error: retryError } = await supabase
        .from('invoices')
        .update(retryData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (retryError) {
        console.error('Error updating invoice (retry):', retryError);
        throw retryError;
      }
      
      return { ...retryDataResult, services: services || [] } as Invoice;
    }
    throw error;
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
  
  // Return the invoice with services array if provided
  return { ...data, services: services || [] } as Invoice;
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
      paymentmethod: payload.paymentMethod,
      additionalterms: payload.additionalTerms,
      show_legal_rate: payload.showLegalRate ?? true,
      show_fixed_fee: payload.showFixedFee ?? true,
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