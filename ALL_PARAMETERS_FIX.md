# Correction complète des paramètres de facture

## Problème identifié
Les factures imprimées utilisaient les paramètres globaux au lieu des paramètres stockés dans chaque facture pour tous les champs de conditions de paiement et de facturation.

## Solution implémentée

### 1. **Ajout de colonnes à la base de données**
**Script SQL à exécuter dans Supabase :**
```sql
-- Ajouter les colonnes supplémentaires pour stocker les paramètres spécifiques de la facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS additional_terms TEXT;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN invoices.payment_method IS 'Mode de paiement spécifique à cette facture';
COMMENT ON COLUMN invoices.additional_terms IS 'Conditions supplémentaires spécifiques à cette facture';
```

### 2. **Mise à jour des types TypeScript**
- **Interface `Invoice`** : Ajout de `additional_terms?: string`
- **Interface `Settings`** : Ajout de `paymentMethod?: string` et `additionalTerms?: string`
- **Interface `DatabaseInvoice`** : Ajout de `additional_terms?: string`
- **Interface `DatabaseSettings`** : Ajout de `paymentmethod?: string` et `additionalterms?: string`

### 3. **Modification du template HTML**
**Fichier modifié :** `src/lib/sharedInvoiceTemplate.js`

**Changements apportés :**
- **Mode de paiement** : `invoice.payment_method || settings?.paymentMethod`
- **Conditions supplémentaires** : `invoice.additional_terms || settings?.additionalTerms`
- **Pénalités de retard** : Utilise les paramètres de la facture en priorité

### 4. **Mise à jour de la sauvegarde**
**Fichier modifié :** `src/lib/api.ts`
- **Fonction `createInvoice`** : Sauvegarde `additional_terms` dans la facture
- **Fonction `fetchInvoices`** : Mappe `additional_terms` depuis la base de données

## Fichiers modifiés

1. **`add_additional_invoice_columns.sql`** - Script de migration pour les nouvelles colonnes
2. **`src/types/index.ts`** - Ajout des nouveaux champs dans les interfaces
3. **`src/lib/api.ts`** - Mise à jour de la sauvegarde et récupération
4. **`src/lib/sharedInvoiceTemplate.js`** - Utilisation des paramètres de la facture en priorité
5. **`test-all-parameters.js`** - Script de test pour valider tous les paramètres

## Paramètres concernés

### **Paramètres de la facture (priorité)**
- `invoice.invoice_terms` - Conditions de paiement personnalisées
- `invoice.payment_terms` - Délai de paiement spécifique
- `invoice.include_late_payment_penalties` - Pénalités de retard
- `invoice.payment_method` - Mode de paiement spécifique
- `invoice.additional_terms` - Conditions supplémentaires

### **Paramètres globaux (fallback)**
- `settings.invoiceTerms` - Conditions de paiement globales
- `settings.paymentTerms` - Délai de paiement global
- `settings.includeLatePaymentPenalties` - Pénalités de retard globales
- `settings.paymentMethod` - Mode de paiement global
- `settings.additionalTerms` - Conditions supplémentaires globales

## Test de la fonctionnalité

1. **Exécutez le script SQL** dans Supabase pour ajouter les nouvelles colonnes
2. **Créez une facture** avec des conditions personnalisées
3. **Modifiez les paramètres globaux** dans la page paramètres
4. **Imprimez la facture existante** → Elle conservera ses conditions d'origine
5. **Créez une nouvelle facture** → Elle utilisera les nouveaux paramètres

## Résultat final

✅ **Problème complètement résolu !**

- **Tous les paramètres** : Utilisent les paramètres de la facture en priorité
- **Nouvelles factures** : Sauvegardent tous les paramètres actuels
- **Factures existantes** : Conservent tous leurs paramètres d'origine
- **Impression et PDF** : Utilisent les paramètres stockés dans chaque facture

Les factures ne prendront plus automatiquement les nouveaux paramètres après leur création, pour tous les champs de conditions de paiement et de facturation ! 🎉
