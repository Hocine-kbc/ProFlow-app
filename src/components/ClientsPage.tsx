import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Users, Search, ChevronLeft, ChevronRight, CheckCircle, Circle, Trash, X, Eye, Archive } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';

// Import du type Client depuis le contexte
type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  siren?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
};

type ClientType = 'particulier' | 'professionnel';

type ClientFormData = {
  name: string;
  email: string;
  phone: string;
  siren: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  clientType: ClientType;
};
import { createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from '../lib/api.ts';
import AlertModal from './AlertModal.tsx';
import { supabase } from '../lib/supabase.ts';
import ClientDetailView from './ClientDetailView.tsx';
import ClientModal from './ClientModal.tsx';
import { ClientDetail } from '../types/clientDetail.ts';

interface ClientsPageProps {
  onPageChange?: (page: string) => void;
}

export default function ClientsPage({ onPageChange }: ClientsPageProps) {
  const { state, dispatch, showNotification } = useApp();
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
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    siren: '',
    street: '',
    postalCode: '',
    city: '',
    country: '',
    clientType: 'particulier',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showClientDetailView, setShowClientDetailView] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reconstituer l'adresse complète
    const addressParts = [formData.street, formData.postalCode, formData.city, formData.country].filter(part => part.trim());
    const fullAddress = addressParts.join(', ');
    
    // Créer l'objet client avec seulement les champs existants dans la base de données
    if (formData.clientType === 'professionnel') {
      const sirenTrim = (formData.siren || '').trim();
      if (!sirenTrim) {
        showNotification('error', 'SIREN requis', 'Veuillez renseigner le numéro SIREN pour un client professionnel.');
        return;
      }
    }

    const clientData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      siren: formData.clientType === 'professionnel' ? formData.siren.trim() || undefined : undefined,
      address: fullAddress
    };
    
    console.log('🔍 Données à sauvegarder:', clientData);
    console.log('🔍 Client en cours d\'édition:', editingClient);
    console.log('🔍 ID du client à modifier:', editingClient?.id);
    
    try {
      if (editingClient && editingClient.id) {
        console.log('🔄 Mise à jour du client avec ID:', editingClient.id);
        console.log('🔄 Données envoyées à l\'API:', clientData);
        const saved = await updateClientApi(editingClient.id, clientData as Partial<Client>);
        console.log('✅ Client sauvegardé:', saved);
        dispatch({ type: 'UPDATE_CLIENT', payload: saved });
        showNotification('success', 'Client modifié', 'Le client a été mis à jour avec succès');
        
        // Recharger les clients depuis la base de données pour s'assurer que les données sont à jour
        try {
          const { data: updatedClients, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!error && updatedClients) {
            console.log('🔄 Clients rechargés:', updatedClients);
            dispatch({ type: 'SET_CLIENTS', payload: updatedClients });
          }
        } catch (reloadError) {
          console.error('Error reloading clients:', reloadError);
        }
        
        // Si on est dans la vue détaillée, forcer le rechargement de cette vue
        if (showClientDetailView && selectedClientForDetail === editingClient.id) {
          // Fermer et rouvrir la vue détaillée pour forcer le rechargement
          setShowClientDetailView(false);
          setTimeout(() => {
            setShowClientDetailView(true);
          }, 100);
        }
      } else {
        const saved = await createClient(clientData as any);
        dispatch({ type: 'ADD_CLIENT', payload: saved });
        showNotification('success', 'Client créé', 'Le client a été créé avec succès');
      }
    } catch (err) {
      console.error('Error saving client:', err);
      // eslint-disable-next-line no-alert
      showNotification('error', 'Erreur', 'Erreur lors de la sauvegarde du client');
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', siren: '', street: '', postalCode: '', city: '', country: '', clientType: 'particulier' });
    setEditingClient(null);
    setShowModal(false);
  };

  const handleEdit = (client: Client) => {
    // Diviser l'adresse existante en composants
    let street = '';
    let postalCode = '';
    let city = '';
    let country = '';
    
    if (client.address) {
      const addressParts = client.address.split(', ');
      street = addressParts[0] || '';
      postalCode = addressParts[1] || '';
      city = addressParts[2] || '';
      country = addressParts[3] || '';
    }
    
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      siren: client.siren || '',
      street: street,
      postalCode: postalCode,
      city: city,
      country: country,
      clientType: client.siren ? 'professionnel' : 'particulier',
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
          showNotification('success', 'Client supprimé', 'Le client et ses prestations ont été supprimés avec succès. Les factures ont été conservées.');
        } catch (err: unknown) {
          console.error('Error deleting client:', err);
          const errorMessage = err instanceof Error ? err.message : 'Ce client a des factures associées. Supprimez d\'abord les factures avant de supprimer le client.';
          showNotification('error', 'Impossible de supprimer le client', errorMessage);
        }
      }
    });
  };

  const handleArchive = (id: string) => {
    const client = clients.find(c => c.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Archiver le client',
      message: `Êtes-vous sûr de vouloir archiver le client "${client?.name}" ? Il sera déplacé vers l'archive et ne sera plus visible dans la liste principale.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('clients')
            .update({ 
              status: 'archived'
            })
            .eq('id', id);
          
          if (error) throw error;
          
          dispatch({ type: 'UPDATE_CLIENT', payload: { 
            ...client, 
            status: 'archived'
          } as Client });
          showNotification('success', 'Client archivé', 'Le client a été archivé avec succès');
        } catch (error) {
          console.error('Error archiving client:', error);
          showNotification('error', 'Erreur', 'Impossible d\'archiver le client');
        }
      }
    });
  };

  // Fonctions de gestion de sélection multiple
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedClients(new Set());
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const toggleAllClientsSelection = () => {
    const allSelected = currentClients.every(client => selectedClients.has(client.id));
    if (allSelected) {
      // Désélectionner tous les clients
      currentClients.forEach(client => {
        if (selectedClients.has(client.id)) {
          toggleClientSelection(client.id);
        }
      });
    } else {
      // Sélectionner tous les clients
      currentClients.forEach(client => {
        if (!selectedClients.has(client.id)) {
          toggleClientSelection(client.id);
        }
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedClients.size === 0) return;
    
    setAlertModal({
      isOpen: true,
      title: 'Supprimer les clients sélectionnés',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedClients.size} client(s) sélectionné(s) ? Cette action supprimera également toutes les prestations associées à ces clients, mais conservera les factures. Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          // Supprimer tous les clients sélectionnés
          for (const clientId of selectedClients) {
            await deleteClientApi(clientId);
            dispatch({ type: 'DELETE_CLIENT', payload: clientId });
          }
          
          showNotification('success', 'Clients supprimés', `${selectedClients.size} client(s) supprimé(s) avec succès`);
          setSelectedClients(new Set());
          setIsSelectionMode(false);
        } catch (err) {
          console.error('Erreur lors de la suppression multiple:', err);
          showNotification('error', 'Erreur', 'Impossible de supprimer certains clients');
        }
      }
    });
  };


  // Fonctions pour la vue détaillée client
  const handleOpenClientDetail = (clientId: string) => {
    setSelectedClientForDetail(clientId);
    setShowClientDetailView(true);
  };

  const handleCloseClientDetail = () => {
    setShowClientDetailView(false);
    setSelectedClientForDetail(null);
  };

  const handleEditClientDetail = (client: ClientDetail) => {
    console.log('🔍 ClientDetail reçu:', client);
    console.log('🔍 Champs séparés - city:', client.city, 'postalCode:', client.postalCode, 'country:', client.country);
    console.log('🔍 Adresse complète:', client.address);
    
    // Créer un objet Client à partir des données ClientDetail
    const clientToEdit: Client = {
      id: client.id,
      user_id: '', // Will be set by the API
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      created_at: client.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('🔍 Client converti:', clientToEdit);
    
    // Pré-remplir le formulaire avec les données du client
    let street = '';
    let city = '';
    let postalCode = '';
    let country = '';
    
    // Utiliser directement les champs du ClientDetail s'ils existent
    if (client.city || client.postalCode || client.country) {
      // Utiliser les champs séparés du ClientDetail
      city = client.city || '';
      postalCode = client.postalCode || '';
      country = client.country || '';
      
      // Pour la rue, essayer d'extraire de l'adresse complète
      if (client.address) {
        // Si l'adresse contient des virgules, prendre la première partie comme rue
        const addressParts = client.address.split(',').map(part => part.trim());
        if (addressParts.length > 0) {
          street = addressParts[0];
        }
      }
    } else if (client.address) {
      // Parser l'adresse complète si pas de champs séparés
      const addressParts = client.address.split(',').map(part => part.trim());
      street = addressParts[0] || '';
      postalCode = addressParts[1] || '';
      city = addressParts[2] || '';
      country = addressParts[3] || '';
    }
    
    const originalClient = clients.find((c) => c.id === client.id) as (typeof clients[number] & { siren?: string }) | undefined;
    const originalSiren = (originalClient?.siren ?? '') as string;

    const formDataToSet: ClientFormData = {
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      siren: originalSiren,
      street,
      postalCode,
      city,
      country,
      clientType: originalSiren ? 'professionnel' : 'particulier',
    };
    
    console.log('🔍 FormData à définir:', formDataToSet);
    console.log('🔍 Mapping final - street:', street, 'postalCode:', postalCode, 'city:', city, 'country:', country);
    setFormData(formDataToSet);
    
    setEditingClient(clientToEdit);
    setShowModal(true);
  };

  const handleCreateInvoiceForClient = (clientId: string) => {
    // Fermer la vue détaillée et rediriger vers la page de création de facture
    setShowClientDetailView(false);
    setSelectedClientForDetail(null);
    
    if (onPageChange) {
      // Stocker l'ID du client pour pré-sélection dans la page factures
      localStorage.setItem('preselectedClientId', clientId);
      onPageChange('invoices');
    } else {
      showNotification('error', 'Erreur', 'Impossible de rediriger vers la page de création de facture.');
    }
  };
  
  // Filtrer les clients (exclure les clients archivés)
  const filteredClients = clients.filter(client =>
    (client.status !== 'archived') && (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm))
    )
  );

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  // Si la vue détaillée est ouverte, afficher celle-ci avec la modal par-dessus si nécessaire
  if (showClientDetailView && selectedClientForDetail) {
    return (
      <>
        <ClientDetailView
          clientId={selectedClientForDetail}
          onBack={handleCloseClientDetail}
          onEditClient={handleEditClientDetail}
          onCreateInvoice={handleCreateInvoiceForClient}
        />
        
        {/* Modal d'édition par-dessus la vue détaillée */}
        <ClientModal
          isOpen={showModal}
          onSubmit={handleSubmit}
          formData={formData}
          setFormData={setFormData}
          editingClient={editingClient}
          resetForm={resetForm}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-green-600 via-green-600 to-green-700 dark:from-green-700 dark:via-green-700 dark:to-green-800 text-white shadow-lg overflow-hidden">
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
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">Clients</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Gestion centralisée de votre portefeuille clients</p>
          </div>
          <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-full bg-green-500/30 hover:bg-green-500/40 backdrop-blur transition-colors border border-green-400/30 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouveau client</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-4 sm:p-6">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm sm:text-base"
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Actions de sélection à l'emplacement du bouton */}
      {clients.length > 0 && (
        <div className="flex justify-end items-center">
          {!isSelectionMode ? (
            <button
              key="mode-selection"
              type="button"
              onClick={toggleSelectionMode}
              className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm animate-in fade-in zoom-in-95 duration-300 ease-out"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mode sélection
            </button>
          ) : (
            <div key="selection-actions" className="flex items-center gap-3 animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-300 ease-out">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">
                {selectedClients.size} client{selectedClients.size !== 1 ? 's' : ''} sélectionné{selectedClients.size !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedClients.size === 0}
                className="inline-flex items-center px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer sélection
              </button>
              <button
                type="button"
                onClick={toggleSelectionMode}
                className="inline-flex items-center px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm whitespace-nowrap"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clients - Mobile Cards / Desktop Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 overflow-hidden">

      {/* Mobile Cards View */}
      <div className="block lg:hidden">
          {/* Bouton Tout sélectionner pour mobile */}
          {isSelectionMode && currentClients.length > 0 && (
            <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={toggleAllClientsSelection}
                className="inline-flex items-center px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {currentClients.every(client => selectedClients.has(client.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
          )}
          
          {currentClients.map((client) => {
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
              <div key={client.id} className="border-b border-gray-200 dark:border-gray-600 p-4 last:border-b-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {isSelectionMode && (
                      <button
                        type="button"
                        onClick={() => toggleClientSelection(client.id)}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {selectedClients.has(client.id) ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    )}
                    <div className={`w-10 h-10 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                      {firstLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {client.name}
                      </h3>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                          <Mail className="w-3 h-3 mr-2 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <Phone className="w-3 h-3 mr-2 flex-shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            <span className="break-words">{client.address}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Ajouté le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      type="button"
                      onClick={() => handleOpenClientDetail(client.id)}
                      className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-slate-800/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Tableau de bord client"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(client)}
                      className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-slate-800/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(client.id)}
                      className="p-2 rounded-full text-gray-500 hover:text-orange-600 bg-gray-50/50 hover:bg-orange-50/50 dark:text-gray-400 dark:hover:text-orange-400 dark:bg-slate-800/30 dark:hover:bg-orange-900/20 border border-gray-200/50 hover:border-orange-200/50 dark:border-gray-600/50 dark:hover:border-orange-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Archiver"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(client.id)}
                      className="p-2 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-slate-800/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {isSelectionMode && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = currentClients.every(client => selectedClients.has(client.id));
                        if (allSelected) {
                          // Désélectionner tous les clients
                          currentClients.forEach(client => {
                            if (selectedClients.has(client.id)) {
                              toggleClientSelection(client.id);
                            }
                          });
                        } else {
                          // Sélectionner tous les clients
                          currentClients.forEach(client => {
                            if (!selectedClients.has(client.id)) {
                              toggleClientSelection(client.id);
                            }
                          });
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={currentClients.every(client => selectedClients.has(client.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                      {currentClients.every(client => selectedClients.has(client.id)) ? (
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                 <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                   Contact
                 </th>
                 <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                   Adresse
                 </th>
                 <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                   Date d'ajout
                 </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {currentClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  {isSelectionMode && (
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleClientSelection(client.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {selectedClients.has(client.id) ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-start min-w-0">
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
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md flex-shrink-0`}>
                            {firstLetter}
                          </div>
                        );
                      })()}
                      <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2" title={client.name}>
                          {client.name}
                        </div>
                      </div>
                    </div>
                  </td>
                   <td className="px-3 sm:px-6 py-3 sm:py-4">
                     <div className="space-y-1">
                       <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                         <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                         <span className="truncate max-w-xs" title={client.email}>{client.email}</span>
                       </div>
                       {client.phone && (
                         <div className="flex items-center text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                           <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                           <span>{client.phone}</span>
                         </div>
                       )}
                     </div>
                   </td>
                   <td className="px-3 sm:px-6 py-3 sm:py-4 hidden lg:table-cell">
                     <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                       {client.address ? (
                         <span className="break-words whitespace-normal">
                           {client.address}
                         </span>
                       ) : (
                         <span className="text-gray-400 dark:text-gray-500 italic">Non renseignée</span>
                       )}
                     </div>
                   </td>
                   <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">
                     {new Date(client.created_at).toLocaleDateString('fr-FR')}
                   </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenClientDetail(client.id)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-slate-800/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(client)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-slate-800/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Modifier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(client.id)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-orange-600 bg-gray-50/50 hover:bg-orange-50/50 dark:text-gray-400 dark:hover:text-orange-400 dark:bg-slate-800/30 dark:hover:bg-orange-900/20 border border-gray-200/50 hover:border-orange-200/50 dark:border-gray-600/50 dark:hover:border-orange-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Archive className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(client.id)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-slate-800/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
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
        {(
          <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-1">
                {/* Bouton Première page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Première page"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <ChevronLeft className="w-3 h-3 -ml-1" />
                </button>
                
                {/* Bouton Page précédente */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                
                {/* Numéros de page */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-full transition-all font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600'
                          : 'text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-600/30 hover:bg-gray-200/50 dark:hover:bg-gray-500/50 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                {/* Bouton Page suivante */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Page suivante"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
                
                {/* Bouton Dernière page */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Dernière page"
                >
                  <ChevronRight className="w-3 h-3" />
                  <ChevronRight className="w-3 h-3 -ml-1" />
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
      <ClientModal
        isOpen={showModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editingClient={editingClient}
        resetForm={resetForm}
      />


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

    </div>
  );
}