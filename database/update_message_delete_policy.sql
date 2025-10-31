-- Mettre à jour la politique de suppression pour permettre aux utilisateurs de supprimer
-- à la fois les messages qu'ils ont envoyés ET les messages qu'ils ont reçus
-- À exécuter sur votre base Supabase (SQL Editor):

-- Supprimer l'ancienne politique
drop policy if exists "Users can delete their own messages" on public.messages;

-- Créer la nouvelle politique qui permet la suppression si l'utilisateur est sender OU recipient
create policy "Users can delete their own messages"
  on public.messages
  for delete
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

