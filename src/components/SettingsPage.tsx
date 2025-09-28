import React, { useEffect, useState } from 'react';
import { Save, Settings, Euro, Percent } from 'lucide-react';
import { fetchSettings as fetchSettingsApi, upsertSettings } from '../lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'Mon Entreprise de Nettoyage',
    ownerName: 'John Doe',
    email: 'john@nettoyage.fr',
    phone: '06 12 34 56 78',
    address: '123 Rue de l\'Exemple, 75000 Paris',
    siret: '123 456 789 00010',
    defaultHourlyRate: 25,
    urssafRate: 22,
    invoicePrefix: 'FAC',
    paymentTerms: 30,
    logoUrl: '',
    invoiceTerms: 'Paiement à 30 jours. Pas de TVA (franchise en base).',
  });

  // Load saved settings on mount if present
  useEffect(() => {
    (async () => {
      // 1) Try Supabase
      try {
        const remote = await fetchSettingsApi();
        if (remote) {
          setSettings(prev => ({ ...prev, ...remote } as any));
          localStorage.setItem('business-settings', JSON.stringify(remote));
          return;
        }
      } catch (_) {
        // ignore and fallback to local
      }
      // 2) Fallback to localStorage
      try {
        const raw = localStorage.getItem('business-settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            setSettings(prev => ({ ...prev, ...parsed }));
          }
        }
      } catch (_) {
        // ignore malformed localStorage
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await upsertSettings(settings as any);
      localStorage.setItem('business-settings', JSON.stringify(saved));
      alert('Paramètres sauvegardés avec succès !');
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert('Échec de la sauvegarde des paramètres sur Supabase. Vos changements sont gardés en local.');
      localStorage.setItem('business-settings', JSON.stringify(settings));
    }
  };


  const handleInputChange = (key: string, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
            <h1 className="text-2xl font-bold">Paramètres</h1>
            <p className="text-white/80 mt-1">Paramètres de facturation et configuration fiscale</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Billing Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Paramètres de facturation
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tarif horaire par défaut (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={settings.defaultHourlyRate}
                onChange={(e) => handleInputChange('defaultHourlyRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Taux URSSAF (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={settings.urssafRate}
                onChange={(e) => handleInputChange('urssafRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Préfixe facture
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Délai de paiement (jours)
              </label>
              <input
                type="number"
                min="0"
                value={settings.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Percent className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Informations fiscales
            </h3>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Micro-entreprise - Régime fiscal
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  En tant que micro-entrepreneur dans le secteur des services, vous bénéficiez :
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 ml-4 list-disc">
                  <li>Taux de cotisations sociales : {settings.urssafRate}%</li>
                  <li>Franchise de TVA (pas de TVA à facturer)</li>
                  <li>Comptabilité simplifiée</li>
                  <li>Déclaration mensuelle ou trimestrielle</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Conditions de facturation (affichées sur le PDF)
            </label>
            <textarea
              rows={4}
              value={settings.invoiceTerms}
              onChange={(e) => handleInputChange('invoiceTerms', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-blue-800 dark:hover:to-indigo-800 shadow border border-blue-500 dark:border-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder les paramètres
          </button>
        </div>
      </form>
    </div>
  );
}