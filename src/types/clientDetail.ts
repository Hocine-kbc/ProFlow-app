// Types pour la vue détaillée d'un client
export interface ClientDetail {
  // Informations générales
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  company?: string;
  vatNumber?: string;
  status: 'active' | 'inactive' | 'prospect';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  
  // Chiffres clés
  kpis: {
    totalRevenue: number;
    totalInvoices: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    firstInvoiceDate?: string;
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
    averageInvoiceAmount: number;
    totalHours: number;
    averageHourlyRate: number;
  };
  
  // Historique des factures
  invoices: InvoiceDetail[];
  
  // Historique des prestations
  services: ServiceDetail[];
  
  // Informations de paiement
  paymentInfo: {
    preferredMethod?: 'bank_transfer' | 'paypal' | 'check' | 'cash' | 'card';
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
    totalPayments: number;
    averagePaymentTime: number; // en jours
  };
  
  // Pipeline / Prévisions
  pipeline: {
    draftInvoices: number;
    pendingQuotes: number;
    plannedServices: number;
    estimatedRevenue: number;
  };
  
  // Contact & Suivi
  contactHistory: ContactEntry[];
}

export interface InvoiceDetail {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial';
  paidDate?: string;
  paidAmount?: number;
  description?: string;
  services: string[]; // IDs des prestations liées
}

export interface ServiceDetail {
  id: string;
  date: string;
  description: string;
  hours: number;
  hourlyRate: number;
  amount: number;
  status: 'completed' | 'in_progress' | 'planned';
  invoiceId?: string;
}

export interface ContactEntry {
  id: string;
  date: string;
  type: 'email' | 'phone' | 'meeting' | 'note';
  subject: string;
  description: string;
  outcome?: string;
}

// Types pour les KPIs
export interface ClientKPIs {
  totalRevenue: number;
  totalInvoices: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  firstInvoiceDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  averageInvoiceAmount: number;
  totalHours: number;
  averageHourlyRate: number;
}

// Types pour les filtres
export interface ClientDetailFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  invoiceStatus?: string[];
  serviceStatus?: string[];
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}
