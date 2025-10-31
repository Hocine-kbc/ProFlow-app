-- Création de la table notifications pour stocker les notifications métier
-- À exécuter sur votre base Supabase (SQL Editor):

-- Table des notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('payment', 'message', 'invoice', 'reminder', 'system', 'warning')),
  title text not null,
  message text,
  link text, -- URL ou route vers la page concernée (ex: /invoices/123)
  read boolean default false,
  metadata jsonb, -- Données supplémentaires (ex: {invoice_id: '...', amount: 1500})
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index pour optimiser les requêtes
create index if not exists idx_notifications_user_id on public.notifications using btree (user_id);
create index if not exists idx_notifications_read on public.notifications using btree (read);
create index if not exists idx_notifications_created_at on public.notifications using btree (created_at desc);
create index if not exists idx_notifications_type on public.notifications using btree (type);
create index if not exists idx_notifications_user_read on public.notifications using btree (user_id, read);

-- RLS (Row Level Security) - Les utilisateurs ne peuvent voir que leurs propres notifications
alter table public.notifications enable row level security;

-- Politique de lecture : l'utilisateur peut voir uniquement ses notifications
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

-- Politique d'insertion : l'utilisateur peut créer ses propres notifications
create policy "Users can insert their own notifications"
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

-- Politique de mise à jour : l'utilisateur peut mettre à jour ses propres notifications
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- Politique de suppression : l'utilisateur peut supprimer ses propres notifications
create policy "Users can delete their own notifications"
  on public.notifications
  for delete
  using (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
create or replace function update_notifications_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger pour mettre à jour updated_at
drop trigger if exists update_notifications_updated_at on public.notifications;
create trigger update_notifications_updated_at
  before update on public.notifications
  for each row
  execute function update_notifications_updated_at();

