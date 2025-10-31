import { useState, useEffect } from 'react';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import ClientsPage from './components/ClientsPage.tsx';
import ServicesPage from './components/ServicesPage.tsx';
import InvoicesPage from './components/InvoicesPage.tsx';
import StatsPage from './components/StatsPage.tsx';
import ProfilePage from './components/ProfilePage.tsx';
import ArchivePage from './components/ArchivePage.tsx';
import URSSAFPage from './components/URSSAFPage.tsx';
import MessagesPage from './components/MessagesPage.tsx';
import { AppProvider, useApp } from './contexts/AppContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { fetchClients, fetchServices, fetchInvoices } from './lib/api.ts';
import AuthPage from './components/AuthPage.tsx';
import ResetPasswordPage from './components/ResetPasswordPage.tsx';
import { supabase } from './lib/supabase.ts';


function AppContent() {
  // Forcer l'utilisation du domaine court
  useEffect(() => {
    const currentHost = globalThis.location.hostname;
    if (currentHost.includes('projectautoentreprise') && currentHost.includes('kebcis-projects')) {
      // Remplacer l'URL complète par le domaine court
      const currentPath = globalThis.location.pathname + globalThis.location.search + globalThis.location.hash;
      const newUrl = `https://proflow-biz.vercel.app${currentPath}`;
      globalThis.location.href = newUrl;
    }
  }, []);

  // Récupérer la page sauvegardée depuis localStorage ou utiliser 'dashboard' par défaut
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const savedPage = localStorage.getItem('current-page');
      console.log('📖 Page récupérée depuis localStorage:', savedPage);
      return savedPage || 'dashboard';
    } catch {
      console.log('❌ Erreur lors de la récupération de la page, utilisation du dashboard');
      return 'dashboard';
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);
  const { dispatch } = useApp();

  // Fonction pour changer de page et sauvegarder dans localStorage
  const handlePageChange = (page: string) => {
    console.log('🔄 Changement de page vers:', page);
    setCurrentPage(page);
    try {
      localStorage.setItem('current-page', page);
      console.log('💾 Page sauvegardée dans localStorage:', page);
    } catch (error) {
      console.warn('Impossible de sauvegarder la page courante:', error);
    }
  };

  // Fonction pour sortir du mode de réinitialisation
  const handleExitResetMode = () => {
    setIsResettingPassword(false);
  };

  // Auth session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setIsAuthenticated(!!data.session);
      
      // Vérifier si l'utilisateur est en train de réinitialiser son mot de passe
      if (data.session) {
        const { data: user } = await supabase.auth.getUser();
        if (user.user && user.user.email_confirmed_at && user.user.last_sign_in_at) {
          // Vérifier si l'URL contient un token de réinitialisation de mot de passe
          const urlParams = new URLSearchParams(window.location.search);
          const accessToken = urlParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token');
          
          // Si l'URL contient des tokens de réinitialisation, c'est une réinitialisation de mot de passe
          if (accessToken && refreshToken) {
            setIsResettingPassword(true);
          }
        }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 Auth state change:', _event, 'Session:', !!session);
      setIsAuthenticated(!!session);
      
      // Ne rediriger vers le dashboard QUE si c'est une vraie connexion ET qu'il n'y a pas de page sauvegardée
      if (session && _event === 'SIGNED_IN') {
        try {
          const savedPage = localStorage.getItem('current-page');
          if (!savedPage) {
            console.log('🔑 Vraie connexion détectée, redirection vers dashboard');
            handlePageChange('dashboard');
          } else {
            console.log('🔑 Connexion détectée mais page déjà sauvegardée, pas de redirection');
          }
        } catch (_error) {
          console.log('🔑 Connexion détectée, redirection vers dashboard (erreur localStorage)');
          handlePageChange('dashboard');
        }
      }
      
      // Nettoyer le cache lors de la déconnexion
      if (_event === 'SIGNED_OUT') {
        console.log('🚪 Déconnexion détectée, nettoyage du cache');
        localStorage.removeItem('business-settings');
        localStorage.removeItem('user-settings');
        localStorage.removeItem('current-page');
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

  // Détecter les changements de visibilité de la page (changement d'onglet)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page redevenue visible, page courante:', currentPage);
        // Vérifier si la page sauvegardée est différente de la page courante
        try {
          const savedPage = localStorage.getItem('current-page');
          console.log('🔍 Page sauvegardée dans localStorage:', savedPage);
          if (savedPage && savedPage !== currentPage) {
            console.log('🔄 Restauration de la page sauvegardée:', savedPage);
            setCurrentPage(savedPage);
          } else {
            console.log('✅ Page déjà correcte, pas de changement nécessaire');
          }
        } catch (error) {
          console.warn('Erreur lors de la vérification de la page sauvegardée:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handlePageChange} />;
      case 'clients':
        return <ClientsPage onPageChange={handlePageChange} />;
      case 'services':
        return <ServicesPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'stats':
        return <StatsPage onPageChange={handlePageChange} />;
      case 'profile':
        return <ProfilePage />;
      case 'archive':
        return <ArchivePage onPageChange={handlePageChange} />;
      case 'urssaf':
        return <URSSAFPage />;
      case 'messages':
        return <MessagesPage />;
      default:
        return <Dashboard onNavigate={handlePageChange} />;
    }
  };

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Si l'utilisateur est en train de réinitialiser son mot de passe
  if (isResettingPassword) {
    return <ResetPasswordPage onExitResetMode={handleExitResetMode} />;
  }

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
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