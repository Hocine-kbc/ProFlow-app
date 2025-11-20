# Configuration Vercel pour ProFlow

## ✅ Backend Railway déployé avec succès !

**URL du backend Railway :** `https://proflow-app-production.up.railway.app`

---

## 🔧 Configuration requise sur Vercel

### **Étape 1 : Ajouter la variable d'environnement**

1. Allez sur **https://vercel.com**
2. Ouvrez votre projet **ProFlow**
3. Allez dans **Settings** → **Environment Variables**
4. Cliquez sur **"Add New"**
5. Ajoutez :

```
Name: VITE_BACKEND_URL
Value: https://proflow-app-production.up.railway.app
Environment: Production, Preview, Development (cochez les 3)
```

6. Cliquez sur **"Save"**

---

### **Étape 2 : Redéployer le frontend**

Après avoir ajouté la variable :

1. Allez dans l'onglet **"Deployments"**
2. Cliquez sur les **3 points (...)** du dernier déploiement
3. Sélectionnez **"Redeploy"**

OU

Poussez un nouveau commit sur GitHub (ce qui sera fait automatiquement après ce changement).

---

## ✅ Variables Supabase déjà configurées sur Vercel

Assurez-vous que ces variables sont également présentes :

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGci...
```

---

## 🎯 Résultat

Une fois configuré :
- ✅ Frontend (Vercel) → Backend (Railway) → Supabase
- ✅ Envoi de factures avec PDF généré par Puppeteer
- ✅ Emails via Gmail/SendGrid
- ✅ Application 100% fonctionnelle en production

---

## 🧪 Test

Après le déploiement, testez l'envoi d'une facture depuis votre application Vercel.
Vous devriez voir dans les logs Railway (https://railway.app) :
```
📧 Envoi de la facture via le backend...
📄 Génération du PDF avec Puppeteer...
✅ Email envoyé avec succès
```

