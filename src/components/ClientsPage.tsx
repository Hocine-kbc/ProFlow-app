import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin, Users } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from '../lib/api';
import { Client } from '../types';

export default function ClientsPage() {
  const { state, dispatch } = useApp();
  const { clients } = state;
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClient) {
        const saved = await updateClientApi(editingClient.id, formData as Partial<Client>);
        dispatch({ type: 'UPDATE_CLIENT', payload: saved });
      } else {
        const saved = await createClient(formData as any);
        dispatch({ type: 'ADD_CLIENT', payload: saved });
      }
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Erreur lors de la sauvegarde du client');
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '' });
    setEditingClient(null);
    setShowModal(false);
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
    });
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    try {
      await deleteClientApi(id);
      dispatch({ type: 'DELETE_CLIENT', payload: id });
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Gestion des clients</h1>
            <p className="text-white/80 mt-1">Vos clients présentés avec un style moderne.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </button>
        </div>
      </div>

      {/* Clients grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="relative bg-white rounded-2xl shadow-lg border border-transparent ring-1 ring-gray-100 p-6 overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {client.name}
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                  
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5" />
                    <span className="text-sm">{client.address}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(client)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Client depuis le {new Date(client.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun client</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par ajouter votre premier client.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
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
                  {editingClient ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}