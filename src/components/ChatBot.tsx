import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageCircle, Send, Sparkles, User, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ChatBotState, ChatMessage, ChatSuggestion } from '../types';

const ChatBot: React.FC = () => {
  const { state } = useApp();
  const { clients, services, invoices } = state;
  
  const [chatState, setChatState] = useState<ChatBotState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    suggestions: []
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions initiales
  const initialSuggestions: ChatSuggestion[] = [
    { id: '1', text: 'Comment va mon chiffre d\'affaires ?', icon: '📊' },
    { id: '2', text: 'Combien de clients ai-je ?', icon: '👥' },
    { id: '3', text: 'Quelles sont mes factures en attente ?', icon: '📄' },
    { id: '4', text: 'Comment créer une facture étape par étape ?', icon: '➕' },
    { id: '5', text: 'Comment ajouter un nouveau client ?', icon: '👤' },
    { id: '6', text: 'Comment enregistrer une prestation ?', icon: '⏰' }
  ];

  // Auto-scroll vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (chatState.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [chatState.isOpen]);

  // Générer une réponse intelligente basée sur le message
  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Analyse du chiffre d'affaires
    if (message.includes('chiffre') || message.includes('ca') || message.includes('revenu')) {
      const monthlyRevenue = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          const now = new Date();
          return serviceDate.getMonth() === now.getMonth() && 
                 serviceDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);
      
      const totalRevenue = services.reduce((sum, service) => sum + (service.hours * service.hourly_rate), 0);
      
      return `📊 Votre chiffre d'affaires ce mois-ci est de ${monthlyRevenue.toFixed(2)}€. 
      
Au total, vous avez généré ${totalRevenue.toFixed(2)}€ depuis le début. 

${monthlyRevenue > 0 ? '🎉 Excellente performance !' : '💡 N\'oubliez pas d\'enregistrer vos prestations pour suivre votre CA.'}`;
    }

    // Analyse des clients
    if (message.includes('client') || message.includes('clientèle')) {
      const newClientsThisMonth = clients.filter(c => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return new Date(c.created_at) > oneMonthAgo;
      }).length;

      return `👥 Vous avez actuellement ${clients.length} clients au total.

${newClientsThisMonth > 0 ? `🎉 ${newClientsThisMonth} nouveau(x) client(s) ce mois-ci !` : '💡 Pensez à développer votre réseau pour attirer de nouveaux clients.'}

Vos top clients par CA sont :
${clients.slice(0, 3).map((client, idx) => {
  const clientRevenue = services
    .filter(s => s.client_id === client.id)
    .reduce((sum, s) => sum + (s.hours * s.hourly_rate), 0);
  return `${idx + 1}. ${client.name} (${clientRevenue.toFixed(2)}€)`;
}).join('\n')}`;
    }

    // Analyse des factures (seulement si pas de question sur la création)
    if ((message.includes('facture') || message.includes('factures')) && 
        !message.includes('créer') && !message.includes('nouvelle') && 
        !message.includes('comment') && !message.includes('faire')) {
      const pendingInvoices = invoices.filter(inv => inv.status === 'sent');
      const paidInvoices = invoices.filter(inv => inv.status === 'paid');
      const draftInvoices = invoices.filter(inv => inv.status === 'draft');
      
      const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);

      return `📄 État de vos factures :

• ${pendingInvoices.length} factures en attente (${pendingAmount.toFixed(2)}€)
• ${paidInvoices.length} factures payées (${paidAmount.toFixed(2)}€)
• ${draftInvoices.length} brouillons

${pendingAmount > 0 ? '⚠️ Vous avez des factures en attente de paiement. Pensez à faire un relance !' : '✅ Toutes vos factures sont à jour !'}`;
    }

    // Analyse des heures
    if (message.includes('heure') || message.includes('temps') || message.includes('travail')) {
      const currentMonthHours = services
        .filter(service => {
          const serviceDate = new Date(service.date);
          const now = new Date();
          return serviceDate.getMonth() === now.getMonth() && 
                 serviceDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, service) => sum + service.hours, 0);
      
      const totalHours = services.reduce((sum, service) => sum + service.hours, 0);
      const averageHoursPerMonth = totalHours / Math.max(1, new Set(services.map(s => new Date(s.date).getMonth())).size);

      return `⏰ Vos heures de travail :

• ${currentMonthHours}h ce mois-ci
• ${totalHours}h au total
• ${averageHoursPerMonth.toFixed(1)}h en moyenne par mois

${currentMonthHours > 0 ? '💪 Vous êtes bien actif ce mois !' : '📝 N\'oubliez pas d\'enregistrer vos heures de travail.'}`;
    }

    // Aide pour créer une facture
    if (message.includes('créer') || message.includes('nouvelle') || message.includes('facture') || message.includes('comment')) {
      return `📝 Guide complet pour créer une facture :

Étape 1 : Accéder aux factures
• Cliquez sur l'onglet "Factures" dans le menu de gauche
• Vous verrez la liste de vos factures existantes

Étape 2 : Créer une nouvelle facture
• Cliquez sur le bouton "Nouvelle facture" (généralement en haut à droite)
• Un formulaire de création s'ouvrira

Étape 3 : Sélectionner le client
• Choisissez un client dans la liste déroulante
• Si le client n'existe pas, vous pouvez le créer depuis l'onglet "Clients"

Étape 4 : Ajouter les prestations
• Sélectionnez les prestations à facturer
• Vous pouvez ajuster les quantités et prix si nécessaire
• Le total se calcule automatiquement

Étape 5 : Configurer les paramètres
• Vérifiez les informations de votre entreprise
• Ajustez les conditions de paiement si nécessaire
• Ajoutez des notes si vous le souhaitez

Étape 6 : Générer et envoyer
• Cliquez sur "Générer la facture"
• Vous pouvez la prévisualiser avant envoi
• Envoyez par email ou téléchargez le PDF

💡 Astuces :
• Vous pouvez créer une facture directement depuis une prestation
• Sauvegardez d'abord en brouillon si vous n'êtes pas sûr
• Vérifiez toujours les montants avant envoi`;
    }

    // Aide pour ajouter un client
    if (message.includes('client') && (message.includes('ajouter') || message.includes('nouveau') || message.includes('créer'))) {
      return `👤 Comment ajouter un nouveau client :

Étape 1 : Accéder aux clients
• Cliquez sur l'onglet "Clients" dans le menu de gauche
• Vous verrez la liste de vos clients existants

Étape 2 : Créer un nouveau client
• Cliquez sur le bouton "Nouveau client" ou "Ajouter un client"
• Un formulaire de création s'ouvrira

Étape 3 : Remplir les informations
• Nom : Nom de l'entreprise ou du client
• Email : Adresse email de contact
• Téléphone : Numéro de téléphone (optionnel)
• Adresse : Adresse complète (optionnel)
• Notes : Informations supplémentaires (optionnel)

Étape 4 : Sauvegarder
• Vérifiez toutes les informations
• Cliquez sur "Enregistrer" ou "Créer le client"
• Le client apparaîtra dans votre liste

💡 Astuce : Vous pouvez créer un client directement depuis la création d'une facture !`;
    }

    // Aide pour enregistrer une prestation
    if (message.includes('prestation') && (message.includes('enregistrer') || message.includes('ajouter') || message.includes('créer'))) {
      return `⏰ Comment enregistrer une prestation :

Étape 1 : Accéder aux prestations
• Cliquez sur l'onglet "Prestations" dans le menu de gauche
• Vous verrez la liste de vos prestations existantes

Étape 2 : Créer une nouvelle prestation
• Cliquez sur le bouton "Nouvelle prestation" ou "Ajouter"
• Un formulaire de création s'ouvrira

Étape 3 : Remplir les informations
• Client : Sélectionnez le client concerné
• Date : Date de la prestation
• Description : Détail du travail effectué
• Heures : Nombre d'heures travaillées
• Taux horaire : Prix par heure
• Total : Se calcule automatiquement

Étape 4 : Sauvegarder
• Vérifiez toutes les informations
• Cliquez sur "Enregistrer"
• La prestation sera ajoutée à votre liste

💡 Astuce : Les prestations peuvent être directement transformées en factures !`;
    }

    // Aide générale
    if (message.includes('aide') || message.includes('help')) {
      return `🤖 Je suis votre assistant ProFlow !

Je peux vous aider avec :
• 📊 Analyses : CA, clients, factures, heures
• 📝 Création : Factures, clients, prestations
• 📈 Statistiques : Évolution, tendances
• 💡 Conseils : Optimisation, relances

Questions fréquentes :
• "Comment créer une facture étape par étape ?"
• "Comment ajouter un nouveau client ?"
• "Comment enregistrer une prestation ?"
• "Mon chiffre d'affaires"
• "Mes factures en attente"

Que souhaitez-vous savoir ? 😊`;
    }

    // Réponse par défaut
    return `🤖 Je comprends votre question, mais je n'ai pas encore d'information spécifique sur "${userMessage}".

Je peux vous aider avec :
• Votre chiffre d'affaires et statistiques
• Vos clients et factures
• La création de nouvelles factures
• L'analyse de vos performances

Posez-moi une question plus spécifique ! 😊`;
  };

  // Ajouter un message
  const addMessage = (content: string, sender: 'user' | 'bot') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender,
      timestamp: new Date(),
      type: 'text'
    };

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  // Envoyer un message
  const sendMessage = (content: string) => {
    if (!content.trim()) return;

    // Ajouter le message utilisateur
    addMessage(content, 'user');

    // Afficher le loading
    setChatState(prev => ({ ...prev, isLoading: true }));

    // Simuler un délai de réponse
    setTimeout(() => {
      const response = generateResponse(content);
      addMessage(response, 'bot');
      setChatState(prev => ({ ...prev, isLoading: false }));
    }, 1000);
  };

  // Gérer les suggestions
  const handleSuggestion = (suggestion: ChatSuggestion) => {
    sendMessage(suggestion.text);
  };

  // Ouvrir/fermer le chat
  const toggleChat = () => {
    setChatState(prev => ({
      ...prev,
      isOpen: !prev.isOpen,
      suggestions: !prev.isOpen ? initialSuggestions : []
    }));
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = '';
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!chatState.isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          title="Ouvrir l'assistant"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      )}

      {/* Interface du chat */}
      {chatState.isOpen && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 lg:top-auto lg:left-auto lg:bottom-6 lg:right-6 lg:transform-none lg:w-96 lg:h-[500px] z-50 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 sm:p-2 bg-white/20 rounded-full">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Assistant ProFlow</h3>
                <p className="text-xs text-white/80 hidden sm:block">Votre assistant intelligent</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleChat}
              className="p-1.5 sm:p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-hide">
            {chatState.messages.length === 0 && (
              <div className="text-center py-6 sm:py-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm sm:text-base">
                  Bonjour ! 👋
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 px-2">
                  Je suis votre assistant ProFlow. Comment puis-je vous aider ?
                </p>
                
                {/* Suggestions */}
                <div className="space-y-1.5 sm:space-y-2">
                  {chatState.suggestions.map(suggestion => (
                    <button
                    type="button"
                      key={suggestion.id}
                      onClick={() => handleSuggestion(suggestion)}
                      className="w-full text-left p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-xs sm:text-sm"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base sm:text-lg">{suggestion.icon}</span>
                        <span className="text-gray-800 dark:text-gray-200 text-xs sm:text-sm leading-tight">{suggestion.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatState.messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-start space-x-1.5 sm:space-x-2">
                    {message.sender === 'bot' && (
                      <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 sm:mt-1 flex-shrink-0" />
                    )}
                    {message.sender === 'user' && (
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 sm:mt-1 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {chatState.isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 p-2.5 sm:p-3 rounded-2xl max-w-[85%] sm:max-w-[80%]">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex space-x-1.5 sm:space-x-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 sm:py-2.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={chatState.isLoading}
              />
              <button
                type="submit"
                disabled={chatState.isLoading}
                className="p-2 sm:p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
