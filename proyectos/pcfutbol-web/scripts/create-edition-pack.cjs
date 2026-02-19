/**
 * Create Edition Pack "Competición 2025/2026"
 * Maps fictional game names → real Transfermarkt names
 * Then uploads to Firebase 'editions' collection
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const SCRAPED_DIR = path.join(BASE, 'scraped-data', '2025-26');
const DATA_DIR = path.join(BASE, 'src', 'data');

// ============================================================
// POSITION NORMALIZATION
// ============================================================
const POS_MAP = {
  // Spanish positions in game files
  'POR': 'GK', 'DFC': 'CB', 'LI': 'LB', 'LD': 'RB',
  'MCD': 'CDM', 'MC': 'CM', 'MCO': 'CAM', 'EI': 'LW',
  'ED': 'RW', 'DC': 'ST', 'SD': 'ST', 'MP': 'CAM',
  'MI': 'LM', 'MD': 'RM', 'MCC': 'CDM',
  // Already normalized
  'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'CDM': 'CDM', 'CM': 'CM', 'CAM': 'CAM', 'LW': 'LW',
  'RW': 'RW', 'ST': 'ST', 'LM': 'LM', 'RM': 'RM',
  'CF': 'ST', 'DM': 'CDM', 'AM': 'CAM',
};
function normalizePos(p) {
  return POS_MAP[(p || '').toUpperCase()] || 'CM';
}

// Broad position groups for matching
function posGroup(pos) {
  const n = normalizePos(pos);
  if (n === 'GK') return 'GK';
  if (['CB', 'LB', 'RB'].includes(n)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'].includes(n)) return 'MID';
  return 'FWD';
}

// ============================================================
// PARSE GAME TEAM FILES (ESM → extract data via regex/eval tricks)
// ============================================================

function parseTeamsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const teams = [];

  // Strategy 1: Array-style files with object literals (championship, eredivisie, etc.)
  // These have: { id: '...', name: '...', players: [{ name: '...', position: '...', rating: N }] }
  // Strategy 2: Object-style files with createPlayer() (teams.js, teams-segunda.js)

  if (content.includes('createPlayer(')) {
    return parseCreatePlayerFile(content, filePath);
  }

  // For array/object-style files, strip export and eval
  return parseObjectFile(content, filePath);
}

function parseCreatePlayerFile(content, filePath) {
  const teams = [];
  
  // Extract the createPlayer function to make it available
  // Then find each team block
  const teamRegex = /\/\/\s*=+\s*(.+?)\s*=+\s*\n\s*(\w+):\s*\{([^}]*name:\s*'([^']+)'[^]*?players:\s*\[([^\]]*)\])/g;
  
  // Simpler approach: find all team entries with their players
  const simpleTeamRegex = /(\w+):\s*\{\s*\n\s*name:\s*'([^']+)',[\s\S]*?players:\s*\[([\s\S]*?)\]\s*\n\s*\}/g;
  
  let match;
  while ((match = simpleTeamRegex.exec(content)) !== null) {
    const teamId = match[1];
    const teamName = match[2];
    const playersBlock = match[3];
    
    // Skip league entries (they don't have players)
    if (!playersBlock.includes('createPlayer') && !playersBlock.includes('name:')) continue;
    
    const players = [];
    const playerRegex = /createPlayer\(\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*[\d.]+,?\s*(\d+)?\)/g;
    let pm;
    while ((pm = playerRegex.exec(playersBlock)) !== null) {
      players.push({
        name: pm[1],
        position: pm[2],
        overall: parseInt(pm[4] || '70'),
        age: parseInt(pm[3])
      });
    }
    
    if (players.length > 0) {
      teams.push({ id: teamId, name: teamName, players });
    }
  }
  
  return teams;
}

function parseObjectFile(content, filePath) {
  const teams = [];
  
  // Strip export statements and try to parse as JS
  let cleaned = content
    .replace(/export\s+const\s+(\w+)\s*=/g, 'const $1 =')
    .replace(/export\s*\{[^}]*\}/g, '');
  
  // For array-style files, extract team objects via regex
  // Find team objects: { id: '...', name: '...', players: [...] }
  const teamBlockRegex = /\{\s*(?:"id"|id)\s*:\s*['"]([^'"]+)['"],\s*(?:"name"|name)\s*:\s*['"]([^'"]+)['"]/g;
  
  let match;
  const teamStarts = [];
  while ((match = teamBlockRegex.exec(content)) !== null) {
    teamStarts.push({ index: match.index, id: match[1], name: match[2] });
  }
  
  for (let i = 0; i < teamStarts.length; i++) {
    const start = teamStarts[i].index;
    const end = i + 1 < teamStarts.length ? teamStarts[i + 1].index : content.length;
    const block = content.substring(start, end);
    
    const players = [];
    
    // Pattern 1: { name: '...', position: '...', rating: N }
    const p1 = /\{\s*name:\s*'([^']+)',\s*position:\s*'([^']+)',\s*rating:\s*(\d+)/g;
    let pm;
    while ((pm = p1.exec(block)) !== null) {
      players.push({ name: pm[1], position: pm[2], overall: parseInt(pm[3]) });
    }
    
    // Pattern 2: { "name": "...", "position": "...", "overall": N } (primera-rfef, segunda-rfef style)
    if (players.length === 0) {
      const p2 = /["']name["']\s*:\s*["']([^"']+)["'],\s*["']position["']\s*:\s*["']([^"']+)["'](?:,\s*["']age["']\s*:\s*\d+)?,\s*["']overall["']\s*:\s*(\d+)/g;
      while ((pm = p2.exec(block)) !== null) {
        players.push({ name: pm[1], position: pm[2], overall: parseInt(pm[3]) });
      }
    }
    
    // Pattern 3: { name: "...", position: "...", age: N, overall: N }
    if (players.length === 0) {
      const p3 = /["']?name["']?\s*:\s*["']([^"']+)["'],\s*["']?position["']?\s*:\s*["']([^"']+)["'][\s\S]*?["']?overall["']?\s*:\s*(\d+)/g;
      while ((pm = p3.exec(block)) !== null) {
        players.push({ name: pm[1], position: pm[2], overall: parseInt(pm[3]) });
      }
    }
    
    if (players.length > 0) {
      teams.push({ id: teamStarts[i].id, name: teamStarts[i].name, players });
    }
  }
  
  return teams;
}

// ============================================================
// LEAGUE MAPPING: game file → scraped file
// ============================================================
const LEAGUE_MAP = [
  { gameFile: 'teams.js', scrapedFile: 'laliga.json', leagueId: 'laliga' },
  { gameFile: 'teams-segunda.js', scrapedFile: 'laliga2.json', leagueId: 'laliga2' },
  { gameFile: 'teams-championship.js', scrapedFile: 'championship.json', leagueId: 'championship' },
  { gameFile: 'teams-bundesliga2.js', scrapedFile: 'bundesliga2.json', leagueId: 'bundesliga2' },
  { gameFile: 'teams-ligue2.js', scrapedFile: 'ligue2.json', leagueId: 'ligue2' },
  { gameFile: 'teams-serie-b.js', scrapedFile: 'serieB.json', leagueId: 'serieB' },
  { gameFile: 'teams-eredivisie.js', scrapedFile: 'eredivisie.json', leagueId: 'eredivisie' },
  { gameFile: 'teams-primeira-liga.js', scrapedFile: 'primeiraLiga.json', leagueId: 'primeiraLiga' },
  { gameFile: 'teams-scottish-prem.js', scrapedFile: 'scottishPrem.json', leagueId: 'scottishPrem' },
  { gameFile: 'teams-super-lig.js', scrapedFile: 'superLig.json', leagueId: 'superLig' },
  { gameFile: 'teams-swiss.js', scrapedFile: 'swissSuperLeague.json', leagueId: 'swissSuperLeague' },
  { gameFile: 'teams-austrian.js', scrapedFile: 'austrianBundesliga.json', leagueId: 'austrianBundesliga' },
  { gameFile: 'teams-belgian-pro.js', scrapedFile: 'belgianPro.json', leagueId: 'belgianPro' },
  { gameFile: 'teams-greek.js', scrapedFile: 'greekSuperLeague.json', leagueId: 'greekSuperLeague' },
  { gameFile: 'teams-danish.js', scrapedFile: 'danishSuperliga.json', leagueId: 'danishSuperliga' },
  { gameFile: 'teams-croatian.js', scrapedFile: 'croatianLeague.json', leagueId: 'croatianLeague' },
  { gameFile: 'teams-czech.js', scrapedFile: 'czechLeague.json', leagueId: 'czechLeague' },
];

// Special handling for multi-group leagues
const MULTI_GROUP_LEAGUES = [
  {
    gameFile: 'teams-primera-rfef.js',
    groups: [
      { exportName: 'primeraRFEFGrupo1', scrapedFile: 'primeraRfefG1.json', leagueId: 'primeraRfefG1' },
      { exportName: 'primeraRFEFGrupo2', scrapedFile: 'primeraRfefG2.json', leagueId: 'primeraRfefG2' },
    ]
  },
  {
    gameFile: 'teams-segunda-rfef.js',
    groups: [
      { exportName: 'segundaRFEFGrupo1', scrapedFile: 'segundaRfefG1.json', leagueId: 'segundaRfefG1' },
      { exportName: 'segundaRFEFGrupo2', scrapedFile: 'segundaRfefG2.json', leagueId: 'segundaRfefG2' },
      { exportName: 'segundaRFEFGrupo3', scrapedFile: 'segundaRfefG3.json', leagueId: 'segundaRfefG3' },
      { exportName: 'segundaRFEFGrupo4', scrapedFile: 'segundaRfefG4.json', leagueId: 'segundaRfefG4' },
      { exportName: 'segundaRFEFGrupo5', scrapedFile: 'segundaRfefG5.json', leagueId: 'segundaRfefG5' },
    ]
  }
];

// South American leagues (scraped data exists, need to check game files)
const SOUTH_AMERICAN = [
  { gameFile: null, scrapedFile: 'argentinaPrimera.json', leagueId: 'argentinaPrimera' },
  { gameFile: null, scrapedFile: 'brasileiraoA.json', leagueId: 'brasileiraoA' },
  { gameFile: null, scrapedFile: 'boliviaPrimera.json', leagueId: 'boliviaPrimera' },
  { gameFile: null, scrapedFile: 'chilePrimera.json', leagueId: 'chilePrimera' },
  { gameFile: null, scrapedFile: 'colombiaPrimera.json', leagueId: 'colombiaPrimera' },
  { gameFile: null, scrapedFile: 'ecuadorLigaPro.json', leagueId: 'ecuadorLigaPro' },
  { gameFile: null, scrapedFile: 'paraguayPrimera.json', leagueId: 'paraguayPrimera' },
  { gameFile: null, scrapedFile: 'peruLiga1.json', leagueId: 'peruLiga1' },
  { gameFile: null, scrapedFile: 'uruguayPrimera.json', leagueId: 'uruguayPrimera' },
  { gameFile: null, scrapedFile: 'venezuelaPrimera.json', leagueId: 'venezuelaPrimera' },
];

// ============================================================
// PLAYER MATCHING
// ============================================================
function matchPlayers(gamePlayers, realPlayers) {
  const playerMap = {};
  const usedReal = new Set();

  for (const gp of gamePlayers) {
    const gpGroup = posGroup(gp.position);
    let bestMatch = null;
    let bestScore = Infinity;

    for (const rp of realPlayers) {
      if (usedReal.has(rp.name)) continue;
      const rpGroup = posGroup(rp.position);
      const sameGroup = gpGroup === rpGroup;
      const sameExact = normalizePos(gp.position) === normalizePos(rp.position);
      const ovrDiff = Math.abs((gp.overall || 70) - (rp.overall || 70));
      
      // Score: exact position match best, then group match, then overall
      let score = ovrDiff;
      if (!sameExact) score += 50;
      if (!sameGroup) score += 200;
      
      if (score < bestScore) {
        bestScore = score;
        bestMatch = rp;
      }
    }

    if (bestMatch && gp.name !== bestMatch.name) {
      playerMap[gp.name] = bestMatch.name;
      usedReal.add(bestMatch.name);
    }
  }

  return playerMap;
}

// ============================================================
// TEAM MATCHING (by position in league)
// ============================================================
function matchTeams(gameTeams, realTeams) {
  const result = {};
  const count = Math.min(gameTeams.length, realTeams.length);
  
  // Sort real teams by rank if available
  const sortedReal = [...realTeams].sort((a, b) => (a.rank || 999) - (b.rank || 999));
  
  for (let i = 0; i < count; i++) {
    const gt = gameTeams[i];
    const rt = sortedReal[i];
    
    const teamEntry = {};
    if (gt.name !== rt.name) teamEntry.name = rt.name;
    
    if (gt.players && rt.players) {
      const playerMap = matchPlayers(gt.players, rt.players);
      if (Object.keys(playerMap).length > 0) {
        teamEntry.players = playerMap;
      }
    }
    
    if (Object.keys(teamEntry).length > 0) {
      result[gt.name] = teamEntry;
    }
  }
  
  return result;
}

// ============================================================
// PARSE MULTI-GROUP FILE
// ============================================================
function parseMultiGroupFile(filePath, exportName) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find the specific export: const exportName = [...]
  const startPattern = new RegExp(`(?:export\\s+)?const\\s+${exportName}\\s*=\\s*\\[`);
  const startMatch = startPattern.exec(content);
  if (!startMatch) return [];
  
  // Find the matching closing bracket
  let depth = 0;
  let startIdx = startMatch.index + startMatch[0].length - 1;
  let endIdx = startIdx;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '[') depth++;
    if (content[i] === ']') { depth--; if (depth === 0) { endIdx = i + 1; break; } }
  }
  
  const arrayStr = content.substring(startIdx, endIdx);
  
  // Now parse teams from this block
  const teams = [];
  const teamBlockRegex = /\{\s*(?:"id"|id)\s*:\s*['"]([^'"]+)['"],\s*(?:"name"|name)\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  const teamStarts = [];
  while ((match = teamBlockRegex.exec(arrayStr)) !== null) {
    teamStarts.push({ index: match.index, id: match[1], name: match[2] });
  }
  
  for (let i = 0; i < teamStarts.length; i++) {
    const start = teamStarts[i].index;
    const end = i + 1 < teamStarts.length ? teamStarts[i + 1].index : arrayStr.length;
    const block = arrayStr.substring(start, end);
    
    const players = [];
    const p = /["']name["']\s*:\s*["']([^"']+)["'],\s*["']position["']\s*:\s*["']([^"']+)["'](?:,\s*["']age["']\s*:\s*\d+)?,\s*["']overall["']\s*:\s*(\d+)/g;
    let pm;
    while ((pm = p.exec(block)) !== null) {
      players.push({ name: pm[1], position: pm[2], overall: parseInt(pm[3]) });
    }
    
    if (players.length > 0) {
      teams.push({ id: teamStarts[i].id, name: teamStarts[i].name, players });
    }
  }
  
  return teams;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const pack = {
    id: 'competicion_2025_26',
    name: 'Competición 2025/2026',
    description: 'Nombres reales de equipos y jugadores para la temporada 2025/2026',
    author: 'PC GAFFER',
    version: '1.0',
    season: '2025-2026',
    teams: {}
  };

  let totalTeams = 0;
  let totalPlayers = 0;
  const issues = [];

  // Process standard leagues
  for (const league of LEAGUE_MAP) {
    const gameFilePath = path.join(DATA_DIR, league.gameFile);
    const scrapedFilePath = path.join(SCRAPED_DIR, league.scrapedFile);
    
    if (!fs.existsSync(gameFilePath)) {
      issues.push(`Game file not found: ${league.gameFile}`);
      continue;
    }
    if (!fs.existsSync(scrapedFilePath)) {
      issues.push(`Scraped file not found: ${league.scrapedFile}`);
      continue;
    }

    const gameTeams = parseTeamsFile(gameFilePath);
    const realTeams = JSON.parse(fs.readFileSync(scrapedFilePath, 'utf8'));
    
    if (gameTeams.length === 0) {
      issues.push(`Could not parse teams from ${league.gameFile}`);
      continue;
    }

    console.log(`${league.leagueId}: ${gameTeams.length} game teams, ${realTeams.length} real teams`);
    
    const matched = matchTeams(gameTeams, realTeams);
    Object.assign(pack.teams, matched);
    
    const teamCount = Object.keys(matched).length;
    const playerCount = Object.values(matched).reduce((s, t) => s + (t.players ? Object.keys(t.players).length : 0), 0);
    totalTeams += teamCount;
    totalPlayers += playerCount;
    console.log(`  → ${teamCount} teams, ${playerCount} players mapped`);
  }

  // Process multi-group leagues
  for (const mg of MULTI_GROUP_LEAGUES) {
    const gameFilePath = path.join(DATA_DIR, mg.gameFile);
    if (!fs.existsSync(gameFilePath)) {
      issues.push(`Game file not found: ${mg.gameFile}`);
      continue;
    }

    for (const group of mg.groups) {
      const scrapedFilePath = path.join(SCRAPED_DIR, group.scrapedFile);
      if (!fs.existsSync(scrapedFilePath)) {
        issues.push(`Scraped file not found: ${group.scrapedFile}`);
        continue;
      }

      const gameTeams = parseMultiGroupFile(gameFilePath, group.exportName);
      const realTeams = JSON.parse(fs.readFileSync(scrapedFilePath, 'utf8'));
      
      if (gameTeams.length === 0) {
        issues.push(`Could not parse group ${group.exportName} from ${mg.gameFile}`);
        continue;
      }

      console.log(`${group.leagueId}: ${gameTeams.length} game teams, ${realTeams.length} real teams`);
      
      const matched = matchTeams(gameTeams, realTeams);
      Object.assign(pack.teams, matched);
      
      const teamCount = Object.keys(matched).length;
      const playerCount = Object.values(matched).reduce((s, t) => s + (t.players ? Object.keys(t.players).length : 0), 0);
      totalTeams += teamCount;
      totalPlayers += playerCount;
      console.log(`  → ${teamCount} teams, ${playerCount} players mapped`);
    }
  }

  // Add league name mappings
  pack.leagues = {
    'Liga Ibérica': 'LaLiga EA Sports',
    'Segunda Ibérica': 'LaLiga Hypermotion',
    'First League': 'Premier League',
    'Erste Liga': 'Bundesliga',
    'Calcio League': 'Serie A',
    'Division Première': 'Ligue 1',
    'Dutch First': 'Eredivisie',
    'Liga Lusitana': 'Liga Portugal',
    'Second League': 'EFL Championship',
    'Belgian First': 'Jupiler Pro League',
    'Anatolian League': 'Süper Lig',
    'Highland League': 'Scottish Premiership',
    'Calcio B': 'Serie B',
    'Zweite Liga': '2. Bundesliga',
    'Division Seconde': 'Ligue 2',
    'Alpine League': 'Super League (Suiza)',
    'Erste Liga (Austria)': 'Bundesliga (Austria)',
    'Super League': 'Super League (Grecia)',
    'Superligaen': 'Superligaen (Dinamarca)',
    'HNL': 'HNL (Croacia)',
    'Chance Liga': 'Chance Liga (Chequia)',
  };

  pack.teamCount = totalTeams;
  pack.playerCount = totalPlayers;
  
  console.log(`\n=== PACK SUMMARY ===`);
  console.log(`Teams: ${totalTeams}`);
  console.log(`Players: ${totalPlayers}`);
  
  if (issues.length > 0) {
    console.log(`\nIssues (${issues.length}):`);
    issues.forEach(i => console.log(`  - ${i}`));
  }

  // Save pack JSON locally
  const outputPath = path.join(BASE, 'scripts', 'edition-pack-2025-26.json');
  fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2), 'utf8');
  console.log(`\nPack saved to: ${outputPath}`);

  // Upload to Firebase
  await uploadToFirebase(pack);
}

// ============================================================
// FIREBASE UPLOAD
// ============================================================
function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

async function uploadToFirebase(pack) {
  console.log('\nUploading to Firebase...');
  
  try {
    const projectId = 'pcfutbol-web';
    const apiKey = 'AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw';
    const docId = pack.id;
    
    const docData = {
      ...pack,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    const fields = toFirestoreFields(docData);
    
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/editions/${docId}?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Firebase error ${response.status}: ${errText}`);
    }
    
    console.log('✅ Pack uploaded to Firebase successfully!');
    console.log(`   Collection: editions, Document ID: ${docId}`);
  } catch (err) {
    console.error('❌ Firebase upload failed:', err.message);
    console.log('   Pack JSON saved locally. You can upload manually.');
  }
}
(async () => {
  try {
    await main();
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
