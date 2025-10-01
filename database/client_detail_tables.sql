-- Script SQL pour créer les tables nécessaires à la vue détaillée client
-- À exécuter dans Supabase SQL Editor

-- Table pour l'historique des contacts clients
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('email', 'phone', 'meeting', 'note')),
  subject TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_date ON client_contacts(date);
CREATE INDEX IF NOT EXISTS idx_client_contacts_type ON client_contacts(type);

-- Ajouter des colonnes à la table clients si elles n'existent pas
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT,
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT CHECK (preferred_payment_method IN ('bank_transfer', 'paypal', 'check', 'cash', 'card')),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ajouter des colonnes à la table invoices si elles n'existent pas
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Ajouter des colonnes à la table services si elles n'existent pas
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'planned')),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- Créer des vues pour faciliter les requêtes
CREATE OR REPLACE VIEW client_kpis AS
SELECT 
  c.id as client_id,
  c.name,
  COUNT(DISTINCT i.id) as total_invoices,
  COALESCE(SUM(i.amount), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_amount,
  COALESCE(SUM(CASE WHEN i.status = 'sent' THEN i.amount ELSE 0 END), 0) as pending_amount,
  COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount,
  MIN(i.date) as first_invoice_date,
  MAX(CASE WHEN i.status = 'paid' THEN i.paid_date END) as last_payment_date,
  MAX(CASE WHEN i.status = 'paid' THEN i.amount END) as last_payment_amount,
  COALESCE(AVG(i.amount), 0) as average_invoice_amount,
  COALESCE(SUM(s.hours), 0) as total_hours,
  CASE 
    WHEN SUM(s.hours) > 0 THEN SUM(s.amount) / SUM(s.hours)
    ELSE 0 
  END as average_hourly_rate
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
LEFT JOIN services s ON c.id = s.client_id
GROUP BY c.id, c.name;

-- Fonction pour calculer les statistiques d'un client
CREATE OR REPLACE FUNCTION get_client_stats(client_uuid UUID)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_invoices BIGINT,
  paid_amount DECIMAL,
  pending_amount DECIMAL,
  overdue_amount DECIMAL,
  first_invoice_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  last_payment_amount DECIMAL,
  average_invoice_amount DECIMAL,
  total_hours DECIMAL,
  average_hourly_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(i.amount), 0) as total_revenue,
    COUNT(DISTINCT i.id) as total_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN i.status = 'sent' THEN i.amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.amount ELSE 0 END), 0) as overdue_amount,
    MIN(i.date) as first_invoice_date,
    MAX(CASE WHEN i.status = 'paid' THEN i.paid_date END) as last_payment_date,
    MAX(CASE WHEN i.status = 'paid' THEN i.amount END) as last_payment_amount,
    COALESCE(AVG(i.amount), 0) as average_invoice_amount,
    COALESCE(SUM(s.hours), 0) as total_hours,
    CASE 
      WHEN SUM(s.hours) > 0 THEN SUM(s.amount) / SUM(s.hours)
      ELSE 0 
    END as average_hourly_rate
  FROM invoices i
  LEFT JOIN services s ON i.client_id = s.client_id
  WHERE i.client_id = client_uuid;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) pour la table client_contacts
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture des contacts d'un client
CREATE POLICY "Users can view client contacts" ON client_contacts
  FOR SELECT USING (true);

-- Politique pour permettre l'insertion de contacts
CREATE POLICY "Users can insert client contacts" ON client_contacts
  FOR INSERT WITH CHECK (true);

-- Politique pour permettre la mise à jour des contacts
CREATE POLICY "Users can update client contacts" ON client_contacts
  FOR UPDATE USING (true);

-- Politique pour permettre la suppression des contacts
CREATE POLICY "Users can delete client contacts" ON client_contacts
  FOR DELETE USING (true);

-- Triggers pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Données d'exemple (optionnel)
INSERT INTO client_contacts (client_id, type, subject, description, outcome) VALUES
  ('your-client-id-here', 'email', 'Facture payée', 'Confirmation de paiement reçue', 'Paiement confirmé'),
  ('your-client-id-here', 'phone', 'Appel de suivi', 'Appel téléphonique pour faire le point', 'Client satisfait'),
  ('your-client-id-here', 'meeting', 'Réunion projet', 'Réunion pour définir les spécifications', 'Spécifications validées')
ON CONFLICT DO NOTHING;
