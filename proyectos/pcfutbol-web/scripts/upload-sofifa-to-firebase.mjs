/**
 * Upload SoFIFA EA FC 26 data to Firebase Firestore
 * Reads from scripts/sofifa-leagues/{leagueId}.json
 * Groups players by team, generates missing fields, uploads
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sofifaDir = join(__dirname, 'sofifa-leagues');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// SoFIFA League ID → Firestore ID mapping
// ============================================================
const LEAGUE_MAP = {
  '31':   { id: 'seriea',             name: 'Serie A',              country: 'Italia' },
  '19':   { id: 'bundesliga',         name: 'Bundesliga',           country: 'Alemania' },
  '16':   { id: 'ligue1',             name: 'Ligue 1',             country: 'Francia' },
  '10':   { id: 'eredivisie',         name: 'Eredivisie',          country: 'Países Bajos' },
  '308':  { id: 'primeiraLiga',       name: 'Primeira Liga',       country: 'Portugal' },
  '14':   { id: 'championship',       name: 'Championship',        country: 'Inglaterra' },
  '4':    { id: 'belgianPro',         name: 'Jupiler Pro League',  country: 'Bélgica' },
  '68':   { id: 'superLig',           name: 'Süper Lig',           country: 'Turquía' },
  '50':   { id: 'scottishPrem',       name: 'Scottish Premiership', country: 'Escocia' },
  '32':   { id: 'serieB',             name: 'Serie B',             country: 'Italia' },
  '20':   { id: 'bundesliga2',        name: '2. Bundesliga',       country: 'Alemania' },
  '17':   { id: 'ligue2',             name: 'Ligue 2',             country: 'Francia' },
  '189':  { id: 'swissSuperLeague',   name: 'Super League',        country: 'Suiza' },
  '80':   { id: 'austrianBundesliga', name: 'Bundesliga',          country: 'Austria' },
  '63':   { id: 'greekSuperLeague',   name: 'Super League',        country: 'Grecia' },
  '1':    { id: 'danishSuperliga',    name: 'Superligaen',         country: 'Dinamarca' },
  '317':  { id: 'croatianLeague',     name: 'HNL',                 country: 'Croacia' },
  '319':  { id: 'czechLeague',        name: 'Chance Liga',         country: 'Chequia' },
  '7':    { id: 'brasileiraoA',       name: 'Série A',             country: 'Brasil' },
  '353':  { id: 'argentinaPrimera',   name: 'Liga Profesional',    country: 'Argentina' },
  '350':  { id: 'saudiProLeague',     name: 'Saudi Pro League',    country: 'Arabia Saudí' },
  '39':   { id: 'mls',                name: 'Major League Soccer', country: 'EE.UU./Canadá' },
  '336':  { id: 'colombiaPrimera',    name: 'Liga BetPlay',        country: 'Colombia' },
  '335':  { id: 'chilePrimera',       name: 'Primera División',    country: 'Chile' },
  '337':  { id: 'paraguayPrimera',    name: 'División de Honor',   country: 'Paraguay' },
  '338':  { id: 'uruguayPrimera',     name: 'Primera División',    country: 'Uruguay' },
  '2017': { id: 'boliviaPrimera',     name: 'División Profesional', country: 'Bolivia' },
  '2018': { id: 'ecuadorLigaPro',     name: 'LigaPro',             country: 'Ecuador' },
  '2019': { id: 'venezuelaPrimera',   name: 'Liga FUTVE',          country: 'Venezuela' },
  '2020': { id: 'peruLiga1',          name: 'Liga 1',              country: 'Perú' },
};

// Skip these - already have good data from other sources
const SKIP_LEAGUES = ['341', '349']; // Liga MX, J1 League (0 players)

// ============================================================
// Position mapping (SoFIFA → app format)
// ============================================================
const POSITION_MAP = {
  'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'LWB': 'LB', 'RWB': 'RB',
  'CDM': 'CDM', 'CM': 'CM', 'CAM': 'CAM',
  'LM': 'LM', 'RM': 'RM', 'LW': 'LW', 'RW': 'RW',
  'CF': 'CF', 'ST': 'ST'
};

function mapPosition(posStr) {
  if (!posStr) return 'CM';
  const primary = posStr.split(',')[0].trim();
  return POSITION_MAP[primary] || 'CM';
}

// ============================================================
// Generate market value from overall + age
// ============================================================
function generateValue(overall, age) {
  let base;
  if (overall >= 90) base = 80000000 + (overall - 90) * 20000000;
  else if (overall >= 85) base = 35000000 + (overall - 85) * 9000000;
  else if (overall >= 80) base = 12000000 + (overall - 80) * 4600000;
  else if (overall >= 75) base = 4000000 + (overall - 75) * 1600000;
  else if (overall >= 70) base = 1000000 + (overall - 70) * 600000;
  else if (overall >= 65) base = 300000 + (overall - 65) * 140000;
  else base = 100000 + Math.max(0, overall - 55) * 20000;

  // Age modifier
  if (age <= 21) base *= 1.4;
  else if (age <= 24) base *= 1.2;
  else if (age >= 33) base *= 0.4;
  else if (age >= 31) base *= 0.6;
  else if (age >= 29) base *= 0.8;

  // Add some variance (±15%)
  const variance = 0.85 + Math.random() * 0.3;
  return Math.round(base * variance);
}

function generateSalary(value, overall) {
  if (value < 500000) return Math.round(10000 + (overall - 60) * 800);
  return Math.max(15000, Math.round(value * 0.003));
}

function generateContract(age) {
  if (age >= 34) return 1;
  if (age >= 30) return Math.random() < 0.5 ? 1 : 2;
  if (age >= 27) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 3) + 2;
}

// ============================================================
// Slug generation
// ============================================================
function toSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Convert flat player array → team-based structure
// ============================================================
function groupByTeam(players) {
  const teamMap = new Map();
  
  for (const p of players) {
    if (!p.team) continue;
    if (!teamMap.has(p.team)) teamMap.set(p.team, []);
    teamMap.get(p.team).push(p);
  }
  
  const teams = [];
  for (const [teamName, teamPlayers] of teamMap) {
    const id = toSlug(teamName);
    const convertedPlayers = teamPlayers.map(p => {
      const overall = p.overall || 65;
      const age = p.age || 25;
      const position = mapPosition(p.position);
      const value = generateValue(overall, age);
      
      return {
        name: p.name,
        position,
        age,
        overall,
        potential: p.potential || overall,
        value,
        salary: generateSalary(value, overall),
        contract: generateContract(age),
        morale: 75,
        fitness: 100
      };
    });
    
    // Sort: highest overall first
    convertedPlayers.sort((a, b) => b.overall - a.overall);
    
    teams.push({
      id,
      name: teamName,
      players: convertedPlayers
    });
  }
  
  // Sort teams by avg overall
  teams.sort((a, b) => {
    const avgA = a.players.reduce((s, p) => s + p.overall, 0) / a.players.length;
    const avgB = b.players.reduce((s, p) => s + p.overall, 0) / b.players.length;
    return avgB - avgA;
  });
  
  return teams;
}

// ============================================================
// Upload to Firestore
// ============================================================
async function uploadLeague(leagueId, teams, metadata) {
  // League document
  const playerCount = teams.reduce((s, t) => s + t.players.length, 0);
  await setDoc(doc(db, 'leagues', leagueId), {
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount,
    source: 'SoFIFA EA FC 26',
    updatedAt: new Date().toISOString()
  });
  
  // Teams in batches
  const BATCH_SIZE = 400;
  let uploaded = 0;
  
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = teams.slice(i, i + BATCH_SIZE);
    
    for (const team of chunk) {
      const teamRef = doc(db, 'teams', team.id);
      batch.set(teamRef, {
        ...team,
        league: leagueId,
        playerCount: team.players.length,
        avgOverall: Math.round(
          team.players.reduce((s, p) => s + p.overall, 0) / team.players.length
        ),
        updatedAt: new Date().toISOString()
      });
    }
    
    await batch.commit();
    uploaded += chunk.length;
  }
  
  return { teams: teams.length, players: playerCount };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🔥 Uploading SoFIFA EA FC 26 data to Firestore...\n');
  
  const summary = JSON.parse(readFileSync(join(sofifaDir, 'summary.json'), 'utf-8'));
  const files = readdirSync(sofifaDir).filter(f => f.endsWith('.json') && f !== 'summary.json');
  
  let totalTeams = 0;
  let totalPlayers = 0;
  let successCount = 0;
  const allLeagueIds = [];
  
  for (const file of files) {
    const sofifaId = file.replace('.json', '');
    
    if (SKIP_LEAGUES.includes(sofifaId)) {
      console.log(`  ⏭️  Skipping ${sofifaId} (empty/not in EA FC 26)`);
      continue;
    }
    
    const mapping = LEAGUE_MAP[sofifaId];
    if (!mapping) {
      console.log(`  ⚠️  No mapping for league ${sofifaId}, skipping`);
      continue;
    }
    
    process.stdout.write(`  📋 ${mapping.name} (${mapping.country})...`);
    
    try {
      const rawPlayers = JSON.parse(readFileSync(join(sofifaDir, file), 'utf-8'));
      
      if (!Array.isArray(rawPlayers) || rawPlayers.length === 0) {
        console.log(' ❌ Empty data');
        continue;
      }
      
      const teams = groupByTeam(rawPlayers);
      const result = await uploadLeague(mapping.id, teams, mapping);
      
      console.log(` ✅ ${result.teams} teams, ${result.players} players`);
      totalTeams += result.teams;
      totalPlayers += result.players;
      successCount++;
      allLeagueIds.push(mapping.id);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }
  
  // Update metadata
  const existingLeagues = ['laliga', 'laliga2', 'primera-rfef', 'segunda-rfef', 'premier'];
  await setDoc(doc(db, 'metadata', 'stats'), {
    version: '2025-26',
    source: 'SoFIFA EA FC 26 + Transfermarkt',
    lastUpdated: new Date().toISOString(),
    leagues: [...existingLeagues, ...allLeagueIds]
  });
  
  console.log(`\n✅ Done! ${successCount} leagues, ${totalTeams} teams, ${totalPlayers} players uploaded.`);
  process.exit(0);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
