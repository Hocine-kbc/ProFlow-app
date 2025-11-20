# 🚀 Railway - Guide Rapide (5 minutes)

## ✅ **Fichiers créés et pushés sur GitHub**

Tous les fichiers nécessaires sont maintenant sur votre repo GitHub :
- ✅ `Dockerfile` (config Docker avec dépendances Puppeteer)
- ✅ `.dockerignore` (optimisation build)
- ✅ `railway.json` (config Railway)
- ✅ `package.json` (script `start` ajouté)
- ✅ `server.js` (écoute sur `0.0.0.0`)

---

## 🚂 **Étapes simples pour déployer**

### **1. Créer un compte Railway** (2 min)

1. Allez sur **https://railway.app**
2. Cliquez sur **"Login"**
3. Sélectionnez **"Login with GitHub"**
4. ✅ Compte créé ! (Vous avez $5 de crédit gratuit)

---

### **2. Déployer votre projet** (3 min)

1. Sur **https://railway.app/dashboard**, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**
3. Cherchez et sélectionnez **`ProFlow-app`**
4. Railway détecte automatiquement le `Dockerfile`
5. Cliquez sur **"Deploy Now"**
6. ⏱️ Attendez 3-5 minutes (build Docker)

---

### **3. Configurer les variables d'environnement** (2 min)

Dans Railway, cliquez sur votre service → **"Variables"** → Ajoutez :

| Variable | Valeur | Où la trouver ? |
|----------|--------|-----------------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` | Supabase → Settings → API (service_role) |
| `GMAIL_USER` | `votre.email@gmail.com` | Votre Gmail |
| `GMAIL_APP_PASSWORD` | `abcdefghijklmnop` | Mot de passe d'app Gmail |

💡 **Note** : Pour `GMAIL_APP_PASSWORD`, créez-le sur https://myaccount.google.com/apppasswords

---

### **4. Obtenir votre URL** (1 min)

1. Dans Railway → **"Settings"**
2. Section **"Domains"** → **"Generate Domain"**
3. ✅ URL générée : `https://proflow-production.up.railway.app`

---

### **5. Tester !** 🧪

1. Visitez votre URL Railway
2. Connectez-vous
3. Envoyez une facture
4. 🎉 **Puppeteer devrait fonctionner avec votre template exact !**

---

## 📊 **Vérifier que Puppeteer fonctionne**

Dans Railway → **"Deployments"** → Dernier déploiement → **Logs** :

**✅ Si ça marche, vous verrez** :
```
🚀 Lancement de Puppeteer...
✅ Browser lancé
✅ PDF généré avec Puppeteer (taille: 125000 octets)
📄 Méthode PDF utilisée: Puppeteer (rendu exact)
✅ Email envoyé avec succès
```

**❌ Si ça ne marche pas** :
```
❌ Puppeteer a échoué: ...
🔄 Utilisation de la solution de secours (jsPDF)...
```
→ Vérifiez le `Dockerfile` et redéployez

---

## 💰 **Tarification**

- 🆓 **$5 de crédit gratuit** = 1 mois gratuit
- 💰 **~$5-7/mois** après (serveur 24/7)
- 📊 Suivez la consommation dans le Dashboard

---

## 🔄 **Mises à jour futures**

Pour mettre à jour votre app :

```bash
# Modifier votre code
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

✅ **Railway redéploie automatiquement** en ~2 minutes !

---

## ❓ **Besoin d'aide ?**

Consultez le guide complet : **`RAILWAY_DEPLOYMENT_GUIDE.md`**

---

## 🎯 **Checklist**

- [ ] ✅ Compte Railway créé
- [ ] ✅ Projet déployé depuis GitHub
- [ ] ✅ Variables d'environnement ajoutées
- [ ] ✅ Domaine généré
- [ ] ✅ Application testée
- [ ] ✅ Facture envoyée avec succès
- [ ] ✅ Puppeteer fonctionne (template exact) !

---

🎉 **Félicitations ! Vous avez maintenant Puppeteer fonctionnel avec votre template exact !** 🎨✨

