-- ============================================
-- Script de migration : Liaison des services aux factures
-- ============================================
-- Ce script ajoute la colonne invoice_id si elle n'existe pas,
-- puis lie automatiquement les services existants à leurs factures
-- ============================================

-- ÉTAPE 1 : S'assurer que la colonne invoice_id existe dans la table services
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'services' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.services 
        ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Colonne invoice_id ajoutée à la table services';
    ELSE
        RAISE NOTICE 'Colonne invoice_id existe déjà dans la table services';
    END IF;
END $$;

-- ÉTAPE 2 : Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_services_invoice_id ON public.services(invoice_id);
CREATE INDEX IF NOT EXISTS idx_services_client_status ON public.services(client_id, status);

-- ÉTAPE 3 : Analyser les services sans invoice_id
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM public.services
    WHERE invoice_id IS NULL AND status = 'invoiced';
    
    RAISE NOTICE '% service(s) "invoiced" sans invoice_id trouvé(s)', orphaned_count;
END $$;

-- ÉTAPE 4 : Lier automatiquement les services aux factures
-- Méthode 1 : Utiliser localStorage 'invoice-services' (nécessite intervention manuelle)
-- Méthode 2 : Déduction intelligente basée sur le client_id et la date

-- Approche automatique : Lier les services 'invoiced' à la première facture du client
-- créée après ou au moment du service
WITH ranked_invoices AS (
    SELECT 
        s.id as service_id,
        i.id as invoice_id,
        s.client_id,
        s.date as service_date,
        i.date as invoice_date,
        ROW_NUMBER() OVER (
            PARTITION BY s.id 
            ORDER BY 
                ABS(EXTRACT(EPOCH FROM (i.date::timestamp - s.date::timestamp))),
                i.created_at ASC
        ) as rank
    FROM public.services s
    INNER JOIN public.invoices i ON s.client_id = i.client_id
    WHERE s.invoice_id IS NULL 
        AND s.status = 'invoiced'
        AND i.date >= s.date  -- La facture doit être créée après le service
        AND EXTRACT(EPOCH FROM (i.date::timestamp - s.date::timestamp)) <= 2592000  -- Max 30 jours de différence
)
UPDATE public.services s
SET invoice_id = ri.invoice_id
FROM ranked_invoices ri
WHERE s.id = ri.service_id 
    AND ri.rank = 1;

-- ÉTAPE 5 : Afficher un résumé
DO $$
DECLARE
    linked_count INTEGER;
    still_orphaned INTEGER;
BEGIN
    SELECT COUNT(*) INTO linked_count
    FROM public.services
    WHERE invoice_id IS NOT NULL AND status = 'invoiced';
    
    SELECT COUNT(*) INTO still_orphaned
    FROM public.services
    WHERE invoice_id IS NULL AND status = 'invoiced';
    
    RAISE NOTICE '✅ Résumé de la migration :';
    RAISE NOTICE '   - % service(s) lié(s) à une facture', linked_count;
    RAISE NOTICE '   - % service(s) encore sans facture', still_orphaned;
    
    IF still_orphaned > 0 THEN
        RAISE NOTICE '⚠️  Il reste des services "invoiced" sans invoice_id.';
        RAISE NOTICE '    Vous devrez peut-être les lier manuellement.';
    END IF;
END $$;

-- ÉTAPE 6 : Afficher les services orphelins pour diagnostic
SELECT 
    s.id,
    s.description,
    s.date as service_date,
    s.client_id,
    c.name as client_name,
    s.hours,
    s.hourly_rate,
    s.status
FROM public.services s
LEFT JOIN public.clients c ON s.client_id = c.id
WHERE s.invoice_id IS NULL 
    AND s.status = 'invoiced'
ORDER BY s.date DESC
LIMIT 20;

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ce script tente de lier automatiquement les services aux factures
--    en se basant sur le client_id et la date
-- 2. Il ne lie que les services créés dans les 30 jours précédant la facture
-- 3. Si plusieurs factures correspondent, il choisit la plus proche en date
-- 4. Les services qui ne peuvent pas être liés automatiquement resteront
--    avec invoice_id NULL et devront être liés manuellement
-- 5. Pour les nouvelles factures, l'application liera automatiquement
--    les services lors de la création
-- ============================================

