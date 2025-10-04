// Script pour configurer les colonnes d'archivage dans Supabase
// Exécuter ce script dans la console de votre navigateur sur votre app

const setupArchiveDatabase = async () => {
  console.log('🚀 Configuration des colonnes d\'archivage...');
  
  try {
    // Note: Ces commandes SQL doivent être exécutées dans l'éditeur SQL de Supabase
    // car elles nécessitent des privilèges d'administrateur
    
    const sqlCommands = `
-- 1. Ajouter la colonne status et archived_at à la table clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 2. Ajouter la colonne archived_at à la table invoices (status existe déjà)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- 3. Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON clients(archived_at);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_archived_at ON invoices(archived_at);

-- 4. Mettre à jour les clients existants pour avoir le statut 'active'
UPDATE clients SET status = 'active' WHERE status IS NULL;

-- 5. Mettre à jour les factures existantes pour avoir le statut 'draft' si elles n'ont pas de statut
UPDATE invoices SET status = 'draft' WHERE status IS NULL;
    `;
    
    console.log('📋 Commandes SQL à exécuter dans Supabase :');
    console.log(sqlCommands);
    console.log('');
    console.log('📝 Instructions :');
    console.log('1. Allez dans votre projet Supabase');
    console.log('2. Ouvrez l\'éditeur SQL');
    console.log('3. Copiez et exécutez les commandes ci-dessus');
    console.log('4. Vérifiez que les colonnes ont été ajoutées');
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la configuration :', error);
    return false;
  }
};

// Exécuter le script
setupArchiveDatabase();
