import { useState } from 'react';
import { Users, Clock, Euro, FileText, TrendingUp, BarChart3, PieChart, Plus, ChevronLeft, ChevronRight, Moon, Sun, Power } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import AlertModal from './AlertModal';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps = {}) {
  const { state } = useApp();
  const { services, clients, invoices } = state;
  
  // Calculer les statistiques en temps réel à partir des données du contexte
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // CA mensuel basé sur les services
  const monthlyRevenue = services
    .filter(service => {
      const serviceDate = new Date(service.date);
      return serviceDate.getMonth() === currentMonth && 
             serviceDate.getFullYear() === currentYear;
    })
    .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);
  
  // Heures du mois
  const currentMonthHours = services
    .filter(service => {
      const serviceDate = new Date(service.date);
      return serviceDate.getMonth() === currentMonth && 
             serviceDate.getFullYear() === currentYear;
    })
    .reduce((sum, service) => sum + service.hours, 0);
  
  // Total des heures
  const totalHours = services.reduce((sum, service) => sum + service.hours, 0);
  
  // Factures en attente
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
  const { isDark, toggleTheme } = useTheme();
  
  // État pour le filtre d'année
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // État pour l'alerte de déconnexion
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // Fonctions de navigation entre les années
  const goToPreviousYear = () => {
    const minYear = Math.min(...availableYears);
    if (selectedYear > minYear) {
      setSelectedYear(selectedYear - 1);
    }
  };

  const goToNextYear = () => {
    const maxYear = Math.max(...availableYears);
    if (selectedYear < maxYear) {
      setSelectedYear(selectedYear + 1);
    }
  };

  // Fonction de déconnexion avec confirmation
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  const recentServices = services.slice(0, 5);
  
  // Années disponibles (basées sur les données existantes)
  const availableYears = Array.from(new Set([
    ...invoices.map(inv => new Date(inv.date).getFullYear()),
    ...services.map(s => new Date(s.date).getFullYear()),
    new Date().getFullYear() // Année actuelle
  ])).sort((a, b) => b - a);
  
  // Calculs pour les graphiques - 12 mois de janvier à décembre
  const months = Array.from({ length: 12 }).map((_, i) => new Date(selectedYear, i, 1));
  const monthlyTotals = months.map((m) => {
    // Utiliser les prestations au lieu des factures pour le CA
    const total = services
      .filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      })
      .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0);
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }), total };
  });
  const maxBar = Math.max(1, ...monthlyTotals.map(m => m.total));


  // Données pour le graphique en secteurs des statuts
  const invoiceStatusData = [
    { label: 'Payées', value: invoices.filter(i => i.status === 'paid').length, color: 'bg-green-500' },
    { label: 'Envoyées', value: invoices.filter(i => i.status === 'sent').length, color: 'bg-yellow-500' },
    { label: 'Brouillons', value: invoices.filter(i => i.status === 'draft').length, color: 'bg-gray-500' }
  ];
  const totalInvoices = Math.max(1, invoices.length);

  // Données pour le graphique des heures par mois
  const monthlyHoursData = months.map((m) => {
    const total = services
      .filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      })
      .reduce((acc, s) => acc + s.hours, 0);
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }), total };
  });
  const maxHours = Math.max(1, ...monthlyHoursData.map(m => m.total));


  // Top clients par chiffre d'affaires
  const topClients = clients.map(client => {
    const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
    const revenue = clientInvoices.reduce((acc, inv) => acc + inv.subtotal, 0);
    return { client, revenue };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Message personnalisé selon l'heure
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    
    // Récupérer le prénom du gérant depuis localStorage
    const getOwnerFirstName = () => {
      try {
        const settings = localStorage.getItem('business-settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          const fullName = parsed.ownerName || "Entrepreneur";
          // Extraire seulement le prénom (premier mot)
          const firstName = fullName.split(' ')[0];
          return firstName;
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du prénom du gérant:', error);
      }
      return "Entrepreneur";
    };
    
    const ownerFirstName = getOwnerFirstName();
    
    const messages = [
      { time: [5, 6, 7, 8, 9, 10, 11], message: `Bonjour ${ownerFirstName}`, emoji: "🌅", subtitle: "Une belle journée commence !" },
      { time: [12, 13, 14], message: `Bon après-midi ${ownerFirstName}`, emoji: "☀️", subtitle: "Une pause déj pour recharger, et retour à l'attaque 💪" },
      { time: [15, 16, 17, 18], message: `Bon après-midi ${ownerFirstName}`, emoji: "🌤️", subtitle: "L'après-midi se déroule bien !" },
      { time: [19, 20, 21, 22], message: `Bonsoir ${ownerFirstName}`, emoji: "🌆", subtitle: "Une belle soirée qui s'annonce !" },
      { time: [23, 0, 1, 2, 3, 4], message: `Bonsoir ${ownerFirstName}`, emoji: "🌙", subtitle: "Travail de nuit ou nuit blanche ? 😴" }
    ];
    
    const currentMessage = messages.find(msg => msg.time.includes(hour)) || messages[0];
    return currentMessage;
  };

  const greeting = getGreetingMessage();

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
        {/* Traits qui traversent tout le header */}
        <div className="absolute inset-0 opacity-20">
          {/* Traits horizontaux qui traversent */}
          <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
          <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
          <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
          
          {/* Traits verticaux qui traversent */}
          <div className="absolute top-0 bottom-0 left-12 w-0.5 h-full bg-white/20 transform rotate-12"></div>
          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 h-full bg-white/25 transform -rotate-6"></div>
          <div className="absolute top-0 bottom-0 right-16 w-0.5 h-full bg-white/30 transform rotate-18"></div>
          <div className="absolute top-0 bottom-0 right-8 w-0.5 h-full bg-white/20 transform -rotate-24"></div>
          
          {/* Traits diagonaux qui traversent */}
          <div className="absolute top-0 bottom-0 left-0 right-0 w-full h-0.5 bg-white/15 transform rotate-45 origin-center"></div>
          <div className="absolute top-0 bottom-0 left-0 right-0 w-full h-0.5 bg-white/20 transform -rotate-30 origin-center"></div>
          <div className="absolute top-0 bottom-0 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-60 origin-center"></div>
          <div className="absolute top-0 bottom-0 left-0 right-0 w-full h-0.5 bg-white/15 transform -rotate-45 origin-center"></div>
        </div>
        
        {/* Boutons d'action - Coin haut droit */}
        <div className="absolute top-6 right-6 z-20 flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-3 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-white" />}
          </button>
          
          <button
            onClick={() => setShowLogoutAlert(true)}
            className="p-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Se déconnecter"
          >
            <Power className="w-5 h-5 text-red-200" />
          </button>
        </div>

        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <span className="text-4xl">{greeting.emoji}</span>
            <h1 className="text-3xl font-bold">{greeting.message} !</h1>
          </div>
          <p className="text-white/90 text-lg font-medium mb-2">{greeting.subtitle}</p>
          <p className="text-white/80 text-sm">Tableau de bord - Aperçu de votre activité</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Mensuel</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {monthlyRevenue.toFixed(2)}€
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.3%</span>
            <span className="text-gray-500 dark:text-gray-300 ml-2">ce mois</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-300">+{clients.filter(c => {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(c.created_at) > oneMonthAgo;
            }).length} nouveau(x) ce mois</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Heures ce mois</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentMonthHours}h
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-300">Total: {totalHours}h</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Factures en attente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingInvoices.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-300">
              {pendingInvoices.reduce((acc, inv) => acc + inv.subtotal, 0).toFixed(2)}€ en attente
            </span>
          </div>
        </div>
      </div>

      {/* Graphiques et analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique CA mensuel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Évolution du CA</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousYear}
                  disabled={selectedYear <= Math.min(...availableYears)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg min-w-[60px] text-center">
                  {selectedYear}
                </span>
                <button
                  onClick={goToNextYear}
                  disabled={selectedYear >= Math.max(...availableYears)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année suivante"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Janvier à Décembre {selectedYear}</p>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between gap-2 h-40 px-2">
              {monthlyTotals.map((m, idx) => (
                <div key={idx} className="flex flex-col items-center group flex-1">
                  <div className="relative w-full flex flex-col items-center">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                      {m.total > 0 ? `${m.total.toFixed(0)}€` : ''}
                    </div>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 cursor-pointer group-hover:shadow-lg"
                      style={{ height: `${Math.max(8, (m.total / maxBar) * 120)}px` }}
                      title={`${m.label}: ${m.total.toFixed(2)}€`}
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{m.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300">
                <span>Total: {monthlyTotals.reduce((acc, m) => acc + m.total, 0).toFixed(0)}€</span>
                <span>Moyenne: {(monthlyTotals.reduce((acc, m) => acc + m.total, 0) / 12).toFixed(0)}€/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique heures mensuelles */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Heures travaillées</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPreviousYear}
                  disabled={selectedYear <= Math.min(...availableYears)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg min-w-[60px] text-center">
                  {selectedYear}
                </span>
                <button
                  onClick={goToNextYear}
                  disabled={selectedYear >= Math.max(...availableYears)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année suivante"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Janvier à Décembre {selectedYear}</p>
          </div>
          <div className="p-6">
            <div className="flex items-end justify-between gap-2 h-40 px-2">
              {monthlyHoursData.map((m, idx) => (
                <div key={idx} className="flex flex-col items-center group flex-1">
                  <div className="relative w-full flex flex-col items-center">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                      {m.total > 0 ? `${m.total}h` : ''}
                    </div>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer group-hover:shadow-lg"
                      style={{ height: `${Math.max(8, (m.total / maxHours) * 120)}px` }}
                      title={`${m.label}: ${m.total}h`}
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{m.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300">
                <span>Total: {monthlyHoursData.reduce((acc, m) => acc + m.total, 0)}h</span>
                <span>Moyenne: {(monthlyHoursData.reduce((acc, m) => acc + m.total, 0) / 12).toFixed(1)}h/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique en secteurs des statuts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statuts des factures</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Répartition actuelle</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {invoiceStatusData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-300 ml-2">
                      ({Math.round((item.value / totalInvoices) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top clients */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top clients</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Par chiffre d'affaires</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topClients.map((item, idx) => (
                <div key={item.client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.client.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{item.revenue.toFixed(2)}€</p>
                    </div>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${(item.revenue / Math.max(1, topClients[0]?.revenue || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Prestations récentes</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {recentServices.map((service) => (
              <div key={service.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {clients.find(c => c.id === service.client_id)?.name || 'Client inconnu'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {new Date(service.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {service.hours}h
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    {(service.hours * service.hourly_rate).toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Factures récentes</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune facture</h4>
                <p className="text-gray-500 dark:text-gray-300 text-sm mb-4">
                  Vous n'avez pas encore créé de factures. 
                  <br />
                  Créez votre première facture pour commencer.
                </p>
                <button
                  onClick={() => onNavigate?.('invoices')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une facture
                </button>
              </div>
            ) : (
              <>
                {invoices.slice(0, 3).map((invoice) => (
                  <div key={invoice.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          #{invoice.invoice_number}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-300">
                          {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {invoice.subtotal.toFixed(2)}€
                      </p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : invoice.status === 'sent'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {invoice.status === 'paid' ? 'Payée' : 
                         invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                      </span>
                    </div>
                  </div>
                ))}
                {invoices.length > 3 && (
                  <div className="p-4 text-center border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      + {invoices.length - 3} autre{invoices.length - 3 > 1 ? 's' : ''} facture{invoices.length - 3 > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerte de déconnexion */}
      <AlertModal
        isOpen={showLogoutAlert}
        onClose={() => setShowLogoutAlert(false)}
        onConfirm={handleLogout}
        title="Se déconnecter"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Déconnexion"
        cancelText="Annuler"
        type="warning"
      />
    </div>
  );
}