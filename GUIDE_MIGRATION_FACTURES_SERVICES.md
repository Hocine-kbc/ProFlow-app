# 🔧 Guide de Migration : Liaison des Services aux Factures

## 📋 Contexte

Vous avez rencontré un problème où **les factures téléchargées ne contiennent aucune prestation**. Ce problème est dû au fait que les services (prestations) n'étaient pas liés aux factures dans la base de données Supabase.

### Pourquoi ce problème ?

- **Avant** : Les services étaient stockés uniquement dans `localStorage` du navigateur avec un lien "virtuel" vers les factures
- **Maintenant** : Les services sont correctement liés aux factures dans Supabase via la colonne `invoice_id`

---

## ✅ Solution Implémentée

### 1. Modifications du Code (Déjà faites)

✅ **Type `Service`** : Ajout de la propriété `invoice_id`  
✅ **Fonction `createInvoice`** : Lie automatiquement les services à la facture lors de la création  
✅ **Fonction `updateInvoice`** : Met à jour les services liés lors de l'édition  
✅ **Backend** : Récupère les services par `invoice_id` au lieu de deviner  

### 2. Migration Base de Données (À faire)

Pour que les **factures existantes** affichent leurs prestations, vous devez exécuter le script de migration SQL.

---

## 🚀 ÉTAPE 1 : Exécuter le Script SQL

### Accéder à Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New query**

### Exécuter le Script

1. Ouvrez le fichier `database/fix_invoice_services_relationship.sql` dans votre projet
2. **COPIEZ TOUT LE CONTENU** du fichier (Ctrl+A, Ctrl+C)
3. **COLLEZ** le contenu dans l'éditeur SQL de Supabase
4. Cliquez sur **Run** (ou appuyez sur F5)
5. Attendez que le script se termine (vous verrez des messages dans la console)

### Ce que fait le script

- ✅ Ajoute la colonne `invoice_id` à la table `services` (si elle n'existe pas)
- ✅ Crée des index pour améliorer les performances
- ✅ Lie automatiquement les services aux factures en se basant sur :
  - Le `client_id` (même client)
  - Le `status` = 'invoiced'
  - La date du service et de la facture (max 30 jours de différence)
- ✅ Affiche un résumé de la migration
- ✅ Liste les services qui n'ont pas pu être liés automatiquement

### Résultats Attendus

Vous devriez voir des messages comme :

```
NOTICE: Colonne invoice_id existe déjà dans la table services
NOTICE: 15 service(s) "invoiced" sans invoice_id trouvé(s)
NOTICE: ✅ Résumé de la migration :
NOTICE:    - 15 service(s) lié(s) à une facture
NOTICE:    - 0 service(s) encore sans facture
```

---

## 🔍 ÉTAPE 2 : Vérifier la Migration

### Vérification dans Supabase

1. Dans Supabase, allez dans **Table Editor**
2. Sélectionnez la table `services`
3. Vérifiez que :
   - La colonne `invoice_id` existe
   - Les services avec `status = 'invoiced'` ont une valeur dans `invoice_id`

### Vérification dans l'Application

1. **Téléchargez une facture existante** qui avait le problème
2. **Vérifiez que les prestations apparaissent** maintenant dans le PDF

---

## ⚠️ ÉTAPE 3 : Services Orphelins (Si nécessaire)

Si le script SQL indique qu'il reste des services sans `invoice_id`, vous devrez peut-être les lier manuellement.

### Diagnostic

Le script affiche les services orphelins à la fin :

```sql
id | description | service_date | client_id | client_name | hours | hourly_rate | status
```

### Liaison Manuelle (Option 1 : SQL)

Pour lier un service spécifique à une facture :

```sql
-- Remplacez <service_id> et <invoice_id> par les vrais IDs
UPDATE public.services
SET invoice_id = '<invoice_id>'
WHERE id = '<service_id>';
```

### Liaison Manuelle (Option 2 : Application)

1. Ouvrez la facture concernée dans l'application
2. Cliquez sur "Modifier"
3. Sélectionnez les prestations
4. Enregistrez
5. Les prestations seront automatiquement liées

---

## 🎯 ÉTAPE 4 : Déployer les Modifications

Une fois la migration SQL effectuée, déployez les modifications du code :

```bash
git add .
git commit -m "fix: lier les services aux factures dans Supabase"
git push origin main
```

Vercel et Railway redéploieront automatiquement l'application avec les corrections.

---

## 📊 Résumé des Avantages

### Avant
- ❌ Services stockés uniquement dans `localStorage`
- ❌ Pas de lien permanent entre services et factures
- ❌ PDFs téléchargés sans prestations
- ❌ Données perdues si on change de navigateur

### Après
- ✅ Services stockés dans Supabase
- ✅ Lien permanent via `invoice_id`
- ✅ PDFs téléchargés avec toutes les prestations
- ✅ Données accessibles partout
- ✅ **Nouvelles factures** liées automatiquement aux services

---

## 🆘 Dépannage

### Problème : Le script SQL échoue

**Erreur** : `column "invoice_id" already exists`
- ✅ **Normal** : La colonne existe déjà, le script continue

**Erreur** : `permission denied`
- ❌ **Solution** : Assurez-vous d'utiliser le **SQL Editor** de Supabase avec un compte admin

### Problème : Les factures n'affichent toujours pas les prestations

1. **Vérifiez que la migration SQL a réussi** (voir messages dans la console SQL)
2. **Vérifiez que l'application a été redéployée** (Vercel/Railway)
3. **Videz le cache du navigateur** (Ctrl+Shift+R ou Cmd+Shift+R)
4. **Rechargez l'application** et réessayez de télécharger la facture

### Problème : Certaines factures fonctionnent, d'autres non

- Les factures **créées après la migration** fonctionneront automatiquement
- Les factures **créées avant** nécessitent la migration SQL
- Si une facture spécifique ne fonctionne toujours pas, vérifiez manuellement dans Supabase que ses services ont bien un `invoice_id`

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans la console SQL de Supabase
2. Vérifiez les logs dans la console de votre navigateur (F12)
3. Vérifiez les logs du backend (Railway/Vercel)
4. Utilisez la requête SQL de diagnostic fournie dans le script

---

## 🎉 C'est tout !

Une fois la migration effectuée et l'application redéployée, toutes vos factures (anciennes et nouvelles) afficheront correctement leurs prestations lors du téléchargement.

**Note** : Les nouvelles factures créées après ce correctif seront automatiquement liées à leurs services, donc cette migration n'est à faire qu'**une seule fois**.

