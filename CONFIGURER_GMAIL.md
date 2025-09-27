# Configuration Gmail pour l'envoi de factures

## 🚀 Solution rapide

Pour recevoir vos factures par email, configurez Gmail comme alternative à SendGrid.

## 📋 Étapes de configuration

### 1. Activer l'authentification à 2 facteurs
1. Allez sur [Google Account Security](https://myaccount.google.com/security)
2. Activez l'**authentification à 2 facteurs** si ce n'est pas déjà fait

### 2. Générer un mot de passe d'application
1. Dans la section **Sécurité**, trouvez **Mots de passe des applications**
2. Cliquez sur **Générer un mot de passe**
3. Sélectionnez **Mail** comme application
4. Copiez le mot de passe généré (16 caractères)

### 3. Configurer le fichier .env
Ajoutez ces lignes dans votre fichier `.env` :

```env
GMAIL_USER=kebcihocine94@gmail.com
GMAIL_APP_PASSWORD=votre-mot-de-passe-de-16-caractères
```

### 4. Redémarrer le serveur
```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
node server.js
```

## ✅ Test de configuration

```bash
node setup-gmail.js
```

Si vous voyez "✅ Email de test envoyé avec succès !", Gmail est configuré.

## 🎯 Résultat attendu

Maintenant, quand vous envoyez une facture :
1. **SendGrid essaie d'abord** (si configuré)
2. **Si SendGrid échoue, Gmail prend le relais**
3. **Vous recevez vos factures par email !**

## 🔧 Dépannage

### Erreur "Invalid login"
- Vérifiez le mot de passe d'application
- Assurez-vous que l'authentification à 2 facteurs est activée

### Erreur "Less secure app access"
- Google a supprimé cette option
- Utilisez les mots de passe d'application (étape 2)

### Pas d'email reçu
- Vérifiez vos spams
- Testez avec `node setup-gmail.js`
