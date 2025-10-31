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

// Notification type
export type NotificationType = 'payment' | 'message' | 'invoice' | 'reminder' | 'system' | 'warning';

export interface BusinessNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Message type
export interface MessageAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  client_id?: string;
  subject?: string;
  content: string;
  attachments?: MessageAttachment[];
  read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    email: string;
  };
  recipient?: {
    id: string;
    email: string;
  };
  client?: {
    id: string;
    name: string;
  };
}

export interface Conversation {
  id: string;
  other_user_id: string;
  other_user_email: string;
  last_message?: Message;
  unread_count: number;
  client?: {
    id: string;
    name: string;
  };
}