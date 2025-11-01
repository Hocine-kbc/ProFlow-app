# 🚀 Guide de Démarrage Rapide - Messagerie Email

## ⚡ Étapes Rapides (5 minutes)

### 1️⃣ Démarrer le serveur backend

```bash
node server.js
```

**✅ Vérification** : Vous devriez voir `🚀 Serveur sur port 3001`

---

### 2️⃣ Démarrer le frontend (dans un NOUVEAU terminal)

```bash
npm run dev
```

**✅ Vérification** : L'app s'ouvre sur `http://localhost:5173` (ou autre port)

---

### 3️⃣ Exécuter le schéma SQL dans Supabase

**⚠️ IMPORTANT** : Sans cette étape, la messagerie ne fonctionnera pas !

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Menu gauche → **SQL Editor**
4. Créez une nouvelle query
5. Ouvrez le fichier `database/create_email_messaging_schema.sql`
6. **Copiez TOUT le contenu**
7. Collez dans l'éditeur SQL
8. Cliquez sur **Run** (ou F5)
9. Attendez que tout soit créé (vous verrez "Success")

**✅ Vérification** : Dans Supabase → **Table Editor**, vous devriez voir les nouvelles tables :
- `messages` (avec beaucoup de colonnes)
- `message_labels`
- `message_threads`
- etc.

---

### 4️⃣ Créer le bucket Storage

1. Dans Supabase → **Storage**
2. Cliquez sur **New bucket**
3. Nom : `message-attachments`
4. Cochez **Public bucket**
5. Cliquez sur **Create**

---

### 5️⃣ Tester l'interface

1. Ouvrez votre app dans le navigateur
2. **Connectez-vous** avec votre compte
3. Cliquez sur **"Messages"** dans le menu de gauche (icône MessageCircle)

**✅ Vous devriez voir** :
- Une sidebar à gauche avec des dossiers (Inbox, Envoyés, Brouillons, etc.)
- Au centre : une liste (vide pour l'instant)
- Un bouton "Nouveau message" en haut à droite

---

## 🎯 Tester l'envoi d'un message

1. Cliquez sur **"Nouveau message"**
2. Dans le champ **"À"**, entrez l'email d'un autre utilisateur de votre app
3. Ajoutez un **objet** et un **message**
4. Cliquez sur **"Envoyer"**

**✅ Vérification** : 
- Le message devrait apparaître dans "Messages envoyés"
- Si vous vous connectez avec l'autre utilisateur, le message devrait être dans "Boîte de réception"

---

## ❌ Si ça ne fonctionne pas

### Erreur : Page blanche

**Cause** : Le schéma SQL n'a pas été exécuté

**Solution** : Retournez à l'étape 3, vérifiez que TOUT le script SQL a été exécuté

---

### Erreur dans la console : "Cannot read property..."

**Cause** : Des colonnes manquent dans la table `messages`

**Solution** : 
1. Dans Supabase → **Table Editor** → `messages`
2. Vérifiez qu'il y a beaucoup de colonnes (status, is_starred, folder, etc.)
3. Si non, réexécutez le schéma SQL

---

### Le serveur ne démarre pas

**Cause** : Variables d'environnement manquantes

**Solution** :
1. Vérifiez que le fichier `.env` existe à la racine
2. Vérifiez qu'il contient :
   ```
   VITE_SUPABASE_URL=https://votre-projet.supabase.co
   VITE_SUPABASE_ANON_KEY=votre-cle
   SUPABASE_SERVICE_KEY=votre-service-key
   ```

---

### Les messages ne s'affichent pas

**Cause** : 
- Pas de messages dans la base
- Erreur de connexion Supabase

**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Regardez les erreurs dans l'onglet Console
3. Vérifiez l'onglet Network pour voir si les requêtes échouent

---

## 📋 Checklist Finale

- [ ] Serveur backend démarré (`node server.js`)
- [ ] Frontend démarré (`npm run dev`)
- [ ] Fichier `.env` configuré
- [ ] Schéma SQL exécuté dans Supabase
- [ ] Bucket `message-attachments` créé
- [ ] Page Messages accessible
- [ ] Aucune erreur dans la console (F12)

---

## 🆘 Besoin d'aide ?

Consultez :
- `docs/INTEGRATION_STEPS.md` - Guide détaillé
- `docs/SERVER_TROUBLESHOOTING.md` - Dépannage serveur
- `docs/IMPLEMENTATION_GUIDE.md` - Guide complet

---

**Une fois que tout fonctionne, vous devriez voir l'interface complète de messagerie avec tous les dossiers et fonctionnalités ! 🎉**

