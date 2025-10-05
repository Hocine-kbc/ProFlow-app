-- Script SQL pour ajouter la colonne payment_method à la table invoices
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne payment_method à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN invoices.payment_method IS 'Mode de paiement spécifique à cette facture';
