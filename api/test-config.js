// Endpoint de test pour vérifier la configuration des variables d'environnement
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const config = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    variables: {
      // Supabase
      VITE_SUPABASE_URL: {
        exists: !!process.env.VITE_SUPABASE_URL,
        value: process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 20)}...` : null
      },
      VITE_SUPABASE_ANON_KEY: {
        exists: !!process.env.VITE_SUPABASE_ANON_KEY,
        length: process.env.VITE_SUPABASE_ANON_KEY?.length || 0
      },
      SUPABASE_SERVICE_KEY: {
        exists: !!process.env.SUPABASE_SERVICE_KEY,
        length: process.env.SUPABASE_SERVICE_KEY?.length || 0
      },
      
      // Email service (SendGrid)
      SENDGRID_API_KEY: {
        exists: !!process.env.SENDGRID_API_KEY,
        configured: process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.test-key-not-configured',
        startsWithSG: process.env.SENDGRID_API_KEY?.startsWith('SG.')
      },
      SENDGRID_FROM_EMAIL: {
        exists: !!process.env.SENDGRID_FROM_EMAIL,
        value: process.env.SENDGRID_FROM_EMAIL || null
      }
    },
    status: {
      supabase: !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL,
      ready: false
    }
  };

  // Statut global
  config.status.ready = config.status.supabase && config.status.sendgrid;

  // Messages d'aide
  const messages = [];
  
  if (!config.status.supabase) {
    messages.push('⚠️ Configuration Supabase incomplète. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  } else {
    messages.push('✅ Configuration Supabase OK');
  }

  if (!config.status.sendgrid) {
    if (!config.variables.SENDGRID_API_KEY.exists) {
      messages.push('❌ SENDGRID_API_KEY manquante');
    } else if (!config.variables.SENDGRID_API_KEY.startsWithSG) {
      messages.push('⚠️ SENDGRID_API_KEY invalide (doit commencer par "SG.")');
    }
    
    if (!config.variables.SENDGRID_FROM_EMAIL.exists) {
      messages.push('❌ SENDGRID_FROM_EMAIL manquante');
    }
    
    messages.push('💡 Créez un compte gratuit sur https://sendgrid.com et configurez les variables');
  } else {
    messages.push('✅ SendGrid configuré');
  }

  if (config.status.ready) {
    messages.push('🎉 Configuration complète ! L\'application devrait fonctionner correctement.');
  } else {
    messages.push('❌ Configuration incomplète. Consultez les messages ci-dessus.');
  }

  res.json({
    success: config.status.ready,
    config,
    messages
  });
}

