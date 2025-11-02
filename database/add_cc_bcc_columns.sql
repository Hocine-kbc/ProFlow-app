-- Ajouter les colonnes cc, bcc et recipient_email à la table messages
-- À exécuter sur votre base Supabase (SQL Editor)

alter table public.messages
add column if not exists recipient_email text,
add column if not exists cc text,
add column if not exists bcc text;

-- Index optionnels pour améliorer les performances
create index if not exists idx_messages_recipient_email on public.messages using btree (recipient_email) where recipient_email is not null;

