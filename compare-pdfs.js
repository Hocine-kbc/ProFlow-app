// Script pour comparer les PDFs générés
// Affiche les informations des PDFs pour voir s'ils sont différents

import fs from 'fs';
import path from 'path';

function comparePDFs() {
  const tempDir = path.join(process.cwd(), 'temp');
  
  if (!fs.existsSync(tempDir)) {
    console.log('❌ Dossier temp non trouvé');
    return;
  }

  const files = fs.readdirSync(tempDir)
    .filter(file => file.endsWith('.pdf'))
    .map(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    })
    .sort((a, b) => b.created - a.created); // Plus récents en premier

  console.log('📊 Comparaison des PDFs générés:');
  console.log('='.repeat(80));
  
  files.slice(0, 10).forEach((file, index) => {
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   📏 Taille: ${(file.size / 1024).toFixed(1)} KB`);
    console.log(`   📅 Créé: ${file.created.toLocaleString('fr-FR')}`);
    console.log(`   🔄 Modifié: ${file.modified.toLocaleString('fr-FR')}`);
    console.log('');
  });

  // Vérifier les doublons
  const recentFiles = files.slice(0, 5);
  const uniqueSizes = new Set(recentFiles.map(f => f.size));
  
  console.log('🔍 Analyse:');
  console.log(`   - ${recentFiles.length} fichiers récents`);
  console.log(`   - ${uniqueSizes.size} tailles différentes`);
  
  if (uniqueSizes.size === 1) {
    console.log('⚠️ ATTENTION: Tous les PDFs ont la même taille !');
    console.log('💡 Cela peut indiquer que le contenu est identique.');
  } else {
    console.log('✅ Les PDFs ont des tailles différentes - contenu probablement différent');
  }
}

comparePDFs();
