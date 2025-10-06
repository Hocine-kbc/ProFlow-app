-- Script SQL avec vos vraies données d'entreprise
-- Remplacez les valeurs ci-dessous par VOS vraies données

UPDATE invoices 
SET 
  company_name = 'Mon Entreprise SARL',
  company_owner = 'Jean Dupont', 
  company_email = 'jean@monentreprise.com',
  company_phone = '01 23 45 67 89',
  company_address = '123 Rue de la Paix, 75001 Paris',
  company_siret = '12345678901234',
  company_logo_url = 'https://monentreprise.com/logo.png'
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
