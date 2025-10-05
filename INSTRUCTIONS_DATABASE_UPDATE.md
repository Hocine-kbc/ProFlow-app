# Instructions pour mettre à jour la base de données

## 🚨 **Erreur actuelle**
L'erreur `Could not find the 'show_fixed_fee' column of 'invoices'` indique que les nouvelles colonnes pour les paramètres de "Règlement" n'existent pas encore dans la base de données.

## ✅ **Solution**

### 1. Ouvrir Supabase Dashboard
- Allez sur [supabase.com](https://supabase.com)
- Connectez-vous à votre compte
- Sélectionnez votre projet

### 2. Exécuter le script SQL
- Cliquez sur **"SQL Editor"** dans le menu de gauche
- Cliquez sur **"New query"**
- Copiez et collez ce script :

```sql
-- Ajouter les colonnes pour les paramètres de Règlement spécifiques à chaque facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;
```

### 3. Exécuter le script
- Cliquez sur **"Run"** pour exécuter le script
- Vous devriez voir un message de succès

### 4. Vérifier
- Rechargez votre application
- Essayez de créer une nouvelle facture
- L'erreur devrait disparaître

## 🔄 **Solution temporaire**
En attendant, l'application gère automatiquement cette erreur et crée les factures sans les paramètres de "Règlement" spécifiques. Une fois le script exécuté, les nouvelles factures auront leurs paramètres de "Règlement" préservés.

## 📋 **Ce que fait ce script**
- Ajoute la colonne `show_legal_rate` (taux légal) à la table `invoices`
- Ajoute la colonne `show_fixed_fee` (indemnité forfaitaire) à la table `invoices`
- Définit la valeur par défaut à `TRUE` pour les deux colonnes
- Permet aux factures de garder leurs paramètres de "Règlement" d'origine
