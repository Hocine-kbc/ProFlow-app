import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, CheckSquare, Square, Trash, ChevronLeft, ChevronRight, Search, Filter, X, User, Euro, Clock as ClockIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { createService, updateService as updateServiceApi, deleteService as deleteServiceApi } from '../lib/api';
import { Service } from '../types';
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
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'amount' | 'date'>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'invoiced'>('all');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
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

  // Logique de filtrage et pagination
  const filteredServices = services.filter(service => {
    const client = clients.find(c => c.id === service.client_id);
    if (!client) return false;
    
    // Filtre par recherche
    const matchesQuery = query === '' || 
      client.name.toLowerCase().includes(query.toLowerCase()) ||
      service.description.toLowerCase().includes(query.toLowerCase());
    
    // Filtre par statut
    const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
    
    // Filtre par client
    const matchesClient = clientFilter === '' || client.id === clientFilter;
    
    return matchesQuery && matchesStatus && matchesClient;
  });

  const sortedServices = filteredServices.sort((a, b) => {
    const clientA = clients.find(c => c.id === a.client_id);
    const clientB = clients.find(c => c.id === b.client_id);
    
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = (clientA?.name || '').localeCompare(clientB?.name || '');
    } else if (sortBy === 'hours') {
      cmp = Number(a.hours) - Number(b.hours);
    } else if (sortBy === 'amount') {
      const amountA = Number(a.hours) * Number(a.hourly_rate);
      const amountB = Number(b.hours) * Number(b.hourly_rate);
      cmp = amountA - amountB;
      // Debug: console.log(`Comparing amounts: ${amountA} vs ${amountB}, cmp: ${cmp}, sortDir: ${sortDir}`);
    } else if (sortBy === 'date') {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentServices = sortedServices.slice(startIndex, endIndex);

  // Fonctions pour la sélection multiple
  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };


  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedServices(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedServices.size === 0) return;
    
    setAlertModal({
      isOpen: true,
      title: 'Supprimer les prestations sélectionnées',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedServices.size} prestation(s) sélectionnée(s) ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const deletePromises = Array.from(selectedServices).map(serviceId => 
            deleteServiceApi(serviceId)
          );
          await Promise.all(deletePromises);
          
          // Mettre à jour le state
          selectedServices.forEach(serviceId => {
            dispatch({ type: 'DELETE_SERVICE', payload: serviceId });
          });
          
          setNotification({
            isOpen: true,
            title: 'Prestations supprimées',
            message: `${selectedServices.size} prestation(s) ont été supprimée(s) avec succès.`,
            type: 'success'
          });
          
          setSelectedServices(new Set());
          setIsSelectionMode(false);
        } catch (err) {
          setNotification({
            isOpen: true,
            title: 'Erreur de suppression',
            message: 'Une erreur est survenue lors de la suppression des prestations.',
            type: 'error'
          });
        }
      }
    });
  };


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
            <h1 className="text-2xl font-bold">Prestations</h1>
            <p className="text-white/80 mt-1">Suivi et facturation de vos prestations professionnelles</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle prestation
          </button>
        </div>
      </div>

      {/* Filtres et recherche améliorés */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtres et recherche</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtre par client */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
            >
              <option value="">Tous les clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par statut */}
          <div className="relative">
            <ClockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="completed">Terminée</option>
              <option value="invoiced">Facturée</option>
            </select>
          </div>

          {/* Tri simplifié */}
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [newSortBy, newSortDir] = e.target.value.split('-');
                setSortBy(newSortBy as any);
                setSortDir(newSortDir as any);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
            >
              <option value="amount-desc">Montant (du plus grand au plus petit)</option>
              <option value="amount-asc">Montant (du plus petit au plus grand)</option>
              <option value="date-desc">Date (plus récente en premier)</option>
              <option value="date-asc">Date (plus ancienne en premier)</option>
              <option value="name-asc">Client (A à Z)</option>
              <option value="name-desc">Client (Z à A)</option>
              <option value="hours-desc">Heures (plus d'heures en premier)</option>
              <option value="hours-asc">Heures (moins d'heures en premier)</option>
            </select>
          </div>
        </div>

        {/* Résultats et actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {sortedServices.length} prestation(s) trouvée(s)
            </span>
            {(query || statusFilter !== 'all' || clientFilter) && (
              <button
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                  setClientFilter('');
                }}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-3 h-3 mr-1" />
                Effacer les filtres
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} sur {totalPages}
            </span>
          </div>
        </div>
      </div>

      {/* Sélection multiple */}
      {isSelectionMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {selectedServices.size} prestation(s) sélectionnée(s)
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                disabled={selectedServices.size === 0}
                className="inline-flex items-center px-4 py-2 rounded-full text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Trash className="w-4 h-4 mr-2" />
                Supprimer sélection
              </button>
              <button
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
      {!isSelectionMode && services.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={toggleSelectionMode}
            className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Mode sélection
          </button>
        </div>
      )}

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
                        className="px-3 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="px-3 py-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm"
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

      {/* Tableau des prestations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {isSelectionMode && (
                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => {
                        const allSelected = currentServices.every(service => selectedServices.has(service.id));
                        if (allSelected) {
                          currentServices.forEach(service => {
                            if (selectedServices.has(service.id)) {
                              toggleServiceSelection(service.id);
                            }
                          });
                        } else {
                          currentServices.forEach(service => {
                            if (!selectedServices.has(service.id)) {
                              toggleServiceSelection(service.id);
                            }
                          });
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {currentServices.every(service => selectedServices.has(service.id)) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Heures
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tarif/h
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {currentServices.map((service) => {
                const client = clients.find(c => c.id === service.client_id);
                const amount = calculateAmount(service.hours, service.hourly_rate);
                
                return (
                  <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {isSelectionMode && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleServiceSelection(service.id)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {selectedServices.has(service.id) ? (
                            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {(() => {
                          if (!client) {
                            return (
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                ?
                              </div>
                            );
                          }
                          
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
                          const colorIndex = client.name.charAt(0).toUpperCase().charCodeAt(0) % colors.length;
                          const gradientClass = colors[colorIndex];
                          
                          return (
                            <div className={`w-8 h-8 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                          );
                        })()}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {client?.name || 'Client inconnu'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(service.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                      <div className="truncate" title={service.description || 'Aucune description'}>
                        {service.description || 'Aucune description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {service.hours}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {service.hourly_rate}€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {amount.toFixed(2)}€
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="inline-flex items-center px-2 py-1 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Affichage de {startIndex + 1} à {Math.min(endIndex, sortedServices.length)} sur {sortedServices.length} prestations
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
      {services.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune prestation</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Commencez par enregistrer votre première prestation.
          </p>
        </div>
      )}

      {showModal && (
        <div 
          className="fixed bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh',
            margin: 0,
            padding: '1rem'
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b flex-shrink-0 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none cursor-pointer"
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Aperçu du client sélectionné */}
                  {formData.client_id && (() => {
                    const selectedClient = clients.find(c => c.id === formData.client_id);
                    if (!selectedClient) return null;
                    
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
                    const colorIndex = selectedClient.name.charAt(0).toUpperCase().charCodeAt(0) % colors.length;
                    const gradientClass = colors[colorIndex];
                    
                    return (
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {selectedClient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {selectedClient.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {selectedClient.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full border border-blue-500 dark:border-blue-600 shadow-md hover:shadow-lg transition-all"
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