import { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import ClientsPage from './components/ClientsPage.tsx';
import ServicesPage from './components/ServicesPage.tsx';
import InvoicesPage from './components/InvoicesPage.tsx';
import StatsPage from './components/StatsPage.tsx';
import SettingsPage from './components/SettingsPage.tsx';
import ProfilePage from './components/ProfilePage.tsx';
import ArchivePage from './components/ArchivePage.tsx';
import { AppProvider, useApp } from './contexts/AppContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { fetchClients, fetchServices, fetchInvoices } from './lib/api.ts';
import AuthPage from './components/AuthPage.tsx';
import { supabase } from './lib/supabase.ts';


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
      // Rediriger vers le dashboard après connexion
      if (session && _event === 'SIGNED_IN') {
        setCurrentPage('dashboard');
      }
      // Nettoyer le cache lors de la déconnexion
      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('business-settings');
        localStorage.removeItem('user-settings');
        // Réinitialiser les données
        dispatch({ type: 'SET_CLIENTS', payload: [] });
        dispatch({ type: 'SET_SERVICES', payload: [] });
        dispatch({ type: 'SET_INVOICES', payload: [] });
        dispatch({ type: 'SET_SETTINGS', payload: null });
      }
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
      } catch (_e) {
        // Pas de fallback - utiliser un tableau vide
        dispatch({ type: 'SET_CLIENTS', payload: [] });
      }
      try {
        const services = await fetchServices();
        dispatch({ type: 'SET_SERVICES', payload: services });
      } catch (_e) {
        // Pas de fallback - utiliser un tableau vide
        dispatch({ type: 'SET_SERVICES', payload: [] });
      }
      try {
        const invoices = await fetchInvoices();
        dispatch({ type: 'SET_INVOICES', payload: invoices });
      } catch (_e) {
        // Initialiser avec un tableau vide si la requête échoue
        dispatch({ type: 'SET_INVOICES', payload: [] });
      }
      
      // Charger les paramètres du profil
      try {
        const { fetchSettings } = await import('./lib/api.ts');
        const settings = await fetchSettings();
        if (settings) {
          // Sauvegarder dans localStorage pour l'affichage
          localStorage.setItem('business-settings', JSON.stringify(settings));
          // Mettre à jour l'état global
          dispatch({ type: 'SET_SETTINGS', payload: settings });
        }
      } catch (_e) {
        console.log('Erreur lors du chargement des paramètres:', _e);
      }
    })();
    // Les statistiques seront calculées dynamiquement dans StatsPage
    const stats = {
      monthly_revenue: 0,
      quarterly_revenue: 0,
      annual_revenue: 0,
      total_clients: 0,
      total_hours: 0,
      pending_invoices: 0,
    };
    dispatch({ type: 'SET_STATS', payload: stats });
  }, [dispatch, isAuthenticated]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'clients':
        return <ClientsPage onPageChange={setCurrentPage} />;
      case 'services':
        return <ServicesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'stats':
        return <StatsPage onPageChange={setCurrentPage} />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'archive':
        return <ArchivePage onPageChange={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
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
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;