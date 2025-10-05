# Modification du règlement avec mode de paiement de la facture

## Modifications apportées

### 1. **Changement du titre**
**Avant :** "Pénalités de retard :"
**Après :** "Règlement :"

### 2. **Mode de paiement de la facture**
Le mode de paiement est maintenant récupéré directement de la facture avec priorité sur les paramètres globaux.

## Fonctionnalités

### ✅ **Titre "Règlement"**
- Affichage plus professionnel et clair
- Terminologie adaptée aux conditions de paiement

### ✅ **Mode de paiement de la facture**
- Utilise `invoice.payment_method` en priorité
- Fallback vers `settings.paymentMethod` si non défini
- Récupération automatique depuis la modal d'édition de la facture

### ✅ **Date limite dynamique**
- Calcul automatique basé sur les paramètres de la facture
- Affichage : `16/01/2025 (15 jours)`

### ✅ **Taux et indemnité légaux**
- Taux : 3 fois le taux légal (loi n°2008-776 du 4 août 2008)
- Indemnité : 40 € (article D. 441-5 du code du commerce)

## Exemple d'affichage

```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Mode : Virement bancaire
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.
```

## Fichiers modifiés

1. **`src/lib/sharedInvoiceTemplate.js`** - Changement du titre et utilisation du mode de paiement de la facture
2. **`test-reglement-mode.js`** - Script de test pour valider les modifications

## Test de la fonctionnalité

1. **Créez une facture** avec un mode de paiement spécifique (ex: "Virement bancaire")
2. **Définissez un délai de paiement** personnalisé (ex: 15 jours)
3. **Activez les conditions de règlement** dans les paramètres
4. **Imprimez la facture** → Le règlement affichera :
   - Le titre "Règlement :"
   - Le mode de paiement de la facture
   - La date calculée automatiquement
   - Les taux légaux

## Résultat final

✅ **Règlement personnalisé par facture !**

- **Titre** : "Règlement :" (plus professionnel)
- **Mode de paiement** : Récupéré de la facture
- **Date limite** : Calculée automatiquement
- **Taux légaux** : Conformes à la législation française

Chaque facture a maintenant ses propres conditions de règlement ! 🎉
