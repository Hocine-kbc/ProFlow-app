# 🔧 Solution : Problème des valeurs NULL

## 🎯 Problème identifié
Les colonnes ont été ajoutées avec des valeurs `NULL`, mais les factures existantes ne s'affichent pas correctement.

## ✅ Solutions

### Solution 1 : Mettre à jour les factures existantes (Recommandée)

Exécutez ce script SQL dans Supabase en remplaçant les valeurs par vos paramètres actuels :

```sql
-- Mettre à jour les factures existantes avec vos paramètres actuels
UPDATE invoices 
SET 
  company_name = 'Votre Nom d\'Entreprise Actuel',
  company_owner = 'Votre Nom Propriétaire Actuel', 
  company_email = 'votre-email@actuel.com',
  company_phone = 'Votre Téléphone Actuel',
  company_address = 'Votre Adresse Actuelle',
  company_siret = 'Votre SIRET Actuel',
  company_logo_url = 'Votre URL Logo Actuelle'
WHERE 
  company_name IS NULL 
  AND company_owner IS NULL 
  AND company_email IS NULL 
  AND company_phone IS NULL 
  AND company_address IS NULL 
  AND company_siret IS NULL 
  AND company_logo_url IS NULL;
```

### Solution 2 : Créer de nouvelles factures (Alternative)

1. **Créez une nouvelle facture** → Elle aura automatiquement les paramètres actuels
2. **Supprimez les anciennes factures** si nécessaire
3. **Les nouvelles factures seront immutables**

## 🧪 Test de vérification

### Test 1 : Facture existante mise à jour
1. **Exécutez le script SQL** ci-dessus
2. **Imprimez une facture existante** → Elle doit afficher vos paramètres actuels
3. **Modifiez vos paramètres** dans les paramètres
4. **Imprimez la même facture** → Elle doit garder les anciens paramètres

### Test 2 : Nouvelle facture
1. **Créez une nouvelle facture** → Elle doit avoir les paramètres actuels
2. **Modifiez vos paramètres** dans les paramètres  
3. **Imprimez la nouvelle facture** → Elle doit garder ses paramètres d'origine

## 🔍 Vérification dans Supabase

### Vérifier les valeurs dans la base de données :
```sql
-- Voir les factures avec leurs données d'entreprise
SELECT 
  invoice_number,
  company_name,
  company_owner,
  company_email,
  company_phone,
  company_address,
  company_siret,
  company_logo_url
FROM invoices 
ORDER BY created_at DESC;
```

### Vérifier le nombre de factures mises à jour :
```sql
-- Compter les factures avec des données d'entreprise
SELECT COUNT(*) as factures_avec_donnees 
FROM invoices 
WHERE company_name IS NOT NULL;
```

## 📋 Checklist

- [ ] Script SQL exécuté dans Supabase
- [ ] Factures existantes mises à jour
- [ ] Test d'impression d'une facture existante
- [ ] Test de modification des paramètres
- [ ] Vérification que la facture ne change pas
- [ ] Test avec une nouvelle facture

## 🎉 Résultat attendu

Après la mise à jour :
- ✅ **Factures existantes** : Affichent les paramètres actuels
- ✅ **Nouvelles factures** : Immutables, gardent leurs paramètres d'origine
- ✅ **Modifications futures** : N'affectent plus les factures existantes

## ⚠️ Note importante

- **Avant la mise à jour** : Les factures existantes ont des valeurs `NULL`
- **Après la mise à jour** : Les factures existantes ont vos paramètres actuels
- **Nouvelles factures** : Seront automatiquement immutables

**Une fois le script exécuté, tout devrait fonctionner parfaitement !** 🎉
