import React from 'react';
import { Users, Clock, Euro, FileText, TrendingUp, Calendar } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export default function Dashboard() {
  const { state } = useApp();
  const { stats, services, clients, invoices } = state;

  const recentServices = services.slice(0, 5);
  const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
  // Derived for charts
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
  const monthlyTotals = months.map((m) => {
    const total = invoices
      .filter(inv => {
        const d = new Date(inv.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      })
      .reduce((acc, inv) => acc + inv.subtotal, 0);
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }), total };
  });
  const maxBar = Math.max(1, ...monthlyTotals.map(m => m.total));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord</h1>
            <p className="text-white/80 mt-1">Aperçu de votre activité</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CA Mensuel</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.monthly_revenue.toFixed(2)}€
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Euro className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-600">+12.3%</span>
            <span className="text-gray-500 ml-2">ce mois</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">+{clients.filter(c => {
              const oneMonthAgo = new Date();
              oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
              return new Date(c.created_at) > oneMonthAgo;
            }).length} nouveau(x) ce mois</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Heures ce mois</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.filter(s => {
                  const thisMonth = new Date();
                  thisMonth.setDate(1);
                  return new Date(s.date) >= thisMonth;
                }).reduce((acc, s) => acc + s.hours, 0)}h
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Total: {stats.total_hours}h</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Factures en attente</p>
              <p className="text-2xl font-bold text-gray-900">{pendingInvoices.length}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <FileText className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">
              {pendingInvoices.reduce((acc, inv) => acc + inv.net_amount, 0).toFixed(2)}€ en attente
            </span>
          </div>
        </div>
      </div>

      {/* Graph + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">CA mensuel (6 derniers mois)</h3>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-3 h-28">
              {monthlyTotals.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-blue-500 to-indigo-500"
                    style={{ height: `${(m.total / maxBar) * 100}%` }}
                    title={`${m.total.toFixed(2)}€`}
                  />
                  <span className="mt-1 text-xs text-gray-600">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Prestations récentes</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentServices.map((service) => (
              <div key={service.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {service.client?.name || 'Client inconnu'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(service.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {service.hours}h
                  </p>
                  <p className="text-sm text-gray-500">
                    {(service.hours * service.hourly_rate).toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des statuts factures</h3>
          </div>
          <div className="p-6">
            {(() => {
              const total = Math.max(1, invoices.length);
              const paid = invoices.filter(i => i.status === 'paid').length;
              const sent = invoices.filter(i => i.status === 'sent').length;
              const draft = invoices.filter(i => i.status === 'draft').length;
              return (
                <div className="flex items-end gap-4 h-28">
                  {[{label:'Payées', value:paid, color:'from-green-500 to-emerald-500'}, {label:'Envoyées', value:sent, color:'from-yellow-500 to-amber-500'}, {label:'Brouillons', value:draft, color:'from-gray-400 to-gray-500'}].map((bar) => (
                    <div key={bar.label} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t bg-gradient-to-t ${bar.color}`}
                        style={{ height: `${(bar.value / total) * 100}%` }}
                        title={`${bar.value}`}
                      />
                      <span className="mt-1 text-xs text-gray-600">{bar.label}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Factures récentes</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {invoices.slice(0, 5).map((invoice) => (
              <div key={invoice.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <FileText className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      #{invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {invoice.net_amount.toFixed(2)}€
                  </p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    invoice.status === 'paid' 
                      ? 'bg-green-100 text-green-800'
                      : invoice.status === 'sent'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status === 'paid' ? 'Payée' : 
                     invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}