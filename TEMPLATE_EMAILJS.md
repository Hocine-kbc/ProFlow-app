# Configuration Template EmailJS - Guide Complet

## 📧 Créer un nouveau template dans EmailJS

### 1. Aller sur EmailJS
- Allez sur [https://dashboard.emailjs.com/](https://dashboard.emailjs.com/)
- Connectez-vous à votre compte
- Cliquez sur **"Email Templates"** dans le menu de gauche

### 2. Créer un nouveau template
- Cliquez sur **"Create New Template"** ou le bouton **"+"**
- **Nom du template** : `Template Facture ProFlow`
- **Sujet** : `Facture N° {{invoice_number}} - {{company_name}}`

### 3. Configuration du contenu HTML
Remplacez tout le contenu par ce code HTML :

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Facture {{invoice_number}}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <!-- Header avec logo entreprise -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">{{company_name}}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">{{company_email}}</p>
    </div>
    
    <!-- Contenu principal -->
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #374151; margin-bottom: 20px;">Facture N° {{invoice_number}}</h2>
        
        <p style="font-size: 16px; color: #374151;">Bonjour {{to_name}},</p>
        
        <!-- Détails de la facture -->
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">Détails de la facture</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date d'émission :</td>
                    <td style="padding: 8px 0; color: #374151;">{{invoice_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Date d'échéance :</td>
                    <td style="padding: 8px 0; color: #374151;">{{invoice_due_date}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Montant total :</td>
                    <td style="padding: 8px 0; color: #374151; font-size: 18px; font-weight: bold;">{{invoice_amount}}€</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: bold;">Mode de paiement :</td>
                    <td style="padding: 8px 0; color: #374151;">{{payment_method}}</td>
                </tr>
            </table>
        </div>
        
        <!-- Message personnalisé -->
        <div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <p style="margin: 0; color: #374151; line-height: 1.6;">{{message}}</p>
        </div>
        
        <!-- Bouton d'action -->
        <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                📄 Télécharger la facture PDF
            </a>
        </div>
    </div>
    
    <!-- Footer avec coordonnées -->
    <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; color: #6b7280; font-size: 14px;">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Merci pour votre confiance !</p>
        <p style="margin: 5px 0;">📧 Contact : {{company_email}}</p>
        {{#company_phone}}<p style="margin: 5px 0;">📞 Téléphone : {{company_phone}}</p>{{/company_phone}}
        {{#company_address}}<p style="margin: 5px 0;">📍 Adresse : {{company_address}}</p>{{/company_address}}
    </div>
    
</body>
</html>
```

### 4. Variables à configurer dans EmailJS
Dans la section "Variables" ou "Parameters", ajoutez ces variables :

**Variables obligatoires :**
- `to_email` (Email du destinataire)
- `to_name` (Nom du destinataire)
- `subject` (Sujet de l'email)
- `message` (Message personnalisé)
- `invoice_number` (Numéro de facture)
- `invoice_date` (Date d'émission)
- `invoice_due_date` (Date d'échéance)
- `invoice_amount` (Montant total)
- `payment_method` (Mode de paiement)
- `company_name` (Nom de l'entreprise)
- `company_email` (Email de l'entreprise)

**Variables optionnelles :**
- `company_phone` (Téléphone de l'entreprise)
- `company_address` (Adresse de l'entreprise)

### 5. Sauvegarder le template
- Cliquez sur **"Save"** ou **"Save Template"**
- Copiez le **Template ID** qui apparaît (format : `template_xxxxxxx`)

### 6. Mettre à jour la configuration
Une fois que vous avez le nouveau Template ID, donnez-le moi et je mettrai à jour le fichier `emailService.ts` !

## 🎨 Aperçu du template
Le template créera un email avec :
- **Header** : Nom de l'entreprise avec gradient bleu
- **Détails** : Tableau avec informations de la facture
- **Message** : Zone pour le message personnalisé
- **Bouton** : Lien pour télécharger le PDF
- **Footer** : Coordonnées de l'entreprise

## ✅ Test
Une fois configuré, testez avec le bouton "Test Email" dans ProFlow !
