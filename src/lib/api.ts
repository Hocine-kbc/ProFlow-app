import { supabase } from './supabase';
import { Client, Service, Invoice, Settings } from '../types';

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Client[];
}

export async function createClient(payload: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
  const now = new Date().toISOString();
  const toInsert = { ...payload, created_at: now, updated_at: now } as any;
  const { data, error } = await supabase
    .from('clients')
    .insert(toInsert)
    .select('*')
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, payload: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
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
  const { data, error } = await supabase
    .from('invoices')
    .select('*, client:clients(*)')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []) as Invoice[];
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'client' | 'created_at' | 'updated_at'>): Promise<Invoice> {
  const now = new Date().toISOString();
  const toInsert = { ...payload, created_at: now, updated_at: now } as any;
  const { data, error } = await supabase
    .from('invoices')
    .insert(toInsert)
    .select('*')
    .single();
  if (error) throw error;
  return data as Invoice;
}

export async function updateInvoice(id: string, payload: Partial<Invoice>): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as Invoice;
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