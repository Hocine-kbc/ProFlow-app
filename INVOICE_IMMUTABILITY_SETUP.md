# Guide : Immutabilité des factures

## 🎯 Objectif
Assurer que les factures déjà créées ne sont pas affectées par les modifications ultérieures des paramètres de l'entreprise (profil).

## ✅ Ce qui fonctionne déjà
- ✅ **Conditions de paiement** (`invoice_terms`, `payment_terms`)
- ✅ **Mode de paiement** (`payment_method`)
- ✅ **Conditions additionnelles** (`additional_terms`)

## 🔧 Ce qui doit être ajouté
- ⚠️ **Options de Règlement** (`show_legal_rate`, `show_fixed_fee`)

## 📝 Étapes pour configurer l'immutabilité complète

### 1. Exécuter le script SQL dans Supabase

Ouvrez l'**Éditeur SQL** de Supabase et exécutez le script suivant :

```sql
-- Ajouter les colonnes pour les paramètres de Règlement spécifiques à chaque facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN;

-- Mettre à jour les factures existantes (NULL = utiliser paramètres globaux)
UPDATE invoices 
SET show_legal_rate = NULL, 
    show_fixed_fee = NULL 
WHERE show_legal_rate IS NULL;

-- Ajouter des commentaires
COMMENT ON COLUMN invoices.show_legal_rate IS 'Option d''affichage du taux légal pour cette facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.show_fixed_fee IS 'Option d''affichage de l''indemnité forfaitaire pour cette facture (NULL = utiliser paramètres globaux actuels)';
```

### 2. Vérifier que les colonnes ont été ajoutées

Dans l'**Éditeur de tables** de Supabase :
1. Sélectionnez la table `invoices`
2. Vérifiez que les colonnes `show_legal_rate` et `show_fixed_fee` existent

### 3. Tester avec une nouvelle facture

1. **Créez une nouvelle facture** avec les paramètres actuels
2. **Modifiez les paramètres de Règlement** dans la page Paramètres
3. **Vérifiez que la facture existante n'a pas changé**

## 🔍 Comment ça fonctionne

### Pour les nouvelles factures
```javascript
// Dans src/lib/api.ts (ligne 457-458)
toInsert.show_legal_rate = currentSettings.showLegalRate ?? true;
toInsert.show_fixed_fee = currentSettings.showFixedFee ?? true;
```

Quand une facture est créée, elle enregistre les valeurs actuelles de `showLegalRate` et `showFixedFee`.

### Pour les factures existantes
```javascript
// Dans sharedInvoiceTemplate.js (ligne 168-169)
const showLegalRate = invoice.show_legal_rate !== null 
  ? invoice.show_legal_rate 
  : (settings?.showLegalRate !== false);

const showFixedFee = invoice.show_fixed_fee !== null 
  ? invoice.show_fixed_fee 
  : (settings?.showFixedFee !== false);
```

- Si `invoice.show_legal_rate !== null` : Utilise la valeur enregistrée dans la facture
- Si `invoice.show_legal_rate === null` : Utilise les paramètres globaux actuels

## 🧪 Tests

### Test 1 : Facture existante (NULL)
```
Facture créée le : 15/01/2024
show_legal_rate : NULL
show_fixed_fee : NULL

Paramètres globaux changés :
showLegalRate : false
showFixedFee : true

Résultat :
✅ La facture utilise les nouveaux paramètres globaux (car NULL)
```

### Test 2 : Nouvelle facture (valeurs spécifiques)
```
Facture créée le : 20/01/2024
show_legal_rate : true (enregistré)
show_fixed_fee : false (enregistré)

Paramètres globaux changés :
showLegalRate : false
showFixedFee : true

Résultat :
✅ La facture garde ses propres paramètres (immutable)
```

## 🎉 Résultat final

Une fois configuré :
- ✅ **Nouvelles factures** : Gardent leurs paramètres d'origine, même si les paramètres globaux changent
- ✅ **Factures existantes** : Continuent d'utiliser les paramètres globaux actuels (comportement par défaut)
- ✅ **Immutabilité totale** : Les factures ne changent plus jamais après leur création

## 📋 Checklist

- [ ] Script SQL exécuté dans Supabase
- [ ] Colonnes `show_legal_rate` et `show_fixed_fee` présentes dans la table `invoices`
- [ ] Test de création d'une nouvelle facture
- [ ] Test de modification des paramètres globaux
- [ ] Vérification que la facture existante ne change pas

## ⚠️ Note importante

Les factures créées **AVANT** l'exécution du script SQL auront des valeurs `NULL` pour `show_legal_rate` et `show_fixed_fee`, ce qui signifie qu'elles utiliseront les paramètres globaux actuels. C'est normal et attendu.

Les factures créées **APRÈS** auront des valeurs spécifiques et seront complètement immutables.
