# Configuration pour que la prod fonctionne comme en local

En local vous avez le fichier `.env`. En production (Vercel), il faut **définir les mêmes variables** dans le projet Vercel.

---

## 1. Variables d’environnement sur Vercel

1. Ouvrez **https://vercel.com** → votre projet → **Settings** → **Environment Variables**.
2. Ajoutez les variables suivantes (pour l’environnement **Production**, et éventuellement Preview) :

| Nom | Valeur | Obligatoire pour |
|-----|--------|-------------------|
| `VITE_SUPABASE_URL` | `https://tdfhqkgvcgqgkrxarmui.supabase.co` | Connexion, auth, données |
| `VITE_SUPABASE_ANON_KEY` | votre clé anon (comme dans `.env`) | Connexion, auth, données |
| `VITE_BACKEND_URL` | URL de votre backend en prod (voir ci‑dessous) | Envoi de factures par email |

Sans `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, **l’auth et les données ne marcheront pas en prod**.

---

## 2. Backend (envoi d’emails / factures)

En local, le backend tourne sur `http://localhost:3001`. En prod, il doit être hébergé ailleurs (Railway, Render, autre Vercel, etc.).

- Une fois le backend déployé, récupérez son URL (ex. `https://votre-app.onrender.com`).
- Dans Vercel, définissez :  
  **`VITE_BACKEND_URL`** = `https://votre-app.onrender.com`  
  (sans `/api` à la fin, le code l’ajoute.)

Si vous ne déployez pas encore le backend, l’envoi de factures par email ne fonctionnera pas en prod, mais le reste (connexion, données) peut fonctionner si les variables Supabase sont bien définies.

---

## 3. Supabase : URLs de redirection (connexion Google, etc.)

1. **https://supabase.com/dashboard** → projet **tdfhqkgvcgqgkrxarmui**.
2. **Authentication** → **URL Configuration**.
3. **Site URL** : mettez l’URL de votre app en prod, ex. `https://pro-flow-woad.vercel.app`.
4. **Redirect URLs** : ajoutez au moins :
   - `https://pro-flow-woad.vercel.app/`
   - `https://pro-flow-woad.vercel.app/reset-password`

Sans ça, la connexion Google (ou le lien de réinitialisation de mot de passe) peut échouer en prod.

---

## 4. Résumé rapide

| Problème en prod | Vérification |
|------------------|--------------|
| Connexion / auth ne marchent pas | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` définis sur Vercel + Redirect URLs dans Supabase |
| Connexion Google échoue ou 404 | Redirect URLs contient bien l’URL de prod (ex. `https://pro-flow-woad.vercel.app/`) |
| Envoi de facture ne marche pas | Backend déployé et `VITE_BACKEND_URL` défini sur Vercel |

Après chaque modification des variables sur Vercel, **redéployez** le projet (Deployments → … → Redeploy).
