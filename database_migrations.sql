-- Migration pour ajouter les colonnes d'archivage
-- Exécuter ces commandes dans votre base de données Supabase

-- 1. Ajouter la colonne status et archived_at à la table clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 2. Ajouter la colonne archived_at à la table invoices (status existe déjà)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 3. Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON clients(archived_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_archived_at ON invoices(archived_at);

-- 4. Mettre à jour les clients existants pour avoir le statut 'active'
UPDATE clients SET status = 'active' WHERE status IS NULL;

-- 5. Mettre à jour les factures existantes pour avoir le statut 'draft' si elles n'ont pas de statut
UPDATE invoices SET status = 'draft' WHERE status IS NULL;
