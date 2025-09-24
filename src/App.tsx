import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import ServicesPage from './components/ServicesPage';
import InvoicesPage from './components/InvoicesPage';
import StatsPage from './components/StatsPage';
import SettingsPage from './components/SettingsPage';
import ProfilePage from './components/ProfilePage';
import { AppProvider, useApp } from './contexts/AppContext';
import { Client, Service, Invoice } from './types';
import { fetchClients, fetchServices, fetchInvoices } from './lib/api';
import AuthPage from './components/AuthPage';
import { supabase } from './lib/supabase';

// Sample data for demonstration
const sampleClients: Client[] = [
  {
    id: '1',
    name: 'Marie Dubois',
    email: 'marie.dubois@email.fr',
    phone: '06 12 34 56 78',
    address: '15 Rue de la Paix, 75001 Paris',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    name: 'Jean Martin',
    email: 'jean.martin@email.fr',
    phone: '06 87 65 43 21',
    address: '42 Avenue des Champs, 75008 Paris',
    created_at: '2024-02-20T14:20:00Z',
    updated_at: '2024-02-20T14:20:00Z',
  },
];

const sampleServices: Service[] = [
  {
    id: '1',
    client_id: '1',
    client: sampleClients[0],
    date: '2024-11-01',
    hours: 3,
    hourly_rate: 25,
    description: 'Nettoyage complet appartement 3 pièces',
    status: 'completed',
    created_at: '2024-11-01T08:00:00Z',
    updated_at: '2024-11-01T08:00:00Z',
  },
  {
    id: '2',
    client_id: '2',
    client: sampleClients[1],
    date: '2024-11-05',
    hours: 4,
    hourly_rate: 30,
    description: 'Nettoyage bureau et vitres',
    status: 'completed',
    created_at: '2024-11-05T09:00:00Z',
    updated_at: '2024-11-05T09:00:00Z',
  },
  {
    id: '3',
    client_id: '1',
    client: sampleClients[0],
    date: '2024-11-15',
    hours: 2.5,
    hourly_rate: 25,
    description: 'Entretien bihebdomadaire',
    status: 'invoiced',
    created_at: '2024-11-15T10:00:00Z',
    updated_at: '2024-11-15T10:00:00Z',
  },
];

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { dispatch } = useApp();

  // Auth session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setIsAuthenticated(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Initialize data when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const clients = await fetchClients();
        dispatch({ type: 'SET_CLIENTS', payload: clients });
      } catch (e) {
        // fall back to sample locally if table empty or error
        dispatch({ type: 'SET_CLIENTS', payload: sampleClients });
      }
      try {
        const services = await fetchServices();
        dispatch({ type: 'SET_SERVICES', payload: services });
      } catch (e) {
        dispatch({ type: 'SET_SERVICES', payload: sampleServices });
      }
      try {
        const invoices = await fetchInvoices();
        dispatch({ type: 'SET_INVOICES', payload: invoices });
        console.log('Invoices loaded successfully:', invoices.length, 'invoices');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Erreur fetchInvoices', e);
        // Initialiser avec un tableau vide si la requête échoue
        dispatch({ type: 'SET_INVOICES', payload: [] });
      }
    })();
    const monthlyRevenue = sampleServices
      .filter(s => new Date(s.date).getMonth() === new Date().getMonth())
      .reduce((acc, s) => acc + (s.hours * s.hourly_rate * 0.78), 0);
    const stats = {
      monthly_revenue: monthlyRevenue,
      quarterly_revenue: sampleServices.reduce((acc, s) => acc + (s.hours * s.hourly_rate * 0.78), 0),
      annual_revenue: sampleServices.reduce((acc, s) => acc + (s.hours * s.hourly_rate * 0.78), 0),
      total_clients: sampleClients.length,
      total_hours: sampleServices.reduce((acc, s) => acc + s.hours, 0),
      pending_invoices: 0,
    };
    dispatch({ type: 'SET_STATS', payload: stats });
  }, [dispatch, isAuthenticated]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <ClientsPage />;
      case 'services':
        return <ServicesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'stats':
        return <StatsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderCurrentPage()}
    </Layout>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;