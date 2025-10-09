import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Service, Invoice } from '../types/index.ts';
import { NotificationData, NotificationType } from '../components/Notification.tsx';
import { fetchSettings } from '../lib/api.ts';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface BusinessStats {
  monthly_revenue: number;
  quarterly_revenue: number;
  annual_revenue: number;
  total_clients: number;
  total_hours: number;
  pending_invoices: number;
}

interface AppState {
  clients: Client[];
  services: Service[];
  invoices: Invoice[];
  stats: BusinessStats;
  loading: boolean;
  error: string | null;
  notifications: NotificationData[];
  settings: any | null;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CLIENTS'; payload: Client[] }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: Client }
  | { type: 'DELETE_CLIENT'; payload: string }
  | { type: 'SET_SERVICES'; payload: Service[] }
  | { type: 'ADD_SERVICE'; payload: Service }
  | { type: 'UPDATE_SERVICE'; payload: Service }
  | { type: 'DELETE_SERVICE'; payload: string }
  | { type: 'SET_INVOICES'; payload: Invoice[] }
  | { type: 'ADD_INVOICE'; payload: Invoice }
  | { type: 'UPDATE_INVOICE'; payload: Invoice }
  | { type: 'DELETE_INVOICE'; payload: string }
  | { type: 'SET_STATS'; payload: BusinessStats }
  | { type: 'SET_SETTINGS'; payload: any | null }
  | { type: 'ADD_NOTIFICATION'; payload: NotificationData }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

const initialState: AppState = {
  clients: [],
  services: [],
  invoices: [],
  stats: {
    monthly_revenue: 0,
    quarterly_revenue: 0,
    annual_revenue: 0,
    total_clients: 0,
    total_hours: 0,
    pending_invoices: 0,
  },
  loading: false,
  error: null,
  notifications: [],
  settings: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CLIENTS':
      return { ...state, clients: action.payload };
    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, action.payload] };
    case 'UPDATE_CLIENT':
      return {
        ...state,
        clients: state.clients.map(client =>
          client.id === action.payload.id ? action.payload : client
        ),
      };
    case 'DELETE_CLIENT':
      return {
        ...state,
        clients: state.clients.filter(client => client.id !== action.payload),
      };
    case 'SET_SERVICES':
      return { ...state, services: action.payload };
    case 'ADD_SERVICE':
      return { ...state, services: [...state.services, action.payload] };
    case 'UPDATE_SERVICE':
      return {
        ...state,
        services: state.services.map(service =>
          service.id === action.payload.id ? action.payload : service
        ),
      };
    case 'DELETE_SERVICE':
      return {
        ...state,
        services: state.services.filter(service => service.id !== action.payload),
      };
    case 'SET_INVOICES':
      return { ...state, invoices: action.payload };
    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload] };
    case 'UPDATE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map(invoice =>
          invoice.id === action.payload.id ? action.payload : invoice
        ),
      };
    case 'DELETE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.filter(invoice => invoice.id !== action.payload),
      };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_SETTINGS':
      console.log('🔄 AppContext: SET_SETTINGS appelé avec payload:', action.payload);
      return { ...state, settings: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  showNotification: (type: NotificationType, title: string, message?: string, duration?: number) => void;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Charger les settings au démarrage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSettings();
        if (settings) {
          dispatch({ type: 'SET_SETTINGS', payload: settings });
        }
      } catch (error) {
        console.warn('Impossible de charger les settings:', error);
      }
    };

    loadSettings();
  }, []);

  const showNotification = (type: NotificationType, title: string, message?: string, duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: NotificationData = {
      id,
      type,
      title,
      message,
      duration,
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, showNotification }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}