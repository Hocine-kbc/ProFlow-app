import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Calendar, Euro } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createService, updateService as updateServiceApi, deleteService as deleteServiceApi } from '../lib/api';
import { Service, Client } from '../types';
import AlertModal from './AlertModal';
import Notification from './Notification';

export default function ServicesPage() {
  const { state, dispatch } = useApp();
  const { services, clients } = state;
  
  // Debug: Log services and clients data
  console.log('ServicesPage Debug:', {
    totalServices: services.length,
    totalClients: clients.length,
    services: services.map(s => ({ id: s.id, client_id: s.client_id, description: s.description })),
    clients: clients.map(c => ({ id: c.id, name: c.name })),
    servicesWithoutClient: services.filter(s => !clients.find(c => c.id === s.client_id))
  });
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ client: Client; items: Service[] } | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  });
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success'
  });
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'amount'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState({
    client_id: '',
    date: '',
    hours: 0,
    hourly_rate: 25,
    description: '',
    status: 'pending' as 'pending' | 'completed' | 'invoiced',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    
    try {
      if (editingService) {
        const saved = await updateServiceApi(editingService.id, { ...formData });
        dispatch({ type: 'UPDATE_SERVICE', payload: { ...saved, client } as Service });
      } else {
        const saved = await createService({ ...formData } as any);
        dispatch({ type: 'ADD_SERVICE', payload: { ...saved, client } as Service });
      }
    } catch (err) {
      setNotification({
        isOpen: true,
        title: 'Erreur de sauvegarde',
        message: 'Une erreur est survenue lors de la sauvegarde de la prestation.',
        type: 'error'
      });
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      date: '',
      hours: 0,
      hourly_rate: 25,
      description: '',
      status: 'pending',
    });
    setEditingService(null);
    setShowModal(false);
  };

  const handleEdit = (service: Service) => {
    setFormData({
      client_id: service.client_id,
      date: service.date,
      hours: service.hours,
      hourly_rate: service.hourly_rate,
      description: service.description,
      status: service.status,
    });
    setEditingService(service);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    setAlertModal({
      isOpen: true,
      title: 'Supprimer la prestation',
      message: `Êtes-vous sûr de vouloir supprimer cette prestation ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteServiceApi(id);
          dispatch({ type: 'DELETE_SERVICE', payload: id });
          setNotification({
            isOpen: true,
            title: 'Prestation supprimée',
            message: 'La prestation a été supprimée avec succès.',
            type: 'success'
          });
        } catch (err) {
          setNotification({
            isOpen: true,
            title: 'Erreur de suppression',
            message: 'Une erreur est survenue lors de la suppression de la prestation.',
            type: 'error'
          });
        }
      }
    });
  };

  const calculateAmount = (hours: number, rate: number) => hours * rate;

  const exportGroupToCSV = (group: { client: Client; items: Service[] }) => {
    const headers = ['Client', 'Date', 'Heures', 'Tarif/h', 'Montant', 'Statut'];
    const rows = group.items
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => [
        group.client.name,
        new Date(s.date).toLocaleDateString('fr-FR'),
        String(s.hours),
        `${s.hourly_rate}€`,
        `${calculateAmount(s.hours, s.hourly_rate).toFixed(2)}€`,
        s.status,
      ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prestations_${group.client.name.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportGroupToPDF = (group: { client: Client; items: Service[] }) => {
    const rows = group.items
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => `
        <tr>
          <td>${new Date(s.date).toLocaleDateString('fr-FR')}</td>
          <td style="text-align:right">${s.hours}h</td>
          <td style="text-align:right">${s.hourly_rate.toFixed(2)}€</td>
          <td style="text-align:right">${calculateAmount(s.hours, s.hourly_rate).toFixed(2)}€</td>
          <td>${s.status}</td>
        </tr>
      `)
      .join('');
    const totalHours = group.items.reduce((acc, s) => acc + s.hours, 0);
    const totalAmount = group.items.reduce((acc, s) => acc + calculateAmount(s.hours, s.hourly_rate), 0);
    const html = `<!doctype html>
      <html lang="fr"><head><meta charset="utf-8" />
      <title>Prestations - ${group.client.name}</title>
      <style>
        @page { size: A4 portrait; margin: 16mm; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111827; }
        h1{ font-size:18px; margin:0 0 8px; }
        .muted{ color:#6b7280; font-size:12px; }
        table { width:100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
        th { text-align:left; background:#f9fafb; color:#374151; }
        .right{ text-align:right; }
        .totals{ margin-top: 12px; }
      </style></head><body>
        <h1>Prestations – ${group.client.name}</h1>
        <div class="muted">Total heures: ${totalHours}h · Total brut: ${totalAmount.toFixed(2)}€</div>
        <table>
          <thead><tr>
            <th>Date</th><th class="right">Heures</th><th class="right">Tarif/h</th><th class="right">Montant</th><th>Statut</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prestations</h1>
            <p className="text-white/80 mt-1">Gérez vos prestations par client avec un aperçu clair et moderne.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle prestation
          </button>
        </div>
      </div>

      {/* Services cards by client */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">Trier par nom</option>
            <option value="hours">Trier par heures</option>
            <option value="amount">Trier par montant</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="asc">Ascendant</option>
            <option value="desc">Descendant</option>
          </select>
        </div>
      </div>

      {/* Debug: Orphaned services */}
      {(() => {
        const orphanedServices = services.filter(s => !clients.find(c => c.id === s.client_id));
        if (orphanedServices.length > 0) {
          return (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 rounded-xl">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                ⚠️ Prestations orphelines ({orphanedServices.length})
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                Ces prestations n'ont pas de client associé et ne sont pas affichées dans la liste principale.
              </p>
              <div className="space-y-2">
                {orphanedServices.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-yellow-200 dark:border-yellow-600">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{service.description || 'Sans description'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Client ID: {service.client_id} | {service.hours}h × {service.hourly_rate}€ = {(service.hours * service.hourly_rate).toFixed(2)}€
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="px-3 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="px-3 py-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
        {(() => {
          const groups = clients
            .map(c => ({
              client: c,
              items: services.filter(s => s.client_id === c.id),
            }))
            .filter(g => g.items.length > 0);
          
          console.log('ServicesPage Groups Debug:', {
            totalGroups: groups.length,
            groups: groups.map(g => ({
              clientName: g.client.name,
              clientId: g.client.id,
              servicesCount: g.items.length,
              services: g.items.map(s => ({ id: s.id, description: s.description }))
            }))
          });
          
          return groups;
        })()
          .filter(g => g.client.name.toLowerCase().includes(query.toLowerCase()))
          .sort((a, b) => {
            const metrics = (g: { client: Client; items: Service[] }) => ({
              name: g.client.name.toLowerCase(),
              hours: g.items.reduce((acc, s) => acc + s.hours, 0),
              amount: g.items.reduce((acc, s) => acc + calculateAmount(s.hours, s.hourly_rate), 0),
            });
            const A = metrics(a);
            const B = metrics(b);
            let cmp = 0;
            if (sortBy === 'name') cmp = A.name.localeCompare(B.name);
            if (sortBy === 'hours') cmp = A.hours - B.hours;
            if (sortBy === 'amount') cmp = A.amount - B.amount;
            return sortDir === 'asc' ? cmp : -cmp;
          })
          .map(group => {
            const totalHours = group.items.reduce((acc, s) => acc + s.hours, 0);
            const totalAmount = group.items.reduce((acc, s) => acc + calculateAmount(s.hours, s.hourly_rate), 0);
            const completedServices = group.items.filter(s => s.status === 'completed').length;
            const invoicedServices = group.items.filter(s => s.status === 'invoiced').length;
            
            return (
              <div key={group.client.id} className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Gradient background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Top accent bar */}
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                
                {/* Client info header */}
                <div className="relative z-10 mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
                      {group.client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {group.client.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">
                        {group.items.length} prestation{group.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-2.5 sm:p-3 border border-blue-200 dark:border-blue-700 group-hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Heures</div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">{totalHours}h</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-2.5 sm:p-3 border border-emerald-200 dark:border-emerald-700 group-hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Euro className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Brut</div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-900 dark:text-emerald-100">{totalAmount.toFixed(2)}€</div>
                  </div>
                </div>


                {/* Progress bar for completion status */}
                <div className="relative z-10 mb-4">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300 mb-1.5">
                    <span>Progression</span>
                    <span>{Math.round(((completedServices + invoicedServices) / group.items.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${((completedServices + invoicedServices) / group.items.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="relative z-10 space-y-2">
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="w-full inline-flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 dark:hover:from-blue-800 dark:hover:via-indigo-800 dark:hover:to-purple-800 shadow-lg hover:shadow-xl border border-blue-500 dark:border-blue-600 transition-all duration-300 font-medium text-xs sm:text-sm"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Voir les prestations
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => exportGroupToCSV(group)}
                      className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 font-medium text-xs"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportGroupToPDF(group)}
                      className="inline-flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 font-medium text-xs"
                    >
                      Export PDF
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
      </div>

      {/* Empty state */}
      {services.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune prestation</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Commencez par enregistrer votre première prestation.
          </p>
        </div>
      )}

      {/* Modal */}
      {/* Client details modal */}
      {selectedGroup && (
        <div 
          className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Prestations – {selectedGroup.client.name}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Total heures</div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">{selectedGroup.items.reduce((acc, s) => acc + s.hours, 0)}h</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Total brut</div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">{selectedGroup.items.reduce((acc, s) => acc + calculateAmount(s.hours, s.hourly_rate), 0).toFixed(2)}€</div>
                </div>
              </div>
              <div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Heures</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarif/h</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {selectedGroup.items
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(service => {
                        const amount = calculateAmount(service.hours, service.hourly_rate);
                        return (
                          <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{new Date(service.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                              <div className="truncate" title={service.description || 'Aucune description'}>
                                {service.description || 'Aucune description'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{service.hours}h</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{service.hourly_rate}€</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{amount.toFixed(2)}€</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                service.status === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                  : service.status === 'invoiced'
                                  ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                              }`}>
                                {service.status === 'completed' ? 'Terminée' : service.status === 'invoiced' ? 'Facturée' : 'En attente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button onClick={() => { setSelectedGroup(null); handleEdit(service); }} className="text-blue-600 hover:text-blue-900 p-1 rounded border border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900 p-1 rounded border border-red-200 hover:border-red-300 hover:bg-red-50 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setSelectedGroup(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md transition-all">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex-shrink-0 rounded-t-lg">
              <h3 className="text-lg font-semibold">
                {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client *
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Heures *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={formData.hours}
                      onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tarif/h (€) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Détails de la prestation..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Statut
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="pending">En attente</option>
                    <option value="completed">Terminée</option>
                    <option value="invoiced">Facturée</option>
                  </select>
                </div>
                
                {/* Preview calculation */}
                {formData.hours > 0 && formData.hourly_rate > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between text-sm font-semibold text-green-600 dark:text-green-400">
                      <span>Montant total:</span>
                      <span>
                        {calculateAmount(formData.hours, formData.hourly_rate).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t flex space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all"
                >
                  {editingService ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={alertModal.onConfirm}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        confirmText="Confirmer"
        cancelText="Annuler"
      />

      {/* Notification */}
      <Notification
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        title={notification.title}
        message={notification.message}
        type={notification.type}
        autoClose={true}
        duration={3000}
      />
    </div>
  );
}