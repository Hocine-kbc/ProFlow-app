# 📝 Étapes d'Intégration - Messagerie Email

## ✅ Ce qui a été fait automatiquement

1. ✅ `EmailInboxPage` importé dans `App.tsx`
2. ✅ Route `messages` mise à jour pour utiliser `EmailInboxPage`
3. ✅ Composants créés et prêts

## 🔧 Étapes à suivre maintenant

### 1. Vérifier que le serveur backend démarre

Dans un terminal :
```bash
node server.js
```

Vous devriez voir :
```
✅ SendGrid configuré (ou ⚠️ si non configuré)
🚀 Serveur sur port 3001
```

Si vous voyez des erreurs, vérifiez votre fichier `.env`.

---

### 2. Démarrer le frontend

Dans un **autre terminal** :
```bash
npm run dev
```

---

### 3. Accéder à la messagerie

1. Ouvrez votre navigateur sur `http://localhost:5173` (ou le port indiqué)
2. Connectez-vous à votre compte
3. Cliquez sur **"Messages"** dans le menu de gauche

---

### 4. Vérifier la base de données

**Important** : Avant d'utiliser la messagerie, vous devez exécuter le schéma SQL !

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Copiez-collez le contenu de `database/create_email_messaging_schema.sql`
5. Cliquez sur **Run**

Vérifiez que les tables suivantes sont créées :
- ✅ `messages` (avec les nouvelles colonnes)
- ✅ `message_labels`
- ✅ `message_label_assignments`
- ✅ `message_threads`
- ✅ `spam_blacklist`
- ✅ `message_search_index`

---

### 5. Créer le bucket Storage

1. Dans Supabase Dashboard → **Storage**
2. Cliquez sur **New bucket**
3. Nom : `message-attachments`
4. Cochez **Public bucket** (ou configurez les politiques RLS)
5. Cliquez sur **Create bucket**

---

## 🐛 Problèmes courants

### La page Messages est blanche / erreur dans la console

**Cause** : Le schéma SQL n'a pas été exécuté ou les tables manquent.

**Solution** : Exécutez `database/create_email_messaging_schema.sql` dans Supabase.

---

### Erreur : "Cannot read properties of undefined"

**Cause** : Les données ne sont pas au bon format ou des colonnes manquent.

**Solution** : Vérifiez que vous avez bien exécuté le schéma SQL complet.

---

### Les messages ne s'affichent pas

**Cause** : Pas de messages dans la base de données.

**Solution** : 
1. Créez un nouveau message via le bouton "Nouveau message"
2. Ou vérifiez dans Supabase que la table `messages` contient des données

---

### Erreur de locale française (date-fns)

Si vous voyez une erreur concernant `fr` de `date-fns/locale`, installez la locale :

```bash
npm install date-fns
```

La locale devrait être disponible automatiquement.

---

## ✅ Checklist de vérification

- [ ] Serveur backend démarré (`node server.js`)
- [ ] Frontend démarré (`npm run dev`)
- [ ] Fichier `.env` configuré avec Supabase
- [ ] Schéma SQL exécuté dans Supabase
- [ ] Bucket `message-attachments` créé
- [ ] Page Messages accessible dans l'app
- [ ] Aucune erreur dans la console du navigateur (F12)

---

## 🎯 Test rapide

Une fois tout configuré :

1. Cliquez sur "Messages" dans le menu
2. Vous devriez voir l'interface avec :
   - Sidebar gauche (dossiers)
   - Zone centrale (liste de messages)
   - Zone droite (vide, se remplit quand on clique sur un message)
3. Cliquez sur "Nouveau message"
4. Remplissez et envoyez un test

---

## 📞 Si ça ne fonctionne toujours pas

1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs
3. Vérifiez les logs du serveur backend
4. Vérifiez que toutes les étapes ci-dessus sont complétées

