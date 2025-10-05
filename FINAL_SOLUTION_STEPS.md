# Solution finale pour résoudre le problème du règlement

## Diagnostic complet effectué

### ✅ **Templates vérifiés**
- `sharedInvoiceTemplate.js` : ✅ Mis à jour avec "Règlement :"
- `invoiceTemplate.ts` : ✅ Mis à jour avec "Règlement :"
- Serveur utilise `generateSharedInvoiceHTML` : ✅

### ✅ **Code vérifié**
- `upsertSettings()` : ✅ Sauvegarde les nouveaux champs
- `fetchSettings()` : ✅ Récupère et mappe les nouveaux champs
- `server.js` : ✅ Transmet les options au template
- `puppeteerPdfGenerator.js` : ✅ Transmet les options au template

### ✅ **Logique vérifiée**
- Template utilise la bonne condition : ✅
- Options personnalisables fonctionnent : ✅
- Flux de données complet : ✅

## Action requise : Exécuter le script SQL

**Le problème principal est probablement que le script SQL n'a pas été exécuté dans Supabase.**

### **Script SQL à exécuter dans Supabase :**
```sql
-- Ajouter les colonnes pour les options de règlement personnalisables
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN settings.show_legal_rate IS 'Afficher le taux légal dans le règlement';
COMMENT ON COLUMN settings.show_fixed_fee IS 'Afficher l\'indemnité forfaitaire dans le règlement';
```

## Étapes de vérification

### **1. Vérifier que le script SQL a été exécuté**
- Aller dans Supabase → SQL Editor
- Exécuter le script ci-dessus
- Vérifier que les colonnes existent

### **2. Vérifier que les paramètres sont sauvegardés**
- Aller dans l'interface des paramètres
- Configurer les options de règlement
- Sauvegarder les paramètres
- Vérifier en base que les colonnes sont remplies

### **3. Tester l'envoi d'une facture**
- Créer une facture avec des conditions de règlement
- Envoyer la facture par email
- Vérifier le PDF reçu
- Le titre doit être "Règlement :" et non "Pénalités de retard :"

## Si le problème persiste après l'exécution du script SQL

### **Vérifications supplémentaires :**

1. **Redémarrer l'application** après l'exécution du script SQL
2. **Vider le cache** du navigateur
3. **Vérifier les logs** du serveur pour voir les paramètres transmis
4. **Tester avec une nouvelle facture** après avoir reconfiguré les paramètres

## Résumé des modifications apportées

### **Fichiers modifiés :**
1. `src/lib/sharedInvoiceTemplate.js` - Template principal
2. `src/lib/invoiceTemplate.ts` - Template alternatif
3. `src/lib/api.ts` - Sauvegarde et récupération des paramètres
4. `src/types/index.ts` - Interfaces TypeScript
5. `server.js` - Transmission des paramètres au serveur
6. `src/lib/puppeteerPdfGenerator.js` - Transmission au template

### **Scripts SQL créés :**
1. `add_reglement_options_to_settings.sql` - Ajout des colonnes
2. `add_payment_method_column.sql` - Ajout de la colonne payment_method

## Résultat attendu

Après l'exécution du script SQL et la reconfiguration des paramètres :

✅ **Les factures envoyées afficheront :**
```
Règlement :
• Date limite : [date calculée] ([délai] jours)
• Taux annuel de pénalité en cas de retard de paiement : 3 fois le taux légal selon la loi n°2008-776 du 4 août 2008
• En cas de retard de paiement, application d'une indemnité forfaitaire pour frais de recouvrement de 40 € selon l'article D. 441-5 du code du commerce.
```

**Au lieu de l'ancienne structure :**
```
Pénalités de retard :
• Date limite : [date fixe]
• Mode : [mode de paiement]
• Taux annuel de pénalité...
• En cas de retard de paiement...
```

## Action immédiate

**Exécutez le script SQL dans Supabase maintenant, puis testez l'envoi d'une facture par email.**
