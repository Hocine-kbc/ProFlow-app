# 🎯 Guide Complet : Immutabilité Totale des Factures

## 📋 Problème résolu
Les factures ne changent plus jamais après leur création, même si vous modifiez :
- ✅ **Logo de l'entreprise**
- ✅ **Nom de l'entreprise**
- ✅ **Coordonnées (email, téléphone, adresse)**
- ✅ **SIRET**
- ✅ **Conditions de paiement**
- ✅ **Options de Règlement**

## 🔧 Étapes à suivre

### 1. Exécuter le script SQL dans Supabase

Ouvrez l'**Éditeur SQL** de Supabase et exécutez ce script :

```sql
-- Ajouter les colonnes pour les données d'entreprise au moment de la création
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_owner TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_siret TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Ajouter les colonnes pour les options de Règlement
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN;

-- Les factures existantes auront NULL (utiliseront les paramètres globaux actuels)
-- Les nouvelles factures auront des valeurs spécifiques (immutables)
```

### 2. Vérifier que les colonnes ont été ajoutées

Dans l'**Éditeur de tables** de Supabase :
1. Sélectionnez la table `invoices`
2. Vérifiez que ces colonnes existent :
   - `company_name`
   - `company_owner`
   - `company_email`
   - `company_phone`
   - `company_address`
   - `company_siret`
   - `company_logo_url`
   - `show_legal_rate`
   - `show_fixed_fee`

## 🧪 Tests de vérification

### Test 1 : Logo de l'entreprise
1. **Créez une facture** avec un logo
2. **Supprimez le logo** dans les paramètres
3. **Imprimez la facture** → Le logo doit toujours apparaître

### Test 2 : Coordonnées de l'entreprise
1. **Créez une facture** avec vos coordonnées actuelles
2. **Modifiez vos coordonnées** dans les paramètres
3. **Imprimez la facture** → Les anciennes coordonnées doivent apparaître

### Test 3 : Options de Règlement
1. **Créez une facture** avec certaines options de Règlement
2. **Modifiez les options** dans les paramètres
3. **Imprimez la facture** → Les anciennes options doivent apparaître

## 🔍 Comment ça fonctionne

### Pour les nouvelles factures
Quand une facture est créée, elle sauvegarde **toutes** les données d'entreprise actuelles :

```javascript
// Dans src/lib/api.ts
toInsert.company_name = currentSettings.companyName;
toInsert.company_owner = currentSettings.ownerName;
toInsert.company_email = currentSettings.email;
toInsert.company_phone = currentSettings.phone;
toInsert.company_address = currentSettings.address;
toInsert.company_siret = currentSettings.siret;
toInsert.company_logo_url = currentSettings.logoUrl;
```

### Pour les factures existantes
Les factures existantes ont des valeurs `NULL`, donc elles utilisent les paramètres globaux actuels (comportement par défaut).

### Pour l'affichage
Les templates utilisent les données sauvegardées en priorité :

```javascript
// Dans sharedInvoiceTemplate.js
${invoice.company_name || settings?.companyName || 'ProFlow'}
${invoice.company_logo_url || settings?.logoUrl}
```

## 📊 Comparaison Avant/Après

### ❌ Avant (problématique)
```
1. Créer facture avec logo "logo1.png"
2. Changer logo vers "logo2.png" 
3. Imprimer facture → Affiche "logo2.png" ❌
```

### ✅ Après (immutable)
```
1. Créer facture avec logo "logo1.png"
2. Changer logo vers "logo2.png"
3. Imprimer facture → Affiche "logo1.png" ✅
```

## 🎉 Résultat final

Une fois configuré :
- ✅ **Logo** : Immutable après création
- ✅ **Nom entreprise** : Immutable après création  
- ✅ **Coordonnées** : Immutables après création
- ✅ **SIRET** : Immutable après création
- ✅ **Conditions de paiement** : Immutables après création
- ✅ **Options de Règlement** : Immutables après création

## 📋 Checklist finale

- [ ] Script SQL exécuté dans Supabase
- [ ] Colonnes ajoutées à la table `invoices`
- [ ] Test de création d'une nouvelle facture
- [ ] Test de modification des paramètres globaux
- [ ] Vérification que la facture existante ne change pas
- [ ] Test avec logo, coordonnées, et options de Règlement

## ⚠️ Note importante

- **Factures créées AVANT** : Utilisent les paramètres globaux actuels (comportement normal)
- **Factures créées APRÈS** : Complètement immutables, gardent leurs données d'origine

**Vos factures sont maintenant protégées contre tous les changements futurs !** 🛡️
