# Supprimer le projet Vercel et tout refaire depuis zéro

---

## Partie 1 : Supprimer le projet sur Vercel

1. Allez sur **https://vercel.com** et connectez-vous.
2. Cliquez sur votre **projet** (ex. ProFlow, ProFlow-app, ou le nom actuel).
3. Ouvrez **Settings** (Paramètres).
4. Descendez tout en bas jusqu’à la section **Danger Zone** (Zone de danger).
5. Cliquez sur **Delete Project** (Supprimer le projet).
6. Saisissez le nom du projet pour confirmer (comme indiqué à l’écran).
7. Validez la suppression.

Le projet et ses déploiements sont supprimés. Le dépôt GitHub n’est **pas** supprimé.

---

## Partie 2 : Recréer le projet sur Vercel (depuis zéro)

1. Sur **https://vercel.com**, cliquez sur **Add New…** → **Project**.
2. Choisissez **Import Git Repository** et connectez **GitHub** si ce n’est pas déjà fait.
3. Sélectionnez le dépôt de l’app (ex. **Hocine-kbc/ProFlow-app** ou le vôtre).
4. Cliquez sur **Import**.
5. **Configure the Project** :
   - **Project Name** : donnez un nom (ex. `proflow` ou `pro-flow-woad`).
   - **Framework Preset** : Vercel doit détecter **Vite**. Sinon, choisissez **Vite**.
   - **Root Directory** : laissez vide si le projet est à la racine du dépôt.
   - **Build Command** : `npm run build` (souvent déjà rempli).
   - **Output Directory** : `dist` (souvent déjà rempli).
6. **Environment Variables** : ajoutez **avant** de déployer :
   - `VITE_SUPABASE_URL` = `https://tdfhqkgvcgqgkrxarmui.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = votre clé anon (celle du fichier `.env`)
   - (Optionnel) `VITE_BACKEND_URL` = URL de votre backend si vous en avez un.
   - (Optionnel) `VITE_DISABLE_GOOGLE_LOGIN` = `true` si vous voulez masquer Google.
7. Cliquez sur **Deploy**.
8. Attendez la fin du build. Vercel vous donnera une nouvelle URL (ex. `https://votre-projet.vercel.app`).

---

## Partie 3 : Après le premier déploiement

1. **Notez la nouvelle URL** (ex. `https://xxx.vercel.app`).
2. **Supabase** → **Authentication** → **URL Configuration** :
   - **Site URL** : mettez cette nouvelle URL (sans espace à la fin).
   - **Redirect URLs** : ajoutez :
     - `https://votre-nouvelle-url.vercel.app/`
     - `https://votre-nouvelle-url.vercel.app/reset-password`
3. **Google Cloud** (si vous utilisez Google) : inutile de changer le Client ID ; les Redirect URIs côté Google restent `https://tdfhqkgvcgqgkrxarmui.supabase.co/auth/v1/callback`. Seul Supabase a besoin de connaître la nouvelle URL de votre app.

---

## Partie 4 : Domaine personnalisé (optionnel)

Si vous aviez un domaine (ex. `proflow-biz.vercel.app` ou un nom de domaine perso) :

1. Dans le **nouveau** projet Vercel → **Settings** → **Domains**.
2. Ajoutez le domaine souhaité et suivez les instructions Vercel (DNS, etc.).

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Vercel → projet → Settings → Danger Zone → **Delete Project** |
| 2 | Vercel → Add New → Project → **Import** le même dépôt Git |
| 3 | Configurer le projet (Vite, build, **variables d’environnement**) → **Deploy** |
| 4 | Mettre à jour **Site URL** et **Redirect URLs** dans Supabase avec la nouvelle URL Vercel |

Votre code et Supabase restent inchangés ; seul le “projet” Vercel est recréé proprement.
