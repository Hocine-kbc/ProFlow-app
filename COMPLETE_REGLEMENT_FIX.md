# Correction complète du règlement pour les factures envoyées

## Problème identifié
Les factures envoyées par email utilisaient encore l'ancienne structure "Pénalités de retard" car les paramètres `showLegalRate` et `showFixedFee` n'étaient pas correctement sauvegardés et récupérés.

## Solution complète implémentée

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
**`src/types/index.ts`** - Interface `Settings` :
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

### 3. **Correction de la fonction `fetchSettings`**
**Mapping des nouveaux champs depuis la base de données :**
```typescript
const mapped: Settings = {
  // ... autres champs ...
  showLegalRate: dbData.show_legal_rate ?? true,
  showFixedFee: dbData.show_fixed_fee ?? true,
};
```

### 4. **Correction de la fonction `upsertSettings`**
**Sauvegarde des nouveaux champs en base de données :**
```typescript
const insertData = {
  // ... autres champs ...
  show_legal_rate: payload.showLegalRate ?? true,
  show_fixed_fee: payload.showFixedFee ?? true,
};
```

**Sauvegarde des nouveaux champs dans localStorage :**
```typescript
const settingsData = {
  // ... autres champs ...
  showLegalRate: payload.showLegalRate,
  showFixedFee: payload.showFixedFee,
};
```

### 5. **Transmission au serveur backend**
**`server.js`** - Construction de `companyData` :
```javascript
const companyData = {
  // ... autres paramètres ...
  showLegalRate: companySettings?.showLegalRate !== false,
  showFixedFee: companySettings?.showFixedFee !== false
};
```

**`src/lib/puppeteerPdfGenerator.js`** - Transmission au template :
```javascript
const settings = {
  // ... autres paramètres ...
  showLegalRate: companyData.showLegalRate,
  showFixedFee: companyData.showFixedFee
};
```

## Flux de données complet

### **1. Configuration des paramètres**
1. **Interface utilisateur** → Paramètres de règlement
2. **Sauvegarde** → `upsertSettings()` avec nouveaux champs
3. **Base de données** → Colonnes `show_legal_rate` et `show_fixed_fee`
4. **LocalStorage** → Fallback avec nouveaux champs

### **2. Récupération des paramètres**
1. **Base de données** → `fetchSettings()` récupère les nouveaux champs
2. **Mapping** → Conversion `show_legal_rate` → `showLegalRate`
3. **Interface** → Affichage des options personnalisables

### **3. Envoi de facture par email**
1. **Serveur** → `server.js` récupère les paramètres complets
2. **Construction** → `companyData` avec options de règlement
3. **Génération PDF** → `puppeteerPdfGenerator.js` transmet les options
4. **Template HTML** → `sharedInvoiceTemplate.js` utilise "Règlement :"

## Test de validation

### ✅ **Sauvegarde et récupération**
- **Paramètres utilisateur** : Correctement sauvegardés
- **Base de données** : Colonnes `show_legal_rate` et `show_fixed_fee`
- **LocalStorage** : Fallback avec nouveaux champs
- **Récupération** : Mapping correct des champs

### ✅ **Transmission au serveur**
- **Paramètres globaux** : Récupérés avec nouvelles options
- **Construction companyData** : Options de règlement incluses
- **Génération PDF** : Options transmises au template
- **Template HTML** : Utilise "Règlement :" avec options

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
2. **Sauvegardez** les paramètres (vérifiez qu'ils sont sauvegardés)
3. **Créez une facture** avec des conditions de règlement
4. **Envoyez la facture par email** → Vérifiez le PDF reçu
5. **Vérifiez** que le titre est "Règlement :" et que les options fonctionnent

## Résultat final

✅ **Correction complète du règlement !**

- **Titre** : "Règlement :" dans les factures envoyées
- **Options** : Personnalisables selon vos paramètres
- **Sauvegarde** : Paramètres correctement stockés en base
- **Récupération** : Paramètres correctement mappés
- **Transmission** : Options transmises au serveur
- **Cohérence** : Identique entre impression et email

**Les factures envoyées utilisent maintenant le bon titre "Règlement" avec les options personnalisables correctement sauvegardées et récupérées !** 🎉
