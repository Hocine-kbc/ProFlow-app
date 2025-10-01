// Pool de navigateurs pour optimiser les performances PDF
import puppeteer from 'puppeteer';

class BrowserPool {
  constructor(maxBrowsers = 2) {
    this.maxBrowsers = maxBrowsers;
    this.browsers = [];
    this.availableBrowsers = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initialisation du pool de navigateurs...');
    
    // Créer un navigateur initial
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--memory-pressure-off',
        '--max_old_space_size=4096'
      ]
    });

    this.browsers.push(browser);
    this.availableBrowsers.push(browser);
    this.initialized = true;
    
    console.log('✅ Pool de navigateurs initialisé');
  }

  async getBrowser() {
    await this.initialize();
    
    if (this.availableBrowsers.length > 0) {
      return this.availableBrowsers.pop();
    }
    
    // Si pas de navigateur disponible et qu'on n'a pas atteint la limite
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--memory-pressure-off',
          '--max_old_space_size=4096'
        ]
      });
      
      this.browsers.push(browser);
      return browser;
    }
    
    // Attendre qu'un navigateur soit disponible
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.availableBrowsers.length > 0) {
          resolve(this.availableBrowsers.pop());
        } else {
          setTimeout(checkAvailable, 100);
        }
      };
      checkAvailable();
    });
  }

  releaseBrowser(browser) {
    if (this.browsers.includes(browser) && !this.availableBrowsers.includes(browser)) {
      this.availableBrowsers.push(browser);
    }
  }

  async closeAll() {
    console.log('🔄 Fermeture du pool de navigateurs...');
    for (const browser of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error('Erreur lors de la fermeture du navigateur:', error);
      }
    }
    this.browsers = [];
    this.availableBrowsers = [];
    this.initialized = false;
  }
}

// Instance globale du pool
export const browserPool = new BrowserPool();

// Nettoyage à la fermeture du processus
process.on('SIGINT', async () => {
  await browserPool.closeAll();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await browserPool.closeAll();
  process.exit(0);
});
