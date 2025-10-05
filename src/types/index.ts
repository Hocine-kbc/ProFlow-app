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
  net_amount: number;
  payment_method?: string;
  status: 'draft' | 'sent' | 'paid';
  archived_at?: string;
  // Paramètres spécifiques à la facture (pour préserver les conditions d'origine)
  invoice_terms?: string;
  payment_terms?: number;
  include_late_payment_penalties?: boolean;
  additional_terms?: string;
  // Paramètres de Règlement spécifiques à la facture
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
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
  invoicePrefix: string;
  paymentTerms: number;
  logoUrl: string;
  invoiceTerms: string;
  paymentMethod?: string;
  additionalTerms?: string;
  showLegalRate?: boolean;
  showFixedFee?: boolean;
  created_at: string;
  updated_at: string;
}