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
  BarChart3
} from 'lucide-react';
import { ClientDetail } from '../types/clientDetail';
import { supabase } from '../lib/supabase';

interface ClientDetailViewProps {
  clientId: string;
  onBack: () => void;
  onEditClient: (client: ClientDetail) => void;
  onCreateInvoice: (clientId: string) => void;
  onSendInvoice: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
}

export default function ClientDetailView({ 
  clientId, 
  onBack, 
  onEditClient, 
  onCreateInvoice,
  onSendInvoice,
  onViewInvoice 
}: ClientDetailViewProps) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'services' | 'payments' | 'notes'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadClientDetail();
  }, [clientId]);

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

      // Récupérer les données réelles depuis Supabase avec toutes les relations
      let { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          *,
          invoices (*),
          services (*),
          client_contacts (*)
        `)
        .eq('id', clientId)
        .single();
        

      let invoices = [];
      let services = [];
      let contacts = [];

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
            .eq('client_id', clientId);
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
          
        // Récupérer les contacts (table optionnelle)
        let contactsData = [];
        try {
          const { data: contactsResult } = await supabase
            .from('client_contacts')
            .select('*')
            .eq('client_id', clientId);
          contactsData = contactsResult || [];
        } catch (contactsError) {
          console.log('⚠️ Table client_contacts non disponible:', contactsError);
          contactsData = [];
        }
          
        // Utiliser les données récupérées séparément
        client = simpleClient;
        invoices = invoicesData || [];
        services = servicesData || [];
        contacts = contactsData || [];
      } else {
        // Extraire les données des relations
        invoices = client.invoices || [];
        services = client.services || [];
        contacts = client.client_contacts || [];
      }


      // Calculer les KPIs
      const totalRevenue = invoices?.reduce((sum: number, inv: any) => {
        // Utiliser les bonnes colonnes de montant
        const amount = Number(inv.net_amount || inv.subtotal || 0) || 0;
        return sum + amount;
      }, 0) || 0;
      
      const paidInvoices = invoices?.filter((inv: any) => inv.status === 'paid') || [];
      
      const paidAmount = paidInvoices.reduce((sum: number, inv: any) => {
        // Utiliser les bonnes colonnes de montant
        const amount = Number(inv.net_amount || inv.subtotal || 0) || 0;
        return sum + amount;
      }, 0);
      
      const pendingAmount = invoices?.filter((inv: any) => inv.status === 'sent').reduce((sum: number, inv: any) => {
        const amount = Number(inv.net_amount || inv.subtotal || 0) || 0;
        return sum + amount;
      }, 0) || 0;
      
      const overdueAmount = invoices?.filter((inv: any) => inv.status === 'overdue').reduce((sum: number, inv: any) => {
        const amount = Number(inv.net_amount || inv.subtotal || 0) || 0;
        return sum + amount;
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
            number: invoice.invoice_number || invoice.number || 'N/A',
            date: invoice.date || invoice.created_at || new Date().toISOString().split('T')[0],
            dueDate: invoice.due_date || invoice.dueDate || new Date().toISOString().split('T')[0],
            amount: Number(invoice.net_amount || invoice.subtotal || 0) || 0,
            status: invoice.status || 'draft',
            paidDate: paidDate,
            paidAmount: Number(invoice.paid_amount || invoice.paidAmount || 0) || 0,
            description: invoice.description || invoice.notes || '',
            services: [] // TODO: Récupérer les services liés à chaque facture
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
        
        contactHistory: contacts?.map((contact: any) => ({
          id: contact.id,
          date: contact.date,
          type: contact.type,
          subject: contact.subject,
          description: contact.description,
          outcome: contact.outcome
        })) || []
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
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'sent': return <Mail className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
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
    
    let filtered = client.invoices;
    
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
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="group p-3 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              title="Retour à la liste des clients"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 group-hover:-translate-x-0.5 transition-all duration-200" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                {client.company && `${client.company} • `}
                Client depuis {formatDate(client.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onEditClient(client)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </button>
            <button
              onClick={() => onCreateInvoice(clientId)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors"
              title={`Créer une nouvelle facture pour ${client?.name || 'ce client'}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle facture
            </button>
          </div>
        </div>

        {/* Informations générales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations générales
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{client.email}</p>
                  </div>
                </div>
                {client.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Téléphone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Adresse</p>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400">Entreprise</p>
                      <p className="font-medium text-gray-900 dark:text-white">{client.company}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Statut */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statut</h3>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                  {client.status === 'active' ? 'Actif' : client.status === 'inactive' ? 'Inactif' : 'Prospect'}
                </span>
              </div>
            </div>

            {/* Notes */}
            {client.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{client.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Chiffre d'affaires</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Factures</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Payé</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-400">En attente</p>
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
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
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
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Graphique des revenus */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Évolution des revenus
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Graphique à implémenter</p>
                </div>
              </div>
            </div>

            {/* Dernières activités */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Dernières activités
              </h3>
              <div className="space-y-4">
                {client.contactHistory.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="flex items-start space-x-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{contact.subject}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{contact.description}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(contact.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {getFilteredInvoices().length} facture{getFilteredInvoices().length !== 1 ? 's' : ''} 
                    {searchTerm || statusFilter !== 'all' ? ' trouvée(s)' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                  {(searchTerm || statusFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Réinitialiser
                    </button>
                  )}
                  <button
                    onClick={() => {
                      // TODO: Implémenter l'export des factures
                    }}
                    className="px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 border border-indigo-300 dark:border-indigo-600 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Exporter
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Facture
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date émission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant payé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Échéance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date paiement
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {getFilteredInvoices().length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {invoice.number || 'N/A'}
                        </div>
                        {invoice.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {invoice.status === 'paid' ? formatCurrency(invoice.amount) : 
                         invoice.status === 'partial' ? formatCurrency(invoice.paidAmount || 0) : 
                         formatCurrency(0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {invoice.paidDate ? formatDate(invoice.paidDate) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onViewInvoice(invoice.id)}
                            className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                            title="Voir la facture"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {invoice.status === 'sent' && (
                            <button
                              onClick={() => onSendInvoice(invoice.id)}
                              className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                              title="Renvoyer par email"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors"
                            title="Télécharger PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {invoice.status === 'draft' && (
                            <button
                              className="p-2 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
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
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Heures
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarif/h
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {client.services.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(service.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {service.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {service.hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(service.hourlyRate)}/h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(service.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Informations de paiement
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Mode de paiement préféré</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.preferredMethod === 'bank_transfer' ? 'Virement' :
                     client.paymentInfo.preferredMethod === 'paypal' ? 'PayPal' :
                     client.paymentInfo.preferredMethod === 'check' ? 'Chèque' :
                     client.paymentInfo.preferredMethod === 'cash' ? 'Espèces' :
                     client.paymentInfo.preferredMethod === 'card' ? 'Carte' : 'Non défini'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Dernier paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.lastPaymentDate ? formatDate(client.paymentInfo.lastPaymentDate) : 'Aucun'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Montant du dernier paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.lastPaymentAmount ? formatCurrency(client.paymentInfo.lastPaymentAmount) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Nombre total de paiements</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.totalPayments}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Délai moyen de paiement</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.paymentInfo.averagePaymentTime} jours
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Pipeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Factures brouillons</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.draftInvoices}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Devis en attente</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.pendingQuotes}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Prestations planifiées</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {client.pipeline.plannedServices}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Revenus estimés</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(client.pipeline.estimatedRevenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Notes et historique des contacts
            </h3>
            <div className="space-y-4">
              {client.contactHistory.map((contact) => (
                <div key={contact.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        contact.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/20' :
                        contact.type === 'phone' ? 'bg-green-100 dark:bg-green-900/20' :
                        contact.type === 'meeting' ? 'bg-purple-100 dark:bg-purple-900/20' :
                        'bg-gray-100 dark:bg-gray-900/20'
                      }`}>
                        {contact.type === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> :
                         contact.type === 'phone' ? <Phone className="w-4 h-4 text-green-600" /> :
                         contact.type === 'meeting' ? <Calendar className="w-4 h-4 text-purple-600" /> :
                         <MessageSquare className="w-4 h-4 text-gray-600" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{contact.subject}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {contact.type === 'email' ? 'Email' :
                           contact.type === 'phone' ? 'Appel téléphonique' :
                           contact.type === 'meeting' ? 'Réunion' : 'Note'} • {formatDate(contact.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{contact.description}</p>
                  {contact.outcome && (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Résultat :</strong> {contact.outcome}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
