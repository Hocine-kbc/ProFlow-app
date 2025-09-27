import React from 'react';
import { BarChart3, TrendingUp, Euro, Calendar, Users, Clock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function StatsPage() {
  const { state } = useApp();
  const { services, invoices, clients } = state;

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
        acc + (service.hours * service.hourly_rate * 0.78), 0 // Net after URSSAF
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

  // Calculate quarterly revenue
  const getQuarterlyRevenue = () => {
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
        acc + (service.hours * service.hourly_rate * 0.78), 0
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

  // Calculate annual revenue
  const getAnnualRevenue = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const yearServices = services.filter(service => {
      return new Date(service.date).getFullYear() === currentYear;
    });
    
    return {
      revenue: yearServices.reduce((acc, service) => 
        acc + (service.hours * service.hourly_rate * 0.78), 0),
      hours: yearServices.reduce((acc, service) => acc + service.hours, 0),
      services: yearServices.length
    };
  };

  const monthlyData = getMonthlyRevenue();
  const quarterlyData = getQuarterlyRevenue();
  const annualData = getAnnualRevenue();
  
  const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue));
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
  const lastMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0;
  const monthlyGrowth = lastMonthRevenue > 0 ? 
    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Statistiques</h1>
            <p className="text-white/80 mt-1">Analyse de votre chiffre d'affaires</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Annuel (brut)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {annualData.revenue.toFixed(2)}€
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Euro className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{annualData.services} prestations</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CA Mensuel (brut)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentMonthRevenue.toFixed(2)}€
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className={`w-4 h-4 mr-1 ${monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
              {monthlyGrowth >= 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Heures totales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{annualData.hours}h</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Moyenne: {(annualData.hours / 12).toFixed(1)}h/mois
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux horaire moyen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {services.length > 0 
                  ? (services.reduce((acc, s) => acc + s.hourly_rate, 0) / services.length).toFixed(0)
                  : 0}€
              </p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">{clients.length} clients actifs</span>
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
            {quarterlyData.map((quarter, index) => (
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