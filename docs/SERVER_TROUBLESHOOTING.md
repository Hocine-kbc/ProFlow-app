# 🔧 Dépannage - Serveur Backend

## ❌ Problème : Le serveur ne démarre pas

### Erreur : `supabaseUrl is required`

**Cause** : Les variables d'environnement Supabase ne sont pas définies.

**Solution** :

1. **Créer un fichier `.env`** à la racine du projet :
   ```bash
   # Dans le terminal, à la racine du projet
   copy .env.example .env
   # Ou sur Linux/Mac : cp .env.example .env
   ```

2. **Remplir le fichier `.env`** avec vos vraies valeurs :
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

3. **Où trouver ces valeurs** :
   - Allez sur [Supabase Dashboard](https://app.supabase.com)
   - Sélectionnez votre projet
   - Allez dans **Settings** → **API**
   - Copiez l'URL et les clés

4. **Redémarrer le serveur** :
   ```bash
   node server.js
   ```

---

## ❌ Erreur : `Cannot find module 'multer'`

**Cause** : Le module `multer` n'est pas installé.

**Solution** :
```bash
npm install multer
```

---

## ❌ Erreur : `Cannot find module 'date-fns'`

**Cause** : Le module `date-fns` n'est pas installé.

**Solution** :
```bash
npm install date-fns
```

---

## ❌ Erreur : `Port 3001 is already in use`

**Cause** : Le port 3001 est déjà utilisé par un autre processus.

**Solution 1** : Arrêter le processus qui utilise le port
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

**Solution 2** : Changer le port dans `.env`
```env
PORT=3002
```

---

## ⚠️ Avertissement : `SENDGRID_API_KEY non configurée`

**Cause** : SendGrid n'est pas configuré.

**Impact** : Les emails externes ne pourront pas être envoyés, mais la messagerie interne fonctionnera.

**Solution** : Si vous voulez envoyer des emails externes :
1. Créez un compte sur [SendGrid](https://sendgrid.com)
2. Générez une clé API
3. Ajoutez-la dans `.env` :
   ```env
   SENDGRID_API_KEY=SG.your-key-here
   SENDGRID_FROM_EMAIL=noreply@votredomaine.com
   ```

---

## ✅ Vérifier que le serveur fonctionne

Une fois le serveur démarré, vous devriez voir :
```
✅ SendGrid configuré (ou ⚠️ si non configuré)
🚀 Serveur sur port 3001
```

Testez avec :
```bash
curl http://localhost:3001/api/test-connection
```

Vous devriez recevoir :
```json
{
  "success": true,
  "message": "Backend connecté et prêt",
  "timestamp": "2024-..."
}
```

---

## 📝 Checklist de Démarrage

- [ ] Fichier `.env` créé avec les variables Supabase
- [ ] Toutes les dépendances installées (`npm install`)
- [ ] Le port 3001 est libre
- [ ] Le serveur démarre sans erreur
- [ ] Le test de connexion fonctionne (`/api/test-connection`)

---

## 🆘 Besoin d'aide ?

1. Vérifiez les logs du serveur
2. Vérifiez que le fichier `.env` existe et contient les bonnes valeurs
3. Vérifiez que vous êtes à la racine du projet
4. Assurez-vous d'avoir Node.js installé (`node --version`)

