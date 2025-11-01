# 🔧 Fix : Email "Expéditeur inconnu" / "Destinataire inconnu"

## 🔍 Diagnostic

Si vous voyez "Email inconnu" ou "Expéditeur inconnu", cela signifie que :
1. La clé `SUPABASE_SERVICE_KEY` n'est pas configurée dans `.env`
2. OU la route backend ne fonctionne pas correctement

## ✅ Solution 1 : Vérifier la clé SUPABASE_SERVICE_KEY

### 1. Vérifier votre fichier `.env`

Ouvrez le fichier `.env` à la racine du projet et vérifiez que vous avez :

```env
SUPABASE_SERVICE_KEY=votre-service-role-key-ici
```

**Important** : C'est la clé **service_role** (pas l'anon key) !

### 2. Où trouver la clé service_role ?

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Dans **Project API keys**, cherchez la clé **service_role** (secret)
5. **⚠️ Ne jamais exposer cette clé dans le frontend !**

### 3. Redémarrer le serveur

Après avoir ajouté/modifié la clé :

```bash
# Arrêtez le serveur (Ctrl+C)
# Relancez
node server.js
```

Vous devriez voir dans les logs :
```
✅ SendGrid configuré
🚀 Serveur sur port 3001
```

**⚠️ Si vous voyez** :
```
⚠️ SUPABASE_SERVICE_KEY non défini. L'API Admin ne fonctionnera pas correctement.
```

Cela signifie que la clé n'est pas chargée. Vérifiez votre `.env`.

---

## ✅ Solution 2 : Vérifier les logs

### Dans le terminal du serveur backend

Quand vous ouvrez la boîte de réception, vous devriez voir :

```
🔍 Recherche emails pour X utilisateurs: [...]
✅ X utilisateurs récupérés depuis Supabase
  - uuid1: email1@example.com
  - uuid2: email2@example.com
📧 Email map final: {...}
```

Si vous voyez des erreurs, notez-les et vérifiez :
- La clé service_role est correcte
- La clé service_role a les permissions admin

---

## ✅ Solution 3 : Vérifier la console du navigateur

Ouvrez la console du navigateur (F12) et regardez :

1. **Erreur de requête** : Vérifiez l'onglet Network
   - Regardez la requête vers `/api/messages/get-users-emails`
   - Vérifiez le status code (devrait être 200)
   - Si 401 : problème d'authentification
   - Si 500 : problème backend (regardez les logs serveur)

2. **Logs de debug** : Vous devriez voir :
   ```
   ✅ Emails récupérés: {uuid1: "email1@...", uuid2: "email2@..."}
   ```

---

## 🔧 Test rapide

1. **Redémarrer le serveur** : `node server.js`
2. **Vérifier les logs** au démarrage (pas d'avertissement SUPABASE_SERVICE_KEY)
3. **Ouvrir la boîte de réception** dans l'app
4. **Vérifier la console** du navigateur (F12) pour les logs
5. **Vérifier le terminal** du serveur pour les logs backend

---

## 📝 Checklist

- [ ] `SUPABASE_SERVICE_KEY` est dans le fichier `.env`
- [ ] La clé est la **service_role** (pas l'anon key)
- [ ] Le serveur backend est redémarré après modification de `.env`
- [ ] Pas d'avertissement dans les logs du serveur
- [ ] La requête `/api/messages/get-users-emails` fonctionne (vérifier dans Network)
- [ ] Les logs backend montrent des utilisateurs récupérés

---

## 🆘 Si ça ne fonctionne toujours pas

Copiez les logs du serveur backend et de la console du navigateur, et je vous aiderai à identifier le problème spécifique.

