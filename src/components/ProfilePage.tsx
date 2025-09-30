import React, { useEffect, useState } from 'react';
import { Save, Building2, User, Mail, Phone, MapPin, Hash, Upload, Trash2, Edit3 } from 'lucide-react';
import { uploadLogo, fetchSettings as fetchSettingsApi, upsertSettings } from '../lib/api';
import { useApp } from '../contexts/AppContext';

export default function ProfilePage() {
  const { showNotification } = useApp();
  const [settings, setSettings] = useState({
    companyName: '',
    ownerFirstName: '',
    ownerLastName: '',
    email: '',
    phone: '',
    address: '',
    siret: '',
    logoUrl: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const remote = await fetchSettingsApi();
        if (remote) {
          // Séparer le nom complet en prénom et nom
          const fullName = (remote as any).ownerName || '';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const picked = {
            companyName: (remote as any).companyName || '',
            ownerFirstName: firstName,
            ownerLastName: lastName,
            email: (remote as any).email || '',
            phone: (remote as any).phone || '',
            address: (remote as any).address || '',
            siret: (remote as any).siret || '',
            logoUrl: (remote as any).logoUrl || '',
          };
          setSettings(picked);
          localStorage.setItem('business-settings', JSON.stringify({ ...(remote as any), ...picked }));
          return;
        }
      } catch {}
      try {
        const raw = localStorage.getItem('business-settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch {}
    })();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploadingLogo(true);
      const publicUrl = await uploadLogo(file);
      const next = { ...settings, logoUrl: publicUrl };
      setSettings(next);
      localStorage.setItem('business-settings', JSON.stringify(next));
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Échec du téléversement du logo. Vérifiez Supabase (bucket 'logos').");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = async () => {
    if (!settings.logoUrl) return;
    
    try {
      const next = { ...settings, logoUrl: '' };
      setSettings(next);
      localStorage.setItem('business-settings', JSON.stringify(next));
      
      // Optionnel : supprimer le fichier du bucket Supabase
      // await deleteLogo(settings.logoUrl);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Erreur lors de la suppression du logo.");
    }
  };

  const handleLogoEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleLogoUpload(file);
      }
    };
    input.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combiner le prénom et le nom pour la sauvegarde
      const settingsToSave = {
        ...settings,
        ownerName: `${settings.ownerFirstName} ${settings.ownerLastName}`.trim()
      };
      
      const saved = await upsertSettings(settingsToSave as any);
      localStorage.setItem('business-settings', JSON.stringify(saved));
      
      // Afficher la notification de succès
      showNotification('success', 'Profil sauvegardé', 'Vos informations ont été mises à jour avec succès');
    } catch (err) {
      // Combiner le prénom et le nom pour le localStorage
      const settingsToSave = {
        ...settings,
        ownerName: `${settings.ownerFirstName} ${settings.ownerLastName}`.trim()
      };
      localStorage.setItem('business-settings', JSON.stringify(settingsToSave));
      
      // Afficher la notification d'avertissement
      showNotification('warning', 'Sauvegarde locale', 'Profil sauvegardé en local (erreur de connexion)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h1 className="text-2xl font-bold">Profil entreprise</h1>
            <p className="text-white/80 mt-1">Informations légales et données entreprise</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button 
              type="submit" 
              form="profile-form"
              className="inline-flex items-center px-6 py-3 rounded-full text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Save className="w-5 h-5 mr-2" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSave} className="space-y-6">
        {/* Company Logo Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Logo et informations */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Logo */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo entreprise" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Informations */}
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">Logo de l'entreprise</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {settings.logoUrl ? "Logo personnalisé actif" : "Aucun logo personnalisé"}
                </p>
                {uploadingLogo && (
                  <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs mt-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 dark:border-blue-400 mr-2"></div>
                    Téléchargement...
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 sm:gap-2">
              {settings.logoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={handleLogoEdit}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full transition-all duration-200 font-medium text-xs sm:text-sm opacity-70 hover:opacity-100"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 rounded-full transition-all duration-200 font-medium text-xs sm:text-sm opacity-70 hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogoEdit}
                  className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-1 sm:py-1.5 bg-gray-100 hover:bg-indigo-50 dark:bg-gray-700 dark:hover:bg-indigo-900/20 text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 rounded-full transition-all duration-200 font-medium text-xs sm:text-sm opacity-70 hover:opacity-100"
                >
                  <Upload className="w-3 h-3" />
                  <span className="hidden sm:inline">Ajouter</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Informations de l'entreprise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                Nom de l'entreprise
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={settings.companyName} 
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Nom de votre entreprise"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                  Prénom
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={settings.ownerFirstName} 
                  onChange={(e) => handleInputChange('ownerFirstName', e.target.value)}
                  placeholder="Votre prénom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                  Nom
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={settings.ownerLastName} 
                  onChange={(e) => handleInputChange('ownerLastName', e.target.value)}
                  placeholder="Votre nom de famille"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Coordonnées de contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                Email
              </label>
              <input 
                type="email" 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={settings.email} 
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@votre-entreprise.fr"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                Téléphone
              </label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={settings.phone} 
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                Adresse complète
              </label>
              <textarea 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                rows={3} 
                value={settings.address} 
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Rue de la Paix, 75001 Paris"
              />
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Hash className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Informations légales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Hash className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                Numéro SIRET
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                value={settings.siret} 
                onChange={(e) => handleInputChange('siret', e.target.value)}
                placeholder="12345678901234"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">14 chiffres sans espaces</p>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}


