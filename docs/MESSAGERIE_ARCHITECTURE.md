# 📧 Architecture Technique - Système de Messagerie Email ProFlow

## 🎯 Vue d'ensemble

Cette architecture propose une messagerie interne complète de type "email client" (Gmail/Outlook) intégrée à ProFlow, utilisant Supabase pour la base de données et les notifications temps réel, et SendGrid pour l'envoi d'emails externes.

---

## 🏗️ Architecture Générale

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   InboxPage  │  │   Composer    │  │  MessageView │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  SearchBar   │  │   Filters    │  │   Labels     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ WebSocket (Supabase Realtime)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   BACKEND (Node.js/Express)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  MessagesAPI │  │  SendGridAPI │  │  FileUpload  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Scheduler  │  │   SpamFilter  │  │  JWT Auth    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ PostgreSQL (Supabase)
                            │ Storage (Supabase Storage)
                            │ Realtime (Supabase Realtime)
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  SUPABASE INFRASTRUCTURE                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Database   │  │   Storage    │  │   Realtime   │     │
│  │   (PostgreSQL)│  │   (Buckets)  │  │  (Channels)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SMTP/API
                            │
                    ┌───────▼────────┐
                    │   SendGrid     │
                    │   (Email SMTP) │
                    └────────────────┘
```

---

## 📊 Schéma de Base de Données

### Tables Principales

#### 1. `messages` (existante, à étendre)
- **Idées** : Support des brouillons, archivage, favoris, planification

#### 2. `message_labels` (nouvelle)
- Gestion des étiquettes personnalisées (ex: Important, Projet X, Personnel)

#### 3. `message_scheduled` (nouvelle)
- Messages programmés pour envoi différé

#### 4. `message_threads` (nouvelle)
- Regroupement de messages en threads (conversations)

#### 5. `message_spam` (nouvelle)
- Liste noire et détection de spam

---

## 🎨 Structure Frontend

### Composants Principaux

1. **EmailInboxPage** - Page principale avec boîte de réception
2. **EmailComposer** - Éditeur de message (comme Gmail)
3. **MessageItem** - Item de liste de message
4. **MessageView** - Vue détaillée d'un message
5. **EmailSidebar** - Barre latérale avec dossiers/étiquettes
6. **SearchBar** - Barre de recherche avec filtres
7. **AttachmentViewer** - Visualiseur de pièces jointes

### Routing

```
/messages
  ├── /inbox          - Boîte de réception
  ├── /sent           - Messages envoyés
  ├── /drafts         - Brouillons
  ├── /trash          - Corbeille
  ├── /archive        - Archivés
  ├── /starred        - Favoris
  └── /compose        - Nouveau message
```

---

## 🔧 Backend API Routes

### Endpoints REST

```
POST   /api/messages              - Envoyer un message
GET    /api/messages/inbox        - Liste des messages reçus
GET    /api/messages/sent         - Liste des messages envoyés
GET    /api/messages/drafts       - Liste des brouillons
GET    /api/messages/:id          - Détails d'un message
PUT    /api/messages/:id          - Mettre à jour un message
DELETE /api/messages/:id          - Supprimer un message
POST   /api/messages/:id/archive  - Archiver un message
POST   /api/messages/:id/star    - Marquer comme favori
POST   /api/messages/:id/read    - Marquer comme lu
POST   /api/messages/search      - Recherche de messages
POST   /api/messages/schedule     - Planifier un envoi
POST   /api/messages/:id/attachments - Ajouter une pièce jointe
GET    /api/messages/stats        - Statistiques
```

---

## ⚡ Temps Réel (Supabase Realtime)

### Channels

1. **`messages:user:{userId}`** - Messages pour un utilisateur
2. **`notifications:user:{userId}`** - Notifications en temps réel

### Événements

- `new_message` - Nouveau message reçu
- `message_read` - Message marqué comme lu
- `message_deleted` - Message supprimé
- `status_change` - Changement de statut (archivé, favori, etc.)

---

## 🔒 Sécurité

1. **JWT Authentication** - Vérification via Supabase Auth
2. **RLS (Row Level Security)** - Politiques Supabase
3. **Input Validation** - Validation côté serveur
4. **Spam Filtering** - Détection de spam basique
5. **File Upload Limits** - Limites de taille/type de fichiers
6. **Rate Limiting** - Limitation de requêtes par utilisateur

---

## 📦 Dépendances Requises

### Frontend
- `@supabase/supabase-js` - Déjà installé
- `lucide-react` - Déjà installé
- `date-fns` - Pour le formatage de dates (à installer)

### Backend
- `@sendgrid/mail` - Déjà installé
- `express` - Déjà installé
- `multer` - Pour l'upload de fichiers (à installer)
- `node-cron` - Pour la planification (à installer)
- `validator` - Pour la validation (à installer)

---

## 🚀 Étapes de Mise en Œuvre

Voir le fichier `IMPLEMENTATION_GUIDE.md` pour les étapes détaillées.

---

## 📝 Notes Techniques

1. **Performance** : Pagination pour les listes de messages
2. **UX** : Optimistic updates pour une meilleure réactivité
3. **Offline** : Service Worker pour le mode hors ligne (optionnel)
4. **Mobile** : Design responsive avec TailwindCSS
5. **Accessibility** : Support ARIA pour l'accessibilité

---

## 🎯 Fonctionnalités Clés

- ✅ Boîte de réception avec tri et filtres
- ✅ Envoi/réception de messages
- ✅ Pièces jointes (multifichiers)
- ✅ Indicateurs lu/non lu
- ✅ Recherche avancée
- ✅ Notifications temps réel
- ✅ Planification d'envoi
- ✅ Étiquettes et favoris
- ✅ Archivage et corbeille
- ✅ Sécurité et validation

