-- ============================================
-- TABLE: articles
-- Description: Stockage des articles de prestation
-- ============================================

-- Créer la table articles si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_type TEXT NOT NULL DEFAULT 'hourly' CHECK (pricing_type IN ('hourly', 'daily', 'project')),
  default_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  default_quantity NUMERIC(10, 2) DEFAULT 1,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON public.articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_pricing_type ON public.articles(pricing_type);
CREATE INDEX IF NOT EXISTS idx_articles_is_active ON public.articles(is_active);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles(created_at DESC);

-- Activer RLS (Row Level Security)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres articles
DROP POLICY IF EXISTS "Users can view their own articles" ON public.articles;
CREATE POLICY "Users can view their own articles"
  ON public.articles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres articles
DROP POLICY IF EXISTS "Users can create their own articles" ON public.articles;
CREATE POLICY "Users can create their own articles"
  ON public.articles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres articles
DROP POLICY IF EXISTS "Users can update their own articles" ON public.articles;
CREATE POLICY "Users can update their own articles"
  ON public.articles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres articles
DROP POLICY IF EXISTS "Users can delete their own articles" ON public.articles;
CREATE POLICY "Users can delete their own articles"
  ON public.articles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS set_articles_updated_at ON public.articles;
CREATE TRIGGER set_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION update_articles_updated_at();

-- Commentaires
COMMENT ON TABLE public.articles IS 'Articles de prestation pour les services';
COMMENT ON COLUMN public.articles.id IS 'Identifiant unique de l''article';
COMMENT ON COLUMN public.articles.user_id IS 'Identifiant de l''utilisateur propriétaire';
COMMENT ON COLUMN public.articles.name IS 'Nom de l''article';
COMMENT ON COLUMN public.articles.description IS 'Description de l''article';
COMMENT ON COLUMN public.articles.pricing_type IS 'Type de tarification (hourly, daily, project)';
COMMENT ON COLUMN public.articles.default_rate IS 'Tarif par défaut';
COMMENT ON COLUMN public.articles.default_quantity IS 'Quantité par défaut';
COMMENT ON COLUMN public.articles.category IS 'Catégorie de l''article';
COMMENT ON COLUMN public.articles.is_active IS 'Article actif ou archivé';

