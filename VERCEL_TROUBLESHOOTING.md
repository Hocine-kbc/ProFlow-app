# 🔧 Guide de Dépannage Vercel - ProFlow

## 🚨 Erreurs Courantes

### **Erreur 500 : "A server error occurred"**

**Symptôme** : Erreur lors de l'envoi de factures avec message `SyntaxError: Unexpected token 'A'...`

**Causes possibles** :

1. **Variables d'environnement manquantes** ❌
2. **Service d'email non configuré** ❌
3. **Erreur de connexion Supabase** ❌

---

## ✅ Vérifications à effectuer

### **1️⃣ Vérifier les variables d'environnement Vercel**

Sur votre Dashboard Vercel :
1. Allez dans **Settings** → **Environment Variables**
2. Vérifiez que TOUTES ces variables sont présentes :

```env
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_KEY
✅ SENDGRID_API_KEY (ou GMAIL_USER + GMAIL_APP_PASSWORD)
✅ SENDGRID_FROM_EMAIL (si SendGrid)
```

**Important** : Cochez les 3 environnements (Production, Preview, Development) pour chaque variable !

---

### **2️⃣ Vérifier les logs Vercel**

1. Allez sur votre projet Vercel
2. Cliquez sur **Deployments**
3. Cliquez sur le dernier déploiement
4. Allez dans l'onglet **Functions**
5. Cherchez `/api/send-invoice`
6. Consultez les logs pour voir l'erreur exacte

**Erreurs typiques dans les logs** :

```
❌ Variables Supabase manquantes
→ Solution : Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

❌ Aucun service d'email configuré
→ Solution : Configurez SendGrid ou Gmail

❌ Cannot read property 'name' of undefined
→ Solution : Vérifiez que la facture a bien un client associé

❌ SendGrid error: Unauthorized
→ Solution : Vérifiez votre clé API SendGrid
```

---

### **3️⃣ Tester localement d'abord**

Avant de déployer, testez en local :

1. Créez un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=votre-email@domaine.com
```

2. Lancez l'app :

```bash
npm run dev
```

3. Testez l'envoi d'une facture
4. Consultez la console du navigateur (F12)

---

### **4️⃣ Vérifier la configuration SendGrid**

Si vous utilisez SendGrid :

1. Allez sur **https://app.sendgrid.com/settings/api_keys**
2. Vérifiez que votre clé API existe et est active
3. Allez dans **Settings** → **Sender Authentication**
4. Vérifiez que votre email expéditeur est **vérifié** ✅

**Note** : SendGrid n'envoie PAS d'emails depuis des adresses non vérifiées !

---

### **5️⃣ Vérifier la configuration Gmail**

Si vous utilisez Gmail :

1. Vérifiez que la **validation en 2 étapes** est activée
2. Le mot de passe d'application est au bon format : `xxxx-xxxx-xxxx-xxxx`
3. L'email Gmail est correct

---

## 🔍 Diagnostics avancés

### **Test de connexion Supabase**

Dans la console de votre navigateur (F12), testez :

```javascript
const { createClient } = supabase;
const supabaseUrl = 'VOTRE_URL';
const supabaseKey = 'VOTRE_CLE_ANON';
const client = createClient(supabaseUrl, supabaseKey);

const { data, error } = await client.from('invoices').select('*').limit(1);
console.log('Supabase:', { data, error });
```

Si `error` n'est pas null → Problème de connexion Supabase

---

### **Test des variables dans Vercel Function**

Ajoutez temporairement une fonction de test :

Créez `api/test-env.js` :

```javascript
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  res.json({
    VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
    GMAIL_USER: !!process.env.GMAIL_USER,
  });
}
```

Visitez : `https://votre-app.vercel.app/api/test-env`

Si une valeur est `false` → Variable manquante !

---

## 🎯 Solutions rapides

### **Solution 1 : Redéployer après ajout de variables**

```bash
# Sur Vercel Dashboard
Deployments → ... → Redeploy
```

Les variables ne sont actives **qu'après un nouveau déploiement** !

---

### **Solution 2 : Utiliser le Vercel CLI**

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Ajouter des variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add SENDGRID_API_KEY
vercel env add SENDGRID_FROM_EMAIL

# Redéployer
vercel --prod
```

---

### **Solution 3 : Vérifier le fichier vercel.json**

Assurez-vous que `vercel.json` est correct :

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 📞 Besoin d'aide ?

Si le problème persiste :

1. Consultez les logs Vercel (Functions tab)
2. Vérifiez la console du navigateur (F12)
3. Testez en local avec les mêmes variables
4. Vérifiez que toutes les dépendances sont dans `package.json`

---

## ✅ Checklist de déploiement

Avant de considérer le déploiement comme réussi :

- [ ] Variables Supabase configurées sur Vercel
- [ ] Variables SendGrid ou Gmail configurées sur Vercel
- [ ] Email expéditeur vérifié sur SendGrid
- [ ] Redéploiement effectué après ajout des variables
- [ ] URLs autorisées configurées sur Supabase
- [ ] Test d'envoi de facture réussi en production
- [ ] Logs Vercel ne montrent aucune erreur
- [ ] Console navigateur ne montre aucune erreur

---

**Dernière mise à jour** : 19 novembre 2025

