# 🚂 Guide de déploiement sur Railway.app

## 🎯 **Pourquoi Railway ?**

Railway supporte **Docker** et les **dépendances système complètes**, ce qui permet à **Puppeteer de fonctionner** avec votre **template exact** !

### **Avantages** :
- ✅ **Puppeteer fonctionne** (template exact !)
- ✅ **Simple à déployer** (connecter GitHub)
- ✅ **PostgreSQL/MySQL inclus** (si besoin)
- ✅ **Logs en temps réel**
- ✅ **Redéploiement automatique** (push GitHub)
- 💰 **$5/mois** (500h gratuit pour commencer)

---

## 📋 **Prérequis**

1. ✅ Compte GitHub (vous l'avez déjà)
2. ✅ Code sur GitHub (déjà fait)
3. 🆕 Compte Railway.app (à créer)

---

## 🚀 **ÉTAPE 1 : Créer un compte Railway**

1. Allez sur **https://railway.app**
2. Cliquez sur **"Login"** en haut à droite
3. Sélectionnez **"Login with GitHub"**
4. Autorisez Railway à accéder à votre compte GitHub
5. ✅ **Compte créé !**

**💡 Bonus** : Railway offre **$5 de crédit gratuit** (= 1 mois gratuit) ou **500h gratuites** pour commencer !

---

## 📦 **ÉTAPE 2 : Créer les fichiers nécessaires**

Railway a besoin de quelques fichiers pour savoir comment déployer votre application.

### **2.1 Créer `Dockerfile`** 🐳

Ce fichier indique à Railway comment préparer l'environnement avec toutes les dépendances Puppeteer.

```dockerfile
# Utiliser Node.js 18 avec dépendances système complètes
FROM node:18-bullseye

# Installer les dépendances système pour Puppeteer
RUN apt-get update && apt-get install -y \\
    wget \\
    ca-certificates \\
    fonts-liberation \\
    libappindicator3-1 \\
    libasound2 \\
    libatk-bridge2.0-0 \\
    libatk1.0-0 \\
    libcups2 \\
    libdbus-1-3 \\
    libgdk-pixbuf2.0-0 \\
    libnspr4 \\
    libnss3 \\
    libx11-xcb1 \\
    libxcomposite1 \\
    libxdamage1 \\
    libxrandr2 \\
    xdg-utils \\
    libgbm1 \\
    libxss1 \\
    libxtst6 \\
    lsb-release \\
    --no-install-recommends \\
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de l'application
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste de l'application
COPY . .

# Build du frontend (Vite)
RUN npm run build

# Exposer le port
EXPOSE 3001

# Démarrer le serveur
CMD ["node", "server.js"]
```

### **2.2 Créer `.dockerignore`**

```
node_modules
.git
.env
dist
*.log
.DS_Store
.vercel
```

### **2.3 Créer `railway.json`** (configuration Railway)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 🔧 **ÉTAPE 3 : Adapter le code pour Railway**

### **3.1 Vérifier `server.js`**

Votre `server.js` doit écouter sur le port fourni par Railway :

```javascript
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
```

✅ **Déjà fait !** (Votre code est déjà compatible)

### **3.2 Mettre à jour `package.json`**

Ajoutez un script `start` :

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "node server.js"
  }
}
```

---

## 🚂 **ÉTAPE 4 : Déployer sur Railway**

### **4.1 Créer un nouveau projet**

1. Sur **https://railway.app/dashboard**, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Recherchez et sélectionnez votre repo **`ProFlow-app`**
4. Railway détecte automatiquement le `Dockerfile`
5. Cliquez sur **"Deploy Now"**

### **4.2 Attendre le build**

- 🔨 Railway va construire l'image Docker (~3-5 minutes)
- 📦 Installer toutes les dépendances (y compris Puppeteer)
- 🚀 Démarrer votre application

**Statut** : Vous verrez les logs en temps réel dans l'interface Railway

---

## ⚙️ **ÉTAPE 5 : Configurer les variables d'environnement**

### **5.1 Aller dans Settings**

1. Dans votre projet Railway, cliquez sur votre service
2. Allez dans l'onglet **"Variables"**
3. Cliquez sur **"New Variable"** pour chaque variable

### **5.2 Ajouter TOUTES les variables**

| Variable | Valeur | Source |
|----------|--------|--------|
| `NODE_ENV` | `production` | - |
| `PORT` | `3001` | - |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Dashboard |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` | Supabase Dashboard |
| `GMAIL_USER` | `votre.email@gmail.com` | Votre Gmail |
| `GMAIL_APP_PASSWORD` | `abcdefghijklmnop` | Mot de passe d'app Gmail |

**OU** (si vous utilisez SendGrid) :

| Variable | Valeur |
|----------|--------|
| `SENDGRID_API_KEY` | `SG.xxx...` |
| `SENDGRID_FROM_EMAIL` | `noreply@votre-domaine.com` |

### **5.3 Redéployer**

Après avoir ajouté les variables :
1. Cliquez sur **"Deploy"** en haut à droite
2. OU Railway redémarrera automatiquement

---

## 🌐 **ÉTAPE 6 : Obtenir l'URL de votre application**

### **6.1 Générer un domaine**

1. Dans votre projet Railway, allez dans **"Settings"**
2. Section **"Domains"**
3. Cliquez sur **"Generate Domain"**
4. Railway vous donne une URL : `https://proflow-production.up.railway.app`

### **6.2 (Optionnel) Ajouter un domaine personnalisé**

1. Cliquez sur **"Custom Domain"**
2. Entrez votre domaine : `facturation.votre-domaine.com`
3. Configurez les DNS selon les instructions Railway
4. ✅ Votre app sera accessible sur votre propre domaine !

---

## 🧪 **ÉTAPE 7 : Tester**

### **7.1 Vérifier que l'app fonctionne**

1. Visitez votre URL Railway : `https://proflow-production.up.railway.app`
2. ✅ L'application devrait se charger

### **7.2 Tester l'envoi de facture**

1. Connectez-vous à votre application
2. Créez/sélectionnez une facture
3. Cliquez sur **"Envoyer par email"**
4. 🎉 **Ça devrait fonctionner avec Puppeteer !**

### **7.3 Vérifier les logs**

Dans Railway :
1. Allez dans l'onglet **"Deployments"**
2. Cliquez sur le dernier déploiement
3. Consultez les logs en temps réel

**Vous devriez voir** :
```
🚀 Lancement de Puppeteer pour Vercel...
✅ Browser lancé
✅ PDF généré avec Puppeteer (taille: 125000 octets)
📄 Méthode PDF utilisée: Puppeteer (rendu exact)
```

---

## 💰 **ÉTAPE 8 : Tarification Railway**

### **Plan gratuit** (Trial) :
- 🆓 **$5 de crédit gratuit** OU **500h gratuites**
- ✅ Parfait pour tester pendant 1 mois

### **Plan Developer** :
- 💰 **$5/mois** (usage minimal)
- 💰 **Pay-as-you-go** ensuite
- 📊 Dashboard pour suivre la consommation

### **Estimation pour ProFlow** :
- Serveur actif 24/7 : ~$5/mois
- Factures envoyées : ~$0 (négligeable)
- **Total estimé : $5-7/mois**

---

## 🔄 **ÉTAPE 9 : Workflow après déploiement**

### **Mettre à jour votre application** :

1. Modifiez votre code localement
2. Committez et poussez sur GitHub :
   ```bash
   git add .
   git commit -m "feat: nouvelle fonctionnalité"
   git push origin main
   ```
3. ✅ **Railway redéploie automatiquement** !

**Temps de déploiement** : ~2-3 minutes

---

## 🆚 **Comparaison Vercel vs Railway**

| Critère | Vercel | Railway |
|---------|--------|---------|
| **Puppeteer** | ❌ Ne fonctionne pas | ✅ Fonctionne |
| **Template PDF exact** | ❌ Non (jsPDF) | ✅ Oui (Puppeteer) |
| **Prix** | 🆓 Gratuit | 💰 $5/mois |
| **Déploiement** | ✅ Automatique | ✅ Automatique |
| **Logs** | ✅ Bons | ✅ Excellents |
| **Custom domain** | ✅ Oui | ✅ Oui |
| **Base de données** | ⚠️ Externe (Supabase) | ✅ Intégrée (optionnel) |

---

## ⚠️ **Points d'attention**

### **1. Build time**
- Premier build : ~5 minutes (Docker + dépendances)
- Builds suivants : ~2-3 minutes (cache Docker)

### **2. Cold start**
- Railway : ~5-10 secondes
- Mais serveur reste actif (pas de sleep par défaut)

### **3. Coût**
- Surveillez votre usage dans le Dashboard
- Configurez des alertes de budget

---

## 🎁 **Bonus : Script de déploiement automatique**

Créez `deploy-railway.sh` :

```bash
#!/bin/bash

echo "🚂 Déploiement sur Railway..."

# Build et test en local
echo "📦 Build local..."
npm run build

# Push vers GitHub (Railway détectera automatiquement)
echo "📤 Push vers GitHub..."
git add .
git commit -m "deploy: Update application"
git push origin main

echo "✅ Code poussé ! Railway va redéployer automatiquement."
echo "🔍 Suivez les logs sur: https://railway.app/dashboard"
```

Usage :
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

---

## 🐛 **Dépannage**

### **Problème 1 : Build échoue**

**Symptôme** : `npm install` ou `npm run build` échoue

**Solution** :
1. Vérifiez les logs de build dans Railway
2. Vérifiez que `package.json` est correct
3. Testez le build en local : `npm run build`

### **Problème 2 : Application ne démarre pas**

**Symptôme** : Serveur crash au démarrage

**Solution** :
1. Vérifiez que `PORT` est bien utilisé : `process.env.PORT`
2. Vérifiez les variables d'environnement
3. Consultez les logs Runtime dans Railway

### **Problème 3 : Puppeteer échoue toujours**

**Symptôme** : Même erreur qu'avec Vercel

**Solution** :
1. Vérifiez que le `Dockerfile` est bien utilisé
2. Dans Railway Settings → Check "Dockerfile Path"
3. Redéployez from scratch (Delete + New deployment)

---

## ✅ **Checklist finale**

Avant de déployer, vérifiez :

- [ ] ✅ `Dockerfile` créé à la racine du projet
- [ ] ✅ `.dockerignore` créé
- [ ] ✅ `railway.json` créé
- [ ] ✅ `package.json` a un script `"start": "node server.js"`
- [ ] ✅ `server.js` utilise `process.env.PORT`
- [ ] ✅ Code committé et poussé sur GitHub
- [ ] ✅ Compte Railway créé
- [ ] ✅ Projet Railway créé depuis GitHub
- [ ] ✅ Variables d'environnement configurées
- [ ] ✅ Domaine généré ou personnalisé
- [ ] ✅ Application testée !

---

## 🎉 **Résumé**

### **Ce que vous allez faire** :
1. ✅ Créer les fichiers Docker
2. ✅ Pousser sur GitHub
3. ✅ Connecter Railway à GitHub
4. ✅ Configurer les variables
5. ✅ Déployer automatiquement
6. ✅ **Profiter de Puppeteer avec template exact !**

### **Temps estimé** : 
- Setup initial : ~30 minutes
- Déploiements suivants : ~2 minutes (automatique)

### **Coût** :
- 🆓 1er mois gratuit ($5 de crédit)
- 💰 ~$5-7/mois ensuite

---

## 🚀 **Prêt à commencer ?**

Dites-moi et je vais :
1. Créer tous les fichiers nécessaires (Dockerfile, etc.)
2. Les committer sur GitHub
3. Vous guider étape par étape pour Railway

**On y va ? 🎯**

