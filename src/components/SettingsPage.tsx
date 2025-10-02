import React, { useEffect, useState } from 'react';
import { Save, Settings, Euro, Percent, Wrench, AlertTriangle } from 'lucide-react';
import { fetchSettings as fetchSettingsApi, upsertSettings } from '../lib/api';
import { fixAllInvoiceAmounts, checkInvoiceAmounts } from '../lib/fixInvoiceAmounts';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
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
  });

  // États pour la maintenance
  const [isFixingAmounts, setIsFixingAmounts] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [checkResult, setCheckResult] = useState<any>(null);

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

  // Fonction pour vérifier les montants des factures
  const handleCheckAmounts = async () => {
    try {
      setCheckResult(null);
      const result = await checkInvoiceAmounts();
      setCheckResult(result);
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      alert('Erreur lors de la vérification des montants');
    }
  };

  // Fonction pour corriger les montants des factures
  const handleFixAmounts = async () => {
    if (!confirm('Êtes-vous sûr de vouloir corriger tous les montants des factures ? Cette action est irréversible.')) {
      return;
    }

    setIsFixingAmounts(true);
    setFixResult(null);

    try {
      const result = await fixAllInvoiceAmounts();
      setFixResult(result);
      
      if (result.success) {
        alert(`✅ Correction terminée avec succès !\n${result.fixed.length} factures corrigées`);
      } else {
        alert(`⚠️ Correction terminée avec des erreurs :\n${result.errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Erreur lors de la correction:', error);
      alert('Erreur lors de la correction des montants');
    } finally {
      setIsFixingAmounts(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header amélioré et responsive */}
      <div className="relative rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
        {/* Traits décoratifs - Version responsive */}
        <div className="absolute inset-0 opacity-20">
          {/* Traits horizontaux */}
          <div className="absolute top-6 sm:top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
          <div className="absolute top-12 sm:top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
          <div className="absolute top-18 sm:top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
          <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
          <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
          
          {/* Traits verticaux */}
          <div className="absolute top-0 bottom-0 left-8 sm:left-12 w-0.5 h-full bg-white/20 transform rotate-12"></div>
          <div className="absolute top-0 bottom-0 left-16 sm:left-24 w-0.5 h-full bg-white/15 transform -rotate-6"></div>
          <div className="absolute top-0 bottom-0 right-8 sm:right-12 w-0.5 h-full bg-white/20 transform rotate-45"></div>
          <div className="absolute top-0 bottom-0 right-16 sm:right-24 w-0.5 h-full bg-white/15 transform -rotate-12"></div>
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Paramètres</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Paramètres de facturation et configuration fiscale</p>
          </div>
          
          {/* Bouton de sauvegarde dans le header pour tous les écrans */}
          <div className="flex justify-end sm:justify-start">
            <button
              type="submit"
              form="settings-form"
              className="inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 rounded-full text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 hover:border-white/50 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent"
            >
              <Save className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>

      <form id="settings-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

        {/* Billing Settings - Version améliorée et responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-4 sm:mb-6">
            <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Paramètres de facturation
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tarif horaire par défaut (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={settings.defaultHourlyRate}
                onChange={(e) => handleInputChange('defaultHourlyRate', parseFloat(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="25.00"
              />
            </div>
            
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Préfixe facture
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => handleInputChange('invoicePrefix', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
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
                value={settings.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="30"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Conditions de paiement personnalisées
              </label>
              <textarea
                value={settings.invoiceTerms}
                onChange={(e) => handleInputChange('invoiceTerms', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                placeholder="Paiement à 30 jours. Pas de TVA (franchise en base)."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Tax Information - Version améliorée et responsive */}
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
              value={settings.invoiceTerms}
              onChange={(e) => handleInputChange('invoiceTerms', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200 resize-none"
              placeholder="Paiement à 30 jours. Pas de TVA (franchise en base)."
            />
          </div>
        </div>

        {/* Section de maintenance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center space-x-2 mb-4 sm:mb-6">
            <Wrench className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Maintenance et réparation
            </h3>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Correction des montants des factures
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  Si vos factures affichent des montants incorrects (0,00€ ou montants avec déduction URSSAF), 
                  utilisez ces outils pour diagnostiquer et corriger le problème.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCheckAmounts}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Vérifier les montants</span>
              </button>
              
              <button
                type="button"
                onClick={handleFixAmounts}
                disabled={isFixingAmounts}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wrench className="w-4 h-4" />
                <span>{isFixingAmounts ? 'Correction en cours...' : 'Corriger les montants'}</span>
              </button>
            </div>

            {/* Résultats de la vérification */}
            {checkResult && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Résultats de la vérification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{checkResult.total}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total factures</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">{checkResult.needsFixing}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">À corriger</div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{checkResult.total - checkResult.needsFixing}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Correctes</div>
                  </div>
                </div>
                
                {checkResult.needsFixing > 0 && (
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    ⚠️ {checkResult.needsFixing} facture(s) ont des montants incorrects et nécessitent une correction.
                  </div>
                )}
                
                {checkResult.needsFixing === 0 && (
                  <div className="text-sm text-green-700 dark:text-green-300">
                    ✅ Toutes les factures ont des montants corrects.
                  </div>
                )}
              </div>
            )}

            {/* Résultats de la correction */}
            {fixResult && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Résultats de la correction
                </h4>
                
                {fixResult.success ? (
                  <div className="text-sm text-green-700 dark:text-green-300 mb-3">
                    ✅ Correction terminée avec succès ! {fixResult.fixed.length} facture(s) corrigée(s).
                  </div>
                ) : (
                  <div className="text-sm text-red-700 dark:text-red-300 mb-3">
                    ❌ Correction terminée avec des erreurs.
                  </div>
                )}

                {fixResult.fixed.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Factures corrigées :</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {fixResult.fixed.map((fix: any, index: number) => (
                        <div key={index} className="text-xs bg-white dark:bg-gray-800 rounded p-2">
                          <span className="font-medium">Facture {fix.id.slice(0, 8)}...</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {fix.oldSubtotal.toFixed(2)}€ → {fix.newAmount.toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fixResult.errors.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="text-xs font-medium text-red-700 dark:text-red-300">Erreurs :</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {fixResult.errors.map((error: string, index: number) => (
                        <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded p-2">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}