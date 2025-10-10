import { useState } from 'react';
import { 
  Archive, 
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  FileText, 
  Filter, 
  RotateCcw, 
  Search,
  Send,
  Trash,
  Trash2, 
  Users
} from 'lucide-react';
import AlertModal from './AlertModal.tsx';
import CustomSelect from './CustomSelect.tsx';
import { useApp } from '../contexts/AppContext.tsx';

// Type Client depuis le contexte
type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
};
import { sendInvoiceEmail } from '../lib/emailService.ts';
import { openInvoicePrintWindow } from '../lib/print.ts';
import { supabase } from '../lib/supabase.ts';
import { Invoice } from '../types/index.ts';

interface ArchivePageProps {
  onPageChange: (page: string) => void;
}

export default function ArchivePage({ onPageChange: _onPageChange }: ArchivePageProps) {
  const { state, dispatch, showNotification } = useApp();
  const { clients, invoices, services } = state;
  
  const [activeTab, setActiveTab] = useState<'clients' | 'invoices'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [_loading, _setLoading] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning' as 'warning' | 'error' | 'success',
    onConfirm: () => {}
  });

  const itemsPerPage = 10;

  // Fonction pour basculer le mode de sélection
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedItems(new Set());
    }
  };

  // Fonction pour basculer la sélection d'un élément
  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Fonction pour sélectionner/désélectionner tous les éléments
  const toggleAllSelection = () => {
    const allSelected = currentData.every(item => selectedItems.has(item.id as string));
    if (allSelected) {
      // Désélectionner toutes les factures
      currentData.forEach(item => {
        if (selectedItems.has(item.id as string)) {
          toggleItemSelection(item.id as string);
        }
      });
    } else {
      // Sélectionner toutes les factures
      currentData.forEach(item => {
        if (!selectedItems.has(item.id as string)) {
          toggleItemSelection(item.id as string);
        }
      });
    }
  };

  // Fonction pour formater les dates
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (_error) {
      return '-';
    }
  };

  // Fonction pour formater les montants
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Fonction pour obtenir les clients archivés
  const getArchivedClients = () => {
    return clients.filter(client => (client as unknown as Record<string, unknown>).status === 'archived');
  };

  // Fonction pour obtenir les factures archivées
  const getArchivedInvoices = () => {
    return invoices
      .filter(invoice => invoice.archived_at !== null && invoice.archived_at !== undefined)
      .map(invoice => ({
        ...invoice,
        client: invoice.client || clients.find(c => c.id === invoice.client_id)
      }));
  };

  // Fonction pour filtrer les données
  const getFilteredData = () => {
    let data: Record<string, unknown>[] = activeTab === 'clients' ? (getArchivedClients() as unknown as Record<string, unknown>[]) : (getArchivedInvoices() as unknown as Record<string, unknown>[]);
    
    // Filtre par recherche
    if (searchTerm) {
      data = data.filter(item => {
        if (activeTab === 'clients') {
          return (item.name as string).toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (item.email as string).toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return (item.invoice_number as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 (item.client as Record<string, unknown>)?.name?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        }
      });
    }
    
    // Filtre par période
    if (dateFilter) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      data = data.filter(item => {
        let itemDate;
        if (activeTab === 'clients') {
          // Pour les clients archivés, utiliser created_at car ils n'ont pas archived_at
          itemDate = new Date(item.created_at as string);
        } else {
          // Pour les factures archivées, utiliser archived_at en priorité
          itemDate = new Date((item.archived_at as string) || (item.created_at as string));
        }
        
        const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        
        switch (dateFilter) {
          case 'today': {
            return itemDateOnly.getTime() === today.getTime();
          }
          case 'week': {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return itemDateOnly >= weekAgo && itemDateOnly <= today;
          }
          case 'month': {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return itemDateOnly >= monthAgo && itemDateOnly <= today;
          }
          case 'year': {
            const yearAgo = new Date(today);
            yearAgo.setFullYear(yearAgo.getFullYear() - 1);
            return itemDateOnly >= yearAgo && itemDateOnly <= today;
          }
          case 'older': {
            const yearAgoOlder = new Date(today);
            yearAgoOlder.setFullYear(yearAgoOlder.getFullYear() - 1);
            return itemDateOnly < yearAgoOlder;
          }
          default: {
            return true;
          }
        }
      });
    }
    
    // Filtre par statut (pour les factures)
    if (statusFilter && activeTab === 'invoices') {
      if (statusFilter === 'archived') {
        // Filtrer les factures archivées (avec archived_at)
        data = data.filter(item => (item.archived_at as string) !== null && (item.archived_at as string) !== undefined);
      } else {
        data = data.filter(item => (item.status as string) === statusFilter);
      }
    }
    
    return data;
  };

  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);



  // Fonction pour restaurer un client
  const handleRestoreClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Restaurer le client',
      message: `Êtes-vous sûr de vouloir restaurer le client "${client?.name}" ? Il sera remis dans la liste principale.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('clients')
            .update({
              status: 'active',
              archived_at: null
            })
            .eq('id', id);

          if (error) throw error;

          dispatch({ type: 'UPDATE_CLIENT', payload: {
            ...client,
            status: 'active'
          } as Client });
          showNotification('success', 'Client restauré', 'Le client a été restauré avec succès');
        } catch (error) {
          console.error('Error restoring client:', error);
          showNotification('error', 'Erreur', 'Impossible de restaurer le client');
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Fonction pour restaurer une facture
  const handleRestoreInvoice = (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Restaurer la facture',
      message: `Êtes-vous sûr de vouloir restaurer la facture #${invoice?.invoice_number} ? Elle sera remise dans la liste principale.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('invoices')
            .update({
              archived_at: null
            })
            .eq('id', id);

          if (error) throw error;

          dispatch({ type: 'UPDATE_INVOICE', payload: {
            ...invoice,
            archived_at: null
          } as unknown as Invoice });
          showNotification('success', 'Facture restaurée', 'La facture a été restaurée avec succès');
        } catch (error) {
          console.error('Error restoring invoice:', error);
          showNotification('error', 'Erreur', 'Impossible de restaurer la facture');
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Fonction pour supprimer définitivement
  const handleDeletePermanently = (type: string, id: string) => {
    const item = type === 'clients' ? clients.find(c => c.id === id) : invoices.find(i => i.id === id);
    const itemName = type === 'clients' ? (item as unknown as Record<string, unknown>)?.name : `#${(item as unknown as Record<string, unknown>)?.invoice_number}`;
    
    setAlertModal({
      isOpen: true,
      title: 'Supprimer définitivement',
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${type === 'clients' ? 'le client' : 'la facture'} "${itemName}" ? Cette action est irréversible.`,
      type: 'error',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from(type === 'clients' ? 'clients' : 'invoices')
            .delete()
            .eq('id', id);

          if (error) throw error;

          if (type === 'clients') {
            dispatch({ type: 'DELETE_CLIENT', payload: id });
          } else {
            dispatch({ type: 'DELETE_INVOICE', payload: id });
          }
          
          showNotification('success', 'Suppression définitive', `${type === 'clients' ? 'Le client' : 'La facture'} a été supprimé définitivement`);
        } catch (error) {
          console.error('Error deleting permanently:', error);
          showNotification('error', 'Erreur', 'Impossible de supprimer définitivement');
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Fonction pour supprimer les éléments sélectionnés
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    const type = activeTab === 'clients' ? 'clients' : 'factures';
    
    setAlertModal({
      isOpen: true,
      title: 'Supprimer les éléments sélectionnés',
      message: `Êtes-vous sûr de vouloir supprimer définitivement ${selectedItems.size} ${type} sélectionné(s) ? Cette action est irréversible.`,
      type: 'error',
      onConfirm: async () => {
        try {
          const tableName = activeTab === 'clients' ? 'clients' : 'invoices';
          const ids = Array.from(selectedItems);
          
          // Supprimer tous les éléments sélectionnés en une seule requête
          const { error } = await supabase
            .from(tableName)
            .delete()
            .in('id', ids);

          if (error) throw error;

          // Mettre à jour le state global
          if (activeTab === 'clients') {
            ids.forEach(id => dispatch({ type: 'DELETE_CLIENT', payload: id }));
          } else {
            ids.forEach(id => dispatch({ type: 'DELETE_INVOICE', payload: id }));
          }
          
          showNotification('success', 'Suppression définitive', `${selectedItems.size} ${type} supprimé(s) définitivement`);
          
          // Sortir du mode sélection et vider la sélection
          setIsSelectionMode(false);
          setSelectedItems(new Set());
        } catch (error) {
          console.error('Error deleting selected items:', error);
          showNotification('error', 'Erreur', 'Impossible de supprimer les éléments sélectionnés');
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="space-y-6 scrollbar-hide w-full max-w-full overflow-x-hidden">
      {/* En-tête */}
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-700 dark:via-indigo-700 dark:to-blue-700 text-white shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Archive</h1>
            <p className="text-white/80 mt-1 text-xs sm:text-sm lg:text-base">Gestion des clients et factures archivés</p>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center justify-center sm:justify-start space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Factures archivées ({getArchivedInvoices().length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('clients')}
              className={`flex items-center justify-center sm:justify-start space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'clients'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Clients archivés ({getArchivedClients().length})</span>
            </button>
          </nav>
        </div>

        {/* Filtres */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-3 lg:space-y-0">
            {/* Ligne 1: Recherche et Période */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <CustomSelect
                  value={dateFilter}
                  onChange={(value) => setDateFilter(value)}
                  placeholder="Toutes les périodes"
                  options={[
                    { value: "", label: "Toutes les périodes" },
                    { value: "today", label: "Aujourd'hui" },
                    { value: "week", label: "Cette semaine" },
                    { value: "month", label: "Ce mois" },
                    { value: "year", label: "Cette année" },
                    { value: "older", label: "Plus ancien" }
                  ]}
                  className="w-full text-xs"
                />
              </div>

              {/* Statut pour les factures */}
              {activeTab === 'invoices' && (
                <div>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value)}
                    placeholder="Tous les statuts"
                    options={[
                      { value: "", label: "Tous les statuts" },
                      { value: "paid", label: "Payées" },
                      { value: "sent", label: "Envoyées" },
                      { value: "draft", label: "Brouillons" }
                    ]}
                    className="w-full text-xs"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center lg:justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('');
                    setStatusFilter('');
                  }}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Effacer les filtres"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Effacer</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilter('');
                    setStatusFilter('');
                    setCurrentPage(1);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Réinitialiser"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Réinitialiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sélection multiple */}
        {isSelectionMode && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {selectedItems.size} élément(s) sélectionné(s)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedItems.size === 0}
                  className="inline-flex items-center px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Supprimer sélection
                </button>
                <button
                  type="button"
                  onClick={toggleSelectionMode}
                  className="inline-flex items-center px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bouton pour activer le mode sélection */}
        {!isSelectionMode && filteredData.length > 0 && (
          <div className="flex justify-end px-4 sm:px-6 pt-4 sm:pt-5">
            <button
              type="button"
              onClick={toggleSelectionMode}
              className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mode sélection
            </button>
          </div>
        )}

        {/* Contenu */}
        <div className="p-4 sm:p-6 w-full max-w-full">
          {/* Vue desktop - Table */}
          <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {isSelectionMode && (
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                      <button
                        type="button"
                        onClick={toggleAllSelection}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title={currentData.every(item => selectedItems.has(item.id as string)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                      >
                        {currentData.every(item => selectedItems.has(item.id as string)) ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </th>
                  )}
                  {activeTab === 'invoices' ? (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        N° Facture
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Échéance
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Archivé le
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Téléphone
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Entreprise
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={isSelectionMode ? (activeTab === 'invoices' ? 9 : 8) : (activeTab === 'invoices' ? 8 : 7)} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center space-y-2">
                        <Archive className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                        <p className="text-lg font-medium">
                          {activeTab === 'clients' ? 'Aucun client archivé' : 'Aucune facture archivée'}
                        </p>
                        <p className="text-sm">
                          {activeTab === 'clients' 
                            ? 'Les clients archivés apparaîtront ici.' 
                            : 'Les factures archivées apparaîtront ici.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((item) => (
                    <tr key={item.id as string} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      {isSelectionMode && (
                        <td className="px-2 py-4 whitespace-nowrap w-12">
                          <button
                            type="button"
                            onClick={() => toggleItemSelection(item.id as string)}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {selectedItems.has(item.id as string) ? (
                              <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            )}
                          </button>
                        </td>
                      )}
                      {activeTab === 'invoices' ? (
                        <>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.invoice_number as string}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {(() => {
                              const clientName = (item.client as Record<string, unknown>)?.name || clients.find(c => c.id === (item.client_id as string))?.name;
                              return clientName ? String(clientName) : 'Client inconnu';
                            })()}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(item.date as string)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency((item.subtotal as number) || (item.net_amount as number) || 0)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(item.due_date as string)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (item.status as string) === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              (item.status as string) === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                              (item.status as string) === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                              (item.status as string) === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {(item.status as string) === 'paid' ? 'Payée' :
                               (item.status as string) === 'sent' ? 'Envoyée' :
                               (item.status as string) === 'draft' ? 'Brouillon' :
                               (item.status as string) === 'overdue' ? 'En retard' :
                               (item.status as string)}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {(item.archived_at as string) ? formatDate(item.archived_at as string) : formatDate(item.created_at as string)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <button
                                type="button"
                                onClick={() => openInvoicePrintWindow(item as unknown as Invoice, clients, services)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                title="Télécharger PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendInvoiceEmail({
                                  to_email: activeTab === 'invoices' ? (item.client as Record<string, unknown>)?.email as string || '' : '',
                                  to_name: activeTab === 'invoices' ? (item.client as Record<string, unknown>)?.name as string || '' : '',
                                  subject: `Facture ${item.invoice_number as string}`,
                                  message: 'Veuillez trouver ci-joint votre facture.',
                                  invoice_number: item.invoice_number as string,
                                  invoice_date: item.date as string,
                                  invoice_due_date: item.due_date as string,
                                  invoice_amount: String((item.subtotal as number) || (item.net_amount as number) || 0),
                                  company_name: 'Votre Entreprise',
                                  company_email: 'contact@votreentreprise.com'
                                })}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                title="Envoyer par email"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestoreInvoice(item.id as string)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                title="Restaurer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePermanently('invoice', item.id as string)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.name as string}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.email as string}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {(item.phone as string) || 'Non renseigné'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {(item.company as string) || 'Non renseignée'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              (item.status as string) === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                              (item.status as string) === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                              (item.status as string) === 'prospect' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {(item.status as string) === 'active' ? 'Actif' :
                               (item.status as string) === 'inactive' ? 'Inactif' :
                               (item.status as string) === 'prospect' ? 'Prospect' :
                               (item.status as string)}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(item.created_at as string)}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-0.5 sm:space-x-1">
                              <button
                                type="button"
                                onClick={() => handleRestoreClient(item.id as string)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                title="Restaurer"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePermanently('client', item.id as string)}
                                className="p-1 sm:p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Vue tablette - Table compacte */}
          <div className="hidden md:block lg:hidden">
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {isSelectionMode && (
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">
                        <button
                          type="button"
                          onClick={toggleAllSelection}
                          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title={currentData.every(item => selectedItems.has(item.id as string)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                        >
                          {currentData.every(item => selectedItems.has(item.id as string)) ? (
                            <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </th>
                    )}
                    {activeTab === 'invoices' ? (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          N° Facture
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Montant
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {currentData.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'invoices' ? (isSelectionMode ? 6 : 5) : (isSelectionMode ? 5 : 4)} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center">
                          <Archive className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                          <p className="text-lg font-medium mb-2">Aucun élément archivé</p>
                          <p className="text-sm">Les éléments archivés apparaîtront ici</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentData.map((item) => (
                      <tr key={item.id as string} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        {isSelectionMode && (
                          <td className="px-2 py-4 whitespace-nowrap w-10">
                            <button
                              type="button"
                              onClick={() => toggleItemSelection(item.id as string)}
                              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                              {selectedItems.has(item.id as string) ? (
                                <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                              )}
                            </button>
                          </td>
                        )}
                        {activeTab === 'invoices' ? (
                          <>
                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {item.invoice_number as string}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {(() => {
                              const clientName = (item.client as Record<string, unknown>)?.name || clients.find(c => c.id === (item.client_id as string))?.name;
                              return clientName ? String(clientName) : 'Client inconnu';
                            })()}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency((item.subtotal as number) || (item.net_amount as number) || 0)}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (item.status as string) === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                (item.status as string) === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                (item.status as string) === 'draft' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                                (item.status as string) === 'overdue' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}>
                                {(item.status as string) === 'paid' ? 'Payée' :
                                 (item.status as string) === 'sent' ? 'Envoyée' :
                                 (item.status as string) === 'draft' ? 'Brouillon' :
                                 (item.status as string) === 'overdue' ? 'En retard' :
                                 (item.status as string)}
                              </span>
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-0.5 sm:space-x-1">
                                <button
                                  type="button"
                                  onClick={() => openInvoicePrintWindow(item as unknown as Invoice, clients, services)}
                                  className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                  title="Télécharger PDF"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreInvoice(item.id as string)}
                                  className="p-1 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                  title="Restaurer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePermanently('invoices', item.id as string)}
                                  className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {item.name as string}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.email as string}
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                (item.status as string) === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                (item.status as string) === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' :
                                (item.status as string) === 'prospect' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}>
                                {(item.status as string) === 'active' ? 'Actif' :
                                 (item.status as string) === 'inactive' ? 'Inactif' :
                                 (item.status as string) === 'prospect' ? 'Prospect' :
                                 (item.status as string)}
                              </span>
                            </td>
                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-0.5 sm:space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreClient(item.id as string)}
                                  className="p-1 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                                  title="Restaurer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePermanently('clients', item.id as string)}
                                  className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                  title="Supprimer définitivement"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vue mobile - Cards */}
          <div className="md:hidden space-y-4 w-full max-w-full">
            {/* Bouton Tout sélectionner pour mobile */}
            {isSelectionMode && currentData.length > 0 && (
              <div className="flex justify-center mb-4">
                <button
                  type="button"
                  onClick={toggleAllSelection}
                  className="inline-flex items-center px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {currentData.every(item => selectedItems.has(item.id as string)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
            )}
            
            {currentData.length === 0 ? (
              <div className="text-center py-12 w-full max-w-full">
                <div className="flex flex-col items-center space-y-4">
                  <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {activeTab === 'clients' ? 'Aucun client archivé' : 'Aucune facture archivée'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {activeTab === 'clients' 
                        ? 'Les clients archivés apparaîtront ici.' 
                        : 'Les factures archivées apparaîtront ici.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              currentData.map((item) => (
              <div key={item.id as string} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-3">
                  {isSelectionMode && (
                    <button
                      type="button"
                      onClick={() => toggleItemSelection(item.id as string)}
                      className="p-1.5 sm:p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors mr-2"
                    >
                      {selectedItems.has(item.id as string) ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  )}
                  <div className="flex-1">
                    {activeTab === 'clients' ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.name as string}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.email as string}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {item.invoice_number as string}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {(() => {
                            const clientName = (item.client as Record<string, unknown>)?.name || clients.find(c => c.id === (item.client_id as string))?.name;
                            return clientName ? String(clientName) : 'Client inconnu';
                          })()}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-0.5 sm:space-x-1">
                    {activeTab === 'invoices' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openInvoicePrintWindow(item as unknown as Invoice, clients, services)}
                          className="p-1 sm:p-1.5 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                          title="Télécharger PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => sendInvoiceEmail({
                            to_email: activeTab === 'invoices' ? (item.client as Record<string, unknown>)?.email as string || '' : '',
                            to_name: activeTab === 'invoices' ? (item.client as Record<string, unknown>)?.name as string || '' : '',
                            subject: `Facture ${item.invoice_number as string}`,
                            message: 'Veuillez trouver ci-joint votre facture.',
                            invoice_number: item.invoice_number as string,
                            invoice_date: item.date as string,
                            invoice_due_date: item.due_date as string,
                            invoice_amount: String((item.subtotal as number) || (item.net_amount as number) || 0),
                            company_name: 'Votre Entreprise',
                            company_email: 'contact@votreentreprise.com'
                          })}
                          className="p-1 sm:p-1.5 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                          title="Envoyer par email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => activeTab === 'clients' ? handleRestoreClient(item.id as string) : handleRestoreInvoice(item.id as string)}
                      className="p-1.5 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                      title="Restaurer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(activeTab, item.id as string)}
                      className="p-1.5 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {activeTab === 'invoices' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Montant:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency((item.subtotal as number) || (item.net_amount as number) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Statut:</span>
                        <span className={`font-medium ${
                          (item.status as string) === 'paid' ? 'text-green-600 dark:text-green-400' :
                          (item.status as string) === 'sent' ? 'text-blue-600 dark:text-blue-400' :
                          (item.status as string) === 'draft' ? 'text-gray-600 dark:text-gray-400' :
                          (item.status as string) === 'overdue' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {(item.status as string) === 'paid' ? 'Payée' :
                           (item.status as string) === 'sent' ? 'Envoyée' :
                           (item.status as string) === 'draft' ? 'Brouillon' :
                           (item.status as string) === 'overdue' ? 'En retard' :
                           (item.status as string)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Date:</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(item.date as string)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Échéance:</span>
                        <span className="text-gray-900 dark:text-white">{formatDate(item.due_date as string)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Archivé le:</span>
                        <span className="text-purple-600 dark:text-purple-400">
                          {(item.archived_at as string) ? formatDate(item.archived_at as string) : formatDate(item.created_at as string)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Téléphone:</span>
                        <span className="text-gray-900 dark:text-white">{(item.phone as string) || 'Non renseigné'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Entreprise:</span>
                        <span className="text-gray-900 dark:text-white">{(item.company as string) || 'Non renseignée'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Statut:</span>
                        <span className={`font-medium ${
                          (item.status as string) === 'active' ? 'text-green-600 dark:text-green-400' :
                          (item.status as string) === 'inactive' ? 'text-gray-600 dark:text-gray-400' :
                          (item.status as string) === 'prospect' ? 'text-blue-600 dark:text-blue-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {(item.status as string) === 'active' ? 'Actif' :
                           (item.status as string) === 'inactive' ? 'Inactif' :
                           (item.status as string) === 'prospect' ? 'Prospect' :
                           (item.status as string)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Créé le:</span>
                        <span className="text-blue-600 dark:text-blue-400">{formatDate(item.created_at as string)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 text-center sm:text-left">
                Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} éléments
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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