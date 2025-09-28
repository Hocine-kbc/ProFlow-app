import { TrendingUp, Euro, Calendar, Clock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function StatsPage() {
  const { state } = useApp();
  const { services, clients } = state;
  
  // Récupérer les paramètres depuis localStorage
  const getUrssafRate = () => {
    try {
      const raw = localStorage.getItem('business-settings');
      if (raw) {
        const settings = JSON.parse(raw);
        return settings.urssafRate || 22; // Valeur par défaut 22%
      }
    } catch (error) {
      console.error('Erreur lors de la lecture des paramètres:', error);
    }
    return 22; // Valeur par défaut si pas de paramètres
  };
  
  const urssafRate = getUrssafRate();
  const netRate = (100 - urssafRate) / 100; // Taux net (ex: 0.78 pour 22% de charges)

  // Calculate monthly revenue for the last 12 months
  const getMonthlyRevenue = () => {
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthServices = services.filter(service => {
        const serviceDate = new Date(service.date);
        return serviceDate.getMonth() === date.getMonth() && 
               serviceDate.getFullYear() === date.getFullYear();
      });
      
      const revenue = monthServices.reduce((acc, service) => 
        acc + (service.hours * service.hourly_rate * netRate), 0 // Net after URSSAF
      );
      
      monthlyData.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: revenue,
        hours: monthServices.reduce((acc, service) => acc + service.hours, 0),
        services: monthServices.length
      });
    }
    
    return monthlyData;
  };



  // Calculate annual revenue
  const getAnnualRevenue = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const yearServices = services.filter(service => {
      return new Date(service.date).getFullYear() === currentYear;
    });
    
    return {
      revenue: yearServices.reduce((acc, service) => 
        acc + (service.hours * service.hourly_rate * netRate), 0),
      hours: yearServices.reduce((acc, service) => acc + service.hours, 0),
      services: yearServices.length
    };
  };

  const monthlyData = getMonthlyRevenue();
  const annualData = getAnnualRevenue();
  
  // Calculate quarterly revenue BRUT for the chart
  const getQuarterlyRevenueBrut = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const quarters = [];
    
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3;
      const endMonth = startMonth + 2;
      
      const quarterServices = services.filter(service => {
        const serviceDate = new Date(service.date);
        const month = serviceDate.getMonth();
        return serviceDate.getFullYear() === currentYear &&
               month >= startMonth && month <= endMonth;
      });
      
      const revenue = quarterServices.reduce((acc, service) => 
        acc + (service.hours * service.hourly_rate), 0 // BRUT sans déduction
      );
      
      quarters.push({
        quarter: `Q${q} ${currentYear}`,
        revenue: revenue,
        hours: quarterServices.reduce((acc, service) => acc + service.hours, 0),
        services: quarterServices.length
      });
    }
    
    return quarters;
  };
  
  const quarterlyDataBrut = getQuarterlyRevenueBrut();
  
  // Calculs séparés pour brut et net
  const getMonthlyRevenueBrut = () => {
    const monthlyDataBrut = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthServices = services.filter(service => {
        const serviceDate = new Date(service.date);
        return serviceDate.getMonth() === date.getMonth() && 
               serviceDate.getFullYear() === date.getFullYear();
      });
      
      const revenue = monthServices.reduce((acc, service) => 
        acc + (service.hours * service.hourly_rate), 0 // Brut sans déduction
      );
      
      monthlyDataBrut.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        revenue: revenue,
        hours: monthServices.reduce((acc, service) => acc + service.hours, 0),
        services: monthServices.length
      });
    }
    
    return monthlyDataBrut;
  };
  
  const monthlyDataBrut = getMonthlyRevenueBrut();
  const maxMonthlyRevenue = Math.max(...monthlyDataBrut.map(m => m.revenue));
  const currentMonthRevenueBrut = monthlyDataBrut[monthlyDataBrut.length - 1]?.revenue || 0;
  const lastMonthRevenueBrut = monthlyDataBrut[monthlyDataBrut.length - 2]?.revenue || 0;
  const monthlyGrowthBrut = lastMonthRevenueBrut > 0 ? 
    ((currentMonthRevenueBrut - lastMonthRevenueBrut) / lastMonthRevenueBrut) * 100 : 0;
  
  // Calculs pour le net (utilisant les données existantes)
  const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
  const lastMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0;
  const monthlyGrowth = lastMonthRevenue > 0 ? 
    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

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
          <div className="absolute top-0 bottom-0 left-24 w-0.5 h-full bg-white/15 transform -rotate-6"></div>
          <div className="absolute top-0 bottom-0 right-12 w-0.5 h-full bg-white/20 transform rotate-45"></div>
          <div className="absolute top-0 bottom-0 right-24 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Statistiques</h1>
            <p className="text-white/80 mt-1">Tableaux de bord et analyses financières</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Euro className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Annuel (brut)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {annualData.revenue.toFixed(2)}€
            </p>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{annualData.services} prestations</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Mensuel (brut)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMonthRevenueBrut.toFixed(2)}€
            </p>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className={`w-4 h-4 mr-1 ${monthlyGrowthBrut >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={monthlyGrowthBrut >= 0 ? 'text-green-600' : 'text-red-600'}>
              {monthlyGrowthBrut >= 0 ? '+' : ''}{monthlyGrowthBrut.toFixed(1)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <Euro className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Mensuel (net)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMonthRevenue.toFixed(2)}€
            </p>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className={`w-4 h-4 mr-1 ${monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
              {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4 p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
            <Euro className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Annuel (net)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {(annualData.revenue * netRate).toFixed(2)}€
            </p>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Après déduction URSSAF ({urssafRate}%)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative">
          <div className="absolute top-4 right-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="pr-16">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Heures totales</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{annualData.hours}h</p>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Moyenne: {(annualData.hours / 12).toFixed(1)}h/mois
            </span>
          </div>
        </div>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Chiffre d'affaires mensuel (brut) – 12 derniers mois
          </h3>
          <div className="space-y-4">
            {monthlyData.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-16">
                    {month.month}
                  </span>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: maxMonthlyRevenue > 0 ? `${(month.revenue / maxMonthlyRevenue) * 100}%` : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {month.revenue.toFixed(0)}€
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {month.hours}h · {month.services} prestations
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quarterly revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Chiffre d'affaires trimestriel (brut)
          </h3>
          <div className="space-y-4">
            {quarterlyDataBrut.map((quarter, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{quarter.quarter}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {quarter.hours}h · {quarter.services} prestations
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {quarter.revenue.toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Quarterly chart */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Graphique trimestriel
            </h4>
            
            {/* Chart container with axes */}
            <div className="relative">
              {/* Y-axis */}
              <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {Math.max(...quarterlyDataBrut.map(q => q.revenue)).toFixed(0)}€
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {(Math.max(...quarterlyDataBrut.map(q => q.revenue)) * 0.75).toFixed(0)}€
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {(Math.max(...quarterlyDataBrut.map(q => q.revenue)) * 0.5).toFixed(0)}€
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {(Math.max(...quarterlyDataBrut.map(q => q.revenue)) * 0.25).toFixed(0)}€
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  0€
                </div>
              </div>
              
              {/* Chart area */}
              <div className="ml-8 mr-4">
                {/* Grid lines */}
                <div className="relative h-40">
                  {/* Horizontal grid lines */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute top-3/4 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
                  
                  {/* Y-axis line */}
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-400 dark:bg-gray-500"></div>
                  
                  {/* X-axis line */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-400 dark:bg-gray-500"></div>
                  
                  {/* Bars container - full height */}
                  <div className="absolute inset-0 flex items-end justify-center space-x-6">
                    {quarterlyDataBrut.map((quarter, index) => {
                      const maxQuarterlyRevenue = Math.max(...quarterlyDataBrut.map(q => q.revenue));
                      const barHeight = maxQuarterlyRevenue > 0 ? (quarter.revenue / maxQuarterlyRevenue) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center h-full">
                          {/* Bar */}
                          <div className="relative w-12 h-full flex flex-col justify-end">
                            <div
                              className="w-full bg-purple-600 dark:bg-purple-500 rounded-t-lg transition-all duration-500 ease-out"
                              style={{
                                height: `${barHeight}%`,
                                minHeight: quarter.revenue > 0 ? '4px' : '0px'
                              }}
                            />
                            {/* Value on top of bar */}
                            {quarter.revenue > 0 && (
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-1 py-0.5 rounded shadow-sm">
                                  {quarter.revenue.toFixed(0)}€
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* X-axis labels */}
                <div className="flex justify-center space-x-6 mt-4">
                  {quarterlyDataBrut.map((quarter, index) => (
                    <div key={index} className="text-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {quarter.quarter}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {quarter.hours}h · {quarter.services} prest.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Axis labels */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Trimestres
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Montant (€)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Top clients par chiffre d'affaires (brut)
        </h3>
        <div className="space-y-4">
          {clients
            .map(client => {
              const clientServices = services.filter(s => s.client_id === client.id);
              const revenue = clientServices.reduce((acc, s) => 
                acc + (s.hours * s.hourly_rate), 0);
              const hours = clientServices.reduce((acc, s) => acc + s.hours, 0);
              return { client, revenue, hours, serviceCount: clientServices.length };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
            .map((item, index) => (
              <div key={item.client.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.client.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.serviceCount} prestations · {item.hours}h
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {item.revenue.toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}