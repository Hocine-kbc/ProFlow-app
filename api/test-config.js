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
      
      // Email services
      // SendGrid
      SENDGRID_API_KEY: {
        exists: !!process.env.SENDGRID_API_KEY,
        configured: process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'SG.test-key-not-configured',
        startsWithSG: process.env.SENDGRID_API_KEY?.startsWith('SG.')
      },
      SENDGRID_FROM_EMAIL: {
        exists: !!process.env.SENDGRID_FROM_EMAIL,
        value: process.env.SENDGRID_FROM_EMAIL || null
      },
      // Gmail
      GMAIL_USER: {
        exists: !!process.env.GMAIL_USER,
        value: process.env.GMAIL_USER || null
      },
      GMAIL_APP_PASSWORD: {
        exists: !!process.env.GMAIL_APP_PASSWORD,
        length: process.env.GMAIL_APP_PASSWORD?.length || 0
      }
    },
    status: {
      supabase: !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY,
      sendgrid: !!process.env.SENDGRID_API_KEY && !!process.env.SENDGRID_FROM_EMAIL,
      gmail: !!process.env.GMAIL_USER && !!process.env.GMAIL_APP_PASSWORD,
      email: false,
      ready: false
    }
  };

  // Statut email (au moins un service configuré)
  config.status.email = config.status.sendgrid || config.status.gmail;
  
  // Statut global
  config.status.ready = config.status.supabase && config.status.email;

  // Messages d'aide
  const messages = [];
  
  if (!config.status.supabase) {
    messages.push('⚠️ Configuration Supabase incomplète. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  } else {
    messages.push('✅ Configuration Supabase OK');
  }

  // Vérifier les services d'email
  if (!config.status.email) {
    messages.push('❌ Aucun service d\'email configuré');
    messages.push('💡 Option 1 (Gmail) : Ajoutez GMAIL_USER + GMAIL_APP_PASSWORD');
    messages.push('💡 Option 2 (SendGrid) : Ajoutez SENDGRID_API_KEY + SENDGRID_FROM_EMAIL');
  } else {
    if (config.status.gmail) {
      messages.push('✅ Gmail configuré (prioritaire)');
      messages.push(`📧 Emails envoyés depuis: ${process.env.GMAIL_USER}`);
    }
    if (config.status.sendgrid) {
      if (config.status.gmail) {
        messages.push('ℹ️ SendGrid configuré (mais Gmail est prioritaire)');
      } else {
        messages.push('✅ SendGrid configuré');
        messages.push(`📧 Emails envoyés depuis: ${process.env.SENDGRID_FROM_EMAIL}`);
      }
    }
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

