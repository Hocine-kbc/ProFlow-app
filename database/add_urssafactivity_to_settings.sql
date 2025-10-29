-- Ajouter la colonne urssafactivity à la table settings
-- Cette colonne stocke le type d'activité URSSAF de l'utilisateur (services, ventes, liberale)

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS urssafactivity TEXT;

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN settings.urssafactivity IS 'Type d''activité URSSAF: services (BIC), ventes (BIC), ou liberale (BNC)';

