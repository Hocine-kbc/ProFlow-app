# Correction du problème du mode de paiement "Non spécifié"

## Problème identifié
Le mode de paiement affiche "Non spécifié" au lieu du mode choisi lors de la création de la facture.

## Cause du problème
La colonne `payment_method` n'existe pas encore dans la base de données, donc le mode de paiement n'est pas sauvegardé.

## Solution implémentée

### 1. **Ajout de la colonne à la base de données**
**Script SQL à exécuter dans Supabase :**
```sql
-- Ajouter la colonne payment_method à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN invoices.payment_method IS 'Mode de paiement spécifique à cette facture';
```

### 2. **Activation de la sauvegarde du mode de paiement**
**Fichier modifié :** `src/lib/api.ts`

**Avant :**
```javascript
// Note: payment_method column might not exist in database yet
// if (invoiceData.payment_method !== undefined) toInsert.payment_method = invoiceData.payment_method;
```

**Après :**
```javascript
// Sauvegarder le mode de paiement de la facture
if (invoiceData.payment_method !== undefined) toInsert.payment_method = invoiceData.payment_method;
```

### 3. **Récupération du mode de paiement**
La fonction `fetchInvoices` récupère déjà le mode de paiement depuis la base de données avec fallback vers localStorage.

## Étapes de résolution

### **1. Exécuter le script SQL dans Supabase**
```sql
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT;
```

### **2. Redémarrer l'application**
Les modifications du code sont déjà en place.

### **3. Tester la fonctionnalité**
1. **Créez une nouvelle facture** avec un mode de paiement (ex: "Virement bancaire")
2. **Vérifiez l'impression** → Le mode de paiement doit s'afficher correctement
3. **Vérifiez le règlement** → Le mode doit être récupéré de la facture

## Fichiers modifiés

1. **`add_payment_method_column.sql`** - Script de migration pour ajouter la colonne
2. **`src/lib/api.ts`** - Activation de la sauvegarde du mode de paiement
3. **`test-payment-method-save.js`** - Script de test pour valider la fonctionnalité

## Test de validation

Le script de test confirme que :
- ✅ Le mode de paiement est inclus dans les données à sauvegarder
- ✅ Le mode de paiement est correctement récupéré
- ✅ La logique de sauvegarde et récupération fonctionne

## Résultat attendu

Après avoir exécuté le script SQL dans Supabase :

✅ **Mode de paiement correctement affiché !**

- **Création de facture** : Le mode choisi est sauvegardé en base
- **Impression** : Le mode de paiement s'affiche correctement
- **Règlement** : Le mode est récupéré de la facture, pas des paramètres globaux

**Le problème "Non spécifié" sera résolu !** 🎉
