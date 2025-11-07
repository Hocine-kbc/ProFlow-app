import { Crown, ShieldCheck, Zap, CheckCircle2, Clock3, Mail, Palette, LineChart } from 'lucide-react';

interface Feature {
  label: string;
  description: string;
}

const freeFeatures: Feature[] = [
  {
    label: 'Facturation essentielle',
    description: 'Création illimitée de factures, suivi des paiements de base et export PDF.'
  },
  {
    label: 'Gestion clients & prestations',
    description: 'Carnet client centralisé, fiches prestations et tarifs par défaut.'
  },
  {
    label: 'Tableau de bord standard',
    description: 'Vue synthétique de votre chiffre d’affaires et de vos encaissements.'
  }
];

const proFeatures: Feature[] = [
  {
    label: 'Analyses avancées en temps réel',
    description: 'Segmentation par client, service ou période avec comparatifs dynamiques.'
  },
  {
    label: 'Automatisation des relances',
    description: 'E-mails et rappels planifiés pour factures en retard ou à venir.'
  },
  {
    label: 'Exports comptables approfondis',
    description: 'Exports CSV/Excel structurés, journaux URSSAF, rapports mensuels prêts à transmettre.'
  },
  {
    label: 'Personnalisation de marque',
    description: 'Logos multiples, palette de couleurs, modèles d’e-mail personnalisés.'
  },
  {
    label: 'Portail collaboratif & partage client',
    description: 'Lien sécurisé pour que vos clients consultent devis, factures et paiements.'
  },
  {
    label: 'Support prioritaire & onboarding',
    description: 'Canal dédié, sessions de démarrage et réponses en moins de 24h ouvrées.'
  }
];

const roadmapItems = [
  {
    icon: <Zap className="w-5 h-5 text-orange-500" />,
    title: 'Paiement en ligne intégré',
    text: 'Encaissez vos clients par carte ou virement instantané directement depuis la facture.'
  },
  {
    icon: <Mail className="w-5 h-5 text-sky-500" />,
    title: 'Campagnes e-mailing automatisées',
    text: 'Séquences prêtes à l’emploi pour fidéliser vos clients et relancer vos prospects.'
  },
  {
    icon: <Palette className="w-5 h-5 text-purple-500" />,
    title: 'Portail marque blanche',
    text: 'Interface client entièrement à vos couleurs, avec URL personnalisée.'
  }
];

export default function PricingPage() {
  return (
    <div className="space-y-8">
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700 text-white rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold uppercase tracking-widest">
              Aperçu en avant-première
            </span>
            <h1 className="mt-4 text-3xl lg:text-4xl font-extrabold leading-tight">
              Plans & accès ProFlow
            </h1>
            <p className="mt-3 text-white/80 max-w-2xl text-base lg:text-lg">
              Préparez la mise en place d’un plan Pro : une expérience premium pour les indépendants qui veulent automatiser leur gestion et piloter leur activité sans friction.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 flex flex-col gap-3 lg:min-w-[280px]">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-white" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Statut</p>
                <p className="text-xl font-bold">Bientôt disponible</p>
              </div>
            </div>
            <p className="text-sm text-white/80">
              Cette page est un prototype destiné à valider l’UX, les fonctionnalités et l’intégration Stripe/Supabase avant le lancement public.
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan Essentiel</h2>
              <p className="text-gray-600 dark:text-gray-400">Inclus avec votre compte gratuit</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0€<span className="text-base font-medium text-gray-500 dark:text-gray-400"> / mois</span></p>
          </div>
          <ul className="mt-6 space-y-4 flex-1">
            {freeFeatures.map((feature) => (
              <li key={feature.label} className="flex gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{feature.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="mt-8 inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors text-sm font-medium"
            disabled
          >
            Plan actuel
          </button>
        </div>

        <div className="relative bg-white dark:bg-gray-900 border-2 border-indigo-500/60 dark:border-indigo-400/60 rounded-2xl p-6 shadow-xl flex flex-col overflow-hidden">
          <div className="absolute inset-x-6 top-0 h-[180px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Plan Pro</h2>
              <p className="text-gray-600 dark:text-gray-400">Pour aller plus loin et gagner du temps</p>
            </div>
          </div>
          <div className="relative mt-6">
            <div className="inline-flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">29€</p>
              <span className="text-sm text-gray-500 dark:text-gray-400">/ mois (estimatif)</span>
            </div>
            <p className="mt-1 text-sm text-indigo-500 dark:text-indigo-300 font-medium uppercase tracking-wide">1 mois offert en lancement</p>
          </div>
          <ul className="relative mt-6 space-y-4 flex-1">
            {proFeatures.map((feature) => (
              <li key={feature.label} className="flex gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{feature.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="relative mt-8 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-transform disabled:opacity-70"
            disabled
          >
            Souscription en préparation
          </button>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Facturation annuelle prévue avec réduction (-15%) et gestion via Stripe Billing.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <LineChart className="w-6 h-6 text-sky-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fonctionnalités Pro clés</h3>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Accès anticipé aux modules premium : tableaux de bord interactifs, scénarios d’alerte, automatisations personnalisées.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>• Vue 360° client avec scoring et indicateurs de santé.</li>
            <li>• Rapports URSSAF prêts à la déclaration.</li>
            <li>• Relances multi-canales (email + notifications).</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock3 className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Expérience utilisateur</h3>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Design pensé pour un onboarding rapide : activation du plan en 3 étapes, gestion simple des moyens de paiement, suivi des factures Pro vs Free.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>• Historique complet des factures Pro.</li>
            <li>• Notifications contextuelles pour les fonctionnalités réservées.</li>
            <li>• Mode essai 14 jours sans engagement.</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sécurité & conformité</h3>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Gestion des abonnements via Stripe Billing, synchronisation dans Supabase, RLS renforcée et audit trail complet pour chaque opération sensible.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li>• Politique RLS par statut d’abonnement.</li>
            <li>• Journal des actions sensibles (exports, suppression).</li>
            <li>• Sauvegardes encryptées et monitoring des webhooks.</li>
          </ul>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Feuille de route Pro (prochaines étapes)
        </h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {roadmapItems.map((item) => (
            <div key={item.title} className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {item.icon}
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Ces éléments guideront l’intégration du plan payant : conception du paywall, routes sécurisées, webhooks Stripe, tests end-to-end et communication marketing.
        </p>
      </section>
    </div>
  );
}

