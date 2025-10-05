-- Script SQL pour ajouter les colonnes supplémentaires à la table invoices
-- pour stocker tous les paramètres spécifiques de chaque facture
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les colonnes supplémentaires pour stocker les paramètres spécifiques de la facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS additional_terms TEXT;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN invoices.payment_method IS 'Mode de paiement spécifique à cette facture';
COMMENT ON COLUMN invoices.additional_terms IS 'Conditions supplémentaires spécifiques à cette facture';
