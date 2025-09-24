export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  client_id: string;
  client?: Client;
  date: string;
  hours: number;
  hourly_rate: number;
  description: string;
  status: 'completed' | 'pending' | 'invoiced';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  client_id: string;
  client?: Client;
  services: Service[];
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  urssaf_deduction: number;
  net_amount: number;
  status: 'draft' | 'sent' | 'paid';
  created_at: string;
  updated_at: string;
}

export interface BusinessStats {
  monthly_revenue: number;
  quarterly_revenue: number;
  annual_revenue: number;
  total_clients: number;
  total_hours: number;
  pending_invoices: number;
}

export interface Settings {
  id: string; // singleton id, e.g. 'default'
  companyName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  siret: string;
  defaultHourlyRate: number;
  urssafRate: number;
  invoicePrefix: string;
  paymentTerms: number;
  logoUrl: string;
  invoiceTerms: string;
  created_at: string;
  updated_at: string;
}