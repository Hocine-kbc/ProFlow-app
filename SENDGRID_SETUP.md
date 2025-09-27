# Configuration SendGrid pour l'envoi de factures

## 🎯 **Pourquoi SendGrid ?**
- ✅ Service professionnel et fiable
- ✅ 100 emails gratuits/jour
- ✅ Excellente délivrabilité
- ✅ API simple et bien documentée
- ✅ Support technique

## 📋 **Étapes de configuration**

### **1. Créer un compte SendGrid**
1. Allez sur [sendgrid.com](https://sendgrid.com)
2. Créez un compte gratuit
3. Vérifiez votre email

### **2. Créer une API Key**
1. Dans le dashboard SendGrid → **Settings** → **API Keys**
2. Cliquez **Create API Key**
3. Nom : `Invoice App`
4. Permissions : **Full Access**
5. Copiez la clé (commence par `SG.`)

### **3. Vérifier l'identité de l'expéditeur**
1. **Settings** → **Sender Authentication**
2. **Single Sender Verification**
3. Ajoutez votre email : `kebcihocine94@gmail.com`
4. Vérifiez l'email reçu

### **4. Configuration dans votre projet**

#### **Variables d'environnement (.env)**
```env
# SendGrid
SENDGRID_API_KEY=SG.votre-cle-api-ici
SENDGRID_FROM_EMAIL=kebcihocine94@gmail.com
SENDGRID_FROM_NAME=Votre Nom Entreprise
```

#### **Installation des dépendances**
```bash
npm install @sendgrid/mail
```

### **5. Mise à jour du backend**

Le backend sera automatiquement mis à jour pour utiliser SendGrid quand les variables seront configurées.

## 🧪 **Test de configuration**

1. Démarrez le backend : `node server.js`
2. Allez sur votre app React
3. Dashboard → **Test du système de messagerie**
4. Cliquez **Tester la connexion** puis **Tester l'envoi de facture**

## 📊 **Limites gratuites**
- **100 emails/jour** (suffisant pour commencer)
- **40 000 emails/mois** en version payante
- **Support par email**

## 🔧 **Dépannage**
- **Erreur "Sender Identity"** : Vérifiez que votre email est vérifié
- **Erreur "API Key"** : Vérifiez que la clé commence par `SG.`
- **Emails non reçus** : Vérifiez les spams
