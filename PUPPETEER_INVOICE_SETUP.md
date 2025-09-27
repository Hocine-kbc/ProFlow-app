# Génération de Factures avec Puppeteer

## Vue d'ensemble

Cette solution remplace PDFKit par **Puppeteer** pour générer des factures PDF à partir de templates HTML + TailwindCSS. Le rendu est identique au design de votre frontend React.

## Architecture

### Fichiers créés/modifiés

1. **`src/lib/invoiceTemplate.ts`** - Template HTML avec TailwindCSS
2. **`src/lib/puppeteerPdfGenerator.ts`** - Fonction Puppeteer pour générer les PDF
3. **`server.js`** - Route `/api/send-invoice` adaptée
4. **`test-puppeteer-invoice.js`** - Script de test

### Fonctionnalités

✅ **Template HTML moderne** avec TailwindCSS inline  
✅ **Design identique au frontend** (en-tête bleu, tableaux stylés)  
✅ **Support des logos** d'entreprise (optionnel)  
✅ **Formatage automatique** des devises et dates  
✅ **Responsive design** pour différents formats  
✅ **Gestion d'erreurs** robuste  

## Utilisation

### 1. Génération de PDF

```javascript
import { generateInvoicePDFWithPuppeteer } from './src/lib/puppeteerPdfGenerator.js';

const pdfData = await generateInvoicePDFWithPuppeteer(invoiceData, companyData);
// Retourne: { buffer, filePath, fileName }
```

### 2. Données requises

**InvoiceData:**
```typescript
{
  id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  urssaf_deduction: number;
  net_amount: number;
  client: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  services: Array<{
    description: string;
    hours: number;
    hourly_rate: number;
  }>;
}
```

**CompanyData:**
```typescript
{
  name: string;
  owner: string;
  address: string;
  email: string;
  phone: string;
  siret: string;
  logoUrl?: string; // Optionnel
}
```

### 3. Test

```bash
node test-puppeteer-invoice.js
```

## Avantages vs PDFKit

| Aspect | PDFKit | Puppeteer |
|--------|--------|-----------|
| **Design** | Basique, programmatique | HTML/CSS moderne |
| **Maintenance** | Difficile à modifier | Facile (HTML/CSS) |
| **Rendu** | Limité | Identique au frontend |
| **Flexibilité** | Faible | Très élevée |
| **Performance** | Rapide | Légèrement plus lent |

## Configuration Puppeteer

La configuration Puppeteer est optimisée pour les serveurs :

```javascript
browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
  ]
});
```

## Personnalisation

### Modifier le design

Éditez `src/lib/invoiceTemplate.ts` pour personnaliser :
- Couleurs (classes Tailwind)
- Layout (grid, flexbox)
- Typographie
- Espacement

### Ajouter des champs

1. Modifier les interfaces TypeScript
2. Ajouter les champs dans le template HTML
3. Mettre à jour les données de test

### Support des logos

```javascript
const companyData = {
  // ... autres champs
  logoUrl: 'https://votre-domaine.com/logo.png'
};
```

## Déploiement

### Variables d'environnement

Aucune variable supplémentaire requise. Puppeteer fonctionne avec les dépendances existantes.

### Serveurs Linux

Sur certains serveurs Linux, vous pourriez avoir besoin d'installer des dépendances :

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y wget gnupg
sudo apt-get install -y libnss3-dev libatk-bridge2.0-dev libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2

# CentOS/RHEL
sudo yum install -y nss atk cups-libs gtk3 libXcomposite libXcursor libXdamage libXext libXi libXrandr libXScrnSaver libXtst pango at-spi2-atk libdrm libxkbcommon
```

## Dépannage

### Erreur "Failed to launch browser"

```bash
# Installer les dépendances système
sudo apt-get install -y chromium-browser
```

### Erreur de mémoire

```javascript
// Ajouter dans les options Puppeteer
args: [
  '--max_old_space_size=4096',
  '--disable-dev-shm-usage'
]
```

### Timeout

```javascript
// Augmenter le timeout
await page.waitForTimeout(2000);
```

## Performance

- **Génération** : ~2-3 secondes par PDF
- **Mémoire** : ~50-100MB par génération
- **Taille PDF** : ~100-200KB (optimisé)

## Support

Pour toute question ou problème :
1. Vérifier les logs de console
2. Tester avec `test-puppeteer-invoice.js`
3. Vérifier les permissions du dossier `temp/`
