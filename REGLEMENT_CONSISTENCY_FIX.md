# Correction de la cohérence du règlement entre impression et email

## Problème identifié
Les factures envoyées par email n'avaient pas le même règlement que les factures imprimées directement, car les options personnalisables n'étaient pas transmises au serveur backend.

## Solution implémentée

### 1. **Restauration des options dans `server.js`**
**Ajout des nouvelles options dans `companyData` :**
```javascript
const companyData = {
  // ... autres paramètres ...
  // Nouvelles options de règlement personnalisables
  showLegalRate: companySettings?.showLegalRate !== false,
  showFixedFee: companySettings?.showFixedFee !== false
};
```

### 2. **Restauration des options dans `puppeteerPdfGenerator.js`**
**Ajout des nouvelles options dans `settings` :**
```javascript
const settings = {
  // ... autres paramètres ...
  // Nouvelles options de règlement personnalisables
  showLegalRate: companyData.showLegalRate,
  showFixedFee: companyData.showFixedFee
};
```

## Flux de données corrigé

### **Impression directe**
1. **Paramètres utilisateur** → Interface des paramètres
2. **LocalStorage** → Paramètres globaux
3. **Template HTML** → `sharedInvoiceTemplate.js`
4. **Règlement** → Utilise les options personnalisables

### **Factures envoyées**
1. **Paramètres utilisateur** → Interface des paramètres
2. **Base de données** → Paramètres globaux sauvegardés
3. **Server.js** → Récupère les paramètres avec les nouvelles options
4. **Puppeteer** → Transmet les options au template
5. **Template HTML** → `sharedInvoiceTemplate.js`
6. **Règlement** → Utilise les mêmes options personnalisables

## Test de cohérence

### ✅ **Règlement identique**
- **Impression directe** : Utilise les options des paramètres
- **Factures envoyées** : Utilise les mêmes options
- **Résultat** : Affichage parfaitement identique

### ✅ **Options fonctionnelles**
- **Date limite** : Toujours affichée automatiquement
- **Taux légal** : Contrôlé par `showLegalRate`
- **Indemnité forfaitaire** : Contrôlée par `showFixedFee`

## Exemples de cohérence

### **Configuration : Taux légal activé, Indemnité désactivée**
**Impression directe :**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
```

**Facture envoyée :**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
```

**Résultat :** ✅ Identique

## Fichiers modifiés

1. **`server.js`** - Ajout des options `showLegalRate` et `showFixedFee`
2. **`src/lib/puppeteerPdfGenerator.js`** - Transmission des options au template
3. **`test-reglement-consistency.js`** - Script de test pour valider la cohérence

## Test de la fonctionnalité

1. **Configurez les paramètres** de règlement dans l'interface
2. **Créez une facture** avec des conditions de règlement
3. **Imprimez la facture directement** → Notez le règlement affiché
4. **Envoyez la facture par email** → Vérifiez le PDF reçu
5. **Comparez** → Les deux doivent être identiques

## Résultat final

✅ **Cohérence parfaite restaurée !**

- **Impression directe** : Utilise vos options de règlement
- **Factures envoyées** : Utilise exactement les mêmes options
- **Affichage identique** : Même règlement dans tous les cas
- **Personnalisation** : Contrôle total sur le règlement

**Les factures envoyées et imprimées ont maintenant exactement le même règlement !** 🎉
