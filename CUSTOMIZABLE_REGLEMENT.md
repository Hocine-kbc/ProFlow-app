# Options personnalisables du règlement

## Nouvelle fonctionnalité
L'interface des paramètres permet maintenant de sélectionner individuellement les éléments à afficher dans la section "Règlement" des factures.

## Interface des paramètres

### **Checkbox principal**
```
☐ Règlement
```

### **Options détaillées** (apparaissent quand "Règlement" est coché)
```
☐ • Date limite : [date calculée] ([délai] jours)
☐ • Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
☐ • En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce
```

## Options disponibles

### ✅ **Date limite**
- **Description** : Affiche la date limite de paiement calculée automatiquement
- **Format** : `16/01/2025 (15 jours)`
- **Calcul** : `date_facture + délai_paiement`

### ✅ **Taux légal**
- **Description** : Affiche le taux de pénalité légal
- **Référence** : Loi n°2008-776 du 4 août 2008
- **Taux** : 3 fois le taux légal

### ✅ **Indemnité forfaitaire**
- **Description** : Affiche l'indemnité forfaitaire de recouvrement
- **Montant** : 40 €
- **Référence** : Article D. 441-5 du code du commerce

## Exemples d'utilisation

### **Toutes les options activées**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.
```

### **Seulement la date limite**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
```

### **Date limite + Taux légal**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
```

## Fichiers modifiés

1. **`src/components/InvoicesPage.tsx`** - Interface des paramètres avec options sélectionnables
2. **`src/lib/sharedInvoiceTemplate.js`** - Template HTML avec affichage conditionnel
3. **`test-customizable-reglement.js`** - Script de test pour valider la fonctionnalité

## Avantages

### **Personnalisation complète**
- Chaque élément peut être activé/désactivé individuellement
- Flexibilité maximale pour l'utilisateur
- Règlement adapté aux besoins spécifiques

### **Interface intuitive**
- Options clairement visibles
- Cases à cocher pour chaque élément
- Affichage conditionnel (options visibles seulement si "Règlement" est coché)

### **Cohérence**
- Les mêmes éléments que ceux affichés dans les factures
- Pas de duplication d'information
- Interface unifiée

## Test de la fonctionnalité

1. **Accédez aux paramètres** de facturation
2. **Cochez "Règlement"** pour activer les options détaillées
3. **Sélectionnez** les éléments que vous voulez afficher
4. **Créez une facture** pour voir le résultat
5. **Vérifiez** que seuls les éléments sélectionnés apparaissent

## Résultat final

✅ **Règlement entièrement personnalisable !**

- **Interface** : Options claires et sélectionnables
- **Flexibilité** : Chaque élément peut être activé/désactivé
- **Cohérence** : Même contenu que dans les factures
- **Personnalisation** : Règlement adapté aux besoins de chaque utilisateur

Le règlement est maintenant entièrement personnalisable selon vos préférences ! 🎉
