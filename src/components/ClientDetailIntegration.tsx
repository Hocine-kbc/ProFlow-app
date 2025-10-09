// Exemple d'intégration de la vue détaillée client dans l'application principale
import { useState } from 'react';
import { ClientDetail } from '../types/clientDetail.ts';
import ClientDetailView from './ClientDetailView.tsx';

interface ClientDetailIntegrationProps {
  clientId: string;
  onBack: () => void;
}

export default function ClientDetailIntegration({ clientId, onBack }: ClientDetailIntegrationProps) {

  // Gestionnaires d'événements
  const handleEditClient = (client: ClientDetail) => {
    console.log('Modifier le client:', client);
    // Implémenter la logique de modification
  };

  const handleCreateInvoice = (clientId: string) => {
    console.log('Créer une facture pour le client:', clientId);
    // Rediriger vers la page de création de facture
    // ou ouvrir un modal de création
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ClientDetailView
        clientId={clientId}
        onBack={onBack}
        onEditClient={handleEditClient}
        onCreateInvoice={handleCreateInvoice}
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
        type="button"
        onClick={() => handleViewClient('client-123')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Voir les détails du client
      </button>
    </div>
  );
};
