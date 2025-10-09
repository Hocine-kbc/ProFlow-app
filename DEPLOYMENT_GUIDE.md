# Configuration pour le déploiement ProFlow

## Variables d'environnement requises :

1. **VITE_SUPABASE_URL** : L'URL de votre projet Supabase
   - Format : https://your-project-id.supabase.co
   - Trouvez-la dans : Supabase Dashboard > Settings > API

2. **VITE_SUPABASE_ANON_KEY** : La clé anonyme Supabase
   - Trouvez-la dans : Supabase Dashboard > Settings > API > Project API keys

## Étapes de déploiement :

### Option 1 : Vercel CLI (Recommandé)
1. Se connecter à Vercel : `vercel login`
2. Déployer : `vercel`
3. Configurer les variables dans le dashboard Vercel

### Option 2 : GitHub + Vercel
1. Créer un repository GitHub
2. Pousser le code : `git push`
3. Connecter Vercel à GitHub
4. Configurer les variables d'environnement

### Option 3 : Netlify
1. Aller sur netlify.com
2. Connecter votre repository GitHub
3. Configurer : Build command: `npm run build`, Publish directory: `dist`
4. Ajouter les variables d'environnement

## Configuration Supabase pour la production :

1. **CORS** : Ajouter votre domaine de production dans les settings Supabase
2. **RLS** : Vérifier que vos politiques de sécurité sont correctes
3. **Auth** : Configurer les URLs de redirection pour la production
