import { useState, useEffect, useRef } from 'react';
import { 
  Euro, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calculator,
  DollarSign,
  Receipt,
  Percent,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  FileX
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
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
  totalRevenueBrut: number;
  totalRevenueNet: number;
  totalContributions: number;
  annualRevenueBrut: number;
  annualRevenueNet: number;
  annualContributions: number;
  paidInvoices: number;
  activeClients: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingAmount: number;
  averageInvoiceAmount: number;
  contributionRate: number;
  netMargin: number;
  // Nouvelles métriques
  overdueAmount: number;
  onTimePaymentRate: number;
  monthlyCollectedAmount: number;
  refundsAmount: number;
  newClientsThisMonth: number;
  inactiveClientsCount: number;
  clientRetentionRate: number;
  invoicesThisMonth: number;
  averagePaymentTime: number;
  recurringInvoices: number;
  uniqueInvoices: number;
  totalServices: number;
  servicesThisMonth: number;
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

interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface ServiceStats {
  name: string;
  count: number;
  revenue: number;
  hours: number;
  percentage: number;
}

interface MonthlyInvoicesData {
  month: string;
  count: number;
  paid: number;
  pending: number;
  overdue: number;
}

interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
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

const URSSAF_RATES: { [key: string]: number } = {
  'services': 0.212,
  'ventes': 0.123,
  'liberale': 0.246
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
    netMargin: 0,
    overdueAmount: 0,
    onTimePaymentRate: 0,
    monthlyCollectedAmount: 0,
    refundsAmount: 0,
    newClientsThisMonth: 0,
    inactiveClientsCount: 0,
    clientRetentionRate: 0,
    invoicesThisMonth: 0,
    averagePaymentTime: 0,
    recurringInvoices: 0,
    uniqueInvoices: 0,
    totalServices: 0,
    servicesThisMonth: 0
  });
  
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [quarterlyRevenue, setQuarterlyRevenue] = useState<QuarterlyRevenue[]>([]);
  const [clientRevenue, setClientRevenue] = useState<ClientRevenue[]>([]);
  const [, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStats[]>([]);
  const [monthlyInvoices, setMonthlyInvoices] = useState<MonthlyInvoicesData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingYear, setIsUpdatingYear] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'year' | 'quarter' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  
  // Refs pour les boutons de période
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const quarterButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  

  const urssafSettings = loadURSSAFSettings();
  const urssafRate = URSSAF_RATES[urssafSettings.activity] || URSSAF_RATES['services'];

  // Écouter les changements du mode sombre en temps réel
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const calculateContributions = (revenue: number): number => {
    return revenue * urssafRate;
  };

  const getThemeColors = () => {
    return {
      grid: isDarkMode ? '#374151' : '#e5e7eb',
      text: isDarkMode ? '#f9fafb' : '#1f2937',
      textSecondary: isDarkMode ? '#9ca3af' : '#6b7280',
      tooltipBg: isDarkMode ? '#1f2937' : '#ffffff',
      tooltipText: isDarkMode ? '#f9fafb' : '#1f2937',
    };
  };

  // Palette de couleurs élégantes avec dégradés
  const COLORS = [
    '#6366F1', // Indigo élégant
    '#10B981', // Vert émeraude
    '#F59E0B', // Ambre doré
    '#F472B6', // Rose moderne
    '#8B5CF6', // Violet profond
    '#06B6D4', // Cyan vif
    '#84CC16', // Vert citron
    '#F97316', // Orange vibrant
    '#EC4899', // Rose fuchsia
    '#3B82F6'  // Bleu royal
  ];

  // Composant Tooltip personnalisé qui s'adapte au mode sombre
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    const themeColors = getThemeColors();
    
    return (
      <div 
        style={{
          backgroundColor: themeColors.tooltipBg,
          color: themeColors.tooltipText,
          border: 'none',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          fontSize: '14px'
        }}
      >
        <p style={{ marginBottom: '8px', fontWeight: 600, color: themeColors.tooltipText }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ margin: '4px 0', color: themeColors.tooltipText }}>
            <span style={{ color: entry.color, marginRight: '8px' }}>●</span>
            {entry.name}: <strong>{formatCurrency(entry.value)}</strong>
          </p>
        ))}
      </div>
    );
  };




  useEffect(() => {
    fetchStatistics();
  }, []);

  // Mise à jour des données lors du changement d'année sans rechargement complet
  useEffect(() => {
    // Ignorer le premier rendu (chargement initial)
    if (loading) return;
    
    setIsUpdatingYear(true);
    fetchStatistics(false);
  }, [selectedYear]);

  // Mettre à jour la position de l'indicateur (même approche que ServicesPage)
  useEffect(() => {
    const updateIndicator = () => {
      let activeButton: HTMLButtonElement | null = null;
      
      if (periodFilter === 'year') {
        activeButton = yearButtonRef.current;
      } else if (periodFilter === 'quarter') {
        activeButton = quarterButtonRef.current;
      } else if (periodFilter === 'month') {
        activeButton = monthButtonRef.current;
      }

      if (activeButton) {
        const container = activeButton.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          
          setIndicatorStyle({
            width: buttonRect.width,
            left: buttonRect.left - containerRect.left
          });
        }
      }
    };

    // Utiliser requestAnimationFrame pour un rendu fluide et immédiat
    const rafId = requestAnimationFrame(() => {
      // Double raf pour s'assurer que le DOM est mis à jour
      requestAnimationFrame(updateIndicator);
    });
    
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [periodFilter]);
  
  // Calcul initial après le chargement des données
  useEffect(() => {
    // Attendre que les données soient chargées
    if (loading) return;
    
    const updateIndicator = () => {
      let activeButton: HTMLButtonElement | null = null;
      
      if (periodFilter === 'year') {
        activeButton = yearButtonRef.current;
      } else if (periodFilter === 'quarter') {
        activeButton = quarterButtonRef.current;
      } else if (periodFilter === 'month') {
        activeButton = monthButtonRef.current;
      }

      if (activeButton) {
        const container = activeButton.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          
          if (buttonRect.width > 0 && containerRect.width > 0) {
            setIndicatorStyle({
              width: buttonRect.width,
              left: buttonRect.left - containerRect.left
            });
          }
        }
      }
    };

    // Utiliser requestAnimationFrame pour un calcul immédiat et synchronisé
    let rafId2: number | null = null;
    const rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        updateIndicator();
      });
    });
    
    return () => {
      cancelAnimationFrame(rafId1);
      if (rafId2 !== null) cancelAnimationFrame(rafId2);
    };
  }, [loading, periodFilter]); // Après le chargement et à chaque changement de période

  const fetchStatistics = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsUpdatingYear(true);
      }
      
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      if (invoicesError) {
        console.error('Erreur lors de la récupération des factures:', invoicesError);
        return;
      }

      const invoices = invoicesData || [];

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) {
        console.error('Erreur lors de la récupération des clients:', clientsError);
        return;
      }

      const clients = clientsData || [];

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];

      const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.name || 'Client inconnu';
      };

      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      
      const totalRevenueBrut = paidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const totalContributions = calculateContributions(totalRevenueBrut);
      const totalRevenueNet = totalRevenueBrut - totalContributions;

      const annualPaidInvoices = paidInvoices.filter(inv => 
        new Date(inv.date).getFullYear() === selectedYear
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

      // Calculer les nouvelles métriques
      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      
      // Taux de paiement à temps
      const onTimePaidInvoices = paidInvoices.filter(inv => {
        if (!inv.paid_date) return false;
        const paidDate = new Date(inv.paid_date);
        const dueDate = new Date(inv.due_date);
        return paidDate <= dueDate;
      });
      const onTimePaymentRate = paidInvoices.length > 0 
        ? (onTimePaidInvoices.length / paidInvoices.length) * 100 
        : 0;

      // Montant encaissé ce mois-ci
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];
      const monthlyCollectedAmount = paidInvoices
        .filter(inv => {
          const paidDate = inv.paid_date ? new Date(inv.paid_date).toISOString().split('T')[0] : inv.date;
          return paidDate >= monthStart && paidDate <= monthEnd;
        })
        .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      // Avoirs/remboursements (pour l'instant 0, à implémenter si le champ existe)
      const refundsAmount = 0;

      // Nouveaux clients ce mois-ci
      const newClientsThisMonth = clients.filter(c => {
        const createdDate = new Date(c.created_at || c.date || '');
        return createdDate.getMonth() === currentMonth && 
               createdDate.getFullYear() === currentYear;
      }).length;

      // Clients inactifs (pas de facture payée depuis 90 jours)
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const inactiveClientsCount = clients.filter(c => {
        const clientInvoices = paidInvoices.filter(inv => inv.client_id === c.id);
        if (clientInvoices.length === 0) return true;
        const lastInvoiceDate = new Date(Math.max(...clientInvoices.map(inv => 
          new Date(inv.paid_date || inv.date).getTime()
        )));
        return lastInvoiceDate < ninetyDaysAgo;
      }).length;

      // Taux de fidélisation (clients avec plus d'une facture)
      const clientsWithMultipleInvoices = clients.filter(c => {
        const clientInvoices = paidInvoices.filter(inv => inv.client_id === c.id);
        return clientInvoices.length > 1;
      }).length;
      const clientRetentionRate = activeClients > 0 
        ? (clientsWithMultipleInvoices / activeClients) * 100 
        : 0;

      // Factures émises ce mois
      const invoicesThisMonth = invoices.filter(inv => {
        const invoiceDate = new Date(inv.date);
        return invoiceDate.getMonth() === currentMonth && 
               invoiceDate.getFullYear() === currentYear;
      }).length;

      // Temps moyen de paiement (en jours)
      const invoicesWithPaymentTime = paidInvoices
        .filter(inv => inv.paid_date && inv.due_date)
        .map(inv => {
          const paidDate = new Date(inv.paid_date);
          const dueDate = new Date(inv.due_date);
          return Math.max(0, Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        });
      const averagePaymentTime = invoicesWithPaymentTime.length > 0
        ? invoicesWithPaymentTime.reduce((sum, days) => sum + days, 0) / invoicesWithPaymentTime.length
        : 0;

      // Factures récurrentes vs uniques (approximation: clients avec plusieurs factures)
      const recurringInvoices = paidInvoices.filter(inv => {
        const clientInvoices = paidInvoices.filter(i => i.client_id === inv.client_id);
        return clientInvoices.length > 1;
      }).length;
      const uniqueInvoices = paidInvoices.length - recurringInvoices;

      // Récupérer les services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .order('date', { ascending: false });

      const services = servicesData || [];
      const totalServices = services.length;
      const servicesThisMonth = services.filter(s => {
        const serviceDate = new Date(s.date);
        return serviceDate.getMonth() === currentMonth && 
               serviceDate.getFullYear() === currentYear;
      }).length;

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
        netMargin,
        overdueAmount,
        onTimePaymentRate,
        monthlyCollectedAmount,
        refundsAmount,
        newClientsThisMonth,
        inactiveClientsCount,
        clientRetentionRate,
        invoicesThisMonth,
        averagePaymentTime,
        recurringInvoices,
        uniqueInvoices,
        totalServices,
        servicesThisMonth
      });

      const monthlyData: MonthlyRevenue[] = [];
      // Générer les 12 mois de janvier à décembre pour l'année sélectionnée
      for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(selectedYear, month + 1, 0).toISOString().split('T')[0];
        
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

      const quarterlyData: QuarterlyRevenue[] = [];
      for (let q = 1; q <= 4; q++) {
        const startMonth = (q - 1) * 3;
        const endMonth = startMonth + 2;
        const quarterStart = new Date(selectedYear, startMonth, 1).toISOString().split('T')[0];
        const quarterEnd = new Date(selectedYear, endMonth + 1, 0).toISOString().split('T')[0];
        
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

      const totalClientRevenue = clientRevenueArray.reduce((sum, client) => sum + client.revenueBrut, 0);
      clientRevenueArray.forEach(client => {
        client.percentage = totalClientRevenue > 0 ? (client.revenueBrut / totalClientRevenue) * 100 : 0;
      });

      setClientRevenue(clientRevenueArray);

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

      // Répartition par méthode de paiement
      const paymentMethodMap = new Map<string, { amount: number; count: number }>();
      paidInvoices.forEach(inv => {
        // Récupérer depuis localStorage si pas dans la DB
        let method = inv.payment_method;
        if (!method) {
          try {
            const paymentMethods = JSON.parse(localStorage.getItem('invoice-payment-methods') || '{}');
            method = paymentMethods[inv.id] || 'non_specifie';
          } catch {
            method = 'non_specifie';
          }
        }
        const methodName = method === 'bank_transfer' ? 'Virement' :
                          method === 'paypal' ? 'PayPal' :
                          method === 'check' ? 'Chèque' :
                          method === 'cash' ? 'Espèces' :
                          method === 'card' ? 'Carte bancaire' : 'Non spécifié';
        const current = paymentMethodMap.get(methodName) || { amount: 0, count: 0 };
        paymentMethodMap.set(methodName, {
          amount: current.amount + (inv.subtotal || 0),
          count: current.count + 1
        });
      });
      const totalPaymentAmount = Array.from(paymentMethodMap.values())
        .reduce((sum, data) => sum + data.amount, 0);
      const paymentMethodsArray: PaymentMethodData[] = Array.from(paymentMethodMap.entries())
        .map(([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
          percentage: totalPaymentAmount > 0 ? (data.amount / totalPaymentAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);
      setPaymentMethods(paymentMethodsArray);

      // Statistiques des prestations/services
      const serviceStatsMap = new Map<string, { count: number; revenue: number; hours: number }>();
      services.forEach(service => {
        const serviceName = service.description || 'Service sans description';
        const current = serviceStatsMap.get(serviceName) || { count: 0, revenue: 0, hours: 0 };
        const serviceRevenue = (service.hours || 0) * (service.hourly_rate || 0);
        serviceStatsMap.set(serviceName, {
          count: current.count + 1,
          revenue: current.revenue + serviceRevenue,
          hours: current.hours + (service.hours || 0)
        });
      });
      const totalServiceRevenue = Array.from(serviceStatsMap.values())
        .reduce((sum, data) => sum + data.revenue, 0);
      const serviceStatsArray: ServiceStats[] = Array.from(serviceStatsMap.entries())
        .map(([name, data]) => ({
          name: name.length > 30 ? name.substring(0, 30) + '...' : name,
          count: data.count,
          revenue: data.revenue,
          hours: data.hours,
          percentage: totalServiceRevenue > 0 ? (data.revenue / totalServiceRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setServiceStats(serviceStatsArray);

      // Graphique nombre de factures par mois - Utilisation des vraies données
      const monthlyInvoicesData: MonthlyInvoicesData[] = [];
      for (let month = 0; month < 12; month++) {
        const date = new Date(selectedYear, month, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(selectedYear, month + 1, 0).toISOString().split('T')[0];
        
        // Factures créées ce mois (basées sur la date d'émission)
        const monthInvoicesCreated = invoices.filter(inv => {
          const invoiceDate = new Date(inv.date).toISOString().split('T')[0];
          return invoiceDate >= monthStart && invoiceDate <= monthEnd;
        });
        
        // Factures payées ce mois (basées sur paid_date si disponible, sinon date)
        const monthInvoicesPaid = invoices.filter(inv => {
          if (inv.status !== 'paid') return false;
          const paidDate = inv.paid_date ? new Date(inv.paid_date).toISOString().split('T')[0] : inv.date;
          return paidDate >= monthStart && paidDate <= monthEnd;
        });
        
        // Factures en attente créées ce mois
        const monthInvoicesPending = invoices.filter(inv => {
          if (inv.status !== 'sent') return false;
          const invoiceDate = new Date(inv.date).toISOString().split('T')[0];
          return invoiceDate >= monthStart && invoiceDate <= monthEnd;
        });
        
        // Factures en retard : créées ce mois ET dont l'échéance est passée
        const monthInvoicesOverdue = invoices.filter(inv => {
          if (inv.status !== 'sent') return false;
          const invoiceDate = new Date(inv.date).toISOString().split('T')[0];
          const isCreatedThisMonth = invoiceDate >= monthStart && invoiceDate <= monthEnd;
          const isOverdue = new Date(inv.due_date) < new Date(currentDate);
          return isCreatedThisMonth && isOverdue;
        });
        
        monthlyInvoicesData.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          count: monthInvoicesCreated.length,
          paid: monthInvoicesPaid.length,
          pending: monthInvoicesPending.length,
          overdue: monthInvoicesOverdue.length
        });
      }
      setMonthlyInvoices(monthlyInvoicesData);

      // Comparaison période N vs N-1
      const previousYear = selectedYear - 1;
      const previousYearInvoices = paidInvoices.filter(inv => 
        new Date(inv.date).getFullYear() === previousYear
      );
      const previousYearRevenue = previousYearInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const currentRevenue = annualRevenueBrut;
      const change = currentRevenue - previousYearRevenue;
      const changePercent = previousYearRevenue > 0 ? (change / previousYearRevenue) * 100 : 0;
      setComparisonData({
        current: currentRevenue,
        previous: previousYearRevenue,
        change,
        changePercent
      });

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
      setIsUpdatingYear(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  const chartData = periodFilter === 'year' ? monthlyRevenue : 
                   periodFilter === 'quarter' ? quarterlyRevenue : 
                   monthlyRevenue.slice(-3);

  return (
    <div className="space-y-4 bg-gray-50 dark:bg-gray-900 min-h-screen -mt-4 pt-4 pb-8">
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
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center animate-bounce">
            <FileX className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 animate-pulse">
            Aucune donnée disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Commencez par créer des clients et des factures pour voir vos statistiques ici.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              type="button"
              onClick={() => onPageChange?.('clients')}
              className="inline-flex items-center justify-center px-2 py-2 sm:px-6 sm:py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Gérer les clients</span>
              <span className="sm:hidden">Gérer clients</span>
            </button>
            <button
              type="button"
              onClick={() => onPageChange?.('invoices')}
              className="inline-flex items-center justify-center px-2 py-2 sm:px-6 sm:py-3 bg-green-600 dark:bg-green-500 text-white rounded-full hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm sm:text-base font-medium shadow-sm hover:shadow-md"
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

      {/* KPI Cards Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
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
            <TrendingUp className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400" />
            <span>Toutes les factures payées</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
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

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
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
            <Percent className="w-4 h-4 mr-1 text-red-500 dark:text-red-400" />
            <span>{formatPercent(kpiData.contributionRate)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
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

      {/* KPI Cards Supplémentaires - Revenus et Paiements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform">
            <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Montant moyen par facture</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.averageInvoiceAmount)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Taux de paiement à temps</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatPercent(kpiData.onTimePaymentRate)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures en retard</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.overdueAmount)}
            </p>
          </div>
          <div className="mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <XCircle className="w-4 h-4 mr-1 text-orange-500" />
            <span>{kpiData.overdueInvoices} facture(s)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
          <div className="absolute top-4 right-4 p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Encaissé ce mois</p>
            <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {formatCurrency(kpiData.monthlyCollectedAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Compte de résultat */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Compte de résultat</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4">Élément</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 text-right">Année {selectedYear}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              <tr>
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">Chiffre d'affaires brut</td>
                <td className="py-3 pr-4 font-medium text-right text-gray-900 dark:text-white">{formatCurrency(kpiData.totalRevenueBrut)}</td>
                <td className="py-3 text-right text-gray-900 dark:text-white">{formatCurrency(kpiData.annualRevenueBrut)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">Cotisations URSSAF</td>
                <td className="py-3 pr-4 font-medium text-right text-red-600 dark:text-red-400">{formatCurrency(kpiData.totalContributions)}</td>
                <td className="py-3 text-right text-red-600 dark:text-red-400">{formatCurrency(kpiData.annualContributions)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">Chiffre d'affaires net</td>
                <td className="py-3 pr-4 font-medium text-right text-green-600 dark:text-green-400">{formatCurrency(kpiData.totalRevenueNet)}</td>
                <td className="py-3 text-right text-green-600 dark:text-green-400">{formatCurrency(kpiData.annualRevenueNet)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                <td className="py-3 pr-4 font-semibold text-gray-900 dark:text-white">Marge nette</td>
                <td className="py-3 pr-4 font-semibold text-right text-gray-900 dark:text-white">{formatPercent(kpiData.netMargin)}</td>
                <td className="py-3 font-semibold text-right text-gray-900 dark:text-white">{formatPercent(kpiData.netMargin)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graphique Principal - Évolution Complète CA Brut, Net et Cotisations */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Évolution Mensuelle du Chiffre d'Affaires</h3>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear - 1)}
              disabled={isUpdatingYear}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm relative">
              {isUpdatingYear && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
              <span className={`text-base font-bold text-gray-900 dark:text-white min-w-[80px] text-center block ${isUpdatingYear ? 'opacity-50' : ''}`}>
                {selectedYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear + 1)}
              disabled={selectedYear >= new Date().getFullYear() || isUpdatingYear}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 dark:disabled:hover:from-blue-500 dark:disabled:hover:to-blue-600 disabled:transform-none"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        {monthlyRevenue.length > 0 ? (
          <div className="h-96 relative">
            {!monthlyRevenue.some(m => m.revenueBrut > 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  {/* CA Brut - Dégradé bleu/violet élégant */}
                  <linearGradient id="brutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="brutStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366F1"/>
                    <stop offset="100%" stopColor="#3B82F6"/>
                  </linearGradient>
                  
                  {/* CA Net - Dégradé vert émeraude */}
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#059669" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="netStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10B981"/>
                    <stop offset="100%" stopColor="#059669"/>
                  </linearGradient>
                  
                  {/* Cotisations - Dégradé rose/corail */}
                  <linearGradient id="contributionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F472B6" stopOpacity={0.8}/>
                    <stop offset="50%" stopColor="#EF4444" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="contributionsStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F472B6"/>
                    <stop offset="100%" stopColor="#EF4444"/>
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
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => (
                    <span style={{ color: getThemeColors().text, fontSize: '12px', fontWeight: '500' }}>
                      {value}
                    </span>
                  )}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenueBrut" 
                  fill="url(#brutGradient)" 
                  stroke="url(#brutStroke)" 
                  strokeWidth={3}
                  name="CA Brut"
                  animationDuration={1000}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenueNet" 
                  fill="url(#netGradient)" 
                  stroke="url(#netStroke)" 
                  strokeWidth={3}
                  name="CA Net"
                  animationDuration={1200}
                />
                <Area 
                  type="monotone" 
                  dataKey="contributions" 
                  fill="url(#contributionsGradient)" 
                  stroke="url(#contributionsStroke)" 
                  strokeWidth={3}
                  name="Cotisations"
                  animationDuration={1300}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-96 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
              <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                <XAxis />
                <YAxis />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Styles pour l'animation des barres au survol */}
      <style>{`
        .recharts-bar-rectangle {
          transition: all 0.3s ease !important;
          transform-origin: bottom;
        }
        .recharts-bar-rectangle:hover {
          transform: scaleY(1.05) !important;
          opacity: 0.9 !important;
          filter: brightness(1.1) !important;
        }
        .recharts-tooltip-wrapper {
          background-color: transparent !important;
          background: transparent !important;
        }
        .recharts-default-tooltip {
          background-color: transparent !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
      `}</style>

      {/* Graphiques Comparatifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparaison Trimestrielle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comparaison Trimestrielle</h3>
          {quarterlyRevenue.length > 0 ? (
            <div className="h-80 relative">
              {!quarterlyRevenue.some(q => q.revenueBrut > 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg">
                  <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="barBrutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1"/>
                      <stop offset="100%" stopColor="#3B82F6"/>
                    </linearGradient>
                    <linearGradient id="barNetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981"/>
                      <stop offset="100%" stopColor="#059669"/>
                    </linearGradient>
                    <linearGradient id="barContributionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F472B6"/>
                      <stop offset="100%" stopColor="#EF4444"/>
                    </linearGradient>
                  </defs>
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
                    content={<CustomTooltip />}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Legend 
                    formatter={(value) => (
                      <span style={{ color: getThemeColors().text, fontSize: '12px', fontWeight: '500' }}>
                        {value}
                      </span>
                    )}
                  />
                  <Bar 
                    dataKey="revenueBrut" 
                    fill="url(#barBrutGradient)" 
                    name="CA Brut" 
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="revenueNet" 
                    fill="url(#barNetGradient)" 
                    name="CA Net" 
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="contributions" 
                    fill="url(#barContributionsGradient)" 
                    name="Cotisations" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[]} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={getThemeColors().grid} strokeOpacity={0.3} vertical={false} />
                  <XAxis />
                  <YAxis />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Répartition CA Brut / Cotisations / CA Net */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Répartition Globale</h3>
          {kpiData.annualRevenueBrut > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="pieBrutGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                    <linearGradient id="pieContributionsGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#F9A8D4" />
                      <stop offset="100%" stopColor="#F472B6" />
                    </linearGradient>
                    <linearGradient id="pieNetGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34D399" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'CA Brut', value: kpiData.annualRevenueBrut, color: '#6366F1' },
                      { name: 'Cotisations', value: kpiData.annualContributions, color: '#F472B6' },
                      { name: 'CA Net', value: kpiData.annualRevenueNet, color: '#10B981' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    innerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1200}
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={3}
                  >
                    {[
                      { name: 'CA Brut', value: kpiData.annualRevenueBrut, color: 'url(#pieBrutGradient)' },
                      { name: 'Cotisations', value: kpiData.annualContributions, color: 'url(#pieContributionsGradient)' },
                      { name: 'CA Net', value: kpiData.annualRevenueNet, color: 'url(#pieNetGradient)' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <text
                    x="50%"
                    y="42%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={getThemeColors().text}
                    style={{ fontWeight: 700, fontSize: '20px' }}
                  >
                    {formatCurrency(kpiData.annualRevenueNet)}
                  </text>
                  <text
                    x="50%"
                    y="52%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={getThemeColors().textSecondary}
                    style={{ fontWeight: 500, fontSize: '13px' }}
                  >
                    CA Net
                  </text>
                  <text
                    x="50%"
                    y="62%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={getThemeColors().textSecondary}
                    style={{ fontWeight: 400, fontSize: '11px', opacity: 0.7 }}
                  >
                    {formatCurrency(kpiData.annualRevenueBrut)} brut
                  </text>
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: getThemeColors().text, fontSize: '12px', fontWeight: '500' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 relative">
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <PieChartIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    innerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 💳 Détails Paiements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">💳 Détails Paiements</h3>
        
        {/* Répartition par méthode de paiement */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Répartition par méthode de paiement</h4>
            <div className="space-y-3">
              {paymentMethods.map((pm, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-900 dark:text-white">{pm.method}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({pm.count} paiement{pm.count > 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                      {formatCurrency(pm.amount)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
                      {formatPercent(pm.percentage)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Montant total encaissé ce mois-ci</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.monthlyCollectedAmount)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Montant des avoirs/remboursements</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.refundsAmount)}</p>
          </div>
        </div>
      </div>

      {/* 👥 Statistiques Clients */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">👥 Statistiques Clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre total de clients actifs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.activeClients}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nouveaux clients ce mois</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpiData.newClientsThisMonth}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Clients inactifs (90+ jours)</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpiData.inactiveClientsCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taux de fidélisation</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPercent(kpiData.clientRetentionRate)}</p>
          </div>
        </div>
      </div>

      {/* 🧾 Statistiques Factures */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">🧾 Statistiques Factures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures émises ce mois</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.invoicesThisMonth}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Temps moyen de paiement</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(kpiData.averagePaymentTime)} jours</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures récurrentes</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpiData.recurringInvoices}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures uniques</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{kpiData.uniqueInvoices}</p>
          </div>
        </div>

        {/* Graphique nombre de factures par mois */}
        {monthlyInvoices.length > 0 && monthlyInvoices.some(m => m.count > 0) ? (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nombre de factures par mois - Année {selectedYear}</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyInvoices} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#D97706" stopOpacity={0.5}/>
                    </linearGradient>
                    <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0.5}/>
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
                    allowDecimals={false}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const themeColors = getThemeColors();
                      const data = payload[0].payload;
                      return (
                        <div 
                          style={{
                            backgroundColor: themeColors.tooltipBg,
                            color: themeColors.tooltipText,
                            border: 'none',
                            borderRadius: '12px',
                            padding: '12px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            fontSize: '14px'
                          }}
                        >
                          <p style={{ marginBottom: '8px', fontWeight: 600, color: themeColors.tooltipText }}>
                            {label} {selectedYear}
                          </p>
                          <p style={{ margin: '4px 0', color: '#10B981' }}>
                            <span style={{ marginRight: '8px' }}>●</span>
                            Payées: <strong>{data.paid}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: '#F59E0B' }}>
                            <span style={{ marginRight: '8px' }}>●</span>
                            En attente: <strong>{data.pending}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: '#EF4444' }}>
                            <span style={{ marginRight: '8px' }}>●</span>
                            En retard: <strong>{data.overdue}</strong>
                          </p>
                          <p style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${themeColors.grid}`, fontWeight: 600 }}>
                            Total: <strong>{data.count}</strong>
                          </p>
                        </div>
                      );
                    }}
                    cursor={{ fill: 'transparent' }} 
                  />
                  <Legend 
                    formatter={(value) => (
                      <span style={{ color: getThemeColors().text, fontSize: '12px', fontWeight: '500' }}>
                        {value === 'paid' ? 'Payées' : value === 'pending' ? 'En attente' : 'En retard'}
                      </span>
                    )}
                  />
                  <Bar 
                    dataKey="paid" 
                    stackId="a" 
                    fill="url(#paidGradient)" 
                    name="paid"
                    shape={(props: any) => {
                      const { payload, x, y, width, height, fill } = props;
                      // Si overdue et pending sont à 0, cette barre est en haut -> arrondi en haut
                      const isTop = payload.overdue === 0 && payload.pending === 0 && payload.paid > 0;
                      // Toujours arrondi en bas, arrondi en haut seulement si c'est la barre du haut
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fill}
                          rx={0}
                          ry={0}
                          style={{
                            clipPath: isTop 
                              ? 'inset(0 0 0 0 round 8px 8px 8px 8px)'
                              : 'inset(0 0 0 0 round 0px 0px 8px 8px)'
                          }}
                        />
                      );
                    }}
                  />
                  <Bar 
                    dataKey="pending" 
                    stackId="a" 
                    fill="url(#pendingGradient)" 
                    name="pending"
                    shape={(props: any) => {
                      const { payload, x, y, width, height, fill } = props;
                      // Si overdue est à 0, cette barre est en haut -> arrondi en haut
                      const isTop = payload.overdue === 0 && payload.pending > 0;
                      // Jonction droite en bas (avec paid), arrondi en haut seulement si c'est la barre du haut
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fill}
                          rx={0}
                          ry={0}
                          style={{
                            clipPath: isTop 
                              ? 'inset(0 0 0 0 round 8px 8px 0px 0px)'
                              : 'inset(0 0 0 0 round 0px 0px 0px 0px)'
                          }}
                        />
                      );
                    }}
                  />
                  <Bar 
                    dataKey="overdue" 
                    stackId="a" 
                    fill="url(#overdueGradient)" 
                    name="overdue"
                    shape={(props: any) => {
                      const { x, y, width, height, fill } = props;
                      // Toujours la barre du haut, arrondi en haut, jonction droite en bas
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={width}
                          height={height}
                          fill={fill}
                          rx={0}
                          ry={0}
                          style={{
                            clipPath: 'inset(0 0 0 0 round 8px 8px 0px 0px)'
                          }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="h-80 relative flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
            <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible pour {selectedYear}</p>
          </div>
        )}
      </div>

      {/* 🧰 Statistiques Prestations / Services */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">🧰 Statistiques Prestations / Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre de prestations réalisées</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.totalServices}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Prestations ce mois</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpiData.servicesThisMonth}</p>
          </div>
        </div>

        {/* Prestations les plus vendues */}
        {serviceStats.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top prestations par revenus</h4>
            <div className="space-y-3">
              {serviceStats.slice(0, 5).map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-900 dark:text-white">{service.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({service.count}x)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{service.hours.toFixed(1)}h</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                      {formatCurrency(service.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 📅 Statistiques Temporelles - Comparaison */}
      {comparisonData && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">📅 Comparaison Annuelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Année {selectedYear}</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(comparisonData.current)}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-800/20 p-6 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Année {selectedYear - 1}</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">{formatCurrency(comparisonData.previous)}</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Évolution</span>
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-bold ${comparisonData.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {comparisonData.change >= 0 ? '+' : ''}{formatCurrency(comparisonData.change)}
                </span>
                <span className={`text-sm font-semibold ${comparisonData.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ({comparisonData.changePercent >= 0 ? '+' : ''}{formatPercent(comparisonData.changePercent)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Clients par CA */}
      {clientRevenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top clients par CA Brut</h3>
          <div className="space-y-4">
            {clientRevenue.slice().reverse().map((client, index) => {
              const maxRevenue = Math.max(...clientRevenue.map(c => c.revenueBrut));
              const percentage = (client.revenueBrut / maxRevenue) * 100;
              const colorIndex = index % COLORS.length;
              const color = COLORS[colorIndex];
              
              return (
                <div key={index} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{client.name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatPercent(client.percentage)}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white min-w-[100px] text-right">
                        {formatCurrency(client.revenueBrut)}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${COLORS[colorIndex]}20, ${color})`,
                        boxShadow: `0 0 10px ${color}40`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{client.invoices} facture{client.invoices > 1 ? 's' : ''}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-green-600 dark:text-green-400">
                        Net: {formatCurrency(client.revenueNet)}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        Cotisations: {formatCurrency(client.contributions)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tableau Détaillé par Période */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 lg:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistiques détaillées par période</h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedYear(selectedYear - 1)}
                disabled={isUpdatingYear}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-5 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm relative">
                {isUpdatingYear && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                )}
                <span className={`text-base font-bold text-gray-900 dark:text-white min-w-[80px] text-center block ${isUpdatingYear ? 'opacity-50' : ''}`}>
                  {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedYear(selectedYear + 1)}
                disabled={selectedYear >= new Date().getFullYear() || isUpdatingYear}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 dark:disabled:hover:from-blue-500 dark:disabled:hover:to-blue-600 disabled:transform-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex justify-start">
            <div 
              ref={(node) => {
                // Calculer immédiatement quand le conteneur est monté
                if (node) {
                  const updateIndicator = () => {
                    let activeButton: HTMLButtonElement | null = null;
                    
                    if (periodFilter === 'year') {
                      activeButton = yearButtonRef.current;
                    } else if (periodFilter === 'quarter') {
                      activeButton = quarterButtonRef.current;
                    } else if (periodFilter === 'month') {
                      activeButton = monthButtonRef.current;
                    }

                    if (activeButton) {
                      const container = activeButton.parentElement;
                      if (container) {
                        const containerRect = container.getBoundingClientRect();
                        const buttonRect = activeButton.getBoundingClientRect();
                        
                        if (buttonRect.width > 0 && containerRect.width > 0) {
                          setIndicatorStyle({
                            width: buttonRect.width,
                            left: buttonRect.left - containerRect.left
                          });
                        }
                      }
                    }
                  };
                  
                  // Double requestAnimationFrame pour synchroniser avec le navigateur
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      updateIndicator();
                    });
                  });
                }
              }}
              className="relative inline-flex items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-full"
            >
              {/* Indicateur animé qui glisse */}
              {indicatorStyle.width > 0 && (
                <div
                  className="absolute h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 shadow-md"
                  style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                    transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'left, width'
                  }}
                />
              )}
              <button
                ref={yearButtonRef}
                type="button"
                onClick={() => setPeriodFilter('year')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  periodFilter === 'year'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Année
              </button>
              <button
                ref={quarterButtonRef}
                type="button"
                onClick={() => setPeriodFilter('quarter')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  periodFilter === 'quarter'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Trimestre
              </button>
              <button
                ref={monthButtonRef}
                type="button"
                onClick={() => setPeriodFilter('month')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  periodFilter === 'month'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-visible">
          <div className="min-w-full">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {periodFilter === 'quarter' ? 'Trimestre' : periodFilter === 'year' ? 'Mois' : 'Mois'}
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>CA Brut</span>
                    </div>
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <Calculator className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span>Cotisations</span>
                    </div>
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <Euro className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span>CA Net</span>
                    </div>
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span>Factures</span>
                    </div>
                  </th>
                  <th className="text-right py-4 px-4 font-semibold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center justify-end gap-2">
                      <Percent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span>Taux</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {chartData.map((item, index) => (
                  <tr 
                    key={index} 
                    className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-700/50 dark:hover:to-gray-700/30 transition-all duration-300 ease-out group cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-150"></div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                          {periodFilter === 'quarter' ? (item as QuarterlyRevenue).quarter : (item as MonthlyRevenue).month}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:font-bold transition-all duration-300 group-hover:scale-105 inline-block">
                        {formatCurrency(item.revenueBrut)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:font-bold transition-all duration-300 group-hover:scale-105 inline-block">
                        {formatCurrency(item.contributions)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400 group-hover:font-bold transition-all duration-300 group-hover:scale-105 inline-block">
                        {formatCurrency(item.revenueNet)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300">
                        {item.invoices}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:font-bold transition-all duration-300 group-hover:scale-105 inline-block">
                        {formatPercent('contributionRate' in item ? item.contributionRate : (item.contributions / item.revenueBrut) * 100)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/30 dark:to-gray-800/30">
                  <td className="py-4 px-4">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">Total</span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueBrut, 0))}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(chartData.reduce((sum, item) => sum + item.contributions, 0))}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueNet, 0))}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {chartData.reduce((sum, item) => sum + item.invoices, 0)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatPercent(
                        chartData.reduce((sum, item) => sum + item.revenueBrut, 0) > 0
                          ? (chartData.reduce((sum, item) => sum + item.contributions, 0) / chartData.reduce((sum, item) => sum + item.revenueBrut, 0)) * 100
                          : 0
                      )}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Statistiques Supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Factures en attente</h3>
            <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
            {kpiData.pendingInvoices}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatCurrency(kpiData.pendingAmount)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Factures en retard</h3>
            <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
            {kpiData.overdueInvoices}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nécessitent un suivi
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Montant moyen</h3>
            <Receipt className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
            {formatCurrency(kpiData.averageInvoiceAmount)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Par facture payée
          </p>
        </div>
      </div>
    </div>
  );
}
