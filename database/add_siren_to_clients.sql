-- Ajoute la colonne SIREN (optionnelle) à la table clients
-- À exécuter sur votre base Supabase (SQL Editor):

alter table public.clients
add column if not exists siren text null;

-- Index facultatif si vous filtrez souvent par SIREN
create index if not exists idx_clients_siren on public.clients using btree (siren);


