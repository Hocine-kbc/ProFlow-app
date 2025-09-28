import React, { useState } from 'react';
import { Plus, Trash2, FileText, Send, Download, Eye, Edit2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { openInvoicePrintWindow } from '../lib/print';
import { sendInvoiceEmail, EmailData } from '../lib/emailService';
import { createInvoice, updateInvoice as updateInvoiceApi, deleteInvoice as deleteInvoiceApi } from '../lib/api';
import { Invoice } from '../types';
import AlertModal from './AlertModal';
import Notification from './Notification';

export default function InvoicesPage() {
  const { state, dispatch } = useApp();
  const { invoices, clients, services } = state;
  
  // Debug: Log the current state
  console.log('InvoicesPage - Current state:', { 
    invoicesCount: invoices.length, 
    clientsCount: clients.length, 
    servicesCount: services.length,
    invoices: invoices 
  });

  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [emailModal, setEmailModal] = useState<Invoice | null>(null);
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
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    message: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const client = clients.find(c => c.id === formData.client_id);
    const invoiceServices = selectableServices.filter(s => selectedServices.includes(s.id));
    
    const subtotal = invoiceServices.reduce((acc, service) => 
      acc + (service.hours * service.hourly_rate), 0
    );
    const urssafDeduction = subtotal * 0.22;
    const netAmount = subtotal - urssafDeduction;
    
    try {
      if (editingInvoice) {
        // Update only columns that exist on invoices table (exclude services array)
        const saved = await updateInvoiceApi(editingInvoice.id, {
          client_id: formData.client_id,
          invoice_number: formData.invoice_number,
          date: formData.date,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          subtotal,
          urssaf_deduction: urssafDeduction,
          net_amount: netAmount,
          status: 'draft',
        } as any);
        dispatch({ type: 'UPDATE_INVOICE', payload: { ...editingInvoice, ...saved, client, services: invoiceServices } as Invoice });
      } else {
        const saved = await createInvoice({
          client_id: formData.client_id,
          services: invoiceServices,
          invoice_number: formData.invoice_number || generateInvoiceNumber(),
          date: formData.date,
          due_date: formData.due_date,
          payment_method: formData.payment_method,
          subtotal,
          urssaf_deduction: urssafDeduction,
          net_amount: netAmount,
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
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      // eslint-disable-next-line no-alert
      alert(editingInvoice ? 'Erreur lors de la modification de la facture' : 'Erreur lors de la création de la facture');
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
    
    // Debug: Log the services data
    console.log('Edit invoice services:', {
      invoiceServices: invoiceServices,
      servicesCount: invoiceServices.length,
      allServices: services,
      invoiceClientId: inv.client_id
    });
    
    // If no services in invoice, try to find them from global services
    if (invoiceServices.length === 0 && services.length > 0) {
      console.log('No services found in invoice, trying to find from global services...');
      
      // Find services that are marked as 'invoiced' and belong to the same client
      const clientServices = services.filter(s => 
        s.client_id === inv.client_id && s.status === 'invoiced'
      );
      
      if (clientServices.length > 0) {
        console.log('Found invoiced services for this client:', clientServices);
        invoiceServices = clientServices;
      } else {
        // If no invoiced services found, try to find completed services for this client
        const completedServices = services.filter(s => 
          s.client_id === inv.client_id && s.status === 'completed'
        );
        
        if (completedServices.length > 0) {
          console.log('Found completed services for this client (fallback):', completedServices);
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
        alert("Erreur lors de la mise à jour de la facture");
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
          
          setNotification({
            isOpen: true,
            title: 'Facture supprimée',
            message: 'La facture a été supprimée avec succès.',
            type: 'success'
          });
        } catch (err) {
          console.error('Error deleting invoice:', err);
          setNotification({
            isOpen: true,
            title: 'Erreur',
            message: 'Une erreur est survenue lors de la suppression de la facture.',
            type: 'error'
          });
        } finally {
          setDeletingInvoice(null);
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
      let settings: any = null;
      try {
        const raw = localStorage.getItem('business-settings');
        settings = raw ? JSON.parse(raw) : null;
      } catch {}

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
        invoice_amount: emailModal.net_amount.toFixed(2),
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

        setNotification({
          isOpen: true,
          title: 'Email envoyé',
          message: 'La facture a été envoyée avec succès !',
          type: 'success'
        });
        setEmailModal(null);
        setEmailData({ to: '', subject: '', message: '' });
      } else {
        setNotification({
          isOpen: true,
          title: 'Erreur d\'envoi',
          message: 'Erreur lors de l\'envoi de l\'email. Vérifiez que le backend est démarré.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error sending email:', error);
      setNotification({
        isOpen: true,
        title: 'Erreur d\'envoi',
        message: 'Une erreur est survenue lors de l\'envoi de l\'email.',
        type: 'error'
      });
    } finally {
      setSendingEmail(false);
    }
  };


  // kept via selectableServices in edit/new flows

  // Simple monthly totals (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, i) => new Date(now.getFullYear(), now.getMonth() - (5 - i), 1));
  const monthlyTotals = months.map((m) => {
    const total = invoices
      .filter(inv => {
        const d = new Date(inv.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      })
      .reduce((acc, inv) => acc + inv.subtotal, 0);
    return { label: m.toLocaleDateString('fr-FR', { month: 'short' }), total };
  });

  const totalHT = invoices.reduce((acc, inv) => acc + inv.subtotal, 0);
  const totalPayees = invoices.filter(i => i.status === 'paid').reduce((acc, inv) => acc + inv.subtotal, 0);
  const totalEnvoyees = invoices.filter(i => i.status === 'sent').length;
  const maxBar = Math.max(1, ...monthlyTotals.map(m => m.total));

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
            <h1 className="text-2xl font-bold">Factures</h1>
            <p className="text-white/80 mt-1">Émission et suivi de vos factures clients</p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur transition-colors border border-white/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
          <div className="text-xs text-gray-500 dark:text-gray-300">Total HT</div>
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

      {/* Mini chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">CA mensuel (6 derniers mois)</h3>
        <div className="flex items-end gap-3 h-24">
          {monthlyTotals.map((m, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div
                className="w-full rounded-t bg-gradient-to-t from-blue-500 to-indigo-500"
                style={{ height: `${(m.total / maxBar) * 100}%` }}
                title={`${m.total.toFixed(2)}€`}
              />
              <span className="mt-1 text-xs text-gray-600">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
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
                  Montant HT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Montant Net
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
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">Aucune facture trouvée</p>
                      <p className="text-sm">Créez votre première facture en cliquant sur le bouton "Nouvelle facture"</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                    {invoice.subtotal.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 dark:text-green-400 font-medium">
                    {invoice.net_amount.toFixed(2)}€
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
                          console.log('Printing invoice:', invoice);
                          console.log('Available clients:', clients);
                          console.log('Available services:', services);
                          openInvoicePrintWindow(invoice, clients, services);
                        }}
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-900"
                        title="Télécharger PDF"
                      >
                        <Download className="w-4 h-4" />
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
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}</h3>
                    <p className="text-white/80 text-sm">
                      {editingInvoice ? 'Mettez à jour les informations de la facture' : 'Créez une nouvelle facture pour votre client'}
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
              <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Client and Invoice Number Section */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Informations générales
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      Récapitulatif
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-700 font-medium">Sous-total HT:</span>
                        <span className="text-lg font-bold text-gray-900">
                          {services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0)
                            .toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 text-red-600">
                        <span className="font-medium">Déduction URSSAF (22%):</span>
                        <span className="text-lg font-bold">
                          -{(services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0) * 0.22)
                            .toFixed(2)}€
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-white rounded-lg px-4 border-t-2 border-blue-200">
                        <span className="text-lg font-bold text-gray-900">Total net:</span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {(services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((acc, s) => acc + (s.hours * s.hourly_rate), 0) * 0.78)
                            .toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* Footer with buttons */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={selectedServices.length === 0}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 text-white rounded-xl border border-blue-500 dark:border-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  {editingInvoice ? 'Mettre à jour la facture' : 'Créer la facture'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Aperçu de la facture</h3>
                    <p className="text-white/80 text-sm">
                      Facture N° {previewInvoice.invoice_number} • {new Date(previewInvoice.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => openInvoicePrintWindow(previewInvoice, clients, services)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex items-center space-x-2 font-medium"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger PDF</span>
                  </button>
                  <button
                    onClick={() => setPreviewInvoice(null)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    title="Fermer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
              <div className="p-6">
                {/* Invoice Content */}
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-2xl p-8 max-w-5xl mx-auto shadow-lg">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        {(() => {
                          // Get business settings from localStorage
                          let settings: any = null;
                          try {
                            const raw = localStorage.getItem('business-settings');
                            settings = raw ? JSON.parse(raw) : null;
                          } catch {}
                          
                          return settings?.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                          ) : (
                            <img src="/ProFlowlogo.png" alt="Logo" className="w-8 h-8" />
                          );
                        })()}
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                          {(() => {
                            let settings: any = null;
                            try {
                              const raw = localStorage.getItem('business-settings');
                              settings = raw ? JSON.parse(raw) : null;
                            } catch {}
                            return settings?.companyName || 'ProFlow';
                          })()}
                        </h1>
                        <p className="text-gray-600 font-medium">
                          {(() => {
                            let settings: any = null;
                            try {
                              const raw = localStorage.getItem('business-settings');
                              settings = raw ? JSON.parse(raw) : null;
                            } catch {}
                            return settings?.ownerName || 'Votre flux professionnel simplifié';
                          })()}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                          {(() => {
                            let settings: any = null;
                            try {
                              const raw = localStorage.getItem('business-settings');
                              settings = raw ? JSON.parse(raw) : null;
                            } catch {}
                            return (
                              <div>
                                {settings?.address && <div>{settings.address}</div>}
                                {settings?.email && <div>{settings.email}</div>}
                                {settings?.phone && <div>{settings.phone}</div>}
                                {settings?.siret && <div>SIRET: {settings.siret}</div>}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl">
                        <h2 className="text-2xl font-bold">FACTURE</h2>
                        <p className="text-blue-100 font-semibold">N° {previewInvoice.invoice_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          Facturé à
                        </h3>
                        <div className="text-gray-900 space-y-2">
                          <p className="text-lg font-bold text-gray-900">
                            {previewInvoice.client?.name || clients.find(c => c.id === previewInvoice.client_id)?.name || 'Client inconnu'}
                          </p>
                          <p className="text-gray-700">{previewInvoice.client?.email || clients.find(c => c.id === previewInvoice.client_id)?.email || ''}</p>
                          <p className="text-gray-700">{previewInvoice.client?.phone || clients.find(c => c.id === previewInvoice.client_id)?.phone || ''}</p>
                          <p className="text-gray-700">{previewInvoice.client?.address || clients.find(c => c.id === previewInvoice.client_id)?.address || ''}</p>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4 flex items-center">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          Détails de la facture
                        </h3>
                        <div className="text-gray-900 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Date :</span>
                            <span className="font-semibold">{new Date(previewInvoice.date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700">Échéance :</span>
                            <span className="font-semibold">{new Date(previewInvoice.due_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {previewInvoice.payment_method && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-700">Mode de paiement :</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">{previewInvoice.payment_method}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-green-200">
                            <span className="font-medium text-gray-700">Statut :</span>
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
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Prestations
                    </h3>
                  {(() => {
                    // Get services for this invoice - try from invoice.services first, then from global services
                    let invoiceServices = previewInvoice.services || [];
                    
                    // Debug: Log the services data
                    console.log('Preview invoice services:', {
                      invoiceServices: invoiceServices,
                      servicesCount: invoiceServices.length,
                      allServices: services,
                      invoiceClientId: previewInvoice.client_id
                    });
                    
                    // If no services in invoice, try to find them from global services
                    if (invoiceServices.length === 0 && services.length > 0) {
                      console.log('No services found in invoice, trying to find from global services...');
                      
                      // Find services that are marked as 'invoiced' and belong to the same client
                      const clientServices = services.filter(s => 
                        s.client_id === previewInvoice.client_id && s.status === 'invoiced'
                      );
                      
                      if (clientServices.length > 0) {
                        console.log('Found invoiced services for this client:', clientServices);
                        invoiceServices = clientServices;
                      } else {
                        // If no invoiced services found, try to find completed services for this client
                        const completedServices = services.filter(s => 
                          s.client_id === previewInvoice.client_id && s.status === 'completed'
                        );
                        
                        if (completedServices.length > 0) {
                          console.log('Found completed services for this client (fallback):', completedServices);
                          invoiceServices = completedServices;
                        }
                      }
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Description</th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Heures</th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tarif/h</th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-600">
                            {invoiceServices.length > 0 ? (
                              invoiceServices.map((service, index) => (
                                <tr key={service.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{service.description || 'N/A'}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{new Date(service.date).toLocaleDateString('fr-FR')}</td>
                                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{service.hours}h</td>
                                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{service.hourly_rate}€</td>
                                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-bold">{(service.hours * service.hourly_rate).toFixed(2)}€</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
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
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                        <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          Récapitulatif
                        </h4>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-3 border-b border-blue-200">
                            <span className="text-gray-700 font-medium">Sous-total HT :</span>
                            <span className="text-lg font-bold text-gray-900">{previewInvoice.subtotal.toFixed(2)}€</span>
                          </div>
                          <div className="flex justify-between items-center py-4 bg-white rounded-lg px-4 border-2 border-blue-200">
                            <span className="text-xl font-bold text-gray-900">Total à payer :</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{previewInvoice.subtotal.toFixed(2)}€</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
                      <span className="font-bold text-gray-900 dark:text-white ml-2">{emailModal.net_amount.toFixed(2)}€</span>
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