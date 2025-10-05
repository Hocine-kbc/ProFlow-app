# Amélioration de l'affichage des pénalités de retard

## Problème identifié
L'affichage des pénalités de retard utilisait des valeurs fixes et ne prenait pas en compte les paramètres spécifiques de chaque facture.

## Solution implémentée

### 1. **Calcul automatique de la date limite**
**Avant :** Date fixe basée sur `invoice.due_date`
**Après :** Calcul dynamique basé sur les paramètres de la facture

```javascript
// Calculer la date limite à partir des paramètres de la facture
const paymentTerms = invoice.payment_terms || settings?.paymentTerms || 30;
const invoiceDate = new Date(invoice.date);
const dueDate = new Date(invoiceDate);
dueDate.setDate(dueDate.getDate() + paymentTerms);
```

### 2. **Mode de paiement spécifique à la facture**
**Avant :** Mode fixe ou paramètres globaux
**Après :** Mode de paiement de la facture en priorité

```javascript
// Utiliser le mode de paiement de la facture en priorité
const paymentMode = invoice.payment_method || settings?.paymentMethod || 'Non spécifié';
```

### 3. **Affichage amélioré**
**Nouveau format :**
```
Pénalités de retard :
• Date limite : 16/01/2025 (15 jours)
• Mode : Virement bancaire
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.
```

## Fonctionnalités

### **Date limite dynamique**
- ✅ Utilise `invoice.payment_terms` en priorité
- ✅ Fallback vers `settings.paymentTerms` si non défini
- ✅ Calcul automatique : `date_facture + délai_paiement`
- ✅ Affichage : `16/01/2025 (15 jours)`

### **Mode de paiement spécifique**
- ✅ Utilise `invoice.payment_method` en priorité
- ✅ Fallback vers `settings.paymentMethod` si non défini
- ✅ Affichage du mode choisi dans la modal d'édition

### **Taux et indemnité légaux**
- ✅ Taux : 3 fois le taux légal (loi n°2008-776 du 4 août 2008)
- ✅ Indemnité : 40 € (article D. 441-5 du code du commerce)
- ✅ Références légales complètes

## Fichiers modifiés

1. **`src/lib/sharedInvoiceTemplate.js`** - Amélioration du calcul et de l'affichage des pénalités
2. **`test-penalties-calculation.js`** - Script de test pour valider le calcul

## Test de la fonctionnalité

1. **Créez une facture** avec un délai de paiement personnalisé (ex: 15 jours)
2. **Définissez un mode de paiement** dans la modal d'édition
3. **Activez les pénalités de retard** dans les paramètres
4. **Imprimez la facture** → Les pénalités afficheront :
   - La date calculée automatiquement
   - Le mode de paiement spécifique
   - Les taux légaux corrects

## Résultat final

✅ **Affichage intelligent des pénalités !**

- **Date limite** : Calculée automatiquement à partir des paramètres de la facture
- **Mode de paiement** : Utilise le mode choisi dans la modal d'édition
- **Taux légaux** : Références complètes et conformes à la législation française
- **Personnalisation** : Chaque facture a ses propres conditions de pénalités

Les pénalités de retard sont maintenant parfaitement adaptées à chaque facture ! 🎉
