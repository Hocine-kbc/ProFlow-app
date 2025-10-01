import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, Users, Search, ChevronLeft, ChevronRight, CheckCircle, Circle, Trash, X, Eye, Clock, Euro, Calendar, BarChart3, Filter, RotateCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createClient, updateClient as updateClientApi, deleteClient as deleteClientApi } from '../lib/api';
import { Client } from '../types';
import AlertModal from './AlertModal';
import { supabase } from '../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ClientDetailView from './ClientDetailView';
import { ClientDetail } from '../types/clientDetail';

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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    postalCode: '',
    city: '',
    country: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [clientStats, setClientStats] = useState<{
    totalHours: number;
    totalAmount: number;
    monthlyStats: Array<{ month: string; hours: number; amount: number }>;
    yearlyStats: Array<{ year: number; hours: number; amount: number }>;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const [showClientDetailView, setShowClientDetailView] = useState(false);
  const [selectedClientForDetail, setSelectedClientForDetail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reconstituer l'adresse complète
    const addressParts = [formData.street, formData.postalCode, formData.city, formData.country].filter(part => part.trim());
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
        showNotification('success', 'Client modifié', 'Le client a été mis à jour avec succès');
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
    setFormData({ name: '', email: '', phone: '', street: '', postalCode: '', city: '', country: '' });
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
      street: street,
      postalCode: postalCode,
      city: city,
      country: country,
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
        } catch (err: any) {
          console.error('Error deleting client:', err);
          showNotification('error', 'Impossible de supprimer le client', err.message || 'Ce client a des factures associées. Supprimez d\'abord les factures avant de supprimer le client.');
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

  const handleViewClientDetails = async (client: Client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    setLoadingStats(true);
    setSelectedMonth('');
    setSelectedYear('');
    
    try {
      // Récupérer les prestations du client
      const { data: services, error } = await supabase
        .from('services')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des prestations:', error);
        setClientStats(null);
        return;
      }

      if (!services || services.length === 0) {
        setClientStats({
          totalHours: 0,
          totalAmount: 0,
          monthlyStats: [],
          yearlyStats: []
        });
        return;
      }

      // Calculer les statistiques
      const totalHours = services.reduce((sum, service) => sum + (service.hours || 0), 0);
      const totalAmount = services.reduce((sum, service) => sum + ((service.hours || 0) * (service.hourly_rate || 0)), 0);

      // Statistiques par mois
      const monthlyMap = new Map<string, { hours: number; amount: number }>();
      services.forEach(service => {
        const date = new Date(service.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { hours: 0, amount: 0 });
        }
        
        const current = monthlyMap.get(monthKey)!;
        current.hours += service.hours || 0;
        current.amount += (service.hours || 0) * (service.hourly_rate || 0);
      });

      const monthlyStats = Array.from(monthlyMap.entries())
        .map(([key, stats]) => ({
          month: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          hours: stats.hours,
          amount: stats.amount
        }))
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

      // Statistiques par année
      const yearlyMap = new Map<number, { hours: number; amount: number }>();
      services.forEach(service => {
        const year = new Date(service.date).getFullYear();
        
        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, { hours: 0, amount: 0 });
        }
        
        const current = yearlyMap.get(year)!;
        current.hours += service.hours || 0;
        current.amount += (service.hours || 0) * (service.hourly_rate || 0);
      });

      const yearlyStats = Array.from(yearlyMap.entries())
        .map(([year, stats]) => ({
          year,
          hours: stats.hours,
          amount: stats.amount
        }))
        .sort((a, b) => b.year - a.year);

      setClientStats({
        totalHours,
        totalAmount,
        monthlyStats,
        yearlyStats
      });

      // Stocker les services pour le filtrage
      setFilteredServices(services);

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      setClientStats(null);
    } finally {
      setLoadingStats(false);
    }
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

  const handleEditClientDetail = (_client: ClientDetail) => {
    // TODO: Implémenter la modification du client
    showNotification('success', 'Fonctionnalité en développement', 'La modification du client sera bientôt disponible.');
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

  const handleSendInvoiceToClient = (_invoiceId: string) => {
    // TODO: Implémenter l'envoi de facture
    showNotification('success', 'Envoi en développement', 'L\'envoi de facture sera bientôt disponible.');
  };

  const handleViewInvoiceDetail = (_invoiceId: string) => {
    // TODO: Ouvrir la facture
    showNotification('success', 'Ouverture en développement', 'L\'ouverture de facture sera bientôt disponible.');
  };

  // Fonction pour préparer les données du graphique des prestations
  const getChartData = () => {
    if (!clientStats || !filteredServices) return [];
    
    // Grouper les prestations par mois
    const monthlyData = filteredServices.reduce((acc: any, service: any) => {
      const date = new Date(service.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthName,
          hours: 0,
          amount: 0,
          count: 0
        };
      }
      
      acc[monthKey].hours += service.hours || 0;
      acc[monthKey].amount += service.amount || 0;
      acc[monthKey].count += 1;
      
      return acc;
    }, {});
    
    return Object.values(monthlyData).sort((a: any, b: any) => {
      const dateA = new Date(a.month.split(' ')[1], new Date(`${a.month.split(' ')[0]} 1`).getMonth());
      const dateB = new Date(b.month.split(' ')[1], new Date(`${b.month.split(' ')[0]} 1`).getMonth());
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Fonction pour préparer les données du calendrier
  const getCalendarData = () => {
    if (!filteredServices) return [];
    
    return filteredServices.map((service: any) => ({
      date: new Date(service.date).toLocaleDateString('fr-FR'),
      amount: service.amount || 0,
      hours: service.hours || 0,
      description: service.description || 'Prestation'
    })).sort((a: any, b: any) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
  };

  const handleFilterChange = (type: 'month' | 'year', value: string) => {
    if (type === 'month') {
      setSelectedMonth(value);
    } else {
      setSelectedYear(value);
    }
  };

  const resetFilters = () => {
    setSelectedMonth('');
    setSelectedYear('');
  };

  // Calculer les services filtrés
  const getFilteredServices = () => {
    if (!filteredServices || filteredServices.length === 0) return [];
    
    return filteredServices.filter(service => {
      const serviceDate = new Date(service.date);
      const serviceMonth = `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}`;
      const serviceYear = serviceDate.getFullYear().toString();
      
      const monthMatch = !selectedMonth || serviceMonth === selectedMonth;
      const yearMatch = !selectedYear || serviceYear === selectedYear;
      
      return monthMatch && yearMatch;
    });
  };

  // Calculer les statistiques filtrées
  const getFilteredStats = () => {
    const services = getFilteredServices();
    if (services.length === 0) {
      return {
        totalHours: 0,
        totalAmount: 0,
        count: 0
      };
    }

    const totalHours = services.reduce((sum, service) => sum + (service.hours || 0), 0);
    const totalAmount = services.reduce((sum, service) => sum + ((service.hours || 0) * (service.hourly_rate || 0)), 0);

    return {
      totalHours,
      totalAmount,
      count: services.length
    };
  };

  // Générer les options de filtres
  const getMonthOptions = () => {
    if (!clientStats) return [];
    return clientStats.monthlyStats.map(stat => {
      const [month, year] = stat.month.split(' ');
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth() + 1;
      return {
        value: `${year}-${String(monthIndex).padStart(2, '0')}`,
        label: stat.month
      };
    });
  };

  const getYearOptions = () => {
    if (!clientStats) return [];
    return clientStats.yearlyStats.map(stat => ({
      value: stat.year.toString(),
      label: stat.year.toString()
    }));
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

  // Si la vue détaillée est ouverte, afficher seulement celle-ci
  if (showClientDetailView && selectedClientForDetail) {
    return (
      <ClientDetailView
        clientId={selectedClientForDetail}
        onBack={handleCloseClientDetail}
        onEditClient={handleEditClientDetail}
        onCreateInvoice={handleCreateInvoiceForClient}
        onSendInvoice={handleSendInvoiceToClient}
        onViewInvoice={handleViewInvoiceDetail}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
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
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Clients</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Gestion centralisée de votre portefeuille clients</p>
          </div>
          <div className="mt-4 sm:mt-0 flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouveau client</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
            />
          </div>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} trouvé{filteredClients.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Bouton pour activer le mode sélection */}
      {!isSelectionMode && clients.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={toggleSelectionMode}
            className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mode sélection
          </button>
        </div>
      )}

      {/* Sélection multiple */}
      {isSelectionMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {selectedClients.size} client(s) sélectionné(s)
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                disabled={selectedClients.size === 0}
                className="inline-flex items-center px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer sélection
              </button>
              <button
                onClick={toggleSelectionMode}
                className="inline-flex items-center px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients - Mobile Cards / Desktop Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">

      {/* Mobile Cards View */}
      <div className="block sm:hidden">
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
                      onClick={() => handleViewClientDetails(client)}
                      className="p-2 rounded-full text-gray-500 hover:text-green-600 bg-gray-50/50 hover:bg-green-50/50 dark:text-gray-400 dark:hover:text-green-400 dark:bg-gray-700/30 dark:hover:bg-green-900/20 border border-gray-200/50 hover:border-green-200/50 dark:border-gray-600/50 dark:hover:border-green-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Voir détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenClientDetail(client.id)}
                      className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Vue détaillée complète"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(client)}
                      className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all"
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
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {isSelectionMode && (
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
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
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {isSelectionMode && (
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <button
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
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
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
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md`}>
                            {firstLetter}
                          </div>
                        );
                      })()}
                      <div className="ml-3 sm:ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
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
                        onClick={() => handleViewClientDetails(client)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-green-600 bg-gray-50/50 hover:bg-green-50/50 dark:text-gray-400 dark:hover:text-green-400 dark:bg-gray-700/30 dark:hover:bg-green-900/20 border border-gray-200/50 hover:border-green-200/50 dark:border-gray-600/50 dark:hover:border-green-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Détails</span>
                      </button>
                      <button
                        onClick={() => handleOpenClientDetail(client.id)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <BarChart3 className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Vue complète</span>
                      </button>
                      <button
                        onClick={() => handleEdit(client)}
                        className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span className="hidden sm:inline">Modifier</span>
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
          <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                <span className="hidden sm:inline">Affichage de {startIndex + 1} à {Math.min(endIndex, filteredClients.length)} sur {filteredClients.length} clients</span>
                <span className="sm:hidden">{startIndex + 1}-{Math.min(endIndex, filteredClients.length)} / {filteredClients.length}</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-2 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-2 rounded-full text-gray-400 bg-gray-50/50 hover:bg-gray-100/50 dark:text-gray-500 dark:bg-gray-600/30 dark:hover:bg-gray-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
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
          className="modal-overlay bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fixed inset-0"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xs w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <h3 className="text-base sm:text-lg font-semibold">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pays
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all text-sm sm:text-base"
                >
                  {editingClient ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showClientDetails && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedClient.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Détails et statistiques
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClientDetails(false)}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Client Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Mail className="w-5 h-5 mr-2 text-blue-500" />
                    Contact
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4 mr-2" />
                      {selectedClient.email}
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4 mr-2" />
                        {selectedClient.phone}
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span>{selectedClient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-500" />
                    Informations
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      Client depuis le {new Date(selectedClient.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-2" />
                      ID: {selectedClient.id}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                    Statistiques des prestations
                  </h3>
                  
                  {/* Filtres */}
                  {clientStats && (clientStats.monthlyStats.length > 0 || clientStats.yearlyStats.length > 0) && (
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                      <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                          value={selectedMonth}
                          onChange={(e) => handleFilterChange('month', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Tous les mois</option>
                          {getMonthOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        
                        <select
                          value={selectedYear}
                          onChange={(e) => handleFilterChange('year', e.target.value)}
                          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Toutes les années</option>
                          {getYearOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        
                        {(selectedMonth || selectedYear) && (
                          <button
                            onClick={resetFilters}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Réinitialiser les filtres"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {loadingStats ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
                  </div>
                ) : clientStats ? (
                  <div className="space-y-6">
                    {/* Totaux */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                          <Clock className="w-8 h-8 text-blue-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(selectedMonth || selectedYear) ? 'Heures filtrées' : 'Heures totales'}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {getFilteredStats().totalHours}h
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                          <Euro className="w-8 h-8 text-green-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {(selectedMonth || selectedYear) ? 'Montant filtré' : 'Montant total'}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {getFilteredStats().totalAmount.toLocaleString('fr-FR')}€
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                          <BarChart3 className="w-8 h-8 text-purple-500 mr-3" />
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Prestations</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {getFilteredStats().count}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistiques par mois */}
                    {clientStats.monthlyStats.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-indigo-500" />
                          Par mois ({clientStats.monthlyStats.length} mois)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                          {clientStats.monthlyStats.map((stat, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                                  {stat.month}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                  <div className="flex items-center justify-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {stat.hours}h
                                  </div>
                                  <div className="flex items-center justify-center">
                                    <Euro className="w-3 h-3 mr-1" />
                                    {stat.amount.toLocaleString('fr-FR')}€
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistiques par année */}
                    {clientStats.yearlyStats.length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
                          Par année
                        </h4>
                        <div className="space-y-2">
                          {clientStats.yearlyStats.map((stat, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900 dark:text-white">{stat.year}</span>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {stat.hours}h • {stat.amount.toLocaleString('fr-FR')}€
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Graphiques */}
                    {getFilteredServices().length > 0 && (
                      <div className="mt-8 space-y-6">
                        {/* Graphique des prestations */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                            Évolution des prestations
                          </h4>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={getChartData()}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                  <XAxis 
                                    dataKey="month" 
                                    stroke="#6b7280"
                                    fontSize={12}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                  />
                                  <YAxis 
                                    yAxisId="left"
                                    stroke="#6b7280"
                                    fontSize={12}
                                  />
                                  <YAxis 
                                    yAxisId="right" 
                                    orientation="right"
                                    stroke="#6b7280"
                                    fontSize={12}
                                  />
                                  <Tooltip 
                                    contentStyle={{
                                      backgroundColor: '#1f2937',
                                      border: '1px solid #374151',
                                      borderRadius: '8px',
                                      color: '#f9fafb'
                                    }}
                                    formatter={(value: any, name: string) => [
                                      name === 'amount' ? `${value.toLocaleString('fr-FR')}€` : `${value}h`,
                                      name === 'amount' ? 'Montant' : 'Heures'
                                    ]}
                                  />
                                  <Line 
                                    yAxisId="left"
                                    type="monotone" 
                                    dataKey="hours" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2}
                                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                    name="Heures"
                                  />
                                  <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="amount" 
                                    stroke="#10b981" 
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                    name="Montant"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        {/* Calendrier des prestations */}
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
                            Calendrier des prestations
                          </h4>
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="max-h-64 overflow-y-auto">
                              <div className="space-y-2">
                                {getCalendarData().map((item: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                                      <div>
                                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                                          {item.date}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          {item.description}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {item.amount.toLocaleString('fr-FR')}€
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {item.hours}h
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Prestations filtrées */}
                    {getFilteredServices().length > 0 && (
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Filter className="w-4 h-4 mr-2 text-indigo-500" />
                          Prestations {(selectedMonth || selectedYear) ? 'filtrées' : ''}
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {getFilteredServices().map((service, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                                    {service.description || 'Prestation sans description'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(service.date).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {service.hours}h × {service.hourly_rate}€
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    = {((service.hours || 0) * (service.hourly_rate || 0)).toLocaleString('fr-FR')}€
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message si aucune prestation */}
                    {getFilteredStats().count === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Clock className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {(selectedMonth || selectedYear) ? 'Aucune prestation trouvée' : 'Aucune prestation'}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {(selectedMonth || selectedYear) 
                            ? 'Aucune prestation ne correspond aux filtres sélectionnés.'
                            : 'Ce client n\'a pas encore de prestations enregistrées.'
                          }
                        </p>
                        {(selectedMonth || selectedYear) && (
                          <button
                            onClick={resetFilters}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Erreur de chargement
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      Impossible de charger les statistiques.
                    </p>
                  </div>
                )}
              </div>
            </div>
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

    </div>
  );
}