# 🔧 Guide de dépannage - Envoi de factures par email

## ❌ Erreur : "PDF généré mais email non envoyé (SendGrid et Gmail ont échoué)"

Cette erreur signifie que le PDF de la facture a été généré avec succès, mais l'envoi de l'email a échoué via SendGrid et Gmail.

### 🔍 Diagnostic

1. **Vérifiez les variables d'environnement sur votre plateforme de déploiement** (Vercel, Railway, etc.)

   Pour **SendGrid** :
   - `SENDGRID_API_KEY` : Doit commencer par `SG.` et être valide
   - `SENDGRID_FROM_EMAIL` : Doit être une adresse email vérifiée dans SendGrid

   Pour **Gmail** :
   - `GMAIL_USER` : Votre adresse Gmail complète
   - `GMAIL_APP_PASSWORD` : Un mot de passe d'application (16 caractères, sans espaces)

2. **Vérifiez les logs du backend** pour voir l'erreur exacte

### 🛠️ Solutions selon l'erreur

#### Erreur SendGrid : "Email non vérifié"

**Symptôme** : L'erreur mentionne "verified", "sender-identity" ou "not verified"

**Solution** :
1. Connectez-vous à votre compte SendGrid
2. Allez dans **Settings > Sender Authentication**
3. Vérifiez votre adresse email (`SENDGRID_FROM_EMAIL`)
4. Si l'email n'est pas vérifié, cliquez sur "Verify" et suivez les instructions
5. Attendez la confirmation par email
6. Redéployez votre application

#### Erreur SendGrid : "Maximum credits exceeded" (Limite de crédits atteinte)

**Symptôme** : L'erreur mentionne "Maximum credits exceeded", "credits exceeded" ou "quota"

**Solution** :
1. **Option 1 - Attendre le renouvellement** :
   - Les crédits SendGrid se renouvellent chaque mois
   - Attendez le début du mois suivant pour que vos crédits soient renouvelés

2. **Option 2 - Passer à un plan payant** :
   - Connectez-vous à votre compte SendGrid
   - Allez dans **Settings > Billing**
   - Passez à un plan payant pour obtenir plus de crédits

3. **Option 3 - Utiliser Gmail en attendant** :
   - Configurez Gmail comme solution de secours
   - Le système utilisera automatiquement Gmail si SendGrid échoue
   - Voir la section "Erreur Gmail" ci-dessous pour la configuration

#### Erreur SendGrid : "API Key invalide"

**Symptôme** : L'erreur mentionne "unauthorized", "forbidden" ou "invalid API key"

**Solution** :
1. Connectez-vous à votre compte SendGrid
2. Allez dans **Settings > API Keys**
3. Vérifiez que votre clé API existe et est active
4. Si nécessaire, créez une nouvelle clé API avec les permissions "Mail Send"
5. Copiez la clé (elle commence par `SG.`)
6. Mettez à jour `SENDGRID_API_KEY` sur votre plateforme de déploiement
7. Redéployez votre application

#### Erreur Gmail : "Invalid login" ou "Authentication failed"

**Symptôme** : L'erreur mentionne "invalid login", "authentication" ou "invalid credentials"

**Solution** :
1. Allez sur https://myaccount.google.com/apppasswords
2. Connectez-vous avec votre compte Gmail
3. Sélectionnez "App" : "Mail" et "Device" : "Other (Custom name)"
4. Entrez un nom (ex: "ProFlow App")
5. Cliquez sur "Generate"
6. Copiez le mot de passe d'application (16 caractères, sans espaces)
7. Mettez à jour `GMAIL_APP_PASSWORD` sur votre plateforme de déploiement
8. ⚠️ **IMPORTANT** : Utilisez un **mot de passe d'application**, pas votre mot de passe Gmail normal !
9. Redéployez votre application

### 📋 Checklist de configuration

#### Pour SendGrid :
- [ ] Compte SendGrid créé et actif
- [ ] Clé API créée avec permissions "Mail Send"
- [ ] `SENDGRID_API_KEY` configurée sur la plateforme de déploiement
- [ ] Adresse email vérifiée dans SendGrid
- [ ] `SENDGRID_FROM_EMAIL` correspond à l'adresse vérifiée
- [ ] `SENDGRID_FROM_EMAIL` configurée sur la plateforme de déploiement

#### Pour Gmail :
- [ ] Compte Gmail actif avec authentification à 2 facteurs activée
- [ ] Mot de passe d'application créé sur https://myaccount.google.com/apppasswords
- [ ] `GMAIL_USER` configuré avec l'adresse Gmail complète
- [ ] `GMAIL_APP_PASSWORD` configuré avec le mot de passe d'application (16 caractères, sans espaces)
- [ ] Les deux variables configurées sur la plateforme de déploiement

### 🌐 Configuration sur Vercel

1. Allez dans votre projet Vercel
2. Cliquez sur **Settings > Environment Variables**
3. Ajoutez les variables nécessaires :
   - Pour SendGrid : `SENDGRID_API_KEY` et `SENDGRID_FROM_EMAIL`
   - Pour Gmail : `GMAIL_USER` et `GMAIL_APP_PASSWORD`
4. Sélectionnez les environnements (Production, Preview, Development)
5. Cliquez sur **Save**
6. Redéployez votre application

### 🚂 Configuration sur Railway

1. Allez dans votre projet Railway
2. Cliquez sur votre service
3. Allez dans l'onglet **Variables**
4. Ajoutez les variables nécessaires :
   - Pour SendGrid : `SENDGRID_API_KEY` et `SENDGRID_FROM_EMAIL`
   - Pour Gmail : `GMAIL_USER` et `GMAIL_APP_PASSWORD`
5. L'application redéploiera automatiquement

### 🔄 Après avoir corrigé la configuration

1. **Redéployez votre application** pour que les nouvelles variables d'environnement soient prises en compte
2. **Testez l'envoi d'une facture** à nouveau
3. **Vérifiez les logs** si l'erreur persiste

### 💡 Conseils

- **Utilisez SendGrid en production** : Plus fiable et professionnel
- **Gmail est une solution de secours** : Fonctionne mais peut être limité
- **Vérifiez les logs du backend** : Ils contiennent des informations détaillées sur l'erreur
- **Testez avec un email de test** : Envoyez d'abord à votre propre email pour vérifier

### 📞 Besoin d'aide ?

Si le problème persiste après avoir suivi ce guide :
1. Vérifiez les logs du backend (Vercel Logs, Railway Logs)
2. Copiez le message d'erreur exact
3. Vérifiez que toutes les variables d'environnement sont correctement configurées

