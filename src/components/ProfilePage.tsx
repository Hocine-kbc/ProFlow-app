import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Edit3,
  Hash,
  Mail,
  MapPin,
  Phone,
  Save,
  Trash2,
  Upload,
  User,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  useApp,
} from '../contexts/AppContext';
import {
  deleteUserAccount,
  fetchSettings as fetchSettingsApi,
  uploadLogo,
  upsertSettings,
} from '../lib/api';
import {
  supabase,
} from '../lib/supabase';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // États pour la modification de mot de passe
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      console.log('🔍 ProfilePage: Début du chargement des paramètres');
      try {
        const remote = await fetchSettingsApi();
        console.log('🔍 ProfilePage: Paramètres récupérés:', remote);
        if (remote) {
          // Séparer le nom complet en prénom et nom
          const fullName = (remote as Record<string, unknown>).ownerName as string || '';
          const nameParts = fullName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const picked = {
            companyName: (remote as Record<string, unknown>).companyName as string || '',
            ownerFirstName: firstName,
            ownerLastName: lastName,
            email: (remote as Record<string, unknown>).email as string || '',
            phone: (remote as Record<string, unknown>).phone as string || '',
            address: (remote as Record<string, unknown>).address as string || '',
            siret: (remote as Record<string, unknown>).siret as string || '',
            logoUrl: (remote as Record<string, unknown>).logoUrl as string || '',
          };
          setSettings(picked);
          localStorage.setItem('business-settings', JSON.stringify({ ...(remote as Record<string, unknown>), ...picked }));
          return;
        }
      } catch {
        // Ignore errors when fetching remote settings
      }
      try {
        const raw = localStorage.getItem('business-settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch {
        // Ignore errors when fetching local settings
      }
    })();
  }, []);

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Fonctions pour la gestion du mot de passe
  const handlePasswordInputChange = (key: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [key]: value }));
    // Effacer l'erreur pour ce champ
    if (passwordErrors[key]) {
      setPasswordErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePasswordForm = () => {
    const errors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Le mot de passe actuel est requis';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      errors.newPassword = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    // Vérifier que le nouveau mot de passe est différent de l'actuel
    if (passwordData.currentPassword && passwordData.newPassword && 
        passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe doit être différent de l\'actuel';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 Début de la modification du mot de passe');
    
    if (!validatePasswordForm()) {
      console.log('❌ Validation du formulaire échouée');
      return;
    }

    setChangingPassword(true);
    setPasswordErrors({});

    try {
      console.log('👤 Vérification de l\'utilisateur connecté...');
      // Vérifier que l'utilisateur est connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        console.error('❌ Erreur utilisateur:', userError);
        throw new Error('Utilisateur non connecté');
      }
      console.log('✅ Utilisateur trouvé:', user.email);

      console.log('🔍 Vérification du mot de passe actuel...');
      // Vérifier le mot de passe actuel en tentant une reconnexion
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        console.error('❌ Mot de passe actuel incorrect:', signInError.message);
        setPasswordErrors({ currentPassword: 'Mot de passe actuel incorrect' });
        setChangingPassword(false);
        return;
      }
      console.log('✅ Mot de passe actuel vérifié');

      console.log('🔄 Mise à jour du mot de passe...');
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        console.error('❌ Erreur de mise à jour:', updateError);
        throw new Error(updateError.message || 'Erreur lors de la mise à jour du mot de passe');
      }
      console.log('✅ Mot de passe mis à jour avec succès');

      // Réinitialiser le formulaire
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordChange(false);
      setShowPasswords({ current: false, new: false, confirm: false });

      showNotification('success', 'Mot de passe modifié', 'Votre mot de passe a été mis à jour avec succès');

    } catch (error: unknown) {
      console.error('❌ Erreur lors de la modification du mot de passe:', error);
      const errorMessage = error instanceof Error ? error.message : 'Impossible de modifier le mot de passe. Veuillez réessayer.';
      showNotification('error', 'Erreur', errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const cancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
    setShowPasswords({ current: false, new: false, confirm: false });
    setShowPasswordChange(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation === 'supprimer') {
      try {
        // Supprimer complètement le compte (données + utilisateur Auth)
        await deleteUserAccount();
        
        showNotification('success', 'Compte supprimé', 'Votre compte a été supprimé définitivement. Redirection en cours...');
        setShowDeleteModal(false);
        setDeleteConfirmation('');
      } catch (error) {
        console.error('Erreur lors de la suppression du compte:', error);
        showNotification('error', 'Erreur', 'Impossible de supprimer le compte. Veuillez réessayer.');
      }
    } else {
      showNotification('error', 'Erreur', 'Vous devez écrire "supprimer" pour confirmer');
    }
  };

  const handleLogoUpload = async (file?: File) => {
    if (!file) return;
    try {
      setUploadingLogo(true);
      const publicUrl = await uploadLogo(file);
      const next = { ...settings, logoUrl: publicUrl };
      setSettings(next);
      localStorage.setItem('business-settings', JSON.stringify(next));
    } catch {
      showNotification('error', 'Échec du téléversement', 'Impossible de téléverser le logo. Vérifiez votre connexion.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoDelete = () => {
    if (!settings.logoUrl) return;
    
    try {
      const next = { ...settings, logoUrl: '' };
      setSettings(next);
      localStorage.setItem('business-settings', JSON.stringify(next));
      
      // Optionnel : supprimer le fichier du bucket Supabase
      // await deleteLogo(settings.logoUrl);
    } catch {
      showNotification('error', 'Erreur de suppression', 'Impossible de supprimer le logo.');
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
      
      const saved = await upsertSettings(settingsToSave as Record<string, unknown>);
      localStorage.setItem('business-settings', JSON.stringify(saved));
      
      // Afficher la notification de succès
      showNotification('success', 'Profil sauvegardé', 'Vos informations ont été mises à jour avec succès');
    } catch {
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header amélioré et responsive */}
      <div className="relative rounded-xl sm:rounded-2xl p-4 md:p-6 lg:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white shadow-lg overflow-hidden">
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
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">Profil entreprise</h1>
            <p className="text-white/80 mt-1 text-sm sm:text-base">Informations légales et données entreprise</p>
          </div>
          <div className="flex justify-center sm:justify-start">
            <button 
              type="submit" 
              form="profile-form"
              className="inline-flex items-center px-4 py-2.5 sm:px-6 sm:py-3 rounded-full text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 hover:border-white/50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm font-medium">Sauvegarder</span>
            </button>
          </div>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        {/* Company Logo Section - Version améliorée et responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo et informations */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Logo */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 flex-shrink-0">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo entreprise" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Actions - Version responsive améliorée */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {settings.logoUrl ? (
                <>
                  <button
                    type="button"
                    onClick={handleLogoEdit}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                  >
                    <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Modifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogoDelete}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 py-2 bg-gray-100 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Supprimer</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogoEdit}
                  className="flex items-center space-x-1 sm:space-x-2 px-4 py-2 bg-gray-100 hover:bg-indigo-50 dark:bg-gray-700 dark:hover:bg-indigo-900/20 text-gray-600 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 rounded-lg transition-all duration-200 font-medium text-xs sm:text-sm"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Ajouter un logo</span>
                  <span className="sm:hidden">Ajouter</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Company Information - Version améliorée et responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Informations de l'entreprise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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

        {/* Contact Information - Version améliorée et responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Coordonnées de contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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
            
            <div className="lg:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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

        {/* Legal Information - Version améliorée et responsive */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-5 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center">
            <Hash className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Informations légales
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
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
              <p className="text-xs text-gray-500 dark:text-gray-400">14 chiffres sans espaces</p>
            </div>
          </div>
        </div>

      </form>

      {/* Section de modification de mot de passe - EN DEHORS du formulaire principal */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 lg:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                Sécurité du compte
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Gérez la sécurité de votre compte
              </p>
            </div>
          </div>
          {!showPasswordChange && (
            <button
              type="button"
              onClick={() => setShowPasswordChange(true)}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl text-xs sm:text-sm w-fit"
            >
              <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span>Modifier le mot de passe</span>
            </button>
          )}
        </div>

        {showPasswordChange && (
          <div className="relative">
            {/* Effet de fond animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl animate-pulse"></div>
            
            <form onSubmit={handlePasswordChange} className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 lg:p-8 shadow-xl">
              <div className="flex items-center space-x-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    Modification du mot de passe
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Pour des raisons de sécurité, confirmez votre mot de passe actuel
                  </p>
                </div>
              </div>
                
              <div className="space-y-4 sm:space-y-6">
                {/* Mot de passe actuel */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-500 rounded-full mr-2"></div>
                    Mot de passe actuel
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      className="w-full px-3 py-3 sm:px-4 sm:py-4 pr-10 sm:pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 group-hover:border-indigo-300 dark:group-hover:border-indigo-500 text-sm sm:text-base"
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                      placeholder="Saisissez votre mot de passe actuel"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      <span>{passwordErrors.currentPassword}</span>
                    </div>
                  )}
                </div>

                {/* Nouveau mot de passe */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-2"></div>
                    Nouveau mot de passe
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      className="w-full px-3 py-3 sm:px-4 sm:py-4 pr-10 sm:pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 group-hover:border-green-300 dark:group-hover:border-green-500 text-sm sm:text-base"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                      placeholder="Saisissez votre nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {passwordErrors.newPassword && (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      <span>{passwordErrors.newPassword}</span>
                    </div>
                  )}
                  
                  {/* Critères de sécurité avec design amélioré */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-lg flex items-center justify-center">
                        <Lock className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">
                        Critères de sécurité
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                      <div className="flex items-center space-x-2 text-xs text-green-700 dark:text-green-300">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>8+ caractères</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-green-700 dark:text-green-300">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>Majuscule + minuscule</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-green-700 dark:text-green-300">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        <span>Au moins un chiffre</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirmation du mot de passe */}
                <div className="space-y-2 sm:space-y-3">
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mr-2"></div>
                    Confirmer le nouveau mot de passe
                  </label>
                  <div className="relative group">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      className="w-full px-3 py-3 sm:px-4 sm:py-4 pr-10 sm:pr-12 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 group-hover:border-purple-300 dark:group-hover:border-purple-500 text-sm sm:text-base"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  {passwordErrors.confirmPassword && (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs sm:text-sm">
                      <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                      <span>{passwordErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>
                </div>

              {/* Boutons d'action en pilule */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 justify-center">
                <button
                  type="button"
                  onClick={cancelPasswordChange}
                  className="px-4 py-2.5 sm:px-6 sm:py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full font-semibold transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 text-xs sm:text-sm"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                    <span>Annuler</span>
                  </div>
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="px-4 py-2.5 sm:px-6 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none text-xs sm:text-sm"
                >
                  {changingPassword ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
                      <span>Modification...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Modifier</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bouton de suppression */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 hover:scale-105 active:scale-95"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer le compte définitivement
          </button>
        </div>

      {/* Modal de suppression personnalisée */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            {/* Header avec icône d'alerte */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Suppression du compte
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cette action est <span className="font-semibold text-red-600 dark:text-red-400">irréversible</span>
              </p>
            </div>

            {/* Contenu principal */}
            <div className="mb-6">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 text-center">
                Vous êtes sur le point de supprimer <strong>définitivement</strong> votre compte et toutes les données associées.
              </p>
              
              {/* Liste des données supprimées */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-2xl p-4 mb-4">
                <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2 text-center">
                  📋 Données qui seront supprimées
                </p>
                <div className="grid grid-cols-1 gap-1">
                  <div className="flex items-center text-xs text-red-700 dark:text-red-300">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                    Tous vos clients et leurs informations
                  </div>
                  <div className="flex items-center text-xs text-red-700 dark:text-red-300">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                    Toutes vos factures et documents
                  </div>
                  <div className="flex items-center text-xs text-red-700 dark:text-red-300">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                    Tous vos services et prestations
                  </div>
                  <div className="flex items-center text-xs text-red-700 dark:text-red-300">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></div>
                    Vos paramètres et préférences
                  </div>
                </div>
              </div>

              {/* Champ de confirmation */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  Pour confirmer, tapez <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-red-600 dark:text-red-400 font-bold">supprimer</span>
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Tapez 'supprimer' ici"
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-full focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-medium transition-all duration-200"
                />
              </div>
            </div>

            {/* Boutons en pilule */}
            <div className="flex space-x-4">
              <button
              type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'supprimer'}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-full font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg disabled:shadow-none"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


