import React from 'react';
import { Users, X } from 'lucide-react';

interface ClientModalProps {
  isOpen: boolean;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    email: string;
    phone: string;
    siren?: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  setFormData: (data: {
    name: string;
    email: string;
    phone: string;
    siren?: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  }) => void;
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  SIREN (facultatif)
                </label>
                <input
                  type="text"
                  value={formData.siren || ''}
                  onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                  placeholder="ex: 123 456 789"
                  className="w-full px-3 py-2.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                />
              </div>
            
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Rue
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
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
