/**
 * Upload ALL SoFIFA EA FC 26 data to Firebase with REALISTIC market values
 * Sources:
 *   - sofifa-data-full.json → leagues 53 (LaLiga) & 54 (Segunda)
 *   - sofifa-leagues/*.json → all other leagues including 13 (Premier)
 * Preserves rich team metadata from existing public/data/*.json
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sofifaDir = join(__dirname, 'sofifa-leagues');
const dataDir = join(__dirname, '..', 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// League mapping: SoFIFA ID → Firestore config
// ============================================================
const LEAGUE_MAP = {
  '53':   { id: 'laliga',             name: 'LaLiga EA Sports',     country: 'España',         existingJson: 'laliga.json' },
  '54':   { id: 'laliga2',            name: 'LaLiga Hypermotion',   country: 'España',         existingJson: 'laliga2.json' },
  '13':   { id: 'premier',            name: 'Premier League',       country: 'Inglaterra',     existingJson: 'premier.json' },
  '31':   { id: 'seriea',             name: 'Serie A',              country: 'Italia' },
  '19':   { id: 'bundesliga',         name: 'Bundesliga',           country: 'Alemania' },
  '16':   { id: 'ligue1',             name: 'Ligue 1',              country: 'Francia' },
  '10':   { id: 'eredivisie',         name: 'Eredivisie',           country: 'Países Bajos' },
  '308':  { id: 'primeiraLiga',       name: 'Primeira Liga',        country: 'Portugal' },
  '14':   { id: 'championship',       name: 'Championship',         country: 'Inglaterra' },
  '4':    { id: 'belgianPro',         name: 'Jupiler Pro League',   country: 'Bélgica' },
  '68':   { id: 'superLig',           name: 'Süper Lig',            country: 'Turquía' },
  '50':   { id: 'scottishPrem',       name: 'Scottish Premiership', country: 'Escocia' },
  '32':   { id: 'serieB',             name: 'Serie B',              country: 'Italia' },
  '20':   { id: 'bundesliga2',        name: '2. Bundesliga',        country: 'Alemania' },
  '17':   { id: 'ligue2',             name: 'Ligue 2',              country: 'Francia' },
  '189':  { id: 'swissSuperLeague',   name: 'Super League',         country: 'Suiza' },
  '80':   { id: 'austrianBundesliga', name: 'Bundesliga',           country: 'Austria' },
  '63':   { id: 'greekSuperLeague',   name: 'Super League',         country: 'Grecia' },
  '1':    { id: 'danishSuperliga',    name: 'Superligaen',          country: 'Dinamarca' },
  '317':  { id: 'croatianLeague',     name: 'HNL',                  country: 'Croacia' },
  '319':  { id: 'czechLeague',        name: 'Chance Liga',          country: 'Chequia' },
  '7':    { id: 'brasileiraoA',       name: 'Série A',              country: 'Brasil' },
  '353':  { id: 'argentinaPrimera',   name: 'Liga Profesional',     country: 'Argentina' },
  '350':  { id: 'saudiProLeague',     name: 'Saudi Pro League',     country: 'Arabia Saudí' },
  '39':   { id: 'mls',                name: 'Major League Soccer',  country: 'EE.UU./Canadá' },
  '336':  { id: 'colombiaPrimera',    name: 'Liga BetPlay',         country: 'Colombia' },
  '335':  { id: 'chilePrimera',       name: 'Primera División',     country: 'Chile' },
  '337':  { id: 'paraguayPrimera',    name: 'División de Honor',    country: 'Paraguay' },
  '338':  { id: 'uruguayPrimera',     name: 'Primera División',     country: 'Uruguay' },
  '2017': { id: 'boliviaPrimera',     name: 'División Profesional', country: 'Bolivia' },
  '2018': { id: 'ecuadorLigaPro',     name: 'LigaPro',              country: 'Ecuador' },
  '2019': { id: 'venezuelaPrimera',   name: 'Liga FUTVE',           country: 'Venezuela' },
  '2020': { id: 'peruLiga1',          name: 'Liga 1',               country: 'Perú' },
};

const SKIP = new Set(['341', '349']);

// ============================================================
// Position mapping
// ============================================================
const POS_MAP = {
  GK:'GK', CB:'CB', LB:'LB', RB:'RB', LWB:'LB', RWB:'RB',
  CDM:'CDM', CM:'CM', CAM:'CAM', LM:'LM', RM:'RM',
  LW:'LW', RW:'RW', CF:'CF', ST:'ST'
};
const mapPos = s => POS_MAP[(s||'CM').split(',')[0].trim()] || 'CM';

// ============================================================
// REALISTIC market value formula
// ============================================================
const BASE_VALUES = {
  95:280e6,94:240e6,93:200e6,92:180e6,91:160e6,90:140e6,
  89:110e6,88:90e6,87:75e6,86:60e6,85:50e6,
  84:42e6,83:35e6,82:28e6,81:22e6,80:18e6,
  79:14e6,78:11e6,77:8e6,76:6e6,75:5e6,
  74:4e6,73:3e6,72:2.5e6,71:2e6,70:1.5e6,
  69:1.2e6,68:900e3,67:700e3,66:500e3,65:400e3,
  64:300e3,63:200e3,62:150e3,61:100e3,60:80e3,
};

function getBaseValue(ovr) {
  if (ovr >= 95) return BASE_VALUES[95] + (ovr - 95) * 50e6;
  if (ovr <= 60) return Math.max(50e3, BASE_VALUES[60] - (60 - ovr) * 10e3);
  return BASE_VALUES[ovr] || 50e3;
}

function ageMultiplier(age) {
  if (age <= 17) return 2.0;
  if (age === 18) return 1.9;
  if (age === 19) return 1.7;
  if (age === 20) return 1.5;
  if (age === 21) return 1.4;
  if (age <= 23) return 1.25;
  if (age <= 28) return 1.0; // prime
  if (age === 29) return 0.70;
  if (age === 30) return 0.55;
  if (age === 31) return 0.40;
  if (age === 32) return 0.30;
  if (age === 33) return 0.22;
  if (age === 34) return 0.15;
  if (age === 35) return 0.10;
  return 0.06; // 36+
}

function generateValue(overall, age) {
  const base = getBaseValue(overall);
  const mult = ageMultiplier(age);
  const variance = 0.90 + Math.random() * 0.20; // ±10%
  return Math.round(base * mult * variance);
}

function generateSalary(value, overall) {
  // ~12-15% of value annually → /52 weeks
  const annualPct = overall >= 85 ? 0.14 : overall >= 75 ? 0.12 : 0.10;
  const weekly = Math.round((value * annualPct) / 52);
  const min = overall >= 80 ? 30000 : overall >= 70 ? 15000 : 5000;
  return Math.max(min, weekly);
}

function generateContract(age) {
  if (age >= 35) return 1;
  if (age >= 33) return Math.random() < 0.6 ? 1 : 2;
  if (age >= 30) return Math.floor(Math.random() * 2) + 1;
  if (age >= 27) return Math.floor(Math.random() * 3) + 1;
  return Math.floor(Math.random() * 3) + 2; // young: 2-4
}

// ============================================================
// Slug
// ============================================================
function toSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Load existing team metadata (stadium, colors, etc.)
// ============================================================
function loadExistingMetadata(jsonFile) {
  const path = join(dataDir, jsonFile);
  if (!existsSync(path)) return new Map();
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const arr = Array.isArray(data) ? data : (data.allTeams || []);
    const map = new Map();
    for (const t of arr) {
      // Index by lowercase name for fuzzy matching
      const key = t.name?.toLowerCase().replace(/[^a-záéíóúñü\s]/gi, '').trim();
      if (key) map.set(key, t);
      // Also index by id
      if (t.id) map.set(t.id, t);
    }
    return map;
  } catch { return new Map(); }
}

function findMetadata(metaMap, teamName, teamSlug) {
  if (metaMap.size === 0) return null;
  // Try exact id
  if (metaMap.has(teamSlug)) return metaMap.get(teamSlug);
  // Try lowercase name
  const key = teamName.toLowerCase().replace(/[^a-záéíóúñü\s]/gi, '').trim();
  if (metaMap.has(key)) return metaMap.get(key);
  // Try partial match
  for (const [k, v] of metaMap) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}

// ============================================================
// Convert flat player array → team-based structure
// ============================================================
function groupByTeam(players, metaMap = new Map()) {
  const teamMap = new Map();
  for (const p of players) {
    if (!p.team) continue;
    if (!teamMap.has(p.team)) teamMap.set(p.team, []);
    teamMap.get(p.team).push(p);
  }

  const teams = [];
  for (const [teamName, teamPlayers] of teamMap) {
    const slug = toSlug(teamName);
    const meta = findMetadata(metaMap, teamName, slug);

    const convertedPlayers = teamPlayers.map(p => {
      const overall = p.overall || 65;
      const age = p.age || 25;
      const potential = p.potential || overall;
      const position = mapPos(p.position);
      const value = generateValue(overall, age);
      return {
        name: p.name,
        position,
        age,
        overall,
        potential,
        value,
        salary: generateSalary(value, overall),
        contract: generateContract(age),
        morale: 75,
        fitness: 100
      };
    }).sort((a, b) => b.overall - a.overall);

    const team = {
      id: meta?.id || slug,
      name: meta?.name || teamName,
      players: convertedPlayers
    };

    // Preserve rich metadata if available
    if (meta) {
      if (meta.shortName) team.shortName = meta.shortName;
      if (meta.city) team.city = meta.city;
      if (meta.stadium) team.stadium = meta.stadium;
      if (meta.stadiumCapacity) team.stadiumCapacity = meta.stadiumCapacity;
      if (meta.budget) team.budget = meta.budget;
      if (meta.reputation) team.reputation = meta.reputation;
      if (meta.colors) team.colors = meta.colors;
    }

    teams.push(team);
  }

  return teams.sort((a, b) => {
    const avg = t => t.players.reduce((s, p) => s + p.overall, 0) / (t.players.length || 1);
    return avg(b) - avg(a);
  });
}

// ============================================================
// Upload league to Firestore
// ============================================================
async function uploadLeague(leagueId, teams, metadata) {
  const playerCount = teams.reduce((s, t) => s + t.players.length, 0);
  await setDoc(doc(db, 'leagues', leagueId), {
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount,
    source: 'SoFIFA EA FC 26',
    updatedAt: new Date().toISOString()
  });

  const BATCH_SIZE = 400;
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const team of teams.slice(i, i + BATCH_SIZE)) {
      batch.set(doc(db, 'teams', team.id), {
        ...team,
        league: leagueId,
        playerCount: team.players.length,
        avgOverall: Math.round(team.players.reduce((s, p) => s + p.overall, 0) / team.players.length),
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
  return { teams: teams.length, players: playerCount };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🔥 FULL RE-UPLOAD: SoFIFA EA FC 26 → Firebase (realistic values)\n');

  // Load sofifa-data-full.json for LaLiga (53) and Segunda (54)
  const fullData = JSON.parse(readFileSync(join(__dirname, 'sofifa-data-full.json'), 'utf-8'));

  // Collect all player data: {sofifaId → playerArray}
  const allData = {};

  // From sofifa-data-full.json
  for (const [lid, players] of Object.entries(fullData)) {
    if (LEAGUE_MAP[lid] && !SKIP.has(lid)) {
      allData[lid] = players;
    }
  }

  // From sofifa-leagues/*.json (overwrite if duplicate)
  const files = existsSync(sofifaDir)
    ? readdirSync(sofifaDir).filter(f => f.endsWith('.json') && f !== 'summary.json')
    : [];
  for (const file of files) {
    const lid = file.replace('.json', '');
    if (LEAGUE_MAP[lid] && !SKIP.has(lid)) {
      allData[lid] = JSON.parse(readFileSync(join(sofifaDir, file), 'utf-8'));
    }
  }

  console.log(`📊 Loaded ${Object.keys(allData).length} leagues\n`);

  let totalTeams = 0, totalPlayers = 0, successCount = 0;
  const allLeagueIds = [];

  // Sort leagues for consistent order
  const sortedIds = Object.keys(allData).sort((a, b) => {
    const order = ['53','54','13','31','19','16','10','308','14','4','68','50','32','20','17','189','80','63','1','317','319','7','353','350','39','336','335','337','338','2017','2018','2019','2020'];
    return order.indexOf(a) - order.indexOf(b);
  });

  for (const lid of sortedIds) {
    const mapping = LEAGUE_MAP[lid];
    const players = allData[lid];
    if (!players || players.length === 0) continue;

    process.stdout.write(`  📋 ${mapping.name} (${mapping.country})...`);

    try {
      // Load existing team metadata for merging
      const metaMap = mapping.existingJson
        ? loadExistingMetadata(mapping.existingJson)
        : loadExistingMetadata(`${mapping.id}.json`);

      const teams = groupByTeam(players, metaMap);
      const result = await uploadLeague(mapping.id, teams, mapping);

      // Also save to public/data/ for local fallback
      const jsonPath = join(dataDir, `${mapping.id}.json`);
      writeFileSync(jsonPath, JSON.stringify(teams, null, 2), 'utf-8');

      console.log(` ✅ ${result.teams} teams, ${result.players} players`);
      totalTeams += result.teams;
      totalPlayers += result.players;
      successCount++;
      allLeagueIds.push(mapping.id);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }

  // Update metadata (preserve primera-rfef and segunda-rfef)
  await setDoc(doc(db, 'metadata', 'stats'), {
    version: '2025-26',
    source: 'SoFIFA EA FC 26',
    lastUpdated: new Date().toISOString(),
    leagues: [...allLeagueIds, 'primera-rfef', 'segunda-rfef']
  });

  console.log(`\n✅ Done! ${successCount} leagues, ${totalTeams} teams, ${totalPlayers} players.`);

  // Verify a few values
  console.log('\n--- VERIFICATION ---');
  const laliga = JSON.parse(readFileSync(join(dataDir, 'laliga.json'), 'utf-8'));
  const rm = laliga.find(t => t.name?.includes('Real Madrid') || t.id === 'real_madrid' || t.name === 'Real Madrid');
  if (rm) {
    console.log(`\nReal Madrid (${rm.players.length} players):`);
    rm.players.slice(0, 8).forEach(p =>
      console.log(`  ${p.name}: OVR ${p.overall} | €${(p.value/1e6).toFixed(1)}M | salary €${(p.salary/1e3).toFixed(1)}K/w`)
    );
  }
  const betis = laliga.find(t => t.name?.includes('Betis') || t.id === 'real_betis');
  if (betis) {
    console.log(`\nReal Betis (${betis.players.length} players):`);
    const isco = betis.players.find(p => p.name.includes('Isco'));
    if (isco) console.log(`  Isco: OVR ${isco.overall} | €${(isco.value/1e6).toFixed(1)}M`);
  }

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
