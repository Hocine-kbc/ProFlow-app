# Test de la fonctionnalité de modification de mot de passe

## 🧪 Guide de test

### 1. Accès à la fonctionnalité
- Connectez-vous à l'application
- Allez dans la page "Profil" (icône utilisateur dans la sidebar)
- Dans la section "Sécurité du compte", cliquez sur "Modifier le mot de passe"

### 2. Test des validations

#### Test 1: Mot de passe actuel incorrect
- Saisissez un mot de passe actuel incorrect
- Saisissez un nouveau mot de passe valide
- Confirmez le nouveau mot de passe
- **Résultat attendu**: Message d'erreur "Mot de passe actuel incorrect"

#### Test 2: Nouveau mot de passe trop faible
- Saisissez le mot de passe actuel correct
- Saisissez un nouveau mot de passe trop simple (ex: "123")
- **Résultat attendu**: Message d'erreur avec les critères requis

#### Test 3: Confirmation incorrecte
- Saisissez le mot de passe actuel correct
- Saisissez un nouveau mot de passe valide
- Saisissez une confirmation différente
- **Résultat attendu**: Message d'erreur "Les mots de passe ne correspondent pas"

#### Test 4: Même mot de passe
- Saisissez le mot de passe actuel
- Saisissez le même mot de passe comme nouveau
- **Résultat attendu**: Message d'erreur "Le nouveau mot de passe doit être différent de l'actuel"

### 3. Test de succès

#### Test 5: Modification réussie
- Saisissez le mot de passe actuel correct
- Saisissez un nouveau mot de passe valide (8+ caractères, majuscule, minuscule, chiffre)
- Confirmez le nouveau mot de passe
- Cliquez sur "Modifier le mot de passe"
- **Résultat attendu**: 
  - Notification de succès
  - Formulaire se ferme
  - Vous pouvez vous reconnecter avec le nouveau mot de passe

### 4. Vérification des logs

Ouvrez la console du navigateur (F12) pour voir les logs de débogage :
- 🔐 Début de la modification du mot de passe
- 👤 Vérification de l'utilisateur connecté...
- ✅ Utilisateur trouvé: [email]
- 🔍 Vérification du mot de passe actuel...
- ✅ Mot de passe actuel vérifié
- 🔄 Mise à jour du mot de passe...
- ✅ Mot de passe mis à jour avec succès

### 5. Tests d'interface

#### Test 6: Affichage/masquage des mots de passe
- Cliquez sur l'icône œil pour chaque champ
- **Résultat attendu**: Les mots de passe s'affichent/masquent

#### Test 7: Annulation
- Ouvrez le formulaire de modification
- Cliquez sur "Annuler"
- **Résultat attendu**: Formulaire se ferme, champs vidés

#### Test 8: Responsive design
- Testez sur mobile et desktop
- **Résultat attendu**: Interface adaptée à la taille d'écran

## 🐛 Problèmes potentiels et solutions

### Problème: "Utilisateur non connecté"
- **Cause**: Session expirée
- **Solution**: Se reconnecter

### Problème: "Mot de passe actuel incorrect"
- **Cause**: Mauvaise saisie du mot de passe actuel
- **Solution**: Vérifier la saisie

### Problème: Erreur de mise à jour
- **Cause**: Problème de connexion ou configuration Supabase
- **Solution**: Vérifier la console pour les détails d'erreur

## ✅ Critères de succès

La fonctionnalité est considérée comme fonctionnelle si :
1. ✅ Toutes les validations fonctionnent
2. ✅ La modification réussit avec un mot de passe valide
3. ✅ Les messages d'erreur sont clairs
4. ✅ L'interface est responsive
5. ✅ Les logs de débogage s'affichent correctement
6. ✅ La reconnexion avec le nouveau mot de passe fonctionne
