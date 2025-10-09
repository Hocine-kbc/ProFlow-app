# Guide de Déploiement ProFlow

## 🚀 Options de Déploiement

### 1. **Vercel** (Recommandé - Gratuit)

#### Étapes :
1. **Préparer l'application** :
   ```bash
   npm install
   npm run build
   ```

2. **Installer Vercel CLI** :
   ```bash
   npm install -g vercel
   ```

3. **Déployer** :
   ```bash
   vercel
   ```

4. **Configurer les variables d'environnement** dans le dashboard Vercel :
   - `VITE_SUPABASE_URL` : Votre URL Supabase
   - `VITE_SUPABASE_ANON_KEY` : Votre clé anonyme Supabase

### 2. **Netlify** (Alternative gratuite)

#### Étapes :
1. **Connecter votre repository GitHub** sur netlify.com
2. **Configurer le build** :
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Ajouter les variables d'environnement** dans les paramètres

### 3. **GitHub Pages** (Gratuit)

#### Étapes :
1. **Installer gh-pages** :
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Ajouter le script dans package.json** :
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Déployer** :
   ```bash
   npm run deploy
   ```

## 🔧 Configuration Requise

### Variables d'environnement :
- `VITE_SUPABASE_URL` : URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé anonyme Supabase

### Fichiers de configuration :
- `vercel.json` : Configuration Vercel (déjà créé)
- `.env.example` : Exemple de variables d'environnement

## 📝 Notes Importantes

1. **Supabase** : Assurez-vous que votre base de données Supabase est configurée pour accepter les requêtes depuis votre domaine de production
2. **CORS** : Configurez les domaines autorisés dans Supabase
3. **HTTPS** : Tous les déploiements modernes utilisent HTTPS par défaut

## 🎯 Prochaines Étapes

1. Résoudre les problèmes de build local
2. Configurer les variables d'environnement
3. Déployer sur Vercel
4. Tester l'application en production
