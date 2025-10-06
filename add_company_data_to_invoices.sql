-- Script SQL pour ajouter les colonnes de données d'entreprise aux factures
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les colonnes pour les données d'entreprise au moment de la création
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_owner TEXT,
ADD COLUMN IF NOT EXISTS company_email TEXT,
ADD COLUMN IF NOT EXISTS company_phone TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT,
ADD COLUMN IF NOT EXISTS company_siret TEXT,
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Les factures existantes auront NULL (utiliseront les paramètres globaux actuels)
-- Les nouvelles factures auront des valeurs spécifiques (immutables)

-- Ajouter des commentaires sur les colonnes
COMMENT ON COLUMN invoices.company_name IS 'Nom de l\'entreprise au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_owner IS 'Nom du propriétaire au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_email IS 'Email de l\'entreprise au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_phone IS 'Téléphone de l\'entreprise au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_address IS 'Adresse de l\'entreprise au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_siret IS 'SIRET de l\'entreprise au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
COMMENT ON COLUMN invoices.company_logo_url IS 'URL du logo au moment de la création de la facture (NULL = utiliser paramètres globaux actuels)';
