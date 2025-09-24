import React, { useEffect, useState } from 'react';
import { Save, Building2, User, Mail, Phone, MapPin, Hash, Upload } from 'lucide-react';
import { uploadLogo, fetchSettings as fetchSettingsApi, upsertSettings } from '../lib/api';

export default function ProfilePage() {
  const [settings, setSettings] = useState({
    companyName: '',
    ownerName: '',
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
          const picked = {
            companyName: (remote as any).companyName || '',
            ownerName: (remote as any).ownerName || '',
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await upsertSettings(settings as any);
      localStorage.setItem('business-settings', JSON.stringify(saved));
      // eslint-disable-next-line no-alert
      alert('Profil entreprise sauvegardé');
    } catch (err) {
      localStorage.setItem('business-settings', JSON.stringify(settings));
      // eslint-disable-next-line no-alert
      alert('Sauvegardé en local (erreur Supabase)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profil entreprise</h1>
            <p className="text-white/80 mt-1">Gérez les informations de votre entreprise</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Logo Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center ring-4 ring-indigo-200">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo entreprise" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <img src="/logo.png" alt="ProFlow Logo" className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-medium">ProFlow</p>
                  </div>
                )}
                <label className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 transition-colors">
                  <Upload className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleLogoUpload(e.target.files?.[0] || undefined)} 
                    disabled={uploadingLogo} 
                  />
                </label>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Logo de l'entreprise</h3>
              <p className="text-gray-600 text-sm mb-4">
                {settings.logoUrl 
                  ? "Votre logo personnalisé sera utilisé sur les factures et documents."
                  : "Le logo ProFlow par défaut est utilisé. Téléchargez votre propre logo."
                }
              </p>
              {uploadingLogo && (
                <div className="flex items-center text-sm text-indigo-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                  Téléchargement en cours...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
            Informations de l'entreprise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                Nom de l'entreprise
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" 
                value={settings.companyName} 
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Nom de votre entreprise"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                Nom du gérant
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" 
                value={settings.ownerName} 
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
                placeholder="Votre nom complet"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-indigo-600" />
            Coordonnées de contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                Email
              </label>
              <input 
                type="email" 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" 
                value={settings.email} 
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contact@votre-entreprise.fr"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                Téléphone
              </label>
              <input 
                type="tel" 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" 
                value={settings.phone} 
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                Adresse complète
              </label>
              <textarea 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none" 
                rows={3} 
                value={settings.address} 
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="123 Rue de la Paix, 75001 Paris"
              />
            </div>
          </div>
        </div>

        {/* Legal Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Hash className="w-5 h-5 mr-2 text-indigo-600" />
            Informations légales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Hash className="w-4 h-4 mr-2 text-gray-400" />
                Numéro SIRET
              </label>
              <input 
                type="text" 
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors" 
                value={settings.siret} 
                onChange={(e) => handleInputChange('siret', e.target.value)}
                placeholder="12345678901234"
              />
              <p className="text-xs text-gray-500 mt-1">14 chiffres sans espaces</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="inline-flex items-center px-8 py-4 rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <Save className="w-5 h-5 mr-2" />
            Sauvegarder les modifications
          </button>
        </div>
      </form>
    </div>
  );
}


