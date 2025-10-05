import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { upsertSettings } from '../lib/api';
import { Building2, User, Mail, Phone, MapPin, Hash, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  
  // Réinitialiser l'état du mot de passe lors du changement de mode
  const handleModeChange = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
  };

  // Calculer la force du mot de passe
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  
  // Champs du profil pour l'inscription
  const [companyName, setCompanyName] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [siret, setSiret] = useState('');

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (mode === 'signup') {
      if (!companyName.trim()) errors.companyName = 'Le nom de l\'entreprise est requis';
      if (!ownerFirstName.trim()) errors.ownerFirstName = 'Le prénom est requis';
      if (!ownerLastName.trim()) errors.ownerLastName = 'Le nom est requis';
      if (phone && !/^[0-9\s\+\-\(\)]+$/.test(phone)) errors.phone = 'Format de téléphone invalide';
      if (siret && !/^[0-9]{14}$/.test(siret.replace(/\s/g, ''))) errors.siret = 'Le SIRET doit contenir 14 chiffres';
      
      // Validation du mot de passe pour l'inscription
      if (password.length < 8) {
        errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      } else if (passwordStrength < 3) {
        errors.password = 'Le mot de passe doit être plus fort (majuscules, minuscules, chiffres)';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setValidationErrors({});
    
    if (!validateForm()) {
      setLoading(false);
      return;
    }
    
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        // Inscription avec création du profil
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        
        // Si l'inscription réussit, créer le profil
        if (data.user) {
          try {
            await upsertSettings({
              companyName: companyName || 'Mon Entreprise',
              ownerName: `${ownerFirstName || 'Propriétaire'} ${ownerLastName || ''}`.trim(),
              email: email,
              phone: phone || '',
              address: address || '',
              siret: siret || '',
              defaultHourlyRate: 50,
              invoicePrefix: 'FAC',
              paymentTerms: 30,
              logoUrl: '',
              invoiceTerms: 'Paiement à 30 jours net.',
              includeLatePaymentPenalties: false
            });
            setSuccess('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
          } catch (profileError) {
            console.error('Erreur lors de la création du profil:', profileError);
            setSuccess('Compte créé avec succès ! Vérifiez votre email pour confirmer votre compte.');
            // Ne pas bloquer l'inscription si la création du profil échoue
          }
        }
      }
    } catch (err: any) {
      // Traduire les messages d'erreur en français
      let errorMessage = 'Une erreur est survenue';
      
      if (err.message) {
        const message = err.message.toLowerCase();
        
        // Erreurs de connexion
        if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (message.includes('email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
        } else if (message.includes('too many requests')) {
          errorMessage = 'Trop de tentatives. Veuillez patienter avant de réessayer';
        }
        
        // Erreurs d'inscription
        else if (message.includes('user already registered') || message.includes('email already registered')) {
          errorMessage = 'Cette adresse email est déjà utilisée';
        } else if (message.includes('password should be at least')) {
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        } else if (message.includes('invalid email')) {
          errorMessage = 'Adresse email invalide';
        } else if (message.includes('signup is disabled')) {
          errorMessage = 'L\'inscription est temporairement désactivée';
        }
        
        // Erreurs réseau
        else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet';
        }
        
        // Autres erreurs
        else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with gradient and animated elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated background elements */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Brand section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
              <img src="/ProFlowlogo.png" alt="ProFlow Logo" className="w-12 h-12" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              ProFlow
            </h1>
            <p className="text-white/70">
              Votre flux professionnel simplifié
            </p>
          </div>

          {/* Auth card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
            {/* Mode toggle */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                  mode === 'signup'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-300"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-300"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70 transition-colors duration-200"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {/* Indicateur de force du mot de passe pour l'inscription */}
                  {mode === 'signup' && password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 w-6 rounded-full transition-all duration-300 ${
                                level <= passwordStrength
                                  ? passwordStrength <= 2
                                    ? 'bg-red-400'
                                    : passwordStrength <= 3
                                    ? 'bg-yellow-400'
                                    : 'bg-green-400'
                                  : 'bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-white/60">
                          {passwordStrength <= 2
                            ? 'Faible'
                            : passwordStrength <= 3
                            ? 'Moyen'
                            : 'Fort'}
                        </span>
                      </div>
                    </div>
                  )}
                  {/* Message d'erreur de validation du mot de passe */}
                  {validationErrors.password && (
                    <p className="mt-1 text-sm text-red-300">{validationErrors.password}</p>
                  )}
                </div>

                {/* Champs du profil pour l'inscription */}
                {mode === 'signup' && (
                  <>
                    <div className="border-t border-white/20 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Informations de votre entreprise</h3>
                        <div className="flex items-center space-x-2 text-sm text-white/60">
                          <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                          <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                          <div className="w-2 h-2 bg-white/30 rounded-full"></div>
                        </div>
                      </div>
                      <p className="text-sm text-white/70 mb-6">
                        Ces informations seront utilisées pour personnaliser vos factures et documents.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Nom de l'entreprise
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Building2 className="h-5 w-5 text-white/40" />
                            </div>
                            <input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                                validationErrors.companyName 
                                  ? 'border-red-400 focus:ring-red-400/30' 
                                  : 'border-white/20 focus:ring-white/30'
                              }`}
                              placeholder="Mon Entreprise"
                            />
                            {validationErrors.companyName && (
                              <p className="mt-1 text-sm text-red-300">{validationErrors.companyName}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Prénom
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-white/40" />
                              </div>
                              <input
                                type="text"
                                value={ownerFirstName}
                                onChange={(e) => setOwnerFirstName(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                                  validationErrors.ownerFirstName 
                                    ? 'border-red-400 focus:ring-red-400/30' 
                                    : 'border-white/20 focus:ring-white/30'
                                }`}
                                placeholder="Jean"
                              />
                              {validationErrors.ownerFirstName && (
                                <p className="mt-1 text-sm text-red-300">{validationErrors.ownerFirstName}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                              Nom
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-white/40" />
                              </div>
                              <input
                                type="text"
                                value={ownerLastName}
                                onChange={(e) => setOwnerLastName(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                                  validationErrors.ownerLastName 
                                    ? 'border-red-400 focus:ring-red-400/30' 
                                    : 'border-white/20 focus:ring-white/30'
                                }`}
                                placeholder="Dupont"
                              />
                              {validationErrors.ownerLastName && (
                                <p className="mt-1 text-sm text-red-300">{validationErrors.ownerLastName}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Téléphone
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Phone className="h-5 w-5 text-white/40" />
                            </div>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                                validationErrors.phone 
                                  ? 'border-red-400 focus:ring-red-400/30' 
                                  : 'border-white/20 focus:ring-white/30'
                              }`}
                              placeholder="01 23 45 67 89"
                            />
                            {validationErrors.phone && (
                              <p className="mt-1 text-sm text-red-300">{validationErrors.phone}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            Adresse
                          </label>
                          <div className="relative">
                            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                              <MapPin className="h-5 w-5 text-white/40" />
                            </div>
                            <textarea
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              rows={2}
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all duration-300 resize-none"
                              placeholder="123 Rue de la Paix, 75001 Paris"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white/90 mb-2">
                            SIRET (optionnel)
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Hash className="h-5 w-5 text-white/40" />
                            </div>
                            <input
                              type="text"
                              value={siret}
                              onChange={(e) => setSiret(e.target.value)}
                              className={`w-full pl-10 pr-4 py-3 bg-white/10 border rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 ${
                                validationErrors.siret 
                                  ? 'border-red-400 focus:ring-red-400/30' 
                                  : 'border-white/20 focus:ring-white/30'
                              }`}
                              placeholder="12345678901234"
                            />
                            {validationErrors.siret && (
                              <p className="mt-1 text-sm text-red-300">{validationErrors.siret}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-red-200 font-medium">Erreur d'authentification</p>
                      <p className="text-sm text-red-300 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-200 font-medium">Succès</p>
                      <p className="text-sm text-green-300 mt-1">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {mode === 'login' ? 'Connexion...' : 'Création du compte...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    {mode === 'login' ? (
                      <>
                        <Lock className="w-5 h-5 mr-2" />
                        Se connecter
                      </>
                    ) : (
                      <>
                        <Building2 className="w-5 h-5 mr-2" />
                        Créer mon compte
                      </>
                    )}
                  </div>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/70 text-sm">
                {mode === 'login' ? (
                  <>
                    Pas encore de compte ?{' '}
                    <button 
                      type="button"
                      className="text-white font-medium hover:text-white/80 transition-colors duration-200"
                      onClick={() => handleModeChange('signup')}
                    >
                      Créer un compte
                    </button>
                  </>
                ) : (
                  <>
                    Déjà inscrit ?{' '}
                    <button 
                      type="button"
                      className="text-white font-medium hover:text-white/80 transition-colors duration-200"
                      onClick={() => handleModeChange('login')}
                    >
                      Se connecter
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


