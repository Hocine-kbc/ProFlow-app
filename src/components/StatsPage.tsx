import { useState, useEffect, useRef, useMemo } from 'react';
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
  FileX,
  FileSpreadsheet as FileSpreadsheetIcon,
  FileText as FileTextIcon,
  BookOpen,
  Search,
  CreditCard,
  Briefcase,
  Trophy,
  Calendar
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
import { Expense } from '../types/index.ts';
import AnimatedNumber from './AnimatedNumber.tsx';
import HalfGauge from './HalfGauge.tsx';
import { 
  exportStatsToExcel, 
  exportStatsToPdf, 
  StatsExportPayload, 
  StatsExportKpiEntry, 
  StatsExportPeriodRow, 
  StatsExportInvoiceRow, 
  StatsExportClientRow 
} from '../lib/exports/statsExport';
import {
  exportReceiptsLedgerToExcel,
  exportReceiptsLedgerToPdf,
  ReceiptsLedgerPayload,
  ReceiptEntry
} from '../lib/exports/livretRecettes';

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
  expenses: number;
  netProfit: number;
}

interface QuarterlyRevenue {
  quarter: string;
  revenueBrut: number;
  revenueNet: number;
  contributions: number;
  invoices: number;
  expenses: number;
  netProfit: number;
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
  const [kpiPeriodFilter, setKpiPeriodFilter] = useState<'year' | 'quarter' | 'month'>('year');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedKpiYear, setSelectedKpiYear] = useState(new Date().getFullYear());
  const [selectedKpiQuarter, setSelectedKpiQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedKpiMonth, setSelectedKpiMonth] = useState(new Date().getMonth() + 1);
  const [hasGlobalPaidInvoices, setHasGlobalPaidInvoices] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => 
    document.documentElement.classList.contains('dark')
  );
  const [exportingFormat, setExportingFormat] = useState<'excel' | 'pdf' | null>(null);
  const [receiptsExportingFormat, setReceiptsExportingFormat] = useState<'excel' | 'pdf' | null>(null);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);

  const clientMap = useMemo(() => {
    const map = new Map<string, any>();
    allClients.forEach((client: any) => {
      if (client && client.id) {
        map.set(client.id, client);
      }
    });
    return map;
  }, [allClients]);

  const companyIdentity = useMemo(() => {
    try {
      const raw = localStorage.getItem('business-settings');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        companyName: parsed.companyName || parsed.companyname || ''
      };
    } catch {
      return null;
    }
  }, []);
  
  // Refs pour les boutons de période
  const yearButtonRef = useRef<HTMLButtonElement>(null);
  const quarterButtonRef = useRef<HTMLButtonElement>(null);
  const monthButtonRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  
  // Refs pour les boutons de période KPI
  const kpiYearButtonRef = useRef<HTMLButtonElement>(null);
  const kpiQuarterButtonRef = useRef<HTMLButtonElement>(null);
  const kpiMonthButtonRef = useRef<HTMLButtonElement>(null);
  const [kpiIndicatorStyle, setKpiIndicatorStyle] = useState({ width: 0, left: 0 });
  

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

  const chartPalette = {
    revenueBrut: { base: '#4B6BFB', dark: '#1D4ED8' },
    revenueNet: { base: '#2DD4BF', dark: '#0F766E' },
    contributions: { base: '#E76F51', dark: '#C2410C' },
    invoicesPaid: { base: '#0EA5E9', dark: '#0369A1' },
    invoicesPending: { base: '#F4A261', dark: '#B45309' },
    invoicesOverdue: { base: '#F97316', dark: '#C2410C' },
    expenses: { base: '#F43F5E', dark: '#BE123C' },
    netProfit: { base: '#8B5CF6', dark: '#6D28D9' }
  } as const;

  const COLORS = [
    '#4B6BFB',
    '#0EA5E9',
    '#2DD4BF',
    '#E76F51',
    '#F4A261',
    '#A855F7',
    '#22C55E',
    '#38BDF8',
    '#F472B6',
    '#64748B'
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

  // Mise à jour des KPI lors du changement de période KPI
  useEffect(() => {
    if (loading) return;
    fetchStatistics(false);
  }, [kpiPeriodFilter, selectedKpiYear, selectedKpiQuarter, selectedKpiMonth]);

  // Mettre à jour la position de l'indicateur animé
  useEffect(() => {
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

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateIndicator);
    });
    
    window.addEventListener('resize', updateIndicator);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [periodFilter, loading]);
  
  // Mettre à jour la position de l'indicateur animé pour les KPI
  useEffect(() => {
    if (loading) return;
    
    const updateKpiIndicator = () => {
      let activeButton: HTMLButtonElement | null = null;
      
      if (kpiPeriodFilter === 'year') {
        activeButton = kpiYearButtonRef.current;
      } else if (kpiPeriodFilter === 'quarter') {
        activeButton = kpiQuarterButtonRef.current;
      } else if (kpiPeriodFilter === 'month') {
        activeButton = kpiMonthButtonRef.current;
      }

      if (activeButton) {
        const container = activeButton.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          
          if (buttonRect.width > 0 && containerRect.width > 0) {
            setKpiIndicatorStyle({
              width: buttonRect.width,
              left: buttonRect.left - containerRect.left
            });
          }
        }
      }
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateKpiIndicator);
    });
    
    window.addEventListener('resize', updateKpiIndicator);
    
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateKpiIndicator);
    };
  }, [kpiPeriodFilter, loading]);

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
      setAllInvoices(invoices);

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) {
        console.error('Erreur lors de la récupération des clients:', clientsError);
        return;
      }

      const clients = clientsData || [];
      setAllClients(clients);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) {
        console.error('Erreur lors de la récupération des dépenses:', expensesError);
      }

      const expenses = (expensesData || []) as Expense[];

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];

      // Fonction utilitaire pour extraire la date au format YYYY-MM-DD
      // Cette fonction garantit que nous utilisons toujours la date de création, pas la date de paiement
      // IMPORTANT: Cette fonction extrait UNIQUEMENT la partie date, sans tenir compte de l'heure ou du fuseau horaire
      const extractDateStr = (dateValue: any): string | null => {
        if (!dateValue) return null;
        
        if (typeof dateValue === 'string') {
          // Si c'est déjà une string au format YYYY-MM-DD, la retourner directement
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateValue;
          }
          
          // Si la date contient une heure (format ISO), extraire uniquement la partie date
          if (dateValue.includes('T')) {
            return dateValue.split('T')[0];
          }
          
          // Si la date est au format YYYY-MM-DD avec des espaces ou autres caractères, extraire la partie date
          const dateMatch = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
          
          // Sinon, essayer de parser la date
          // ATTENTION: new Date() peut interpréter les dates différemment selon le format
          // Pour éviter les problèmes de fuseau horaire, on extrait directement les composants
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            console.warn(`⚠️ Impossible de parser la date: ${dateValue}`);
            return null;
          }
          
          // Utiliser les méthodes locales (getFullYear, getMonth, getDate) pour éviter les problèmes UTC
          // Mais s'assurer que la date est interprétée comme locale, pas UTC
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        
        return null;
      };

      const getClientName = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        return client?.name || 'Client inconnu';
      };

      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      
      // Vérifier s'il y a des factures payées globalement (pour l'affichage du message "Aucune donnée")
      setHasGlobalPaidInvoices(paidInvoices.length > 0);
      
      // Calculer les KPI selon la période sélectionnée
      let periodPaidInvoices = paidInvoices;
      
      if (kpiPeriodFilter === 'year') {
        // Annuel : toutes les factures de l'année sélectionnée
        periodPaidInvoices = paidInvoices.filter(inv => {
          const invoiceDate = new Date(inv.date);
          return invoiceDate.getFullYear() === selectedKpiYear;
        });
      } else if (kpiPeriodFilter === 'quarter') {
        // Trimestriel : factures du trimestre sélectionné
        const quarterStartMonth = (selectedKpiQuarter - 1) * 3;
        const quarterEndMonth = quarterStartMonth + 2;
        const quarterStartStr = `${selectedKpiYear}-${String(quarterStartMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedKpiYear, quarterEndMonth + 1, 0).getDate();
        const quarterEndStr = `${selectedKpiYear}-${String(quarterEndMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        periodPaidInvoices = paidInvoices.filter(inv => {
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= quarterStartStr && invoiceDateStr <= quarterEndStr;
        });
      } else if (kpiPeriodFilter === 'month') {
        // Mensuel : factures du mois sélectionné
        const monthStartStr = `${selectedKpiYear}-${String(selectedKpiMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedKpiYear, selectedKpiMonth, 0).getDate();
        const monthEndStr = `${selectedKpiYear}-${String(selectedKpiMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        periodPaidInvoices = paidInvoices.filter(inv => {
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
        });
      }
      
      const totalRevenueBrut = periodPaidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const totalContributions = calculateContributions(totalRevenueBrut);
      const totalRevenueNet = totalRevenueBrut - totalContributions;

      const annualPaidInvoices = paidInvoices.filter(inv => {
        const invoiceDate = new Date(inv.date);
        return invoiceDate.getFullYear() === selectedYear;
      });
      
      const annualRevenueBrut = annualPaidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const annualContributions = calculateContributions(annualRevenueBrut);
      const annualRevenueNet = annualRevenueBrut - annualContributions;

      const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
      const overdueInvoices = pendingInvoices.filter(inv => 
        new Date(inv.due_date) < new Date(currentDate)
      );
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      const activeClients = new Set(periodPaidInvoices.map(inv => inv.client_id)).size;
      const averageInvoiceAmount = periodPaidInvoices.length > 0 
        ? totalRevenueBrut / periodPaidInvoices.length 
        : 0;
      const contributionRate = totalRevenueBrut > 0 
        ? (totalContributions / totalRevenueBrut) * 100 
        : 0;
      const netMargin = totalRevenueBrut > 0 
        ? (totalRevenueNet / totalRevenueBrut) * 100 
        : 0;

      const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      
      // Taux de paiement à temps
      const onTimePaidInvoices = periodPaidInvoices.filter(inv => {
        if (!inv.due_date) {
          return false;
        }
        
        // Utiliser paid_date si disponible, sinon utiliser updated_at comme fallback
        // (pour les factures marquées comme payées avant l'ajout de paid_date)
        let paidDateValue = inv.paid_date;
        if (!paidDateValue && inv.updated_at) {
          // Si pas de paid_date mais qu'il y a un updated_at, l'utiliser comme date de paiement
          paidDateValue = inv.updated_at;
        }
        
        if (!paidDateValue) {
          // Si toujours pas de date, exclure cette facture du calcul
          return false;
        }
        
        // Normaliser les dates pour comparer uniquement la partie date (sans l'heure)
        const paidDateStr = extractDateStr(paidDateValue);
        const dueDateStr = extractDateStr(inv.due_date);
        
        if (!paidDateStr || !dueDateStr) {
          return false;
        }
        
        // Comparer les dates normalisées (format YYYY-MM-DD)
        // Une facture est payée à temps si la date de paiement est <= à la date d'échéance
        return paidDateStr <= dueDateStr;
      });
      const onTimePaymentRate = periodPaidInvoices.length > 0 
        ? (onTimePaidInvoices.length / periodPaidInvoices.length) * 100 
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
        paidInvoices: periodPaidInvoices.length,
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
        // Calculer le premier jour du mois (1er du mois)
        const monthStart = new Date(selectedYear, month, 1);
        const monthStartStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`;
        // Calculer le dernier jour du mois (dernier jour du mois)
        const lastDay = new Date(selectedYear, month + 1, 0).getDate();
        const monthEndStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Filtrer les factures par date de création (date d'émission), pas par date de paiement
        const monthInvoices = paidInvoices.filter(inv => {
          // IMPORTANT: Utiliser inv.date (date de création/émission), PAS inv.paid_date
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          
          // Log de débogage pour vérifier les dates (octobre et novembre)
          if (month === 9 || month === 10) { // Octobre ou Novembre (0-indexed)
            console.log(`🔍 Mois ${month + 1}: Facture ${inv.invoice_number || 'N/A'}: date=${inv.date}, dateStr=${invoiceDateStr}, paid_date=${inv.paid_date || 'N/A'}, monthStart=${monthStartStr}, monthEnd=${monthEndStr}, inRange=${invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr}`);
          }
          
          return invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
        });

        const revenueBrut = monthInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const contributions = calculateContributions(revenueBrut);
        const revenueNet = revenueBrut - contributions;
        const contributionRate = revenueBrut > 0 ? (contributions / revenueBrut) * 100 : 0;

        const monthExpenses = expenses.filter(expense => {
          return expense.date >= monthStartStr && expense.date <= monthEndStr;
        });
        const expensesTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = revenueBrut - expensesTotal;

        monthlyData.push({
          month: monthStart.toLocaleDateString('fr-FR', { month: 'long' }),
          revenueBrut,
          revenueNet,
          contributions,
          invoices: monthInvoices.length,
          contributionRate,
          expenses: expensesTotal,
          netProfit
        });
      }

      setMonthlyRevenue(monthlyData);

      const quarterlyData: QuarterlyRevenue[] = [];
      for (let q = 1; q <= 4; q++) {
        const startMonth = (q - 1) * 3;
        const endMonth = startMonth + 2;
        // Premier jour du trimestre (1er jour du premier mois)
        const quarterStartStr = `${selectedYear}-${String(startMonth + 1).padStart(2, '0')}-01`;
        // Dernier jour du trimestre (dernier jour du dernier mois)
        const lastDay = new Date(selectedYear, endMonth + 1, 0).getDate();
        const quarterEndStr = `${selectedYear}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Filtrer les factures par date de création (date d'émission), pas par date de paiement
        const quarterInvoices = paidInvoices.filter(inv => {
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= quarterStartStr && invoiceDateStr <= quarterEndStr;
        });

        const revenueBrut = quarterInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        const contributions = calculateContributions(revenueBrut);
        const revenueNet = revenueBrut - contributions;

        const quarterExpenses = expenses.filter(expense => {
          return expense.date >= quarterStartStr && expense.date <= quarterEndStr;
        });
        const expensesTotal = quarterExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netProfit = revenueBrut - expensesTotal;

        quarterlyData.push({
          quarter: `T${q}`,
          revenueBrut,
          revenueNet,
          contributions,
          invoices: quarterInvoices.length,
          expenses: expensesTotal,
          netProfit
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
        // Calculer le premier jour du mois (1er du mois)
        const monthStart = new Date(selectedYear, month, 1);
        const monthStartStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-01`;
        // Calculer le dernier jour du mois (dernier jour du mois)
        const lastDay = new Date(selectedYear, month + 1, 0).getDate();
        const monthEndStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        
        // Factures créées ce mois (basées sur la date d'émission)
        const monthInvoicesCreated = invoices.filter(inv => {
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
        });
        
        // Factures payées créées ce mois (basées sur la date de création, pas la date de paiement)
        const monthInvoicesPaid = invoices.filter(inv => {
          if (inv.status !== 'paid') return false;
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
        });
        
        // Factures en attente créées ce mois
        const monthInvoicesPending = invoices.filter(inv => {
          if (inv.status !== 'sent') return false;
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          return invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
        });
        
        // Factures en retard : créées ce mois ET dont l'échéance est passée
        const monthInvoicesOverdue = invoices.filter(inv => {
          if (inv.status !== 'sent') return false;
          const invoiceDateStr = extractDateStr(inv.date);
          if (!invoiceDateStr) return false;
          const isCreatedThisMonth = invoiceDateStr >= monthStartStr && invoiceDateStr <= monthEndStr;
          const isOverdue = new Date(inv.due_date) < new Date(currentDate);
          return isCreatedThisMonth && isOverdue;
        });
        
        monthlyInvoicesData.push({
          month: monthStart.toLocaleDateString('fr-FR', { month: 'long' }),
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
      .format(value)
      .replace(/[\u00A0\u202F]/g, ' ');

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const capitalize = (value: string) => {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getClientNameById = (clientId: string) => {
    if (!clientId) return 'Client inconnu';
    return clientMap.get(clientId)?.name || 'Client inconnu';
  };

  const normalizeDateOnly = (dateValue: any): string | null => {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      if (dateValue.includes('T')) {
        return dateValue.split('T')[0];
      }
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const summarizeInvoiceServices = (invoice: any): string => {
    if (!invoice) return '';
    let servicesData: any[] = [];

    if (Array.isArray(invoice.services)) {
      servicesData = invoice.services;
    } else if (typeof invoice.services === 'string') {
      try {
        const parsed = JSON.parse(invoice.services);
        if (Array.isArray(parsed)) {
          servicesData = parsed;
        }
      } catch {
        // ignore
      }
    }

    const descriptions = servicesData
      .map((service: any) => {
        if (!service) return null;
        if (typeof service === 'string') return service;
        if (typeof service.description === 'string') return service.description;
        if (typeof service.title === 'string') return service.title;
        return null;
      })
      .filter((desc): desc is string => !!desc);

    if (descriptions.length > 0) {
      const summary = descriptions.slice(0, 3).join(', ');
      return descriptions.length > 3 ? `${summary}…` : summary;
    }

    if (typeof invoice.additional_terms === 'string' && invoice.additional_terms.trim().length > 0) {
      return invoice.additional_terms;
    }

    return '';
  };

  const buildReceiptsLedgerPayload = (): ReceiptsLedgerPayload => {
    const entries: ReceiptEntry[] = [];

    allInvoices
      .filter(inv => inv && inv.status === 'paid')
      .forEach(inv => {
        const paidDate = normalizeDateOnly(inv.paid_date || inv.date);
        if (!paidDate) return;
        const paidYear = Number(paidDate.slice(0, 4));
        if (paidYear !== selectedYear) return;

        const amount = Number(inv.subtotal || 0);
        const paymentMethodRaw = inv.payment_method || inv.paymentMethod;
        const paymentMethod = paymentMethodRaw
          ? capitalize(String(paymentMethodRaw))
          : 'Non précisé';

        const entry: ReceiptEntry = {
          date: paidDate,
          invoiceNumber: inv.invoice_number || inv.number || '—',
          clientName: getClientNameById(inv.client_id),
          description: summarizeInvoiceServices(inv) || 'Prestation facturée',
          amount,
          paymentMethod,
          notes: ''
        };

        entries.push(entry);
      });

    entries.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.invoiceNumber.localeCompare(b.invoiceNumber);
    });

    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      year: selectedYear,
      companyName: companyIdentity?.companyName,
      generatedAt: new Date().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }),
      entries,
      totalAmount
    };
  };

  const getChartPeriodLabel = () => {
    if (periodFilter === 'year') {
      return `Année ${selectedYear}`;
    }
    if (periodFilter === 'quarter') {
      return `Trimestres ${selectedYear}`;
    }
    return `Vue mensuelle ${selectedYear}`;
  };

  const getKpiPeriodLabel = () => {
    if (kpiPeriodFilter === 'year') {
      return `Année ${selectedKpiYear}`;
    }
    if (kpiPeriodFilter === 'quarter') {
      return `T${selectedKpiQuarter} ${selectedKpiYear}`;
    }
    const monthLabel = new Date(selectedKpiYear, selectedKpiMonth - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
    return `${capitalize(monthLabel)} ${selectedKpiYear}`;
  };

  const buildExportPayload = (): StatsExportPayload => {
    const metadata = {
      chartLabel: getChartPeriodLabel(),
      kpiLabel: getKpiPeriodLabel(),
      generatedAt: new Date().toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    };

    const kpiEntries: StatsExportKpiEntry[] = [
      { label: 'CA Brut total', value: kpiData.totalRevenueBrut, format: 'currency' },
      { label: 'CA Net total', value: kpiData.totalRevenueNet, format: 'currency' },
      { label: 'Cotisations totales', value: kpiData.totalContributions, format: 'currency' },
      { label: 'Factures payées', value: kpiData.paidInvoices, format: 'number' },
      { label: 'Clients actifs', value: kpiData.activeClients, format: 'number' },
      { label: 'Factures en attente', value: kpiData.pendingInvoices, format: 'number' },
      { label: 'Factures en retard', value: kpiData.overdueInvoices, format: 'number' },
      { label: 'Montant en retard', value: kpiData.overdueAmount, format: 'currency' },
      { label: 'Taux paiement à temps', value: kpiData.onTimePaymentRate, format: 'percent' },
      { label: 'Montant moyen facture', value: kpiData.averageInvoiceAmount, format: 'currency' },
      { label: 'Temps de paiement moyen', value: kpiData.averagePaymentTime, format: 'days' }
    ];

    const periodDataSource: (MonthlyRevenue | QuarterlyRevenue)[] =
      periodFilter === 'quarter'
        ? quarterlyRevenue
        : periodFilter === 'month'
          ? monthlyRevenue
          : yearSummary;

    const periodRows: StatsExportPeriodRow[] = periodDataSource.map((item) => {
      if ('quarter' in item) {
        const contributionRate = item.revenueBrut > 0 ? (item.contributions / item.revenueBrut) * 100 : 0;
        return {
          label: `${item.quarter} ${selectedYear}`,
          revenueBrut: item.revenueBrut,
          revenueNet: item.revenueNet,
          contributions: item.contributions,
          invoices: item.invoices,
          contributionRate
        };
      }

      return {
        label: `${capitalize(item.month)} ${selectedYear}`,
        revenueBrut: item.revenueBrut,
        revenueNet: item.revenueNet,
        contributions: item.contributions,
        invoices: item.invoices,
        contributionRate: item.contributionRate
      };
    });

    const invoicesRows: StatsExportInvoiceRow[] = monthlyInvoices.map((item) => ({
      label: `${capitalize(item.month)} ${selectedYear}`,
      paid: item.paid,
      pending: item.pending,
      overdue: item.overdue,
      total: item.count
    }));

    const topClients: StatsExportClientRow[] = clientRevenue.map((client) => ({
      name: client.name,
      revenueBrut: client.revenueBrut,
      revenueNet: client.revenueNet,
      contributions: client.contributions,
      invoices: client.invoices,
      percentage: client.percentage
    }));

    return {
      metadata,
      kpis: kpiEntries,
      periodRows,
      invoicesRows,
      topClients
    };
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      const payload: StatsExportPayload = buildExportPayload();
      if (format === 'excel') {
        exportStatsToExcel(payload);
      } else {
        exportStatsToPdf(payload);
      }
    } catch (error) {
      console.error('Erreur lors de l\'export des statistiques:', error);
      window.alert('Impossible de générer le fichier. Merci de réessayer.');
    } finally {
      setExportingFormat(null);
    }
  };

  const handleReceiptsExport = (format: 'excel' | 'pdf') => {
    if (receiptsExportingFormat) return;
    setReceiptsExportingFormat(format);
    try {
      const payload: ReceiptsLedgerPayload = buildReceiptsLedgerPayload();
      if (payload.entries.length === 0) {
        window.alert('Aucune recette enregistrée pour cette année.');
        return;
      }
      if (format === 'excel') {
        exportReceiptsLedgerToExcel(payload);
      } else {
        exportReceiptsLedgerToPdf(payload);
      }
    } catch (error) {
      console.error('Erreur lors de la génération du livret de recettes:', error);
      window.alert('Impossible de générer le livret de recettes. Merci de réessayer.');
    } finally {
      setReceiptsExportingFormat(null);
    }
  };

  // Ligne unique de synthèse pour le filtre "Année" : distincte de "Mois" (12 lignes) et "Trimestre" (4 lignes)
  const yearSummary = useMemo<MonthlyRevenue[]>(() => {
    const totals = monthlyRevenue.reduce(
      (acc, m) => ({
        revenueBrut: acc.revenueBrut + (m.revenueBrut || 0),
        revenueNet: acc.revenueNet + (m.revenueNet || 0),
        contributions: acc.contributions + (m.contributions || 0),
        invoices: acc.invoices + (m.invoices || 0),
        expenses: acc.expenses + (m.expenses || 0)
      }),
      { revenueBrut: 0, revenueNet: 0, contributions: 0, invoices: 0, expenses: 0 }
    );
    return [{
      month: `Année ${selectedYear}`,
      ...totals,
      contributionRate: totals.revenueBrut > 0 ? (totals.contributions / totals.revenueBrut) * 100 : 0,
      netProfit: totals.revenueBrut - totals.expenses
    }];
  }, [monthlyRevenue, selectedYear]);

  const chartData = periodFilter === 'quarter' ? quarterlyRevenue : periodFilter === 'month' ? monthlyRevenue : yearSummary;

  const periodTotals = useMemo(() => {
    if (!chartData.length) {
      return null;
    }
    return chartData.reduce(
      (acc, item) => ({
        revenueBrut: acc.revenueBrut + (item.revenueBrut || 0),
        contributions: acc.contributions + (item.contributions || 0),
        revenueNet: acc.revenueNet + (item.revenueNet || 0),
        invoices: acc.invoices + (item.invoices || 0),
        expenses: acc.expenses + (item.expenses || 0),
        netProfit: acc.netProfit + (item.netProfit || 0)
      }),
      { revenueBrut: 0, contributions: 0, revenueNet: 0, invoices: 0, expenses: 0, netProfit: 0 }
    );
  }, [chartData]);

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

  return (
    <div className="space-y-4">
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

      {/* Message si aucune donnée - Vérifier les données globales, pas la période */}
      {!loading && !hasGlobalPaidInvoices && (
        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center animate-bounce">
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

      {/* Filtre de période pour les KPI */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-3 sm:p-5 lg:p-6 mb-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Période d'analyse</h3>
            {/* Sélecteurs selon le type de période - toujours sur une seule ligne, groupés pour ne jamais se scinder */}
            <div className="flex flex-nowrap items-center justify-center sm:justify-end gap-1.5 sm:gap-2 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 sm:overflow-visible">
              {/* Sélecteur d'année (toujours visible) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedKpiYear(selectedKpiYear - 1)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                  title="Année précédente"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <div className="px-2.5 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0">
                  <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white min-w-[40px] sm:min-w-[80px] text-center block">
                    {selectedKpiYear}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKpiYear(selectedKpiYear + 1)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                  title="Année suivante"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              {/* Sélecteur de trimestre (si trimestriel) - collapse/slide animé au lieu d'un montage/démontage brut */}
              <div
                className={`flex items-center flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
                  kpiPeriodFilter === 'quarter'
                    ? 'max-w-[220px] opacity-100 gap-1.5 sm:gap-2 ml-1 sm:ml-1.5'
                    : 'max-w-0 opacity-0 gap-0 ml-0 pointer-events-none'
                }`}
                aria-hidden={kpiPeriodFilter !== 'quarter'}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedKpiQuarter > 1) {
                        setSelectedKpiQuarter(selectedKpiQuarter - 1);
                      } else {
                        setSelectedKpiQuarter(4);
                        setSelectedKpiYear(selectedKpiYear - 1);
                      }
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Trimestre précédent"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div className="px-2.5 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0">
                    <span className="text-xs sm:text-base font-bold text-gray-900 dark:text-white min-w-[28px] sm:min-w-[60px] text-center block">
                      T{selectedKpiQuarter}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedKpiQuarter < 4) {
                        setSelectedKpiQuarter(selectedKpiQuarter + 1);
                      } else {
                        setSelectedKpiQuarter(1);
                        setSelectedKpiYear(selectedKpiYear + 1);
                      }
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Trimestre suivant"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* Sélecteur de mois (si mensuel) - collapse/slide animé au lieu d'un montage/démontage brut */}
              <div
                className={`flex items-center flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
                  kpiPeriodFilter === 'month'
                    ? 'max-w-[190px] sm:max-w-[290px] opacity-100 gap-1.5 sm:gap-2 ml-1 sm:ml-1.5'
                    : 'max-w-0 opacity-0 gap-0 ml-0 pointer-events-none'
                }`}
                aria-hidden={kpiPeriodFilter !== 'month'}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedKpiMonth > 1) {
                        setSelectedKpiMonth(selectedKpiMonth - 1);
                      } else {
                        setSelectedKpiMonth(12);
                        setSelectedKpiYear(selectedKpiYear - 1);
                      }
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Mois précédent"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div className="px-2.5 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm flex-shrink-0">
                    <select
                      value={selectedKpiMonth}
                      onChange={(e) => setSelectedKpiMonth(Number(e.target.value))}
                      className="text-xs sm:text-base font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none cursor-pointer appearance-none text-center min-w-[64px] sm:min-w-[120px]"
                    >
                      <option value="1">Janvier</option>
                      <option value="2">Février</option>
                      <option value="3">Mars</option>
                      <option value="4">Avril</option>
                      <option value="5">Mai</option>
                      <option value="6">Juin</option>
                      <option value="7">Juillet</option>
                      <option value="8">Août</option>
                      <option value="9">Septembre</option>
                      <option value="10">Octobre</option>
                      <option value="11">Novembre</option>
                      <option value="12">Décembre</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedKpiMonth < 12) {
                        setSelectedKpiMonth(selectedKpiMonth + 1);
                      } else {
                        setSelectedKpiMonth(1);
                        setSelectedKpiYear(selectedKpiYear + 1);
                      }
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                    title="Mois suivant"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Boutons de type de période - alignés à gauche */}
          <div className="flex justify-start">
            <div className="relative inline-flex items-center bg-gray-100 dark:bg-slate-800/50 p-1 rounded-full">
              {kpiIndicatorStyle.width > 0 && (
                <div
                  className="absolute h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 shadow-md z-0"
                  style={{
                    width: `${kpiIndicatorStyle.width}px`,
                    left: `${kpiIndicatorStyle.left}px`,
                    top: '4px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              )}
              <button
                ref={kpiYearButtonRef}
                type="button"
                onClick={() => setKpiPeriodFilter('year')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  kpiPeriodFilter === 'year'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Année
              </button>
              <button
                ref={kpiQuarterButtonRef}
                type="button"
                onClick={() => setKpiPeriodFilter('quarter')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  kpiPeriodFilter === 'quarter'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Trimestre
              </button>
              <button
                ref={kpiMonthButtonRef}
                type="button"
                onClick={() => setKpiPeriodFilter('month')}
                className={`relative z-10 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  kpiPeriodFilter === 'month'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                Mois
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Brut Total</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.totalRevenueBrut} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-4 h-4 mr-1 text-blue-500 dark:text-blue-400" />
            <span>Toutes les factures payées</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <Euro className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Net Total</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.totalRevenueNet} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Après cotisations URSSAF</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <Calculator className="w-4 h-4 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cotisations URSSAF</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.totalContributions} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Percent className="w-4 h-4 mr-1 text-red-500 dark:text-red-400" />
            <span>{formatPercent(kpiData.contributionRate)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures Payées</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.paidInvoices} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span className="text-gray-500 dark:text-gray-400">Total factures réglées</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Supplémentaires - Revenus et Paiements */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Montant moyen par facture</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.averageInvoiceAmount} format={formatCurrency} />
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Taux de paiement à temps</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.onTimePaymentRate} format={formatPercent} />
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures en retard</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.overdueAmount} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <XCircle className="w-4 h-4 mr-1 text-orange-500" />
            <span>{kpiData.overdueInvoices} facture(s)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <AlertCircle className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures en attente</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={kpiData.pendingInvoices} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>{formatCurrency(kpiData.pendingAmount)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Dépenses</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={periodTotals ? periodTotals.expenses : 0} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>Sur la période sélectionnée</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 relative hover:shadow-lg hover:scale-[1.02] transition-transform duration-300 transition-shadow duration-300 group">
          <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-full group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
            <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="pr-9 sm:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Bénéfice net</p>
            <p className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              <AnimatedNumber value={periodTotals ? periodTotals.netProfit : 0} format={formatCurrency} />
            </p>
          </div>
          <div className="mt-2 sm:mt-4 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <span>CA brut − dépenses</span>
          </div>
        </div>
      </div>

      {/* Section 2: Graphiques d'évolution */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white px-2">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </span>
          Graphiques d'évolution
        </h2>

      {/* Graphique Principal - Évolution Complète CA Brut, Net et Cotisations */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 sm:p-5 lg:p-6 min-w-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            Évolution mensuelle du chiffre d'affaires
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear - 1)}
              disabled={isUpdatingYear}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="px-4 sm:px-5 py-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm relative min-w-[88px] text-center">
              {isUpdatingYear && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
              <span className={`text-sm sm:text-base font-bold text-gray-900 dark:text-white block ${isUpdatingYear ? 'opacity-50' : ''}`}>
                {selectedYear}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedYear(selectedYear + 1)}
              disabled={selectedYear >= new Date().getFullYear() || isUpdatingYear}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 dark:disabled:hover:from-blue-500 dark:disabled:hover:to-blue-600 disabled:transform-none"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        {monthlyRevenue.length > 0 ? (
          <div className="relative h-[260px] sm:h-[340px] lg:h-96 w-full min-w-0">
            {!monthlyRevenue.some(m => m.revenueBrut > 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={monthlyRevenue} 
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  {/* CA Brut - dégradé indigo raffiné */}
                  <linearGradient id="monthlyBrutGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPalette.revenueBrut.base} stopOpacity={0.72} />
                    <stop offset="55%" stopColor={chartPalette.revenueBrut.base} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={chartPalette.revenueBrut.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="monthlyBrutStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartPalette.revenueBrut.base} />
                    <stop offset="100%" stopColor={chartPalette.revenueBrut.dark} />
                  </linearGradient>
                  
                  {/* CA Net - dégradé jade doux */}
                  <linearGradient id="monthlyNetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPalette.revenueNet.base} stopOpacity={0.7} />
                    <stop offset="55%" stopColor={chartPalette.revenueNet.base} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartPalette.revenueNet.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="monthlyNetStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartPalette.revenueNet.base} />
                    <stop offset="100%" stopColor={chartPalette.revenueNet.dark} />
                  </linearGradient>
                  
                  {/* Cotisations - dégradé terracotta feutré */}
                  <linearGradient id="monthlyContributionsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPalette.contributions.base} stopOpacity={0.7} />
                    <stop offset="55%" stopColor={chartPalette.contributions.base} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={chartPalette.contributions.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="monthlyContributionsStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartPalette.contributions.base} />
                    <stop offset="100%" stopColor={chartPalette.contributions.dark} />
                  </linearGradient>

                  {/* Dépenses - dégradé rose */}
                  <linearGradient id="monthlyExpensesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPalette.expenses.base} stopOpacity={0.7} />
                    <stop offset="55%" stopColor={chartPalette.expenses.base} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartPalette.expenses.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="monthlyExpensesStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartPalette.expenses.base} />
                    <stop offset="100%" stopColor={chartPalette.expenses.dark} />
                  </linearGradient>

                  {/* Bénéfice net - dégradé violet */}
                  <linearGradient id="monthlyNetProfitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPalette.netProfit.base} stopOpacity={0.7} />
                    <stop offset="55%" stopColor={chartPalette.netProfit.base} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartPalette.netProfit.base} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="monthlyNetProfitStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartPalette.netProfit.base} />
                    <stop offset="100%" stopColor={chartPalette.netProfit.dark} />
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
                  iconType="circle"
                  iconSize={12}
                  formatter={(value) => (
                    <span style={{ color: getThemeColors().text, fontSize: '12px', fontWeight: '500' }}>
                      {value}
                    </span>
                  )}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenueBrut" 
                  fill="url(#monthlyBrutGradient)" 
                  stroke="url(#monthlyBrutStroke)" 
                  strokeWidth={2}
                  name="CA Brut"
                  isAnimationActive={monthlyRevenue.length > 0}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Area 
                  type="monotone" 
                  dataKey="revenueNet" 
                  fill="url(#monthlyNetGradient)" 
                  stroke="url(#monthlyNetStroke)" 
                  strokeWidth={2}
                  name="CA Net"
                  isAnimationActive={monthlyRevenue.length > 0}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  fill="url(#monthlyContributionsGradient)"
                  stroke="url(#monthlyContributionsStroke)"
                  strokeWidth={2}
                  name="Cotisations"
                  isAnimationActive={monthlyRevenue.length > 0}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  fill="url(#monthlyExpensesGradient)"
                  stroke="url(#monthlyExpensesStroke)"
                  strokeWidth={2}
                  name="Dépenses"
                  isAnimationActive={monthlyRevenue.length > 0}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  fill="url(#monthlyNetProfitGradient)"
                  stroke="url(#monthlyNetProfitStroke)"
                  strokeWidth={2}
                  name="Bénéfice net"
                  isAnimationActive={monthlyRevenue.length > 0}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="relative h-[260px] sm:h-[340px] lg:h-96 w-full min-w-0">
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
      </div>

      <style>{`
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
        /* Supprime les bordures de focus au clic */
        .recharts-wrapper,
        .recharts-wrapper:focus,
        .recharts-wrapper:focus-visible,
        .recharts-wrapper:active,
        .recharts-surface,
        .recharts-surface:focus,
        .recharts-surface:focus-visible,
        .recharts-surface:active,
        svg.recharts-surface:focus,
        svg.recharts-surface:focus-visible,
        svg.recharts-surface:active {
          outline: none !important;
          border: none !important;
        }
        .recharts-wrapper:focus,
        .recharts-wrapper:focus-visible,
        .recharts-wrapper:active {
          box-shadow: none !important;
        }
        /* Force l'affichage des éléments graphiques */
        .recharts-area,
        .recharts-area-curve,
        .recharts-area-area,
        .recharts-bar,
        .recharts-bar-rectangle,
        .recharts-pie,
        .recharts-pie-sector,
        .recharts-layer,
        path.recharts-curve,
        path.recharts-area-curve,
        path.recharts-area-area {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
          pointer-events: auto !important;
        }
        .recharts-area-area,
        path.recharts-area-area {
          fill-opacity: 0.6 !important;
          opacity: 1 !important;
        }
        .recharts-bar-rectangle,
        rect.recharts-bar-rectangle {
          fill-opacity: 1 !important;
          fill: inherit !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        rect[class*="recharts-bar"] {
          fill-opacity: 1 !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .recharts-pie-sector,
        path.recharts-pie-sector {
          fill-opacity: 1 !important;
          opacity: 1 !important;
          visibility: visible !important;
          fill: inherit !important;
          outline: none !important;
          border: none !important;
        }
        .recharts-area-curve,
        path.recharts-area-curve {
          stroke-width: 2px !important;
          stroke-opacity: 1 !important;
        }
        .recharts-pie-sector:focus,
        .recharts-pie-sector:focus-visible,
        .recharts-pie-sector:active,
        path.recharts-pie-sector:focus,
        path.recharts-pie-sector:focus-visible,
        path.recharts-pie-sector:active,
        path[class*="recharts-pie"]:focus,
        path[class*="recharts-pie"]:focus-visible,
        path[class*="recharts-pie"]:active,
        .recharts-pie path:focus,
        .recharts-pie path:active {
          outline: none !important;
          border: none !important;
        }
        path[class*="recharts-pie"] {
          fill-opacity: 1 !important;
          opacity: 1 !important;
          visibility: visible !important;
          outline: none !important;
        }
        /* Supprime les contours et rectangles au clic sur les segments du PieChart */
        .recharts-pie .recharts-active-shape,
        .recharts-pie .recharts-active-shape rect,
        .recharts-pie .recharts-active-shape path,
        .recharts-pie rect[class*="active"],
        .recharts-pie rect[class*="focus"],
        .recharts-pie rect[class*="selection"],
        .recharts-pie .recharts-layer > rect,
        .recharts-pie .recharts-sector > rect {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>

      {/* Graphiques Comparatifs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Comparaison Trimestrielle */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comparaison Trimestrielle</h3>
          {quarterlyRevenue.length > 0 ? (
            <div className="relative h-[240px] sm:h-[300px] lg:h-80 w-full min-w-0">
              {!quarterlyRevenue.some(q => q.revenueBrut > 0) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg">
                  <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible</p>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="barBrutGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.revenueBrut.base} />
                      <stop offset="100%" stopColor={chartPalette.revenueBrut.dark} />
                    </linearGradient>
                    <linearGradient id="barNetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.revenueNet.base} />
                      <stop offset="100%" stopColor={chartPalette.revenueNet.dark} />
                    </linearGradient>
                    <linearGradient id="barContributionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.contributions.base} />
                      <stop offset="100%" stopColor={chartPalette.contributions.dark} />
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
                    iconType="circle"
                    iconSize={12}
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
                    isAnimationActive={quarterlyRevenue.length > 0}
                    animationDuration={850}
                    animationEasing="ease"
                  />
                  <Bar 
                    dataKey="revenueNet" 
                    fill="url(#barNetGradient)" 
                    name="CA Net" 
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={quarterlyRevenue.length > 0}
                    animationDuration={850}
                    animationEasing="ease"
                  />
                  <Bar 
                    dataKey="contributions" 
                    fill="url(#barContributionsGradient)" 
                    name="Cotisations" 
                    radius={[8, 8, 0, 0]}
                    isAnimationActive={quarterlyRevenue.length > 0}
                    animationDuration={850}
                    animationEasing="ease"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="relative h-[240px] sm:h-[300px] lg:h-80 w-full min-w-0">
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
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Répartition Globale</h3>
          {kpiData.annualRevenueBrut > 0 ? (
            <div className="h-[240px] sm:h-[300px] lg:h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="pieBrutGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={chartPalette.revenueBrut.base} />
                      <stop offset="100%" stopColor={chartPalette.revenueBrut.dark} />
                    </linearGradient>
                    <linearGradient id="pieContributionsGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={chartPalette.contributions.base} />
                      <stop offset="100%" stopColor={chartPalette.contributions.dark} />
                    </linearGradient>
                    <linearGradient id="pieNetGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={chartPalette.revenueNet.base} />
                      <stop offset="100%" stopColor={chartPalette.revenueNet.dark} />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={[
                      { name: 'CA Brut', value: kpiData.annualRevenueBrut, color: chartPalette.revenueBrut.base },
                      { name: 'Cotisations', value: kpiData.annualContributions, color: chartPalette.contributions.base },
                      { name: 'CA Net', value: kpiData.annualRevenueNet, color: chartPalette.revenueNet.base }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={110}
                    innerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={kpiData.annualRevenueBrut + kpiData.annualContributions + kpiData.annualRevenueNet > 0}
                    animationDuration={950}
                    animationEasing="ease-out"
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={3}
                    activeShape={false}
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
                    iconType="circle"
                    iconSize={12}
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
            <div className="relative h-[240px] sm:h-[300px] lg:h-80">
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

      {/* Tableau détaillé par période */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6 min-w-0">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistiques détaillées par période</h3>
            <div className="flex items-center justify-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedYear(selectedYear - 1)}
                disabled={isUpdatingYear}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="px-2.5 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm relative flex-shrink-0">
                {isUpdatingYear && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                )}
                <span className={`text-xs sm:text-base font-bold text-gray-900 dark:text-white min-w-[40px] sm:min-w-[80px] text-center block ${isUpdatingYear ? 'opacity-50' : ''}`}>
                  {selectedYear}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedYear(selectedYear + 1)}
                disabled={selectedYear >= new Date().getFullYear() || isUpdatingYear}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white hover:from-blue-700 hover:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-700 dark:disabled:hover:from-blue-500 dark:disabled:hover:to-blue-600 disabled:transform-none flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="relative inline-flex items-center bg-gray-100 dark:bg-slate-800/50 p-1 rounded-full">
              {indicatorStyle.width > 0 && (
                <div
                  className="absolute h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 shadow-md z-0"
                  style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                    top: '4px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              )}
              <button
                ref={yearButtonRef}
                type="button"
                onClick={() => setPeriodFilter('year')}
                className={`relative z-10 min-w-[92px] px-4 py-1.5 rounded-full text-sm font-medium text-center transition-colors duration-150 ${
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
                className={`relative z-10 min-w-[92px] px-4 py-1.5 rounded-full text-sm font-medium text-center transition-colors duration-150 ${
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
                className={`relative z-10 min-w-[92px] px-4 py-1.5 rounded-full text-sm font-medium text-center transition-colors duration-150 ${
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
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-600 border-b-4 border-gray-400 dark:border-gray-500">
                <th className="text-left py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider rounded-tl-lg">
                  {periodFilter === 'quarter' ? 'Trimestre' : periodFilter === 'year' ? 'Mois' : 'Mois'}
                </th>
                <th className="text-right py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>CA Brut</span>
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <Calculator className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>Cotisations</span>
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <Euro className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span>CA Net</span>
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider">
                  <div className="flex items-center justify-end gap-2">
                    <Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span>Factures</span>
                  </div>
                </th>
                <th className="text-right py-3 px-4 font-bold text-sm text-gray-800 dark:text-white uppercase tracking-wider rounded-tr-lg">
                  <div className="flex items-center justify-end gap-2">
                    <Percent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span>Taux</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {chartData.map((item, index) => (
                <tr 
                  key={index} 
                  className={`${
                    index % 2 === 0 
                      ? 'bg-gray-100 dark:bg-slate-800/60' 
                      : 'bg-white dark:bg-slate-900'
                  } hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600/70 dark:hover:to-gray-600/50 transition-all duration-200 ease-out group cursor-pointer hover:shadow-md hover:-translate-y-0.5`}
                >
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap items-center justify-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400 opacity-0 group-hover:opacity-100 transition-transform duration-300 transition-shadow duration-300 group-hover:scale-150"></div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 capitalize">
                        {periodFilter === 'quarter' ? (item as QuarterlyRevenue).quarter : (item as MonthlyRevenue).month}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:font-bold transition-transform duration-300 transition-shadow duration-300 group-hover:scale-105 inline-block">
                      {formatCurrency(item.revenueBrut)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400 group-hover:font-bold transition-transform duration-300 transition-shadow duration-300 group-hover:scale-105 inline-block">
                      {formatCurrency(item.contributions)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 group-hover:font-bold transition-transform duration-300 transition-shadow duration-300 group-hover:scale-105 inline-block">
                      {formatCurrency(item.revenueNet)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-700 dark:group-hover:text-blue-300 group-hover:scale-110 transition-transform duration-300 transition-shadow duration-300">
                      {item.invoices}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:font-bold transition-transform duration-300 transition-shadow duration-300 group-hover:scale-105 inline-block">
                      {formatPercent('contributionRate' in item ? item.contributionRate : (item.contributions / item.revenueBrut) * 100)}
                    </span>
                  </td>
              </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 dark:bg-gray-600 border-t-4 border-gray-400 dark:border-gray-500">
                <td className="py-4 px-4 rounded-bl-lg">
                  <span className="text-base font-bold text-gray-800 dark:text-white">Total</span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-base font-bold text-gray-800 dark:text-white">
                    {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueBrut, 0))}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-base font-bold text-red-700 dark:text-red-400">
                    {formatCurrency(chartData.reduce((sum, item) => sum + item.contributions, 0))}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="text-base font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(chartData.reduce((sum, item) => sum + item.revenueNet, 0))}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-bold bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                    {chartData.reduce((sum, item) => sum + item.invoices, 0)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right rounded-br-lg">
                  <span className="text-base font-bold text-gray-800 dark:text-white">
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

        {/* Vue mobile des statistiques détaillées */}
        <div className="md:hidden space-y-1.5">
          {chartData.map((item, index) => {
            const rate = formatPercent('contributionRate' in item ? item.contributionRate : (item.contributions / item.revenueBrut) * 100);
            return (
              <div
                key={`${'contributionRate' in item ? 'quarter' : 'month'}-${index}`}
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-900 dark:text-white capitalize truncate">
                      {periodFilter === 'quarter' ? (item as QuarterlyRevenue).quarter : (item as MonthlyRevenue).month}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">{rate}</span>
                </div>
                <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap">
                  <span>Brut <b className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.revenueBrut)}</b></span>
                  <span>Net <b className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(item.revenueNet)}</b></span>
                  <span>Cotis. <b className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(item.contributions)}</b></span>
                  <span className="ml-auto flex-shrink-0">{item.invoices} fact.</span>
                </div>
              </div>
            );
          })}
          {periodTotals && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Total période</p>
              <div className="flex items-center gap-2.5 text-[11px] text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap">
                <span>Brut <b className="font-bold text-gray-900 dark:text-white">{formatCurrency(periodTotals.revenueBrut)}</b></span>
                <span>Net <b className="font-bold text-green-600 dark:text-green-400">{formatCurrency(periodTotals.revenueNet)}</b></span>
                <span>Cotis. <b className="font-bold text-red-600 dark:text-red-400">{formatCurrency(periodTotals.contributions)}</b></span>
                <span className="ml-auto flex-shrink-0">{periodTotals.invoices} fact.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Analyses détaillées */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white px-2">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          Analyses détaillées
        </h2>

      {/* 💳 Détails Paiements */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </span>
          Détails Paiements
        </h3>
        
        {/* Répartition par méthode de paiement */}
        {paymentMethods.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Répartition par méthode de paiement</h4>
            <div className="space-y-3">
              {paymentMethods.map((pm, index) => (
                <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm text-gray-900 dark:text-white truncate">{pm.method}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">({pm.count} paiement{pm.count > 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
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
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Montant total encaissé ce mois-ci</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.monthlyCollectedAmount)}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Montant des avoirs/remboursements</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.refundsAmount)}</p>
          </div>
        </div>
      </div>

      {/* 👥 Statistiques Clients */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </span>
          Statistiques Clients
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre total de clients actifs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.activeClients}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nouveaux clients ce mois</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{kpiData.newClientsThisMonth}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Clients inactifs (90+ jours)</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpiData.inactiveClientsCount}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taux de fidélisation</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatPercent(kpiData.clientRetentionRate)}</p>
          </div>
        </div>
      </div>

      {/* 🧾 Statistiques Factures */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          </span>
          Statistiques Factures
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures émises ce mois</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.invoicesThisMonth}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Temps moyen de paiement</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(kpiData.averagePaymentTime)} jours</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures récurrentes</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpiData.recurringInvoices}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Factures uniques</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{kpiData.uniqueInvoices}</p>
          </div>
        </div>

        {/* Graphique nombre de factures par mois */}
        {monthlyInvoices.length > 0 && monthlyInvoices.some(m => m.count > 0) ? (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nombre de factures par mois - Année {selectedYear}</h4>
            <div className="h-[300px] sm:h-[340px] lg:h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyInvoices} margin={{ top: 20, right: 0, left: -12, bottom: 20 }}>
                  <defs>
                    <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.invoicesPaid.base} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={chartPalette.invoicesPaid.dark} stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.invoicesPending.base} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={chartPalette.invoicesPending.dark} stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="overdueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPalette.invoicesOverdue.base} stopOpacity={0.85} />
                      <stop offset="100%" stopColor={chartPalette.invoicesOverdue.dark} stopOpacity={0.55} />
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
                    width={26}
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
                          <p style={{ margin: '4px 0', color: chartPalette.invoicesPaid.base }}>
                            <span style={{ marginRight: '8px' }}>●</span>
                            Payées: <strong>{data.paid}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: chartPalette.invoicesPending.base }}>
                            <span style={{ marginRight: '8px' }}>●</span>
                            En attente: <strong>{data.pending}</strong>
                          </p>
                          <p style={{ margin: '4px 0', color: chartPalette.invoicesOverdue.base }}>
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
                    iconType="circle"
                    iconSize={12}
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
                    isAnimationActive={monthlyInvoices.length > 0}
                    animationDuration={700}
                  />
                  <Bar 
                    dataKey="pending" 
                    stackId="a" 
                    fill="url(#pendingGradient)" 
                    name="pending"
                    isAnimationActive={monthlyInvoices.length > 0}
                    animationDuration={700}
                  />
                  <Bar 
                    dataKey="overdue" 
                    stackId="a" 
                    fill="url(#overdueGradient)" 
                    name="overdue"
                    isAnimationActive={monthlyInvoices.length > 0}
                    animationDuration={700}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="relative h-[240px] sm:h-[300px] lg:h-80 w-full min-w-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-800/30 rounded-lg">
            <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4 animate-pulse" />
            <p className="text-gray-500 dark:text-gray-400 text-sm animate-pulse">Aucune donnée disponible pour {selectedYear}</p>
          </div>
        )}
      </div>

      {/* 🧰 Statistiques Prestations / Services */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          </span>
          Statistiques Prestations / Services
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Prestations réalisées</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{kpiData.totalServices}</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Prestations ce mois</p>
            <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{kpiData.servicesThisMonth}</p>
          </div>
        </div>

        {/* Prestations les plus vendues */}
        {serviceStats.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top prestations par revenus</h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
              {(() => {
                const topServices = serviceStats.slice(0, 5);
                const maxRevenue = Math.max(...topServices.map(s => s.revenue));
                return topServices.map((service, index) => {
                  const color = COLORS[index % COLORS.length];
                  const percentage = maxRevenue > 0 ? (service.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center text-center gap-1 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 p-3 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <p className="w-full text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 truncate" title={service.name}>
                        {service.name}
                      </p>
                      <HalfGauge percentage={percentage} color={color} size={68} strokeWidth={7} className="sm:hidden mt-1 mb-1" />
                      <HalfGauge percentage={percentage} color={color} size={100} strokeWidth={9} className="hidden sm:block lg:hidden mt-1 mb-1" />
                      <HalfGauge percentage={percentage} color={color} size={120} strokeWidth={10} className="hidden lg:block mt-1 mb-1" />
                      <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(service.revenue)}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Section 4: Comparaisons et classements */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white px-2">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </span>
          Comparaisons et classements
        </h2>

      {/* 📅 Statistiques Temporelles - Comparaison */}
      {comparisonData && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6 min-w-0">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-6">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </span>
            Comparaison Annuelle
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 sm:p-6 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">Année {selectedYear}</p>
              <p className="text-lg sm:text-3xl font-bold text-blue-600 dark:text-blue-400 truncate">{formatCurrency(comparisonData.current)}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800/20 dark:to-slate-900/20 p-3 sm:p-6 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">Année {selectedYear - 1}</p>
              <p className="text-lg sm:text-3xl font-bold text-gray-600 dark:text-gray-400 truncate">{formatCurrency(comparisonData.previous)}</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Évolution</span>
              <div className="flex flex-wrap items-center gap-2">
                {comparisonData.change >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 rotate-180" />
                )}
                <span className={`text-sm sm:text-lg font-bold ${comparisonData.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {comparisonData.change >= 0 ? '+' : ''}{formatCurrency(comparisonData.change)}
                </span>
                <span className={`text-xs sm:text-sm font-semibold ${comparisonData.changePercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ({comparisonData.changePercent >= 0 ? '+' : ''}{formatPercent(comparisonData.changePercent)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Clients par CA */}
      {clientRevenue.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top clients par CA Brut</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
            {(() => {
              const topClients = clientRevenue.slice().reverse();
              const maxRevenue = Math.max(...topClients.map(c => c.revenueBrut));
              return topClients.map((client, index) => {
                const color = COLORS[index % COLORS.length];
                const percentage = maxRevenue > 0 ? (client.revenueBrut / maxRevenue) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center text-center gap-1 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 p-3 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <p className="w-full text-[11px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 truncate" title={client.name}>
                      {client.name}
                    </p>
                    <HalfGauge percentage={percentage} color={color} size={68} strokeWidth={7} className="sm:hidden mt-1 mb-1" />
                    <HalfGauge percentage={percentage} color={color} size={100} strokeWidth={9} className="hidden sm:block lg:hidden mt-1 mb-1" />
                    <HalfGauge percentage={percentage} color={color} size={120} strokeWidth={10} className="hidden lg:block mt-1 mb-1" />
                    <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(client.revenueBrut)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {client.invoices} facture{client.invoices > 1 ? 's' : ''}
                    </p>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Actions d'export */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="flex-1 min-w-[240px] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-900/80 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Rapport statistiques</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Téléchargez le tableau de bord complet</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleExport('excel')}
                disabled={exportingFormat !== null}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Exporter les statistiques en Excel"
              >
                {exportingFormat === 'excel' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                ) : (
                  <FileSpreadsheetIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span>{exportingFormat === 'excel' ? 'Export…' : 'Excel (.xlsx)'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('pdf')}
                disabled={exportingFormat !== null}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-indigo-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Exporter les statistiques en PDF"
              >
                {exportingFormat === 'pdf' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                ) : (
                  <FileTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span>{exportingFormat === 'pdf' ? 'Export…' : 'PDF (.pdf)'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-[240px] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-900/80 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-200">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Livret de recettes</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Générez le registre conforme à l'administration</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleReceiptsExport('excel')}
                disabled={receiptsExportingFormat !== null}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-teal-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Exporter le livret de recettes en Excel"
              >
                {receiptsExportingFormat === 'excel' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                ) : (
                  <FileSpreadsheetIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span>{receiptsExportingFormat === 'excel' ? 'Export…' : 'Excel (.xlsx)'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleReceiptsExport('pdf')}
                disabled={receiptsExportingFormat !== null}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-sky-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                aria-label="Exporter le livret de recettes en PDF"
              >
                {receiptsExportingFormat === 'pdf' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></div>
                ) : (
                  <FileTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
                <span>{receiptsExportingFormat === 'pdf' ? 'Export…' : 'PDF (.pdf)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
                  </div>


    </div>
  );
}
