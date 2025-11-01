# 📧 Messagerie Email ProFlow - Vue d'Ensemble

## 🎯 Résumé

Système de messagerie interne complet de type "email client" (Gmail/Outlook) pour ProFlow, avec support de :
- Envoi/réception de messages
- Pièces jointes
- Planification d'envoi
- Étiquettes et favoris
- Archivage et corbeille
- Recherche avancée
- Notifications temps réel
- Envoi d'emails externes via SendGrid

---

## 📁 Structure des Fichiers

```
project_autoentreprise_new/
├── database/
│   └── create_email_messaging_schema.sql  # Schéma de base de données complet
├── api/
│   └── messages.js                         # Routes backend Express
├── src/
│   ├── components/
│   │   ├── EmailInboxPage.tsx              # Page principale de la messagerie
│   │   ├── EmailComposer.tsx               # Composant d'édition d'email
│   │   ├── MessageItem.tsx                 # Item de liste de message
│   │   ├── MessageView.tsx                 # Vue détaillée d'un message
│   │   ├── EmailSidebar.tsx                # Barre latérale avec dossiers
│   │   └── SearchBar.tsx                   # Barre de recherche et filtres
│   └── types/
│       └── index.ts                        # Types TypeScript étendus
├── docs/
│   ├── MESSAGERIE_ARCHITECTURE.md         # Architecture technique
│   ├── IMPLEMENTATION_GUIDE.md             # Guide de mise en œuvre
│   └── MESSAGERIE_README.md                # Ce fichier
└── server.js                               # Serveur Express (intègre les routes)
```

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
# Installer les dépendances manquantes
npm install date-fns multer
```

### 2. Base de Données

Exécutez le script SQL dans Supabase :
```sql
-- Copier le contenu de database/create_email_messaging_schema.sql
-- Dans Supabase Dashboard → SQL Editor
```

### 3. Configuration

Variables d'environnement nécessaires (déjà configurées si SendGrid est en place) :
```env
SENDGRID_API_KEY=your_key
SENDGRID_FROM_EMAIL=noreply@votredomaine.com
VITE_SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```

### 4. Démarrer

```bash
# Backend
node server.js

# Frontend (dans un autre terminal)
npm run dev
```

---

## 📖 Documentation Complète

- **[Architecture Technique](MESSAGERIE_ARCHITECTURE.md)** - Vue d'ensemble de l'architecture
- **[Guide de Mise en Œuvre](IMPLEMENTATION_GUIDE.md)** - Étapes détaillées d'installation

---

## ✨ Fonctionnalités Implémentées

### ✅ Core
- [x] Boîte de réception avec tri
- [x] Envoi/réception de messages
- [x] Brouillons
- [x] Messages envoyés
- [x] Archivage
- [x] Corbeille
- [x] Favoris (étoiles)

### ✅ Avancé
- [x] Pièces jointes (multifichiers)
- [x] Indicateurs lu/non lu
- [x] Recherche avec filtres
- [x] Notifications temps réel (Supabase Realtime)
- [x] Planification d'envoi
- [x] Priorités (basse, normale, haute, urgente)
- [x] Envoi d'emails externes (SendGrid)

### ✅ Sécurité
- [x] Authentification JWT
- [x] Row Level Security (RLS)
- [x] Validation des entrées
- [x] Détection de spam basique
- [x] Limites de taille de fichiers

---

## 🔄 Intégration

### Dans App.tsx

```typescript
import EmailInboxPage from './components/EmailInboxPage';

// Dans le switch case
case 'messages':
  return <EmailInboxPage />;
```

### Routes Backend

Les routes sont automatiquement disponibles via :
```
POST   /api/messages              - Envoyer un message
GET    /api/messages/inbox         - Liste des messages reçus
GET    /api/messages/sent          - Liste des messages envoyés
GET    /api/messages/drafts        - Liste des brouillons
GET    /api/messages/:id           - Détails d'un message
PUT    /api/messages/:id           - Mettre à jour un message
DELETE /api/messages/:id           - Supprimer un message
POST   /api/messages/:id/archive  - Archiver
POST   /api/messages/:id/star      - Marquer comme favori
POST   /api/messages/:id/read      - Marquer comme lu
POST   /api/messages/search        - Recherche
GET    /api/messages/stats         - Statistiques
```

---

## 🎨 Interface

L'interface s'inspire de Gmail/Outlook avec :
- **Sidebar gauche** : Dossiers et statistiques
- **Liste centrale** : Messages avec preview
- **Vue droite** : Message sélectionné avec détails
- **Composer modal** : Fenêtre d'édition flottante

---

## 🔧 Prochaines Améliorations (Optionnel)

- [ ] Threads de conversation améliorés
- [ ] Étiquettes personnalisées (UI)
- [ ] Templates de messages
- [ ] Signatures automatiques
- [ ] Filtres automatiques
- [ ] Réponses automatiques
- [ ] Intégration calendrier
- [ ] Mode hors ligne (Service Worker)

---

## 📝 Notes

- Le système utilise **Supabase Realtime** pour les notifications
- Les pièces jointes sont stockées dans **Supabase Storage**
- Les emails externes passent par **SendGrid**
- La planification nécessite un **cron job** (non implémenté, voir guide)

---

## 🆘 Support

En cas de problème, consultez :
1. [Guide de Mise en Œuvre](IMPLEMENTATION_GUIDE.md) - Section Dépannage
2. Logs du serveur backend
3. Console du navigateur (F12)
4. Supabase Dashboard → Logs

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024

