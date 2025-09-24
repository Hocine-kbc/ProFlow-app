import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, Calendar, Euro } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createService, updateService as updateServiceApi, deleteService as deleteServiceApi } from '../lib/api';
import { Service, Client } from '../types';

export default function ServicesPage() {
  const { state, dispatch } = useApp();
  const { services, clients } = state;
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ client: Client; items: Service[] } | null>(null);
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
      // eslint-disable-next-line no-alert
      alert('Erreur lors de la sauvegarde de la prestation');
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

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette prestation ?')) return;
    try {
      await deleteServiceApi(id);
      dispatch({ type: 'DELETE_SERVICE', payload: id });
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Erreur lors de la suppression');
    }
  };

  const calculateAmount = (hours: number, rate: number) => hours * rate;
  const calculateUrssafDeduction = (amount: number) => amount * 0.22; // 22% URSSAF
  const calculateNetAmount = (amount: number) => amount - calculateUrssafDeduction(amount);

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
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="name">Trier par nom</option>
            <option value="hours">Trier par heures</option>
            <option value="amount">Trier par montant</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="asc">Ascendant</option>
            <option value="desc">Descendant</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients
          .map(c => ({
            client: c,
            items: services.filter(s => s.client_id === c.id),
          }))
          .filter(g => g.items.length > 0)
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
            return (
              <div key={group.client.id} className="relative bg-white rounded-2xl shadow-lg border border-transparent ring-1 ring-gray-100 p-6 overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{group.client.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{group.items.length} prestation{group.items.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-xs text-gray-500">Heures</div>
                    <div className="text-base font-semibold text-gray-900">{totalHours}h</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-pink-100">
                    <div className="text-xs text-gray-500">Montant brut</div>
                    <div className="text-base font-semibold text-gray-900">{totalAmount.toFixed(2)}€</div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow"
                  >
                    Voir les prestations
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => exportGroupToCSV(group)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => exportGroupToPDF(group)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune prestation</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par enregistrer votre première prestation.
          </p>
        </div>
      )}

      {/* Modal */}
      {/* Client details modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
              <h3 className="text-lg font-semibold">Prestations – {selectedGroup.client.name}</h3>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Total heures</div>
                  <div className="text-base font-semibold text-gray-900">{selectedGroup.items.reduce((acc, s) => acc + s.hours, 0)}h</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Total brut</div>
                  <div className="text-base font-semibold text-gray-900">{selectedGroup.items.reduce((acc, s) => acc + calculateAmount(s.hours, s.hourly_rate), 0).toFixed(2)}€</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heures</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarif/h</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedGroup.items
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(service => {
                        const amount = calculateAmount(service.hours, service.hourly_rate);
                        return (
                          <tr key={service.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(service.date).toLocaleDateString('fr-FR')}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.hours}h</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.hourly_rate}€</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{amount.toFixed(2)}€</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                service.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : service.status === 'invoiced'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {service.status === 'completed' ? 'Terminée' : service.status === 'invoiced' ? 'Facturée' : 'En attente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button onClick={() => { setSelectedGroup(null); handleEdit(service); }} className="text-blue-600 hover:text-blue-900">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-900">
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
              <button onClick={() => setSelectedGroup(null)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heures *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tarif/h (€) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Détails de la prestation..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">En attente</option>
                  <option value="completed">Terminée</option>
                  <option value="invoiced">Facturée</option>
                </select>
              </div>
              
              {/* Preview calculation */}
              {formData.hours > 0 && formData.hourly_rate > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Montant brut:</span>
                    <span className="font-medium">
                      {calculateAmount(formData.hours, formData.hourly_rate).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Déduction URSSAF (22%):</span>
                    <span>
                      -{calculateUrssafDeduction(calculateAmount(formData.hours, formData.hourly_rate)).toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-green-600 border-t pt-2">
                    <span>Montant net:</span>
                    <span>
                      {calculateNetAmount(calculateAmount(formData.hours, formData.hourly_rate)).toFixed(2)}€
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingService ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}