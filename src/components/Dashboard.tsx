import { useState, useEffect } from 'react';
import { Users, Clock, Euro, FileText, TrendingUp, BarChart3, PieChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';

// Composant pour afficher un chiffre avec segments LED
const SegmentDigit = ({ digit, showColons }: { digit: string; showColons?: boolean }) => {
  const digitSegments: { [key: string]: string[] } = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'd', 'e', 'g'],
    '3': ['a', 'b', 'c', 'd', 'g'],
    '4': ['b', 'c', 'f', 'g'],
    '5': ['a', 'c', 'd', 'f', 'g'],
    '6': ['a', 'c', 'd', 'e', 'f', 'g'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  };

  const activeSegments = digitSegments[digit] || [];

  if (digit === ':') {
    return (
      <div className="flex flex-col justify-center items-center gap-3 sm:gap-3.5 mx-1.5">
        <div className={`w-2 h-2 rounded-full ${
          showColons 
            ? 'bg-white opacity-100' 
            : 'bg-white opacity-30'
        }`}></div>
        <div className={`w-2 h-2 rounded-full ${
          showColons 
            ? 'bg-white opacity-100' 
            : 'bg-white opacity-30'
        }`}></div>
      </div>
    );
  }

  return (
    <div className="relative w-12 h-18 sm:w-14 sm:h-20">
      {/* Segment A (top horizontal) */}
      <div 
        className={`absolute top-0 left-2 right-2 h-2 transition-all duration-100 ${
          activeSegments.includes('a')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)' }}
      ></div>
      
      {/* Segment B (top-right vertical) */}
      <div 
        className={`absolute top-2 right-0 w-2 h-[calc(50%-10px)] transition-all duration-100 ${
          activeSegments.includes('b')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(0% 10%, 50% 0%, 100% 10%, 100% 90%, 50% 100%, 0% 90%)' }}
      ></div>
      
      {/* Segment C (bottom-right vertical) */}
      <div 
        className={`absolute top-[calc(50%+2px)] right-0 bottom-2 w-2 h-[calc(50%-10px)] transition-all duration-100 ${
          activeSegments.includes('c')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(0% 10%, 50% 0%, 100% 10%, 100% 90%, 50% 100%, 0% 90%)' }}
      ></div>
      
      {/* Segment D (bottom horizontal) */}
      <div 
        className={`absolute bottom-0 left-2 right-2 h-2 transition-all duration-100 ${
          activeSegments.includes('d')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)' }}
      ></div>
      
      {/* Segment E (bottom-left vertical) */}
      <div 
        className={`absolute top-[calc(50%+2px)] left-0 bottom-2 w-2 h-[calc(50%-10px)] transition-all duration-100 ${
          activeSegments.includes('e')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(0% 10%, 50% 0%, 100% 10%, 100% 90%, 50% 100%, 0% 90%)' }}
      ></div>
      
      {/* Segment F (top-left vertical) */}
      <div 
        className={`absolute top-2 left-0 w-2 h-[calc(50%-10px)] transition-all duration-100 ${
          activeSegments.includes('f')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(0% 10%, 50% 0%, 100% 10%, 100% 90%, 50% 100%, 0% 90%)' }}
      ></div>
      
      {/* Segment G (middle horizontal) */}
      <div 
        className={`absolute top-1/2 left-2 right-2 h-2 -translate-y-1/2 transition-all duration-100 ${
          activeSegments.includes('g')
            ? 'bg-white'
            : 'bg-white/5'
        }`}
        style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)' }}
      ></div>
    </div>
  );
};

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps = {}) {
  console.log('🔄 Dashboard: Composant Dashboard monté');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColons, setShowColons] = useState(true);

  useEffect(() => {
    // Mettre à jour l'heure chaque seconde
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Faire clignoter les points toutes les 500ms (0.5s allumé, 0.5s éteint = 1 seconde complète)
    const blinkTimer = setInterval(() => {
      setShowColons(prev => !prev);
    }, 500);

    return () => {
      clearInterval(timeTimer);
      clearInterval(blinkTimer);
    };
  }, []);
  const { state } = useApp();
  const { services, clients, invoices, settings } = state;
  console.log('🔄 Dashboard: Composant rendu avec settings:', settings);
  
  // État local pour forcer le re-rendu
  const [localSettings, setLocalSettings] = useState(settings);
  
  // Log des settings pour débogage et mise à jour de l'état local
  useEffect(() => {
    if (settings) {
      console.log('🔄 Dashboard: Settings mises à jour:', settings);
      console.log('🔍 Dashboard: ownerName reçu:', settings.ownerName);
      setLocalSettings(settings);
    }
  }, [settings]);
  
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
  
  // État pour le filtre d'année
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }).charAt(0), total };
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
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }).charAt(0), total };
  });
  const maxHours = Math.max(1, ...monthlyHoursData.map(m => m.total));


  // Top clients par chiffre d'affaires
  const topClients = clients.map(client => {
    const clientInvoices = invoices.filter(inv => inv.client_id === client.id);
    const revenue = clientInvoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0);
    return { client, revenue };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Message personnalisé selon l'heure
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    
    // Récupérer le prénom du gérant depuis l'état local
    const getOwnerFirstName = () => {
      if (localSettings && localSettings.ownerName) {
        const fullName = localSettings.ownerName;
        const firstName = fullName.split(' ')[0];
        return firstName;
      }
      return "Entrepreneur";
    };
    
    const ownerFirstName = getOwnerFirstName();
    
    const messages = [
      { 
        time: [5, 6, 7, 8, 9, 10, 11], 
        message: `Bonjour ${ownerFirstName}`, 
        emoji: "🌅", 
        subtitle: "Une belle journée commence !",
        gradient: "from-amber-500 via-orange-500 to-yellow-500"
      },
      { 
        time: [12, 13, 14], 
        message: `Bon après-midi ${ownerFirstName}`, 
        emoji: "☀️", 
        subtitle: "Une pause déj pour recharger, et retour à l'attaque 💪",
        gradient: "from-yellow-500 via-amber-500 to-orange-500"
      },
      { 
        time: [15, 16, 17, 18], 
        message: `Bon après-midi ${ownerFirstName}`, 
        emoji: "🌤️", 
        subtitle: "L'après-midi se déroule bien !",
        gradient: "from-blue-500 via-indigo-500 to-purple-500"
      },
      { 
        time: [19, 20, 21, 22], 
        message: `Bonsoir ${ownerFirstName}`, 
        emoji: "🌆", 
        subtitle: "Une belle soirée qui s'annonce !",
        gradient: "from-purple-500 via-indigo-500 to-blue-600"
      },
      { 
        time: [23, 0, 1, 2, 3, 4], 
        message: `Bonsoir ${ownerFirstName}`, 
        emoji: "🌙", 
        subtitle: "Travail de nuit ou nuit blanche ? 😴",
        gradient: "from-indigo-600 via-purple-600 to-blue-700"
      }
    ];
    
    const currentMessage = messages.find(msg => msg.time.includes(hour)) || messages[0];
    return currentMessage;
  };

  const greeting = getGreetingMessage();
  
  console.log('🔄 Dashboard: Rendu avec greeting:', greeting);

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
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
        

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3">
              <div className="text-3xl sm:text-4xl animate-pulse">{greeting.emoji}</div>
              <div className="flex flex-col">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white drop-shadow-lg">
                  {greeting.message}
                </h1>
                <p className="text-white/90 mt-2 text-sm sm:text-base font-medium">
                  {greeting.subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Horloge numérique style LED avec segments - Centrée */}
          <div className="hidden lg:flex flex-col items-center justify-center flex-shrink-0">
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                {currentTime.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                }).split('').map((char, index) => (
                  <SegmentDigit key={index} digit={char} showColons={showColons} />
                ))}
              </div>
            </div>
            {/* Date */}
            <div className="text-white/90 text-xs sm:text-sm font-medium tracking-wide mt-1">
              {currentTime.toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
          
          <div className="hidden md:block flex-shrink-0 flex items-center">
            <img 
              src="/hero_image.svg" 
              alt="Hero illustration" 
              className="h-16 sm:h-20 lg:h-24 w-auto opacity-90"
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">CA Mensuel</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {monthlyRevenue.toFixed(2)}€
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-full">
              <Euro className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.3%</span>
            <span className="text-gray-500 dark:text-gray-300 ml-2">ce mois</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Clients</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-300">+{clients.filter(c => {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(c.created_at) > oneMonthAgo;
            }).length} nouveau(x) ce mois</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Heures ce mois</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {currentMonthHours}h
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
              <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-300">Total: {totalHours}h</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Factures en attente</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{pendingInvoices.length}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-full">
              <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-300">
              {pendingInvoices.reduce((acc, inv) => acc + (inv.subtotal || 0), 0).toFixed(2)}€ en attente
            </span>
          </div>
        </div>
      </div>

      {/* Graphiques et analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Graphique CA mensuel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Évolution du CA</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={goToPreviousYear}
                  disabled={selectedYear <= Math.min(...availableYears)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg min-w-[50px] sm:min-w-[60px] text-center">
                  {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={goToNextYear}
                  disabled={selectedYear >= Math.max(...availableYears)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année suivante"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-1">Janvier à Décembre {selectedYear}</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <div className="flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2 h-32 sm:h-40 px-0.5 sm:px-1 md:px-2 min-w-[320px] sm:min-w-0">
                {monthlyTotals.map((m, idx) => (
                  <div key={idx} className="flex flex-col items-center group flex-1 min-w-[25px] sm:min-w-0">
                    <div className="relative w-full flex flex-col items-center">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 hidden sm:block">
                        {m.total > 0 ? `${m.total.toFixed(0)}€` : ''}
                      </div>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 cursor-pointer group-hover:shadow-lg"
                        style={{ height: `${Math.max(6, (m.total / maxBar) * 100)}px` }}
                        title={`${m.label}: ${m.total.toFixed(2)}€`}
                      />
                    </div>
                    <div className="mt-1 sm:mt-2 md:mt-3 text-center">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        <span className="sm:hidden">{m.label}</span>
                        <span className="hidden sm:inline">{months[idx].toLocaleDateString('fr-FR', { month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs text-gray-500 dark:text-gray-300">
                <span>Total: {monthlyTotals.reduce((acc, m) => acc + m.total, 0).toFixed(0)}€</span>
                <span>Moyenne: {(monthlyTotals.reduce((acc, m) => acc + m.total, 0) / 12).toFixed(0)}€/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique heures mensuelles */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Heures travaillées</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={goToPreviousYear}
                  disabled={selectedYear <= Math.min(...availableYears)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg min-w-[50px] sm:min-w-[60px] text-center">
                  {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={goToNextYear}
                  disabled={selectedYear >= Math.max(...availableYears)}
                  className="p-1.5 sm:p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all"
                  title="Année suivante"
                >
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-1">Janvier à Décembre {selectedYear}</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto">
              <div className="flex items-end justify-between gap-0.5 sm:gap-1 md:gap-2 h-32 sm:h-40 px-0.5 sm:px-1 md:px-2 min-w-[320px] sm:min-w-0">
                {monthlyHoursData.map((m, idx) => (
                  <div key={idx} className="flex flex-col items-center group flex-1 min-w-[25px] sm:min-w-0">
                    <div className="relative w-full flex flex-col items-center">
                      <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1 hidden sm:block">
                        {m.total > 0 ? `${m.total}h` : ''}
                      </div>
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 cursor-pointer group-hover:shadow-lg"
                        style={{ height: `${Math.max(6, (m.total / maxHours) * 100)}px` }}
                        title={`${m.label}: ${m.total}h`}
                      />
                    </div>
                    <div className="mt-1 sm:mt-2 md:mt-3 text-center">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        <span className="sm:hidden">{m.label}</span>
                        <span className="hidden sm:inline">{months[idx].toLocaleDateString('fr-FR', { month: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs text-gray-500 dark:text-gray-300">
                <span>Total: {monthlyHoursData.reduce((acc, m) => acc + m.total, 0)}h</span>
                <span>Moyenne: {(monthlyHoursData.reduce((acc, m) => acc + m.total, 0) / 12).toFixed(1)}h/mois</span>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique en secteurs des statuts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Statuts des factures</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-1">Répartition actuelle</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {invoiceStatusData.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${item.color}`}></div>
                    <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-300 ml-1 sm:ml-2">
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
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Top clients</h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-1">Par chiffre d'affaires</p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {topClients.map((item, idx) => (
                <div key={item.client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">{item.client.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">{item.revenue.toFixed(2)}€</p>
                    </div>
                  </div>
                  <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1.5 sm:h-2 rounded-full"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Prestations récentes</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-600 flex-1 flex flex-col">
            {services.length === 0 ? (
              <div className="p-6 sm:p-8 text-center flex-1 flex flex-col justify-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune prestation</h4>
                <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm">
                  Vous n'avez pas encore enregistré de prestations. 
                  <br />
                  Enregistrez votre première prestation pour commencer.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  {recentServices.map((service, index) => (
                    <div key={service.id} className="relative">
                      <div className="p-4 sm:p-6 flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="p-1.5 sm:p-2 bg-blue-100 rounded-full">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-none">
                              {clients.find(c => c.id === service.client_id)?.name || 'Client inconnu'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-300">
                              {new Date(service.date).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {service.hours}h
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {(service.hours * service.hourly_rate).toFixed(2)}€
                          </p>
                        </div>
                      </div>
                      {/* Trait de séparation décoratif */}
                      {index < recentServices.length - 1 && (
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent opacity-50"></div>
                      )}
                    </div>
                  ))}
                </div>
                {services.length > 5 && (
                  <div className="p-3 sm:p-4 text-center border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('services')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm font-medium"
                    >
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Voir toutes les prestations
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Factures récentes</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-600 flex-1 flex flex-col">
            {invoices.length === 0 ? (
              <div className="p-6 sm:p-8 text-center flex-1 flex flex-col justify-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">Aucune facture</h4>
                <p className="text-gray-500 dark:text-gray-300 text-xs sm:text-sm">
                  Vous n'avez pas encore créé de factures. 
                  <br />
                  Créez votre première facture pour commencer.
                </p>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  {invoices.slice(0, 5).map((invoice, index) => (
                    <div key={invoice.id} className="relative">
                      <div className="p-4 sm:p-6 flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="p-1.5 sm:p-2 bg-green-100 rounded-full">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                              #{invoice.invoice_number}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">
                              {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {(invoice.subtotal || 0).toFixed(2)}€
                          </p>
                          <span className={`inline-flex px-1.5 sm:px-2 py-1 text-xs font-medium rounded-full ${
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
                      {/* Trait de séparation décoratif */}
                      {index < invoices.slice(0, 5).length - 1 && (
                        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-green-300 to-transparent opacity-50"></div>
                      )}
                    </div>
                  ))}
                </div>
                {invoices.length > 5 && (
                  <div className="p-3 sm:p-4 text-center border-t border-gray-200 dark:border-gray-600">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('invoices')}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm font-medium"
                    >
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Voir toutes les factures
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}