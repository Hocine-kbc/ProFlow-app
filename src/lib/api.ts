import { supabase } from './supabase';
import { Client, Service, Invoice, Settings } from '../types';

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
  } catch (error) {
    // Return empty array if there's any error
    return [];
  }
}

export async function createClient(payload: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  try {
    const now = new Date().toISOString();
    const toInsert = { ...payload, created_at: now, updated_at: now } as any;
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
  const now = new Date().toISOString();
  const toInsert = { ...payload, created_at: now, updated_at: now } as any;
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
    const invoices = (data || []).map((invoice: any) => {
      // Get payment_method from localStorage if not in database
      let paymentMethod = invoice.payment_method;
      if (!paymentMethod) {
        try {
          const paymentMethods = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
          paymentMethod = paymentMethods[invoice.id] || null;
        } catch (e) {
          // Gestion silencieuse des erreurs
        }
      }
      
      return {
        ...invoice,
        // Ensure services array is properly handled
        services: invoice.services || [],
        // Client will be fetched separately if needed
        client: null,
        // Add payment_method from localStorage if not in database
        payment_method: paymentMethod,
      };
    });
    
    return invoices as Invoice[];
  } catch (error) {
    // Return empty array if there's any error
    return [];
  }
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'client' | 'created_at' | 'updated_at'>): Promise<Invoice> {
  const now = new Date().toISOString();
  // Extract services from payload and create a clean invoice object
  const { services, ...invoiceData } = payload;
  
  // Map camelCase to snake_case for database
  const toInsert: any = {
    created_at: now,
    updated_at: now
  };
  
  // Map fields from camelCase to snake_case
  if (invoiceData.client_id !== undefined) toInsert.client_id = invoiceData.client_id;
  if (invoiceData.invoice_number !== undefined) toInsert.invoice_number = invoiceData.invoice_number;
  if (invoiceData.date !== undefined) toInsert.date = invoiceData.date;
  if (invoiceData.due_date !== undefined) toInsert.due_date = invoiceData.due_date;
  // Note: payment_method column might not exist in database yet
  // if (invoiceData.payment_method !== undefined) toInsert.payment_method = invoiceData.payment_method;
  if (invoiceData.subtotal !== undefined) toInsert.subtotal = invoiceData.subtotal;
  if (invoiceData.urssaf_deduction !== undefined) toInsert.urssaf_deduction = invoiceData.urssaf_deduction;
  if (invoiceData.net_amount !== undefined) toInsert.net_amount = invoiceData.net_amount;
  if (invoiceData.status !== undefined) toInsert.status = invoiceData.status;
  
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
  
  // Return the invoice with services array
  return { ...data, services: services || [] } as Invoice;
}

export async function updateInvoice(id: string, payload: Partial<Invoice>): Promise<Invoice> {
  // Extract services from payload if present
  const { services, ...updateData } = payload;
  
  // Map camelCase to snake_case for database
  const dbUpdateData: any = {
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
  if (updateData.urssaf_deduction !== undefined) dbUpdateData.urssaf_deduction = updateData.urssaf_deduction;
  if (updateData.net_amount !== undefined) dbUpdateData.net_amount = updateData.net_amount;
  if (updateData.status !== undefined) dbUpdateData.status = updateData.status;
  
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

// Settings (singleton row with id = 'default')
export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Map DB lowercase columns -> app camelCase
  const mapped: Settings = {
    id: (data as any).id,
    companyName: (data as any).companyname ?? '',
    ownerName: (data as any).ownername ?? '',
    email: (data as any).email ?? '',
    phone: (data as any).phone ?? '',
    address: (data as any).address ?? '',
    siret: (data as any).siret ?? '',
    defaultHourlyRate: (data as any).defaulthourlyrate ?? 0,
    urssafRate: (data as any).urssafrate ?? 0,
    invoicePrefix: (data as any).invoiceprefix ?? '',
    paymentTerms: (data as any).paymentterms ?? 0,
    logoUrl: (data as any).logourl ?? '',
    invoiceTerms: (data as any).invoiceterms ?? '',
    created_at: (data as any).created_at,
    updated_at: (data as any).updated_at,
  };
  return mapped;
}

export async function upsertSettings(payload: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<Settings> {
  const now = new Date().toISOString();
  // Map app camelCase -> DB lowercase columns
  const toUpsert = {
    id: 'default',
    companyname: (payload as any).companyName,
    ownername: (payload as any).ownerName,
    email: (payload as any).email,
    phone: (payload as any).phone,
    address: (payload as any).address,
    siret: (payload as any).siret,
    defaulthourlyrate: (payload as any).defaultHourlyRate,
    urssafrate: (payload as any).urssafRate,
    invoiceprefix: (payload as any).invoicePrefix,
    paymentterms: (payload as any).paymentTerms,
    logourl: (payload as any).logoUrl,
    invoiceterms: (payload as any).invoiceTerms,
    updated_at: now,
    created_at: now,
  } as any;
  const { data, error } = await supabase
    .from('settings')
    .upsert(toUpsert, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  // Map back to app shape
  const mapped: Settings = {
    id: (data as any).id,
    companyName: (data as any).companyname ?? '',
    ownerName: (data as any).ownername ?? '',
    email: (data as any).email ?? '',
    phone: (data as any).phone ?? '',
    address: (data as any).address ?? '',
    siret: (data as any).siret ?? '',
    defaultHourlyRate: (data as any).defaulthourlyrate ?? 0,
    urssafRate: (data as any).urssafrate ?? 0,
    invoicePrefix: (data as any).invoiceprefix ?? '',
    paymentTerms: (data as any).paymentterms ?? 0,
    logoUrl: (data as any).logourl ?? '',
    invoiceTerms: (data as any).invoiceterms ?? '',
    created_at: (data as any).created_at,
    updated_at: (data as any).updated_at,
  };
  return mapped;
}