// Script de test pour vérifier la configuration Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('🔧 Test de configuration Supabase');
console.log('URL:', supabaseUrl ? '✅ Configurée' : '❌ Manquante');
console.log('Clé anonyme:', supabaseAnonKey ? '✅ Configurée' : '❌ Manquante');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configuration Supabase incomplète');
  console.log('Vérifiez vos variables d\'environnement:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- VITE_SUPABASE_ANON_KEY');
} else {
  console.log('✅ Configuration Supabase complète');
  
  // Test de connexion
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test de récupération de l'utilisateur actuel
  supabase.auth.getUser().then(({ data: { user }, error }) => {
    if (error) {
      console.log('ℹ️ Aucun utilisateur connecté (normal si pas connecté)');
    } else if (user) {
      console.log('✅ Utilisateur connecté:', user.email);
    } else {
      console.log('ℹ️ Aucun utilisateur connecté');
    }
  });
}
