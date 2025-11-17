import { useState, useEffect } from 'react';
import { Calculator, Calendar, AlertCircle, Info, Receipt, FileText, TrendingDown, DollarSign, CalendarDays, Shield, BookOpen, Scale, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';

interface URSSAFStatus {
  id: string;
  name: string;
  description: string;
  activities: {
    type: string;
    rate: number;
    description: string;
    minCA?: number;
    maxCA?: number;
  }[];
}

interface DeclarationDate {
  period: string;
  declarationDate: string;
  paymentDate: string;
  description: string;
}

// Fonction pour charger les paramètres URSSAF depuis le profil
const loadURSSAFSettings = () => {
  try {
    const raw = localStorage.getItem('business-settings');
    if (raw) {
      const settings = JSON.parse(raw);
      return {
        activity: settings.urssafActivity || 'services'
      };
    }
  } catch {
    // Ignore errors
  }
  return {
    activity: 'services'
  };
};

export default function URSSAFPage() {
  const { state } = useApp();
  const { services } = state;

  // Détecter le mode sombre
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    return () => observer.disconnect();
  }, []);

  // Charger les paramètres une première fois
  const initialSettings = loadURSSAFSettings();

  // Calculer le trimestre actuel
  const getCurrentQuarter = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    if (month >= 0 && month <= 2) return 'T1'; // Jan-Mar
    if (month >= 3 && month <= 5) return 'T2'; // Apr-Jun
    if (month >= 6 && month <= 8) return 'T3'; // Jul-Sep
    return 'T4'; // Oct-Dec
  };

  // État pour le calculateur - toujours micro-entreprise, seul le type d'activité change
  const selectedStatus = 'micro-entreprise';
  const [selectedActivity, setSelectedActivity] = useState<string>(initialSettings.activity);
  // État global pour la période - contrôle toute la page
  const [periodType, setPeriodType] = useState<'mensuelle' | 'trimestrielle'>('trimestrielle');
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedQuarter, setSelectedQuarter] = useState<string>(getCurrentQuarter());
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());
  const [showRules, setShowRules] = useState<boolean>(false);

  // Calculer le CA mensuel à partir des services
  useEffect(() => {
    if (services && services.length > 0 && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthRevenue = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          return serviceDate.getMonth() === month - 1 && 
                 serviceDate.getFullYear() === year;
        })
        .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);
      setMonthlyRevenue(monthRevenue);
    }
  }, [services, selectedMonth]);

  // État pour stocker le CA mensuel détaillé du trimestre
  const [quarterlyMonthlyBreakdown, setQuarterlyMonthlyBreakdown] = useState<{
    month1: { name: string; revenue: number };
    month2: { name: string; revenue: number };
    month3: { name: string; revenue: number };
    total: number;
  }>({
    month1: { name: '', revenue: 0 },
    month2: { name: '', revenue: 0 },
    month3: { name: '', revenue: 0 },
    total: 0
  });

  // Calculer le CA trimestriel automatiquement et progressivement
  useEffect(() => {
    if (services && services.length > 0 && selectedQuarter && periodType === 'trimestrielle') {
      const quarterNumber = parseInt(selectedQuarter.substring(1)); // T1 => 1, T2 => 2, etc.
      const startMonth = (quarterNumber - 1) * 3; // T1 => 0 (janvier), T2 => 3 (avril), etc.
      
      // Noms des mois
      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      
      // Calculer le CA pour chaque mois du trimestre
      const month1Index = startMonth;
      const month2Index = startMonth + 1;
      const month3Index = startMonth + 2;

      const month1Revenue = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          return serviceDate.getMonth() === month1Index && serviceDate.getFullYear() === selectedQuarterYear;
        })
        .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);

      const month2Revenue = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          return serviceDate.getMonth() === month2Index && serviceDate.getFullYear() === selectedQuarterYear;
        })
        .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);

      const month3Revenue = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          return serviceDate.getMonth() === month3Index && serviceDate.getFullYear() === selectedQuarterYear;
        })
        .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);

      const totalQuarterRevenue = month1Revenue + month2Revenue + month3Revenue;

      setQuarterlyMonthlyBreakdown({
        month1: { name: monthNames[month1Index], revenue: month1Revenue },
        month2: { name: monthNames[month2Index], revenue: month2Revenue },
        month3: { name: monthNames[month3Index], revenue: month3Revenue },
        total: totalQuarterRevenue
      });

      setQuarterlyRevenue(totalQuarterRevenue);
    } else if (periodType === 'trimestrielle' && (!services || services.length === 0)) {
      // Réinitialiser si pas de services
      setQuarterlyMonthlyBreakdown({
        month1: { name: '', revenue: 0 },
        month2: { name: '', revenue: 0 },
        month3: { name: '', revenue: 0 },
        total: 0
      });
      setQuarterlyRevenue(0);
    }
  }, [services, selectedQuarter, selectedQuarterYear, periodType]);

  // Synchroniser avec les paramètres du profil au montage
  useEffect(() => {
    const newSettings = loadURSSAFSettings();
    if (newSettings.activity !== selectedActivity) {
      setSelectedActivity(newSettings.activity);
    }
  }, []); // Ne s'exécute qu'au montage du composant

  // Données URSSAF pour micro-entreprise 2024-2025
  const urssafStatuses: URSSAFStatus[] = [
    {
      id: 'micro-entreprise',
      name: 'Micro-entreprise',
      description: 'Régime fiscal de la micro-entreprise avec abattements fiscaux',
      activities: [
        {
          type: 'services',
          rate: 0.212, // 21,2% de cotisations URSSAF (2024-2025) + abattement 50% pour impôt
          description: 'Prestations de services (BIC)',
          maxCA: 77700
        },
        {
          type: 'ventes',
          rate: 0.123, // 12,3% de cotisations URSSAF (2024-2025) + abattement 71% pour impôt
          description: 'Vente de marchandises (BIC)',
          maxCA: 188700
        },
        {
          type: 'liberale',
          rate: 0.246, // 24,6% de cotisations URSSAF (2024-2025) + abattement 34% pour impôt
          description: 'Professions libérales (BNC)',
          maxCA: 77700
        }
      ]
    }
  ];

  // Dates d'échéance des déclarations URSSAF 2025 (si le 8 tombe un week-end, reporté au lundi suivant)
  const declarationDates: DeclarationDate[] = [
    {
      period: 'Janvier 2025',
      declarationDate: '10/02/2025', // 8 fév = samedi, reporté au lundi 10
      paymentDate: '10/02/2025',
      description: 'Déclaration et paiement des cotisations de janvier'
    },
    {
      period: 'Février 2025',
      declarationDate: '10/03/2025', // 8 mars = samedi, reporté au lundi 10
      paymentDate: '10/03/2025',
      description: 'Déclaration et paiement des cotisations de février'
    },
    {
      period: 'Mars 2025',
      declarationDate: '08/04/2025', // 8 avril = mardi
      paymentDate: '08/04/2025',
      description: 'Déclaration et paiement des cotisations de mars'
    },
    {
      period: 'Avril 2025',
      declarationDate: '08/05/2025', // 8 mai = jeudi
      paymentDate: '08/05/2025',
      description: 'Déclaration et paiement des cotisations d\'avril'
    },
    {
      period: 'Mai 2025',
      declarationDate: '09/06/2025', // 8 juin = dimanche, reporté au lundi 9
      paymentDate: '09/06/2025',
      description: 'Déclaration et paiement des cotisations de mai'
    },
    {
      period: 'Juin 2025',
      declarationDate: '08/07/2025', // 8 juillet = mardi
      paymentDate: '08/07/2025',
      description: 'Déclaration et paiement des cotisations de juin'
    },
    {
      period: 'Juillet 2025',
      declarationDate: '11/08/2025', // 8 août = vendredi, mais 9 et 10 sont week-end, donc 11 lundi
      paymentDate: '11/08/2025',
      description: 'Déclaration et paiement des cotisations de juillet'
    },
    {
      period: 'Août 2025',
      declarationDate: '08/09/2025', // 8 septembre = lundi
      paymentDate: '08/09/2025',
      description: 'Déclaration et paiement des cotisations d\'août'
    },
    {
      period: 'Septembre 2025',
      declarationDate: '08/10/2025', // 8 octobre = mercredi
      paymentDate: '08/10/2025',
      description: 'Déclaration et paiement des cotisations de septembre'
    },
    {
      period: 'Octobre 2025',
      declarationDate: '10/11/2025', // 8 nov = samedi, reporté au lundi 10
      paymentDate: '10/11/2025',
      description: 'Déclaration et paiement des cotisations d\'octobre'
    },
    {
      period: 'Novembre 2025',
      declarationDate: '08/12/2025', // 8 décembre = lundi
      paymentDate: '08/12/2025',
      description: 'Déclaration et paiement des cotisations de novembre'
    },
    {
      period: 'Décembre 2025',
      declarationDate: '08/01/2026', // 8 janvier = jeudi
      paymentDate: '08/01/2026',
      description: 'Déclaration et paiement des cotisations de décembre'
    }
  ];

  // Calculer les cotisations
  const calculateContributions = () => {
    const status = urssafStatuses.find(s => s.id === selectedStatus);
    if (!status) return { contributions: 0, netRevenue: 0, rate: 0, revenue: 0 };

    const activity = status.activities.find(a => a.type === selectedActivity);
    if (!activity) return { contributions: 0, netRevenue: 0, rate: 0, revenue: 0 };

    const rate = activity.rate;
    const revenue = periodType === 'mensuelle' ? monthlyRevenue : quarterlyRevenue;
    const contributions = revenue * rate;
    const netRevenue = revenue - contributions;

    return { contributions, netRevenue, rate: rate * 100, revenue };
  };

  const { contributions, netRevenue, rate, revenue } = calculateContributions();

  // Obtenir les trimestres disponibles
  const getAvailableQuarters = (year: number) => {
    const quarters = ['T1', 'T2', 'T3', 'T4'];
    return quarters.map(q => ({
      value: q,
      label: `${q} ${year}`,
      months: q === 'T1' ? ['Janvier', 'Février', 'Mars'] :
              q === 'T2' ? ['Avril', 'Mai', 'Juin'] :
              q === 'T3' ? ['Juillet', 'Août', 'Septembre'] :
              ['Octobre', 'Novembre', 'Décembre']
    }));
  };

  const availableQuarters = getAvailableQuarters(selectedQuarterYear);

  // Dates d'échéance trimestrielles 2025
  const getQuarterlyDeadlines = () => {
    return [
      {
        quarter: 'T1',
        period: '1er Trimestre 2025 (Janvier-Mars)',
        declarationDate: '30/04/2025', // 30 avril = mercredi
        paymentDate: '30/04/2025',
        description: 'Déclaration et paiement des cotisations du 1er trimestre 2025'
      },
      {
        quarter: 'T2',
        period: '2ème Trimestre 2025 (Avril-Juin)',
        declarationDate: '31/07/2025', // 31 juillet = jeudi
        paymentDate: '31/07/2025',
        description: 'Déclaration et paiement des cotisations du 2ème trimestre 2025'
      },
      {
        quarter: 'T3',
        period: '3ème Trimestre 2025 (Juillet-Septembre)',
        declarationDate: '31/10/2025', // 31 octobre = vendredi
        paymentDate: '31/10/2025',
        description: 'Déclaration et paiement des cotisations du 3ème trimestre 2025'
      },
      {
        quarter: 'T4',
        period: '4ème Trimestre 2025 (Octobre-Décembre)',
        declarationDate: '31/01/2026', // 31 janvier 2026 = samedi, mais généralement pas reporté
        paymentDate: '31/01/2026',
        description: 'Déclaration et paiement des cotisations du 4ème trimestre 2025'
      }
    ];
  };

  const quarterlyDeadlines = getQuarterlyDeadlines();

  // Trouver les prochaines échéances
  const getUpcomingDeadlines = () => {
    const today = new Date();
    return declarationDates.filter(date => {
      const [day, month, year] = date.declarationDate.split('/').map(Number);
      const deadlineDate = new Date(year, month - 1, day);
      return deadlineDate >= today;
    }).slice(0, 3);
  };

  const upcomingDeadlines = getUpcomingDeadlines();

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 dark:from-red-700 dark:via-red-700 dark:to-red-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Traits décoratifs */}
        <div className="absolute inset-0 opacity-20">
          {/* Traits horizontaux qui traversent */}
          <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-12"></div>
          <div className="absolute bottom-6 left-0 right-0 w-full h-0.5 bg-white/15 transform -rotate-6"></div>
          {/* Traits verticaux */}
          <div className="absolute top-0 bottom-0 left-12 w-0.5 h-full bg-white/20 transform rotate-6"></div>
          <div className="absolute top-0 bottom-0 right-16 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
          <div className="absolute top-0 bottom-0 right-8 w-0.5 h-full bg-white/25 transform rotate-6"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="p-2 sm:p-4 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0">
              <Scale className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">URSSAF & Cotisations</h1>
              <p className="text-red-100 mt-1 text-xs sm:text-sm md:text-base line-clamp-2">Gestion des cotisations sociales et déclarations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation de période - juste sous le header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          {/* Onglets pour le type de période avec effet de glissement */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 inline-grid grid-cols-2 relative gap-0.5 w-full md:w-auto">
            {/* Indicateur de glissement */}
            <div 
              className={`absolute top-1 bottom-1 bg-red-600 rounded-full shadow-md transition-all duration-300 ease-in-out ${
                periodType === 'trimestrielle' 
                  ? 'left-1 right-[calc(50%+0.25rem)]' 
                  : 'left-[calc(50%+0.25rem)] right-1'
              }`}
            />
            <button
              type="button"
              onClick={() => setPeriodType('trimestrielle')}
              className={`relative z-10 px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                periodType === 'trimestrielle'
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Trimestriel
            </button>
            <button
              type="button"
              onClick={() => setPeriodType('mensuelle')}
              className={`relative z-10 px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                periodType === 'mensuelle'
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mensuel
            </button>
          </div>

          {/* Navigation de période */}
          {periodType === 'mensuelle' ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-2 sm:px-3 h-[42px] sm:h-[44px] w-full md:w-auto justify-center md:justify-start">
              <button
                type="button"
                onClick={() => {
                  const currentDate = new Date(selectedMonth + '-01');
                  currentDate.setMonth(currentDate.getMonth() - 1);
                  setSelectedMonth(currentDate.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="px-3 sm:px-4 h-full flex items-center text-gray-900 dark:text-white font-semibold text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors min-w-0 flex-1 sm:flex-none"
              >
                <span className="truncate">{new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentDate = new Date(selectedMonth + '-01');
                  currentDate.setMonth(currentDate.getMonth() + 1);
                  setSelectedMonth(currentDate.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-2 sm:px-3 h-[42px] sm:h-[44px] w-full md:w-auto flex-wrap justify-center md:justify-start">
              {/* Navigation année */}
              <button
                type="button"
                onClick={() => setSelectedQuarterYear(selectedQuarterYear - 1)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              
              {/* Sélection trimestre avec effet de glissement */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 inline-flex relative gap-0.5 flex-1 sm:flex-none min-w-0 h-full flex items-center">
                {/* Indicateur de glissement */}
                <div 
                  className="absolute top-1 bottom-1 bg-red-600 rounded-full shadow-md transition-all duration-300 ease-in-out"
                  style={{
                    width: 'calc(25% - 0.125rem)',
                    left: selectedQuarter === 'T1' 
                      ? '0.25rem'
                      : selectedQuarter === 'T2'
                      ? 'calc(25% + 0.0625rem)'
                      : selectedQuarter === 'T3'
                      ? 'calc(50% - 0.03125rem)'
                      : 'calc(75% - 0.0625rem)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedQuarter('T1')}
                  className={`relative z-10 px-2 sm:px-4 h-full flex items-center rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 min-w-0 ${
                    selectedQuarter === 'T1'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  T1
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuarter('T2')}
                  className={`relative z-10 px-2 sm:px-4 h-full flex items-center rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 min-w-0 ${
                    selectedQuarter === 'T2'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  T2
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuarter('T3')}
                  className={`relative z-10 px-2 sm:px-4 h-full flex items-center rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 min-w-0 ${
                    selectedQuarter === 'T3'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  T3
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuarter('T4')}
                  className={`relative z-10 px-2 sm:px-4 h-full flex items-center rounded-full text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 min-w-0 ${
                    selectedQuarter === 'T4'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  T4
                </button>
              </div>
              
              {/* Affichage année */}
              <div className="px-2 sm:px-3 h-full flex items-center text-gray-900 dark:text-white font-semibold text-xs sm:text-sm min-w-[50px] sm:min-w-[60px] text-center">
                {selectedQuarterYear}
              </div>
              
              {/* Navigation année */}
              <button
                type="button"
                onClick={() => setSelectedQuarterYear(selectedQuarterYear + 1)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              
              {/* Retour année actuelle */}
              {selectedQuarterYear !== new Date().getFullYear() && (
                <button
                  type="button"
                  onClick={() => setSelectedQuarterYear(new Date().getFullYear())}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  title="Retour à l'année actuelle"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calculateur de cotisations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
          <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Calculateur de Cotisations</h2>
        </div>

        {/* Description du statut et activité */}
        <div className="mb-4 sm:mb-6 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <p className="text-xs text-teal-700 dark:text-teal-300">
            <strong>Micro-entreprise :</strong> Régime fiscal de la micro-entreprise avec abattements fiscaux
          </p>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-1 break-words">
            <strong>Type d'activité :</strong>{' '}
            {urssafStatuses.find(s => s.id === selectedStatus)?.activities.find(a => a.type === selectedActivity)?.description || 'Non défini'}
            {' '}({rate.toFixed(2)}% de cotisations)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
            Modifiez votre type d'activité depuis la page <strong>Profil</strong>
          </p>
        </div>

        {/* CA selon la période choisie */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chiffre d'affaires {periodType === 'mensuelle' ? 'mensuel' : 'trimestriel'} (€)
          </label>
          <input
            type="number"
            value={periodType === 'mensuelle' ? monthlyRevenue : quarterlyRevenue}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              if (periodType === 'mensuelle') {
                setMonthlyRevenue(value);
              } else {
                setQuarterlyRevenue(value);
              }
            }}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base sm:text-lg font-semibold"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            CA calculé automatiquement depuis vos prestations de la période sélectionnée, ou saisissez manuellement
            {periodType === 'trimestrielle' && (
              <span className="block mt-1">
                Trimestre {selectedQuarter} {selectedQuarterYear} : {availableQuarters.find(q => q.value === selectedQuarter)?.months.join(', ')}
              </span>
            )}
          </p>

          {/* Affichage détaillé du trimestre avec progression */}
          {periodType === 'trimestrielle' && quarterlyMonthlyBreakdown.total > 0 && (
            <div className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden transition-all duration-500 ease-out hover:shadow-xl min-w-0">
              {/* En-tête */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-600 dark:to-cyan-600 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-white" />
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Détail du trimestre {selectedQuarter} {selectedQuarterYear}
                      </h4>
                      <p className="text-xs text-teal-100 dark:text-teal-200">
                        Calcul automatique depuis vos prestations
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-xs text-teal-100 dark:text-teal-200 mb-1">Total trimestriel</div>
                    <div className="text-xl sm:text-2xl font-bold text-white">
                      {quarterlyMonthlyBreakdown.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                  </div>
                </div>
              </div>

              {/* Cartes des mois */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {/* Mois 1 */}
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                        {quarterlyMonthlyBreakdown.month1.name}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    </div>
                    <div className="text-2xl font-bold text-teal-900 dark:text-teal-100 mb-1">
                      {quarterlyMonthlyBreakdown.month1.revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                    <div className="text-xs text-teal-600 dark:text-teal-400">
                      {quarterlyMonthlyBreakdown.total > 0 
                        ? `${((quarterlyMonthlyBreakdown.month1.revenue / quarterlyMonthlyBreakdown.total) * 100).toFixed(1)}% du trimestre`
                        : '0% du trimestre'}
                    </div>
                  </div>

                  {/* Mois 2 */}
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">
                        {quarterlyMonthlyBreakdown.month2.name}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                    </div>
                    <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100 mb-1">
                      {quarterlyMonthlyBreakdown.month2.revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                    <div className="text-xs text-cyan-600 dark:text-cyan-400">
                      {quarterlyMonthlyBreakdown.total > 0 
                        ? `${((quarterlyMonthlyBreakdown.month2.revenue / quarterlyMonthlyBreakdown.total) * 100).toFixed(1)}% du trimestre`
                        : '0% du trimestre'}
                    </div>
                  </div>

                  {/* Mois 3 */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        {quarterlyMonthlyBreakdown.month3.name}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                      {quarterlyMonthlyBreakdown.month3.revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      {quarterlyMonthlyBreakdown.total > 0 
                        ? `${((quarterlyMonthlyBreakdown.month3.revenue / quarterlyMonthlyBreakdown.total) * 100).toFixed(1)}% du trimestre`
                        : '0% du trimestre'}
                    </div>
                  </div>
                </div>

                {/* Barre de progression visuelle améliorée */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                      Progression du trimestre
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                      {quarterlyMonthlyBreakdown.total > 0
                        ? Math.round(
                            ((quarterlyMonthlyBreakdown.month1.revenue + quarterlyMonthlyBreakdown.month2.revenue) /
                              quarterlyMonthlyBreakdown.total) *
                              100
                          )
                        : 0}% complété
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                    <div className="flex h-full">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-teal-500 dark:from-teal-500 dark:to-teal-600 transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden"
                        style={{
                          width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month1.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`,
                          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        {quarterlyMonthlyBreakdown.total > 0 && (quarterlyMonthlyBreakdown.month1.revenue / quarterlyMonthlyBreakdown.total) * 100 > 15 && (
                          <span className="text-[10px] font-bold text-white px-1 relative z-10">
                            {quarterlyMonthlyBreakdown.month1.name.substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div
                        className="bg-gradient-to-r from-cyan-400 to-cyan-500 dark:from-cyan-500 dark:to-cyan-600 transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden"
                        style={{
                          width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month2.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`,
                          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        {quarterlyMonthlyBreakdown.total > 0 && (quarterlyMonthlyBreakdown.month2.revenue / quarterlyMonthlyBreakdown.total) * 100 > 15 && (
                          <span className="text-[10px] font-bold text-white px-1 relative z-10">
                            {quarterlyMonthlyBreakdown.month2.name.substring(0, 3)}
                          </span>
                        )}
                      </div>
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-500 dark:to-emerald-600 transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden"
                        style={{
                          width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month3.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`,
                          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        {quarterlyMonthlyBreakdown.total > 0 && (quarterlyMonthlyBreakdown.month3.revenue / quarterlyMonthlyBreakdown.total) * 100 > 15 && (
                          <span className="text-[10px] font-bold text-white px-1 relative z-10">
                            {quarterlyMonthlyBreakdown.month3.name.substring(0, 3)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 gap-1 sm:gap-2">
                    <div className="flex items-center gap-1 sm:gap-2 transition-transform duration-200 hover:scale-105 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0"></div>
                      <span className="truncate">{quarterlyMonthlyBreakdown.month1.name}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 transition-transform duration-200 hover:scale-105 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0"></div>
                      <span className="truncate">{quarterlyMonthlyBreakdown.month2.name}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 transition-transform duration-200 hover:scale-105 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                      <span className="truncate">{quarterlyMonthlyBreakdown.month3.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message si pas de données pour la période */}
          {periodType === 'trimestrielle' && quarterlyMonthlyBreakdown.total === 0 && services && services.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Aucune prestation enregistrée pour le trimestre {selectedQuarter}. Le calcul se mettra à jour automatiquement lorsque vous ajouterez des prestations.
              </p>
            </div>
          )}
        </div>

        {/* Graphiques visuels */}
        <div className="mt-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" />
            Visualisation des données
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Graphique en barres */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 hover:shadow-xl transition-all duration-300 min-w-0">
              <style>{`
                .recharts-tooltip-cursor {
                  fill: transparent !important;
                  opacity: 0 !important;
                }
                rect.recharts-tooltip-cursor {
                  fill: transparent !important;
                  opacity: 0 !important;
                  display: none !important;
                }
                .recharts-tooltip-wrapper {
                  background-color: transparent !important;
                }
              `}</style>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white animate-in fade-in slide-in-from-left duration-500">Montants comparatifs</h4>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-300 animate-in fade-in slide-in-from-right duration-500 delay-100 flex-wrap">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 animate-pulse flex-shrink-0"></div>
                  <span className="dark:text-gray-200 whitespace-nowrap">CA</span>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 ml-1 sm:ml-2 animate-pulse delay-100 flex-shrink-0"></div>
                  <span className="dark:text-gray-200 whitespace-nowrap">Cotisations</span>
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 ml-1 sm:ml-2 animate-pulse delay-200 flex-shrink-0"></div>
                  <span className="dark:text-gray-200 whitespace-nowrap">Net</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240} className="min-h-[240px] sm:min-h-[280px] min-w-0">
                <BarChart 
                  data={[
                    { name: 'Chiffre d\'affaires', montant: revenue, label: 'CA', gradient: ['#3b82f6', '#2563eb', '#1d4ed8'] },
                    { name: 'Cotisations URSSAF', montant: contributions, label: 'Cotisations', gradient: ['#ef4444', '#dc2626', '#b91c1c'] },
                    { name: 'Revenu net', montant: netRevenue, label: 'Net', gradient: ['#10b981', '#059669', '#047857'] }
                  ]}
                  margin={{ top: 30, right: 30, left: 20, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="colorCa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorCotisations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity={1}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#047857" stopOpacity={1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} opacity={0.3} />
                  <XAxis 
                    dataKey="label" 
                    stroke={isDark ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#6b7280' }}
                    tickLine={{ stroke: isDark ? '#6b7280' : '#9ca3af' }}
                  />
                  <YAxis 
                    stroke={isDark ? '#9ca3af' : '#6b7280'}
                    tick={{ fontSize: 12, fill: isDark ? '#d1d5db' : '#6b7280' }}
                    tickLine={{ stroke: isDark ? '#6b7280' : '#9ca3af' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, 'Montant']}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1f2937' : 'white', 
                      border: isDark ? '1px solid #374151' : '1px solid #e5e7eb', 
                      borderRadius: '12px',
                      boxShadow: isDark ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: isDark ? '#f9fafb' : '#111827' }}
                    itemStyle={{ color: isDark ? '#d1d5db' : '#374151' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar 
                    dataKey="montant" 
                    radius={[12, 12, 0, 0]}
                    animationDuration={1200}
                    animationBegin={200}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      dataKey="montant" 
                      position="top" 
                      formatter={(value: number) => `${(value / 1000).toFixed(1)}k€`}
                      style={{ fill: isDark ? '#e5e7eb' : '#374151', fontSize: '11px', fontWeight: '600' }}
                    />
                    {[
                      { name: 'Chiffre d\'affaires', montant: revenue, label: 'CA', gradientId: 'colorCa' },
                      { name: 'Cotisations URSSAF', montant: contributions, label: 'Cotisations', gradientId: 'colorCotisations' },
                      { name: 'Revenu net', montant: netRevenue, label: 'Net', gradientId: 'colorNet' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#${entry.gradientId})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Jauges de progression et indicateurs */}
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-700 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 hover:shadow-xl transition-all duration-300 min-w-0">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 animate-in fade-in slide-in-from-left duration-500">Répartition du CA</h4>
              
              {/* Jauge pour le revenu net */}
              <div className="mb-6 animate-in fade-in slide-in-from-left duration-500 delay-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Revenu net</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 animate-in fade-in zoom-in duration-500 delay-700">
                    {revenue > 0 ? ((netRevenue / revenue) * 100).toFixed(1).replace('.', ',') : '0,0'}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-700 rounded-full transition-all duration-1500 ease-out flex items-center justify-end pr-2 animate-in slide-in-from-left duration-1000 delay-300 relative overflow-hidden"
                    style={{ width: `${revenue > 0 ? (netRevenue / revenue) * 100 : 0}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    {revenue > 0 && (netRevenue / revenue) * 100 > 15 && (
                      <span className="text-[10px] font-bold text-white relative z-10 animate-in fade-in duration-500 delay-1000">
                        {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 animate-in fade-in duration-500 delay-500">
                  {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              </div>

              {/* Jauge pour les cotisations */}
              <div className="mb-6 animate-in fade-in slide-in-from-left duration-500 delay-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-700 animate-pulse delay-100"></div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cotisations URSSAF</span>
                  </div>
                  <span className="text-sm font-bold text-red-700 dark:text-red-400 animate-in fade-in zoom-in duration-500 delay-800">
                    {revenue > 0 ? ((contributions / revenue) * 100).toFixed(1).replace('.', ',') : '0,0'}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-red-600 to-red-700 rounded-full transition-all duration-1500 ease-out flex items-center justify-end pr-2 animate-in slide-in-from-left duration-1000 delay-400 relative overflow-hidden"
                    style={{ width: `${revenue > 0 ? (contributions / revenue) * 100 : 0}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    {revenue > 0 && (contributions / revenue) * 100 > 15 && (
                      <span className="text-[10px] font-bold text-white relative z-10 animate-in fade-in duration-500 delay-1100">
                        {contributions.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 animate-in fade-in duration-500 delay-600">
                  {contributions.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </div>
              </div>

              {/* Indicateurs visuels */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom duration-500 delay-700">
                <div className="text-center transform transition-transform duration-300 hover:scale-105">
                  <div className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400 mb-1 animate-in fade-in zoom-in duration-500 delay-900 truncate">
                    {revenue.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Chiffre d'affaires</div>
                </div>
                <div className="text-center transform transition-transform duration-300 hover:scale-105">
                  <div className="text-xl sm:text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-1 animate-in fade-in zoom-in duration-500 delay-1000">
                    {rate.toFixed(2)}%
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">Taux de cotisation</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau récapitulatif détaillé */}
        <div className="mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span>Tableau récapitulatif</span>
          </h3>
          {/* Vue mobile - Cartes */}
          <div className="md:hidden space-y-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Chiffre d'affaires {periodType === 'mensuelle' ? 'mensuel' : 'trimestriel'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">100,00 %</p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-3 flex-shrink-0"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Cotisations URSSAF ({rate.toFixed(2)}%)</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-700 dark:text-red-400">
                  − {contributions.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
                <p className="text-xs text-red-700 dark:text-red-400">
                  {revenue > 0 ? ((contributions / revenue) * 100).toFixed(2).replace('.', ',') : '0,00'} %
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-gray-300 dark:border-gray-600 p-4">
              <div className="flex items-center mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 flex-shrink-0"></div>
                <span className="text-base font-bold text-gray-900 dark:text-white">Revenu net</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {revenue > 0 ? ((netRevenue / revenue) * 100).toFixed(2).replace('.', ',') : '0,00'} %
                </p>
              </div>
            </div>
          </div>
          
          {/* Vue desktop - Tableau */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Élément</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Montant</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">Pourcentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                      Chiffre d'affaires {periodType === 'mensuelle' ? 'mensuel' : 'trimestriel'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-blue-700 dark:text-blue-400">
                    {revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">100,00 %</td>
                </tr>
                <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-red-500 mr-3"></div>
                      Cotisations URSSAF ({rate.toFixed(2)}%)
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-red-700 dark:text-red-400">
                    − {contributions.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-red-700 dark:text-red-400">
                    {revenue > 0 ? ((contributions / revenue) * 100).toFixed(2).replace('.', ',') : '0,00'} %
                  </td>
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="px-6 py-4 text-base font-bold text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3"></div>
                      Revenu net
                    </div>
                  </td>
                  <td className="px-6 py-4 text-lg font-bold text-right text-emerald-700 dark:text-emerald-400">
                    {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-6 py-4 text-base font-semibold text-right text-emerald-700 dark:text-emerald-400">
                    {revenue > 0 ? ((netRevenue / revenue) * 100).toFixed(2).replace('.', ',') : '0,00'} %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cartes récapitulatives */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-1">Taux de cotisation</span>
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-indigo-700 dark:text-indigo-400 mb-1 sm:mb-2 truncate">{rate.toFixed(2)} %</p>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {urssafStatuses.find(s => s.id === selectedStatus)?.activities.find(a => a.type === selectedActivity)?.description}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-1">Cotisations à payer</span>
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-400 mb-1 sm:mb-2 truncate">
              {contributions.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              {revenue > 0 ? ((contributions / revenue) * 100).toFixed(1).replace('.', ',') : '0,0'} % du CA
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 border border-gray-200 dark:border-gray-700 sm:col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
              <span className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 min-w-0 flex-1">Revenu net</span>
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-1 sm:mb-2 truncate">
              {netRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
            <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              Après déduction des cotisations
            </p>
          </div>
        </div>
      </div>

      {/* Prochaines échéances */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 overflow-hidden">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4 md:mb-6">
          <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">Prochaines Échéances</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {periodType === 'mensuelle' ? (
            upcomingDeadlines.map((deadline, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800 gap-2 sm:gap-3"
              >
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 md:p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex-shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 dark:text-white truncate">{deadline.period}</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{deadline.description}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="font-bold text-xs sm:text-sm md:text-base text-cyan-600 dark:text-cyan-400 whitespace-nowrap">{deadline.declarationDate}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">Date limite</p>
                </div>
              </div>
            ))
          ) : (
            quarterlyDeadlines.filter(q => {
              const [day, month, year] = q.declarationDate.split('/').map(Number);
              const deadlineDate = new Date(year, month - 1, day);
              return deadlineDate >= new Date();
            }).slice(0, 3).map((deadline, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800 gap-2 sm:gap-3"
              >
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
                  <div className="p-1.5 sm:p-2 md:p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex-shrink-0">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs sm:text-sm md:text-base text-gray-900 dark:text-white truncate">{deadline.period}</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{deadline.description}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="font-bold text-xs sm:text-sm md:text-base text-teal-600 dark:text-teal-400 whitespace-nowrap">{deadline.declarationDate}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500">Date limite</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendrier complet des échéances */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 md:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <h2 className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">Calendrier Complet des Échéances 2025</h2>
          </div>
        </div>

        {/* Onglets pour mensuel/trimestriel */}
        <div className="flex space-x-1 sm:space-x-2 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setPeriodType('trimestrielle')}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              periodType === 'trimestrielle'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Déclarations Trimestrielles
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('mensuelle')}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              periodType === 'mensuelle'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Déclarations Mensuelles
          </button>
        </div>

        {/* Tableau des échéances */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
          {/* Vue desktop - Tableau */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-700">
                  <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Date de déclaration
                  </th>
                  <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Date de paiement
                  </th>
                  <th className="px-4 sm:px-5 py-3 sm:py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {(periodType === 'mensuelle' ? declarationDates : quarterlyDeadlines).map((date, index) => {
                  const [day, month, year] = date.declarationDate.split('/').map(Number);
                  const deadlineDate = new Date(year, month - 1, day);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  deadlineDate.setHours(0, 0, 0, 0);
                  const isPast = deadlineDate < today;
                  const isToday = deadlineDate.getTime() === today.getTime();
                  const isUpcoming = deadlineDate >= today && deadlineDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;

                  return (
                    <tr
                      key={index}
                      className={`${
                        isPast
                          ? 'bg-gray-50/50 dark:bg-gray-900/30'
                          : isToday
                          ? 'bg-amber-50 dark:bg-amber-900/20'
                          : isUpcoming
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      } transition-colors`}
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {date.period}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isPast
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              : isToday
                              ? 'bg-amber-500 text-white'
                              : isUpcoming
                              ? 'bg-blue-500 text-white'
                              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {date.declarationDate}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            isPast
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              : isToday
                              ? 'bg-amber-500 text-white'
                              : isUpcoming
                              ? 'bg-blue-500 text-white'
                              : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                          }`}
                        >
                          {date.paymentDate}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-400">
                        {date.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Vue mobile/tablette - Cartes */}
          <div className="lg:hidden space-y-2 sm:space-y-3 p-2 sm:p-3">
            {(periodType === 'mensuelle' ? declarationDates : quarterlyDeadlines).map((date, index) => {
              const [day, month, year] = date.declarationDate.split('/').map(Number);
              const deadlineDate = new Date(year, month - 1, day);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              deadlineDate.setHours(0, 0, 0, 0);
              const isPast = deadlineDate < today;
              const isToday = deadlineDate.getTime() === today.getTime();
              const isUpcoming = deadlineDate >= today && deadlineDate.getTime() - today.getTime() <= 7 * 24 * 60 * 60 * 1000;
              
              return (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-lg border ${
                    isPast
                      ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                      : isToday
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      : isUpcoming
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">{date.period}</h4>
                      <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{date.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Déclaration:</span>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                          isPast
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            : isToday
                            ? 'bg-amber-500 text-white'
                            : isUpcoming
                            ? 'bg-blue-500 text-white'
                            : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        }`}
                      >
                        {date.declarationDate}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Paiement:</span>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                          isPast
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            : isToday
                            ? 'bg-amber-500 text-white'
                            : isUpcoming
                            ? 'bg-blue-500 text-white'
                            : 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        }`}
                      >
                        {date.paymentDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Informations légales et règles - Collapsible */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
        <button
          type="button"
          onClick={() => setShowRules(!showRules)}
          className="w-full flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg p-2 -m-2 transition-colors"
        >
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">Règles et Informations Légales</h2>
        </div>
          {showRules ? (
            <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          )}
        </button>

        {showRules && (
          <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Micro-entreprise */}
          <div className="border-l-4 border-blue-500 pl-3 sm:pl-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
              Régime Micro-entreprise
            </h3>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Prestations de services (BIC) :</strong> <span className="text-xs sm:text-sm">21,2% de cotisations URSSAF (2024-2025) + abattement 50% pour impôt</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Vente de marchandises (BIC) :</strong> <span className="text-xs sm:text-sm">12,3% de cotisations URSSAF (2024-2025) + abattement 71% pour impôt</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Professions libérales (BNC) :</strong> <span className="text-xs sm:text-sm">24,6% de cotisations URSSAF (2024-2025) + abattement 34% pour impôt</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Plafonds 2025 :</strong> <span className="text-xs sm:text-sm">77 700€ (prestations/services) ou 188 700€ (ventes)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Obligations déclaratives */}
          <div className="border-l-4 border-purple-500 pl-3 sm:pl-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
              Obligations Déclaratives
            </h3>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Déclaration mensuelle :</strong> <span className="text-xs sm:text-sm">Si le CA annuel dépasse 25 000€ ou si vous le souhaitez</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Déclaration trimestrielle :</strong> <span className="text-xs sm:text-sm">Si le CA annuel est inférieur à 25 000€</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Date limite :</strong> <span className="text-xs sm:text-sm">Le 8 de chaque mois suivant (déclaration mensuelle) ou le dernier jour du trimestre (trimestrielle)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Impôts */}
          <div className="border-l-4 border-green-500 pl-3 sm:pl-4">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3">
              Impôt sur le Revenu
            </h3>
            <div className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Option micro-fiscal :</strong> <span className="text-xs sm:text-sm">Abattement forfaitaire selon l'activité (50% services, 71% ventes, 34% libérales)</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Option classique :</strong> <span className="text-xs sm:text-sm">Déclaration du résultat réel (bénéfices réels)</span>
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="min-w-0">
                  <strong className="text-xs sm:text-sm">Déclaration fiscale :</strong> <span className="text-xs sm:text-sm">Avant le 31 mai (papier) ou début juin (en ligne) de l'année suivante</span>
                </p>
              </div>
            </div>
          </div>

          {/* Avertissements */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm sm:text-base text-yellow-900 dark:text-yellow-100 mb-2">Points importants</h4>
                <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                  <li>Les cotisations sont calculées sur le chiffre d'affaires réel (prélèvement à la source)</li>
                  <li>En cas d'absence de CA, aucune cotisation n'est due (mais déclaration obligatoire)</li>
                  <li>Les cotisations sont déductibles du résultat imposable dans le régime réel</li>
                  <li>En cas de retard de paiement, majoration de 0,4% par mois de retard</li>
                  <li>Au-delà des plafonds, passage automatique au régime réel normal</li>
                </ul>
          </div>
        </div>
      </div>

      {/* Législation */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 sm:p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">Références Légales</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold mb-2">Code de la Sécurité Sociale :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Article L133-6 : Régime micro-entrepreneur</li>
              <li>Article D133-13 : Taux de cotisations</li>
              <li>Article L133-6-8 : Obligations déclaratives</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Code de Commerce :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Article L526-1 : Statut micro-entrepreneur</li>
              <li>Article L526-2 : Plafonds de chiffre d'affaires</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Code Général des Impôts :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Article 50-0 : Régime micro-BIC</li>
              <li>Article 93 : Abattements forfaitaires</li>
              <li>Article 242 bis : Régime micro-BNC</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Textes applicables :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Loi n°2008-776 du 4 août 2008</li>
              <li>Loi n°2014-626 du 18 juin 2014</li>
              <li>Décret n°2008-1356 du 19 décembre 2008</li>
            </ul>
          </div>
        </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

