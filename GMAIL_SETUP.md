# Configuration Gmail avec Nodemailer

## 🎯 **Pourquoi Gmail ?**
- ✅ Gratuit et simple
- ✅ Pas de limite stricte
- ✅ Configuration rapide
- ✅ Utilise votre compte Gmail existant

## 📋 **Étapes de configuration**

### **1. Activer l'authentification à 2 facteurs**
1. Allez sur [myaccount.google.com](https://myaccount.google.com)
2. **Sécurité** → **Validation en 2 étapes**
3. Activez la validation en 2 étapes

### **2. Générer un mot de passe d'application**
1. **Sécurité** → **Mots de passe des applications**
2. Sélectionnez **Autre (nom personnalisé)**
3. Nom : `Invoice App`
4. Copiez le mot de passe généré (16 caractères)

### **3. Configuration dans votre projet**

#### **Variables d'environnement (.env)**
```env
# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kebcihocine94@gmail.com
SMTP_PASS=votre-mot-de-passe-application-ici
SMTP_FROM_NAME=Votre Nom Entreprise
```

#### **Installation des dépendances**
```bash
npm install nodemailer
```

## 🧪 **Test de configuration**

1. Démarrez le backend : `node server.js`
2. Allez sur votre app React
3. Dashboard → **Test du système de messagerie**
4. Cliquez **Tester la connexion** puis **Tester l'envoi de facture**

## ⚠️ **Limitations Gmail**
- **500 emails/jour** maximum
- **Risque de blocage** si trop d'envois
- **Moins professionnel** que SendGrid

## 🔧 **Dépannage**
- **Erreur "Invalid login"** : Vérifiez le mot de passe d'application
- **Erreur "Less secure app"** : Utilisez un mot de passe d'application
- **Emails non reçus** : Vérifiez les spams
