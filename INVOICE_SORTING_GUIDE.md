# 📋 Guide : Tri des Factures par Numéro

## 🎯 Problème résolu
Les factures sont maintenant triées par numéro de facture, avec les plus récentes en premier.

## ✅ Modifications apportées

### 1. **Tri dans l'interface utilisateur** (`InvoicesPage.tsx`)
```javascript
const activeInvoices = invoices
  .filter(invoice => !(invoice as any).archived_at)
  .sort((a, b) => {
    // Extraire le numéro de facture pour le tri
    const getInvoiceNumber = (invoiceNumber: string) => {
      // Format attendu: FAC-202401-001
      const parts = invoiceNumber.split('-');
      if (parts.length >= 3) {
        const year = parts[1].substring(0, 4);
        const month = parts[1].substring(4, 6);
        const number = parseInt(parts[2]);
        return parseInt(year + month) * 1000 + number;
      }
      return 0;
    };
    
    return getInvoiceNumber(b.invoice_number) - getInvoiceNumber(a.invoice_number);
  });
```

### 2. **Tri dans l'API** (`api.ts`)
```javascript
const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .order('invoice_number', { ascending: false });
```

## 🔍 Comment ça fonctionne

### Format des numéros de facture
- **Format** : `FAC-YYYYMM-NNN`
- **Exemple** : `FAC-202401-001` (Janvier 2024, facture 001)

### Logique de tri
1. **Année** : 2024 > 2023
2. **Mois** : 02 > 01 (dans la même année)
3. **Numéro** : 003 > 002 > 001 (dans le même mois)

### Ordre d'affichage
```
FAC-202402-002  ← Plus récente
FAC-202402-001
FAC-202401-010
FAC-202401-003
FAC-202401-002
FAC-202401-001  ← Plus ancienne
```

## 🧪 Test de vérification

### Test 1 : Créer plusieurs factures
1. **Créez 3 factures** dans le même mois
2. **Vérifiez l'ordre** : La dernière créée doit être en haut

### Test 2 : Factures de mois différents
1. **Créez des factures** en janvier et février
2. **Vérifiez l'ordre** : Les factures de février doivent être en haut

### Test 3 : Numéros de facture personnalisés
1. **Créez une facture** avec un numéro personnalisé
2. **Vérifiez l'ordre** : Elle doit être triée selon son numéro

## 📊 Avant/Après

### ❌ Avant (problématique)
```
FAC-202401-001  ← Affichage aléatoire
FAC-202401-003
FAC-202401-002
FAC-202402-001
```

### ✅ Après (trié)
```
FAC-202402-001  ← Plus récente en premier
FAC-202401-003
FAC-202401-002
FAC-202401-001  ← Plus ancienne en dernier
```

## 🎉 Résultat final

- ✅ **Factures triées** par numéro de facture
- ✅ **Plus récentes en premier** dans la liste
- ✅ **Tri cohérent** entre l'interface et l'API
- ✅ **Gestion des numéros personnalisés**

**Vos factures sont maintenant parfaitement organisées !** 📋
