/**
 * Convert scraped Transfermarkt JSON data to app data format
 * 
 * Usage:
 *   node scripts/convert-scraped-to-data.mjs
 *   node scripts/convert-scraped-to-data.mjs --league eredivisie
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SCRAPED_DIR = path.join(PROJECT_ROOT, 'scraped-data', '2025-26');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');

// League config: scraped filename → output config
const LEAGUE_CONFIG = {
  eredivisie: {
    outputFile: 'teams-eredivisie.js',
    exportName: 'eredivisieTeams',
    leagueId: 'eredivisie',
    leagueName: 'Eredivisie',
    defaultCapacity: 25000,
    baseReputation: 71,
    tier: 1
  },
  primeiraLiga: {
    outputFile: 'teams-primeira-liga.js',
    exportName: 'primeiraLigaTeams',
    leagueId: 'primeiraLiga',
    leagueName: 'Primeira Liga',
    defaultCapacity: 25000,
    baseReputation: 72,
    tier: 1
  },
  championship: {
    outputFile: 'teams-championship.js',
    exportName: 'championshipTeams',
    leagueId: 'championship',
    leagueName: 'Championship',
    defaultCapacity: 15000,
    baseReputation: 70,
    tier: 2
  },
  belgianPro: {
    outputFile: 'teams-belgian-pro.js',
    exportName: 'belgianProTeams',
    leagueId: 'belgianPro',
    leagueName: 'Jupiler Pro League',
    defaultCapacity: 15000,
    baseReputation: 69,
    tier: 1
  },
  superLig: {
    outputFile: 'teams-super-lig.js',
    exportName: 'superLigTeams',
    leagueId: 'superLig',
    leagueName: 'Süper Lig',
    defaultCapacity: 25000,
    baseReputation: 69,
    tier: 1
  },
  scottishPrem: {
    outputFile: 'teams-scottish-prem.js',
    exportName: 'scottishPremTeams',
    leagueId: 'scottishPrem',
    leagueName: 'Scottish Premiership',
    defaultCapacity: 10000,
    baseReputation: 66,
    tier: 1
  },
  serieB: {
    outputFile: 'teams-serie-b.js',
    exportName: 'serieBTeams',
    leagueId: 'serieB',
    leagueName: 'Serie B',
    defaultCapacity: 15000,
    baseReputation: 67,
    tier: 2
  },
  bundesliga2: {
    outputFile: 'teams-bundesliga2.js',
    exportName: 'bundesliga2Teams',
    leagueId: 'bundesliga2',
    leagueName: '2. Bundesliga',
    defaultCapacity: 15000,
    baseReputation: 68,
    tier: 2
  },
  ligue2: {
    outputFile: 'teams-ligue2.js',
    exportName: 'ligue2Teams',
    leagueId: 'ligue2',
    leagueName: 'Ligue 2',
    defaultCapacity: 15000,
    baseReputation: 66,
    tier: 2
  },
  swissSuperLeague: {
    outputFile: 'teams-swiss.js',
    exportName: 'swissTeams',
    leagueId: 'swissSuperLeague',
    leagueName: 'Super League',
    defaultCapacity: 10000,
    baseReputation: 66,
    tier: 1
  },
  austrianBundesliga: {
    outputFile: 'teams-austrian.js',
    exportName: 'austrianTeams',
    leagueId: 'austrianBundesliga',
    leagueName: 'Bundesliga (Austria)',
    defaultCapacity: 10000,
    baseReputation: 66,
    tier: 1
  },
  greekSuperLeague: {
    outputFile: 'teams-greek.js',
    exportName: 'greekTeams',
    leagueId: 'greekSuperLeague',
    leagueName: 'Super League',
    defaultCapacity: 10000,
    baseReputation: 67,
    tier: 1
  },
  danishSuperliga: {
    outputFile: 'teams-danish.js',
    exportName: 'danishTeams',
    leagueId: 'danishSuperliga',
    leagueName: 'Superligaen',
    defaultCapacity: 10000,
    baseReputation: 65,
    tier: 1
  },
  croatianLeague: {
    outputFile: 'teams-croatian.js',
    exportName: 'croatianTeams',
    leagueId: 'croatianLeague',
    leagueName: 'HNL',
    defaultCapacity: 10000,
    baseReputation: 64,
    tier: 1
  },
  czechLeague: {
    outputFile: 'teams-czech.js',
    exportName: 'czechTeams',
    leagueId: 'czechLeague',
    leagueName: 'Chance Liga',
    defaultCapacity: 10000,
    baseReputation: 64,
    tier: 1
  },
  // South American leagues
  argentinaPrimera: {
    outputFile: 'teams-argentina.js',
    exportName: 'argentinaTeams',
    leagueId: 'argentinaPrimera',
    leagueName: 'Liga Profesional',
    defaultCapacity: 30000,
    baseReputation: 72,
    tier: 1
  },
  brasileiraoA: {
    outputFile: 'teams-brasileirao.js',
    exportName: 'brasilTeams',
    leagueId: 'brasileiraoA',
    leagueName: 'Série A',
    defaultCapacity: 35000,
    baseReputation: 73,
    tier: 1
  },
  colombiaPrimera: {
    outputFile: 'teams-colombia.js',
    exportName: 'colombiaTeams',
    leagueId: 'colombiaPrimera',
    leagueName: 'Liga BetPlay',
    defaultCapacity: 25000,
    baseReputation: 67,
    tier: 1
  },
  chilePrimera: {
    outputFile: 'teams-chile.js',
    exportName: 'chileTeams',
    leagueId: 'chilePrimera',
    leagueName: 'Primera División (Chile)',
    defaultCapacity: 15000,
    baseReputation: 66,
    tier: 1
  },
  uruguayPrimera: {
    outputFile: 'teams-uruguay.js',
    exportName: 'uruguayTeams',
    leagueId: 'uruguayPrimera',
    leagueName: 'Primera División (Uruguay)',
    defaultCapacity: 20000,
    baseReputation: 67,
    tier: 1
  },
  ecuadorLigaPro: {
    outputFile: 'teams-ecuador.js',
    exportName: 'ecuadorTeams',
    leagueId: 'ecuadorLigaPro',
    leagueName: 'LigaPro',
    defaultCapacity: 15000,
    baseReputation: 65,
    tier: 1
  },
  paraguayPrimera: {
    outputFile: 'teams-paraguay.js',
    exportName: 'paraguayTeams',
    leagueId: 'paraguayPrimera',
    leagueName: 'División de Honor',
    defaultCapacity: 15000,
    baseReputation: 63,
    tier: 1
  },
  peruLiga1: {
    outputFile: 'teams-peru.js',
    exportName: 'peruTeams',
    leagueId: 'peruLiga1',
    leagueName: 'Liga 1',
    defaultCapacity: 15000,
    baseReputation: 63,
    tier: 1
  },
  boliviaPrimera: {
    outputFile: 'teams-bolivia.js',
    exportName: 'boliviaTeams',
    leagueId: 'boliviaPrimera',
    leagueName: 'División Profesional',
    defaultCapacity: 15000,
    baseReputation: 60,
    tier: 1
  },
  venezuelaPrimera: {
    outputFile: 'teams-venezuela.js',
    exportName: 'venezuelaTeams',
    leagueId: 'venezuelaPrimera',
    leagueName: 'Liga FUTVE',
    defaultCapacity: 12000,
    baseReputation: 61,
    tier: 1
  }
};

// Valid positions in English
const VALID_POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'CF', 'ST', 'LM', 'RM'];

function normalizePosition(pos) {
  if (!pos) return 'CM';
  const upper = pos.toUpperCase();
  if (VALID_POSITIONS.includes(upper)) return upper;
  // Fallback mappings
  const map = {
    'GK': 'GK', 'POR': 'GK',
    'CB': 'CB', 'DFC': 'CB',
    'LB': 'LB', 'LI': 'LB',
    'RB': 'RB', 'LD': 'RB',
    'CDM': 'CDM', 'MCD': 'CDM', 'DM': 'CDM',
    'CM': 'CM', 'MC': 'CM',
    'CAM': 'CAM', 'MCO': 'CAM', 'AM': 'CAM',
    'LW': 'LW', 'EI': 'LW',
    'RW': 'RW', 'ED': 'RW',
    'CF': 'CF', 'MP': 'CF', 'SS': 'CF',
    'ST': 'ST', 'DC': 'ST',
    'LM': 'LM',
    'RM': 'RM'
  };
  return map[upper] || 'CM';
}

function generateTeamId(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
}

function generateShortName(name) {
  // Common abbreviations
  const abbrevs = {
    'FC': 'FC', 'CF': 'CF', 'SC': 'SC', 'SV': 'SV', 'AC': 'AC',
    'AS': 'AS', 'SS': 'SS', 'RC': 'RC', 'CD': 'CD', 'UD': 'UD',
    'SD': 'SD', 'AD': 'AD', 'CA': 'CA'
  };
  
  // Clean the name
  const parts = name.split(/\s+/).filter(p => !['de', 'del', 'la', 'las', 'los', 'el', 'da', 'do', 'dos'].includes(p.toLowerCase()));
  
  // If short enough, use first word
  if (parts.length === 1) return parts[0].substring(0, 3).toUpperCase();
  
  // Skip prefixes like FC, CF, etc.
  const mainParts = parts.filter(p => !abbrevs[p.toUpperCase()]);
  if (mainParts.length > 0) {
    const first = mainParts[0];
    if (first.length <= 4) return first.toUpperCase();
    return first.substring(0, 3).toUpperCase();
  }
  
  return parts[0].substring(0, 3).toUpperCase();
}

function calculateReputation(rank, totalTeams, baseReputation, tier) {
  // Scale reputation based on position in the league
  const position = rank / totalTeams;
  let rep = baseReputation;
  
  if (tier === 1) {
    // Top leagues: top team gets +20, bottom gets -5
    rep += Math.round(20 * (1 - position) - 5 * position);
  } else {
    // Lower divisions: top team gets +15, bottom gets -5
    rep += Math.round(15 * (1 - position) - 5 * position);
  }
  
  return Math.max(40, Math.min(95, rep));
}

function calculateBudget(marketValue) {
  if (!marketValue || marketValue <= 0) return 5000000;
  return Math.round(marketValue * 0.3);
}

function convertLeague(leagueKey) {
  const config = LEAGUE_CONFIG[leagueKey];
  if (!config) {
    console.error(`Unknown league: ${leagueKey}`);
    return null;
  }

  const inputFile = path.join(SCRAPED_DIR, `${leagueKey}.json`);
  if (!fs.existsSync(inputFile)) {
    console.error(`Scraped data not found: ${inputFile}`);
    return null;
  }

  const rawTeams = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
  const totalTeams = rawTeams.length;

  const convertedTeams = rawTeams.map(team => {
    const teamId = generateTeamId(team.name);
    const shortName = generateShortName(team.name);
    const reputation = calculateReputation(team.rank, totalTeams, config.baseReputation, config.tier);
    const marketValue = team.marketValue || 0;
    const budget = calculateBudget(marketValue);

    const players = (team.players || []).map(p => ({
      name: p.name,
      position: normalizePosition(p.position),
      overall: Math.max(45, Math.min(99, p.overall || 60))
    }));

    return {
      id: teamId,
      name: team.name,
      shortName,
      reputation,
      stadiumCapacity: config.defaultCapacity,
      budget,
      league: config.leagueId,
      players
    };
  });

  return { config, teams: convertedTeams };
}

function generateFileContent(config, teams) {
  const teamsJson = teams.map(team => {
    const playersStr = team.players.map(p => 
      `      { name: '${p.name.replace(/'/g, "\\'")}', position: '${p.position}', overall: ${p.overall} }`
    ).join(',\n');

    return `  {
    id: '${team.id}',
    name: '${team.name.replace(/'/g, "\\'")}',
    shortName: '${team.shortName}',
    reputation: ${team.reputation},
    stadiumCapacity: ${team.stadiumCapacity},
    budget: ${team.budget},
    league: '${team.league}',
    players: [
${playersStr}
    ]
  }`;
  }).join(',\n');

  return `// ${config.leagueName} 25/26 - Generated from Transfermarkt data
export const ${config.exportName} = [
${teamsJson}
];
`;
}

function main() {
  const args = process.argv.slice(2);
  let leaguesToConvert = Object.keys(LEAGUE_CONFIG);
  
  // Check for --league flag
  const leagueIdx = args.indexOf('--league');
  if (leagueIdx !== -1 && args[leagueIdx + 1]) {
    leaguesToConvert = [args[leagueIdx + 1]];
  }

  console.log('🔄 Converting scraped data to app format...\n');

  let converted = 0;
  let failed = 0;

  for (const leagueKey of leaguesToConvert) {
    const inputFile = path.join(SCRAPED_DIR, `${leagueKey}.json`);
    if (!fs.existsSync(inputFile)) {
      console.log(`⏭️  Skipping ${leagueKey} (no scraped data)`);
      failed++;
      continue;
    }

    const result = convertLeague(leagueKey);
    if (!result) {
      failed++;
      continue;
    }

    const { config, teams } = result;
    const outputPath = path.join(DATA_DIR, config.outputFile);
    const content = generateFileContent(config, teams);
    
    fs.writeFileSync(outputPath, content, 'utf8');
    
    const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
    console.log(`✅ ${config.leagueName}: ${teams.length} teams, ${totalPlayers} players → ${config.outputFile}`);
    converted++;
  }

  console.log(`\n📊 Done: ${converted} converted, ${failed} skipped`);
}

main();
