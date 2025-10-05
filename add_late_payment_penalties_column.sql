-- Script SQL pour ajouter la colonne includeLatePaymentPenalties à la table settings
-- À exécuter dans l'éditeur SQL de Supabase

-- Ajouter la colonne includeLatePaymentPenalties à la table settings
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS includelatepaymentpenalties BOOLEAN DEFAULT FALSE;

-- Mettre à jour les enregistrements existants pour avoir la valeur par défaut
UPDATE settings 
SET includelatepaymentpenalties = FALSE 
WHERE includelatepaymentpenalties IS NULL;

-- Optionnel : Ajouter un commentaire sur la colonne
COMMENT ON COLUMN settings.includelatepaymentpenalties IS 'Indique si les pénalités de retard de paiement doivent être incluses dans les factures selon la législation française';
