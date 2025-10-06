-- Script SQL personnalisé pour mettre à jour vos factures existantes
-- Remplacez les valeurs ci-dessous par VOS vraies données d'entreprise

UPDATE invoices 
SET 
  company_name = 'REMPLACEZ_PAR_VOTRE_NOM_ENTREPRISE',
  company_owner = 'REMPLACEZ_PAR_VOTRE_NOM', 
  company_email = 'REMPLACEZ_PAR_VOTRE_EMAIL',
  company_phone = 'REMPLACEZ_PAR_VOTRE_TELEPHONE',
  company_address = 'REMPLACEZ_PAR_VOTRE_ADRESSE',
  company_siret = 'REMPLACEZ_PAR_VOTRE_SIRET',
  company_logo_url = 'REMPLACEZ_PAR_VOTRE_URL_LOGO'
WHERE 
  company_name IS NULL 
  AND company_owner IS NULL 
  AND company_email IS NULL 
  AND company_phone IS NULL 
  AND company_address IS NULL 
  AND company_siret IS NULL 
  AND company_logo_url IS NULL;

-- Exemple avec des vraies données (à adapter) :
-- UPDATE invoices 
-- SET 
--   company_name = 'Mon Entreprise SARL',
--   company_owner = 'Jean Dupont', 
--   company_email = 'jean@monentreprise.com',
--   company_phone = '01 23 45 67 89',
--   company_address = '123 Rue de la Paix, 75001 Paris',
--   company_siret = '12345678901234',
--   company_logo_url = 'https://monentreprise.com/logo.png'
-- WHERE 
--   company_name IS NULL 
--   AND company_owner IS NULL 
--   AND company_email IS NULL 
--   AND company_phone IS NULL 
--   AND company_address IS NULL 
--   AND company_siret IS NULL 
--   AND company_logo_url IS NULL;
