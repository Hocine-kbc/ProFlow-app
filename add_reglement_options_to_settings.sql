-- Script SQL pour ajouter les options de règlement à la table settings
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les colonnes pour les options de règlement personnalisables
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN settings.show_legal_rate IS 'Afficher le taux légal dans le règlement';
COMMENT ON COLUMN settings.show_fixed_fee IS 'Afficher l\'indemnité forfaitaire dans le règlement';
