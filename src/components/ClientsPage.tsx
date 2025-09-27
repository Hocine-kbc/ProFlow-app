import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin, Users } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from '../lib/api';
import { Client } from '../types';
import AlertModal from './AlertModal';
import Notification from './Notification';

export default function ClientsPage() {
  const { state, dispatch } = useApp();
  const { clients } = state;
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
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

  const handleDelete = (id: string) => {
    const client = clients.find(c => c.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Supprimer le client',
      message: `Êtes-vous sûr de vouloir supprimer le client "${client?.name}" ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteClientApi(id);
          dispatch({ type: 'DELETE_CLIENT', payload: id });
          setNotification({
            isOpen: true,
            title: 'Client supprimé',
            message: 'Le client a été supprimé avec succès.',
            type: 'success'
          });
        } catch (err) {
          setNotification({
            isOpen: true,
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la suppression du client.',
            type: 'error'
          });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-white/80 mt-1">Gérez vos clients avec un aperçu moderne et élégant.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </button>
        </div>
      </div>

      {/* Clients grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {clients.map((client) => (
          <div key={client.id} className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            {/* Gradient background overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Top accent bar */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            {/* Client info header */}
            <div className="relative z-10 mb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                      {client.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-300 font-medium">
                      Client depuis {new Date(client.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="relative z-10 space-y-2 mb-4">
              <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm truncate" title={client.email}>{client.email}</span>
              </div>
              
              {client.phone && (
                <div className="flex items-center text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate" title={client.phone}>{client.phone}</span>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-start text-gray-600 dark:text-gray-300 group-hover:text-blue-600 transition-colors">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm truncate" title={client.address}>{client.address}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="relative z-10 flex space-x-2">
              <button
                onClick={() => handleEdit(client)}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 shadow-sm hover:shadow-md transition-all font-medium text-xs sm:text-sm"
              >
                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Modifier
              </button>
              <button
                onClick={() => handleDelete(client.id)}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 shadow-sm hover:shadow-md transition-all font-medium text-xs sm:text-sm"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Empty state */}
      {clients.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun client</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Commencez par ajouter votre premier client.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div 
          className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
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
                  {editingClient ? 'Modifier' : 'Ajouter'}
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