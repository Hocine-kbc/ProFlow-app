# Configuration EmailJS pour l'envoi de factures

## 📧 Étapes de configuration

### 1. Créer un compte EmailJS
- Aller sur [https://www.emailjs.com/](https://www.emailjs.com/)
- Créer un compte gratuit
- Vérifier votre email

### 2. Configurer un service email
- Aller dans "Email Services"
- Choisir votre fournisseur (Gmail, Outlook, etc.)
- Suivre les instructions de connexion
- **Notez votre Service ID** (ex: `service_xxxxxxx`)

### 3. Créer un template email
- Aller dans "Email Templates"
- Cliquer sur "Create New Template"
- Utiliser le template HTML suivant :

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Facture {{invoice_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; margin-bottom: 0;">
        <h1 style="margin: 0; font-size: 28px;">{{company_name}}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">{{company_email}}</p>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #374151; margin-bottom: 20px;">Facture N° {{invoice_number}}</h2>
        
        <p>Bonjour {{to_name}},</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">Détails de la facture</h3>
            <p><strong>Date d'émission :</strong> {{invoice_date}}</p>
            <p><strong>Date d'échéance :</strong> {{invoice_due_date}}</p>
            <p><strong>Montant total :</strong> {{invoice_amount}}€</p>
            <p><strong>Mode de paiement :</strong> {{payment_method}}</p>
        </div>
        
        <div style="margin: 20px 0;">
            <p>{{message}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Télécharger la facture PDF
            </a>
        </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; color: #6b7280; font-size: 14px; margin-top: 0;">
        <p>Merci pour votre confiance !</p>
        <p>Contact : {{company_email}}</p>
        {{#company_phone}}<p>Téléphone : {{company_phone}}</p>{{/company_phone}}
        {{#company_address}}<p>Adresse : {{company_address}}</p>{{/company_address}}
    </div>
    
</body>
</html>
```

### 4. Configurer les variables du template
Dans EmailJS, ajouter ces variables dans le template :
- `{{to_email}}` - Email du destinataire
- `{{to_name}}` - Nom du destinataire
- `{{subject}}` - Sujet de l'email
- `{{message}}` - Message personnalisé
- `{{invoice_number}}` - Numéro de facture
- `{{invoice_date}}` - Date d'émission
- `{{invoice_due_date}}` - Date d'échéance
- `{{invoice_amount}}` - Montant total
- `{{payment_method}}` - Mode de paiement
- `{{company_name}}` - Nom de l'entreprise
- `{{company_email}}` - Email de l'entreprise
- `{{company_phone}}` - Téléphone de l'entreprise
- `{{company_address}}` - Adresse de l'entreprise

### 5. Obtenir les clés de configuration
- **Template ID** : Dans la page du template (ex: `template_xxxxxxx`)
- **Public Key** : Dans "Account" > "General" (ex: `xxxxxxxxxxxxxxx`)

### 6. Mettre à jour la configuration
Dans le fichier `src/lib/emailService.ts`, remplacer :
```typescript
const EMAILJS_SERVICE_ID = 'service_proflow'; // Votre Service ID
const EMAILJS_TEMPLATE_ID = 'template_invoice'; // Votre Template ID
const EMAILJS_PUBLIC_KEY = 'your_public_key'; // Votre Public Key
```

## 🧪 Test de configuration

Pour tester la configuration, vous pouvez utiliser la fonction de test dans la console du navigateur :
```javascript
import { testEmailConfiguration } from './src/lib/emailService';
testEmailConfiguration();
```

## 📝 Notes importantes

- **Limite gratuite** : 200 emails/mois avec le plan gratuit
- **Sécurité** : Ne jamais exposer votre clé privée côté client
- **Template** : Le template HTML sera rendu par EmailJS
- **Variables** : Toutes les variables doivent être définies dans le template EmailJS

## 🚀 Utilisation

Une fois configuré, l'envoi d'email fonctionnera automatiquement depuis l'interface ProFlow !
