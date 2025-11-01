-- =====================================================
-- FIX: Ajouter la contrainte UNIQUE manquante
-- =====================================================
-- L'erreur "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- vient du fait que message_search_index n'a pas de contrainte UNIQUE sur message_id
-- alors que la fonction update_search_index() utilise ON CONFLICT (message_id)

-- Ajouter la contrainte UNIQUE si elle n'existe pas
alter table public.message_search_index 
  add constraint message_search_index_message_id_key unique (message_id);

-- Vérification
-- Après exécution, la fonction update_search_index() devrait fonctionner correctement
-- et vous ne devriez plus voir l'erreur 42P10

