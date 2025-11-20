# 📧 Guide de configuration Gmail pour ProFlow

## 🎯 **Pourquoi utiliser Gmail ?**

### **Avantages** :
- ✅ **Gratuit** : Jusqu'à 500 emails/jour
- ✅ **Simple** : Pas besoin de compte tiers
- ✅ **Personnel** : L'email vient directement de votre adresse Gmail
- ✅ **Rapide** : Pas de vérification d'email requise
- ✅ **Fiable** : Service Google ultraprésent

### **Inconvénients** :
- ⚠️ **Limite** : 500 emails/jour (largement suffisant pour une micro-entreprise)
- ⚠️ **@gmail.com** : Moins professionnel qu'un domaine personnalisé

---

## 🔐 **Étape 1 : Créer un mot de passe d'application Gmail**

⚠️ **IMPORTANT** : Ne JAMAIS utiliser votre mot de passe Gmail normal ! Utilisez un **mot de passe d'application**.

### **1.1 Activer la validation en 2 étapes** (si pas déjà fait)

1. Allez sur **https://myaccount.google.com/security**
2. Trouvez la section **"Validation en 2 étapes"**
3. Cliquez sur **"Activer"** si ce n'est pas déjà fait
4. Suivez les instructions (SMS, appli Google Authenticator, etc.)

### **1.2 Générer un mot de passe d'application**

1. Allez sur **https://myaccount.google.com/apppasswords**
   - Ou : **Google Account** → **Security** → **App Passwords**
2. Connectez-vous si demandé
3. Dans le menu déroulant :
   - **Sélectionner l'application** : Choisissez **"Autre (nom personnalisé)"**
   - **Nom** : Tapez `ProFlow` ou `Facturation`
4. Cliquez sur **"Générer"**
5. **COPIEZ IMMÉDIATEMENT** le mot de passe affiché (16 caractères)
   - Format : `abcd efgh ijkl mnop`
   - ⚠️ Vous ne pourrez plus le voir après !
6. Conservez-le dans un endroit sûr (vous en aurez besoin pour Vercel)

---

## ⚙️ **Étape 2 : Configurer les variables d'environnement sur Vercel**

### **2.1 Accéder à Vercel**

1. Allez sur **https://vercel.com/dashboard**
2. Sélectionnez votre projet **ProFlow**
3. Cliquez sur **"Settings"** (en haut)
4. Dans le menu de gauche, cliquez sur **"Environment Variables"**

### **2.2 Ajouter les variables Gmail**

Pour **chaque** variable ci-dessous :
- Cliquez sur **"Add New"**
- Entrez le **Name** et la **Value**
- Cochez ☑️ **Production**, ☑️ **Preview**, ☑️ **Development**
- Cliquez sur **"Save"**

| Variable | Valeur | Exemple |
|----------|--------|---------|
| `GMAIL_USER` | Votre adresse Gmail complète | `votre.email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Le mot de passe d'application (sans espaces) | `abcdefghijklmnop` |

⚠️ **ATTENTION** : Pour `GMAIL_APP_PASSWORD`, **supprimez tous les espaces** du mot de passe !
- ❌ Mauvais : `abcd efgh ijkl mnop`
- ✅ Bon : `abcdefghijklmnop`

### **2.3 (Optionnel) Supprimer les variables SendGrid**

Si vous n'utilisez plus SendGrid, vous pouvez supprimer (mais pas obligatoire) :
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`

💡 **Astuce** : Vous pouvez garder les deux ! L'application utilisera Gmail en priorité.

---

## 🚀 **Étape 3 : Redéployer l'application**

### **Option A : Déclenchement automatique** (Recommandé)

1. Les variables sont déjà enregistrées
2. Faites un nouveau commit sur GitHub (n'importe quoi)
3. Vercel redéploiera automatiquement

### **Option B : Redéploiement manuel**

1. Sur le Dashboard Vercel, allez dans **"Deployments"**
2. Cliquez sur les **3 petits points** du dernier déploiement
3. Cliquez sur **"Redeploy"**
4. Attendez que le statut soit **"Ready"** ✅

---

## 🧪 **Étape 4 : Tester la configuration**

### **4.1 Vérifier la configuration**

Visitez : **https://votre-app.vercel.app/api/test-config**

Vous devriez voir :
```json
{
  "success": true,
  "messages": [
    "✅ Configuration Supabase OK",
    "✅ Gmail configuré (prioritaire)",
    "📧 Emails envoyés depuis: votre.email@gmail.com",
    "🎉 Configuration complète !"
  ]
}
```

### **4.2 Envoyer une facture test**

1. Allez sur votre application
2. Créez une facture
3. Cliquez sur **"Envoyer par email"**
4. ✅ **L'email devrait être envoyé depuis votre Gmail !**

---

## 📊 **Différences entre Gmail et SendGrid**

| Critère | Gmail | SendGrid |
|---------|-------|----------|
| **Gratuit** | ✅ 500/jour | ✅ 100/jour |
| **Configuration** | ✅ Simple | ⚠️ Vérification email |
| **Expéditeur** | Votre Gmail | Email fixe vérifié |
| **Professionnalisme** | ⚠️ @gmail.com | ✅ Domaine personnalisé |
| **Fiabilité** | ✅ Excellente | ✅ Excellente |
| **Délivrabilité** | ✅ Très bonne | ✅ Excellente |

---

## 🔍 **Vérification dans les logs Vercel**

Après avoir envoyé une facture, vérifiez les logs :

### **✅ Gmail fonctionne** :
```
✅ Gmail initialisé (Nodemailer)
📧 Service email: Gmail (expéditeur = utilisateur)
📧 Tentative d'envoi via Gmail (Nodemailer)...
✅ Email envoyé avec succès via Gmail
```

### **❌ Gmail échoue** :
```
❌ Erreur gmail: ...
💡 Vérifiez GMAIL_USER et GMAIL_APP_PASSWORD
```

---

## 🔧 **Dépannage**

### **Problème 1 : "Invalid login"**

**Symptôme** : Erreur `Invalid login: 535-5.7.8 Username and Password not accepted`

**Causes** :
- ❌ Mot de passe d'application incorrect
- ❌ Validation en 2 étapes non activée
- ❌ Espaces dans `GMAIL_APP_PASSWORD`

**Solutions** :
1. Régénérez un nouveau mot de passe d'application
2. Activez la validation en 2 étapes
3. Supprimez tous les espaces du mot de passe

---

### **Problème 2 : "Less secure app"**

**Symptôme** : Erreur sur les "applications moins sécurisées"

**Solution** :
- ✅ Utilisez un **mot de passe d'application** (pas votre mot de passe normal)
- ✅ La validation en 2 étapes doit être activée

---

### **Problème 3 : Limite de 500 emails/jour atteinte**

**Symptôme** : Erreur `User has reached a rate limit`

**Solutions** :
1. ⏳ Attendez 24h que la limite se réinitialise
2. 💰 Passez à Google Workspace (limite plus élevée)
3. 🔄 Utilisez un autre compte Gmail temporairement

---

## 💡 **Conseils pro**

### **1. Créer un email dédié**

Pour séparer vos emails personnels et professionnels :
1. Créez un nouveau compte Gmail : `facturation.proflow@gmail.com`
2. Utilisez ce compte uniquement pour l'envoi de factures
3. Avantage : Historique clair, pas de mélange avec vos emails persos

### **2. Personnaliser l'email**

Dans votre code, l'expéditeur sera :
```
"Nom de votre entreprise" <votre.email@gmail.com>
```

Le client verra :
- **De** : Nom de votre entreprise
- **Email** : votre.email@gmail.com

### **3. Suivre vos envois**

- ✅ Tous les emails envoyés sont dans votre dossier **"Envoyés"** Gmail
- ✅ Vous pouvez suivre si le client a lu l'email (avec extensions Gmail)
- ✅ Historique complet accessible

---

## 🎉 **Résumé**

### **Ce que vous avez fait** :
1. ✅ Activé la validation en 2 étapes sur Gmail
2. ✅ Généré un mot de passe d'application
3. ✅ Ajouté `GMAIL_USER` et `GMAIL_APP_PASSWORD` sur Vercel
4. ✅ Redéployé l'application

### **Résultat** :
- 🎯 **Factures envoyées depuis votre Gmail**
- 📧 **Jusqu'à 500 emails/jour gratuits**
- ✅ **Simple, rapide, fiable**
- 🔒 **Sécurisé** (mot de passe d'application)

---

## ❓ **Questions fréquentes**

### **Q : Puis-je garder SendGrid et Gmail en même temps ?**
R : Oui ! L'application utilisera Gmail en priorité, SendGrid en secours.

### **Q : Le client peut-il me répondre ?**
R : Oui ! L'email vient directement de votre Gmail, donc le client peut répondre normalement.

### **Q : Puis-je utiliser un compte Google Workspace ?**
R : Oui ! Même procédure, mais avec des limites plus élevées (2000 emails/jour).

### **Q : Est-ce sécurisé ?**
R : Oui ! Le mot de passe d'application est distinct de votre mot de passe Gmail et peut être révoqué à tout moment.

### **Q : Combien ça coûte ?**
R : **Gratuit** pour 500 emails/jour. Largement suffisant pour 99% des micro-entreprises !

---

🎉 **Félicitations ! Vous pouvez maintenant envoyer vos factures gratuitement avec Gmail !** 🚀

