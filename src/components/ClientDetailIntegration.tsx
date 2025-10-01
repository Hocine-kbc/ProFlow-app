// Exemple d'intégration de la vue détaillée client dans l'application principale
import React, { useState } from 'react';
import ClientDetailView from './ClientDetailView';
import { ClientDetail } from '../types/clientDetail';

interface ClientDetailIntegrationProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientDetailIntegration({ clientId, onBack }: ClientDetailIntegrationProps) {
  const [loading, setLoading] = useState(false);

  // Gestionnaires d'événements
  const handleEditClient = async (client: ClientDetail) => {
    console.log('Modifier le client:', client);
    // Implémenter la logique de modification
  };

  const handleCreateInvoice = async (clientId: string) => {
    console.log('Créer une facture pour le client:', clientId);
    // Rediriger vers la page de création de facture
    // ou ouvrir un modal de création
  };

  const handleSendInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      console.log('Envoyer la facture:', invoiceId);
      // Implémenter l'envoi de facture
      // await sendInvoice(invoiceId);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la facture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    console.log('Voir la facture:', invoiceId);
    // Ouvrir la facture dans un nouvel onglet ou modal
    // window.open(`/invoice/${invoiceId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ClientDetailView
        clientId={clientId}
        onBack={onBack}
        onEditClient={handleEditClient}
        onCreateInvoice={handleCreateInvoice}
        onSendInvoice={handleSendInvoice}
        onViewInvoice={handleViewInvoice}
      />
    </div>
  );
}

// Exemple d'utilisation dans App.tsx ou un composant parent
export const ExampleUsage = () => {
  const [currentView, setCurrentView] = useState<'list' | 'detail'>('list');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const handleViewClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedClientId(null);
  };

  if (currentView === 'detail' && selectedClientId) {
    return (
      <ClientDetailIntegration
        clientId={selectedClientId}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div>
      {/* Votre liste de clients ici */}
      <button 
        onClick={() => handleViewClient('client-123')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Voir les détails du client
      </button>
    </div>
  );
};
