# Corriger l'erreur 404 DEPLOYMENT_NOT_FOUND à la connexion Google

Cette erreur apparaît quand **Supabase** essaie d'appeler une **Edge Function** qui n'existe pas ou n'est pas déployée. Même sans hook visible dans le Dashboard, un appel interne peut exister (région cdg1, ancienne config, etc.). Voici les solutions.

---

## 1. Vérifier que vous êtes sur le bon projet

Votre app utilise le projet **tdfhqkgvcgqgkrxarmui** (d’après votre `.env`).

- Ouvrez **https://supabase.com/dashboard**
- Cliquez sur le projet dont l’URL contient **tdfhqkgvcgqgkrxarmui** (ou le nom "ProFlow" / "CleanBiz Pro" si c’est le même).
- Toutes les étapes ci‑dessous doivent être faites **sur ce projet**.

---

## 2. Désactiver les Auth Hooks

1. Menu de gauche : **Authentication** → **Auth Hooks** (ou **Hooks**).
2. Si vous voyez **un ou plusieurs hooks** (ex. "Send Email", "Customize", "MFA", etc.) :
   - Ouvrez chaque hook.
   - **Désactivez‑le** ou **supprimez l’URL / le nom de la fonction** puis enregistrez.
3. S’il n’y a aucun hook listé, passez à l’étape 3.

---

## 3. Vérifier les e-mails d’authentification (Customize / Hook)

Souvent, le 404 vient d’un **envoi d’email** configuré pour utiliser une Edge Function.

1. **Authentication** → **Notifications** (ou **Email** / **Email Templates**).
2. Regardez les options du type :
   - **Customize emails** / **Custom SMTP**
   - **Use custom function** / **Send emails via Edge Function**
   - **Auth Hook** pour l’email
3. Si une **URL de fonction** ou un **nom d’Edge Function** est renseigné :
   - Soit vous la **supprimez** / désactivez pour utiliser les e-mails par défaut Supabase.
   - Soit vous **déployez** la fonction correspondante (voir étape 5).

---

## 4. Vérifier la configuration du projet (Auth)

1. **Project Settings** (engrenage en bas à gauche) → onglet **Auth** (ou **Authentication**).
2. Parcourez toutes les options pour tout ce qui mentionne :
   - **Hook**
   - **Edge Function**
   - **Custom**
3. Désactivez ou videz toute référence à une fonction, puis enregistrez.

---

## 5. Option : déployer une Edge Function (si vous voulez garder un hook)

Si vous préférez **garder** un hook et que vous savez quel **nom** de fonction il appelle (ex. `send-email` ou `auth-hook`) :

1. À la racine du projet, dans un terminal :
   ```bash
   npx supabase link --project-ref tdfhqkgvcgqgkrxarmui
   npx supabase functions deploy NOM_DE_LA_FONCTION
   ```
2. Remplacez `NOM_DE_LA_FONCTION` par le nom exact indiqué dans le hook.

Si vous ne connaissez pas le nom, **désactiver le hook** (étapes 2 ou 3) est en général le plus simple.

---

## 6. Résumé

| Où regarder | Action |
|-------------|--------|
| **Authentication** → **Auth Hooks** | Désactiver ou supprimer tous les hooks |
| **Authentication** → **Notifications / Email** | Désactiver "Custom function" ou "Hook" pour l’envoi d’emails |
| **Project Settings** → **Auth** | Enlever toute URL / fonction personnalisée |

Une fois toute référence à une Edge Function supprimée ou la fonction déployée, **reconnectez‑vous avec Google** : l’erreur 404 DEPLOYMENT_NOT_FOUND devrait disparaître.

---

## 7. Aucun hook dans le Dashboard : déployer des Edge Functions

Si vous ne voyez **aucun hook** configuré mais que l’erreur continue, Supabase peut quand même appeler une fonction (ancienne config, défaut région, etc.). Dans ce cas :

1. **Déployer les fonctions du projet** pour que l’“appel” trouve au moins une déployée :
   ```bash
   cd "c:\Users\houho\OneDrive\Desktop\Developement_web\appli autoentreprise\project_autoentreprise_new"
   npx supabase link --project-ref tdfhqkgvcgqgkrxarmui
   npx supabase functions deploy auth-callback
   npx supabase functions deploy custom-access-token
   npx supabase functions deploy delete-user-account
   ```
   La fonction **custom-access-token** correspond au nom souvent utilisé par le hook Supabase « Custom Access Token ». Si le 404 persiste, Supabase appelle peut‑être une autre fonction (nom inconnu) → contacter le support avec l’ID d’erreur.
2. Le projet contient maintenant une fonction **auth-callback** (minimale, qui ne fait qu’accepter l’appel). Si Supabase appelle un nom proche ou une fonction “par défaut”, cela peut suffire à faire disparaître le 404.
3. **Vérifier les variables d’environnement en production (Vercel)** : assurez-vous que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` pointent bien vers **ce** projet (tdfhqkgvcgqgkrxarmui). Si la prod pointe vers un autre projet, c’est peut‑être lui qui a un hook ou une config différente.

Si après déploiement l’erreur est toujours là, contacter le support Supabase avec l’**ID d’erreur** (ex. `cdg1::jcwj6-1772381125807-ab7f5436eabc`) : ils pourront indiquer quelle “déployment” est appelée.

---

## 8. Erreur 500 MIDDLEWARE_INVOCATION_FAILED

Si vous voyez **500 MIDDLEWARE_INVOCATION_FAILED** après avoir déployé une fonction, c’est que le **Auth Hook** est bien appelé mais que la réponse ne correspond pas au format attendu par Supabase.

- **Solution 1 (recommandée)** : dans **Authentication** → **Auth Hooks**, **désactivez** ou **supprimez** le hook. La connexion fonctionnera sans hook.
- **Solution 2** : la fonction **auth-callback** a été adaptée pour renvoyer le format attendu par le hook « Custom Access Token ». Redéployez-la :
  ```bash
  npx supabase functions deploy auth-callback
  ```
  Puis réessayez la connexion. Si l’erreur persiste, le hook est peut‑être d’un autre type (Send Email, etc.) → dans ce cas, désactiver le hook (solution 1).

---

## Liens directs (remplacez par votre project ref si différent)

- Dashboard du projet : **https://supabase.com/dashboard/project/tdfhqkgvcgqgkrxarmui**
- Auth Hooks : **https://supabase.com/dashboard/project/tdfhqkgvcgqgkrxarmui/auth/hooks**
- Paramètres Auth : **https://supabase.com/dashboard/project/tdfhqkgvcgqgkrxarmui/settings/auth**
