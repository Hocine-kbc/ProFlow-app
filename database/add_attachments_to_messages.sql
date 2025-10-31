-- Ajouter la colonne attachments à la table messages si elle n'existe pas déjà
-- À exécuter sur votre base Supabase (SQL Editor):

alter table public.messages
add column if not exists attachments jsonb default '[]'::jsonb;

-- Index pour les recherches de messages avec pièces jointes (optionnel)
create index if not exists idx_messages_attachments on public.messages using gin (attachments);

