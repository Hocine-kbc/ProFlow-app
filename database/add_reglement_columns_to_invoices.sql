-- Ajouter les colonnes pour les paramètres de Règlement spécifiques à chaque facture
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS show_legal_rate BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS show_fixed_fee BOOLEAN DEFAULT TRUE;
