import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/data');
const outputDir = path.join(__dirname, '../public/data');

// Crear directorio de salida
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Importar datos
const { teams, teamsArray, freeAgents } = await import('../src/data/teams.js');
const { segundaTeams, segundaTeamsArray } = await import('../src/data/teams-segunda.js');
const { premierTeams, premierTeamsArray } = await import('../src/data/teams-premier.js');
const { serieATeams } = await import('../src/data/teams-seriea.js');
const { bundesligaTeams } = await import('../src/data/teams-bundesliga.js');
const { ligue1Teams } = await import('../src/data/teams-ligue1.js');
const { primeraRFEFGrupo1, primeraRFEFGrupo2 } = await import('../src/data/teams-primera-rfef.js');
const { segundaRFEFGrupo1, segundaRFEFGrupo2, segundaRFEFGrupo3, segundaRFEFGrupo4, segundaRFEFGrupo5 } = await import('../src/data/teams-segunda-rfef.js');

// Datos a exportar
const exports_data = [
  { name: 'laliga.json', data: teamsArray },
  { name: 'laliga2.json', data: segundaTeamsArray },
  { name: 'premier.json', data: premierTeamsArray },
  { name: 'seriea.json', data: serieATeams },
  { name: 'bundesliga.json', data: bundesligaTeams },
  { name: 'ligue1.json', data: ligue1Teams },
  { name: 'free-agents.json', data: freeAgents },
  { 
    name: 'primera-rfef.json', 
    data: {
      grupo1: primeraRFEFGrupo1,
      grupo2: primeraRFEFGrupo2,
      allTeams: [...primeraRFEFGrupo1, ...primeraRFEFGrupo2]
    }
  },
  { 
    name: 'segunda-rfef.json', 
    data: {
      grupo1: segundaRFEFGrupo1,
      grupo2: segundaRFEFGrupo2,
      grupo3: segundaRFEFGrupo3,
      grupo4: segundaRFEFGrupo4,
      grupo5: segundaRFEFGrupo5,
      allTeams: [...segundaRFEFGrupo1, ...segundaRFEFGrupo2, ...segundaRFEFGrupo3, ...segundaRFEFGrupo4, ...segundaRFEFGrupo5]
    }
  },
];

let totalTeams = 0;
let totalPlayers = 0;

for (const { name, data } of exports_data) {
  const outputPath = path.join(outputDir, name);
  fs.writeFileSync(outputPath, JSON.stringify(data));
  
  const size = (fs.statSync(outputPath).size / 1024).toFixed(1);
  
  // Contar equipos y jugadores
  const teams = Array.isArray(data) ? data : (data.allTeams || []);
  const teamCount = teams.length;
  const playerCount = teams.reduce((sum, t) => sum + (t.players?.length || 0), 0);
  totalTeams += teamCount;
  totalPlayers += playerCount;
  
  console.log(`✅ ${name} (${size} KB) - ${teamCount} equipos, ${playerCount} jugadores`);
}

// Crear índice
const index = {
  version: '2025-26',
  source: 'Transfermarkt',
  lastUpdated: new Date().toISOString(),
  files: exports_data.map(e => e.name),
  stats: { totalTeams, totalPlayers }
};
fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));

console.log(`\n📊 Total: ${totalTeams} equipos, ${totalPlayers} jugadores`);
console.log(`📁 Archivos en: public/data/`);
