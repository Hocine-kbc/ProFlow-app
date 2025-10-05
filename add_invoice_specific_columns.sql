-- Script SQL pour ajouter les colonnes nécessaires à la table invoices
-- pour stocker les paramètres spécifiques de chaque facture
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter les colonnes pour stocker les paramètres spécifiques de la facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER,
ADD COLUMN IF NOT EXISTS include_late_payment_penalties BOOLEAN DEFAULT FALSE;

-- Ajouter des commentaires pour documenter les colonnes
COMMENT ON COLUMN invoices.invoice_terms IS 'Conditions de paiement spécifiques à cette facture';
COMMENT ON COLUMN invoices.payment_terms IS 'Délai de paiement spécifique à cette facture (en jours)';
COMMENT ON COLUMN invoices.include_late_payment_penalties IS 'Indique si les pénalités de retard doivent être incluses pour cette facture';
