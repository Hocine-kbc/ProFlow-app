import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Circle, Clock, Edit2, Filter, Plus, Search, Trash, Trash2, X, Package, Calendar, List } from 'lucide-react';
import { useApp } from '../contexts/AppContext.tsx';
import { useSettings } from '../hooks/useSettings.ts';
import { createService, updateService as updateServiceApi, deleteService as deleteServiceApi } from '../lib/api.ts';
import { Service, Article, ServicePricingType } from '../types/index.ts';
import AlertModal from './AlertModal.tsx';
import CustomSelect from './CustomSelect.tsx';

const DEFAULT_SERVICE_PRICING_TYPE: ServicePricingType = 'hourly';

const SERVICE_PRICING_CONFIG: Record<ServicePricingType, {
  optionLabel: string;
  quantityLabel: string;
  rateLabel: string;
  unitSuffix: string;
  rateSuffix: string;
}> = {
  hourly: {
    optionLabel: 'Horaire (€/h)',
    quantityLabel: "Nombre d'heures",
    rateLabel: 'Tarif horaire (€ / heure)',
    unitSuffix: 'h',
    rateSuffix: '€/h',
  },
  daily: {
    optionLabel: 'Journalière (€/jour)',
    quantityLabel: 'Nombre de jours',
    rateLabel: 'Tarif journalier (€ / jour)',
    unitSuffix: 'j',
    rateSuffix: '€/jour',
  },
  project: {
    optionLabel: 'Projet (forfait)',
    quantityLabel: 'Quantité',
    rateLabel: 'Montant du projet (€ / projet)',
    unitSuffix: '',
    rateSuffix: '€',
  },
};

const SERVICE_PRICING_OPTIONS = (Object.keys(SERVICE_PRICING_CONFIG) as ServicePricingType[]).map((value) => ({
  value,
  label: SERVICE_PRICING_CONFIG[value].optionLabel,
}));

const getPricingConfig = (pricingType?: ServicePricingType) => {
  const key = pricingType && SERVICE_PRICING_CONFIG[pricingType] ? pricingType : DEFAULT_SERVICE_PRICING_TYPE;
  return SERVICE_PRICING_CONFIG[key];
};

const formatQuantityWithUnit = (quantity: number, pricingType?: ServicePricingType) => {
  const config = getPricingConfig(pricingType);
  if (quantity === undefined || quantity === null) {
    return `0${config.unitSuffix}`.trim();
  }
  const numericQuantity = Number(quantity) || 0;
  const formattedQuantity = Number.isInteger(numericQuantity)
    ? numericQuantity.toString()
    : numericQuantity.toFixed(2).replace(/\.?(0)+$/, '');
  return `${formattedQuantity}${config.unitSuffix}`.trim();
};

const formatRateWithSuffix = (rate: number, pricingType?: ServicePricingType) => {
  const config = getPricingConfig(pricingType);
  if (!rate && rate !== 0) {
    return `0${config.rateSuffix}`;
  }
  const formattedRate = Number.isInteger(rate) ? rate : rate.toFixed(2);
  return `${formattedRate}${config.rateSuffix}`;
};

const parseISODate = (dateString: string): Date | null => {
  if (!dateString) return null;
  const parsed = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const addDaysToISODate = (dateString: string, days: number): string => {
  const date = parseISODate(dateString);
  if (!date) return dateString;
  const cloned = new Date(date.getTime());
  cloned.setDate(cloned.getDate() + days);
  return formatDateToISO(cloned);
};

const calculateInclusiveDaysBetween = (startDate: string, endDate: string): number => {
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  if (!start || !end) return 1;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return 1;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

export default function ServicesPage() {
  const { state, dispatch, showNotification } = useApp();
  const { services, clients } = state;
  const settings = useSettings();
  
  const [currentTab, setCurrentTab] = useState<'services' | 'articles'>('services');
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Refs pour les boutons de vue
  const listButtonRef = useRef<HTMLButtonElement>(null);
  const calendarButtonRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });
  const tabServicesButtonRef = useRef<HTMLButtonElement>(null);
  const tabArticlesButtonRef = useRef<HTMLButtonElement>(null);
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState({ width: 0, left: 0 });
  
  // États pour la navigation tactile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Fonctions utilitaires pour le calendrier
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Créer un tableau de 42 jours (6 semaines)
    const days = [];
    
    // Trouver le premier jour du mois et le convertir pour la semaine française
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    const adjustedFirstDay = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Convertir pour Lundi = 0
    
    // Calculer le nombre de jours dans le mois précédent
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Ajouter les jours du mois précédent si nécessaire
    if (adjustedFirstDay > 0) {
      for (let i = adjustedFirstDay; i > 0; i--) {
        const dayNumber = daysInPrevMonth - i + 1;
        days.push(new Date(year, month - 1, dayNumber));
      }
    }
    
    // Ajouter les jours du mois courant
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    // Ajouter les jours du mois suivant pour compléter 42 jours
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    
    return days;
  };

  // Fonction utilitaire pour formater les dates sans problème de fuseau horaire
  const formatDateToLocalString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getServicesForDate = (date: Date) => {
    const dateString = formatDateToLocalString(date);
    return services.filter(service => service.date === dateString);
  };

  // Fonction pour calculer le total mensuel des prestations
  const getMonthlyTotal = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const monthlyServices = services.filter(service => {
      const serviceDate = new Date(service.date);
      return serviceDate.getFullYear() === year && serviceDate.getMonth() === month;
    });
    
    return monthlyServices.reduce((total, service) => {
      return total + (service.hours * service.hourly_rate);
    }, 0);
  };

  const handleDayClick = (date: Date) => {
    const dayServices = getServicesForDate(date);
    setSelectedDayServices(dayServices);
  };

  // Fonctions pour le système de glissement
  const getDayKey = (date: Date) => formatDateToLocalString(date);
  
  const getSlidingState = (date: Date) => {
    const key = getDayKey(date);
    return slidingStates[key] || { currentIndex: 0, isSliding: false };
  };

  const slideToNext = (date: Date, dayServices: Service[]) => {
    const key = getDayKey(date);
    setSlidingStates(prev => {
      const currentState = prev[key] || { currentIndex: 0, isSliding: false };
      const nextIndex = (currentState.currentIndex + 1) % dayServices.length;
      return {
        ...prev,
        [key]: { currentIndex: nextIndex, isSliding: true }
      };
    });
    
    // Reset isSliding after animation
    setTimeout(() => {
      setSlidingStates(prev => ({
        ...prev,
        [key]: { ...(prev[key] || { currentIndex: 0, isSliding: false }), isSliding: false }
      }));
    }, 300);
  };

  const slideToPrev = (date: Date, dayServices: Service[]) => {
    const key = getDayKey(date);
    setSlidingStates(prev => {
      const currentState = prev[key] || { currentIndex: 0, isSliding: false };
      const prevIndex = currentState.currentIndex === 0 ? dayServices.length - 1 : currentState.currentIndex - 1;
      return {
        ...prev,
        [key]: { currentIndex: prevIndex, isSliding: true }
      };
    });
    
    // Reset isSliding after animation
    setTimeout(() => {
      setSlidingStates(prev => ({
        ...prev,
        [key]: { ...(prev[key] || { currentIndex: 0, isSliding: false }), isSliding: false }
      }));
    }, 300);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Fonctions pour la navigation tactile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      navigateMonth('next');
    }
    if (isRightSwipe) {
      navigateMonth('prev');
    }
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
  };
  
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [articleFormData, setArticleFormData] = useState({
    name: '',
    description: '',
    hourly_rate: 25,
    category: '',
    pricing_type: DEFAULT_SERVICE_PRICING_TYPE,
    is_active: true,
  });
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
  const [selectedDayServices, setSelectedDayServices] = useState<Service[]>([]);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'amount' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'invoiced'>('all');
  const [clientFilter, setClientFilter] = useState<string>('');
  
  // États pour le système de glissement des prestations
  const [slidingStates, setSlidingStates] = useState<{[key: string]: {currentIndex: number, isSliding: boolean}}>({});
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [_preselectedClient, setPreselectedClient] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    date: '',
    hours: 0,
    hourly_rate: settings?.defaultHourlyRate || 25,
    description: '',
    status: 'pending' as 'pending' | 'completed' | 'invoiced',
    article_id: '',
    pricing_type: DEFAULT_SERVICE_PRICING_TYPE as ServicePricingType,
  });
  const [dailyEndDate, setDailyEndDate] = useState<string>('');

  // Détecter le client pré-sélectionné depuis la vue détaillée client
  useEffect(() => {
    const preselectedClientId = localStorage.getItem('preselectedClientId');
    if (preselectedClientId) {
      // Trouver le client dans la liste
      const client = clients.find(c => c.id === preselectedClientId);
      if (client) {
        setPreselectedClient({ id: client.id, name: client.name });
        // Pré-remplir le formulaire avec le client sélectionné et la date du jour
        const today = formatDateToLocalString(new Date());
        
        setFormData(prev => ({
          ...prev,
          client_id: preselectedClientId,
          date: today
        }));
        // Ouvrir automatiquement le modal de création de prestation
        setShowModal(true);
      }
      // Nettoyer le localStorage
      localStorage.removeItem('preselectedClientId');
    }
  }, [clients]);

  // Charger les articles
  useEffect(() => {
    loadArticles();
  }, []);

  // Mettre à jour la position de l'indicateur de vue
  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = currentView === 'list' ? listButtonRef.current : calendarButtonRef.current;
      if (activeButton) {
        const container = activeButton.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          setIndicatorStyle({
            width: buttonRect.width,
            left: buttonRect.left - containerRect.left,
          });
        }
      }
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateIndicator);
    });

    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [currentView]);

  useEffect(() => {
    const updateTabIndicator = () => {
      const activeButton = currentTab === 'services' ? tabServicesButtonRef.current : tabArticlesButtonRef.current;
      if (activeButton && activeButton.parentElement) {
        const containerRect = activeButton.parentElement.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setTabIndicatorStyle({
          width: buttonRect.width,
          left: buttonRect.left - containerRect.left,
        });
      }
    };

    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(updateTabIndicator);
    });

    window.addEventListener('resize', updateTabIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateTabIndicator);
    };
  }, [currentTab]);

  const loadArticles = () => {
    try {
      const savedArticles = localStorage.getItem('articles');
      if (savedArticles) {
        setArticles(JSON.parse(savedArticles));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
    }
  };

  const saveArticles = (newArticles: Article[]) => {
    try {
      localStorage.setItem('articles', JSON.stringify(newArticles));
      setArticles(newArticles);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des articles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.pricing_type === 'daily') {
      if (!formData.date) {
        showNotification('error', 'Date manquante', 'Veuillez sélectionner une date de début.');
        return;
      }
      if (!dailyEndDate) {
        showNotification('error', 'Date manquante', 'Veuillez sélectionner une date de fin.');
        return;
      }
      if (dailyEndDate < formData.date) {
        showNotification('error', 'Période invalide', 'La date de fin doit être supérieure ou égale à la date de début.');
        setDailyEndDate(formData.date);
        return;
      }
    }
    
    const client = clients.find(c => c.id === formData.client_id);
    
    try {
      if (editingService) {
        const saved = await updateServiceApi(editingService.id, { ...formData });
        dispatch({ type: 'UPDATE_SERVICE', payload: { ...editingService, ...saved, client } as Service });
        showNotification('success', 'Prestation modifiée', 'La prestation a été mise à jour avec succès');
      } else {
        const saved = await createService({ ...formData });
        dispatch({ type: 'ADD_SERVICE', payload: { ...saved, client } as Service });
        showNotification('success', 'Prestation créée', 'La prestation a été créée avec succès');
      }
    } catch (_err) {
      showNotification('error', 'Erreur de sauvegarde', 'Une erreur est survenue lors de la sauvegarde de la prestation');
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      date: '',
      hours: 0,
      hourly_rate: settings?.defaultHourlyRate || 25,
      description: '',
      status: 'pending',
      article_id: '',
      pricing_type: DEFAULT_SERVICE_PRICING_TYPE,
    });
    setDailyEndDate('');
    setEditingService(null);
    setShowModal(false);
  };

  const handleArticleSelect = (articleId: string) => {
    if (articleId) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setFormData(prev => ({
          ...prev,
          article_id: articleId,
          description: article.description,
          hourly_rate: article.hourly_rate,
          pricing_type: article.pricing_type || DEFAULT_SERVICE_PRICING_TYPE,
        }));
        if ((article.pricing_type || DEFAULT_SERVICE_PRICING_TYPE) === 'daily') {
          setDailyEndDate((current) => current || formData.date || '');
        } else {
          setDailyEndDate('');
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        article_id: '',
        description: '',
        hourly_rate: settings?.defaultHourlyRate || 25,
        pricing_type: DEFAULT_SERVICE_PRICING_TYPE,
      }));
      setDailyEndDate('');
    }
  };

  const resetArticleForm = () => {
    setArticleFormData({
      name: '',
      description: '',
      hourly_rate: 25,
      category: '',
      pricing_type: DEFAULT_SERVICE_PRICING_TYPE,
      is_active: true
    });
    setEditingArticle(null);
    setShowArticleModal(false);
  };

  const handleArticleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newArticle: Article = {
      id: editingArticle?.id || Date.now().toString(),
      name: articleFormData.name,
      description: articleFormData.description,
      hourly_rate: articleFormData.hourly_rate,
      category: articleFormData.category || undefined,
      pricing_type: articleFormData.pricing_type,
      is_active: articleFormData.is_active,
      created_at: editingArticle?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (editingArticle) {
      const updatedArticles = articles.map(article => 
        article.id === editingArticle.id ? newArticle : article
      );
      saveArticles(updatedArticles);
      showNotification('success', 'Article modifié', 'L\'article a été mis à jour avec succès');
    } else {
      saveArticles([...articles, newArticle]);
      showNotification('success', 'Article créé', 'L\'article a été créé avec succès');
    }
    
    resetArticleForm();
  };

  const handleEditArticle = (article: Article) => {
    setArticleFormData({
      name: article.name,
      description: article.description,
      hourly_rate: article.hourly_rate,
      category: article.category || '',
      is_active: article.is_active
    });
    setEditingArticle(article);
    setShowArticleModal(true);
  };

  const handleDeleteArticle = (id: string) => {
    setAlertModal({
      isOpen: true,
      title: 'Supprimer l\'article',
      message: `Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: () => {
        const updatedArticles = articles.filter(article => article.id !== id);
        saveArticles(updatedArticles);
        showNotification('success', 'Article supprimé', 'L\'article a été supprimé avec succès');
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEdit = (service: Service) => {
    setFormData({
      client_id: service.client_id,
      date: service.date,
      hours: service.hours,
      hourly_rate: service.hourly_rate,
      description: service.description,
      status: service.status,
      article_id: service.article_id || '',
      pricing_type: service.pricing_type || DEFAULT_SERVICE_PRICING_TYPE,
    });
    if ((service.pricing_type || DEFAULT_SERVICE_PRICING_TYPE) === 'daily') {
      const computedEnd = service.date && service.hours
        ? addDaysToISODate(service.date, Math.max(0, Math.round(service.hours) - 1))
        : service.date;
      setDailyEndDate(computedEnd || service.date || '');
    } else {
      setDailyEndDate('');
    }
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
          showNotification('success', 'Prestation supprimée', 'La prestation a été supprimée avec succès');
        } catch (_err) {
          showNotification('error', 'Erreur de suppression', 'Une erreur est survenue lors de la suppression de la prestation');
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

  // Calculer le total mensuel des prestations
  const calculateMonthlyTotal = () => {
    const currentYear = currentMonth.getFullYear();
    const currentMonthIndex = currentMonth.getMonth();
    
    return filteredServices
      .filter(service => {
        const serviceDate = new Date(service.date);
        return serviceDate.getFullYear() === currentYear && 
               serviceDate.getMonth() === currentMonthIndex;
      })
      .reduce((total, service) => total + (service.hours * service.hourly_rate), 0);
  };

  const monthlyTotal = calculateMonthlyTotal();

  const currentServicePricingConfig = getPricingConfig(formData.pricing_type);
  const serviceQuantityStep = formData.pricing_type === 'project' ? 1 : 0.5;
  const serviceQuantityMin = formData.pricing_type === 'project' ? 1 : 0;
  const serviceRateStep = formData.pricing_type === 'project' ? 1 : 0.5;
  const showServicePreview = formData.hours > 0 && formData.hourly_rate > 0;
  const formattedServiceQuantity = formatQuantityWithUnit(formData.hours, formData.pricing_type);
  const formattedServiceRate = formatRateWithSuffix(formData.hourly_rate, formData.pricing_type);
  const estimatedServiceAmount = calculateAmount(formData.hours, formData.hourly_rate);

  const currentArticlePricingConfig = getPricingConfig(articleFormData.pricing_type);
  const articleRateStep = articleFormData.pricing_type === 'project' ? 1 : 0.5;

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
          
          showNotification('success', 'Prestations supprimées', `${selectedServices.size} prestation(s) ont été supprimée(s) avec succès`);
          
          setSelectedServices(new Set());
          setIsSelectionMode(false);
        } catch (_err) {
          showNotification('error', 'Erreur de suppression', 'Une erreur est survenue lors de la suppression des prestations');
        }
      }
    });
  };

  useEffect(() => {
    if (formData.pricing_type !== 'daily') {
      return;
    }

    const startDate = formData.date;
    if (!startDate) {
      if (dailyEndDate) {
        setDailyEndDate('');
      }
      if (formData.hours !== 0) {
        setFormData(prev => ({ ...prev, hours: 0 }));
      }
      return;
    }

    if (!dailyEndDate || dailyEndDate < startDate) {
      if (dailyEndDate !== startDate) {
        setDailyEndDate(startDate);
      }
      if (formData.hours !== 1) {
        setFormData(prev => ({ ...prev, hours: 1 }));
      }
      return;
    }

    const inclusiveDays = calculateInclusiveDaysBetween(startDate, dailyEndDate);
    if (formData.hours !== inclusiveDays) {
      setFormData(prev => ({ ...prev, hours: inclusiveDays }));
    }
  }, [formData.pricing_type, formData.date, dailyEndDate]);

  useEffect(() => {
    if (formData.pricing_type !== 'daily' && dailyEndDate) {
      setDailyEndDate('');
    }
  }, [formData.pricing_type]);

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 dark:from-orange-700 dark:via-orange-700 dark:to-orange-800 text-white shadow-lg overflow-hidden">
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
            <h1 className="text-xl sm:text-2xl font-bold">Prestations</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Suivi et facturation de vos prestations professionnelles</p>
          </div>
          <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => currentTab === 'services' ? setShowModal(true) : setShowArticleModal(true)}
              className="inline-flex items-center px-4 py-2 rounded-full bg-orange-500/30 hover:bg-orange-500/40 backdrop-blur transition-colors border border-orange-400/30 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">
                {currentTab === 'services' ? 'Nouvelle prestation' : 'Nouvel article'}
              </span>
              <span className="sm:hidden">
                {currentTab === 'services' ? 'Nouvelle' : 'Nouveau'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
        <div className="relative flex p-1 bg-gray-100 dark:bg-gray-700/60 rounded-full" role="tablist">
          <div
            className="absolute h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 shadow-md transition-all duration-200"
            style={{
              width: tabIndicatorStyle.width ? `${tabIndicatorStyle.width}px` : '50%',
              left: tabIndicatorStyle.width ? `${tabIndicatorStyle.left}px` : currentTab === 'services' ? '0%' : '50%',
              transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          <button
            ref={tabServicesButtonRef}
            type="button"
            onClick={() => setCurrentTab('services')}
            role="tab"
            className={`relative z-10 flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-colors ${
              currentTab === 'services'
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Prestations</span>
          </button>
          <button
            ref={tabArticlesButtonRef}
            type="button"
            onClick={() => setCurrentTab('articles')}
            role="tab"
            className={`relative z-10 flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-full transition-colors ${
              currentTab === 'articles'
                ? 'text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Articles</span>
          </button>
        </div>
      </div>

      {/* Boutons de vue pour les prestations */}
      {currentTab === 'services' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Vue des prestations
            </h3>
            <div className="relative inline-flex items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-full">
              {/* Indicateur animé qui glisse */}
              {indicatorStyle.width > 0 && (
                <div
                  className="absolute h-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 shadow-md"
                  style={{
                    width: `${indicatorStyle.width}px`,
                    left: `${indicatorStyle.left}px`,
                    transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'left, width'
                  }}
                />
              )}
              <button
                ref={listButtonRef}
                type="button"
                onClick={() => setCurrentView('list')}
                className={`relative z-10 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                  currentView === 'list' 
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <List className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Liste</span>
              </button>
              <button
                ref={calendarButtonRef}
                type="button"
                onClick={() => setCurrentView('calendar')}
                className={`relative z-10 inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                  currentView === 'calendar' 
                    ? 'text-white' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Calendar className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Calendrier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu des onglets */}
      {currentTab === 'services' ? (
        <>
          {currentView === 'list' ? (
            <>
              {/* Filtres et recherche modernes */}
              <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                      <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Filtres et recherche</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Affinez vos résultats</p>
                    </div>
                  </div>
                  
                  {/* Bouton de réinitialisation */}
                  {(query || statusFilter !== 'all' || clientFilter || sortBy !== 'date' || sortDir !== 'desc') && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('all');
                        setClientFilter('');
                        setSortBy('date');
                        setSortDir('desc');
                      }}
                      className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Réinitialiser
                    </button>
                  )}
                </div>
                
                {/* Grille des filtres */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Recherche */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <Search className="w-4 h-4 mr-1" />
                      Recherche
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Client, description..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtre par client */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Client
                    </label>
                    <CustomSelect
                      value={clientFilter}
                      onChange={(value) => setClientFilter(value)}
                      placeholder="Tous les clients"
                      options={[
                        { value: "", label: "Tous les clients" },
                        ...clients.map(client => ({
                          value: client.id,
                          label: client.name
                        }))
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Filtre par statut */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Statut
                    </label>
                    <CustomSelect
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value as 'all' | 'pending' | 'completed' | 'invoiced')}
                      placeholder="Tous les statuts"
                      options={[
                        { value: "all", label: "Tous les statuts" },
                        { value: "pending", label: "🟡 En attente" },
                        { value: "completed", label: "🟢 Terminée" },
                        { value: "invoiced", label: "🔵 Facturée" }
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Tri */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tri
                    </label>
                    <CustomSelect
                      value={`${sortBy}-${sortDir}`}
                      onChange={(value) => {
                        const [newSortBy, newSortDir] = value.split('-');
                        setSortBy(newSortBy as 'name' | 'hours' | 'amount' | 'date');
                        setSortDir(newSortDir as 'asc' | 'desc');
                      }}
                      placeholder="Trier par..."
                      options={[
                        { value: "date-desc", label: "📅 Date (plus récente)" },
                        { value: "date-asc", label: "📅 Date (plus ancienne)" },
                        { value: "amount-desc", label: "💰 Montant (plus élevé)" },
                        { value: "amount-asc", label: "💰 Montant (plus faible)" },
                        { value: "name-asc", label: "👤 Client (A-Z)" },
                        { value: "name-desc", label: "👤 Client (Z-A)" },
                        { value: "hours-desc", label: "⏰ Quantité (plus)" },
                        { value: "hours-asc", label: "⏰ Quantité (moins)" }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Résultats et statistiques */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {sortedServices.length} prestation{sortedServices.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      {/* Statistiques rapides */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>En attente: {services.filter(s => s.status === 'pending').length}</span>
                        <span>Terminées: {services.filter(s => s.status === 'completed').length}</span>
                        <span>Facturées: {services.filter(s => s.status === 'invoiced').length}</span>
                      </div>
                    </div>
                    
                    {/* Actions rapides (sélection multiple supprimée) */}
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0"></div>
                  </div>
                </div>
              </div>

      {/* Sélection multiple: panneau supprimé, actions déplacées à l'emplacement du bouton */}

      

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
                        Client ID: {service.client_id} | {formatQuantityWithUnit(service.hours, service.pricing_type)} × {formatRateWithSuffix(service.hourly_rate, service.pricing_type)} = {(service.hours * service.hourly_rate).toFixed(2)}€
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(service)}
                        className="px-3 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
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

      {/* Total mensuel */}
      <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 border border-emerald-200 dark:border-emerald-600 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mr-5 shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                Total mensuel des prestations
              </h3>
              <p className="text-base text-gray-600 dark:text-gray-300 font-semibold">
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* Navigation des mois */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
              className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 border border-emerald-200 dark:border-emerald-600 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </button>
            
            <div className="text-center">
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400 hover:scale-110 transition-transform duration-200 cursor-pointer"
                title="Revenir au mois actuel"
              >
                {monthlyTotal.toFixed(2)}€
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mt-1">
                {filteredServices.filter(service => {
                  const serviceDate = new Date(service.date);
                  return serviceDate.getFullYear() === currentMonth.getFullYear() && 
                         serviceDate.getMonth() === currentMonth.getMonth();
                }).length} prestation(s)
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCurrentMonth(newMonth);
              }}
              className="w-12 h-12 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 border border-emerald-200 dark:border-emerald-600 flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

    {/* Actions de sélection à l'emplacement du bouton */}
    {services.length > 0 && (
      <div className="flex justify-end mb-4">
        {!isSelectionMode ? (
          <button
            type="button"
            onClick={toggleSelectionMode}
            className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mode sélection
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedServices.size === 0}
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
        )}
      </div>
    )}

      {/* Tableau des prestations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Vue mobile - Cards */}
        <div className="block lg:hidden">
          {/* Bouton Tout sélectionner pour mobile */}
          {isSelectionMode && currentServices.length > 0 && (
            <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={() => {
                  const allSelected = currentServices.every(service => selectedServices.has(service.id));
                  if (allSelected) {
                    // Désélectionner toutes les prestations de la page courante
                    currentServices.forEach(service => {
                      if (selectedServices.has(service.id)) {
                        toggleServiceSelection(service.id);
                      }
                    });
                  } else {
                    // Sélectionner toutes les prestations de la page courante
                    currentServices.forEach(service => {
                      if (!selectedServices.has(service.id)) {
                        toggleServiceSelection(service.id);
                      }
                    });
                  }
                }}
                className="inline-flex items-center px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {currentServices.every(service => selectedServices.has(service.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
          )}
          
          {currentServices.map((service) => {
            const client = clients.find(c => c.id === service.client_id);
            const amount = calculateAmount(service.hours, service.hourly_rate);
            
            return (
              <div key={service.id} className="border-b border-gray-200 dark:border-gray-600 p-3 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {isSelectionMode && (
                        <button
                          type="button"
                          onClick={() => toggleServiceSelection(service.id)}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {selectedServices.has(service.id) ? (
                            <CheckCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {client?.name || 'Client inconnu'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(service.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 line-clamp-1">
                      {service.description || 'Aucune description'}
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex space-x-3">
                        <span className="text-gray-600 dark:text-gray-400">{formatQuantityWithUnit(service.hours, service.pricing_type)}</span>
                        <span className="text-gray-600 dark:text-gray-400">{formatRateWithSuffix(service.hourly_rate, service.pricing_type)}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{amount.toFixed(2)}€</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          service.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : service.status === 'invoiced'
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {service.status === 'completed' ? 'Terminée' : service.status === 'invoiced' ? 'Facturée' : 'En attente'}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(service)}
                            className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                            title="Modifier"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(service.id)}
                            className="p-2 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vue desktop - Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full table-fixed" style={{ minWidth: '800px' }}>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {isSelectionMode && (
                  <th className="w-16 px-6 py-4 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = currentServices.every(service => selectedServices.has(service.id));
                        if (allSelected) {
                          // Désélectionner toutes les prestations de la page courante
                          currentServices.forEach(service => {
                            if (selectedServices.has(service.id)) {
                              toggleServiceSelection(service.id);
                            }
                          });
                        } else {
                          // Sélectionner toutes les prestations de la page courante
                          currentServices.forEach(service => {
                            if (!selectedServices.has(service.id)) {
                              toggleServiceSelection(service.id);
                            }
                          });
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={currentServices.every(service => selectedServices.has(service.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                      {currentServices.every(service => selectedServices.has(service.id)) ? (
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </th>
                )}
                <th className="w-48 px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="w-28 px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="w-24 px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tarif
                </th>
                <th className="w-28 px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant
                </th>
                <th className="w-28 px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="w-40 px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
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
                      <td className="w-16 px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleServiceSelection(service.id)}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {selectedServices.has(service.id) ? (
                            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="w-48 px-6 py-4">
                      <div className="flex items-start min-w-0">
                        {(() => {
                          if (!client) {
                            return (
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
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
                            <div className={`w-8 h-8 bg-gradient-to-br ${gradientClass} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0`}>
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                          );
                        })()}
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2" title={client?.name || 'Client inconnu'}>
                            {client?.name || 'Client inconnu'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(service.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      <div className="break-words">
                        {service.description || 'Aucune description'}
                      </div>
                    </td>
                    <td className="w-20 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatQuantityWithUnit(service.hours, service.pricing_type)}
                    </td>
                    <td className="w-24 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatRateWithSuffix(service.hourly_rate, service.pricing_type)}
                    </td>
                    <td className="w-28 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                      {amount.toFixed(2)}€
                    </td>
                    <td className="w-28 px-6 py-4 whitespace-nowrap">
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
                    <td className="w-40 px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(service)}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(service.id)}
                          className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs opacity-70 hover:opacity-100"
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
        {(
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
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
      {services.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune prestation</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
            Commencez par enregistrer votre première prestation.
          </p>
        </div>
      )}
            </>
          ) : (
            /* Vue Calendrier */
            <div 
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Header du calendrier - Design moderne */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-4 text-white relative overflow-hidden">
                {/* Motifs décoratifs comme le header principal */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                  <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                  <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
                </div>
                
                {/* Traits décoratifs comme les headers de page */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-0 right-0 w-full h-0.5 bg-white/40 transform rotate-12"></div>
                  <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-6"></div>
                  <div className="absolute bottom-8 left-0 right-0 w-full h-0.5 bg-white/40 transform rotate-24"></div>
                  <div className="absolute bottom-4 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-12"></div>
                </div>
                
                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Titre et navigation */}
                    <div className="flex items-center justify-between lg:justify-start gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">
                            {formatMonthYear(currentMonth)}
                          </h3>
                          <p className="text-white/80 text-xs">Vue calendrier des prestations</p>
                        </div>
                      </div>
                      
                      {/* Navigation */}
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={() => navigateMonth('prev')}
                          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentMonth(new Date())}
                          className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                          Aujourd'hui
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateMonth('next')}
                          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Total mensuel - Design compact */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-xl">
                      <div className="text-center">
                        <p className="text-white/80 text-xs font-medium mb-1">Total du mois</p>
                        <p className="text-white text-2xl font-bold">
                          {getMonthlyTotal(currentMonth).toFixed(2)}€
                        </p>
                        <div className="mt-1 flex items-center justify-center space-x-1">
                          <div className="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-white/20 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grille du calendrier */}
              <div className="p-6">
                {/* En-têtes des jours - Design moderne (semaine française) */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => (
                    <div key={day} className={`p-3 text-center text-sm font-bold rounded-xl transition-all duration-300 ${
                      index === 5 || index === 6 
                        ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' 
                        : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>

                {/* Grille des jours - Design premium */}
                <div className="grid grid-cols-7 gap-2 min-h-[600px]">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    const dayServices = getServicesForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <div
                        key={index}
                        onClick={() => handleDayClick(date)}
                        className={`h-32 rounded-2xl border-2 p-3 transition-all duration-300 hover:shadow-2xl hover:scale-105 cursor-pointer relative group ${
                          isCurrentMonth 
                            ? isToday
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 shadow-xl ring-4 ring-indigo-200/50'
                              : isWeekend
                              ? 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 border-rose-200 dark:border-rose-700 hover:shadow-rose-200/50'
                              : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600 hover:shadow-gray-200/50'
                            : 'bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-700/30 dark:to-gray-600/30 border-gray-300/50 dark:border-gray-500/50'
                        } ${!isCurrentMonth ? 'opacity-60' : ''}`}
                      >
                        {/* Numéro du jour - Design moderne */}
                        <div className={`text-lg font-bold mb-2 flex items-center justify-between ${
                          isCurrentMonth 
                            ? isToday
                              ? 'text-white'
                              : isWeekend
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-800 dark:text-gray-200'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          <span>{date.getDate()}</span>
                          {isToday && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        {/* Prestations du jour - Design premium */}
                        <div className={`overflow-hidden max-h-16 ${!isCurrentMonth ? 'opacity-70' : ''}`}>
                          {dayServices.length === 1 ? (
                            // Une seule prestation - design premium
                            dayServices[0] ? (
                              <div
                                className={`w-full rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-gray-400/50 border-l-4 backdrop-blur-sm relative group ${
                                  dayServices[0].status === 'completed'
                                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-emerald-400 shadow-emerald-200/50 dark:shadow-emerald-800/30'
                                    : dayServices[0].status === 'invoiced'
                                    ? 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 border-rose-400 shadow-rose-200/50 dark:shadow-rose-800/30'
                                    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 shadow-blue-200/50 dark:shadow-blue-800/30'
                                }`}
                                onClick={() => handleEdit(dayServices[0])}
                                title={`${clients.find(c => c.id === dayServices[0].client_id)?.name || 'Client inconnu'} - ${formatQuantityWithUnit(dayServices[0].hours, dayServices[0].pricing_type)} - ${calculateAmount(dayServices[0].hours, dayServices[0].hourly_rate).toFixed(2)}€`}
                              >
                                {/* Bouton de suppression - Design compact */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(dayServices[0].id);
                                  }}
                                  className="absolute top-1 right-1 w-5 h-5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-md border border-red-200 dark:border-red-700 z-10 opacity-0 group-hover:opacity-100"
                                  title="Supprimer cette prestation"
                                >
                                  <Trash className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                                </button>
                                
                                <div className="px-2 py-1.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-1.5">
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        dayServices[0].status === 'completed' ? 'bg-emerald-500' :
                                        dayServices[0].status === 'invoiced' ? 'bg-rose-500' : 'bg-blue-500'
                                      }`}></div>
                                      <div className={`text-xs font-bold ${
                                        dayServices[0].status === 'completed' ? 'text-emerald-700 dark:text-emerald-300' :
                                        dayServices[0].status === 'invoiced' ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'
                                      }`}>
                                        {formatQuantityWithUnit(dayServices[0].hours, dayServices[0].pricing_type)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight mb-0.5">
                                    {clients.find(c => c.id === dayServices[0].client_id)?.name || 'Client inconnu'}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                                    {calculateAmount(dayServices[0].hours, dayServices[0].hourly_rate).toFixed(0)}€
                                  </div>
                                </div>
                              </div>
                            ) : null
                          ) : (
                            // Plusieurs prestations - système de glissement horizontal unifié
                            <div className="relative overflow-hidden rounded-md sm:rounded-lg">
                              <div className="flex transition-transform duration-300 ease-in-out"
                                   style={{ transform: `translateX(-${getSlidingState(date).currentIndex * 100}%)` }}>
                                {dayServices.map((service, _index) => {
                                  if (!service) return null;
                                  const client = clients.find(c => c.id === service.client_id);
                                  return (
                                    <div key={service.id} className="w-full flex-shrink-0">
                                      <div
                                        className={`w-full rounded-md sm:rounded-lg cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-l-2 sm:border-l-4 backdrop-blur-sm relative ${
                                          service.status === 'completed'
                                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border-emerald-400 shadow-emerald-200/50 dark:shadow-emerald-800/30'
                                            : service.status === 'invoiced'
                                            ? 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30 border-rose-400 shadow-rose-200/50 dark:shadow-rose-800/30'
                                            : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 shadow-blue-200/50 dark:shadow-blue-800/30'
                                        }`}
                                        onClick={() => handleEdit(service)}
                                        title={`${client?.name || 'Client inconnu'} - ${formatQuantityWithUnit(service.hours, service.pricing_type)} - ${calculateAmount(service.hours, service.hourly_rate).toFixed(2)}€`}
                                      >
                                        {/* Bouton de suppression */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(service.id);
                                          }}
                                          className="absolute top-1 right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-full flex items-center justify-center transition-colors shadow-sm border border-red-200 dark:border-red-700 z-10"
                                          title="Supprimer cette prestation"
                                        >
                                          <Trash className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-600 dark:text-red-400" />
                                        </button>
                                        
                                        <div className="px-1.5 sm:px-3 py-1 sm:py-2">
                                          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                            <div className="flex items-center space-x-1.5">
                                              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                                service.status === 'completed' ? 'bg-emerald-500' :
                                                service.status === 'invoiced' ? 'bg-rose-500' : 'bg-blue-500'
                                              }`}></div>
                                              <div className={`text-xs font-semibold ${
                                                service.status === 'completed' ? 'text-emerald-700 dark:text-emerald-300' :
                                                service.status === 'invoiced' ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'
                                              }`}>
                                                {formatQuantityWithUnit(service.hours, service.pricing_type)}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">
                                            {client?.name || 'Client inconnu'}
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                                            {calculateAmount(service.hours, service.hourly_rate).toFixed(0)}€
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Contrôles de glissement sur la case du jour */}
                        {dayServices.length >= 2 && (
                          <>
                            {/* Boutons de navigation */}
                            <div className="absolute top-0.5 sm:top-1 right-0.5 sm:right-1 flex space-x-0.5 z-20">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  slideToPrev(date, dayServices);
                                }}
                                className="w-4 h-4 sm:w-5 sm:h-5 bg-white/90 dark:bg-gray-700/90 hover:bg-white dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                                title="Prestation précédente"
                              >
                                <ChevronLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-600 dark:text-gray-300" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  slideToNext(date, dayServices);
                                }}
                                className="w-4 h-4 sm:w-5 sm:h-5 bg-white/90 dark:bg-gray-700/90 hover:bg-white dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors shadow-md border border-gray-200 dark:border-gray-600"
                                title="Prestation suivante"
                              >
                                <ChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-600 dark:text-gray-300" />
                              </button>
                            </div>
                            
                            {/* Indicateurs de position */}
                            <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5 sm:space-x-1 z-20">
                              {dayServices.map((_, index) => (
                                <div
                                  key={index}
                                  className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors ${
                                    index === getSlidingState(date).currentIndex 
                                      ? 'bg-gray-600 dark:bg-gray-300' 
                                      : 'bg-gray-400 dark:bg-gray-500'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Légende des couleurs */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-md bg-emerald-500 border border-emerald-600"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Terminées</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-md bg-rose-500 border border-rose-600"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Facturées</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-md bg-blue-500 border border-blue-600"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">En attente</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Section Articles */
        <div className="space-y-6">
          {/* Articles list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {articles.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun article</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                  Commencez par créer votre premier article prédéfini.
                </p>
              </div>
            ) : (
              <>
                {/* Vue mobile/tablette - Cards */}
                <div className="block lg:hidden">
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {articles.map((article) => (
                      <div key={article.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {article.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {article.description}
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            article.is_active 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {article.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Tarif horaire</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {article.hourly_rate}€/h
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Catégorie</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {article.category || 'Non définie'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-end">
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditArticle(article)}
                              className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArticle(article.id)}
                              className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Vue desktop - Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Nom
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tarif horaire
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Catégorie
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {articles.map((article) => (
                        <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {article.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {article.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {article.hourly_rate}€/h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {article.category || 'Non définie'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              article.is_active 
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            }`}>
                              {article.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleEditArticle(article)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteArticle(article.id)}
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
              </>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 dark:from-orange-700 dark:via-orange-700 dark:to-orange-800 p-4 md:p-6 lg:p-8 text-white relative overflow-hidden">
              {/* Decorative lines - consistent with other page headers */}
              <div className="absolute inset-0 opacity-20">
                {/* Traits horizontaux qui traversent */}
                <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
                <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
                <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
                <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">
                      {editingService ? 'Mettre à jour les informations' : 'Enregistrer une nouvelle prestation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable content area */}
            <div className="overflow-y-auto max-h-[calc(95vh-120px)] scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-700 hover:scrollbar-thumb-blue-600">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <CustomSelect
                label="Client *"
                value={formData.client_id}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_id: value as string,
                  }))
                }
                placeholder="Sélectionner un client"
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                required
              />

              <CustomSelect
                label="Type de prestation"
                value={formData.pricing_type}
                onChange={(value) => {
                  const nextType = value as ServicePricingType;
                  const linkedArticle = formData.article_id ? articles.find((article) => article.id === formData.article_id) : null;
                  const articlePricingType = linkedArticle ? (linkedArticle.pricing_type || DEFAULT_SERVICE_PRICING_TYPE) : null;
                  const shouldResetArticle = Boolean(linkedArticle) && articlePricingType !== nextType;
                  setFormData((prev) => {
                    const shouldResetHours = nextType === 'project' && (prev.hours === 0 || prev.hours === undefined);
                    return {
                      ...prev,
                      pricing_type: nextType,
                      hours: shouldResetHours ? 1 : prev.hours,
                      article_id: shouldResetArticle ? '' : prev.article_id,
                    };
                  });
                  if (nextType === 'daily') {
                    setDailyEndDate((current) => {
                      const startDate = formData.date;
                      if (!startDate) {
                        return current || '';
                      }
                      if (!current || current < startDate) {
                        return startDate;
                      }
                      return current;
                    });
                  } else {
                    setDailyEndDate('');
                  }
                }}
                placeholder="Choisir un type"
                options={SERVICE_PRICING_OPTIONS}
              />

              <CustomSelect
                label="Article"
                value={formData.article_id || ''}
                onChange={(value) => {
                  handleArticleSelect((value || '') as string);
                }}
                placeholder="Sélectionner un article (facultatif)"
                options={articles
                  .filter((article) => article.is_active)
                  .map((article) => ({
                    value: article.id,
                    label: `${article.name} — ${formatRateWithSuffix(article.hourly_rate, article.pricing_type)}`,
                  }))}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Détails de la prestation..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date de début *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  {formData.pricing_type === 'daily' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date de fin *</label>
                      <input
                        type="date"
                        required
                        min={formData.date || undefined}
                        value={dailyEndDate}
                        onChange={(e) => setDailyEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus-border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <CustomSelect
                    label="Statut"
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value as 'pending' | 'completed' | 'invoiced' })}
                    placeholder="Sélectionner un statut"
                    options={[
                      { value: "pending", label: "En attente" },
                      { value: "completed", label: "Terminée" },
                      { value: "invoiced", label: "Facturée" }
                    ]}
                  />
                </div>
                <div className="md:hidden" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {currentServicePricingConfig.quantityLabel} *
                  </label>
                  <input
                    type="number"
                    step={serviceQuantityStep}
                    min={serviceQuantityMin}
                    required
                    value={formData.hours ?? ''}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const parsedValue = parseFloat(rawValue);
                      setFormData({
                        ...formData,
                        hours:
                          rawValue === ''
                            ? 0
                            : Math.max(
                                serviceQuantityMin,
                                Number.isNaN(parsedValue) ? 0 : parsedValue,
                              ),
                      });
                    }}
                    readOnly={formData.pricing_type === 'daily'}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${formData.pricing_type === 'daily' ? 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                  />
                  {formData.pricing_type === 'daily' && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Calculé automatiquement à partir des dates.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {currentServicePricingConfig.rateLabel} *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={serviceRateStep}
                    required
                    value={formData.hourly_rate ?? ''}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      const parsedValue = parseFloat(rawValue);
                      setFormData({
                        ...formData,
                        hourly_rate: rawValue === '' ? 0 : Number.isNaN(parsedValue) ? 0 : parsedValue,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus-border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 flex flex-col justify-center">
                  {showServicePreview ? (
                    <>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Montant estimé</span>
                      <span className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{estimatedServiceAmount.toFixed(2)}€</span>
                      <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formattedServiceQuantity} × {formattedServiceRate}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Complétez quantité et tarif pour estimer le montant.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-full border border-orange-500 dark:border-orange-600 shadow-md hover:shadow-lg transition-all text-sm font-medium"
                >
                  {editingService ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Article Modal */}
      {showArticleModal && (
        <div className="space-y-6">
          {/* Liste des articles */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Vue mobile - Cards */}
            <div className="block lg:hidden">
              {articles.map((article) => (
                <div key={article.id} className="border-b border-gray-200 dark:border-gray-600 p-4 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                          <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {article.name}
                          </h3>
                          {article.category && (
                            <span className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                              {article.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {article.hourly_rate}€/h
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            article.is_active 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {article.is_active ? 'Actif' : 'Inactif'}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleEditArticle(article)}
                              className="p-2 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all"
                              title="Modifier"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArticle(article.id)}
                              className="p-2 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Vue desktop - Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tarif
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
                  {articles.map((article) => (
                    <tr key={article.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center mr-3">
                            <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {article.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        <div className="max-w-xs truncate">
                          {article.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {article.category ? (
                          <span className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-full">
                            {article.category}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {article.hourly_rate}€
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          article.is_active
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300'
                        }`}>
                          {article.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditArticle(article)}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-500 hover:text-blue-600 bg-gray-50/50 hover:bg-blue-50/50 dark:text-gray-400 dark:hover:text-blue-400 dark:bg-gray-700/30 dark:hover:bg-blue-900/20 border border-gray-200/50 hover:border-blue-200/50 dark:border-gray-600/50 dark:hover:border-blue-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteArticle(article.id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-gray-500 hover:text-red-600 bg-gray-50/50 hover:bg-red-50/50 dark:text-gray-400 dark:hover:text-red-400 dark:bg-gray-700/30 dark:hover:bg-red-900/20 border border-gray-200/50 hover:border-red-200/50 dark:border-gray-600/50 dark:hover:border-red-700/50 shadow-sm hover:shadow-md transition-all font-medium text-xs"
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
          </div>

          {/* Empty state pour les articles */}
          {articles.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucun article</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                Commencez par créer votre premier article de prestation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de création/édition d'article */}
      {showArticleModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 dark:from-orange-700 dark:via-orange-700 dark:to-orange-800 p-4 md:p-6 lg:p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
                <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
                <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
                <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">
                      {editingArticle ? 'Mettre à jour les informations' : 'Créer un nouvel article de prestation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetArticleForm}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className="overflow-y-auto max-h-[calc(95vh-120px)] scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-700 hover:scrollbar-thumb-blue-600">
              <form onSubmit={handleArticleSubmit} className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom de l'article *
                    </label>
                    <input
                      type="text"
                      required
                      value={articleFormData.name}
                      onChange={(e) => setArticleFormData({ ...articleFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Développement web, Conseil..."
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={articleFormData.description}
                      onChange={(e) => setArticleFormData({ ...articleFormData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Description détaillée de la prestation..."
                    />
                  </div>
                  
                  <div>
                    <CustomSelect
                      label="Type de tarification"
                      value={articleFormData.pricing_type}
                      onChange={(value) => setArticleFormData({ ...articleFormData, pricing_type: value as ServicePricingType })}
                      placeholder="Choisir un type"
                      options={SERVICE_PRICING_OPTIONS}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {currentArticlePricingConfig.rateLabel} *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step={articleRateStep}
                      required
                      value={articleFormData.hourly_rate || ''}
                      onChange={(e) => setArticleFormData({ ...articleFormData, hourly_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Catégorie
                    </label>
                    <input
                      type="text"
                      value={articleFormData.category}
                      onChange={(e) => setArticleFormData({ ...articleFormData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Ex: Développement, Design..."
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={articleFormData.is_active}
                    onChange={(e) => setArticleFormData({ ...articleFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Article actif
                  </label>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetArticleForm}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white rounded-full border border-orange-500 dark:border-orange-600 shadow-md hover:shadow-lg transition-all text-sm font-medium"
                  >
                    {editingArticle ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {/* Modal des prestations d'un jour */}
      {selectedDayServices.length > 0 && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 dark:from-orange-700 dark:via-orange-700 dark:to-orange-800 p-4 md:p-6 lg:p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
                <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
                <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
                <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Prestations du jour</h3>
                    <p className="text-white/80 text-sm">
                      {selectedDayServices.length} prestation{selectedDayServices.length > 1 ? 's' : ''} • {new Date(selectedDayServices[0]?.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayServices([])}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  title="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Contenu */}
            <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
              <div className="p-4 sm:p-6">
                <div className="space-y-3">
                  {selectedDayServices.map((service) => {
                    const client = clients.find(c => c.id === service.client_id);
                    const totalAmount = service.hours * service.hourly_rate;
                    return (
                      <div
                        key={service.id}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                          service.status === 'completed'
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                            : service.status === 'invoiced'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                            : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                        }`}
                        onClick={() => handleEdit(service)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {client?.name || 'Client inconnu'}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {service.description || 'Aucune description'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            service.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : service.status === 'invoiced'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                          }`}>
                            {service.status === 'completed' ? 'Terminée' : 
                             service.status === 'invoiced' ? 'Facturée' : 'En attente'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Quantité:</span>
                            <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatQuantityWithUnit(service.hours, service.pricing_type)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Tarif:</span>
                            <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatRateWithSuffix(service.hourly_rate, service.pricing_type)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500 dark:text-gray-400">Total:</span>
                            <span className="font-bold text-lg text-gray-900 dark:text-white ml-2">{totalAmount.toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total du jour */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total du jour:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedDayServices.reduce((acc, service) => acc + (service.hours * service.hourly_rate), 0).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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