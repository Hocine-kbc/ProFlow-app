# Configuration Supabase Auth (connexion Google + réinitialisation mot de passe)

Ce guide permet de faire fonctionner **la connexion avec Google** et **le changement / réinitialisation de mot de passe** en production.

---

## 1. Connexion avec Google

### Dans Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Créez des **identifiants OAuth 2.0** (type **Application Web**) ou modifiez les existants.
3. Dans **Authorized redirect URIs**, ajoutez **exactement** :
   ```
   https://<VOTRE_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   Remplacez `<VOTRE_PROJECT_REF>` par l’ID de votre projet Supabase (ex. `tdfhqkgvcgqgkrxarmui`).
   Exemple : `https://tdfhqkgvcgqgkrxarmui.supabase.co/auth/v1/callback`
4. Notez le **Client ID** et le **Client Secret**.

### Dans Supabase Dashboard

1. **Authentication** → **Providers** → **Google**.
2. Activez **Google**.
3. Collez le **Client ID** et le **Client Secret** de Google.
4. Enregistrez.

---

## 2. Réinitialisation de mot de passe (lien par email)

Pour que le lien “Mot de passe oublié” fonctionne en production :

1. **Authentication** → **URL Configuration** (ou **Configuration**).
2. **Site URL** : mettez l’URL de votre app en production, ex. :
   ```
   https://proflow-biz.vercel.app
   ```
3. **Redirect URLs** : ajoutez toutes les URLs autorisées après connexion / reset, une par ligne, par exemple :
   ```
   https://proflow-biz.vercel.app/
   https://proflow-biz.vercel.app/reset-password
   http://localhost:5173/
   http://localhost:5173/reset-password
   ```
   Sans ces URLs, le lien de réinitialisation peut être refusé ou ne pas ouvrir la bonne page.

---

## 3. Vérifications rapides

| Problème | Vérification |
|----------|---------------|
| Connexion Google ne fait rien ou erreur | Redirect URI dans Google = `https://<project_ref>.supabase.co/auth/v1/callback` |
| "DEPLOYMENT_NOT_FOUND" à la connexion | Pas de Auth Hook configuré, ou désactiver le hook dans **Auth Hooks** |
| Lien “Mot de passe oublié” ne marche pas | **Redirect URLs** contient `https://votre-domaine/reset-password` et **Site URL** = domaine de prod |
| Changer le mot de passe (compte Google) | L’app propose maintenant “Définir un mot de passe” pour les comptes connectés uniquement avec Google |

---

## 4. Résumé des URLs à mettre dans Supabase

Ajoutez **toutes** les URLs où votre app est déployée (chaque domaine Vercel, etc.).

- **Site URL** : votre domaine principal, ex. `https://pro-flow-woad.vercel.app`
- **Redirect URLs** (une par ligne, selon vos déploiements) :
  - `https://pro-flow-woad.vercel.app/`
  - `https://pro-flow-woad.vercel.app/reset-password`
  - `https://proflow-biz.vercel.app/`
  - `https://proflow-biz.vercel.app/reset-password`
  - `http://localhost:5173/`
  - `http://localhost:5173/reset-password`

Après modification, redéployez si besoin et testez la connexion Google et “Mot de passe oublié”.
