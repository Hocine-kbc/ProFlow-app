# Correction de l'envoi d'email

## Problème identifié
L'envoi d'email échoue avec l'erreur "Bad Request". Le PDF est généré correctement mais l'email n'est pas envoyé.

## Solutions possibles

### 1. Vérifier la configuration SendGrid
Dans votre fichier `.env`, assurez-vous d'avoir :
```
SENDGRID_API_KEY=SG.votre-vraie-clé-api
SENDGRID_FROM_EMAIL=votre-email@domaine.com
```

### 2. Vérifier l'email d'expéditeur
L'email `SENDGRID_FROM_EMAIL` doit être :
- Vérifié dans SendGrid
- Configuré dans votre compte SendGrid
- Correspondre à un domaine que vous possédez

### 3. Alternative : Utiliser Gmail
Si SendGrid ne fonctionne pas, configurez Gmail :
```
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-mot-de-passe-app
```

### 4. Test de l'email
Pour tester l'envoi d'email, utilisez :
```bash
node test-send-invoice.js <invoice-id>
```

## Résultat attendu
- ✅ PDF généré (425+ KB)
- ✅ Email envoyé avec succès
- ❌ Si email échoue : PDF généré mais pas d'envoi
