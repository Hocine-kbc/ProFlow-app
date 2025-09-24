import React, { useEffect, useState } from 'react';
import { Save, User, Camera } from 'lucide-react';
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
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profil entreprise</h1>
            <p className="text-white/80 mt-1">Identité et coordonnées de l'entreprise</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-2 ring-indigo-200">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full cursor-pointer shadow">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e.target.files?.[0] || undefined)} disabled={uploadingLogo} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'entreprise</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" value={settings.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du gérant</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" value={settings.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" className="w-full px-3 py-2 border rounded-lg" value={settings.email} onChange={(e) => handleInputChange('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input type="tel" className="w-full px-3 py-2 border rounded-lg" value={settings.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} value={settings.address} onChange={(e) => handleInputChange('address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SIRET</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" value={settings.siret} onChange={(e) => handleInputChange('siret', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center px-6 py-3 rounded-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </button>
        </div>
      </form>
    </div>
  );
}


