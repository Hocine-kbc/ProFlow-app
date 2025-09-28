# Guide de Dépannage Supabase

## Erreurs 400 avec l'API REST

Les erreurs 400 que vous rencontrez indiquent des problèmes avec les requêtes Supabase. Voici les solutions :

### 1. Vérifier les Variables d'Environnement

Créez un fichier `.env.local` dans le dossier racine avec :

```env
VITE_SUPABASE_URL=https://tdfhqkgvcgqgkrxarmui.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anonyme_ici
```

### 2. Vérifier la Structure de la Base de Données

Assurez-vous que les tables existent dans Supabase :

```sql
-- Table clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table services
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  urssaf_deduction DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  companyname TEXT,
  ownername TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  siret TEXT,
  defaulthourlyrate DECIMAL(10,2) DEFAULT 0,
  urssafrate DECIMAL(10,2) DEFAULT 0,
  invoiceprefix TEXT,
  paymentterms INTEGER DEFAULT 30,
  logourl TEXT,
  invoiceterms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Vérifier les Politiques RLS (Row Level Security)

Activez RLS et créez les politiques :

```sql
-- Activer RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour permettre toutes les opérations (pour le développement)
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all operations on services" ON services FOR ALL USING (true);
CREATE POLICY "Allow all operations on invoices" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow all operations on settings" ON settings FOR ALL USING (true);
```

### 4. Tester la Connexion

Exécutez le script de test :

```bash
node test-supabase-connection.js
```

### 5. Vérifier les Logs Supabase

1. Allez dans votre dashboard Supabase
2. Naviguez vers "Logs" > "API"
3. Vérifiez les erreurs détaillées

### 6. Solutions Courantes

**Erreur 400 avec `select=*` :**
- Vérifiez que la table existe
- Vérifiez que RLS est configuré correctement
- Vérifiez que les colonnes existent

**Erreur d'authentification :**
- Vérifiez votre clé API
- Vérifiez que l'URL est correcte

**Erreur de permissions :**
- Vérifiez les politiques RLS
- Vérifiez que l'utilisateur a les bonnes permissions

### 7. Debug en Mode Développement

Ajoutez ce code dans votre application pour debug :

```javascript
// Dans src/lib/supabase.ts
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
});

// Test de connexion
supabase.from('clients').select('count').then(({ data, error }) => {
  console.log('Supabase test:', { data, error });
});
```

### 8. Redémarrer l'Application

Après avoir fait les modifications :

1. Arrêtez le serveur de développement
2. Supprimez le cache : `rm -rf node_modules/.vite`
3. Redémarrez : `npm run dev`

### 9. Vérifier la Console du Navigateur

Ouvrez les outils de développement (F12) et vérifiez :
- L'onglet Network pour voir les requêtes HTTP
- L'onglet Console pour voir les erreurs JavaScript
- L'onglet Application > Local Storage pour voir les données stockées
