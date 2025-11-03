import { useState, useEffect, useRef } from 'react';
import { 
  Euro, 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Calculator,
  PieChart as PieChartIcon,
  BarChart3,
  DollarSign,
  Receipt,
  Percent
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { supabase } from '../lib/supabase.ts';

interface KPIData {
  // CA
  totalRevenueBrut: number;
  totalRevenueNet: number;
  totalContributions: number;
  annualRevenueBrut: number;
  annualRevenueNet: number;
  annualContributions: number;
  
  // Factures
  paidInvoices: number;
  activeClients: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingAmount: number;
  
  // Statistiques complémentaires
  averageInvoiceAmount: number;
  contributionRate: number;
  netMargin: number;
}

interface MonthlyRevenue {
  month: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  invoices: number;
  contributionRate: number;
}

interface QuarterlyRevenue {
  quarter: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  invoices: number;
}

interface ClientRevenue {
  name: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  percentage: number;
  invoices: number;
  [key: string]: string | number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  status: string;
  due_date: string;
}

interface StatsPageProps {
  onPageChange?: (page: string) => void;
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

// Taux URSSAF selon le type d'activité (2024-2025)
const URSSAF_RATES: { [key: string]: number } = {
  'services': 0.212,      // 21,2% pour prestations de services
  'ventes': 0.123,        // 12,3% pour ventes de marchandises
  'liberale': 0.246       // 24,6% pour professions libérales
};

export default function StatsPage({ onPageChange }: StatsPageProps) {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenueBrut: 0,
    totalRevenueNet: 0,
    totalContributions: 0,
    annualRevenueBrut: 0,
    annualRevenueNet: 0,
    annualContributions: 0,
    paidInvoices: 0,
    activeClients: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    pendingAmount: 0,
    averageInvoiceAmount: 0,
    contributionRate: 0,
    netMargin: 0
  });
  
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<QuarterlyRevenue[]>([]);
  const [clientRevenue, setClientRevenue] = useState<ClientRevenue[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'year' | 'quarter' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Refs pour les animations
  const chartsRef = useRef<HTMLDivElement>(null);
  const kpiRef = useRef<HTMLDivElement>(null);
  const [isChartsVisible, setIsChartsVisible] = useState(false);
  const [isKPIVisible, setIsKPIVisible] = useState(false);

  // Charger les paramètres URSSAF
  const urssafSettings = loadURSSAFSettings();
  const urssafRate = URSSAF_RATES[urssafSettings.activity] || URSSAF_RATES['services'];

  // Calculer les cotisations URSSAF
  const calculateContributions = (revenue: number): number => {
    return revenue * urssafRate;
  };

  // Calculer le CA net
  const calculateNetRevenue = (revenue: number): number => {
    return revenue - calculateContributions(revenue);
  };

  // Couleurs pour les graphiques
  const COLORS = [
    '#3B82F6', // Bleu
    '#10B981', // Vert
    '#F59E0B', // Orange
    '#EF4444', // Rouge
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange vif
    '#EC4899', // Rose
    '#6366F1'  // Indigo
  ];

  // Couleurs adaptées au thème
  const getThemeColors = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      grid: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#f9fafb' : '#1f2937',
      textSecondary: isDark ? '#9ca3af' : '#6b7280',
      background: isDark ? '#111827' : '#ffffff',
      tooltipBg: isDark ? '#ffffff' : '#1f2937',
      tooltipText: isDark ? '#1f2937' : '#ffffff',
      tooltipBorder: isDark ? '#e5e7eb' : '#374151',
    };
  };

  // Intersection Observer pour les animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target === chartsRef.current) {
              setIsChartsVisible(true);
            }
            if (entry.target === kpiRef.current) {
              setIsKPIVisible(true);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (chartsRef.current) observer.observe(chartsRef.current);
    if (kpiRef.current) observer.observe(kpiRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [selectedYear]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les factures
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      if (invoicesError) {
        console.error('Erreur lors de la récupération des factures:', invoicesError);
        return;
      }

      const invoices = invoicesData || [];

      // Récupérer tous les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) {
        console.error('Erreur lors de la récupération des clients:', clientsError);
        return;
      }

      const clients = clientsData || [];

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentDate = now.toISOString().split('T')[0];

      // Fonction pour obtenir le nom du client
      const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.name || 'Client inconnu';
      };

      // Calculer les KPI - CA Brut, Net et Cotisations
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      
      const totalRevenueBrut = paidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const totalContributions = calculateContributions(totalRevenueBrut);
      const totalRevenueNet = totalRevenueBrut - totalContributions;

      const annualPaidInvoices = paidInvoices.filter(inv => 
        new Date(inv.date).getFullYear() === currentYear
      );
      
      const annualRevenueBrut = annualPaidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const annualContributions = calculateContributions(annualRevenueBrut);
      const annualRevenueNet = annualRevenueBrut - annualContributions;

      const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
      const overdueInvoices = pendingInvoices.filter(inv => 
        new Date(inv.due_date) < new Date(currentDate)
      );
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      const activeClients = new Set(paidInvoices.map(inv => inv.client_id)).size;
      const averageInvoiceAmount = paidInvoices.length > 0 
        ? totalRevenueBrut / paidInvoices.length 
        : 0;
      const contributionRate = totalRevenueBrut > 0 
        ? (totalContributions / totalRevenueBrut) * 100 
        : 0;
      const netMargin = totalRevenueBrut > 0 
        ? (totalRevenueNet / totalRevenueBrut) * 100 
        : 0;

      setKpiData({
        totalRevenueBrut,
        totalRevenueNet,
        totalContributions,
        annualRevenueBrut,
        annualRevenueNet,
        annualContributions,
        paidInvoices: paidInvoices.length,
        activeClients,
        pendingInvoices: pendingInvoices.length,
        overdueInvoices: overdueInvoices.length,
        pendingAmount,
        averageInvoiceAmount,
        contributionRate,
        netMargin
      });

      // Calculer les revenus mensuels pour l'année en cours
      const monthlyData: MonthlyRevenue[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const monthInvoices = paidInvoices.filter(inv => 
          inv.date >= monthStart && inv.date <= monthEnd
        );

        const revenueBrut = monthInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const contributions = calculateContributions(revenueBrut);
        const revenueNet = revenueBrut - contributions;
        const contributionRate = revenueBrut > 0 ? (contributions / revenueBrut) * 100 : 0;
        
        monthlyData.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          revenueBrut,
          revenueNet,
          contributions,
          invoices: monthInvoices.length,
          contributionRate
        });
      }

      setMonthlyRevenue(monthlyData);

      // Calculer les revenus trimestriels
      const quarterlyData: QuarterlyRevenue[] = [];
      for (let q = 1; q <= 4; q++) {
        const startMonth = (q - 1) * 3;
        const endMonth = startMonth + 2;
        const quarterStart = new Date(currentYear, startMonth, 1).toISOString().split('T')[0];
        const quarterEnd = new Date(currentYear, endMonth + 1, 0).toISOString().split('T')[0];
        
        const quarterInvoices = paidInvoices.filter(inv => 
          inv.date >= quarterStart && inv.date <= quarterEnd
        );

        const revenueBrut = quarterInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const contributions = calculateContributions(revenueBrut);
        const revenueNet = revenueBrut - contributions;
        
        quarterlyData.push({
          quarter: `T${q}`,
          revenueBrut,
          revenueNet,
          contributions,
          invoices: quarterInvoices.length
        });
      }

      setQuarterlyRevenue(quarterlyData);

      // Calculer la répartition par client (Top 5 + Autres)
      const clientRevenueMap = new Map<string, { revenueBrut: number; invoices: number }>();
      paidInvoices.forEach(inv => {
        const clientName = getClientName(inv.client_id);
        const current = clientRevenueMap.get(clientName) || { revenueBrut: 0, invoices: 0 };
        clientRevenueMap.set(clientName, {
          revenueBrut: current.revenueBrut + (inv.subtotal || 0),
          invoices: current.invoices + 1
        });
      });

      const sorted = Array.from(clientRevenueMap.entries())
        .map(([name, data]) => {
          const contributions = calculateContributions(data.revenueBrut);
          const revenueNet = data.revenueBrut - contributions;
          return {
            name,
            revenueBrut: data.revenueBrut,
            revenueNet,
            contributions,
            percentage: 0,
            invoices: data.invoices
          };
        })
        .sort((a, b) => b.revenueBrut - a.revenueBrut);

      const clientRevenueArray = sorted.slice(0, 5);
      if (sorted.length > 5) {
        const others = sorted.slice(5).reduce((acc, c) => ({
          revenueBrut: acc.revenueBrut + c.revenueBrut,
          revenueNet: acc.revenueNet + c.revenueNet,
          contributions: acc.contributions + c.contributions,
          invoices: acc.invoices + c.invoices
        }), { revenueBrut: 0, revenueNet: 0, contributions: 0, invoices: 0 });
        clientRevenueArray.push({ 
          name: 'Autres', 
          revenueBrut: others.revenueBrut,
          revenueNet: others.revenueNet,
          contributions: others.contributions,
          percentage: 0,
          invoices: others.invoices
        });
      }

      // Calculer les pourcentages
      const totalClientRevenue = clientRevenueArray.reduce((sum, client) => sum + client.revenueBrut, 0);
      clientRevenueArray.forEach(client => {
        client.percentage = totalClientRevenue > 0 ? (client.revenueBrut / totalClientRevenue) * 100 : 0;
      });

      setClientRevenue(clientRevenueArray);

      // Récupérer les 5 dernières factures
      const recentInvoicesData = invoices
        .slice(0, 5)
        .map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: getClientName(inv.client_id),
          amount: inv.subtotal || 0,
          status: inv.status,
          due_date: inv.due_date
        }));

      setRecentInvoices(recentInvoicesData);

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formatage des montants
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Formatage des pourcentages
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  const chartData = periodFilter === 'year' ? monthlyRevenue : 
                   periodFilter === 'quarter' ? quarterlyRevenue : 
                   monthlyRevenue.slice(-3);

  return (
    <div className="space-y-6">
      {/* Header - Garder tel quel */}
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 dark:from-indigo-700 dark:via-indigo-700 dark:to-indigo-800 text-white shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
          <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
          <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
          
          <div className="absolute top-0 bottom-0 left-12 w-0.5 h-full bg-white/20 transform rotate-12"></div>
          <div className="absolute top-0 bottom-0 left-24 w-0.5 h-full bg-white/15 transform -rotate-6"></div>
          <div className="absolute top-0 bottom-0 right-12 w-0.5 h-full bg-white/20 transform rotate-45"></div>
          <div className="absolute top-0 bottom-0 right-24 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">Statistiques</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Tableaux de bord et analyses financières</p>
          </div>
        </div>
      </div>

      {/* Message si aucune donnée */}
      {!loading && kpiData.totalRevenueBrut === 0 && kpiData.paidInvoices === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Aucune donnée disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Commencez par créer des clients et des factures pour voir vos statistiques ici.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              type="button"
              onClick={() => onPageChange?.('clients')}
              className="inline-flex items-center justify-center px-2 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Gérer les clients</span>
              <span className="sm:hidden">Gérer clients</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange?.('invoices')}
              className="inline-flex items-center justify-center px-2 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Créer des factures</span>
              <span className="sm:hidden">Créer factures</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards - CA Brut, Net, Cotisations */}
      <div ref={kpiRef} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 ${isKPIVisible ? 'animate-in fade-in slide-in-from-bottom-4 duration-700' : 'opacity-0'}`}>
        {/* CA Brut Total */}
        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Brut Total</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.totalRevenueBrut)}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4 mr-1 text-blue-500" />
            <span>Toutes les factures payées</span>
          </div>
        </div>

        {/* CA Net Total */}
        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform">
            <Euro className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Net Total</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.totalRevenueNet)}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Après cotisations URSSAF</span>
          </div>
        </div>

        {/* Cotisations URSSAF Total */}
        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full group-hover:scale-110 transition-transform">
            <Calculator className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cotisations URSSAF</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.totalContributions)}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Percent className="w-4 h-4 mr-1 text-red-500" />
            <span>{formatPercent(kpiData.contributionRate)}</span>
          </div>
        </div>

        {/* Factures Payées */}
        <div className="bg-white dark:bg-gray-800 p-5 lg:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures Payées</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {kpiData.paidInvoices}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-400">Total factures réglées</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Annuel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* CA Brut Annuel */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-5 rounded-xl shadow-sm border border-blue-200 dark:border-blue-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">CA Brut Annuel</p>
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatCurrency(kpiData.annualRevenueBrut)}
          </p>
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Année {selectedYear}
          </p>
        </div>

        {/* CA Net Annuel */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-5 rounded-xl shadow-sm border border-green-200 dark:border-green-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">CA Net Annuel</p>
            <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(kpiData.annualRevenueNet)}
          </p>
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
            Marge nette: {formatPercent(kpiData.netMargin)}
          </p>
        </div>

        {/* Cotisations Annuelles */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-5 rounded-xl shadow-sm border border-red-200 dark:border-red-700/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Cotisations Annuelles</p>
            <Calculator className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-100">
            {formatCurrency(kpiData.annualContributions)}
          </p>
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            Taux: {formatPercent(urssafRate * 100)}
          </p>
        </div>
      </div>

      {/* Graphique combiné - CA et Cotisations */}
      <div ref={chartsRef} className={`${isChartsVisible ? 'animate-in fade-in slide-in-from-bottom-4 duration-700' : 'opacity-0'}`}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Évolution du chiffre d'affaires et des cotisations
            </h3>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Chiffre d'affaires</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Cotisations</span>
              </div>
            </div>
          </div>

          {monthlyRevenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyRevenue.slice(-6)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="revenueEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="contributionsEvolutionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenueBrut" 
                    fill="url(#revenueEvolutionGradient)" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="Chiffre d'affaires"
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="contributions" 
                    fill="url(#contributionsEvolutionGradient)" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    name="Cotisations"
                    animationDuration={1200}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques - Deuxième ligne */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution CA Brut vs Net */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Évolution CA Brut vs Net
            </h3>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">CA Brut</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400">CA Net</span>
              </div>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="brutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey={periodFilter === 'quarter' ? 'quarter' : 'month'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenueBrut" 
                    fill="url(#brutGradient)" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="CA Brut"
                    animationDuration={1000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenueNet" 
                    fill="url(#netGradient)" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    name="CA Net"
                    animationDuration={1200}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Répartition CA vs Cotisations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Répartition CA vs Cotisations
            </h3>
          </div>

          {monthlyRevenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue.slice(-6)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenueBrut" fill="#3B82F6" name="CA Brut" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="contributions" fill="#EF4444" name="Cotisations" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="revenueNet" fill="#10B981" name="CA Net" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques supplémentaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition CA Brut / Net / Cotisations (Donut) */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Répartition globale
            </h3>
          </div>

          {kpiData.totalRevenueBrut > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'CA Net', value: kpiData.totalRevenueNet, color: '#10B981' },
                      { name: 'Cotisations', value: kpiData.totalContributions, color: '#EF4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1200}
                  >
                    {[
                      { name: 'CA Net', value: kpiData.totalRevenueNet, color: '#10B981' },
                      { name: 'Cotisations', value: kpiData.totalContributions, color: '#EF4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current"
                    fill={getThemeColors().text}
                    style={{ 
                      fontWeight: 700, 
                      fontSize: '18px'
                    }}
                  >
                    {formatPercent(kpiData.netMargin)}
                  </text>
                  <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-current"
                    fill={getThemeColors().textSecondary}
                    style={{ 
                      fontWeight: 500, 
                      fontSize: '14px'
                    }}
                  >
                    Marge nette
                  </text>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => (
                      <span style={{ 
                        color: getThemeColors().text, 
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>

        {/* Évolution des cotisations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Évolution des cotisations
            </h3>
          </div>

          {monthlyRevenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue.slice(-6)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="contributionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="contributions" 
                    fill="url(#contributionsGradient)" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    name="Cotisations"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques trimestriels et comparaisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Comparaison trimestrielle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Comparaison trimestrielle
            </h3>
          </div>

          {quarterlyRevenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="quarter"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenueBrut" fill="#3B82F6" name="CA Brut" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="revenueNet" fill="#10B981" name="CA Net" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Graphique répartition par client (horizontal) */}
      {clientRevenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top clients par CA Brut
            </h3>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={clientRevenue.slice().reverse()} 
                layout="vertical"
                margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} horizontal={true} vertical={false} />
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: getThemeColors().textSecondary, fontWeight: 500 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: getThemeColors().text, fontWeight: 500 }}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: getThemeColors().tooltipBg,
                    border: 'none',
                    borderRadius: '12px',
                    color: getThemeColors().tooltipText,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    fontSize: '14px'
                  }}
                />
                <Bar 
                  dataKey="revenueBrut" 
                  fill="#3B82F6" 
                  name="CA Brut"
                  radius={[0, 8, 8, 0]}
                  animationDuration={1000}
                >
                  {clientRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tableau de statistiques détaillées */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Statistiques détaillées par période
        </h3>
        
        {/* Filtre de période */}
        <div className="flex items-center space-x-2 mb-6">
          <button
            type="button"
            onClick={() => setPeriodFilter('year')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodFilter === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Année
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('quarter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodFilter === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Trimestre
          </button>
          <button
            type="button"
            onClick={() => setPeriodFilter('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              periodFilter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Mois
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">
                  {periodFilter === 'quarter' ? 'Trimestre' : periodFilter === 'month' ? 'Mois' : 'Mois'}
                </th>
                <th className="text-right py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">CA Brut</th>
                <th className="text-right py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Cotisations</th>
                <th className="text-right py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">CA Net</th>
                <th className="text-right py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Factures</th>
                <th className="text-right py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Taux</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {periodFilter === 'quarter' ? item.quarter : item.month}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                    {formatCurrency(item.revenueBrut)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">
                    {formatCurrency(item.contributions)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(item.revenueNet)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                    {item.invoices}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                    {formatPercent('contributionRate' in item ? item.contributionRate : (item.contributions / item.revenueBrut) * 100)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">Total</td>
                <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white">
                  {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueBrut, 0))}
                </td>
                <td className="py-3 px-4 text-sm text-right text-red-600 dark:text-red-400">
                  {formatCurrency(chartData.reduce((sum, item) => sum + item.contributions, 0))}
                </td>
                <td className="py-3 px-4 text-sm text-right text-green-600 dark:text-green-400">
                  {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueNet, 0))}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                  {chartData.reduce((sum, item) => sum + item.invoices, 0)}
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                  {formatPercent(
                    chartData.reduce((sum, item) => sum + item.revenueBrut, 0) > 0
                      ? (chartData.reduce((sum, item) => sum + item.contributions, 0) / chartData.reduce((sum, item) => sum + item.revenueBrut, 0)) * 100
                      : 0
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Répartition par client */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Top clients par CA
        </h3>
        
        {clientRevenue.length > 0 ? (
          <div className="space-y-4">
            {clientRevenue.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatPercent(client.percentage)}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Brut: <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(client.revenueBrut)}</span>
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      Cotisations: <span className="font-medium">{formatCurrency(client.contributions)}</span>
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Net: <span className="font-medium">{formatCurrency(client.revenueNet)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {client.invoices} facture{client.invoices > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${client.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Aucune donnée disponible</p>
        )}
      </div>

      {/* Statistiques supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Factures en attente */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Factures en attente</h3>
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              {kpiData.pendingInvoices}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatCurrency(kpiData.pendingAmount)} en attente
            </p>
          </div>
        </div>

        {/* Factures en retard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Factures en retard</h3>
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              {kpiData.overdueInvoices}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Nécessitent un suivi
            </p>
          </div>
        </div>

        {/* Montant moyen */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Montant moyen</h3>
            <Receipt className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {formatCurrency(kpiData.averageInvoiceAmount)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Par facture payée
            </p>
          </div>
        </div>
      </div>

      {/* Dernières factures */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Dernières factures
        </h3>
        
        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Aucune facture récente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">N° Facture</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Montant</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Statut</th>
                  <th className="text-left py-3 px-4 font-medium text-sm text-gray-600 dark:text-gray-400">Échéance</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {invoice.client_name}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : invoice.status === 'sent'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {invoice.status === 'paid' ? 'Payée' : 
                         invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
