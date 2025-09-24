import React, { useState } from 'react';
import { Plus, Trash2, FileText, Send, Download, Eye, Edit2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { openInvoicePrintWindow } from '../lib/print';
import { createInvoice, updateInvoice as updateInvoiceApi, deleteInvoice as deleteInvoiceApi } from '../lib/api';
import { Invoice } from '../types';

export default function InvoicesPage() {
  const { state, dispatch } = useApp();
  const { invoices, clients, services } = state;
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: '',
    date: '',
    due_date: '',
  });

  // Get available services for invoicing (completed but not invoiced)
  const availableServices = services.filter(s => s.status === 'completed');
  // When editing a draft, also allow keeping currently linked services
  const selectableServices = editingInvoice
    ? Array.from(
        new Map(
          [...availableServices, ...editingInvoice.services].map(s => [s.id, s])
        ).values()
      )
    : availableServices;

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = invoices.length + 1;
    return `FAC-${year}${month}-${String(count).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    const invoiceServices = selectableServices.filter(s => selectedServices.includes(s.id));
    
    const subtotal = invoiceServices.reduce((acc, service) => 
      acc + (service.hours * service.hourly_rate), 0
    );
    const urssafDeduction = subtotal * 0.22;
    const netAmount = subtotal - urssafDeduction;
    
    try {
      if (editingInvoice) {
        // Update only columns that exist on invoices table (exclude services array)
        const saved = await updateInvoiceApi(editingInvoice.id, {
          client_id: formData.client_id,
          invoice_number: formData.invoice_number,
          date: formData.date,
          due_date: formData.due_date,
          subtotal,
          urssaf_deduction: urssafDeduction,
          net_amount: netAmount,
          status: 'draft',
        } as any);
        dispatch({ type: 'UPDATE_INVOICE', payload: { ...editingInvoice, ...saved, client, services: invoiceServices } as Invoice });
      } else {
        const saved = await createInvoice({
          client_id: formData.client_id,
          services: invoiceServices,
          invoice_number: formData.invoice_number || generateInvoiceNumber(),
          date: formData.date,
          due_date: formData.due_date,
          subtotal,
          urssaf_deduction: urssafDeduction,
          net_amount: netAmount,
          status: 'draft',
        } as any);
        dispatch({ type: 'ADD_INVOICE', payload: { ...saved, client, services: invoiceServices } as Invoice });
        // Mark services as invoiced for new invoice
        invoiceServices.forEach(service => {
          dispatch({ 
            type: 'UPDATE_SERVICE', 
            payload: { ...service, status: 'invoiced', updated_at: new Date().toISOString() }
          });
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(editingInvoice ? 'Erreur lors de la modification de la facture' : 'Erreur lors de la création de la facture');
      return;
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      invoice_number: '',
      date: '',
      due_date: '',
    });
    setSelectedServices([]);
    setShowModal(false);
    setEditingInvoice(null);
  };
  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setShowModal(true);
    setFormData({
      client_id: inv.client_id,
      invoice_number: inv.invoice_number,
      date: inv.date,
      due_date: inv.due_date,
    });
    setSelectedServices(inv.services.map(s => s.id));
  };

  const updateInvoiceStatus = async (invoiceId: string, status: 'draft' | 'sent' | 'paid') => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      try {
        const saved = await updateInvoiceApi(invoiceId, { status });
        dispatch({
          type: 'UPDATE_INVOICE',
          payload: { ...invoice, ...saved }
        });
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert("Erreur lors de la mise à jour de la facture");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      // Mark services as completed again
      const invoice = invoices.find(inv => inv.id === id);
      if (invoice) {
        invoice.services.forEach(service => {
          dispatch({
            type: 'UPDATE_SERVICE',
            payload: { ...service, status: 'completed', updated_at: new Date().toISOString() }
          });
        });
      }
      try {
        await deleteInvoiceApi(id);
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert('Erreur lors de la suppression');
      }
    }
  };

  // kept via selectableServices in edit/new flows

  // Simple monthly totals (last 6 months)
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

  const totalHT = invoices.reduce((acc, inv) => acc + inv.subtotal, 0);
  const totalPayees = invoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + inv.subtotal, 0);
  const totalEnvoyees = invoices.filter(i => i.status === 'sent').length;
  const maxBar = Math.max(1, ...monthlyTotals.map(m => m.total));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Factures</h1>
            <p className="text-white/80 mt-1">Suivez vos factures avec un design moderne et coloré.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle facture
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Total HT</div>
          <div className="text-xl font-bold text-gray-900">{totalHT.toFixed(2)}€</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Payées</div>
          <div className="text-xl font-bold text-green-600">{totalPayees.toFixed(2)}€</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500">Envoyées en attente</div>
          <div className="text-xl font-bold text-indigo-600">{totalEnvoyees}</div>
        </div>
      </div>

      {/* Mini chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">CA mensuel (6 derniers mois)</h3>
        <div className="flex items-end gap-3 h-24">
          {monthlyTotals.map((m, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
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

      {/* Invoices table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant HT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant Net
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client?.name || 'Client inconnu'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {invoice.subtotal.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                    {invoice.net_amount.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => openEdit(invoice)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => console.log('View invoice:', invoice.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'sent')}
                          className="text-blue-600 hover:text-blue-900"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="text-green-600 hover:text-green-900"
                          title="Marquer comme payée"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openInvoicePrintWindow(invoice)}
                        className="text-purple-600 hover:text-purple-900"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune facture</h3>
          <p className="mt-1 text-sm text-gray-500">
            Créez votre première facture à partir des prestations terminées.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">{editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}</h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
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
                    N° Facture
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder={generateInvoiceNumber()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de facture *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date d'échéance *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Services selection */}
              {(formData.client_id || editingInvoice) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prestations à facturer *
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {selectableServices.filter(s => s.client_id === formData.client_id).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        Aucune prestation terminée disponible pour ce client.
                      </p>
                    ) : (
                      selectableServices.filter(s => s.client_id === formData.client_id).map((service) => (
                        <label key={service.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, service.id]);
                              } else {
                                setSelectedServices(selectedServices.filter(id => id !== service.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">
                                {new Date(service.date).toLocaleDateString('fr-FR')}
                              </span>
                              <span className="text-sm text-gray-600">
                                {service.hours}h × {service.hourly_rate}€ = {(service.hours * service.hourly_rate).toFixed(2)}€
                              </span>
                            </div>
                            {service.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {/* Total preview */}
              {selectedServices.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total HT:</span>
                    <span className="font-medium">
                      {services
                        .filter(s => selectedServices.includes(s.id))
                        .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0)
                        .toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Déduction URSSAF (22%):</span>
                    <span>
                      -{(services
                        .filter(s => selectedServices.includes(s.id))
                        .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0) * 0.22)
                        .toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-green-600 border-t pt-2">
                    <span>Total net:</span>
                    <span>
                      {(services
                        .filter(s => selectedServices.includes(s.id))
                        .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0) * 0.78)
                        .toFixed(2)}€
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
                  disabled={selectedServices.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Créer la facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}