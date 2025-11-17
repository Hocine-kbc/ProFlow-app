import React from 'react';
import { Users, X } from 'lucide-react';

type ClientType = 'particulier' | 'professionnel';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  siren: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  clientType: ClientType;
}

interface ClientModalProps {
  isOpen: boolean;
  onSubmit: (e: React.FormEvent) => void;
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  editingClient: { id: string; name: string } | null;
  resetForm: () => void;
}

export default function ClientModal({
  isOpen,
  onSubmit,
  formData,
  setFormData,
  editingClient,
  resetForm
}: ClientModalProps) {
  if (!isOpen) return null;

  const handleTypeChange = (clientType: ClientType) => {
    setFormData((prev) => ({
      ...prev,
      clientType,
      siren: clientType === 'professionnel' ? prev.siren : ''
    }));
  };

  const isProfessional = formData.clientType === 'professionnel';

  return (
    <div className="modal-overlay bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200 fixed inset-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-sm sm:max-w-lg lg:max-w-2xl w-full h-[95vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-green-600 via-green-600 to-green-700 dark:from-green-700 dark:via-green-700 dark:to-green-800 p-3 sm:p-4 lg:p-6 text-white relative overflow-hidden flex-shrink-0">
          {/* Decorative lines - consistent with other page headers */}
          <div className="absolute inset-0 opacity-20">
            {/* Traits horizontaux qui traversent */}
            <div className="absolute top-6 sm:top-8 left-0 right-0 w-full h-0.5 bg-white/30 transform rotate-12"></div>
            <div className="absolute top-12 sm:top-16 left-0 right-0 w-full h-0.5 bg-white/25 transform -rotate-6"></div>
            <div className="absolute top-18 sm:top-24 left-0 right-0 w-full h-0.5 bg-white/20 transform rotate-45"></div>
            <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 w-full h-0.5 bg-white/30 transform -rotate-12"></div>
            <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 w-full h-0.5 bg-white/25 transform rotate-24"></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold truncate">
                  {editingClient ? 'Modifier le client' : 'Nouveau client'}
                </h3>
                <p className="text-white/80 text-xs sm:text-sm truncate">
                  {editingClient ? 'Mettre à jour les informations' : 'Ajouter un nouveau client à votre portefeuille'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg sm:rounded-xl p-1.5 sm:p-2 transition-colors flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={onSubmit} className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de client *
              </label>
              <div className="relative grid grid-cols-2 bg-gray-200/80 dark:bg-gray-700 rounded-full p-1 overflow-hidden transition-colors">
                {/* Les deux indicateurs se déplacent vers la même position selon le type sélectionné */}
                {/* Indicateur vert pour Particulier */}
                <span
                  className={`absolute inset-[4px] w-[calc(50%-4px)] rounded-full shadow bg-gradient-to-r from-green-500 to-green-600 ${
                    formData.clientType === 'particulier' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    transform: formData.clientType === 'particulier' ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out',
                  }}
                />
                {/* Indicateur bleu pour Professionnel */}
                <span
                  className={`absolute inset-[4px] w-[calc(50%-4px)] rounded-full shadow bg-gradient-to-r from-blue-500 to-blue-600 ${
                    formData.clientType === 'professionnel' ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    transform: formData.clientType === 'professionnel' ? 'translateX(100%)' : 'translateX(0)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out',
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleTypeChange('particulier')}
                  className={`relative z-10 flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    formData.clientType === 'particulier'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Particulier
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('professionnel')}
                  className={`relative z-10 flex items-center justify-center px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    formData.clientType === 'professionnel'
                      ? 'text-white'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}
                >
                  Professionnel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  SIREN {isProfessional ? '(obligatoire)' : '(non requis)'}
                </label>
                <input
                  type="text"
                  value={formData.siren || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      siren: e.target.value
                    }))
                  }
                  placeholder="ex : 123 456 789"
                  disabled={!isProfessional}
                  required={isProfessional}
                  className={`w-full px-3 py-2.5 sm:px-3 sm:py-2 border rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm sm:text-base ${
                    isProfessional
                      ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                      : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                />
                {!isProfessional && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Le numéro SIREN n’est pas requis pour un client particulier.
                  </p>
                )}
              </div>
            
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Rue
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      street: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Code postal
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      postalCode: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Commune
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Pays
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value
                    }))
                  }
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            </div>
            
            <div className="flex flex-col space-y-2 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="w-full px-4 py-2.5 sm:py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="w-full px-4 py-2.5 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full hover:from-green-700 hover:to-green-800 dark:from-green-700 dark:to-green-800 dark:hover:from-green-800 dark:hover:to-green-900 transition-all duration-200 text-xs sm:text-sm font-medium"
              >
                {editingClient ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
