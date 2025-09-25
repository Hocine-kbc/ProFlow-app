# Configuration du téléchargement direct de factures

## 🎯 Objectif
Permettre aux clients de télécharger directement la facture PDF sans avoir besoin de se connecter.

## 📧 Template Email mis à jour

### 1. Utiliser le nouveau template
- **Fichier** : `TEMPLATE_EMAIL_AVEC_DOWNLOAD.html`
- **Différence** : Bouton de téléchargement direct au lieu du message informatif

### 2. Mettre à jour dans EmailJS
1. Allez dans votre template `template_ybddyxu`
2. Remplacez le contenu par le code du fichier `TEMPLATE_EMAIL_AVEC_DOWNLOAD.html`
3. Sauvegardez

## 🔗 Variables ajoutées

Le template utilise maintenant :
- `{{download_url}}` : Lien direct vers le PDF
- `{{invoice_id}}` : ID de la facture

## 🚀 Solutions pour le téléchargement direct

### Option 1 : Lien vers votre serveur (Recommandé)
```javascript
// Dans emailService.ts, remplacez l'URL par votre domaine
download_url: `https://votre-domaine.com/api/invoice/${emailData.invoice_number}/pdf`
```

### Option 2 : Lien vers un service de stockage
```javascript
// Utiliser un service comme AWS S3, Google Drive, ou Dropbox
download_url: `https://votre-bucket.s3.amazonaws.com/invoices/${emailData.invoice_number}.pdf`
```

### Option 3 : Lien vers votre application avec token
```javascript
// Générer un token temporaire pour l'accès
download_url: `https://votre-domaine.com/invoice/${emailData.invoice_number}/download?token=${temporaryToken}`
```

## 🛠️ Implémentation technique

### 1. Créer une route API
```javascript
// pages/api/invoice/[id]/pdf.js (Next.js)
// ou app/api/invoice/[id]/pdf/route.js (App Router)

export async function GET(request, { params }) {
  const { id } = params;
  
  // Récupérer la facture depuis la base de données
  const invoice = await getInvoice(id);
  
  // Générer le PDF
  const pdfBuffer = await generatePDF(invoice);
  
  // Retourner le PDF
  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="facture-${id}.pdf"`
    }
  });
}
```

### 2. Utiliser une librairie PDF
```bash
npm install jspdf html2canvas
# ou
npm install puppeteer
```

### 3. Configuration dans emailService.ts
```typescript
// Remplacer l'URL par votre vraie URL
download_url: `https://votre-domaine.com/api/invoice/${emailData.invoice_number}/pdf`
```

## 📋 Étapes à suivre

1. **Choisir votre solution** (serveur, stockage, token)
2. **Mettre à jour l'URL** dans `emailService.ts`
3. **Tester** avec le bouton "Test Email"
4. **Vérifier** que le lien fonctionne

## 🔒 Sécurité

- **Token temporaire** : Limiter l'accès dans le temps
- **Validation** : Vérifier que la facture existe
- **Rate limiting** : Éviter les abus
- **HTTPS** : Toujours utiliser des liens sécurisés

## ✅ Test

1. Envoyez un email de test
2. Cliquez sur le bouton "Télécharger la facture PDF"
3. Vérifiez que le PDF se télécharge
4. Vérifiez que le contenu est correct

## 🎨 Résultat attendu

L'email contiendra maintenant :
- **Header** : Nom + email de l'entreprise
- **Détails** : Informations de la facture
- **Message** : Texte personnalisé
- **Bouton** : "📄 Télécharger la facture PDF" (fonctionnel)
- **Footer** : Coordonnées de l'entreprise

Le client pourra cliquer et télécharger directement le PDF ! 🚀
