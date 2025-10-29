import React, { useEffect, useMemo, useState } from 'react';

import {
  Archive,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  Edit2,
  Euro,
  Eye,
  FileText,
  Percent,
  Plus,
  Save,
  Send,
  Settings,
  Trash,
  Trash2,
  X,
} from 'lucide-react';

import { useApp } from '../contexts/AppContext.tsx';
import { useSettings } from '../hooks/useSettings.ts';
import {
  createInvoice,
  deleteInvoice as deleteInvoiceApi,
  fetchSettings as fetchSettingsApi,
  updateInvoice as updateInvoiceApi,
  upsertSettings,
} from '../lib/api.ts';
import { EmailData, sendInvoiceEmail } from '../lib/emailService.ts';
import { openInvoicePrintWindow } from '../lib/print.ts';
import { supabase } from '../lib/supabase.ts';
import { Invoice, Service } from '../types/index.ts';

import AlertModal from './AlertModal.tsx';
import CustomSelect from './CustomSelect.tsx';

export default function InvoicesPage() {
  const { state, dispatch, showNotification } = useApp();
  const { invoices, clients, services } = state;
  const settings = useSettings();
  
  // État pour gérer l'affichage des pages
  const [currentView, setCurrentView] = useState<'invoices' | 'settings'>('invoices');
  
  // États pour les filtres et le tri
  const [sortBy, setSortBy] = useState<'invoice_number' | 'date' | 'status'>('invoice_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // États pour les paramètres
  const [isSaving, setIsSaving] = useState(false);
  const [billingSettings, setBillingSettings] = useState({
    companyName: 'Mon Entreprise de Nettoyage',
    ownerName: 'John Doe',
    email: 'john@nettoyage.fr',
    phone: '06 12 34 56 78',
    address: '123 Rue de l\'Exemple, 75000 Paris',
    siret: '123 456 789 00010',
    defaultHourlyRate: 25,
    invoicePrefix: 'FAC',
    paymentTerms: 30,
    logoUrl: '',
    invoiceTerms: 'Paiement à 30 jours. Pas de TVA (franchise en base).',
    // Options de règlement
    showLegalRate: true,
    showFixedFee: true,
  });

  // Fonction utilitaire pour calculer le montant d'une facture à partir de ses prestations
  const calculateInvoiceAmount = (invoice: Invoice): number => {
    // 1. Essayer d'utiliser les services stockés dans la facture
    if (invoice.services && Array.isArray(invoice.services) && invoice.services.length > 0) {
      return invoice.services.reduce((acc: number, service: Service) => {
        const hours = Number(service.hours) || 0;
        const rate = Number(service.hourly_rate) || 0;
        return acc + (hours * rate);
      }, 0);
    }
    
    // 2. PRIORITÉ AU MONTANT STOCKÉ EN BASE (corrigé après suppression URSSAF)
    const storedSubtotal = Number(invoice.subtotal || 0);
    const storedNetAmount = Number(invoice.net_amount || 0);
    
    if (storedSubtotal > 0) {
      return storedSubtotal;
    }
    
    if (storedNetAmount > 0) {
      return storedNetAmount;
    }
    
    // 3. En dernier recours, chercher les services dans le state global
    const invoiceServices = services.filter(s => s.client_id === invoice.client_id);
    if (invoiceServices.length > 0) {
      return invoiceServices.reduce((acc: number, service) => {
        const hours = Number(service.hours) || 0;
        const rate = Number(service.hourly_rate) || 0;
        return acc + (hours * rate);
      }, 0);
    }
    
    return 0;
  };
  

  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [emailModal, setEmailModal] = useState<Invoice | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [preselectedClient, setPreselectedClient] = useState<{ id: string; name: string } | null>(null);
  
  // Charger les paramètres existants
  useEffect(() => {
    if (settings) {
      console.log('🔄 InvoicesPage: Chargement des paramètres globaux:', settings);
      setBillingSettings(prev => ({ ...prev, ...settings }));
    } else {
      (async () => {
        console.log('🔄 InvoicesPage: Chargement des paramètres depuis la base...');
        try {
          const remote = await fetchSettingsApi();
          if (remote) {
            console.log('🔄 InvoicesPage: Paramètres récupérés de la base:', remote);
            setBillingSettings(prev => ({ ...prev, ...remote }));
            localStorage.setItem('business-settings', JSON.stringify(remote));
            return;
          }
        } catch {
          // ignore and fallback to local
        }
        try {
          const raw = localStorage.getItem('business-settings');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              console.log('🔄 InvoicesPage: Paramètres récupérés du localStorage:', parsed);
              setBillingSettings(prev => ({ ...prev, ...parsed }));
            }
          }
        } catch {
          // ignore malformed localStorage
        }
      })();
    }
  }, [settings]);

  // Fonctions pour gérer les paramètres
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 InvoicesPage: Début de la sauvegarde avec settings:', billingSettings);
    
    setIsSaving(true);
    
    try {
      const saved = await upsertSettings(billingSettings);
      console.log('✅ InvoicesPage: Paramètres sauvegardés avec succès:', saved);
      console.log('🔍 InvoicesPage: ownerName dans les settings sauvegardées:', saved.ownerName);
      localStorage.setItem('business-settings', JSON.stringify(saved));
      
      // Mettre à jour l'état global
      console.log('🔄 InvoicesPage: Mise à jour du contexte avec:', saved);
      console.log('🔄 InvoicesPage: ownerName dans saved:', saved.ownerName);
      dispatch({ type: 'SET_SETTINGS', payload: saved });
      console.log('🔄 InvoicesPage: dispatch SET_SETTINGS appelé');
      
      showNotification('success', 'Paramètres sauvegardés', 'Vos paramètres de facturation ont été mis à jour avec succès');
      
      // Naviguer vers le Dashboard pour voir les changements
      setTimeout(() => {
        globalThis.location.href = '/';
      }, 1000);
    } catch (err) {
      console.error('❌ InvoicesPage: Erreur lors de la sauvegarde:', err);
      localStorage.setItem('business-settings', JSON.stringify(billingSettings));
      
      // Mettre à jour l'état global même en cas d'erreur
      dispatch({ type: 'SET_SETTINGS', payload: billingSettings });
      
      showNotification('warning', 'Sauvegarde locale', 'Paramètres sauvegardés en local (erreur de connexion)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsChange = (key: string, value: string | number | boolean) => {
    console.log('🔧 InvoicesPage: Changement de', key, 'vers', value);
    setBillingSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Détecter le client pré-sélectionné depuis la vue détaillée client
  useEffect(() => {
    const preselectedClientId = localStorage.getItem('preselectedClientId');
    if (preselectedClientId) {
      // Trouver le client dans la liste
      const client = clients.find(c => c.id === preselectedClientId);
      if (client) {
        setPreselectedClient({ id: client.id, name: client.name });
        // Pré-remplir le formulaire avec le client sélectionné et la date du jour
        const today = new Date().toISOString().split('T')[0];
        
        // Calculer la date d'échéance automatiquement
        const dueDateString = calculateDueDate(today);
        
        setFormData(prev => ({
          ...prev,
          client_id: preselectedClientId,
          date: today,
          due_date: dueDateString
        }));
        // Ouvrir automatiquement le modal de création de facture
              setShowModal(true);
      }
      // Nettoyer le localStorage
      localStorage.removeItem('preselectedClientId');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: '',
    date: '',
    due_date: '',
    payment_method: '',
  });
  const [originalPaymentTerms, setOriginalPaymentTerms] = useState<number | null>(null);
  const [dueDateManuallyModified, setDueDateManuallyModified] = useState(false);

  // Get available services for invoicing (completed but not invoiced) - recalculé automatiquement
  const availableServices = useMemo(() => {
    console.log('🔄 Recalcul des availableServices, services:', services.length);
    const filtered = services.filter(s => s.status === 'completed');
    console.log('🔄 Services terminés disponibles:', filtered.length);
    return filtered;
  }, [services]);
  
  // When editing a draft, also allow keeping currently linked services - recalculé automatiquement
  const selectableServices = useMemo(() => {
    if (editingInvoice) {
      // Get services for this invoice - try from invoice.services first, then from global services
      let invoiceServices = editingInvoice.services || [];
      
      // If no services in invoice, try to find them from global services
      if (invoiceServices.length === 0 && services.length > 0) {
        // Find services that are marked as 'invoiced' and belong to the same client
        const clientServices = services.filter(s => 
          s.client_id === editingInvoice.client_id && s.status === 'invoiced'
        );
        
        if (clientServices.length > 0) {
          invoiceServices = clientServices;
        } else {
          // If no invoiced services found, try to find completed services for this client
          const completedServices = services.filter(s => 
            s.client_id === editingInvoice.client_id && s.status === 'completed'
          );
          
          if (completedServices.length > 0) {
            invoiceServices = completedServices;
          }
        }
      }
      
      return Array.from(
        new Map(
          [...availableServices, ...invoiceServices].map(s => [s.id, s])
        ).values()
      );
    } else {
      return availableServices;
    }
  }, [services, editingInvoice, availableServices]);

  // Effet pour s'assurer que les services sont chargés quand la modal s'ouvre
  useEffect(() => {
    if (showModal && services.length === 0) {
      console.log('🔄 Modal ouverte mais pas de services, rechargement...');
      // Les services devraient être chargés par le contexte App, mais on peut forcer un rechargement si nécessaire
    }
  }, [showModal, services]);

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = invoices.length + 1;
    return `FAC-${year}${month}-${String(count).padStart(3, '0')}`;
  };

  // Fonction utilitaire pour calculer la date d'échéance
  const calculateDueDate = (invoiceDate: string, customPaymentTerms?: number): string => {
    let paymentTerms = 30; // valeur par défaut
    
    // Si des termes de paiement personnalisés sont fournis, les utiliser
    if (customPaymentTerms !== undefined) {
      paymentTerms = customPaymentTerms;
    } else if (settings && settings.paymentTerms) {
      // Sinon, utiliser les paramètres globaux (pour les nouvelles factures)
      paymentTerms = settings.paymentTerms;
    }
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    const invoiceServices = selectableServices.filter((s: Service) => selectedServices.includes(s.id));
    
    const totalAmount = invoiceServices.reduce((acc: number, service: Service) => 
      acc + (service.hours * service.hourly_rate), 0
    );
    
    try {
      if (editingInvoice) {
        // Update only columns that exist on invoices table (exclude services array)
        const saved = await updateInvoiceApi(editingInvoice.id, {
          client_id: formData.client_id,
          invoice_number: formData.invoice_number,
          date: formData.date,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          subtotal: totalAmount,
          net_amount: totalAmount,
          status: 'draft',
        });
        dispatch({ type: 'UPDATE_INVOICE', payload: { ...editingInvoice, ...saved, client, services: invoiceServices } as Invoice });
        showNotification('success', 'Facture modifiée', 'La facture a été mise à jour avec succès');
      } else {
        const saved = await createInvoice({
          client_id: formData.client_id,
          services: invoiceServices,
          invoice_number: formData.invoice_number || generateInvoiceNumber(),
          date: formData.date,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          subtotal: totalAmount,
          net_amount: totalAmount,
          status: 'draft',
        });
        dispatch({ type: 'ADD_INVOICE', payload: { ...saved, client, services: invoiceServices } as Invoice });
        // Ne pas marquer les services comme 'invoiced' pour permettre leur réutilisation
        // Les services restent 'completed' et peuvent être utilisés dans d'autres factures
        showNotification('success', 'Facture créée', 'La facture a été créée avec succès');
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      showNotification('error', 'Erreur', editingInvoice ? 'Erreur lors de la modification de la facture' : 'Erreur lors de la création de la facture');
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
      payment_method: '',
    });
    setSelectedServices([]);
    setShowModal(false);
    setEditingInvoice(null);
    setOriginalPaymentTerms(null);
    setDueDateManuallyModified(false);
    setPreselectedClient(null); // Réinitialiser le client pré-sélectionné
  };
  const openEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setShowModal(true);
    setFormData({
      client_id: inv.client_id,
      invoice_number: inv.invoice_number,
      date: inv.date,
      due_date: inv.due_date,
      payment_method: inv.payment_method || '',
    });
    
    // Calculer les termes de paiement originaux de cette facture
    if (inv.date && inv.due_date) {
      const invoiceDate = new Date(inv.date);
      const dueDate = new Date(inv.due_date);
      const diffTime = dueDate.getTime() - invoiceDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setOriginalPaymentTerms(diffDays);
    } else {
      setOriginalPaymentTerms(null);
    }
    
    // Réinitialiser le flag de modification manuelle
    setDueDateManuallyModified(false);
    
    // Get services for this invoice - try from invoice.services first, then from global services
    let invoiceServices = inv.services || [];
    
    
    // If no services in invoice, try to find them from global services
    if (invoiceServices.length === 0 && services.length > 0) {
      
      // Find services that are marked as 'invoiced' and belong to the same client
      const clientServices = services.filter(s => 
        s.client_id === inv.client_id && s.status === 'invoiced'
      );
      
      if (clientServices.length > 0) {
        invoiceServices = clientServices;
      } else {
        // If no invoiced services found, try to find completed services for this client
        const completedServices = services.filter(s => 
          s.client_id === inv.client_id && s.status === 'completed'
        );
        
        if (completedServices.length > 0) {
          invoiceServices = completedServices;
        }
      }
    }
    
    setSelectedServices(invoiceServices.map(s => s.id));
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
      } catch {
        showNotification('error', 'Erreur', 'Erreur lors de la mise à jour de la facture');
      }
    }
  };

  const handleDelete = (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Supprimer la facture',
      message: `Êtes-vous sûr de vouloir supprimer la facture #${invoice?.invoice_number} ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        setDeletingInvoice(id);
        try {
          // Mark services as completed again before deleting
          if (invoice && invoice.services) {
            invoice.services.forEach((service: Service) => {
              dispatch({
                type: 'UPDATE_SERVICE',
                payload: { ...service, status: 'completed' }
              });
            });
          }

          // Delete from database
          await deleteInvoiceApi(id);
          
          // Update local state
          dispatch({ type: 'DELETE_INVOICE', payload: id });
          
          showNotification('success', 'Facture supprimée', 'La facture a été supprimée avec succès');
        } catch (err) {
          console.error('Error deleting invoice:', err);
          showNotification('error', 'Erreur', 'Une erreur est survenue lors de la suppression de la facture');
        } finally {
          setDeletingInvoice(null);
        }
      }
    });
  };


  const handleArchive = (id: string) => {
    const invoice = invoices.find(i => i.id === id);
    setAlertModal({
      isOpen: true,
      title: 'Archiver la facture',
      message: `Êtes-vous sûr de vouloir archiver la facture #${invoice?.invoice_number} ? Elle sera déplacée vers l'archive et ne sera plus visible dans la liste principale.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          // Utiliser archived_at pour marquer comme archivé
          const updateData = { 
            archived_at: new Date().toISOString()
          };
          
          const { error } = await supabase
            .from('invoices')
            .update(updateData)
            .eq('id', id);
          
          if (error) {
            throw error;
          }
          
          const updatedInvoice = { 
            ...invoice, 
            archived_at: new Date().toISOString()
          };
          
          dispatch({ type: 'UPDATE_INVOICE', payload: updatedInvoice as Invoice });
          showNotification('success', 'Facture archivée', 'La facture a été archivée avec succès');
        } catch (error) {
          console.error('Error archiving invoice:', error);
          showNotification('error', 'Erreur', `Impossible d'archiver la facture: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
      }
    });
  };

  // Fonctions de gestion de sélection multiple (style Prestations)
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedInvoices(new Set());
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleAllInvoicesSelection = () => {
    const allSelected = currentInvoices.every(invoice => selectedInvoices.has(invoice.id));
    if (allSelected) {
      // Désélectionner toutes les factures
      currentInvoices.forEach(invoice => {
        if (selectedInvoices.has(invoice.id)) {
          toggleInvoiceSelection(invoice.id);
        }
      });
    } else {
      // Sélectionner toutes les factures
      currentInvoices.forEach(invoice => {
        if (!selectedInvoices.has(invoice.id)) {
          toggleInvoiceSelection(invoice.id);
        }
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedInvoices.size === 0) return;
    
    setAlertModal({
      isOpen: true,
      title: 'Supprimer les factures sélectionnées',
      message: `Êtes-vous sûr de vouloir supprimer ${selectedInvoices.size} facture(s) sélectionnée(s) ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          // Supprimer toutes les factures sélectionnées
          for (const invoiceId of selectedInvoices) {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice && invoice.services) {
            // Marquer les services comme completed avant suppression
            invoice.services.forEach((service: Service) => {
              dispatch({
                type: 'UPDATE_SERVICE',
                payload: { ...service, status: 'completed' }
              });
            });
            }
            await deleteInvoiceApi(invoiceId);
            dispatch({ type: 'DELETE_INVOICE', payload: invoiceId });
          }
          
          showNotification('success', 'Factures supprimées', `${selectedInvoices.size} facture(s) supprimée(s) avec succès`);
          setSelectedInvoices(new Set());
          setIsSelectionMode(false);
        } catch (err) {
          console.error('Erreur lors de la suppression multiple:', err);
          showNotification('error', 'Erreur', 'Impossible de supprimer certaines factures');
        }
      }
    });
  };

  const handleSendEmail = async () => {
    console.log('📧 handleSendEmail appelé avec:', { emailModal, emailData });
    
    if (!emailModal || !emailData.to.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Email invalide',
        message: 'Veuillez saisir une adresse email valide.',
        type: 'warning',
        onConfirm: () => setAlertModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    setSendingEmail(true);
    try {
      // Get business settings
      // Utiliser les paramètres de l'état global

      // Get client information
      const client = clients.find(c => c.id === emailModal.client_id);
      const clientName = client?.name || 'Client';

      // Prepare email data
      const emailDataToSend: EmailData = {
        to_email: emailData.to,
        to_name: clientName,
        subject: emailData.subject || `Facture N° ${emailModal.invoice_number} - ${new Date(emailModal.date).toLocaleDateString('fr-FR')}`,
        message: emailData.message || 'Veuillez trouver ci-joint votre facture.',
        invoice_number: emailModal.invoice_number,
        invoice_date: new Date(emailModal.date).toLocaleDateString('fr-FR'),
        invoice_due_date: new Date(emailModal.due_date).toLocaleDateString('fr-FR'),
        invoice_amount: calculateInvoiceAmount(emailModal).toFixed(2),
        payment_method: emailModal.payment_method,
        company_name: settings?.companyName || 'ProFlow',
        company_email: settings?.email || 'contact@proflow.com',
        company_phone: settings?.phone,
        company_address: settings?.address,
      };
      
      console.log('📧 Données email préparées:', emailDataToSend);

      // Send email via Backend (nouveau système)
      const emailSent = await sendInvoiceEmail(emailDataToSend, emailModal.id);
      
      if (emailSent) {
        // Update invoice status to 'sent'
        try {
          await updateInvoiceApi(emailModal.id, { ...emailModal, status: 'sent' });
          dispatch({ type: 'UPDATE_INVOICE', payload: { ...emailModal, status: 'sent' } });
        } catch (error) {
          console.error('Error updating invoice status:', error);
        }

        showNotification('success', 'Email envoyé', 'La facture a été envoyée avec succès !');
        setEmailModal(null);
        setEmailData({ to: '', subject: '', message: '' });
      } else {
        showNotification('error', 'Erreur d\'envoi', 'Erreur lors de l\'envoi de l\'email. Vérifiez que le backend est démarré.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showNotification('error', 'Erreur d\'envoi', 'Une erreur est survenue lors de l\'envoi de l\'email.');
    } finally {
      setSendingEmail(false);
    }
  };


  // kept via selectableServices in edit/new flows

  // Filtrer et trier les factures selon les critères sélectionnés
  const activeInvoices = invoices
    .filter(invoice => {
      // Filtrer les factures non archivées
      if (invoice.archived_at) return false;
      
      // Filtrer par statut
      if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
      
      // Filtrer par terme de recherche
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          invoice.invoice_number.toLowerCase().includes(searchLower) ||
          invoice.date.includes(searchTerm) ||
          invoice.status.toLowerCase().includes(searchLower) ||
          (invoice.client && invoice.client.name.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'invoice_number': {
          // Tri par numéro de facture
          const getInvoiceNumber = (invoiceNumber: string) => {
            const parts = invoiceNumber.split('-');
            if (parts.length >= 3) {
              const year = parts[1].substring(0, 4);
              const month = parts[1].substring(4, 6);
              const number = parseInt(parts[2]);
              return parseInt(year + month) * 1000 + number;
            }
            return 0;
          };
          comparison = getInvoiceNumber(a.invoice_number) - getInvoiceNumber(b.invoice_number);
          break;
        }
          
        case 'date': {
          // Tri par date
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        }
          
        case 'status': {
          // Tri par statut (draft < sent < paid)
          const statusOrder = { draft: 0, sent: 1, paid: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        }
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  
  // Logique de pagination
  const totalPages = Math.ceil(activeInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = activeInvoices.slice(startIndex, endIndex);
  
  
  // Réinitialiser la page courante si elle dépasse le nombre total de pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  // Réinitialiser la page courante quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, sortBy, sortOrder]);
  
  const totalHT = activeInvoices.reduce((acc, inv) => acc + calculateInvoiceAmount(inv), 0);
  const totalPayees = activeInvoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + calculateInvoiceAmount(inv), 0);
  const totalEnvoyees = activeInvoices.filter(i => i.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Header de la page Facture - seulement visible quand on est dans la vue factures */}
      {currentView === 'invoices' && (
        <div className="relative rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 dark:from-purple-700 dark:via-purple-700 dark:to-purple-800 text-white shadow-lg overflow-hidden">
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
            <h1 className="text-xl sm:text-2xl font-bold">Factures</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Émission et suivi de vos factures clients</p>
          </div>
          <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end space-x-2">
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/30 hover:bg-purple-500/40 backdrop-blur transition-colors border border-purple-400/30 text-sm font-medium"
            >
              <Settings className="w-4 h-4 mr-2" />
              <span>Paramètres</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Pré-remplir la date du jour et calculer l'échéance automatiquement
                const today = new Date().toISOString().split('T')[0];
                
                // Calculer la date d'échéance automatiquement
                const dueDateString = calculateDueDate(today);
                
                setFormData(prev => ({
                  ...prev,
                  date: today,
                  due_date: dueDateString
                }));
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-purple-500/30 hover:bg-purple-500/40 backdrop-blur transition-colors border border-purple-400/30 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle facture</span>
              <span className="sm:hidden">Nouvelle</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Contenu conditionnel selon la vue */}
      {currentView === 'invoices' && (
        <>
          {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-300">Total facturé</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{totalHT.toFixed(2)}€</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-300">Payées</div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">{totalPayees.toFixed(2)}€</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-300">Envoyées en attente</div>
          <div className="text-xl font-bold text-indigo-600">{totalEnvoyees}</div>
        </div>
      </div>

      {/* Statut des factures */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Statut des factures</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full">
          {[
            { 
              label: 'Payées', 
              count: activeInvoices.filter(i => i.status === 'paid').length,
              amount: activeInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + calculateInvoiceAmount(inv), 0),
              color: 'bg-green-500',
              textColor: 'text-green-600 dark:text-green-400'
            },
            { 
              label: 'Envoyées', 
              count: activeInvoices.filter(i => i.status === 'sent').length,
              amount: activeInvoices.filter(i => i.status === 'sent').reduce((sum, inv) => sum + calculateInvoiceAmount(inv), 0),
              color: 'bg-yellow-500',
              textColor: 'text-yellow-600 dark:text-yellow-400'
            },
            { 
              label: 'Brouillons', 
              count: activeInvoices.filter(i => i.status === 'draft').length,
              amount: activeInvoices.filter(i => i.status === 'draft').reduce((sum, inv) => sum + calculateInvoiceAmount(inv), 0),
              color: 'bg-gray-500',
              textColor: 'text-gray-600 dark:text-gray-400'
            }
          ].map((status, idx) => (
            <div key={idx} className="flex items-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full ${status.color} flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{status.count}</span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className={`text-base font-medium ${status.textColor}`}>{status.label}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    {status.amount.toFixed(2)}€
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sélection multiple */}
      {isSelectionMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {selectedInvoices.size} facture(s) sélectionnée(s)
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={selectedInvoices.size === 0}
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
                <X className="w-4 h-4 mr-2" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contrôles de filtrage et tri - Design responsive */}
      {!isSelectionMode && invoices.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          {/* Barre de recherche et filtres - Tout sur la même ligne */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Barre de recherche */}
            <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Rechercher par numéro, date, statut ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          
            {/* Filtres et tri - Sur la même ligne */}
            <div className="flex flex-wrap gap-4 items-end">
            {/* Filtres par statut */}
              <div className="min-w-0">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filtrer par statut:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'all', label: 'Tous' },
                  { value: 'draft', label: 'Brouillon' },
                  { value: 'sent', label: 'Envoyée' },
                  { value: 'paid', label: 'Payée' }
                ].map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setStatusFilter(option.value as 'all' | 'draft' | 'sent' | 'paid')}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      statusFilter === option.value
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Tri */}
              <div className="min-w-0">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Trier par:</label>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'invoice_number', label: 'Numéro' },
                    { value: 'date', label: 'Date' },
                    { value: 'status', label: 'Statut' }
                  ].map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setSortBy(option.value as 'invoice_number' | 'date' | 'status')}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        sortBy === option.value
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center ${
                    sortOrder === 'asc'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-indigo-500 text-white shadow-md'
                  }`}
                  title={sortOrder === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            
            </div>
          </div>
        </div>
      )}


      {/* En-tête avec nombre de factures et bouton mode sélection sur la même ligne */}
      {!isSelectionMode && invoices.length > 0 && (
        <div className="mb-2 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {activeInvoices.length === invoices.filter(invoice => !invoice.archived_at).length ? (
              `${activeInvoices.length} facture${activeInvoices.length > 1 ? 's' : ''}`
            ) : (
              `${activeInvoices.length} facture${activeInvoices.length > 1 ? 's' : ''} sur ${invoices.filter(invoice => !invoice.archived_at).length}`
            )}
            {(searchTerm || statusFilter !== 'all') && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                (filtrées)
              </span>
            )}
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="ml-3 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Effacer tous les filtres"
            >
              <X className="w-3 h-3 mr-1" />
              Effacer les filtres
            </button>
          )}
          </div>
          
          <button
            type="button"
            onClick={toggleSelectionMode}
            className="inline-flex items-center px-4 py-2 rounded-full text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mode sélection
          </button>
        </div>
      )}

      {/* Invoices table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Vue mobile/tablette - Cards */}
        <div className="block lg:hidden">
          {currentInvoices.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center space-y-2">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium">Aucune facture trouvée</p>
                <p className="text-sm">Créez votre première facture en cliquant sur le bouton "Nouvelle"</p>
              </div>
            </div>
          ) : (
            <>
              {/* Bouton Tout sélectionner pour mobile */}
              {isSelectionMode && currentInvoices.length > 0 && (
                <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={toggleAllInvoicesSelection}
                    className="inline-flex items-center px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {currentInvoices.every(invoice => selectedInvoices.has(invoice.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
              
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {currentInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {isSelectionMode && (
                        <button
                          type="button"
                          onClick={() => toggleInvoiceSelection(invoice.id)}
                          className="mt-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {selectedInvoices.has(invoice.id) ? (
                            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                          )}
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {invoice.invoice_number}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : invoice.status === 'sent'
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {invoice.status === 'paid' ? 'Payée' : 
                       invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(invoice.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Montant total</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {calculateInvoiceAmount(invoice).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(invoice)}
                        className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => openEdit(invoice)}
                          className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => {
                            // Trouver le client associé à cette facture
                            const associatedClient = clients.find(c => c.id === invoice.client_id);
                            // Pré-remplir l'email du client
                            setEmailData({
                              to: associatedClient?.email || '',
                              subject: `Facture N° ${invoice.invoice_number} - ${new Date(invoice.date).toLocaleDateString('fr-FR')}`,
                              message: 'Veuillez trouver ci-joint votre facture.'
                            });
                            setEmailModal(invoice);
                          }}
                          className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Marquer payée"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openInvoicePrintWindow(invoice, clients, services)}
                        className="p-2 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title="PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(invoice.id)}
                        className="p-2 rounded-full text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        title="Archiver"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(invoice.id)}
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
            </>
          )}
        </div>
        
        {/* Pagination mobile uniquement - v2 */}
        {totalPages > 0 && (
          <div className="block lg:hidden bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
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
        
        {/* Vue desktop - Table */}
        <div className="hidden lg:block">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="w-6 px-1 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {isSelectionMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = invoices.every(invoice => selectedInvoices.has(invoice.id));
                        if (allSelected) {
                          // Désélectionner toutes les factures
                          invoices.forEach(invoice => {
                            if (selectedInvoices.has(invoice.id)) {
                              toggleInvoiceSelection(invoice.id);
                            }
                          });
                        } else {
                          // Sélectionner toutes les factures
                          invoices.forEach(invoice => {
                            if (!selectedInvoices.has(invoice.id)) {
                              toggleInvoiceSelection(invoice.id);
                            }
                          });
                        }
                      }}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      title={invoices.every(invoice => selectedInvoices.has(invoice.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                    >
                      {invoices.every(invoice => selectedInvoices.has(invoice.id)) ? (
                        <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  ) : (
                    <span aria-hidden="true">&nbsp;</span>
                )}
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  N° Facture
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Paiement
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {currentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={isSelectionMode ? 9 : 8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">Aucune facture trouvée</p>
                      <p className="text-sm">Créez votre première facture en cliquant sur le bouton "Nouvelle facture"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="w-6 px-1 py-4 whitespace-nowrap">
                    {isSelectionMode ? (
                      <button
                        type="button"
                        onClick={() => toggleInvoiceSelection(invoice.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {selectedInvoices.has(invoice.id) ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    ) : (
                      <span aria-hidden="true">&nbsp;</span>
                  )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white truncate">
                    {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(invoice.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {calculateInvoiceAmount(invoice).toFixed(2)}€
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      invoice.status === 'paid' 
                        ? 'bg-green-100 dark:bg-green-900/30 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : invoice.status === 'sent'
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {invoice.status === 'paid' ? 'Payée' : 
                       invoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {invoice.status === 'paid' && invoice.updated_at 
                      ? new Date(invoice.updated_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {invoice.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => openEdit(invoice)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewInvoice(invoice)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => {
                            // Trouver le client associé à cette facture
                            const associatedClient = clients.find(c => c.id === invoice.client_id);
                            // Pré-remplir l'email du client
                            setEmailData({
                              to: associatedClient?.email || '',
                              subject: `Facture N° ${invoice.invoice_number} - ${new Date(invoice.date).toLocaleDateString('fr-FR')}`,
                              message: 'Veuillez trouver ci-joint votre facture.'
                            });
                            setEmailModal(invoice);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100"
                          title="Envoyer par email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          type="button"
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:text-green-100"
                          title="Marquer comme payée"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          openInvoicePrintWindow(invoice, clients, services);
                        }}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(invoice.id)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Archiver"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(invoice.id)}
                        disabled={deletingInvoice === invoice.id}
                        className={`text-red-600 hover:text-red-900 ${deletingInvoice === invoice.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={deletingInvoice === invoice.id ? "Suppression en cours..." : "Supprimer"}
                      >
                        {deletingInvoice === invoice.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination desktop uniquement - v2 */}
        {totalPages > 0 && (
          <div className="hidden lg:block bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 dark:from-purple-700 dark:via-purple-700 dark:to-purple-800 p-3 sm:p-4 lg:p-6 text-white relative overflow-hidden">
              {/* Decorative lines - consistent with other page headers */}
              <div className="absolute inset-0 opacity-20">
                {/* Traits horizontaux qui traversent */}
                <div className="absolute top-6 sm:top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                <div className="absolute top-12 sm:top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
                <div className="absolute top-18 sm:top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
                <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
                <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold truncate">
                      {editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
                      {preselectedClient && !editingInvoice && (
                        <span className="text-xs sm:text-sm font-normal text-white/80 ml-1 sm:ml-2">
                          pour {preselectedClient.name}
                        </span>
                      )}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm hidden sm:block">
                      {editingInvoice 
                        ? 'Mettez à jour les informations de la facture' 
                        : preselectedClient 
                          ? `Créez une nouvelle facture pour ${preselectedClient.name}`
                          : 'Créez une nouvelle facture pour votre client'
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 sm:p-2 transition-colors"
                  title="Fermer"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[calc(95vh-180px)] sm:max-h-[calc(95vh-200px)]">
              <form onSubmit={handleSubmit} className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
                {/* Client and Invoice Number Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                    <div>
                      <CustomSelect
                        label="Client"
                        required
                        value={formData.client_id}
                        onChange={(value) => setFormData({ ...formData, client_id: value })}
                        placeholder="Sélectionner un client"
                        options={[
                          { value: "", label: "Sélectionner un client" },
                          ...clients.map(client => ({
                            value: client.id,
                            label: client.name
                          }))
                        ]}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                        N° Facture
                      </label>
                      <input
                        type="text"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        placeholder={generateInvoiceNumber()}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              
                {/* Dates and Payment Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
                  <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Dates et paiement
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                        Date de facture *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setFormData({ ...formData, date: newDate });
                          
                          // Calculer automatiquement la date d'échéance si une date de facture est sélectionnée
                          if (newDate && !editingInvoice) {
                            // Calculer la date d'échéance pour une nouvelle facture
                            const dueDateString = calculateDueDate(newDate);
                            
                            // Mettre à jour la date d'échéance seulement si elle n'a pas été modifiée manuellement
                            setFormData(prev => ({ ...prev, date: newDate, due_date: dueDateString }));
                          } else if (newDate && editingInvoice && !dueDateManuallyModified) {
                            // Pour une facture existante, utiliser les termes de paiement originaux
                            // SEULEMENT si la date d'échéance n'a pas été modifiée manuellement
                            const dueDateString = calculateDueDate(newDate, originalPaymentTerms || undefined);
                            
                            // Mettre à jour la date d'échéance avec les termes originaux
                            setFormData(prev => ({ ...prev, date: newDate, due_date: dueDateString }));
                          } else {
                            // Si la date d'échéance a été modifiée manuellement, ne pas la recalculer
                            setFormData(prev => ({ ...prev, date: newDate }));
                          }
                        }}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Date d'échéance *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.due_date}
                        onChange={(e) => {
                          setFormData({ ...formData, due_date: e.target.value });
                          setDueDateManuallyModified(true);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Sélectionnez d'abord une date de facture"
                      />
                    </div>
                    
                    {/* Champ pour modifier les termes de paiement - seulement pour les factures en brouillon */}
                    {editingInvoice && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          Termes de paiement (jours)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={originalPaymentTerms || 30}
                          onChange={(e) => {
                            const newPaymentTerms = parseInt(e.target.value) || 30;
                            setOriginalPaymentTerms(newPaymentTerms);
                            
                            // Recalculer la date d'échéance avec les nouveaux termes
                            if (formData.date) {
                              const dueDateString = calculateDueDate(formData.date, newPaymentTerms);
                              setFormData(prev => ({ ...prev, due_date: dueDateString }));
                            }
                          }}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="30"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Modifiez le nombre de jours pour recalculer automatiquement la date d'échéance
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <CustomSelect
                        label="Mode de paiement"
                        value={formData.payment_method || ''}
                        onChange={(value) => setFormData({ ...formData, payment_method: value })}
                        placeholder="Sélectionner un mode de paiement"
                        options={[
                          { value: "", label: "Sélectionner un mode de paiement" },
                          { value: "Virement bancaire", label: "Virement bancaire" },
                          { value: "Chèque", label: "Chèque" },
                          { value: "Espèces", label: "Espèces" },
                          { value: "Carte bancaire", label: "Carte bancaire" },
                          { value: "PayPal", label: "PayPal" },
                          { value: "Autre", label: "Autre" }
                        ]}
                        className="[&>div>button]:py-2 [&>div>button]:text-sm"
                      />
                    </div>
                  </div>
                </div>
              
                {/* Services selection */}
                {(formData.client_id || editingInvoice) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 sm:p-4 lg:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-2 sm:mb-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm sm:text-base">Prestations à facturer *</span>
                      </h4>
                      <div className="flex items-center justify-center sm:justify-end">
                        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                          {selectedServices.length} sélectionnée{selectedServices.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 max-h-60 sm:max-h-80 overflow-y-auto">
                      {(() => {
                        const clientServices = selectableServices.filter(s => s.client_id === formData.client_id);
                        console.log('🔄 Services pour le client', formData.client_id, ':', clientServices.length);
                        console.log('🔄 Tous les selectableServices:', selectableServices.length);
                        return clientServices.length === 0;
                      })() ? (
                        <div className="p-4 sm:p-6 lg:p-8 text-center">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">Aucune prestation terminée disponible pour ce client.</p>
                          <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">Terminez d'abord des prestations pour ce client.</p>
                        </div>
                      ) : (
                        <>
                          {/* Boutons de sélection en masse */}
                          <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex flex-col space-y-3">
                              {/* Boutons en pillule sur mobile, horizontaux sur desktop */}
                              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const clientServices = selectableServices.filter(s => s.client_id === formData.client_id);
                                    const allServiceIds = clientServices.map(s => s.id);
                                    setSelectedServices(allServiceIds);
                                  }}
                                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
                                >
                                  ✓ Tout sélectionner
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedServices([])}
                                  className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors border border-gray-300 dark:border-gray-500"
                                >
                                  ✕ Tout désélectionner
                                </button>
                              </div>
                              
                              {/* Total sélectionné - centré sur mobile */}
                              <div className="text-center">
                                <div className="inline-flex items-center space-x-2 bg-white dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total:</span>
                                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                                    {(() => {
                                      const clientServices = selectableServices.filter(s => s.client_id === formData.client_id);
                                      const totalAmount = clientServices
                                        .filter(s => selectedServices.includes(s.id))
                                        .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0);
                                      return `${totalAmount.toFixed(2)}€`;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Liste des prestations */}
                          <div className="divide-y divide-gray-100 dark:divide-gray-600">
                          {selectableServices.filter(s => s.client_id === formData.client_id).map((service) => (
                            <label key={service.id} className="flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
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
                                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2 group-hover:border-blue-400 dark:group-hover:border-blue-500 mt-0.5 sm:mt-0"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {new Date(service.date).toLocaleDateString('fr-FR')}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                          service.status === 'completed' 
                                            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : service.status === 'invoiced'
                                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                            : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                        }`}>
                                          {service.status === 'completed' ? 'Terminée' : 
                                           service.status === 'invoiced' ? 'Facturée' : 'En attente'}
                                        </span>
                                      </div>
                                      {service.description && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 sm:mt-2 line-clamp-2">
                                          {service.description}
                                        </p>
                                      )}
                                      <div className="flex items-center space-x-3 sm:space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">
                                        <span>{service.hours}h</span>
                                        <span>×</span>
                                        <span>{service.hourly_rate}€/h</span>
                                      </div>
                                    </div>
                                    <div className="text-left sm:text-right mt-2 sm:mt-0">
                                      <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                                        {(service.hours * service.hourly_rate).toFixed(2)}€
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                </div>
                              </div>
                            </label>
                          ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              
                {/* Total preview */}
                {selectedServices.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Récapitulatif
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-3 bg-white dark:bg-gray-800 rounded-lg px-4 border-t-2 border-blue-200 dark:border-blue-600">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0)
                            .toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Footer with buttons */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 sm:px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={selectedServices.length === 0}
                    className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900 text-white rounded-full border border-purple-500 dark:border-purple-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">{editingInvoice ? 'Mettre à jour la facture' : 'Créer la facture'}</span>
                  <span className="sm:hidden">{editingInvoice ? 'Mettre à jour' : 'Créer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xs sm:max-w-lg lg:max-w-2xl xl:max-w-4xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 transform transition-all">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 dark:from-purple-700 dark:via-purple-700 dark:to-purple-800 p-4 sm:p-6 text-white relative overflow-hidden">
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
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">Aperçu de la facture</h3>
                    <p className="text-white/80 text-xs sm:text-sm truncate">
                      Facture N° {previewInvoice.invoice_number} • {new Date(previewInvoice.date).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        previewInvoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : previewInvoice.status === 'sent'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {previewInvoice.status === 'paid' ? 'Payée' : 
                         previewInvoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                      </span>
                      <span className="text-white/60 text-xs">
                        {calculateInvoiceAmount(previewInvoice).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1 sm:space-x-2">
                  <button
                    type="button"
                    onClick={() => openInvoicePrintWindow(previewInvoice, clients, services)}
                    className="px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 flex items-center space-x-1 sm:space-x-2 font-medium hover:scale-105 hover:shadow-lg text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Télécharger PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewInvoice(null)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:scale-110"
                    title="Fermer"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[calc(95vh-200px)] scrollbar-hide">
              <div className="p-4 sm:p-8">
                {/* Invoice Content */}
                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl sm:rounded-3xl p-3 sm:p-6 lg:p-10 max-w-4xl xl:max-w-5xl mx-auto shadow-2xl hover:shadow-3xl transition-all duration-300">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-8 sm:mb-12 pb-6 sm:pb-8 border-b-2 border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-6">
                      {(() => {
                        // Get business settings from localStorage
                        let settings: Record<string, unknown> | null = null;
                        try {
                          const raw = localStorage.getItem('business-settings');
                          settings = raw ? JSON.parse(raw) : null;
                        } catch {
                          // Ignore parsing errors
                          settings = null;
                        }
                        
                        return settings?.logoUrl ? (
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                            <img src={settings.logoUrl as string} alt="Logo" className="w-10 h-10 object-contain" />
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                          {(settings?.companyName as string) || 'ProFlow'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-lg">
                          {(settings?.ownerName as string) || 'Votre flux professionnel simplifié'}
                        </p>
                        <div className="mt-3 text-xs sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                          <div>
                            {settings?.address && <div>{settings.address as string}</div>}
                            {settings?.email && <div>{settings.email as string}</div>}
                            {settings?.phone && <div>{settings.phone as string}</div>}
                            {settings?.siret && <div>SIRET: {settings.siret as string}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h2 className="text-lg sm:text-2xl font-bold">FACTURE</h2>
                        <p className="text-blue-100 font-semibold text-sm sm:text-base">N° {previewInvoice.invoice_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8 sm:mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h3 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 mb-4 sm:mb-6 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          Facturé à
                        </h3>
                        <div className="text-gray-900 dark:text-white space-y-2">
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            {previewInvoice.client?.name || clients.find(c => c.id === previewInvoice.client_id)?.name || 'Client inconnu'}
                          </p>
                          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{previewInvoice.client?.email || clients.find(c => c.id === previewInvoice.client_id)?.email || ''}</p>
                          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{previewInvoice.client?.phone || clients.find(c => c.id === previewInvoice.client_id)?.phone || ''}</p>
                          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300">{previewInvoice.client?.address || clients.find(c => c.id === previewInvoice.client_id)?.address || ''}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h3 className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 mb-4 sm:mb-6 flex items-center">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          Détails de la facture
                        </h3>
                        <div className="text-gray-900 dark:text-white space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Date :</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{new Date(previewInvoice.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Échéance :</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{new Date(previewInvoice.due_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {previewInvoice.payment_method && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700 dark:text-gray-300">Mode de paiement :</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{previewInvoice.payment_method}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-green-200 dark:border-green-700">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Statut :</span>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                              previewInvoice.status === 'paid' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800'
                                : previewInvoice.status === 'sent'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {previewInvoice.status === 'paid' ? 'Payée' : 
                               previewInvoice.status === 'sent' ? 'Envoyée' : 'Brouillon'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services Table */}
                  <div className="mb-12">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Prestations
                    </h3>
                  {(() => {
                    // Get services for this invoice - try from invoice.services first, then from global services
                    // Utiliser les services stockés dans la facture si disponibles
                    const invoiceServices = previewInvoice.services || [];
                    
                    // Si pas de services stockés dans la facture, ne pas afficher tous les services du client
                    // car cela fausse l'aperçu. L'aperçu doit montrer seulement les services de cette facture.
                    if (invoiceServices.length === 0) {
                      console.log('⚠️ Aucun service stocké dans la facture pour l\'aperçu');
                      // Ne pas utiliser tous les services du client pour l'aperçu
                      // car cela afficherait toutes les prestations au lieu de celles de la facture
                    }
                    
                    return (
                      <>
                        {/* Vue mobile/tablette - Cards */}
                        <div className="block lg:hidden space-y-3">
                          {invoiceServices.length > 0 ? (
                            invoiceServices.map((service: Service, index: number) => (
                              <div key={service.id || index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {service.description || 'N/A'}
                                  </h4>
                                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {(service.hours * service.hourly_rate).toFixed(2)}€
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                                  <div>
                                    <span className="font-medium">Date:</span> {new Date(service.date).toLocaleDateString('fr-FR')}
                                  </div>
                                  <div>
                                    <span className="font-medium">Heures:</span> {service.hours}h
                                  </div>
                                  <div>
                                    <span className="font-medium">Tarif:</span> {service.hourly_rate}€/h
                                  </div>
                                  <div>
                                    <span className="font-medium">Total:</span> {(service.hours * service.hourly_rate).toFixed(2)}€
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune prestation trouvée pour cette facture</p>
                              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Les prestations seront affichées ici une fois ajoutées</p>
                            </div>
                          )}
                        </div>

                        {/* Vue desktop - Table */}
                        <div className="hidden sm:block overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
                          <table className="min-w-full border-0 rounded-xl sm:rounded-2xl overflow-hidden" style={{ minWidth: '600px' }}>
                            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                              <tr>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 first:rounded-tl-xl sm:first:rounded-tl-2xl last:rounded-tr-xl sm:last:rounded-tr-2xl">Description</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Heures</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Tarif/h</th>
                                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 last:rounded-tr-xl sm:last:rounded-tr-2xl">Total</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-600">
                              {invoiceServices.length > 0 ? (
                                invoiceServices.map((service: Service, index: number) => (
                                  <tr key={service.id || index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === invoiceServices.length - 1 ? 'last:rounded-b-xl sm:last:rounded-b-2xl' : ''}`}>
                                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white font-medium ${index === invoiceServices.length - 1 ? 'first:rounded-bl-xl sm:first:rounded-bl-2xl' : ''}`}>{service.description || 'N/A'}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{new Date(service.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{service.hours}h</td>
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">{service.hourly_rate}€</td>
                                    <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 dark:text-white font-bold ${index === invoiceServices.length - 1 ? 'last:rounded-br-xl sm:last:rounded-br-2xl' : ''}`}>{(service.hours * service.hourly_rate).toFixed(2)}€</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="px-3 sm:px-6 py-8 sm:py-12 text-center rounded-b-xl sm:rounded-b-2xl">
                                    <div className="flex flex-col items-center">
                                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune prestation trouvée pour cette facture</p>
                                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Les prestations seront affichées ici une fois ajoutées</p>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    );
                  })()}
                </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-96">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          Récapitulatif
                        </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 sm:py-3 border-b border-blue-200 dark:border-blue-700">
                              <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Sous-total :</span>
                              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{calculateInvoiceAmount(previewInvoice).toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center py-3 sm:py-4 bg-white dark:bg-gray-800 rounded-lg px-3 sm:px-4 border-2 border-blue-200 dark:border-blue-700">
                              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Total à payer :</span>
                              <span className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{calculateInvoiceAmount(previewInvoice).toFixed(2)}€</span>
                            </div>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer with metadata */}
            <div className="bg-gray-50 dark:bg-gray-700 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-center">
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Créée le :</span> {new Date(previewInvoice.created_at || previewInvoice.date).toLocaleDateString('fr-FR')}
                  </div>
                  <div>
                    <span className="font-medium">Dernière modification :</span> {new Date(previewInvoice.updated_at || previewInvoice.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 dark:from-purple-700 dark:via-purple-700 dark:to-purple-800 p-6 text-white rounded-t-2xl relative overflow-hidden">
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
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Envoyer la facture</h3>
                    <p className="text-white/80 text-sm">
                      Facture N° {emailModal.invoice_number} • {new Date(emailModal.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailModal(null)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  title="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 flex-1 overflow-y-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }} className="space-y-6">
                {/* Email Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Adresse email du client
                  </label>
                  <input
                    type="email"
                    value={emailData.to}
                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Objet de l'email
                  </label>
                  <input
                    type="text"
                    value={emailData.subject}
                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                    placeholder={`Facture N° ${emailModal.invoice_number} - ${new Date(emailModal.date).toLocaleDateString('fr-FR')}`}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Message personnalisé
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    placeholder="Bonjour, veuillez trouver ci-joint votre facture..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Invoice Summary */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-2">
                      <svg className="w-3 h-3 text-purple-600 dark:text-purple-400 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Résumé de la facture
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Montant total :</span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">{calculateInvoiceAmount(emailModal).toFixed(2)}€</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Échéance :</span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">{new Date(emailModal.due_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600 mt-6">
                  <button
                    type="button"
                    onClick={() => setEmailModal(null)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail || !emailData.to.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900 text-white rounded-xl border border-purple-500 dark:border-purple-600 shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {sendingEmail ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Envoyer la facture</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Page Paramètres */}
      {currentView === 'settings' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header de la page Paramètres */}
          <div className="relative rounded-2xl p-4 md:p-6 lg:p-8 bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 dark:from-purple-700 dark:via-purple-700 dark:to-purple-800 text-white shadow-lg overflow-hidden">
            {/* Traits décoratifs */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
              <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
              <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
              <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
              <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setCurrentView('invoices')}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur transition-colors"
                  title="Retour aux factures"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">Paramètres de facturation</h1>
                  <p className="text-sm sm:text-base text-white/80 mt-1">Configurez vos paramètres de facturation</p>
                </div>
              </div>
            </div>
          </div>

          <form id="settings-form" onSubmit={handleSettingsSubmit} className="space-y-4 sm:space-y-6">
            {/* Billing Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Paramètres de facturation
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tarif horaire par défaut (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={billingSettings.defaultHourlyRate || ''}
                    onChange={(e) => handleSettingsChange('defaultHourlyRate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="25.00"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Préfixe facture
                  </label>
                  <input
                    type="text"
                    value={billingSettings.invoicePrefix}
                    onChange={(e) => handleSettingsChange('invoicePrefix', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="FAC"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Délai de paiement (jours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={billingSettings.paymentTerms || ''}
                    onChange={(e) => {
                      const newPaymentTerms = parseInt(e.target.value) || 30;
                      handleSettingsChange('paymentTerms', newPaymentTerms);
                      
                      // Remplir automatiquement les conditions de paiement si elles sont vides ou par défaut
                      const currentTerms = billingSettings.invoiceTerms;
                      const defaultTerms = `Paiement en ${billingSettings.paymentTerms || 30} jours.`;
                      const newDefaultTerms = `Paiement en ${newPaymentTerms} jours.`;
                      
                      // Si les conditions actuelles sont vides ou correspondent au format par défaut, les mettre à jour
                      if (!currentTerms || currentTerms === defaultTerms || currentTerms === 'Paiement à 30 jours. Pas de TVA (franchise en base).' || currentTerms === 'Paiement en 30 jours. Pas de TVA (franchise en base).' || currentTerms === 'Paiement en 30 jours.') {
                        handleSettingsChange('invoiceTerms', newDefaultTerms);
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="30"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Conditions de paiement personnalisées
                  </label>
                  <textarea
                    value={billingSettings.invoiceTerms}
                    onChange={(e) => handleSettingsChange('invoiceTerms', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    placeholder="Paiement en 30 jours."
                    rows={3}
                  />
                </div>
                
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Règlement
                    </h3>
                    <div className="space-y-4 bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={billingSettings.showLegalRate}
                            onChange={(e) => handleSettingsChange('showLegalRate', e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-purple-600 dark:ring-offset-gray-800"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            • Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <input
                            type="checkbox"
                            checked={billingSettings.showFixedFee}
                            onChange={(e) => handleSettingsChange('showFixedFee', e.target.checked)}
                            className="w-4 h-4 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-gray-800 dark:border-gray-600 dark:focus:ring-purple-600 dark:ring-offset-gray-800"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                            • En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
              <div className="flex items-center space-x-2 mb-4 sm:mb-6">
                <Percent className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Informations fiscales
                </h3>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Micro-entreprise - Régime fiscal
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      En tant que micro-entrepreneur dans le secteur des services, vous bénéficiez :
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-disc">
                      <li>Franchise de TVA (pas de TVA à facturer)</li>
                      <li>Comptabilité simplifiée</li>
                      <li>Déclaration mensuelle ou trimestrielle</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Conditions de facturation (affichées sur le PDF)
                </label>
                <textarea
                  rows={4}
                  value={billingSettings.invoiceTerms}
                  onChange={(e) => handleSettingsChange('invoiceTerms', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 resize-none"
                  placeholder="Paiement à 30 jours. Pas de TVA (franchise en base)."
                />
                {billingSettings.showLegalRate && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note :</strong> Les pénalités de retard de paiement seront automatiquement ajoutées aux factures selon la loi n°2008-776 du 4 août 2008 (taux légal × 3 + indemnité forfaitaire 40€).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center px-6 py-3 rounded-full text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 dark:from-purple-700 dark:to-purple-800 dark:hover:from-purple-800 dark:hover:to-purple-900 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
                </span>
              </button>
            </div>
          </form>
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
