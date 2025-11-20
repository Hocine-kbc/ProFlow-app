# 🖼️ Fix : Logo dans les emails

## ✅ Correction appliquée

Le code a été modifié pour :
- ✅ N'afficher le logo **que s'il existe**
- ✅ Logger l'URL du logo pour diagnostic
- ✅ Éviter les balises `<img>` vides

---

## 🔍 Vérifications à faire sur Supabase

### **Étape 1 : Vérifier que le bucket est PUBLIC**

1. Allez sur **https://supabase.com** → Votre projet
2. Dans le menu de gauche → **Storage**
3. Cliquez sur le bucket **`logos`**
4. **Vérifiez la configuration** :
   - Le bucket doit être **PUBLIC** (pas privé)
   - Si c'est écrit "Private", cliquez sur les 3 points → **Make public**

---

### **Étape 2 : Vérifier l'URL du logo**

Dans les logs Railway, après l'envoi d'une facture, vous devriez voir :

```
🖼️ Logo URL: https://tdfhqkgvcgqgkrxarmui.supabase.co/storage/v1/object/public/logos/...
🖼️ Logo HTML généré: OUI
```

**Si vous voyez :**
```
🖼️ Logo URL: null
🖼️ Logo HTML généré: NON (pas de logo)
```
👉 Le logo n'est pas configuré dans les paramètres de l'entreprise

---

### **Étape 3 : Tester l'URL directement**

1. Copiez l'URL du logo depuis les logs
2. Ouvrez-la dans un **nouvel onglet** du navigateur
3. **Résultat attendu** : L'image s'affiche

**Si l'image ne s'affiche pas :**
- ❌ Le bucket Supabase est **privé** → Rendez-le public
- ❌ L'URL est **invalide** → Rechargez le logo dans les paramètres

---

## 🔧 Si le logo n'apparaît toujours pas dans l'email

### **Cause 1 : Client email bloque les images**

**Gmail, Outlook peuvent bloquer les images externes par défaut.**

**Solution pour le destinataire :**
1. Ouvrir l'email
2. Chercher le message "Les images sont bloquées"
3. Cliquer sur "Afficher les images" ou "Toujours afficher"

---

### **Cause 2 : Logo non uploadé**

**Vérifiez dans l'application :**
1. Allez dans **Paramètres** → **Informations de l'entreprise**
2. Section **Logo de l'entreprise**
3. Vérifiez qu'un logo est bien affiché
4. Si pas de logo → **Uploadez-en un**

---

### **Cause 3 : Bucket Supabase privé**

**Sur Supabase :**
1. **Storage** → **logos**
2. Cliquez sur **Settings** (engrenage) du bucket
3. **Public bucket** doit être **activé** (toggle ON)
4. Cliquez sur **Save**

---

## 🧪 Test après correction

### **Étape 1 : Redéployer Railway**
Attendez 2-3 minutes que Railway redéploie avec le nouveau code.

### **Étape 2 : Envoyer une facture test**
1. Envoyez une facture à vous-même
2. Vérifiez les logs Railway :
   ```
   🖼️ Logo URL: https://...
   🖼️ Logo HTML généré: OUI
   ```

### **Étape 3 : Vérifier l'email reçu**
1. Ouvrez l'email
2. **Si les images sont bloquées** → Cliquez sur "Afficher les images"
3. Le logo devrait apparaître dans le header

---

## 📊 Résumé des causes possibles

| Problème | Solution |
|----------|----------|
| Bucket privé | Rendre le bucket `logos` public sur Supabase |
| Pas de logo uploadé | Uploader un logo dans les paramètres |
| Images bloquées | Cliquer "Afficher les images" dans l'email |
| URL invalide | Vérifier l'URL dans les logs + tester dans le navigateur |

---

## ✅ Après le déploiement

**Vérifiez dans les logs Railway :**
```
🖼️ Logo URL: ...
🖼️ Logo HTML généré: OUI ou NON
```

**Si "OUI"** → Le logo sera dans l'email (sauf si images bloquées par le client)
**Si "NON"** → Pas de logo configuré dans les paramètres

