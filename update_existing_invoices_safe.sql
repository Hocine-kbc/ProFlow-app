-- Script SQL sécurisé pour mettre à jour les factures existantes
-- À exécuter dans l'éditeur SQL de Supabase

-- Version sécurisée sans apostrophes
UPDATE invoices 
SET 
  company_name = 'Votre Nom d Entreprise Actuel',
  company_owner = 'Votre Nom Proprietaire Actuel', 
  company_email = 'votre-email@actuel.com',
  company_phone = 'Votre Telephone Actuel',
  company_address = 'Votre Adresse Actuelle',
  company_siret = 'Votre SIRET Actuel',
  company_logo_url = 'Votre URL Logo Actuelle'
WHERE 
  company_name IS NULL 
  AND company_owner IS NULL 
  AND company_email IS NULL 
  AND company_phone IS NULL 
  AND company_address IS NULL 
  AND company_siret IS NULL 
  AND company_logo_url IS NULL;

-- Vérifier le nombre de factures mises à jour
SELECT COUNT(*) as factures_mises_a_jour 
FROM invoices 
WHERE company_name IS NOT NULL;
