import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Send, Download, Eye, Edit2, CheckCircle, Circle, Trash, X, Archive } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { openInvoicePrintWindow } from '../lib/print';
import { sendInvoiceEmail, EmailData } from '../lib/emailService';
import { createInvoice, updateInvoice as updateInvoiceApi, deleteInvoice as deleteInvoiceApi } from '../lib/api';
import { Invoice } from '../types';
import AlertModal from './AlertModal';
import { supabase } from '../lib/supabase';
import { useSettings } from '../hooks/useSettings';

export default function InvoicesPage() {
  const { state, dispatch, showNotification } = useApp();
  const { invoices, clients, services } = state;
  const settings = useSettings();

  // Fonction utilitaire pour calculer le montant d'une facture à partir de ses prestations
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
  }, [clients]);
  
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: '',
    date: '',
    due_date: '',
    payment_method: '',
  });

  // Get available services for invoicing (completed but not invoiced)
  const availableServices = services.filter(s => s.status === 'completed');
  
  // When editing a draft, also allow keeping currently linked services
  const selectableServices = editingInvoice
    ? (() => {
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
      })()
    : availableServices;

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const count = invoices.length + 1;
    return `FAC-${year}${month}-${String(count).padStart(3, '0')}`;
  };

  // Fonction utilitaire pour calculer la date d'échéance
  const calculateDueDate = (invoiceDate: string): string => {
    let paymentTerms = 30; // valeur par défaut
    if (settings && settings.paymentTerms) {
      paymentTerms = settings.paymentTerms;
    }
    
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    const invoiceServices = selectableServices.filter(s => selectedServices.includes(s.id));
    
    const totalAmount = invoiceServices.reduce((acc, service) => 
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
        } as any);
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
        } as any);
        dispatch({ type: 'ADD_INVOICE', payload: { ...saved, client, services: invoiceServices } as Invoice });
        // Mark services as invoiced for new invoice
        invoiceServices.forEach(service => {
          dispatch({ 
            type: 'UPDATE_SERVICE', 
            payload: { ...service, status: 'invoiced', updated_at: new Date().toISOString() }
          });
        });
        showNotification('success', 'Facture créée', 'La facture a été créée avec succès');
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      // eslint-disable-next-line no-alert
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
      } catch (err) {
        // eslint-disable-next-line no-alert
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
            invoice.services.forEach(service => {
              dispatch({
                type: 'UPDATE_SERVICE',
                payload: { ...service, status: 'completed', updated_at: new Date().toISOString() }
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
    const allSelected = activeInvoices.every(invoice => selectedInvoices.has(invoice.id));
    if (allSelected) {
      // Désélectionner toutes les factures
      activeInvoices.forEach(invoice => {
        if (selectedInvoices.has(invoice.id)) {
          toggleInvoiceSelection(invoice.id);
        }
      });
    } else {
      // Sélectionner toutes les factures
      activeInvoices.forEach(invoice => {
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
              invoice.services.forEach(service => {
                dispatch({
                  type: 'UPDATE_SERVICE',
                  payload: { ...service, status: 'completed', updated_at: new Date().toISOString() }
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

  // Filtrer les factures non archivées pour l'affichage
  const activeInvoices = invoices.filter(invoice => !(invoice as any).archived_at);
  
  const totalHT = activeInvoices.reduce((acc, inv) => acc + calculateInvoiceAmount(inv), 0);
  const totalPayees = activeInvoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + calculateInvoiceAmount(inv), 0);
  const totalEnvoyees = activeInvoices.filter(i => i.status === 'sent').length;

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
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">Factures</h1>
            <p className="text-sm sm:text-base text-white/80 mt-1">Émission et suivi de vos factures clients</p>
          </div>
          <div className="mt-4 sm:mt-0 flex justify-center sm:justify-end">
            <button
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
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nouvelle facture</span>
              <span className="sm:hidden">Nouvelle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full">
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
                onClick={handleBulkDelete}
                disabled={selectedInvoices.size === 0}
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

      {/* Bouton pour activer le mode sélection */}
      {!isSelectionMode && invoices.length > 0 && (
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

      {/* Invoices table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Vue mobile - Cards */}
        <div className="block sm:hidden">
          {activeInvoices.length === 0 ? (
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
              {isSelectionMode && activeInvoices.length > 0 && (
                <div className="flex justify-center p-4 border-b border-gray-200 dark:border-gray-600">
                  <button
                    onClick={toggleAllInvoicesSelection}
                    className="inline-flex items-center px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-700 transition-colors text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {activeInvoices.every(invoice => selectedInvoices.has(invoice.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
              
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {activeInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {isSelectionMode && (
                        <button
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
                        onClick={() => setPreviewInvoice(invoice)}
                        className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => openEdit(invoice)}
                          className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => setEmailModal(invoice)}
                          className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Envoyer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Marquer payée"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openInvoicePrintWindow(invoice, clients, services)}
                        className="p-2 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                        title="PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(invoice.id)}
                        className="p-2 rounded-full text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        title="Archiver"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
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

        {/* Vue desktop - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {isSelectionMode && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <button
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
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  N° Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant à payer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date d'échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date de paiement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {activeInvoices.length === 0 ? (
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
                activeInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  {isSelectionMode && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleInvoiceSelection(invoice.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {selectedInvoices.has(invoice.id) ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {invoice.client?.name || clients.find(c => c.id === invoice.client_id)?.name || 'Client inconnu'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(invoice.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {calculateInvoiceAmount(invoice).toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {invoice.status === 'paid' && (invoice as any).updated_at 
                      ? new Date((invoice as any).updated_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => openEdit(invoice)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setPreviewInvoice(invoice)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Aperçu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => setEmailModal(invoice)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:text-blue-100"
                          title="Envoyer par email"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {invoice.status === 'sent' && (
                        <button
                          onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:text-green-100"
                          title="Marquer comme payée"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          openInvoicePrintWindow(invoice, clients, services);
                        }}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(invoice.id)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Archiver"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 text-white relative overflow-hidden">
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
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold truncate">
                      {editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
                      {preselectedClient && !editingInvoice && (
                        <span className="text-sm font-normal text-white/80 ml-2">
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
                  onClick={resetForm}
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
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Client *
                      </label>
                      <select
                        required
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        N° Facture
                      </label>
                      <input
                        type="text"
                        value={formData.invoice_number}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        placeholder={generateInvoiceNumber()}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              
                {/* Dates and Payment Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Dates et paiement
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
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
                            // Calculer la date d'échéance
                            const dueDateString = calculateDueDate(newDate);
                            
                            // Mettre à jour la date d'échéance seulement si elle n'a pas été modifiée manuellement
                            setFormData(prev => ({ ...prev, date: newDate, due_date: dueDateString }));
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Sélectionnez d'abord une date de facture"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Mode de paiement
                      </label>
                      <select
                        value={formData.payment_method || ''}
                        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
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
              
                {/* Services selection */}
                {(formData.client_id || editingInvoice) && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Prestations à facturer *
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 max-h-80 overflow-y-auto">
                      {selectableServices.filter(s => s.client_id === formData.client_id).length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune prestation terminée disponible pour ce client.</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Terminez d'abord des prestations pour ce client.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-600">
                          {selectableServices.filter(s => s.client_id === formData.client_id).map((service) => (
                            <label key={service.id} className="flex items-center space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
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
                                className="w-5 h-5 rounded-full border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 focus:ring-2"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {new Date(service.date).toLocaleDateString('fr-FR')}
                                    </span>
                                    {service.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        {service.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                      {(service.hours * service.hourly_rate).toFixed(2)}€
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
                  className="flex-1 px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white rounded-full border border-blue-500 dark:border-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-sm sm:text-base"
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
                    onClick={() => openInvoicePrintWindow(previewInvoice, clients, services)}
                    className="px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 flex items-center space-x-1 sm:space-x-2 font-medium hover:scale-105 hover:shadow-lg text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Télécharger PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
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
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-lg">
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
                        <p className="text-blue-100 font-semibold text-sm sm:text-base">N° {previewInvoice.invoice_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8 sm:mb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
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
                    let invoiceServices = previewInvoice.services || [];
                    
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
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 first:rounded-tl-xl sm:first:rounded-tl-2xl last:rounded-tr-xl sm:last:rounded-tr-2xl">Description</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Date</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Heures</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Tarif/h</th>
                              <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 last:rounded-tr-xl sm:last:rounded-tr-2xl">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-600">
                            {invoiceServices.length > 0 ? (
                              invoiceServices.map((service, index) => (
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
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-6 text-white rounded-t-2xl relative overflow-hidden">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-800 dark:hover:to-pink-800 text-white rounded-xl border border-purple-500 dark:border-purple-600 shadow-md hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
