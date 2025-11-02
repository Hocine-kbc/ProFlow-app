-- =====================================================
-- SCHEMA COMPLET POUR MESSAGERIE EMAIL PROFLOW
-- =====================================================
-- À exécuter sur votre base Supabase (SQL Editor)

-- =====================================================
-- 1. EXTENSION DE LA TABLE MESSAGES EXISTANTE
-- =====================================================

-- Ajouter les colonnes manquantes pour une messagerie email complète
alter table public.messages
add column if not exists status text default 'sent' check (status in ('draft', 'sent', 'scheduled', 'failed')),
add column if not exists is_starred boolean default false,
add column if not exists is_archived boolean default false,
add column if not exists is_deleted boolean default false,
add column if not exists deleted_at timestamp with time zone,
add column if not exists scheduled_at timestamp with time zone,
add column if not exists thread_id uuid,
add column if not exists reply_to_id uuid references public.messages(id) on delete set null,
add column if not exists in_reply_to_id uuid references public.messages(id) on delete set null,
add column if not exists priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
add column if not exists spam_score integer default 0 check (spam_score >= 0 and spam_score <= 100),
add column if not exists is_spam boolean default false,
add column if not exists folder text default 'inbox' check (folder in ('inbox', 'sent', 'drafts', 'archive', 'trash', 'spam')),
add column if not exists recipient_email text,
add column if not exists cc text,
add column if not exists bcc text;

-- Index pour les nouvelles colonnes
create index if not exists idx_messages_status on public.messages using btree (status);
create index if not exists idx_messages_is_starred on public.messages using btree (is_starred);
create index if not exists idx_messages_is_archived on public.messages using btree (is_archived);
create index if not exists idx_messages_is_deleted on public.messages using btree (is_deleted);
create index if not exists idx_messages_folder on public.messages using btree (folder);
create index if not exists idx_messages_thread_id on public.messages using btree (thread_id);
create index if not exists idx_messages_scheduled_at on public.messages using btree (scheduled_at) where scheduled_at is not null;
create index if not exists idx_messages_priority on public.messages using btree (priority);
create index if not exists idx_messages_spam_score on public.messages using btree (spam_score);

-- =====================================================
-- 2. TABLE : MESSAGE_LABELS (Étiquettes personnalisées)
-- =====================================================

create table if not exists public.message_labels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#3b82f6',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, name)
);

create index if not exists idx_message_labels_user_id on public.message_labels using btree (user_id);

-- RLS pour message_labels
alter table public.message_labels enable row level security;

drop policy if exists "Users can view their own labels" on public.message_labels;
create policy "Users can view their own labels"
  on public.message_labels
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own labels" on public.message_labels;
create policy "Users can insert their own labels"
  on public.message_labels
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own labels" on public.message_labels;
create policy "Users can update their own labels"
  on public.message_labels
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own labels" on public.message_labels;
create policy "Users can delete their own labels"
  on public.message_labels
  for delete
  using (auth.uid() = user_id);

-- =====================================================
-- 3. TABLE : MESSAGE_LABEL_ASSIGNMENTS (Assignation d'étiquettes aux messages)
-- =====================================================

create table if not exists public.message_label_assignments (
  id uuid default gen_random_uuid() primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  label_id uuid not null references public.message_labels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(message_id, label_id)
);

create index if not exists idx_message_label_assignments_message_id on public.message_label_assignments using btree (message_id);
create index if not exists idx_message_label_assignments_label_id on public.message_label_assignments using btree (label_id);
create index if not exists idx_message_label_assignments_user_id on public.message_label_assignments using btree (user_id);

-- RLS pour message_label_assignments
alter table public.message_label_assignments enable row level security;

drop policy if exists "Users can view their own label assignments" on public.message_label_assignments;
create policy "Users can view their own label assignments"
  on public.message_label_assignments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own label assignments" on public.message_label_assignments;
create policy "Users can insert their own label assignments"
  on public.message_label_assignments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own label assignments" on public.message_label_assignments;
create policy "Users can delete their own label assignments"
  on public.message_label_assignments
  for delete
  using (auth.uid() = user_id);

-- =====================================================
-- 4. TABLE : MESSAGE_THREADS (Threads de conversation)
-- =====================================================

create table if not exists public.message_threads (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  participants uuid[] not null, -- Tableau d'IDs d'utilisateurs
  last_message_at timestamp with time zone default now(),
  unread_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_message_threads_participants on public.message_threads using gin (participants);
create index if not exists idx_message_threads_last_message_at on public.message_threads using btree (last_message_at desc);

-- RLS pour message_threads
alter table public.message_threads enable row level security;

drop policy if exists "Users can view threads they participate in" on public.message_threads;
create policy "Users can view threads they participate in"
  on public.message_threads
  for select
  using (auth.uid() = any(participants));

-- =====================================================
-- 5. TABLE : SPAM_BLACKLIST (Liste noire pour spam)
-- =====================================================

create table if not exists public.spam_blacklist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_email text not null,
  blocked_user_id uuid references auth.users(id) on delete cascade,
  reason text,
  created_at timestamp with time zone default now(),
  unique(user_id, blocked_email)
);

create index if not exists idx_spam_blacklist_user_id on public.spam_blacklist using btree (user_id);
create index if not exists idx_spam_blacklist_blocked_email on public.spam_blacklist using btree (blocked_email);

-- RLS pour spam_blacklist
alter table public.spam_blacklist enable row level security;

drop policy if exists "Users can manage their own blacklist" on public.spam_blacklist;
create policy "Users can manage their own blacklist"
  on public.spam_blacklist
  for all
  using (auth.uid() = user_id);

-- =====================================================
-- 6. TABLE : MESSAGE_SEARCH_INDEX (Index de recherche full-text)
-- =====================================================

-- Cette table peut être utilisée pour améliorer les recherches
-- Optionnel : peut être remplacé par une recherche PostgreSQL full-text native

create table if not exists public.message_search_index (
  id uuid default gen_random_uuid() primary key,
  message_id uuid not null unique references public.messages(id) on delete cascade,
  searchable_content text not null, -- Concaténation de subject + content
  created_at timestamp with time zone default now()
);

-- Index unique sur message_id (déjà créé par la contrainte unique, mais gardons un index explicite pour les performances)
create index if not exists idx_message_search_index_message_id on public.message_search_index using btree (message_id);
create index if not exists idx_message_search_index_content on public.message_search_index using gin (to_tsvector('french', searchable_content));

-- RLS pour message_search_index
alter table public.message_search_index enable row level security;

drop policy if exists "Users can view search index for their messages" on public.message_search_index;
create policy "Users can view search index for their messages"
  on public.message_search_index
  for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_search_index.message_id
      and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

-- =====================================================
-- 7. FONCTIONS UTILITAIRES
-- =====================================================

-- Fonction pour mettre à jour le thread_id automatiquement
create or replace function update_message_thread()
returns trigger as $$
declare
  thread_uuid uuid;
begin
  -- Si le message est une réponse, utiliser le thread_id du message parent
  if new.reply_to_id is not null then
    select thread_id into thread_uuid
    from public.messages
    where id = new.reply_to_id;
    
    if thread_uuid is null then
      -- Créer un nouveau thread
      insert into public.message_threads (subject, participants)
      values (
        coalesce(new.subject, 'Sans objet'),
        array[new.sender_id, new.recipient_id]
      )
      returning id into thread_uuid;
    end if;
    
    new.thread_id := thread_uuid;
  else
    -- Créer un nouveau thread pour un nouveau message
    insert into public.message_threads (subject, participants)
    values (
      coalesce(new.subject, 'Sans objet'),
      array[new.sender_id, new.recipient_id]
    )
    returning id into thread_uuid;
    
    new.thread_id := thread_uuid;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger pour mettre à jour le thread_id
drop trigger if exists update_message_thread_trigger on public.messages;
create trigger update_message_thread_trigger
  before insert on public.messages
  for each row
  when (new.thread_id is null)
  execute function update_message_thread();

-- Fonction pour mettre à jour l'index de recherche
create or replace function update_search_index()
returns trigger as $$
begin
  insert into public.message_search_index (message_id, searchable_content)
  values (
    new.id,
    coalesce(new.subject, '') || ' ' || coalesce(new.content, '')
  )
  on conflict (message_id) do update
  set searchable_content = coalesce(new.subject, '') || ' ' || coalesce(new.content, '');
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger pour mettre à jour l'index de recherche
drop trigger if exists update_search_index_trigger on public.messages;
create trigger update_search_index_trigger
  after insert or update of subject, content on public.messages
  for each row
  execute function update_search_index();

-- Fonction pour calculer un score de spam basique
create or replace function calculate_spam_score(sender_email text, content text, subject text)
returns integer as $$
declare
  score integer := 0;
begin
  -- Exemples de règles simples (à améliorer)
  if lower(content) like '%viagra%' or lower(content) like '%casino%' then
    score := score + 30;
  end if;
  
  if subject ~* '(urgent|gagner|gratuit|cliquez)' then
    score := score + 20;
  end if;
  
  if sender_email ~* '(noreply|no-reply|donotreply)' then
    score := score + 10;
  end if;
  
  return least(score, 100);
end;
$$ language plpgsql;

-- =====================================================
-- 8. MISE À JOUR DES POLITIQUES RLS EXISTANTES
-- =====================================================

-- Mettre à jour la politique de lecture pour inclure les nouveaux champs
drop policy if exists "Users can view their own messages" on public.messages;
create policy "Users can view their own messages"
  on public.messages
  for select
  using (
    auth.uid() = sender_id 
    or auth.uid() = recipient_id
  );

-- Mettre à jour la politique de mise à jour pour permettre plus d'actions
drop policy if exists "Users can update their own messages" on public.messages;
create policy "Users can update their own messages"
  on public.messages
  for update
  using (
    auth.uid() = sender_id 
    or auth.uid() = recipient_id
  )
  with check (
    auth.uid() = sender_id 
    or auth.uid() = recipient_id
  );

-- =====================================================
-- 9. VUES UTILITAIRES (OPTIONNEL - DÉSACTIVÉES)
-- =====================================================

-- NOTE: Ces vues ont été désactivées car elles tentent d'accéder à auth.users
-- directement, ce qui n'est pas autorisé dans Supabase depuis une vue publique.
-- Le code utilise directement la table messages avec les politiques RLS.
-- Si vous souhaitez les utiliser, vous devrez créer des fonctions SQL avec
-- SECURITY DEFINER ou utiliser l'API Admin de Supabase.

-- Supprimer les vues si elles existent déjà
drop view if exists public.user_inbox_messages;
drop view if exists public.user_sent_messages;

-- Les vues sont commentées mais peuvent être réactivées si nécessaire
-- avec une approche différente utilisant des fonctions SECURITY DEFINER

-- =====================================================
-- 10. COMMENTAIRES
-- =====================================================

comment on table public.message_labels is 'Étiquettes personnalisées pour organiser les messages';
comment on table public.message_label_assignments is 'Assignation d étiquettes aux messages';
comment on table public.message_threads is 'Threads de conversation pour regrouper les messages';
comment on table public.spam_blacklist is 'Liste noire pour bloquer les emails indésirables';
comment on table public.message_search_index is 'Index de recherche pour améliorer les performances de recherche';

-- =====================================================
-- FIN DU SCHEMA
-- =====================================================

