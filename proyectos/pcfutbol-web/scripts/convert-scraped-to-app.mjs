/**
 * Convert scraped Transfermarkt data to app format
 * Reads from scraped-data/2025-26/ and writes to src/data/
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const dataDir = join(projectRoot, 'src', 'data');

// Position mapping: English -> Spanish abbreviations
const POSITION_MAP = {
  'GK': 'POR',
  'CB': 'DFC',
  'LB': 'LI',
  'RB': 'LD',
  'CDM': 'MCD',
  'CM': 'MC',
  'CAM': 'MCO',
  'LW': 'EI',
  'RW': 'ED',
  'CF': 'MP',
  'ST': 'DC',
  'LM': 'MI',
  'RM': 'MD'
};

// League file mapping configuration
const LEAGUE_CONFIG = [
  { src: 'eredivisie.json', out: 'teams-eredivisie.js', exportName: 'eredivisieTeams', leagueName: 'Eredivisie' },
  { src: 'primeiraLiga.json', out: 'teams-primeira-liga.js', exportName: 'primeiraLigaTeams', leagueName: 'Primeira Liga' },
  { src: 'championship.json', out: 'teams-championship.js', exportName: 'championshipTeams', leagueName: 'Championship' },
  { src: 'belgianPro.json', out: 'teams-belgian-pro.js', exportName: 'belgianProTeams', leagueName: 'Jupiler Pro League' },
  { src: 'superLig.json', out: 'teams-super-lig.js', exportName: 'superLigTeams', leagueName: 'Süper Lig' },
  { src: 'scottishPrem.json', out: 'teams-scottish-prem.js', exportName: 'scottishPremTeams', leagueName: 'Scottish Premiership' },
  { src: 'serieB.json', out: 'teams-serie-b.js', exportName: 'serieBTeams', leagueName: 'Serie B' },
  { src: 'bundesliga2.json', out: 'teams-bundesliga2.js', exportName: 'bundesliga2Teams', leagueName: '2. Bundesliga' },
  { src: 'ligue2.json', out: 'teams-ligue2.js', exportName: 'ligue2Teams', leagueName: 'Ligue 2' },
  { src: 'swissSuperLeague.json', out: 'teams-swiss.js', exportName: 'swissTeams', leagueName: 'Swiss Super League' },
  { src: 'austrianBundesliga.json', out: 'teams-austrian.js', exportName: 'austrianTeams', leagueName: 'Austrian Bundesliga' },
  { src: 'greekSuperLeague.json', out: 'teams-greek.js', exportName: 'greekTeams', leagueName: 'Greek Super League' },
  { src: 'danishSuperliga.json', out: 'teams-danish.js', exportName: 'danishTeams', leagueName: 'Danish Superliga' },
  { src: 'croatianLeague.json', out: 'teams-croatian.js', exportName: 'croatianTeams', leagueName: 'Croatian HNL' },
  { src: 'czechLeague.json', out: 'teams-czech.js', exportName: 'czechTeams', leagueName: 'Czech Chance Liga' },
];

/**
 * Convert a team name to a clean slug
 */
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Trim hyphens
}

/**
 * Escape single quotes in strings for JS output
 */
function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Convert one league's scraped data to app format JS string
 */
function convertLeague(config) {
  const srcPath = join(scrapedDir, config.src);
  let rawData;
  try {
    rawData = JSON.parse(readFileSync(srcPath, 'utf-8'));
  } catch (e) {
    console.error(`  ❌ Could not read ${config.src}: ${e.message}`);
    return null;
  }

  if (!Array.isArray(rawData) || rawData.length === 0) {
    console.error(`  ❌ ${config.src} is empty or not an array`);
    return null;
  }

  const teams = rawData.map(team => {
    const id = team.slug || toSlug(team.name);
    const players = (team.players || []).map(p => {
      const position = POSITION_MAP[p.position] || 'MC'; // Default to MC if unknown
      const rating = p.overall || 70; // Default rating
      return { name: p.name, position, rating };
    });

    return { id, name: team.name, players };
  });

  // Build the JS file content
  let js = `// ${config.leagueName} 25/26 - Data from Transfermarkt\n`;
  js += `export const ${config.exportName} = [\n`;

  teams.forEach((team, ti) => {
    js += `  {\n`;
    js += `    id: '${escapeStr(team.id)}',\n`;
    js += `    name: '${escapeStr(team.name)}',\n`;
    js += `    players: [\n`;
    team.players.forEach((p, pi) => {
      const comma = pi < team.players.length - 1 ? ',' : '';
      js += `      { name: '${escapeStr(p.name)}', position: '${p.position}', rating: ${p.rating} }${comma}\n`;
    });
    js += `    ]\n`;
    js += `  }${ti < teams.length - 1 ? ',' : ''}\n`;
  });

  js += `];\n`;

  return { js, teamCount: teams.length, playerCount: teams.reduce((s, t) => s + t.players.length, 0) };
}

// ============================================================
// MAIN
// ============================================================
console.log('🔄 Converting scraped data to app format...\n');

let totalLeagues = 0;
let totalTeams = 0;
let totalPlayers = 0;

for (const config of LEAGUE_CONFIG) {
  process.stdout.write(`  📋 ${config.leagueName} (${config.src})...`);
  const result = convertLeague(config);
  
  if (result) {
    const outPath = join(dataDir, config.out);
    writeFileSync(outPath, result.js, 'utf-8');
    console.log(` ✅ ${result.teamCount} teams, ${result.playerCount} players → ${config.out}`);
    totalLeagues++;
    totalTeams += result.teamCount;
    totalPlayers += result.playerCount;
  }
}

console.log(`\n✅ Done! Converted ${totalLeagues} leagues, ${totalTeams} teams, ${totalPlayers} players.`);
