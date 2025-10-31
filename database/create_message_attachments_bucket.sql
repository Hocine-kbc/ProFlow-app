-- Création du bucket de stockage pour les pièces jointes des messages
-- À exécuter dans Supabase Storage ou via l'API

-- Note: Cette commande doit être exécutée via l'interface Supabase Storage
-- ou via l'API Supabase. Voici les étapes manuelles :

-- 1. Aller dans Supabase Dashboard > Storage
-- 2. Cliquer sur "Create a new bucket"
-- 3. Nom: message-attachments
-- 4. Public: Oui (pour permettre le téléchargement des fichiers)
-- 5. File size limit: 10 MB (ou selon vos besoins)
-- 6. Allowed MIME types: */* (ou spécifier selon vos besoins)

-- Ou utiliser cette fonction SQL pour créer le bucket (nécessite les permissions admin):
-- SELECT storage.create_bucket('message-attachments', 'public');

-- Politique de sécurité pour le bucket
-- Permettre à tous les utilisateurs authentifiés d'uploader
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permettre à tous les utilisateurs authentifiés de lire les fichiers
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- Permettre aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

