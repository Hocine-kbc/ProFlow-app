import React, { useState } from 'react';
import { testEmailConfiguration, sendInvoiceEmail } from '../lib/emailService.ts';

const EmailTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string>('FAC-202509-001');
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    setConnectionStatus('Connexion en cours...');
    
    const isConnected = await testEmailConfiguration();
    
    if (isConnected) {
      setConnectionStatus('✅ Connexion au backend réussie !');
    } else {
      setConnectionStatus('❌ Échec de la connexion au backend. Vérifiez que le serveur est démarré.');
    }
    
    setIsLoading(false);
  };

  const testSendInvoice = async () => {
    if (!invoiceId.trim()) {
      setSendStatus('❌ Veuillez entrer un ID de facture');
      return;
    }

    setIsLoading(true);
    setSendStatus('Envoi de la facture en cours...');
    
    const emailData = {
      invoice_number: invoiceId,
      to_email: 'test@example.com',
      to_name: 'Test Client',
      subject: 'Test Invoice',
      message: 'This is a test invoice from your backend.',
      invoice_date: '25/09/2025',
      invoice_due_date: '25/10/2025',
      invoice_amount: '100.00',
      company_name: 'Test Company',
      company_email: 'test@company.com',
    };
    
    const emailResult = await sendInvoiceEmail(emailData);
    
    if (emailResult.success) {
      setSendStatus(`✅ ${emailResult.message || 'Facture envoyée avec succès !'} (Vérifiez les logs du backend)`);
    } else {
      let errorMessage = `❌ ${emailResult.message || 'Échec de l\'envoi de la facture'}`;
      if (emailResult.hint) {
        errorMessage += `\n\n💡 ${emailResult.hint}`;
      }
      if (emailResult.error && emailResult.error !== emailResult.message) {
        errorMessage += `\n\nDétails: ${emailResult.error}`;
      }
      setSendStatus(errorMessage);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test du système de messagerie</h3>
      
      <div className="space-y-4">
        {/* Test de connexion */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">1. Test de connexion au backend</h4>
          <button
            type="button"
            onClick={testConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
          >
            {isLoading ? 'Test en cours...' : 'Tester la connexion'}
          </button>
          {connectionStatus && (
            <p className="mt-2 text-sm text-gray-600">{connectionStatus}</p>
          )}
        </div>

        {/* Test d'envoi de facture */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">2. Test d'envoi de facture</h4>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="ID de facture (ex: FAC-202509-001)"
              className="flex-1 border border-gray-300 p-2 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={testSendInvoice}
              disabled={isLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
          {sendStatus && (
            <p className="text-sm text-gray-600">{sendStatus}</p>
          )}
        </div>

        {/* Informations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">ℹ️ Informations</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Le backend doit être démarré sur le port 3001</li>
            <li>• Les factures de test sont générées automatiquement</li>
            <li>• Les PDFs sont créés dans le dossier temp/</li>
            <li>• Vérifiez les logs du serveur pour plus de détails</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EmailTest;
