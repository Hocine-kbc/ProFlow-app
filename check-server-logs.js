// Script pour vérifier les logs du serveur
// Affiche les dernières lignes du fichier de log ou les logs en temps réel

import fs from 'fs';
import path from 'path';

function checkServerLogs() {
  console.log('🔍 Vérification des logs du serveur...');
  console.log('='.repeat(50));
  
  // Vérifier si le serveur fonctionne
  console.log('📡 Test de connexion au serveur...');
  
  fetch('http://localhost:3001/api/test')
    .then(response => response.json())
    .then(data => {
      console.log('✅ Serveur actif:', data);
    })
    .catch(error => {
      console.log('❌ Serveur non accessible:', error.message);
    });
}

checkServerLogs();
