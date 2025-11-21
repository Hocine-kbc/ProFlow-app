# 🚀 Guide de Migration des Articles vers Supabase

## ✅ Ce qui a été fait

### 1. **Schéma SQL créé** ✓
- Fichier : `database/create_articles_table.sql`
- Table `articles` avec toutes les colonnes nécessaires
- RLS (Row Level Security) activé
- Index pour les performances

### 2. **Fonctions API créées** ✓
- Fichier : `src/lib/articles-api.ts`
- `fetchArticles()` - Récupérer les articles
- `createArticle()` - Créer un article
- `updateArticle()` - Modifier un article
- `deleteArticle()` - Supprimer un article
- `migrateArticlesFromLocalStorage()` - Migration automatique

### 3. **Code mis à jour** ✓
- `src/components/ServicesPage.tsx` - Utilise maintenant Supabase
- `src/types/index.ts` - Interface Article mise à jour
- Migration automatique au premier chargement

---

## 📋 Étapes à suivre MAINTENANT

### 🔴 ÉTAPE 1 : Exécuter le schéma SQL dans Supabase (OBLIGATOIRE)

1. Allez sur https://app.supabase.com
2. Sélectionnez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche
4. Cliquez sur **New query**
5. Ouvrez le fichier `database/create_articles_table.sql`
6. **COPIEZ TOUT LE CONTENU** (Ctrl+A puis Ctrl+C)
7. **COLLEZ** dans l'éditeur SQL Supabase
8. Cliquez sur **Run** (bouton en bas à droite)
9. Attendez le message "Success. No rows returned"

**Vérification** : 
- Allez dans **Table Editor** 
- Vous devriez voir une nouvelle table `articles` avec les colonnes :
  - id
  - user_id
  - name
  - description
  - pricing_type
  - default_rate
  - default_quantity
  - category
  - is_active
  - created_at
  - updated_at

---

### ✅ ÉTAPE 2 : Commit et déployer

Une fois que le schéma SQL est exécuté dans Supabase :

```bash
git add .
git commit -m "feat: migration articles de localStorage vers Supabase

- Création de la table articles dans Supabase
- Fonctions API pour CRUD articles
- Migration automatique depuis localStorage
- Les articles sont maintenant synchronisés en production"
git push origin main
```

---

### 🔄 ÉTAPE 3 : Migration automatique

La migration se fait **automatiquement** au premier chargement de la page Prestations :

1. L'app détecte les articles dans localStorage
2. Les migre vers Supabase
3. Crée un backup dans `localStorage('articles_backup')`
4. Supprime l'ancien localStorage
5. Affiche une notification de succès

**Aucune action manuelle nécessaire !** ✨

---

## 📊 Avant vs Après

### ❌ AVANT (localStorage)
- ❌ Données uniquement sur l'appareil
- ❌ Pas de synchronisation
- ❌ Perdu si le cache est vidé
- ❌ Pas visible en production

### ✅ APRÈS (Supabase)
- ✅ Données dans le cloud
- ✅ Synchronisé partout
- ✅ Sécurisé et sauvegardé
- ✅ Visible en production

---

## 🐛 Résolution de problèmes

### Problème : "Erreur lors du chargement des articles"

**Solution** : Vérifiez que :
1. Le schéma SQL a bien été exécuté dans Supabase
2. La table `articles` existe
3. Les RLS policies sont actives

### Problème : "Les articles ne se migrent pas"

**Solution** :
1. Ouvrez la console du navigateur (F12)
2. Regardez les logs de migration
3. Vérifiez que vous êtes bien connecté
4. Vérifiez que le localStorage contient des articles

### Problème : "Cannot read property 'defaultRate' of undefined"

**Solution** : Actualisez la page après que le schéma SQL soit exécuté

---

## 🎉 Résultat final

Après ces étapes :
- ✅ Articles stockés dans Supabase
- ✅ Visible en développement ET en production
- ✅ Synchronisé sur tous les appareils
- ✅ Sauvegardé automatiquement
- ✅ Migration automatique depuis localStorage

---

## ❓ Questions fréquentes

**Q : Mes anciens articles seront-ils perdus ?**
R : Non ! Ils sont automatiquement migrés vers Supabase au premier chargement.

**Q : Puis-je supprimer le localStorage après ?**
R : Oui, mais un backup est créé automatiquement dans `articles_backup` par sécurité.

**Q : Ça fonctionne sur mobile ?**
R : Oui ! Une fois sur Supabase, les articles sont disponibles partout.

**Q : Les articles existants en production ?**
R : Vous devrez les re-créer une fois, ou ils seront migrés depuis le localStorage de chaque utilisateur.

---

**Créé le** : $(Get-Date -Format "yyyy-MM-dd HH:mm")  
**Fichiers modifiés** : 4 fichiers  
**Lignes ajoutées** : ~400 lignes

