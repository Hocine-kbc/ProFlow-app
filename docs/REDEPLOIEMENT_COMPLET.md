# Étapes pour redéployer complètement l'app ProFlow

---

## 1. Préparer le code (local)

1. **Sauvegarder les changements**  
   Vérifiez que tous vos fichiers sont enregistrés dans l’éditeur.

2. **Commit et push vers GitHub** (si vous utilisez Git)  
   ```bash
   git add .
   git status
   git commit -m "Mise à jour avant redéploiement"
   git push origin main
   ```
   Remplacez `main` par le nom de votre branche si besoin.

---

## 2. Variables d'environnement sur Vercel

1. Allez sur **https://vercel.com** → connexion.
2. Sélectionnez le projet **ProFlow** (ou le nom de votre app).
3. **Settings** → **Environment Variables**.
4. Vérifiez que ces variables existent pour **Production** (et Preview si vous voulez) :

   | Nom | Exemple de valeur |
   |-----|--------------------|
   | `VITE_SUPABASE_URL` | `https://tdfhqkgvcgqgkrxarmui.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | votre clé anon (commence par `eyJ...`) |
   | `VITE_BACKEND_URL` | URL de votre backend en prod (si vous en avez un) |
   | `VITE_DISABLE_GOOGLE_LOGIN` | `true` uniquement si vous voulez masquer le bouton Google |

5. Modifiez ou ajoutez les variables si besoin, puis **Save**.

---

## 3. Déclencher le redéploiement sur Vercel

**Option A – Depuis le tableau de bord Vercel**

1. **https://vercel.com** → votre projet.
2. Onglet **Deployments**.
3. Sur le dernier déploiement, cliquez sur les **3 points** (⋮) → **Redeploy**.
4. Cochez **Use existing Build Cache** si vous voulez aller plus vite, ou décochez pour un build “propre”.
5. Cliquez sur **Redeploy**.

**Option B – Depuis Git (nouveau déploiement automatique)**

1. Après un `git push origin main`, Vercel déclenche automatiquement un nouveau déploiement si le projet est relié à GitHub.
2. Attendez la fin du build dans l’onglet **Deployments** (statut “Ready”).

---

## 4. Vérifier le déploiement

1. Une fois le déploiement **Ready**, cliquez sur **Visit** (ou ouvrez l’URL de prod, ex. `https://pro-flow-woad.vercel.app`).
2. Testez :
   - Connexion (email + mot de passe).
   - Connexion Google (si vous n’avez pas mis `VITE_DISABLE_GOOGLE_LOGIN=true`).
   - Navigation et principales pages.

---

## 5. (Optionnel) Backend Node (envoi d’emails / factures)

Si vous hébergez le backend (`server.js`) ailleurs (Railway, Render, etc.) :

1. Connectez votre dépôt Git au service (ou uploadez le code).
2. Définissez les variables d’environnement (comme dans votre `.env` : `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, etc.).
3. Déployez ou **Redeploy** le service.
4. Copiez l’URL du backend (ex. `https://votre-app.onrender.com`) et mettez-la dans **Vercel** en **`VITE_BACKEND_URL`** (sans `/api` à la fin), puis redéployez le frontend (étape 3).

---

## 6. Supabase (déjà en place)

- Pas besoin de “redéployer” Supabase : la base et l’auth restent les mêmes.
- Si vous avez déployé des **Edge Functions** (auth-callback, custom-access-token, delete-user-account), elles sont déjà actives.
- Vérifiez seulement **Authentication** → **URL Configuration** : **Site URL** et **Redirect URLs** sans espace en trop (ex. `https://pro-flow-woad.vercel.app` et `https://pro-flow-woad.vercel.app/`).

---

## Résumé rapide

1. **Code** : `git add .` → `git commit` → `git push origin main`.
2. **Vercel** : Settings → Environment Variables (vérifier) → Deployments → **Redeploy** (ou attendre le déploiement auto après le push).
3. **Tester** l’URL de prod (connexion, Google, navigation).
4. **Backend** (optionnel) : redéployer sur Railway/Render, puis mettre à jour `VITE_BACKEND_URL` sur Vercel et redéployer le frontend.
