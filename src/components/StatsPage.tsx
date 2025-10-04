import { useState, useEffect } from 'react';
import { 
  Euro, 
  Calendar, 
  Clock, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Sector 
} from 'recharts';
import { supabase } from '../lib/supabase';

interface KPIData {
  totalRevenue: number;
  annualRevenue: number;
  paidInvoices: number;
  activeClients: number;
  pendingInvoices: number;
  overdueInvoices: number;
  pendingAmount: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoices: number;
}

interface ClientRevenue {
  name: string;
  revenue: number;
  percentage: number;
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

export default function StatsPage({ onPageChange }: StatsPageProps) {
  const [kpiData, setKpiData] = useState<KPIData>({
    totalRevenue: 0,
    annualRevenue: 0,
    paidInvoices: 0,
    activeClients: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    pendingAmount: 0
  });
  
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [clientRevenue, setClientRevenue] = useState<ClientRevenue[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<'pie' | 'bar'>('bar');

  // Secteur actif custom pour agrandir la part au survol
  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload, percent, value,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" strokeWidth={2} />
        <circle cx={ex} cy={ey} r={3} fill={fill} stroke="white" strokeWidth={2} />
        <text 
          x={ex + (cos >= 0 ? 8 : -8)} 
          y={ey - 8} 
          textAnchor={textAnchor} 
          fill={getThemeColors().pieText} 
          className="text-sm font-semibold"
          style={{ 
            textShadow: getThemeColors().pieTextShadow,
            fontSize: '11px',
            fontWeight: '600'
          }}
        >
          {payload.name}
        </text>
        <text 
          x={ex + (cos >= 0 ? 8 : -8)} 
          y={ey + 4} 
          textAnchor={textAnchor} 
          fill={getThemeColors().pieText} 
          className="text-sm font-semibold"
          style={{ 
            textShadow: getThemeColors().pieTextShadow,
            fontSize: '10px',
            fontWeight: '500'
          }}
        >
          ({(percent * 100).toFixed(0)}%): {value.toLocaleString('fr-FR')}€
        </text>
      </g>
    );
  };

  // Couleurs pour les graphiques - Palette optimisée pour mode sombre
  const COLORS = [
    '#3B82F6', // Bleu - Bon contraste
    '#10B981', // Vert émeraude - Bon contraste
    '#F59E0B', // Orange - Bon contraste
    '#EF4444', // Rouge - Bon contraste
    '#8B5CF6', // Violet - Bon contraste
    '#06B6D4', // Cyan - Bon contraste
    '#84CC16', // Lime - Bon contraste
    '#F97316', // Orange vif - Bon contraste
    '#EC4899', // Rose - Bon contraste
    '#6366F1'  // Indigo - Bon contraste
  ];

  // Couleurs adaptées au thème - Système amélioré pour le camembert
  const getThemeColors = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      // Couleurs de base
      grid: isDark ? '#374151' : '#e5e7eb',
      text: isDark ? '#f9fafb' : '#1f2937',
      textSecondary: isDark ? '#9ca3af' : '#6b7280',
      background: isDark ? '#111827' : '#ffffff',
      
      // Tooltip - Contraste optimal pour les deux modes
      tooltipBg: isDark ? '#ffffff' : '#1f2937',
      tooltipText: isDark ? '#1f2937' : '#ffffff',
      tooltipBorder: isDark ? '#e5e7eb' : '#374151',
      
      // Camembert - Couleurs pour les segments
      pieStroke: isDark ? '#374151' : '#ffffff',
      pieStrokeWidth: 2,
      
      // Texte du camembert (pourcentages et labels)
      pieText: isDark ? '#ffffff' : '#1f2937',
      pieTextShadow: isDark ? '0 2px 4px rgba(0,0,0,0.8)' : '0 1px 2px rgba(255,255,255,0.8)',
      
      // Légende
      legendText: isDark ? '#f9fafb' : '#1f2937'
    };
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // Récupérer toutes les factures (sans jointure pour éviter l'erreur de relation)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });

      let invoices = invoicesData;
      let clients = null;

      if (invoicesError) {
        console.error('Erreur lors de la récupération des factures:', invoicesError);
        return;
      }

      // Récupérer tous les clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) {
        console.error('Erreur lors de la récupération des clients:', clientsError);
        return;
      }

      clients = clientsData;

    const now = new Date();
    const currentYear = now.getFullYear();
      const currentDate = now.toISOString().split('T')[0];

      // Calculer les KPI
      
      const totalRevenue = (invoices || [])
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      const annualRevenue = (invoices || [])
        .filter(inv => inv.status === 'paid' && 
          new Date(inv.date).getFullYear() === currentYear)
        .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      const paidInvoices = (invoices || []).filter(inv => inv.status === 'paid').length;
      const activeClients = new Set(
        (invoices || [])
          .filter(inv => inv.status === 'paid')
          .map(inv => inv.client_id)
      ).size;

      const pendingInvoices = (invoices || []).filter(inv => inv.status === 'sent').length;
      const overdueInvoices = (invoices || []).filter(inv => 
        inv.status === 'sent' && new Date(inv.due_date) < new Date(currentDate)
      ).length;

      const pendingAmount = (invoices || [])
        .filter(inv => inv.status === 'sent')
        .reduce((sum, inv) => sum + (inv.subtotal || 0), 0);


      setKpiData({
        totalRevenue,
        annualRevenue,
        paidInvoices,
        activeClients,
        pendingInvoices,
        overdueInvoices,
        pendingAmount
      });


      // Calculer les revenus mensuels pour l'année en cours
      const monthlyData: MonthlyRevenue[] = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentYear, now.getMonth() - i, 1);
        const monthStart = date.toISOString().split('T')[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const monthInvoices = (invoices || []).filter(inv => 
          inv.status === 'paid' && 
          inv.date >= monthStart && 
          inv.date <= monthEnd
        );

        const revenue = monthInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
        
        monthlyData.push({
          month: date.toLocaleDateString('fr-FR', { month: 'short' }),
          revenue,
          invoices: monthInvoices.length
        });
      }

      setMonthlyRevenue(monthlyData);

      // Fonction pour obtenir le nom du client
      const getClientName = (clientId: string) => {
        const client = clients?.find(c => c.id === clientId);
        return client?.name || 'Client inconnu';
      };

      // Calculer la répartition par client (Top 5 + Autres)
      const clientRevenueMap = new Map<string, number>();
      (invoices || [])
        .filter(inv => inv.status === 'paid')
        .forEach(inv => {
          const clientName = getClientName(inv.client_id);
          const currentRevenue = clientRevenueMap.get(clientName) || 0;
          clientRevenueMap.set(clientName, currentRevenue + (inv.subtotal || 0));
        });

      const sorted = Array.from(clientRevenueMap.entries())
        .map(([name, revenue]) => ({
          name,
          revenue,
          percentage: 0 // Sera calculé après
        }))
        .sort((a, b) => b.revenue - a.revenue);

      let clientRevenueArray = sorted.slice(0, 5);
      if (sorted.length > 5) {
        const others = sorted.slice(5).reduce((sum, c) => sum + c.revenue, 0);
        clientRevenueArray.push({ name: 'Autres', revenue: others, percentage: 0 });
      }

      // Calculer les pourcentages
      const totalClientRevenue = clientRevenueArray.reduce((sum, client) => sum + client.revenue, 0);
      clientRevenueArray.forEach(client => {
        client.percentage = totalClientRevenue > 0 ? (client.revenue / totalClientRevenue) * 100 : 0;
      });

      setClientRevenue(clientRevenueArray);

      // Récupérer les 5 dernières factures
      const recentInvoicesData = (invoices || [])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
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
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">Statistiques</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Tableaux de bord et analyses financières</p>
          </div>
        </div>
      </div>

      {/* Message si aucune donnée */}
      {!loading && kpiData.totalRevenue === 0 && kpiData.paidInvoices === 0 && (
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
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onPageChange?.('clients')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4 mr-2" />
              Gérer les clients
            </button>
            <button
              onClick={() => onPageChange?.('invoices')}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Créer des factures
            </button>
          </div>
        </div>
      )}

      {/* Cartes KPI - Version améliorée et responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 animate-fadeIn" role="region" aria-label="Indicateurs clés de performance">
        {/* Chiffre d'affaires total */}
        <div 
          className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
          role="article"
          aria-label="Chiffre d'affaires total"
        >
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <Euro className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-10 sm:pr-12 lg:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Total</p>
            <p 
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight"
              aria-label={`Chiffre d'affaires total: ${kpiData.totalRevenue.toLocaleString('fr-FR')} euros`}
            >
              {kpiData.totalRevenue.toLocaleString('fr-FR')}€
            </p>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">Toutes les factures payées</span>
          </div>
        </div>

        {/* Chiffre d'affaires annuel */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:scale-110 transition-transform duration-300">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="pr-10 sm:pr-12 lg:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">CA Annuel</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {kpiData.annualRevenue.toLocaleString('fr-FR')}€
            </p>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">Année en cours</span>
          </div>
        </div>

        {/* Factures payées */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full group-hover:scale-110 transition-transform duration-300">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="pr-10 sm:pr-12 lg:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Factures Payées</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {kpiData.paidInvoices}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total factures réglées</span>
          </div>
        </div>

        {/* Clients actifs */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 sm:p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-full group-hover:scale-110 transition-transform duration-300">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="pr-10 sm:pr-12 lg:pr-16">
            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Clients Actifs</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
              {kpiData.activeClients}
            </p>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-500 dark:text-gray-400">Avec factures payées</span>
          </div>
        </div>
      </div>

      {/* Graphiques - Version améliorée et responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6" role="region" aria-label="Graphiques et analyses">
        {/* Évolution du CA mensuel */}
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6"
          role="img"
          aria-label="Graphique d'évolution du chiffre d'affaires mensuel"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Évolution du chiffre d'affaires
            </h3>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600 dark:text-gray-400">CA Mensuel</span>
              </div>
            </div>
          </div>

          {monthlyRevenue.length > 0 ? (
            <div className="h-64 sm:h-72 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyRevenue} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={getThemeColors().grid}
                    strokeOpacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ 
                      fontSize: 12, 
                      fill: getThemeColors().textSecondary,
                      fontWeight: 500
                    }}
                    tickMargin={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ 
                      fontSize: 12, 
                      fill: getThemeColors().textSecondary,
                      fontWeight: 500
                    }}
                    tickFormatter={(value) => `${value.toLocaleString('fr-FR')}€`}
                    tickMargin={10}
                  />
                  <Tooltip 
                    formatter={(value: number) => [
                      `${value.toLocaleString('fr-FR')}€`, 
                      'Chiffre d\'affaires'
                    ]}
                    labelFormatter={(label) => `Mois: ${label}`}
                    contentStyle={{
                      backgroundColor: getThemeColors().tooltipBg,
                      border: 'none',
                      borderRadius: '12px',
                      color: getThemeColors().tooltipText,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '14px'
                    }}
                    labelStyle={{
                      color: getThemeColors().tooltipText,
                      fontWeight: '600'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={4}
                    animationBegin={0}
                    animationDuration={1000}
                    dot={{ 
                      fill: '#3B82F6', 
                      strokeWidth: 3, 
                      r: 6,
                      stroke: '#fff',
                      style: { cursor: 'pointer' }
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: '#3B82F6', 
                      strokeWidth: 3,
                      fill: '#3B82F6',
                      filter: 'brightness(0.8)',
                      style: { 
                        cursor: 'pointer',
                        transition: 'filter 0.2s ease'
                      }
                    }}
                    fill="url(#revenueGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
              </div>
            </div>
          )}
      </div>

        {/* Répartition par client */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col space-y-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Répartition par client
              </h3>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                <span>Top {clientRevenue.length} clients</span>
              </div>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit" role="tablist" aria-label="Type de graphique">
              <button
                onClick={() => setChartView('bar')}
                role="tab"
                aria-selected={chartView === 'bar'}
                aria-controls="chart-content"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  chartView === 'bar'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Barres
              </button>
              <button
                onClick={() => setChartView('pie')}
                role="tab"
                aria-selected={chartView === 'pie'}
                aria-controls="chart-content"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  chartView === 'pie'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Camembert
              </button>
            </div>
          </div>
          
          {clientRevenue.length > 0 ? (
            <div className="h-64 sm:h-72 lg:h-80" id="chart-content" role="tabpanel" aria-label="Graphique de répartition par client">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'bar' ? (
                  <BarChart 
                    data={clientRevenue} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={getThemeColors().grid}
                      strokeOpacity={0.3}
                      vertical={false}
                    />
                    <XAxis 
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ 
                        fontSize: 12, 
                        fill: getThemeColors().text,
                        fontWeight: 500
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ 
                        fontSize: 12, 
                        fill: getThemeColors().textSecondary,
                        fontWeight: 500
                      }}
                      tickFormatter={(value) => `${value.toLocaleString('fr-FR')}€`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        `${value.toLocaleString('fr-FR')}€`, 
                        'Chiffre d\'affaires'
                      ]}
                      contentStyle={{
                        backgroundColor: getThemeColors().tooltipBg,
                        border: 'none',
                        borderRadius: '12px',
                        color: getThemeColors().tooltipText,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        fontSize: '14px'
                      }}
                      labelStyle={{
                        color: getThemeColors().tooltipText,
                        fontWeight: '600'
                      }}
                      cursor={false}
                    />
                    <Bar 
                      dataKey="revenue" 
                      radius={[8, 8, 0, 0]}
                      fill="#3B82F6"
                      animationBegin={0}
                      animationDuration={800}
                      onMouseEnter={(_data, _index, event) => {
                        // Assombrir la barre au survol
                        const barElement = event.target as SVGElement;
                        if (barElement) {
                          barElement.style.filter = 'brightness(0.8)';
                          barElement.style.transition = 'filter 0.2s ease';
                        }
                      }}
                      onMouseLeave={(_data, _index, event) => {
                        // Restaurer la couleur normale
                        const barElement = event.target as SVGElement;
                        if (barElement) {
                          barElement.style.filter = 'brightness(1)';
                        }
                      }}
                    >
                      {clientRevenue.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          style={{ 
                            cursor: 'pointer',
                            transition: 'filter 0.2s ease'
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={clientRevenue}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={100}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="revenue"
                      stroke={getThemeColors().pieStroke}
                      strokeWidth={getThemeColors().pieStrokeWidth}
                      animationBegin={0}
                      animationDuration={1200}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_data, _index, event) => {
                        // Assombrir la section au survol
                        const pieElement = event.target as SVGElement;
                        if (pieElement) {
                          pieElement.style.filter = 'brightness(0.8)';
                          pieElement.style.transition = 'filter 0.2s ease';
                          pieElement.style.cursor = 'pointer';
                        }
                      }}
                      onMouseLeave={(_data, _index, event) => {
                        // Restaurer la couleur normale
                        const pieElement = event.target as SVGElement;
                        if (pieElement) {
                          pieElement.style.filter = 'brightness(1)';
                        }
                      }}
                    >
                    {clientRevenue.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        style={{ cursor: 'pointer', transition: 'filter 0.2s ease' }}
                      />
                    ))}
                    </Pie>
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span style={{ 
                          color: getThemeColors().legendText, 
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {value}
                        </span>
                      )}
                    />
                    {/* Total au centre */}
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current"
                      fill={getThemeColors().pieText}
                      style={{ 
                        fontWeight: 700, 
                        fontSize: '14px',
                        textShadow: getThemeColors().pieTextShadow
                      }}
                    >
                      {clientRevenue.reduce((sum, c) => sum + (c.revenue as number), 0).toLocaleString('fr-FR')}€
                    </text>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Aucune donnée disponible</p>
              </div>
            </div>
          )}
          </div>
        </div>

      {/* Suivi des factures - Version améliorée et responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Factures en attente */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Factures en attente
            </h3>
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              {kpiData.pendingInvoices}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {kpiData.pendingAmount.toLocaleString('fr-FR')}€ en attente
            </p>
          </div>
        </div>

        {/* Factures en retard */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Factures en retard
            </h3>
            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
              {kpiData.overdueInvoices}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Nécessitent un suivi
            </p>
          </div>
        </div>

        {/* Montant total en attente */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6 hover:shadow-md transition-shadow duration-300 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Montant en attente
            </h3>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {kpiData.pendingAmount.toLocaleString('fr-FR')}€
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              En attente de paiement
            </p>
          </div>
        </div>
      </div>

      {/* Dernières factures - Version améliorée et responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
          Dernières factures
        </h3>
        
        {/* Message si aucune facture */}
        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Aucune facture
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Créez votre première facture pour commencer à suivre vos revenus.
            </p>
            <button
              onClick={() => onPageChange?.('invoices')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Créer une facture
            </button>
          </div>
        ) : (
          <>
            {/* Vue mobile - Cards améliorées */}
            <div className="block md:hidden space-y-3">
          {recentInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {invoice.invoice_number}
                </span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  invoice.status === 'paid' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : invoice.status === 'sent'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {invoice.status === 'paid' ? 'Payée' : 
                   invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {invoice.client_name}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {invoice.amount.toLocaleString('fr-FR')}€
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Échéance: {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Vue tablet - Cards horizontales */}
        <div className="hidden md:block lg:hidden space-y-3">
          {recentInvoices.map((invoice) => (
            <div key={invoice.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : invoice.status === 'sent'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {invoice.status === 'paid' ? 'Payée' : 
                       invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.client_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {invoice.amount.toLocaleString('fr-FR')}€
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vue desktop - Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table 
            className="w-full"
            role="table"
            aria-label="Tableau des dernières factures"
          >
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
                <tr key={invoice.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {invoice.client_name}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.amount.toLocaleString('fr-FR')}€
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
          </>
        )}
      </div>
    </div>
  );
}