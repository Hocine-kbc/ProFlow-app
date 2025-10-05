# Correction du problème des paramètres de facture

## Problème identifié
Les factures existantes utilisaient les paramètres globaux actuels au lieu de conserver leurs paramètres d'origine. Par exemple, si on créait une facture avec des conditions de paiement personnalisées, puis qu'on modifiait ces conditions dans les paramètres, la facture existante prenait automatiquement les nouveaux paramètres.

## Solution implémentée

### 1. Ajout de colonnes à la base de données
- `invoice_terms` (TEXT) : Conditions de paiement spécifiques à la facture
- `payment_terms` (INTEGER) : Délai de paiement spécifique à la facture (en jours)
- `include_late_payment_penalties` (BOOLEAN) : Indique si les pénalités de retard doivent être incluses

**Script SQL à exécuter dans Supabase :**
```sql
-- Ajouter les colonnes pour stocker les paramètres spécifiques de la facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER,
ADD COLUMN IF NOT EXISTS include_late_payment_penalties BOOLEAN DEFAULT FALSE;
```

### 2. Mise à jour des types TypeScript
- Ajout des nouveaux champs dans l'interface `Invoice`
- Ajout des nouveaux champs dans l'interface `DatabaseInvoice`

### 3. Modification de la fonction `createInvoice`
- Récupération des paramètres actuels lors de la création
- Sauvegarde des paramètres actuels dans la facture
- Préservation des conditions d'origine

### 4. Modification de la génération PDF
- Utilisation des paramètres stockés dans la facture en priorité
- Fallback vers les paramètres globaux si les paramètres de la facture ne sont pas définis
- Modification du serveur backend pour utiliser les paramètres de la facture

### 5. Mise à jour du template HTML
- Ajout du paramètre `includeLatePaymentPenalties` dans les settings
- Affichage conditionnel des pénalités de retard selon les paramètres de la facture

## Fichiers modifiés

1. **`add_invoice_specific_columns.sql`** - Script de migration de la base de données
2. **`src/types/index.ts`** - Ajout des nouveaux champs dans l'interface Invoice
3. **`src/lib/api.ts`** - Modification de createInvoice et fetchInvoices
4. **`server.js`** - Utilisation des paramètres de la facture pour la génération PDF
5. **`src/lib/puppeteerPdfGenerator.js`** - Ajout du paramètre includeLatePaymentPenalties

## Comment ça fonctionne maintenant

1. **Création d'une facture** : Les paramètres actuels (conditions de paiement, délais, pénalités) sont sauvegardés dans la facture
2. **Modification des paramètres globaux** : N'affecte pas les factures existantes
3. **Génération PDF** : Utilise les paramètres stockés dans la facture, pas les paramètres globaux
4. **Préservation de l'intégrité** : Chaque facture conserve ses conditions d'origine

## Test

Un script de test `test-invoice-parameters.js` a été créé pour vérifier que :
- Les paramètres sont correctement sauvegardés lors de la création
- Les paramètres sont correctement récupérés depuis la base de données
- Les paramètres de la facture correspondent aux paramètres actuels au moment de la création

## Instructions d'installation

1. Exécuter le script SQL dans Supabase
2. Redémarrer l'application
3. Tester la création d'une nouvelle facture
4. Modifier les paramètres globaux
5. Vérifier que la facture existante conserve ses paramètres originaux
