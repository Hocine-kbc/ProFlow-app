import { useState, useEffect } from 'react';
import { Calculator, Calendar, AlertCircle, Info, Receipt, FileText, TrendingDown, DollarSign, CalendarDays, Shield, BookOpen, Scale, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';

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
  const { services, invoices } = state;

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
  const [selectedStatus, setSelectedStatus] = useState<string>('micro-entreprise');
  const [selectedActivity, setSelectedActivity] = useState<string>(initialSettings.activity);
  // État global pour la période - contrôle toute la page
  const [periodType, setPeriodType] = useState<'mensuelle' | 'trimestrielle'>('trimestrielle');
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedQuarter, setSelectedQuarter] = useState<string>(getCurrentQuarter());
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(new Date().getFullYear());

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

  // Fonction pour obtenir les services filtrés selon la période
  const getFilteredServices = () => {
    if (!services || services.length === 0) return [];
    
    if (periodType === 'mensuelle') {
      const [year, month] = selectedMonth.split('-').map(Number);
      return services.filter(service => {
        const serviceDate = new Date(service.date);
        return serviceDate.getMonth() === month - 1 && serviceDate.getFullYear() === year;
      });
    } else { // trimestrielle
      const quarterNumber = parseInt(selectedQuarter.substring(1)); // T1 => 1, T2 => 2, etc.
      const startMonth = (quarterNumber - 1) * 3;
      return services.filter(service => {
        const serviceDate = new Date(service.date);
        const serviceMonth = serviceDate.getMonth();
        return serviceMonth >= startMonth && serviceMonth < startMonth + 3 && serviceDate.getFullYear() === selectedQuarterYear;
      });
    }
  };

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
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-red-600 via-red-600 to-red-700 dark:from-red-700 dark:via-red-700 dark:to-red-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
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
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">URSSAF & Cotisations</h1>
              <p className="text-red-100 mt-1 text-sm sm:text-base">Gestion des cotisations sociales et déclarations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation de période - juste sous le header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Onglets pour le type de période avec effet de glissement */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 inline-grid grid-cols-2 relative gap-0.5">
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
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
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
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  const currentDate = new Date(selectedMonth + '-01');
                  currentDate.setMonth(currentDate.getMonth() - 1);
                  setSelectedMonth(currentDate.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
                className="px-4 py-1.5 text-gray-900 dark:text-white font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                {new Date(selectedMonth + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentDate = new Date(selectedMonth + '-01');
                  currentDate.setMonth(currentDate.getMonth() + 1);
                  setSelectedMonth(currentDate.toISOString().slice(0, 7));
                }}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2">
              {/* Navigation année */}
              <button
                type="button"
                onClick={() => setSelectedQuarterYear(selectedQuarterYear - 1)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>
              
              {/* Sélection trimestre avec effet de glissement */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-1 inline-flex relative gap-0.5">
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
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 ${
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
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 ${
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
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 ${
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
                  className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 whitespace-nowrap flex-1 ${
                    selectedQuarter === 'T4'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  T4
                </button>
              </div>
              
              {/* Affichage année */}
              <div className="px-3 py-1.5 text-gray-900 dark:text-white font-semibold text-sm min-w-[60px] text-center">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Calculator className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calculateur de Cotisations</h2>
        </div>

        {/* Description du statut et activité */}
        <div className="mb-6 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
          <p className="text-xs text-teal-700 dark:text-teal-300">
            <strong>Micro-entreprise :</strong> Régime fiscal de la micro-entreprise avec abattements fiscaux
          </p>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
            <strong>Type d'activité :</strong>{' '}
            {urssafStatuses.find(s => s.id === selectedStatus)?.activities.find(a => a.type === selectedActivity)?.description || 'Non défini'}
            {' '}({rate.toFixed(2)}% de cotisations)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
            Modifiez votre type d'activité depuis la page <strong>Profil</strong>
          </p>
        </div>

        {/* CA selon la période choisie */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent text-lg font-semibold"
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
            <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2 text-teal-600 dark:text-teal-400" />
                Détail du trimestre {selectedQuarter} (calcul automatique)
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {quarterlyMonthlyBreakdown.month1.name} :
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {quarterlyMonthlyBreakdown.month1.revenue.toFixed(2)}€
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {quarterlyMonthlyBreakdown.month2.name} :
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {quarterlyMonthlyBreakdown.month2.revenue.toFixed(2)}€
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {quarterlyMonthlyBreakdown.month3.name} :
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {quarterlyMonthlyBreakdown.month3.revenue.toFixed(2)}€
                  </span>
                </div>
                <div className="border-t border-teal-300 dark:border-teal-700 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-teal-700 dark:text-teal-300">
                      Total trimestriel :
                    </span>
                    <span className="text-xl font-bold text-teal-900 dark:text-teal-100">
                      {quarterlyMonthlyBreakdown.total.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>

              {/* Barre de progression visuelle */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <span>Progression du trimestre</span>
                  <span>
                    {quarterlyMonthlyBreakdown.total > 0
                      ? Math.round(
                          ((quarterlyMonthlyBreakdown.month1.revenue + quarterlyMonthlyBreakdown.month2.revenue) /
                            quarterlyMonthlyBreakdown.total) *
                            100
                        )
                      : 0}
                    % complété
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div className="flex h-full">
                    <div
                      className="bg-gradient-to-r from-teal-400 to-teal-500 dark:from-teal-500 dark:to-teal-600 transition-all duration-500"
                      style={{
                        width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month1.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-600 dark:to-cyan-600 transition-all duration-500"
                      style={{
                        width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month2.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-teal-600 dark:from-cyan-600 dark:to-teal-700 transition-all duration-500"
                      style={{
                        width: `${quarterlyMonthlyBreakdown.total > 0 ? (quarterlyMonthlyBreakdown.month3.revenue / quarterlyMonthlyBreakdown.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{quarterlyMonthlyBreakdown.month1.name}</span>
                  <span>{quarterlyMonthlyBreakdown.month2.name}</span>
                  <span>{quarterlyMonthlyBreakdown.month3.name}</span>
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

        {/* Résultats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Taux de cotisation</span>
              <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">{rate.toFixed(2)}%</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
              {urssafStatuses.find(s => s.id === selectedStatus)?.activities.find(a => a.type === selectedActivity)?.description}
            </p>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 rounded-xl p-6 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-rose-700 dark:text-rose-400">Cotisations à payer</span>
              <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-3xl font-bold text-rose-900 dark:text-rose-100">
              {contributions.toFixed(2)}€
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              {revenue > 0 ? (contributions / revenue * 100).toFixed(1) : 0}% du CA
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Revenu net</span>
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {netRevenue.toFixed(2)}€
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Après déduction des cotisations
            </p>
          </div>
        </div>
      </div>

      {/* Prochaines échéances */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <CalendarDays className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Prochaines Échéances</h2>
        </div>

        <div className="space-y-4">
          {periodType === 'mensuelle' ? (
            upcomingDeadlines.map((deadline, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{deadline.period}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{deadline.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-cyan-600 dark:text-cyan-400">{deadline.declarationDate}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Date limite</p>
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
                className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-800"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                    <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{deadline.period}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{deadline.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-teal-600 dark:text-teal-400">{deadline.declarationDate}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Date limite</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Calendrier complet des échéances */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Calendrier Complet des Échéances 2025</h2>
          </div>
        </div>

        {/* Onglets pour mensuel/trimestriel */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setPeriodType('trimestrielle')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
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
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-700 dark:to-cyan-700">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Période
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Date de déclaration
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Date de paiement
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-white uppercase tracking-wider">
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
                          ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'
                          : isUpcoming
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
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
        </div>
      </div>

      {/* Informations légales et règles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Règles et Informations Légales</h2>
        </div>

        <div className="space-y-6">
          {/* Micro-entreprise */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Régime Micro-entreprise
            </h3>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Prestations de services (BIC) :</strong> 21,2% de cotisations URSSAF (2024-2025) + abattement 50% pour impôt
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Vente de marchandises (BIC) :</strong> 12,3% de cotisations URSSAF (2024-2025) + abattement 71% pour impôt
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Professions libérales (BNC) :</strong> 24,6% de cotisations URSSAF (2024-2025) + abattement 34% pour impôt
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Plafonds 2025 :</strong> 77 700€ (prestations/services) ou 188 700€ (ventes)
                </p>
              </div>
            </div>
          </div>

          {/* Obligations déclaratives */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Obligations Déclaratives
            </h3>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Déclaration mensuelle :</strong> Si le CA annuel dépasse 25 000€ ou si vous le souhaitez
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Déclaration trimestrielle :</strong> Si le CA annuel est inférieur à 25 000€
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Date limite :</strong> Le 8 de chaque mois suivant (déclaration mensuelle) ou le dernier jour du trimestre (trimestrielle)
                </p>
              </div>
            </div>
          </div>

          {/* Impôts */}
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              Impôt sur le Revenu
            </h3>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Option micro-fiscal :</strong> Abattement forfaitaire selon l'activité (50% services, 71% ventes, 34% libérales)
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Option classique :</strong> Déclaration du résultat réel (bénéfices réels)
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Déclaration fiscale :</strong> Avant le 31 mai (papier) ou début juin (en ligne) de l'année suivante
                </p>
              </div>
            </div>
          </div>

          {/* Avertissements */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-900 dark:text-yellow-100 mb-2">Points importants</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  <li>Les cotisations sont calculées sur le chiffre d'affaires réel (prélèvement à la source)</li>
                  <li>En cas d'absence de CA, aucune cotisation n'est due (mais déclaration obligatoire)</li>
                  <li>Les cotisations sont déductibles du résultat imposable dans le régime réel</li>
                  <li>En cas de retard de paiement, majoration de 0,4% par mois de retard</li>
                  <li>Au-delà des plafonds, passage automatique au régime réel normal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Législation */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center space-x-3 mb-4">
          <Scale className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Références Légales</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
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
  );
}

