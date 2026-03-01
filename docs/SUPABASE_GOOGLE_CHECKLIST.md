# Checklist Supabase – Connexion Google fonctionnelle

Tous les paramètres à vérifier dans le **Dashboard Supabase** pour que « Continuer avec Google » fonctionne.

---

## 1. Authentication → Providers → Google

**Chemin :** Authentication → **Providers** (ou Sign In / Providers) → **Google**

| Paramètre | À vérifier |
|-----------|------------|
| **Google enabled** | Doit être **activé** (toggle ON). |
| **Client ID** | Doit être exactement celui de Google Cloud (ex. `1002885716169-....apps.googleusercontent.com`). |
| **Client Secret** | Doit être le **Client Secret** du même client OAuth 2.0 dans Google Cloud. |

**Enregistrez** après toute modification.

---

## 2. Authentication → URL Configuration

**Chemin :** Authentication → **URL Configuration** (ou Configuration)

| Paramètre | À vérifier |
|-----------|------------|
| **Site URL** | Doit être l’URL de votre app **sans espace** à la fin. Ex. : `https://pro-flow-woad.vercel.app` (pas `...vercel.app `). |
| **Redirect URLs** | Liste d’URLs autorisées après connexion. Ajoutez **une URL par ligne**, sans espace avant/après :<br>• `https://votre-app.vercel.app/`<br>• `https://votre-app.vercel.app/reset-password`<br>• Pour le dev : `http://localhost:5173/` et `http://localhost:5173/reset-password` |

**Important :** Un espace en trop dans **Site URL** provoque une erreur 500. Vérifiez qu’il n’y a aucun espace.

**Enregistrez** après toute modification.

---

## 3. Authentication → Auth Hooks

**Chemin :** Authentication → **Auth Hooks**

| À vérifier |
|------------|
| Si la page est **vide** (aucun hook) → rien à faire. |
| Si un **hook est configuré** (ex. Custom Access Token, Send Email) et que vous avez des erreurs 404/500 à la connexion Google : **désactivez le hook** ou supprimez l’URL / le nom de la fonction, puis enregistrez. |

Pour une connexion Google sans personnalisation, aucun hook n’est nécessaire.

---

## 4. (Optionnel) Project Settings → Auth

**Chemin :** Project Settings (engrenage) → **Auth**

| À vérifier |
|------------|
| Parcourez les options et assurez-vous qu’**aucune URL de hook** ou **Edge Function** personnalisée n’est renseignée si vous ne l’utilisez pas. |

---

## 5. Récapitulatif – Ordre de vérification

1. **Providers → Google** : activé + bon Client ID + bon Client Secret.
2. **URL Configuration** : Site URL = URL de votre app **sans espace** ; Redirect URLs contient votre URL de prod (et localhost pour le dev).
3. **Auth Hooks** : vide ou hook désactivé si vous avez des erreurs à la connexion Google.

---

## Côté Google Cloud (rappel)

Pour que le **Client ID** et le **Client Secret** fonctionnent :

- **Google Cloud Console** → APIs & Services → **Credentials** → votre client OAuth 2.0.
- **Authorized redirect URIs** doit contenir **exactement** :  
  `https://tdfhqkgvcgqgkrxarmui.supabase.co/auth/v1/callback`

Sans cette URI, la connexion Google échouera côté Google.
