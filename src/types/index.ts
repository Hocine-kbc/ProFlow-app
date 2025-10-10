// ... existing code ...

// Article type
export interface Article {
  id: string;
  name: string;
  description: string;
  hourly_rate: number;
  category?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Service type
export interface Service {
  id: string;
  client_id: string;
  date: string;
  hours: number;
  hourly_rate: number;
  description: string;
  status: 'pending' | 'completed' | 'invoiced';
  article_id?: string; // Référence vers l'article utilisé
  client?: {
    id: string;
    name: string;
  };
}

// Invoice type
export interface Invoice {
  id: string;
  client_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  payment_method?: string;
  subtotal?: number;
  net_amount?: number;
  status: 'draft' | 'sent' | 'paid';
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  services?: Service[];
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

// Types pour le chatbot
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'action';
}

export interface ChatSuggestion {
  id: string;
  text: string;
  action?: string;
  icon?: string;
}

export interface ChatBotState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  suggestions: ChatSuggestion[];
}