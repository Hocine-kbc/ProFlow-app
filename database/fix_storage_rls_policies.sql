-- Correction des politiques RLS pour le bucket message-attachments
-- À exécuter sur votre base Supabase (SQL Editor):

-- 1. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view attachments" ON storage.objects;

-- 2. Créer la politique pour l'INSERT (upload)
-- Permet aux utilisateurs authentifiés d'uploader dans leur propre dossier
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Créer la politique pour le SELECT (lecture)
-- Permet à tous les utilisateurs authentifiés de lire les fichiers
CREATE POLICY "Authenticated users can read attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- 4. Créer la politique pour le DELETE (suppression)
-- Permet aux utilisateurs de supprimer leurs propres fichiers
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Créer la politique pour le UPDATE (modification)
-- Permet aux utilisateurs de mettre à jour leurs propres fichiers
CREATE POLICY "Users can update their own attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'message-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

