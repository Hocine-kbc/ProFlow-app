-- Ajouter un champ pour gérer les suppressions par utilisateur
-- À exécuter sur votre base Supabase (SQL Editor):

-- Ajouter la colonne deleted_by_users pour stocker les IDs des utilisateurs qui ont supprimé le message
alter table public.messages
add column if not exists deleted_by_users jsonb default '[]'::jsonb;

-- Créer un index pour les recherches sur deleted_by_users
create index if not exists idx_messages_deleted_by_users on public.messages using gin (deleted_by_users);

