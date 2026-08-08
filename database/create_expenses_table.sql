-- ============================================
-- TABLE: expenses
-- Description: Suivi des dépenses professionnelles (carburant, matériel, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- Activer RLS (Row Level Security)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres dépenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
CREATE POLICY "Users can view their own expenses"
  ON public.expenses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres dépenses
DROP POLICY IF EXISTS "Users can create their own expenses" ON public.expenses;
CREATE POLICY "Users can create their own expenses"
  ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres dépenses
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Users can update their own expenses"
  ON public.expenses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres dépenses
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
CREATE POLICY "Users can delete their own expenses"
  ON public.expenses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS set_expenses_updated_at ON public.expenses;
CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_expenses_updated_at();

-- Commentaires
COMMENT ON TABLE public.expenses IS 'Dépenses professionnelles de l''auto-entrepreneur';
COMMENT ON COLUMN public.expenses.id IS 'Identifiant unique de la dépense';
COMMENT ON COLUMN public.expenses.user_id IS 'Identifiant de l''utilisateur propriétaire';
COMMENT ON COLUMN public.expenses.date IS 'Date de la dépense';
COMMENT ON COLUMN public.expenses.category IS 'Catégorie de dépense (fuel, equipment, subscription, meals, transport, office, insurance, other)';
COMMENT ON COLUMN public.expenses.amount IS 'Montant de la dépense en euros';
COMMENT ON COLUMN public.expenses.description IS 'Description libre de la dépense';
