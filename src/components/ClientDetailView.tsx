import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  Send, 
  Download,
  Plus,
  Search,
  Building,
  CreditCard,
  MessageSquare,
  BarChart3,
  Edit2,
  Trash2,
  Archive
} from 'lucide-react';
import { ClientDetail } from '../types/clientDetail';
import { supabase } from '../lib/supabase';
import { openInvoicePrintWindow } from '../lib/print';
import { sendInvoiceEmail, EmailData } from '../lib/emailService';
import { useSettings } from '../hooks/useSettings';
import { updateInvoice as updateInvoiceApi, deleteInvoice as deleteInvoiceApi, fetchClientNotes, createClientNote, deleteClientNote, ClientNote } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import AlertModal from './AlertModal';

interface ClientDetailViewProps {
  clientId: string;
  onBack: () => void;
  onEditClient: (client: ClientDetail) => void;
  onCreateInvoice: (clientId: string) => void;
}

export default function ClientDetailView({ 
  clientId, 
  onBack, 
  onEditClient,
  onCreateInvoice
}: ClientDetailViewProps) {
  const { state, dispatch, showNotification } = useApp();
  const settings = useSettings();
  const { clients, services } = state;

  // Fonction utilitaire pour calculer le montant d'une facture à partir de ses prestations
  // EXACTEMENT LA MÊME que dans InvoicesPage.tsx
  const calculateInvoiceAmount = (invoice: any): number => {
    // 1. Essayer d'utiliser les services stockés dans la facture
    if (invoice.services && invoice.services.length > 0) {
      return invoice.services.reduce((acc: number, service: any) => {
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
      return invoiceServices.reduce((acc: number, service: any) => {
        const hours = Number(service.hours) || 0;
        const rate = Number(service.hourly_rate) || 0;
        return acc + (hours * rate);
      }, 0);
    }
    
    return 0;
  };
  
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'services' | 'payments' | 'notes'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // États pour les notes
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'general' | 'call' | 'email' | 'meeting'>('general');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Fonctions pour gérer les notes
  const addNote = async () => {
    if (!newNote.trim() || !client) return;
    
    setNotesLoading(true);
    try {
      const newNoteData = await createClientNote({
        client_id: clientId,
        type: noteType,
        content: newNote.trim()
      });
      
      setNotes(prev => [newNoteData, ...prev]);
      setNewNote('');
      setNoteType('general');
      setIsAddingNote(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
      // Fallback vers localStorage en cas d'erreur
      const note = {
        id: Date.now().toString(),
        client_id: clientId,
        content: newNote.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: noteType
      };
      
      setNotes(prev => [note, ...prev]);
      setNewNote('');
      setNoteType('general');
      setIsAddingNote(false);
      
      // Sauvegarder dans localStorage comme fallback
      const existingNotes = JSON.parse(localStorage.getItem(`client-notes-${clientId}`) || '[]');
      existingNotes.unshift(note);
      localStorage.setItem(`client-notes-${clientId}`, JSON.stringify(existingNotes));
    } finally {
      setNotesLoading(false);
    }
  };
  
  const deleteNote = async (noteId: string) => {
    try {
      await deleteClientNote(noteId);
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error);
      // Fallback vers localStorage
      setNotes(prev => prev.filter(note => note.id !== noteId));
      const existingNotes = JSON.parse(localStorage.getItem(`client-notes-${clientId}`) || '[]');
      const updatedNotes = existingNotes.filter((note: any) => note.id !== noteId);
      localStorage.setItem(`client-notes-${clientId}`, JSON.stringify(updatedNotes));
    }
  };
  
  // Charger les notes au montage du composant
  useEffect(() => {
    const loadNotes = async () => {
      if (!clientId) return;
      
      setNotesLoading(true);
      try {
        // Essayer de charger depuis la base de données
        const dbNotes = await fetchClientNotes(clientId);
        if (dbNotes.length > 0) {
          setNotes(dbNotes);
        } else {
          // Fallback vers localStorage si pas de notes en DB
          const savedNotes = JSON.parse(localStorage.getItem(`client-notes-${clientId}`) || '[]');
          setNotes(savedNotes);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notes:', error);
        // Fallback vers localStorage
        const savedNotes = JSON.parse(localStorage.getItem(`client-notes-${clientId}`) || '[]');
        setNotes(savedNotes);
      } finally {
        setNotesLoading(false);
      }
    };
    
    loadNotes();
  }, [clientId]);
  
  // États pour les modals
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [emailModal, setEmailModal] = useState<any>(null);
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);
  
  // États pour la modal d'alerte
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
  
  // États pour l'édition de facture
  const [showInvoiceEditModal, setShowInvoiceEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [selectedServicesForInvoice, setSelectedServicesForInvoice] = useState<string[]>([]);
  const [invoiceFormData, setInvoiceFormData] = useState({
    client_id: '',
    invoice_number: '',
    date: '',
    due_date: '',
    payment_method: '',
  });
  
  // États pour la modal de création de prestation (même structure que ServicesPage)
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [serviceFormData, setServiceFormData] = useState({
    client_id: '',
    date: '',
    hours: 0,
    hourly_rate: settings?.defaultHourlyRate || 25,
    description: '',
    status: 'pending' as 'pending' | 'completed' | 'invoiced',
  });

  useEffect(() => {
    loadClientDetail();
  }, [clientId]);

  const handleEditClient = () => {
    if (client) {
      onEditClient(client);
    }
  };

  // Fonctions pour gérer la modal de prestation (identiques à ServicesPage)
  const handleCreateServiceLocal = () => {
    // Pré-remplir avec le client actuel et la date du jour
    const today = new Date().toISOString().split('T')[0];
    const defaultRate = settings?.defaultHourlyRate || 25;
    setServiceFormData({
      client_id: clientId,
      date: today,
      hours: 0,
      hourly_rate: defaultRate,
      description: '',
      status: 'pending',
    });
    setEditingService(null);
    setShowServiceModal(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 Données du formulaire:', serviceFormData);
    
    // Validation des champs requis
    if (!serviceFormData.client_id) {
      showNotification('error', 'Erreur de validation', 'Veuillez sélectionner un client');
      return;
    }
    
    if (!serviceFormData.date) {
      showNotification('error', 'Erreur de validation', 'Veuillez saisir une date');
      return;
    }
    
    if (serviceFormData.hours <= 0) {
      showNotification('error', 'Erreur de validation', 'Veuillez saisir un nombre d\'heures valide');
      return;
    }
    
    if (serviceFormData.hourly_rate <= 0) {
      showNotification('error', 'Erreur de validation', 'Veuillez saisir un tarif horaire valide');
      return;
    }
    
    if (!serviceFormData.description || serviceFormData.description.trim() === '') {
      showNotification('error', 'Erreur de validation', 'Veuillez saisir une description pour la prestation');
      return;
    }
    
    const clientForService = clients.find(c => c.id === serviceFormData.client_id);
    console.log('🔍 Client trouvé:', clientForService);
    
    try {
      // Importer les fonctions depuis l'API (même logique que ServicesPage)
      const { createService, updateService: updateServiceApi } = await import('../lib/api');
      
      // Préparer les données au bon format pour l'API (snake_case)
      const serviceData = {
        client_id: serviceFormData.client_id,
        date: serviceFormData.date,
        hours: serviceFormData.hours,
        hourly_rate: serviceFormData.hourly_rate, // Déjà en snake_case
        description: serviceFormData.description || '',
        status: serviceFormData.status
      };
      
      console.log('🔍 Données préparées pour l\'API:', serviceData);
      
      if (editingService) {
        console.log('🔍 Mode modification:', editingService);
        const saved = await updateServiceApi(editingService.id, serviceData);
        dispatch({ type: 'UPDATE_SERVICE', payload: { ...saved, client: clientForService } });
        showNotification('success', 'Prestation modifiée', 'La prestation a été mise à jour avec succès');
      } else {
        console.log('🔍 Mode création...');
        const saved = await createService(serviceData);
        console.log('🔍 Prestation sauvegardée:', saved);
        dispatch({ type: 'ADD_SERVICE', payload: { ...saved, client: clientForService } });
        showNotification('success', 'Prestation créée', 'La prestation a été créée avec succès');
      }
      
      // Recharger les données du client pour afficher la nouvelle prestation
      loadClientDetail();
      
      // Fermer la modal
      resetServiceForm();
    } catch (err) {
      console.error('❌ Erreur lors de la sauvegarde:', err);
      console.error('❌ Détails de l\'erreur:', {
        message: (err as Error).message,
        stack: (err as Error).stack,
        formData: serviceFormData
      });
      showNotification('error', 'Erreur de sauvegarde', `Une erreur est survenue lors de la sauvegarde de la prestation: ${(err as Error).message}`);
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      client_id: '',
      date: '',
      hours: 0,
      hourly_rate: settings?.defaultHourlyRate || 25,
      description: '',
      status: 'pending',
    });
    setEditingService(null);
    setShowServiceModal(false);
  };

  const calculateServiceAmount = (hours: number, hourlyRate: number) => {
    return hours * hourlyRate;
  };

  // Fonction pour gérer l'aperçu des factures
  const handleViewInvoiceLocal = (invoice: any) => {
    console.log('🔍 Invoice pour aperçu:', invoice);
    console.log('🔍 Services dans l\'invoice:', invoice.services);
    console.log('🔍 Nombre de services:', invoice.services?.length || 0);
    
    // Convertir l'invoice du ClientDetail vers le format attendu par le modal
    const invoiceForPreview = {
      id: invoice.id,
      invoice_number: invoice.invoice_number || invoice.number,
      date: invoice.date,
      due_date: invoice.due_date || invoice.dueDate,
      client_id: clientId,
      subtotal: invoice.subtotal || invoice.amount,
      net_amount: invoice.net_amount || invoice.amount,
      status: invoice.status,
      payment_method: invoice.payment_method || invoice.paymentMethod || '',
      services: invoice.services || []
    };
    
    console.log('🔍 InvoiceForPreview créé:', invoiceForPreview);
    console.log('🔍 Services dans previewInvoice:', invoiceForPreview.services);
    console.log('🔍 Nombre de services dans previewInvoice:', invoiceForPreview.services?.length || 0);
    
    setPreviewInvoice(invoiceForPreview);
  };

  // Fonction pour gérer l'envoi d'email
  const handleSendEmailLocal = (invoice: any) => {
    const invoiceForEmail = {
      id: invoice.id,
      invoice_number: invoice.invoice_number || invoice.number,
      date: invoice.date,
      due_date: invoice.due_date || invoice.dueDate,
      client_id: clientId,
      subtotal: invoice.subtotal || invoice.amount,
      net_amount: invoice.net_amount || invoice.amount,
      status: invoice.status,
      payment_method: invoice.payment_method || invoice.paymentMethod || '',
      services: invoice.services || []
    };
    
    // Pré-remplir l'email du client
    setEmailData({
      to: client?.email || '',
      subject: `Facture N° ${invoice.invoice_number || invoice.number} - ${new Date(invoice.date).toLocaleDateString('fr-FR')}`,
      message: 'Veuillez trouver ci-joint votre facture.'
    });
    
    setEmailModal(invoiceForEmail);
  };

  // Fonction pour gérer le téléchargement PDF
  const handleDownloadPDF = (invoice: any) => {
    // Convertir l'invoice vers le format attendu
    const invoiceForPrint = {
      id: invoice.id,
      invoice_number: invoice.invoice_number || invoice.number,
      date: invoice.date,
      due_date: invoice.due_date || invoice.dueDate,
      client_id: clientId,
      subtotal: invoice.subtotal || invoice.amount,
      net_amount: invoice.net_amount || invoice.amount,
      status: invoice.status,
      payment_method: invoice.payment_method || invoice.paymentMethod || '',
      services: invoice.services || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    openInvoicePrintWindow(invoiceForPrint, clients, services);
  };

  // Fonction pour envoyer l'email
  const handleSendEmail = async () => {
    if (!emailModal || !emailData.to.trim()) {
      showNotification('error', 'Email invalide', 'Veuillez saisir une adresse email valide.');
      return;
    }

    setSendingEmail(true);
    try {
      // Utiliser les paramètres de l'état global

      // Get client information
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
        invoice_amount: emailModal.net_amount.toFixed(2),
        payment_method: emailModal.payment_method,
        company_name: settings?.companyName || 'ProFlow',
        company_email: settings?.email || 'contact@proflow.com',
        company_phone: settings?.phone,
        company_address: settings?.address,
      };

      // Send email via Backend
      const emailSent = await sendInvoiceEmail(emailDataToSend, emailModal.id, emailModal);
      
      if (emailSent) {
        // Update invoice status to 'sent'
        try {
          await updateInvoiceApi(emailModal.id, { status: 'sent' });
          
          // Update global state to sync with InvoicesPage
          dispatch({ 
            type: 'UPDATE_INVOICE', 
            payload: { 
              ...emailModal, 
              status: 'sent',
              updated_at: new Date().toISOString()
            }
          });
          
          // Reload client data to reflect changes
          loadClientDetail();
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

  // Fonction pour marquer une facture comme payée
  const handleMarkAsPaid = async (invoice: any) => {
    try {
      // Mettre à jour le statut dans la base de données
      await updateInvoiceApi(invoice.id, { 
        status: 'paid'
      } as any);
      
      // Mettre à jour le state global
      dispatch({ 
        type: 'UPDATE_INVOICE', 
        payload: { 
          ...invoice, 
          status: 'paid',
          paidDate: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }
      });
      
      // Recharger les données du client
      loadClientDetail();
      
      showNotification('success', 'Facture marquée comme payée', 'Le statut de la facture a été mis à jour avec succès !');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      showNotification('error', 'Erreur', 'Une erreur est survenue lors de la mise à jour du statut.');
    }
  };

  // Fonction pour modifier une facture (ouvre la modal d'édition)
  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowInvoiceEditModal(true);
    setInvoiceFormData({
      client_id: invoice.client_id || clientId,
      invoice_number: invoice.invoice_number || invoice.number || '',
      date: invoice.date || '',
      due_date: invoice.due_date || invoice.dueDate || '',
      payment_method: invoice.payment_method || invoice.paymentMethod || '',
    });
    
    // Récupérer les services liés à cette facture
    let invoiceServices: any[] = [];
    
    // 1. D'abord essayer les services stockés dans la facture
    if (invoice.services && invoice.services.length > 0) {
      invoiceServices = invoice.services;
    } 
    // 2. Sinon, chercher dans les services globaux par client_id
    else {
      // Chercher tous les services du client (pas seulement 'invoiced')
      invoiceServices = services.filter(s => s.client_id === (invoice.client_id || clientId));
    }
    
    console.log('Services trouvés pour la facture:', invoiceServices);
    console.log('Montant calculé:', invoiceServices.reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0));
    
    setSelectedServicesForInvoice(invoiceServices.map(s => s.id));
  };

  // Fonction pour calculer la date d'échéance
  const calculateDueDate = (invoiceDate: string): string => {
    let paymentTerms = 30; // valeur par défaut
    if (settings && settings.paymentTerms) {
      paymentTerms = settings.paymentTerms;
    }
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate.toISOString().split('T')[0];
  };

  // Fonction pour soumettre l'édition de facture
  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingInvoice) return;
    
    const invoiceServices = services.filter(s => selectedServicesForInvoice.includes(s.id));
    const totalAmount = invoiceServices.reduce((acc, service) => 
      acc + (service.hours * service.hourly_rate), 0
    );
    
    try {
      const saved = await updateInvoiceApi(editingInvoice.id, {
        client_id: invoiceFormData.client_id,
        invoice_number: invoiceFormData.invoice_number,
        date: invoiceFormData.date,
        due_date: invoiceFormData.due_date,
        payment_method: invoiceFormData.payment_method,
        subtotal: totalAmount,
        net_amount: totalAmount,
        status: 'draft',
      } as any);
      
      // Mettre à jour le state global
      dispatch({ 
        type: 'UPDATE_INVOICE', 
        payload: { 
          ...editingInvoice, 
          ...saved, 
          client: clients.find(c => c.id === invoiceFormData.client_id),
          services: invoiceServices 
        } 
      });
      
      showNotification('success', 'Facture modifiée', 'La facture a été mise à jour avec succès');
      resetInvoiceForm();
      loadClientDetail(); // Recharger les données du client
    } catch (err) {
      console.error('Error updating invoice:', err);
      showNotification('error', 'Erreur', 'Erreur lors de la modification de la facture');
    }
  };

  // Fonction pour réinitialiser le formulaire de facture
  const resetInvoiceForm = () => {
    setInvoiceFormData({
      client_id: '',
      invoice_number: '',
      date: '',
      due_date: '',
      payment_method: '',
    });
    setSelectedServicesForInvoice([]);
    setShowInvoiceEditModal(false);
    setEditingInvoice(null);
  };

  // Fonction pour archiver une facture
  const handleArchiveInvoice = (invoice: any) => {
    setAlertModal({
      isOpen: true,
      title: 'Archiver la facture',
      message: `Êtes-vous sûr de vouloir archiver la facture #${invoice.invoice_number || invoice.number} ? Elle sera déplacée vers l'archive et ne sera plus visible dans la liste principale.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('invoices')
            .update({
              archived_at: new Date().toISOString()
            })
            .eq('id', invoice.id);

          if (error) throw error;

          // Mettre à jour le state global
          dispatch({ type: 'UPDATE_INVOICE', payload: {
            ...invoice,
            archived_at: new Date().toISOString()
          }});
          
          // Recharger les données du client
          loadClientDetail();
          
          showNotification('success', 'Facture archivée', 'La facture a été archivée avec succès !');
        } catch (error) {
          console.error('Error archiving invoice:', error);
          showNotification('error', 'Erreur', 'Impossible d\'archiver la facture');
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Fonction pour supprimer une facture (avec modal d'alerte personnalisée)
  const handleDeleteInvoice = (invoice: any) => {
    setAlertModal({
      isOpen: true,
      title: 'Supprimer la facture',
      message: `Êtes-vous sûr de vouloir supprimer la facture #${invoice.invoice_number || invoice.number} ? Cette action est irréversible.`,
      type: 'warning',
      onConfirm: async () => {
        setDeletingInvoice(invoice.id);
        try {
          await deleteInvoiceApi(invoice.id);
          
          // Mettre à jour le state global
          dispatch({ type: 'DELETE_INVOICE', payload: invoice.id });
          
          // Recharger les données du client
          loadClientDetail();
          
          showNotification('success', 'Facture supprimée', 'La facture a été supprimée avec succès !');
        } catch (error) {
          console.error('Error deleting invoice:', error);
          showNotification('error', 'Erreur', 'Une erreur est survenue lors de la suppression de la facture.');
        } finally {
          setDeletingInvoice(null);
        }
        setAlertModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const loadClientDetail = async () => {
    setLoading(true);
    try {
      // Vérifier que l'ID est valide
      if (!clientId || clientId === 'null' || clientId === 'undefined') {
        console.error('❌ ID de client invalide:', clientId);
        setClient(null);
        return;
      }
      
      // D'abord, vérifier si le client existe
      const { error: existsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', clientId)
        .single();

      if (existsError) {
        console.error('❌ Client non trouvé:', existsError);
        setClient(null);
        return;
      }

      // Récupérer les données réelles depuis Supabase avec les relations disponibles
      let { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          invoices (*),
          services (*)
        `)
        .eq('id', clientId)
        .single();
        

      let invoices = [];
      let services = [];

      if (clientError) {
        console.error('Erreur lors de la récupération du client avec relations:', clientError);
        
        // Essayer de récupérer le client sans relations
        const { data: simpleClient, error: simpleError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();
          
        if (simpleError) {
          console.error('❌ Impossible de récupérer le client:', simpleError);
          setClient(null);
          return;
        }
        
        // Récupérer les données séparément
        let invoicesData = [];
        let servicesData = [];
        
        try {
          const { data: invoicesResult } = await supabase
            .from('invoices')
            .select('*')
            .eq('client_id', clientId)
            .is('archived_at', null); // Exclure les factures archivées
          invoicesData = invoicesResult || [];
        } catch (invoicesError) {
          console.log('⚠️ Table invoices non disponible:', invoicesError);
          invoicesData = [];
        }
        
        try {
          const { data: servicesResult } = await supabase
            .from('services')
            .select('*')
            .eq('client_id', clientId);
          servicesData = servicesResult || [];
        } catch (servicesError) {
          console.log('⚠️ Table services non disponible:', servicesError);
          servicesData = [];
        }
          
          
        // Utiliser les données récupérées séparément
        client = simpleClient;
        invoices = invoicesData || [];
        services = servicesData || [];
        
        // Filtrer les factures archivées
        invoices = invoices.filter((invoice: any) => !invoice.archived_at);
        
        // Charger les services depuis localStorage pour chaque facture (comme dans InvoicesPage)
        invoices = invoices.map((invoice: any) => {
          // Essayer de récupérer les services depuis localStorage
          let invoiceServices = invoice.services || [];
          console.log(`🔍 Facture ${invoice.id} - Services initiaux:`, invoiceServices.length);
          
          if (invoiceServices.length === 0) {
            try {
              const storedServices = JSON.parse(localStorage.getItem('invoice-services') || '{}');
              invoiceServices = storedServices[invoice.id] || [];
              console.log(`🔍 Services depuis localStorage pour facture ${invoice.id}:`, invoiceServices.length);
            } catch (e) {
              console.warn('Could not load services from localStorage for invoice:', invoice.id);
            }
          }
          
          console.log(`🔍 Services finaux pour facture ${invoice.id}:`, invoiceServices.length);
          
          return {
            ...invoice,
            services: invoiceServices
          };
        });
      } else {
        // Extraire les données des relations
        invoices = client.invoices || [];
        services = client.services || [];
        
        // Filtrer les factures archivées
        invoices = invoices.filter((invoice: any) => !invoice.archived_at);
        
        // Charger les services depuis localStorage pour chaque facture (comme dans InvoicesPage)
        invoices = invoices.map((invoice: any) => {
          // Essayer de récupérer les services depuis localStorage
          let invoiceServices = invoice.services || [];
          console.log(`🔍 Facture ${invoice.id} - Services initiaux:`, invoiceServices.length);
          
          if (invoiceServices.length === 0) {
            try {
              const storedServices = JSON.parse(localStorage.getItem('invoice-services') || '{}');
              invoiceServices = storedServices[invoice.id] || [];
              console.log(`🔍 Services depuis localStorage pour facture ${invoice.id}:`, invoiceServices.length);
            } catch (e) {
              console.warn('Could not load services from localStorage for invoice:', invoice.id);
            }
          }
          
          console.log(`🔍 Services finaux pour facture ${invoice.id}:`, invoiceServices.length);
          
          return {
            ...invoice,
            services: invoiceServices
          };
        });
      }


      // Calculer les KPIs - EXACTEMENT comme dans InvoicesPage.tsx
      const totalRevenue = invoices?.reduce((sum: number, inv: any) => {
        return sum + calculateInvoiceAmount(inv);
      }, 0) || 0;
      
      const paidInvoices = invoices?.filter((inv: any) => inv.status === 'paid') || [];
      
      const paidAmount = paidInvoices.reduce((sum: number, inv: any) => {
        return sum + calculateInvoiceAmount(inv);
      }, 0);
      
      const pendingAmount = invoices?.filter((inv: any) => inv.status === 'sent').reduce((sum: number, inv: any) => {
        return sum + calculateInvoiceAmount(inv);
      }, 0) || 0;
      
      const overdueAmount = invoices?.filter((inv: any) => inv.status === 'overdue').reduce((sum: number, inv: any) => {
        return sum + calculateInvoiceAmount(inv);
      }, 0) || 0;
      
      const totalHours = services?.reduce((sum: number, service: any) => {
        const hours = Number(service.hours) || 0;
        return sum + hours;
      }, 0) || 0;
      
      const totalServiceAmount = services?.reduce((sum: number, service: any) => {
        const amount = Number(service.amount) || 0;
        return sum + amount;
      }, 0) || 0;
      
      const averageHourlyRate = totalHours > 0 ? totalServiceAmount / totalHours : 0;
      



      // Construire l'objet ClientDetail
      const clientDetail: ClientDetail = {
        id: client.id,
        name: client.name || client.company || 'Client sans nom',
        email: client.email || '',
        phone: client.phone || client.telephone || '',
        address: client.address || client.adresse || '',
        city: client.city,
        postalCode: client.postal_code,
        country: client.country,
        company: client.company,
        vatNumber: client.vat_number,
        status: client.status || 'active',
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        notes: client.notes,
        
        kpis: {
          totalRevenue,
          totalInvoices: invoices?.length || 0,
          paidAmount,
          pendingAmount,
          overdueAmount,
          firstInvoiceDate: invoices && invoices.length > 0 ? invoices[invoices.length - 1].date : undefined,
          lastPaymentDate: paidInvoices.length > 0 ? paidInvoices[0].paid_date : undefined,
          lastPaymentAmount: paidInvoices.length > 0 ? paidInvoices[0].amount : undefined,
          averageInvoiceAmount: invoices && invoices.length > 0 ? totalRevenue / invoices.length : 0,
          totalHours,
          averageHourlyRate
        },
        
        invoices: invoices?.map((invoice: any) => {
          // Essayer différents noms de colonnes pour la date de paiement
          let paidDate = invoice.paid_date || invoice.paidDate || invoice.payment_date || invoice.date_paid || invoice.paid_at || undefined;
          
          // Si pas de date de paiement mais statut "paid", utiliser la date de mise à jour
          if (!paidDate && invoice.status === 'paid') {
            paidDate = invoice.updated_at || invoice.created_at;
          }
          
          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number || invoice.number || 'N/A',
            number: invoice.invoice_number || invoice.number || 'N/A', // Pour compatibilité
            date: invoice.date || invoice.created_at || new Date().toISOString().split('T')[0],
            due_date: invoice.due_date || invoice.dueDate || new Date().toISOString().split('T')[0],
            dueDate: invoice.due_date || invoice.dueDate || new Date().toISOString().split('T')[0], // Pour compatibilité
            subtotal: invoice.subtotal || calculateInvoiceAmount(invoice),
            net_amount: invoice.net_amount || calculateInvoiceAmount(invoice),
            amount: calculateInvoiceAmount(invoice), // EXACTEMENT comme dans InvoicesPage.tsx
            status: invoice.status || 'draft',
            paidDate: paidDate,
            paidAmount: Number(invoice.paid_amount || invoice.paidAmount || 0) || 0,
            description: invoice.description || invoice.notes || '',
            services: invoice.services || [],
            client_id: invoice.client_id,
            payment_method: invoice.payment_method || '',
            paymentMethod: invoice.payment_method || '' // Pour compatibilité
          };
        }) || [],
        
        services: services?.map((service: any) => ({
          id: service.id,
          date: service.date || service.created_at || new Date().toISOString().split('T')[0],
          description: service.description || service.name || 'Service',
          hours: Number(service.hours || service.duration || 0) || 0,
          hourlyRate: Number(service.hourly_rate || service.rate || 0) || 0,
          amount: Number(service.amount || service.total_amount || 0) || 0,
          status: service.status || 'completed',
          invoiceId: service.invoice_id || service.invoiceId
        })) || [],
        
        paymentInfo: {
          preferredMethod: client.preferred_payment_method,
          lastPaymentDate: paidInvoices.length > 0 ? paidInvoices[0].paid_date : undefined,
          lastPaymentAmount: paidInvoices.length > 0 ? paidInvoices[0].amount : undefined,
          totalPayments: paidInvoices.length,
          averagePaymentTime: 5 // TODO: Calculer le délai moyen de paiement
        },
        
        pipeline: {
          draftInvoices: invoices?.filter((inv: any) => inv.status === 'draft').length || 0,
          pendingQuotes: 0, // TODO: Implémenter les devis
          plannedServices: services?.filter((s: any) => s.status === 'planned').length || 0,
          estimatedRevenue: services?.filter((s: any) => s.status === 'planned').reduce((sum: number, s: any) => sum + (s.amount || 0), 0) || 0
        },
        
        contactHistory: [] // Fonctionnalité non implémentée
      };
      
      setClient(clientDetail);
    } catch (error) {
      console.error('Erreur lors du chargement des détails du client:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'partial': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'prospect': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'sent': return <Mail className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'overdue': return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'draft': return <FileText className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'partial': return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'cancelled': return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      default: return <FileText className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return '€0,00';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date || date === 'N/A') {
      return '-';
    }
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '-';
      }
      return dateObj.toLocaleDateString('fr-FR');
    } catch (error) {
      return '-';
    }
  };

  // Fonction pour filtrer les factures
  const getFilteredInvoices = () => {
    if (!client) return [];
    
    // Filtrer les factures non archivées
    let filtered = client.invoices.filter(invoice => {
      const invoiceWithArchive = invoice as any;
      return !invoiceWithArchive.archived_at;
    });
    
    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (invoice.description && invoice.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }
    
    // Tri par date (plus récent en premier)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Client introuvable</h3>
        <p className="text-gray-500 dark:text-gray-400">Le client demandé n'existe pas ou a été supprimé.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* En-tête */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="group p-3 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              title="Retour à la liste des clients"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:-translate-x-0.5 transition-all duration-200" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {client.name}
              </h1>
              <p className="text-xs sm:text-sm sm:text-base text-gray-500 dark:text-gray-400">
                {client.company && `${client.company} • `}
                Client depuis {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleEditClient}
              className="group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:scale-110 transition-transform duration-200" />
              <span className="hidden sm:inline">Modifier</span>
              <span className="sm:hidden">Modif.</span>
            </button>
            <button
              onClick={() => onCreateInvoice(clientId)}
              className="group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform hover:scale-105"
              title={`Créer une nouvelle facture pour ${client?.name || 'ce client'}`}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:rotate-90 transition-transform duration-200" />
              <span className="hidden sm:inline">Nouvelle facture</span>
              <span className="sm:hidden">Facture</span>
            </button>
            <button
              onClick={handleCreateServiceLocal}
              className="group flex items-center px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-white bg-green-600 rounded-full hover:bg-green-700 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transform hover:scale-105"
              title={`Créer une nouvelle prestation pour ${client?.name || 'ce client'}`}
            >
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 group-hover:rotate-12 transition-transform duration-200" />
              <span className="hidden sm:inline">Nouvelle prestation</span>
              <span className="sm:hidden">Prestation</span>
            </button>
          </div>
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations générales
              </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Téléphone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Adresse</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {client.address}
                        {client.postalCode && `, ${client.postalCode}`}
                        {client.city && ` ${client.city}`}
                      </p>
                    </div>
                  </div>
                )}
                {client.company && (
                  <div className="flex items-center space-x-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Entreprise</p>
                      <p className="font-medium text-gray-900 dark:text-white">{client.company}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Statut */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statut</h3>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(client.status)}`}>
                  {client.status === 'active' ? 'Actif' : client.status === 'inactive' ? 'Inactif' : 'Prospect'}
                </span>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Chiffre d'affaires</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(client.kpis.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Factures</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {client.kpis.totalInvoices}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Payé</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(client.kpis.paidAmount)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(client.kpis.pendingAmount)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
          <nav className="-mb-px flex flex-wrap gap-2 sm:gap-8 overflow-x-auto">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
              { id: 'invoices', label: 'Factures', icon: FileText },
              { id: 'services', label: 'Prestations', icon: Clock },
              { id: 'payments', label: 'Paiements', icon: CreditCard },
              { id: 'notes', label: 'Notes', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1 sm:space-x-2 py-2 px-1 border-b-2 font-medium text-xs sm:text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Graphique des revenus */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Évolution des revenus
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Revenus mensuels des 6 derniers mois
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Revenus</span>
                  </div>
                </div>
              </div>
              
              {(() => {
                // Calculer les revenus des 6 derniers mois basés sur les SERVICES du client (comme dans Dashboard)
                const now = new Date();
                const monthlyRevenue = [];
                
                // Récupérer les services du client depuis le state global
                const clientServices = state.services.filter(service => service.client_id === client.id);
                
                for (let i = 5; i >= 0; i--) {
                  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                  
                  // Calculer le CA basé sur les services (heures * tarif horaire)
                  const monthRevenue = clientServices
                    .filter(service => {
                      const serviceDate = new Date(service.date);
                      return serviceDate >= monthStart && serviceDate <= monthEnd;
                    })
                    .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);
                  
                  monthlyRevenue.push({
                    month: date.toLocaleDateString('fr-FR', { month: 'short' }),
                    revenue: monthRevenue
                  });
                }
                
                const maxRevenue = Math.max(1, ...monthlyRevenue.map(m => m.revenue)); // Min 1 pour éviter division par 0
                const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
                const avgRevenue = totalRevenue / 6;
                const bestMonth = Math.max(...monthlyRevenue.map(m => m.revenue));
                
                return (
                  <div className="space-y-6">
                    {/* Statistiques rapides */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {totalRevenue.toFixed(0)}€
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Total 6 mois</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {avgRevenue.toFixed(0)}€
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Moyenne/mois</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {bestMonth.toFixed(0)}€
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Meilleur mois</div>
                      </div>
                    </div>
                    
                    {/* Graphique identique au Dashboard */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="h-40">
                        <div className="flex items-end justify-between gap-1 h-32 px-2">
                          {monthlyRevenue.map((month, index) => (
                            <div key={index} className="flex flex-col items-center group flex-1">
                              <div className="relative w-full flex flex-col items-center">
                                {/* Valeur au-dessus de la barre */}
                                <div className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                                  {month.revenue > 0 ? `${month.revenue.toFixed(0)}€` : ''}
                                </div>
                                {/* Barre avec gradient comme le Dashboard */}
                                <div
                                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 cursor-pointer group-hover:shadow-lg"
                                  style={{ height: `${Math.max(6, (month.revenue / maxRevenue) * 100)}px` }}
                                  title={`${month.month}: ${month.revenue.toFixed(2)}€`}
                                />
                              </div>
                              {/* Label du mois */}
                              <div className="mt-2 text-center">
                                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {month.month}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Ligne de base */}
                        <div className="border-t border-gray-300 dark:border-gray-600 mt-2 pt-1">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>0€</span>
                            <span className="text-center">Revenus mensuels (prestations)</span>
                            <span>{maxRevenue.toFixed(0)}€</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tendance */}
                    {monthlyRevenue.length >= 2 && (
                      <div className="flex items-center justify-center space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {(() => {
                          const lastMonth = monthlyRevenue[monthlyRevenue.length - 1].revenue;
                          const previousMonth = monthlyRevenue[monthlyRevenue.length - 2].revenue;
                          const trend = lastMonth - previousMonth;
                          const isPositive = trend >= 0;
                          
                          return (
                            <>
                              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                isPositive 
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                              }`}>
                                {isPositive ? (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7h-10" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                                  </svg>
                                )}
                                <span>
                                  {isPositive ? '+' : ''}{trend.toFixed(0)}€ ce mois
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Message informatif si pas de données */}
                    {totalRevenue === 0 && (
                      <div className="text-center py-4">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Aucune prestation enregistrée pour ce client sur les 6 derniers mois
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Dernières activités */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Dernières activités
              </h3>
              {(() => {
                // Récupérer les activités récentes du client
                const clientServices = services.filter(s => s.client_id === clientId);
                const clientInvoices = state.invoices.filter(i => i.client_id === clientId);
                
                // Combiner et trier par date
                const activities = [
                  ...clientServices.map(service => ({
                    type: 'service',
                    date: service.date,
                    title: `Prestation: ${service.description}`,
                    description: `${service.hours}h à ${service.hourly_rate}€/h`,
                    amount: service.hours * service.hourly_rate,
                    icon: Clock,
                    color: 'blue'
                  })),
                  ...clientInvoices.map(invoice => ({
                    type: 'invoice',
                    date: invoice.date,
                    title: `Facture ${invoice.invoice_number}`,
                    description: invoice.status === 'paid' ? 'Payée' : invoice.status === 'sent' ? 'Envoyée' : 'Brouillon',
                    amount: calculateInvoiceAmount(invoice),
                    icon: FileText,
                    color: invoice.status === 'paid' ? 'green' : invoice.status === 'sent' ? 'yellow' : 'gray'
                  }))
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

                if (activities.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                        Aucune activité récente à afficher
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div key={`${activity.type}-${activity.date}-${index}`} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className={`p-2 rounded-full ${
                          activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          activity.color === 'green' ? 'bg-green-100 text-green-600' :
                          activity.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          <activity.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.description} • {new Date(activity.date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {activity.amount.toFixed(2)}€
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Historique des factures
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {getFilteredInvoices().length} facture{getFilteredInvoices().length !== 1 ? 's' : ''} 
                    {searchTerm || statusFilter !== 'all' ? ' trouvée(s)' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-3 h-3 sm:w-4 sm:h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="paid">Payées</option>
                    <option value="sent">Envoyées</option>
                    <option value="overdue">En retard</option>
                    <option value="draft">Brouillons</option>
                    <option value="partial">Partielles</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Facture
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date émission
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant à payer
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Échéance
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date paiement
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getFilteredInvoices().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Aucune facture trouvée
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm || statusFilter !== 'all' 
                              ? 'Aucune facture ne correspond aux critères de recherche.'
                              : 'Ce client n\'a pas encore de factures.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    getFilteredInvoices().map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invoice.number || 'N/A'}
                        </div>
                        {invoice.description && (
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            {invoice.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(calculateInvoiceAmount(invoice))}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1">
                            {invoice.status === 'paid' ? 'Payée' : 
                             invoice.status === 'sent' ? 'Envoyée' : 
                             invoice.status === 'overdue' ? 'En retard' : 
                             invoice.status === 'draft' ? 'Brouillon' : 
                             invoice.status === 'partial' ? 'Partielle' : invoice.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                        {invoice.paidDate ? formatDate(invoice.paidDate) : '-'}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                        <div className="flex items-center justify-end space-x-0.5 sm:space-x-1">
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="p-1.5 sm:p-1.5 sm:p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewInvoiceLocal(invoice)}
                            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="Aperçu"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => handleSendEmailLocal(invoice)}
                              className="p-1.5 sm:p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                              title="Envoyer par email"
                            >
                              <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          {invoice.status === 'sent' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="p-1.5 sm:p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors"
                              title="Marquer comme payée"
                            >
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            className="p-1.5 sm:p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleArchiveInvoice(invoice)}
                            className="p-1.5 sm:p-2 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
                            title="Archiver la facture"
                          >
                            <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            disabled={deletingInvoice === invoice.id}
                            className={`p-1.5 sm:p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors ${deletingInvoice === invoice.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={deletingInvoice === invoice.id ? "Suppression en cours..." : "Supprimer"}
                          >
                            {deletingInvoice === invoice.id ? (
                              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
          </div>
        )}

        {activeTab === 'services' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Historique des prestations
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Heures
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarif/h
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {client.services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatDate(service.date)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm text-gray-900 dark:text-white">
                          {service.description}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                        {service.hours}h
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                        {formatCurrency(service.hourlyRate)}/h
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(service.amount)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.status === 'completed' ? 'text-green-600 bg-green-100' :
                          service.status === 'in_progress' ? 'text-blue-600 bg-blue-100' :
                          'text-yellow-600 bg-yellow-100'
                        }`}>
                          {service.status === 'completed' ? 'Terminé' :
                           service.status === 'in_progress' ? 'En cours' : 'Planifié'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations de paiement
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Mode de paiement préféré</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.preferredMethod === 'bank_transfer' ? 'Virement' :
                     client.paymentInfo.preferredMethod === 'paypal' ? 'PayPal' :
                     client.paymentInfo.preferredMethod === 'check' ? 'Chèque' :
                     client.paymentInfo.preferredMethod === 'cash' ? 'Espèces' :
                     client.paymentInfo.preferredMethod === 'card' ? 'Carte' : 'Non défini'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Dernier paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.lastPaymentDate ? formatDate(client.paymentInfo.lastPaymentDate) : 'Aucun'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Montant du dernier paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.lastPaymentAmount ? formatCurrency(client.paymentInfo.lastPaymentAmount) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Nombre total de paiements</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.totalPayments}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Délai moyen de paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.averagePaymentTime} jours
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Pipeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Factures brouillons</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.draftInvoices}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Devis en attente</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.pendingQuotes}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Prestations planifiées</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.plannedServices}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Revenus estimés</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(client.pipeline.estimatedRevenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Formulaire d'ajout de note */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ajouter une note
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingNote(!isAddingNote)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-full shadow-sm hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle note</span>
                </button>
              </div>
              
              {isAddingNote && (
                <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type de note
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { value: 'general', label: 'Générale', icon: '📝', activeColor: 'bg-slate-500', textColor: 'text-white' },
                        { value: 'call', label: 'Appel', icon: '📞', activeColor: 'bg-emerald-500', textColor: 'text-white' },
                        { value: 'email', label: 'Email', icon: '📧', activeColor: 'bg-cyan-500', textColor: 'text-white' },
                        { value: 'meeting', label: 'Rendez-vous', icon: '🤝', activeColor: 'bg-violet-500', textColor: 'text-white' }
                      ].map((type) => (
                        <button
                          type="button"
                          key={type.value}
                          onClick={() => setNoteType(type.value as 'general' | 'call' | 'email' | 'meeting')}
                          className={`inline-flex items-center space-x-2 px-4 py-1.5 text-sm font-medium rounded-full border-2 transition-all duration-200 hover:scale-105 ${
                            noteType === type.value
                              ? `${type.activeColor} ${type.textColor} border-transparent shadow-lg`
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span className="text-lg">{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contenu de la note
                    </label>
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Saisissez votre note..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={!newNote.trim() || notesLoading}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-full shadow-sm hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                    >
                      {notesLoading ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Ajout...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Ajouter
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNote(false);
                        setNewNote('');
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Liste des notes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Historique des notes
                </h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {notes.length} note{notes.length > 1 ? 's' : ''}
                </span>
              </div>
              
              {notesLoading ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Chargement des notes...
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Récupération des notes depuis la base de données.
                  </p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Aucune note
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Commencez par ajouter une note pour ce client.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="group relative bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              note.type === 'general' ? 'bg-gray-100 text-gray-800' :
                              note.type === 'call' ? 'bg-green-100 text-green-800' :
                              note.type === 'email' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {note.type === 'general' && '📝 Générale'}
                              {note.type === 'call' && '📞 Appel'}
                              {note.type === 'email' && '📧 Email'}
                              {note.type === 'meeting' && '🤝 Rendez-vous'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {new Date(note.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xs sm:max-w-lg lg:max-w-2xl xl:max-w-4xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 transform transition-all">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white relative overflow-hidden">
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
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">Aperçu de la facture</h3>
                    <p className="text-white/80 text-xs sm:text-xs sm:text-sm truncate">
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
                        {previewInvoice.net_amount?.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1 sm:space-x-2">
                  <button
                    onClick={() => openInvoicePrintWindow(previewInvoice, state.clients, state.services)}
                    className="px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 flex items-center space-x-1 sm:space-x-2 font-medium hover:scale-105 hover:shadow-lg text-xs sm:text-sm"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="hidden sm:inline">Télécharger PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
                    onClick={() => setPreviewInvoice(null)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:scale-110"
                    title="Fermer"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        let settings: any = null;
                        try {
                          const raw = localStorage.getItem('business-settings');
                          settings = raw ? JSON.parse(raw) : null;
                        } catch {}
                        
                        return settings?.logoUrl ? (
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                            <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                          </div>
                        ) : null;
                      })()}
                      <div>
                        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                          {settings?.companyName || 'ProFlow'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-xs sm:text-sm sm:text-lg">
                          {settings?.ownerName || 'Votre flux professionnel simplifié'}
                        </p>
                        <div className="mt-3 text-xs sm:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                          <div>
                            {settings?.address && <div>{settings.address}</div>}
                            {settings?.email && <div>{settings.email}</div>}
                            {settings?.phone && <div>{settings.phone}</div>}
                            {settings?.siret && <div>SIRET: {settings.siret}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h2 className="text-lg sm:text-2xl font-bold">FACTURE</h2>
                        <p className="text-blue-100 font-semibold text-xs sm:text-sm sm:text-base">N° {previewInvoice.invoice_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8 sm:mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h3 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100 mb-4 sm:mb-6 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          Facturé à
                        </h3>
                        <div className="text-gray-900 dark:text-white space-y-2">
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            {client?.name || 'Client inconnu'}
                          </p>
                          <p className="text-xs sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">{client?.email || ''}</p>
                          <p className="text-xs sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">{client?.phone || ''}</p>
                          <p className="text-xs sm:text-sm sm:text-base text-gray-700 dark:text-gray-300">{client?.address || ''}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h3 className="text-lg sm:text-xl font-bold text-green-900 dark:text-green-100 mb-4 sm:mb-6 flex items-center">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${
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
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Prestations
                    </h3>
                  {(() => {
                    // Get services for this invoice - try from invoice.services first, then from global services
                    // Utiliser les services stockés dans la facture si disponibles
                    let invoiceServices = previewInvoice.services || [];
                    
                    console.log('🔍 Dans l\'aperçu - previewInvoice:', previewInvoice);
                    console.log('🔍 Dans l\'aperçu - invoiceServices:', invoiceServices);
                    console.log('🔍 Dans l\'aperçu - nombre de services:', invoiceServices.length);
                    
                    // Si pas de services stockés dans la facture, ne pas afficher tous les services du client
                    // car cela fausse l'aperçu. L'aperçu doit montrer seulement les services de cette facture.
                    if (invoiceServices.length === 0) {
                      console.log('⚠️ Aucun service stocké dans la facture pour l\'aperçu');
                      // Ne pas utiliser tous les services du client pour l'aperçu
                      // car cela afficherait toutes les prestations au lieu de celles de la facture
                    }
                    
                    return (
                      <div className="overflow-x-auto rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800">
                        <table className="min-w-full border-0 rounded-xl sm:rounded-2xl overflow-hidden">
                          <thead className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                            <tr>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 first:rounded-tl-xl sm:first:rounded-tl-2xl last:rounded-tr-xl sm:last:rounded-tr-2xl">Description</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Heures</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Tarif/h</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 last:rounded-tr-xl sm:last:rounded-tr-2xl">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-600">
                            {invoiceServices.length > 0 ? (
                              invoiceServices.map((service: any, index: number) => (
                                <tr key={service.id || index} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${index === invoiceServices.length - 1 ? 'last:rounded-b-xl sm:last:rounded-b-2xl' : ''}`}>
                                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-xs sm:text-sm text-gray-900 dark:text-white font-medium ${index === invoiceServices.length - 1 ? 'first:rounded-bl-xl sm:first:rounded-bl-2xl' : ''}`}>{service.description || 'N/A'}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-xs sm:text-sm text-gray-700 dark:text-gray-300">{new Date(service.date).toLocaleDateString('fr-FR')}</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-xs sm:text-sm text-gray-700 dark:text-gray-300">{service.hours}h</td>
                                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-xs sm:text-sm text-gray-700 dark:text-gray-300">{service.hourly_rate}€</td>
                                  <td className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-xs sm:text-sm text-gray-900 dark:text-white font-bold ${index === invoiceServices.length - 1 ? 'last:rounded-br-xl sm:last:rounded-br-2xl' : ''}`}>{(service.hours * service.hourly_rate).toFixed(2)}€</td>
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
                                    <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-1">Les prestations seront affichées ici une fois ajoutées</p>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-96">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          Récapitulatif
                        </h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 sm:py-3 border-b border-blue-200 dark:border-blue-700">
                              <span className="text-xs sm:text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">Sous-total :</span>
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
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Envoyer la facture</h3>
                    <p className="text-white/80 text-xs sm:text-sm">
                      Facture N° {emailModal.invoice_number} • {new Date(emailModal.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModal(null)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                    Message personnalisé
                  </label>
                  <textarea
                    value={emailData.message}
                    onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                    placeholder="Bonjour, veuillez trouver ci-joint votre facture..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {sendingEmail ? (
                      <>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Service Creation Modal */}
      {showServiceModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-4 sm:p-6 text-white relative overflow-hidden">
              {/* Decorative lines */}
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
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      {editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-xs sm:text-sm truncate">
                      {editingService ? 'Mettre à jour les informations' : `Enregistrer une nouvelle prestation pour ${client?.name}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetServiceForm}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition-colors flex-shrink-0 ml-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable content area */}
            <div className="overflow-y-auto scrollbar-hide max-h-[calc(95vh-120px)]">
              <form onSubmit={handleServiceSubmit} className="p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="lg:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client *
                    </label>
                    <select
                      required
                      value={serviceFormData.client_id}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, client_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={serviceFormData.date}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Heures *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={serviceFormData.hours}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, hours: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tarif/h (€) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={serviceFormData.hourly_rate}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, hourly_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Statut
                    </label>
                    <select
                      value={serviceFormData.status}
                      onChange={(e) => setServiceFormData({ ...serviceFormData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="pending">En attente</option>
                      <option value="completed">Terminée</option>
                      <option value="invoiced">Facturée</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={serviceFormData.description}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Détails de la prestation..."
                  />
                </div>
                  
                {/* Preview calculation */}
                {serviceFormData.hours > 0 && serviceFormData.hourly_rate > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                      <span>Montant total:</span>
                      <span>
                        {calculateServiceAmount(serviceFormData.hours, serviceFormData.hourly_rate).toFixed(2)}€
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetServiceForm}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white rounded-full border border-green-500 dark:border-green-600 shadow-md hover:shadow-lg transition-all text-xs sm:text-sm font-medium"
                  >
                    {editingService ? 'Modifier' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Edit Modal */}
      {showInvoiceEditModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
                <div className="absolute top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
                <div className="absolute top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
                <div className="absolute bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
                <div className="absolute bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
              </div>
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      Modifier la facture
                    </h3>
                    <p className="text-white/80 text-xs sm:text-xs sm:text-sm hidden sm:block">
                      Mettez à jour les informations de la facture
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetInvoiceForm}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  title="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
              <form onSubmit={handleInvoiceSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                {/* Client and Invoice Number Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        N° Facture
                      </label>
                      <input
                        type="text"
                        value={invoiceFormData.invoice_number}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, invoice_number: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Mode de paiement
                      </label>
                      <select
                        value={invoiceFormData.payment_method}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, payment_method: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Sélectionner un mode de paiement</option>
                        <option value="Virement bancaire">Virement bancaire</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Espèces">Espèces</option>
                        <option value="Carte bancaire">Carte bancaire</option>
                        <option value="PayPal">PayPal</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dates Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
                    </div>
                    Dates
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Date de facture *
                      </label>
                      <input
                        type="date"
                        required
                        value={invoiceFormData.date}
                        onChange={(e) => {
                          const newDate = e.target.value;
                          setInvoiceFormData({ 
                            ...invoiceFormData, 
                            date: newDate,
                            due_date: newDate ? calculateDueDate(newDate) : ''
                          });
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Date d'échéance *
                      </label>
                      <input
                        type="date"
                        required
                        value={invoiceFormData.due_date}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, due_date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Services selection */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Prestations à facturer *
                  </h4>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 max-h-80 overflow-y-auto">
                    {services.filter(s => s.client_id === clientId).length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune prestation disponible pour ce client.</p>
                        <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm mt-1">Créez d'abord des prestations pour ce client.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-600">
                        {services.filter(s => s.client_id === clientId).map((service) => (
                          <label key={service.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedServicesForInvoice.includes(service.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServicesForInvoice([...selectedServicesForInvoice, service.id]);
                                } else {
                                  setSelectedServicesForInvoice(selectedServicesForInvoice.filter(id => id !== service.id));
                                }
                              }}
                              className="w-5 h-5 rounded-full border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                                    {new Date(service.date).toLocaleDateString('fr-FR')}
                                  </span>
                                  {service.description && (
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                                    {((Number(service.hours) || 0) * (Number(service.hourly_rate) || 0)).toFixed(2)}€
                                  </span>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {service.hours}h × {service.hourly_rate}€
                                  </p>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Total preview */}
                {selectedServicesForInvoice.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Récapitulatif
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-3 bg-white dark:bg-gray-800 rounded-lg px-4 border-t-2 border-blue-200 dark:border-blue-600">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(() => {
                            const selectedServices = services.filter(s => selectedServicesForInvoice.includes(s.id));
                            console.log('Services sélectionnés pour le calcul:', selectedServices);
                            const total = selectedServices.reduce((acc, s) => {
                              const hours = Number(s.hours) || 0;
                              const rate = Number(s.hourly_rate) || 0;
                              console.log(`Service ${s.id}: ${hours}h × ${rate}€ = ${hours * rate}€`);
                              return acc + (hours * rate);
                            }, 0);
                            console.log('Total calculé:', total);
                            return total.toFixed(2);
                          })()}€
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Footer with buttons */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 sm:px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                <button
                  type="button"
                  onClick={resetInvoiceForm}
                  className="flex-1 px-4 sm:px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium text-xs sm:text-sm sm:text-base"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={handleInvoiceSubmit}
                  className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white rounded-full border border-blue-500 dark:border-blue-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-xs sm:text-sm sm:text-base"
                >
                  Mettre à jour la facture
                </button>
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
