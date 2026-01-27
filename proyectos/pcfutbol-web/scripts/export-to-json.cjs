const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.join(__dirname, '../src/data');
const outputDir = path.join(__dirname, '../public/data');

// Crear directorio de salida
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Función para extraer exports de un archivo JS
function extractExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar export con module.exports compatible
  let modified = content
    .replace(/export\s+const\s+(\w+)\s*=/g, 'exports.$1 =')
    .replace(/export\s+default\s+/g, 'exports.default = ')
    .replace(/export\s*\{[^}]*\}/g, '') // Remover named exports al final
    .replace(/import\s+.*from\s+['"][^'"]+['"]/g, ''); // Remover imports
  
  // Ejecutar en sandbox
  const sandbox = { exports: {}, module: { exports: {} }, require: () => ({}) };
  try {
    vm.runInNewContext(modified, sandbox);
    return sandbox.exports;
  } catch (e) {
    console.error(`Error procesando ${filePath}:`, e.message);
    return null;
  }
}

// Procesar cada archivo de datos
const files = [
  { file: 'teams.js', output: 'laliga.json', key: 'teamsArray' },
  { file: 'teams-segunda.js', output: 'laliga2.json', key: 'segundaTeamsArray' },
  { file: 'teams-premier.js', output: 'premier.json', key: 'premierTeamsArray' },
  { file: 'teams-seriea.js', output: 'seriea.json', key: 'serieATeams' },
  { file: 'teams-bundesliga.js', output: 'bundesliga.json', key: 'bundesligaTeams' },
  { file: 'teams-ligue1.js', output: 'ligue1.json', key: 'ligue1Teams' },
  { file: 'teams-primera-rfef.js', output: 'primera-rfef.json', keys: ['primeraRFEFGrupo1', 'primeraRFEFGrupo2'] },
  { file: 'teams-segunda-rfef.js', output: 'segunda-rfef.json', keys: ['segundaRFEFGrupo1', 'segundaRFEFGrupo2', 'segundaRFEFGrupo3', 'segundaRFEFGrupo4', 'segundaRFEFGrupo5'] },
];

let totalTeams = 0;
let totalPlayers = 0;

for (const { file, output, key, keys } of files) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ Archivo no encontrado: ${file}`);
    continue;
  }
  
  const exports = extractExports(filePath);
  if (!exports) continue;
  
  let data;
  if (keys) {
    // Múltiples keys (grupos)
    data = { groups: {} };
    for (const k of keys) {
      if (exports[k]) {
        data.groups[k] = exports[k];
        totalTeams += exports[k].length;
        totalPlayers += exports[k].reduce((sum, t) => sum + (t.players?.length || 0), 0);
      }
    }
    data.allTeams = Object.values(data.groups).flat();
  } else if (exports[key]) {
    data = exports[key];
    totalTeams += data.length;
    totalPlayers += data.reduce((sum, t) => sum + (t.players?.length || 0), 0);
  } else {
    console.log(`⚠️ Key ${key} no encontrada en ${file}`);
    continue;
  }
  
  const outputPath = path.join(outputDir, output);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 0)); // Sin indentación para menor tamaño
  
  const size = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`✅ ${output} (${size} KB)`);
}

// Crear índice con metadata
const index = {
  version: '2025-26',
  lastUpdated: new Date().toISOString(),
  files: files.map(f => f.output),
  stats: { totalTeams, totalPlayers }
};
fs.writeFileSync(path.join(outputDir, 'index.json'), JSON.stringify(index, null, 2));

console.log(`\n📊 Total: ${totalTeams} equipos, ${totalPlayers} jugadores`);
console.log(`📁 Archivos en: ${outputDir}`);
