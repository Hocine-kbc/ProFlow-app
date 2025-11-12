// ... existing code ...

// Article type
export type ServicePricingType = 'hourly' | 'daily' | 'project';

export interface Article {
  id: string;
  name: string;
  description: string;
  hourly_rate: number;
  category?: string;
  pricing_type?: ServicePricingType;
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
  pricing_type?: ServicePricingType;
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
  summary_description?: string;
  paid_date?: string;
  paid_amount?: number;
  invoice_type?: 'detailed' | 'summary';
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

// =====================================================
// TYPES POUR MESSAGERIE EMAIL COMPLÈTE
// =====================================================

// Statut d'un message
export type MessageStatus = 'draft' | 'sent' | 'scheduled' | 'failed';

// Priorité d'un message
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

// Dossier d'un message
export type MessageFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash' | 'spam' | 'starred';

// Message étendu pour la messagerie email
export interface EmailMessage extends Message {
  status: MessageStatus;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by_users?: string[]; // Array of user IDs who deleted this message (per-user soft delete)
  scheduled_at?: string;
  thread_id?: string;
  reply_to_id?: string;
  in_reply_to_id?: string;
  priority: MessagePriority;
  spam_score?: number;
  is_spam: boolean;
  folder: MessageFolder;
  labels?: MessageLabel[];
  thread?: MessageThread;
}

// Étiquette personnalisée
export interface MessageLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// Thread de conversation
export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  messages?: EmailMessage[];
}

// Filtres de recherche
export interface MessageFilters {
  folder?: MessageFolder;
  is_starred?: boolean;
  is_archived?: boolean;
  is_read?: boolean;
  label_id?: string;
  priority?: MessagePriority;
  from?: string;
  to?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
}

// Paramètres de recherche
export interface MessageSearchParams {
  query?: string;
  filters?: MessageFilters;
  sort_by?: 'date' | 'subject' | 'priority' | 'sender';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Résultats de recherche
export interface MessageSearchResults {
  messages: EmailMessage[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Statistiques de messagerie
export interface MessageStats {
  inbox_count: number;
  unread_count: number;
  drafts_count: number;
  sent_count: number;
  archived_count: number;
  starred_count: number;
  spam_count: number;
}

// Options de planification
export interface ScheduleOptions {
  scheduled_at: string;
  timezone?: string;
}

// Options d'envoi
export interface SendOptions {
  send_immediately?: boolean;
  schedule?: ScheduleOptions;
  send_external_email?: boolean; // Envoyer aussi via SendGrid
  external_recipients?: string[]; // Emails externes à inclure
}