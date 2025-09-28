import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Users, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
    street: '',
    postalCode: '',
    city: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reconstituer l'adresse complète
    const addressParts = [formData.street, formData.postalCode, formData.city].filter(part => part.trim());
    const fullAddress = addressParts.join(', ');
    
    // Créer l'objet client avec seulement les champs existants dans la base de données
    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: fullAddress
    };
    
    try {
      if (editingClient) {
        const saved = await updateClientApi(editingClient.id, clientData as Partial<Client>);
        dispatch({ type: 'UPDATE_CLIENT', payload: saved });
      } else {
        const saved = await createClient(clientData as any);
        dispatch({ type: 'ADD_CLIENT', payload: saved });
      }
    } catch (err) {
      console.error('Error saving client:', err);
      // eslint-disable-next-line no-alert
      alert('Erreur lors de la sauvegarde du client');
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', street: '', postalCode: '', city: '' });
    setEditingClient(null);
    setShowModal(false);
  };

  const handleEdit = (client: Client) => {
    // Diviser l'adresse existante en composants
    let street = '';
    let postalCode = '';
    let city = '';
    
    if (client.address) {
      const addressParts = client.address.split(', ');
      street = addressParts[0] || '';
      postalCode = addressParts[1] || '';
      city = addressParts[2] || '';
    }
    
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      street: street,
      postalCode: postalCode,
      city: city,
    });
    setEditingClient(client);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    const client = clients.find(c => c.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Supprimer le client',
      message: `Êtes-vous sûr de vouloir supprimer le client "${client?.name}" ? Cette action supprimera également toutes les prestations associées à ce client, mais conservera les factures. Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteClientApi(id);
          dispatch({ type: 'DELETE_CLIENT', payload: id });
          setNotification({
            isOpen: true,
            title: 'Client supprimé',
            message: 'Le client et ses prestations ont été supprimés avec succès. Les factures ont été conservées.',
            type: 'success'
          });
        } catch (err: any) {
          console.error('Error deleting client:', err);
          setNotification({
            isOpen: true,
            title: 'Impossible de supprimer le client',
            message: err.message || 'Ce client a des factures associées. Supprimez d\'abord les factures avant de supprimer le client.',
            type: 'error'
          });
        }
      }
    });
  };

  // Filtrer les clients
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

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
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-white/80 mt-1">Gestion centralisée de votre portefeuille clients</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Clients table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                   Contact
                 </th>
                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                   Adresse
                 </th>
                 <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                   Date d'ajout
                 </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {currentClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {(() => {
                        const firstLetter = client.name.charAt(0).toUpperCase();
                        const colors = [
                          'from-blue-500 to-indigo-600',
                          'from-green-500 to-emerald-600',
                          'from-purple-500 to-violet-600',
                          'from-pink-500 to-rose-600',
                          'from-orange-500 to-red-600',
                          'from-teal-500 to-cyan-600',
                          'from-yellow-500 to-amber-600',
                          'from-red-500 to-pink-600',
                          'from-indigo-500 to-blue-600',
                          'from-emerald-500 to-green-600',
                          'from-violet-500 to-purple-600',
                          'from-rose-500 to-pink-600',
                          'from-amber-500 to-yellow-600',
                          'from-cyan-500 to-teal-600',
                          'from-lime-500 to-green-600',
                          'from-sky-500 to-blue-600',
                          'from-fuchsia-500 to-purple-600',
                          'from-stone-500 to-gray-600',
                          'from-slate-500 to-gray-600',
                          'from-zinc-500 to-gray-600',
                          'from-neutral-500 to-gray-600',
                          'from-gray-500 to-slate-600',
                          'from-red-500 to-orange-600',
                          'from-orange-500 to-amber-600',
                          'from-yellow-500 to-lime-600',
                          'from-lime-500 to-green-600'
                        ];
                        const colorIndex = firstLetter.charCodeAt(0) % colors.length;
                        const gradientClass = colors[colorIndex];
                        
                        return (
                          <div className={`w-10 h-10 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {firstLetter}
                          </div>
                        );
                      })()}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {client.name}
                        </div>
                      </div>
                    </div>
                  </td>
                   <td className="px-6 py-4">
                     <div className="space-y-1">
                       <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                         <Mail className="w-4 h-4 mr-2" />
                         <span className="truncate max-w-xs" title={client.email}>{client.email}</span>
                       </div>
                       {client.phone && (
                         <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                           <Phone className="w-4 h-4 mr-2" />
                           <span>{client.phone}</span>
                         </div>
                       )}
                     </div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                       {client.address ? (
                         <span className="break-words whitespace-normal">
                           {client.address}
                         </span>
                       ) : (
                         <span className="text-gray-400 dark:text-gray-500 italic">Non renseignée</span>
                       )}
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                     {new Date(client.created_at).toLocaleDateString('fr-FR')}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => handleEdit(client)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-2 py-1 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-2 py-1 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchTerm ? 'Aucun client trouvé' : 'Aucun client'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            {searchTerm 
              ? 'Essayez de modifier votre recherche ou ajoutez un nouveau client.'
              : 'Commencez par ajouter votre premier client.'
            }
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
                  Rue
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Commune
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all"
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