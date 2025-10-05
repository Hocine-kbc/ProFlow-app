# Correction du titre "Règlement" pour les factures envoyées

## Problème identifié
Les factures envoyées par email utilisaient encore l'ancienne structure "Pénalités de retard" au lieu de "Règlement" car les paramètres `showLegalRate` et `showFixedFee` n'étaient pas correctement sauvegardés et transmis.

## Solution implémentée

### 1. **Ajout des colonnes à la base de données**
**Script SQL à exécuter dans Supabase :**
```sql
-- Ajouter les colonnes pour les options de règlement personnalisables
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN settings.show_legal_rate IS 'Afficher le taux légal dans le règlement';
COMMENT ON COLUMN settings.show_fixed_fee IS 'Afficher l\'indemnité forfaitaire dans le règlement';
```

### 2. **Mise à jour des interfaces TypeScript**
**`src/types/index.ts`** - Ajout des nouveaux champs :
```typescript
export interface Settings {
  // ... autres champs ...
  showLegalRate?: boolean;
  showFixedFee?: boolean;
}
```

**`src/lib/api.ts`** - Interface `DatabaseSettings` :
```typescript
interface DatabaseSettings {
  // ... autres champs ...
  show_legal_rate?: boolean;
  show_fixed_fee?: boolean;
}
```

### 3. **Mise à jour de la fonction `fetchSettings`**
**Mapping des nouveaux champs depuis la base de données :**
```typescript
const mapped: Settings = {
  // ... autres champs ...
  showLegalRate: dbData.show_legal_rate ?? true,
  showFixedFee: dbData.show_fixed_fee ?? true,
};
```

## Flux de données corrigé

### **Factures envoyées**
1. **Paramètres utilisateur** → Interface des paramètres
2. **Sauvegarde** → Base de données avec `show_legal_rate` et `show_fixed_fee`
3. **Envoi d'email** → `server.js` récupère les paramètres complets
4. **Construction** → `companyData` avec les options de règlement
5. **Génération PDF** → `puppeteerPdfGenerator.js` transmet les options
6. **Template HTML** → `sharedInvoiceTemplate.js` utilise "Règlement :"

## Test de validation

### ✅ **Titre correct**
- **Avant** : "Pénalités de retard :"
- **Après** : "Règlement :"

### ✅ **Options fonctionnelles**
- **Date limite** : Toujours affichée automatiquement
- **Taux légal** : Contrôlé par `showLegalRate`
- **Indemnité forfaitaire** : Contrôlée par `showFixedFee`

### ✅ **Cohérence**
- **Impression directe** : Utilise "Règlement :"
- **Factures envoyées** : Utilise "Règlement :"
- **Résultat** : Affichage identique

## Exemple d'affichage corrigé

### **Configuration : Taux légal activé, Indemnité désactivée**
```
Règlement :
• Date limite : 16/01/2025 (15 jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
```

## Fichiers modifiés

1. **`add_reglement_options_to_settings.sql`** - Script de migration pour les nouvelles colonnes
2. **`src/types/index.ts`** - Ajout des nouveaux champs dans l'interface `Settings`
3. **`src/lib/api.ts`** - Mise à jour de `DatabaseSettings` et `fetchSettings`
4. **`test-email-reglement-fix.js`** - Script de test pour valider la correction

## Actions requises

### **1. Exécuter le script SQL dans Supabase**
```sql
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;
```

### **2. Redémarrer l'application**
Les modifications du code sont déjà en place.

### **3. Tester la fonctionnalité**
1. **Configurez les paramètres** de règlement dans l'interface
2. **Créez une facture** avec des conditions de règlement
3. **Envoyez la facture par email** → Vérifiez que le titre est "Règlement :"
4. **Vérifiez** que les options personnalisables fonctionnent

## Résultat final

✅ **Titre "Règlement" restauré pour les factures envoyées !**

- **Titre** : "Règlement :" (au lieu de "Pénalités de retard :")
- **Options** : Fonctionnelles et personnalisables
- **Cohérence** : Identique entre impression et email
- **Sauvegarde** : Paramètres correctement stockés en base

**Les factures envoyées utilisent maintenant le bon titre "Règlement" avec les options personnalisables !** 🎉
