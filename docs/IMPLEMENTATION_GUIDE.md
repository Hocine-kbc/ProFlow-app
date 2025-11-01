# 📋 Guide de Mise en Œuvre - Messagerie Email ProFlow

Ce guide vous accompagne étape par étape pour implémenter la messagerie email complète dans ProFlow.

---

## 📦 Étape 1 : Installation des Dépendances

### Frontend

```bash
npm install date-fns
```

### Backend

```bash
npm install multer
```

### Vérification

Vérifiez que vous avez déjà installé :
- `@supabase/supabase-js` ✅
- `@sendgrid/mail` ✅
- `express` ✅
- `cors` ✅

---

## 🗄️ Étape 2 : Base de Données

### 2.1 Exécuter le schéma SQL

1. Ouvrez le **Supabase Dashboard** → **SQL Editor**
2. Copiez-collez le contenu du fichier `database/create_email_messaging_schema.sql`
3. Exécutez le script complet
4. Vérifiez que toutes les tables sont créées :
   - `messages` (étendue)
   - `message_labels`
   - `message_label_assignments`
   - `message_threads`
   - `spam_blacklist`
   - `message_search_index`

### 2.2 Créer le Storage Bucket

1. Dans Supabase Dashboard → **Storage**
2. Créez un bucket nommé `message-attachments`
3. Activez **Public** si vous voulez que les fichiers soient accessibles publiquement
4. Ou configurez les politiques RLS selon vos besoins

```sql
-- Politique pour permettre l'upload de fichiers
create policy "Users can upload their own attachments"
  on storage.objects
  for insert
  with check (
    bucket_id = 'message-attachments' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politique pour permettre la lecture
create policy "Users can view attachments"
  on storage.objects
  for select
  using (bucket_id = 'message-attachments');
```

---

## 🔧 Étape 3 : Configuration Backend

### 3.1 Variables d'Environnement

Ajoutez dans votre `.env` :

```env
# SendGrid (déjà configuré)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@votredomaine.com

# Supabase (déjà configuré)
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Backend
PORT=3001
```

### 3.2 Intégration des Routes

Le fichier `api/messages.js` est déjà créé. Vérifiez que `server.js` importe bien le router :

```javascript
import messagesRouter from './api/messages.js';
// ...
app.use('/api/messages', messagesRouter);
```

### 3.3 Tâche Planifiée pour les Messages Programmés

Créez un fichier `api/scheduled-messages.js` pour traiter les messages programmés :

```javascript
// Utiliser node-cron ou un service externe
// Cette fonction doit être appelée périodiquement pour envoyer les messages programmés
```

Ou utilisez **Supabase Edge Functions** avec un trigger cron.

---

## 🎨 Étape 4 : Frontend

### 4.1 Ajout des Composants

Tous les composants sont créés :
- ✅ `EmailInboxPage.tsx`
- ✅ `EmailComposer.tsx`
- ✅ `MessageItem.tsx`
- ✅ `MessageView.tsx`
- ✅ `EmailSidebar.tsx`
- ✅ `SearchBar.tsx`

### 4.2 Intégration dans l'Application

Mettez à jour `App.tsx` pour utiliser la nouvelle page :

```typescript
// Dans App.tsx
case 'messages':
  return <EmailInboxPage />;
```

Ou gardez `MessagesPage.tsx` existant et migrez progressivement.

### 4.3 Mise à Jour de la Navigation

Dans `Layout.tsx`, vérifiez que le lien "Messages" pointe vers la bonne page.

---

## ⚡ Étape 5 : Temps Réel avec Supabase

### 5.1 Activer Realtime sur Supabase

1. Dans Supabase Dashboard → **Database** → **Replication**
2. Activez la réplication pour la table `messages`

### 5.2 Écouter les Changements

Le code est déjà intégré dans `EmailInboxPage.tsx` :

```typescript
useEffect(() => {
  const channel = supabase
    .channel('messages:changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${currentUserId}`,
    }, (payload) => {
      // Recharger les messages
      loadMessages(currentFolder);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentUserId, currentFolder]);
```

---

## 🧪 Étape 6 : Tests

### 6.1 Test d'Envoi

1. Démarrez le serveur backend : `node server.js`
2. Ouvrez l'application frontend
3. Naviguez vers la messagerie
4. Composez un nouveau message
5. Vérifiez que le message apparaît dans "Envoyés"

### 6.2 Test de Réception

1. Connectez-vous avec un autre compte utilisateur
2. Vérifiez que le message apparaît dans la boîte de réception
3. Ouvrez le message et vérifiez qu'il est marqué comme lu

### 6.3 Test de Pièces Jointes

1. Composez un message avec une pièce jointe
2. Vérifiez que le fichier est uploadé dans Supabase Storage
3. Vérifiez que le destinataire peut télécharger le fichier

### 6.4 Test de Planification

1. Composez un message
2. Activez la planification
3. Sélectionnez une date/heure future
4. Envoyez
5. Vérifiez que le message est dans "Brouillons" avec statut "scheduled"
6. Après la date/heure, vérifiez qu'il est envoyé (nécessite un cron job)

---

## 🔐 Étape 7 : Sécurité

### 7.1 Vérification des RLS

Vérifiez que toutes les politiques RLS sont actives :

```sql
-- Vérifier les politiques
select * from pg_policies where tablename = 'messages';
```

### 7.2 Validation des Entrées

Assurez-vous que le backend valide :
- ✅ Format d'email
- ✅ Taille des fichiers (max 10MB)
- ✅ Longueur du contenu
- ✅ Authentification JWT

### 7.3 Protection contre le Spam

Le système calcule automatiquement un score de spam. Vous pouvez améliorer la fonction `calculateSpamScore` dans `api/messages.js`.

---

## 📊 Étape 8 : Optimisations

### 8.1 Pagination

Les routes backend supportent déjà la pagination :
```
GET /api/messages/inbox?page=1&limit=50
```

### 8.2 Index de Recherche

Le schéma inclut un index de recherche full-text. Pour l'utiliser :

```sql
SELECT * FROM message_search_index
WHERE to_tsvector('french', searchable_content) @@ to_tsquery('french', 'terme');
```

### 8.3 Cache

Considérez l'ajout d'un cache Redis pour :
- Statistiques de messagerie
- Résultats de recherche fréquents
- Liste des destinataires

---

## 🚀 Étape 9 : Déploiement

### 9.1 Backend (Vercel)

Le fichier `api/messages.js` doit être accessible via Vercel. Vérifiez `vercel.json` :

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 9.2 Variables d'Environnement

Ajoutez toutes les variables dans :
- Vercel Dashboard → Settings → Environment Variables
- Ou votre plateforme de déploiement

### 9.3 Supabase

Vérifiez que :
- ✅ Les politiques RLS sont correctes
- ✅ Le storage bucket est configuré
- ✅ Realtime est activé
- ✅ Les triggers SQL fonctionnent

---

## 🔄 Étape 10 : Migration depuis MessagesPage

Si vous avez déjà une `MessagesPage.tsx` :

1. **Option A** : Remplacer complètement
   - Supprimez l'ancienne `MessagesPage.tsx`
   - Utilisez directement `EmailInboxPage`

2. **Option B** : Migration progressive
   - Gardez les deux
   - Ajoutez un toggle dans l'interface
   - Migrez progressivement les utilisateurs

---

## 📝 Checklist Finale

- [ ] Base de données créée et migrée
- [ ] Storage bucket configuré
- [ ] Routes backend intégrées et testées
- [ ] Composants React intégrés
- [ ] Temps réel configuré
- [ ] Tests d'envoi/réception fonctionnels
- [ ] Pièces jointes testées
- [ ] Sécurité (RLS, validation) vérifiée
- [ ] Variables d'environnement configurées
- [ ] Déploiement effectué

---

## 🆘 Dépannage

### Problème : Messages non reçus en temps réel

**Solution** : Vérifiez que Realtime est activé dans Supabase et que les politiques RLS permettent la lecture.

### Problème : Pièces jointes ne s'uploadent pas

**Solution** : Vérifiez les permissions du bucket `message-attachments` et que Multer est correctement configuré.

### Problème : SendGrid n'envoie pas d'emails

**Solution** : Vérifiez que `SENDGRID_API_KEY` est configuré et que l'email d'expéditeur est vérifié dans SendGrid.

### Problème : Erreur CORS

**Solution** : Ajoutez votre domaine dans les settings Supabase → Authentication → URL Configuration.

---

## 📚 Ressources

- [Documentation Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Documentation SendGrid](https://docs.sendgrid.com/)
- [Documentation Multer](https://github.com/expressjs/multer)

---

## ✨ Fonctionnalités Futures (Optionnel)

- [ ] Templates de messages
- [ ] Signatures automatiques
- [ ] Filtres automatiques
- [ ] Réponses automatiques
- [ ] Intégration avec calendrier
- [ ] Rappels de suivi
- [ ] Statistiques avancées

---

**Bon développement ! 🚀**

