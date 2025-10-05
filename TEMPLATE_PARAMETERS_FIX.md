# Correction du problème d'impression des paramètres de facture

## Problème identifié
Les factures imprimées utilisaient les paramètres globaux au lieu des paramètres stockés dans chaque facture. Même après avoir ajouté les colonnes à la base de données et modifié la sauvegarde, l'impression continuait à utiliser les paramètres globaux.

## Cause du problème
Le template HTML (`sharedInvoiceTemplate.js`) utilisait uniquement les paramètres globaux (`settings`) au lieu des paramètres stockés dans la facture (`invoice`).

## Solution implémentée

### 1. Modification du template HTML
**Fichier modifié :** `src/lib/sharedInvoiceTemplate.js`

**Avant :**
```javascript
${settings?.invoiceTerms || settings?.paymentTerms || `Conditions de paiement: ${settings?.paymentDays || 30} jours. Aucune TVA applicable (franchise de base).`}
${settings?.includeLatePaymentPenalties ? '...' : ''}
```

**Après :**
```javascript
${invoice.invoice_terms || settings?.invoiceTerms || settings?.paymentTerms || `Conditions de paiement: ${settings?.paymentDays || 30} jours. Aucune TVA applicable (franchise de base).`}
${(invoice.include_late_payment_penalties !== null ? invoice.include_late_payment_penalties : settings?.includeLatePaymentPenalties) ? '...' : ''}
```

### 2. Logique de priorité
1. **Paramètres de la facture** : `invoice.invoice_terms`, `invoice.include_late_payment_penalties`
2. **Paramètres globaux** : `settings.invoiceTerms`, `settings.includeLatePaymentPenalties`
3. **Valeurs par défaut** : Conditions génériques

### 3. Test de validation
Un script de test `test-template-parameters.js` confirme que :
- ✅ Les paramètres de la facture sont utilisés en priorité
- ✅ Les paramètres globaux sont utilisés comme fallback
- ✅ La logique fonctionne correctement

## Fichiers modifiés

1. **`src/lib/sharedInvoiceTemplate.js`** - Modification du template pour utiliser les paramètres de la facture
2. **`test-template-parameters.js`** - Script de test pour valider la fonctionnalité

## Comment ça fonctionne maintenant

### **Impression directe (navigateur)**
1. **Template** : Utilise les paramètres de la facture en priorité
2. **Fallback** : Utilise les paramètres globaux si la facture n'a pas de paramètres spécifiques
3. **Résultat** : Chaque facture conserve ses conditions d'origine lors de l'impression

### **Génération PDF (serveur)**
- Déjà corrigée précédemment
- Utilise les paramètres stockés dans la facture

## Test de la fonctionnalité

1. **Créez une facture** avec des conditions personnalisées
2. **Modifiez les paramètres globaux** dans la page paramètres
3. **Imprimez la facture existante** → Elle conservera ses conditions d'origine
4. **Créez une nouvelle facture** → Elle utilisera les nouveaux paramètres

## Résultat final

✅ **Problème complètement résolu !**

- **Template HTML** : Utilise les paramètres de la facture
- **Génération PDF** : Utilise les paramètres de la facture
- **Nouvelles factures** : Sauvegardent les paramètres actuels
- **Factures existantes** : Conservent leurs paramètres d'origine

Les factures ne prendront plus automatiquement les nouveaux paramètres après leur création, que ce soit pour l'impression ou la génération PDF ! 🎉
