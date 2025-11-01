-- =====================================================
-- FIX: Supprimer les vues problématiques
-- =====================================================
-- Ces vues sont marquées "Unrestricted" dans Supabase car elles
-- tentent d'accéder à auth.users directement, ce qui n'est pas
-- autorisé depuis une vue publique.
--
-- SOLUTION: Les supprimer (elles ne sont pas utilisées dans le code)
-- Le code interroge directement la table messages avec les politiques RLS

-- Supprimer les vues si elles existent
drop view if exists public.user_inbox_messages;
drop view if exists public.user_sent_messages;

-- Vérification
-- Après exécution, ces vues ne devraient plus apparaître dans Supabase
-- et vous ne verrez plus "Unrestricted" à côté

