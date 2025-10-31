-- Création de la table messages pour le système de messagerie
-- À exécuter sur votre base Supabase (SQL Editor):

-- Table des messages
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  subject text,
  content text not null,
  attachments jsonb default '[]'::jsonb, -- Tableau d'objets {name: string, url: string, size: number, type: string}
  read boolean default false,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index pour optimiser les requêtes
create index if not exists idx_messages_sender_id on public.messages using btree (sender_id);
create index if not exists idx_messages_recipient_id on public.messages using btree (recipient_id);
create index if not exists idx_messages_client_id on public.messages using btree (client_id);
create index if not exists idx_messages_read on public.messages using btree (read);
create index if not exists idx_messages_created_at on public.messages using btree (created_at desc);
create index if not exists idx_messages_conversation on public.messages using btree (sender_id, recipient_id, created_at desc);

-- RLS (Row Level Security) - Les utilisateurs ne peuvent voir que leurs propres messages
alter table public.messages enable row level security;

-- Politique de lecture : l'utilisateur peut voir les messages qu'il a envoyés ou reçus
create policy "Users can view their own messages"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Politique d'insertion : l'utilisateur peut créer des messages
create policy "Users can insert messages"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

-- Politique de mise à jour : l'utilisateur peut mettre à jour ses propres messages ou marquer comme lu les messages reçus
create policy "Users can update their own messages"
  on public.messages
  for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Politique de suppression : l'utilisateur peut supprimer ses propres messages
create policy "Users can delete their own messages"
  on public.messages
  for delete
  using (auth.uid() = sender_id);

-- Fonction pour mettre à jour updated_at automatiquement
create or replace function update_messages_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger pour mettre à jour updated_at
drop trigger if exists update_messages_updated_at on public.messages;
create trigger update_messages_updated_at
  before update on public.messages
  for each row
  execute function update_messages_updated_at();

-- Trigger pour créer une notification lors de la réception d'un message
create or replace function notify_new_message()
returns trigger as $$
begin
  -- Créer une notification pour le destinataire
  insert into public.notifications (user_id, type, title, message, link, metadata)
  values (
    new.recipient_id,
    'message',
    'Nouveau message',
    coalesce(new.subject, 'Vous avez reçu un nouveau message'),
    'messages',
    jsonb_build_object(
      'message_id', new.id,
      'sender_id', new.sender_id,
      'client_id', new.client_id
    )
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger pour créer la notification
drop trigger if exists notify_new_message_trigger on public.messages;
create trigger notify_new_message_trigger
  after insert on public.messages
  for each row
  execute function notify_new_message();

