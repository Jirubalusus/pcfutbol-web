/**
 * CLEAN Firebase + re-upload ALL teams with consistent IDs
 * Step 1: Delete ALL team documents and league documents
 * Step 2: Re-upload from the correct JSON data with proper values
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection, getDocs, deleteDoc } from 'firebase/firestore';
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
// League config
// ============================================================
const LEAGUE_MAP = {
  '53':   { id: 'laliga',             name: 'LaLiga EA Sports',     country: 'España' },
  '54':   { id: 'laliga2',            name: 'LaLiga Hypermotion',   country: 'España' },
  '13':   { id: 'premier',            name: 'Premier League',       country: 'Inglaterra' },
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

// Position mapping
const POS_MAP = {
  GK:'GK', CB:'CB', LB:'LB', RB:'RB', LWB:'LB', RWB:'RB',
  CDM:'CDM', CM:'CM', CAM:'CAM', LM:'LM', RM:'RM',
  LW:'LW', RW:'RW', CF:'CF', ST:'ST'
};
const mapPos = s => POS_MAP[(s||'CM').split(',')[0].trim()] || 'CM';

// ============================================================
// REALISTIC market values
// ============================================================
const BASE_VALUES = {
  95:280e6,94:240e6,93:200e6,92:180e6,91:160e6,90:145e6,
  89:120e6,88:100e6,87:85e6,86:72e6,85:60e6,
  84:52e6,83:44e6,82:37e6,81:30e6,80:25e6,
  79:20e6,78:16e6,77:12e6,76:9e6,75:7.5e6,
  74:6e6,73:4.5e6,72:3.5e6,71:3e6,70:2.5e6,
  69:1.8e6,68:1.2e6,67:900e3,66:650e3,65:500e3,
  64:350e3,63:250e3,62:180e3,61:130e3,60:100e3,
};

function getBaseValue(ovr) {
  if (ovr >= 95) return 280e6 + (ovr - 95) * 50e6;
  if (ovr <= 60) return Math.max(50e3, 100e3 - (60 - ovr) * 10e3);
  return BASE_VALUES[ovr] || 50e3;
}

function ageMultiplier(age) {
  if (age <= 17) return 2.0;
  if (age === 18) return 1.9;
  if (age === 19) return 1.7;
  if (age === 20) return 1.5;
  if (age === 21) return 1.4;
  if (age <= 23) return 1.25;
  if (age <= 28) return 1.0;
  if (age === 29) return 0.82;
  if (age === 30) return 0.68;
  if (age === 31) return 0.55;
  if (age === 32) return 0.42;
  if (age === 33) return 0.32;
  if (age === 34) return 0.22;
  if (age === 35) return 0.15;
  return 0.08;
}

function generateValue(overall, age) {
  const base = getBaseValue(overall);
  const mult = ageMultiplier(age);
  const variance = 0.92 + Math.random() * 0.16;
  return Math.round(base * mult * variance);
}

function generateSalary(value, overall) {
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
  return Math.floor(Math.random() * 3) + 2;
}

function toSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// Group players → teams
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
    const converted = teamPlayers.map(p => {
      const overall = p.overall || 65;
      const age = p.age || 25;
      const value = generateValue(overall, age);
      return {
        name: p.name,
        position: mapPos(p.position),
        age,
        overall,
        potential: p.potential || overall,
        value,
        salary: generateSalary(value, overall),
        contract: generateContract(age),
        morale: 75,
        fitness: 100
      };
    }).sort((a, b) => b.overall - a.overall);

    teams.push({ id, name: teamName, players: converted });
  }

  return teams.sort((a, b) => {
    const avg = t => t.players.reduce((s, p) => s + p.overall, 0) / (t.players.length || 1);
    return avg(b) - avg(a);
  });
}

// ============================================================
// STEP 1: DELETE everything in teams + leagues collections
// ============================================================
async function deleteAllDocuments() {
  console.log('🗑️  STEP 1: Deleting ALL documents from teams & leagues...\n');

  // Delete all teams
  const teamsSnap = await getDocs(collection(db, 'teams'));
  let teamCount = 0;
  const BATCH_SIZE = 400;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of teamsSnap.docs) {
    batch.delete(doc(db, 'teams', docSnap.id));
    batchCount++;
    teamCount++;
    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }
  if (batchCount > 0) await batch.commit();
  console.log(`  ✅ Deleted ${teamCount} team documents`);

  // Delete all leagues
  const leaguesSnap = await getDocs(collection(db, 'leagues'));
  let leagueCount = 0;
  for (const docSnap of leaguesSnap.docs) {
    await deleteDoc(doc(db, 'leagues', docSnap.id));
    leagueCount++;
  }
  console.log(`  ✅ Deleted ${leagueCount} league documents\n`);
}

// ============================================================
// STEP 2: Upload fresh data
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
  console.log('🔥 CLEAN RE-UPLOAD: Delete all → Fresh upload\n');

  // STEP 1: Delete everything
  await deleteAllDocuments();

  // STEP 2: Load all SoFIFA data
  console.log('📤 STEP 2: Uploading fresh data...\n');

  const fullData = JSON.parse(readFileSync(join(__dirname, 'sofifa-data-full.json'), 'utf-8'));
  const allData = {};

  // From sofifa-data-full.json (LaLiga 53, Segunda 54)
  for (const [lid, players] of Object.entries(fullData)) {
    if (LEAGUE_MAP[lid] && !SKIP.has(lid)) allData[lid] = players;
  }

  // From sofifa-leagues/*.json (overwrite duplicates with newer data)
  const files = readdirSync(sofifaDir).filter(f => f.endsWith('.json') && f !== 'summary.json');
  for (const file of files) {
    const lid = file.replace('.json', '');
    if (LEAGUE_MAP[lid] && !SKIP.has(lid)) {
      allData[lid] = JSON.parse(readFileSync(join(sofifaDir, file), 'utf-8'));
    }
  }

  let totalTeams = 0, totalPlayers = 0, successCount = 0;
  const allLeagueIds = [];

  const order = ['53','54','13','31','19','16','10','308','14','4','68','50','32','20','17','189','80','63','1','317','319','7','353','350','39','336','335','337','338','2017','2018','2019','2020'];
  const sortedIds = Object.keys(allData).sort((a, b) => order.indexOf(a) - order.indexOf(b));

  for (const lid of sortedIds) {
    const mapping = LEAGUE_MAP[lid];
    const players = allData[lid];
    if (!players || players.length === 0) continue;

    process.stdout.write(`  📋 ${mapping.name} (${mapping.country})...`);
    try {
      const teams = groupByTeam(players);
      const result = await uploadLeague(mapping.id, teams, mapping);

      // Save to public/data/ too
      writeFileSync(join(dataDir, `${mapping.id}.json`), JSON.stringify(teams, null, 2), 'utf-8');

      console.log(` ✅ ${result.teams} teams, ${result.players} players`);
      totalTeams += result.teams;
      totalPlayers += result.players;
      successCount++;
      allLeagueIds.push(mapping.id);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }

  // STEP 3: Re-upload primera-rfef and segunda-rfef from existing data
  console.log('\n  📋 Re-uploading Primera RFEF & Segunda RFEF...');
  for (const [file, leagueId, name] of [
    ['primera-rfef.json', 'primera-rfef', 'Primera Federación'],
    ['segunda-rfef.json', 'segunda-rfef', 'Segunda Federación'],
  ]) {
    const path = join(dataDir, file);
    if (!existsSync(path)) { console.log(`  ⚠️ ${file} not found`); continue; }
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      const teams = raw.allTeams || raw;
      if (!Array.isArray(teams)) { console.log(`  ⚠️ ${file} not array`); continue; }

      await setDoc(doc(db, 'leagues', leagueId), {
        name, country: 'España', teamCount: teams.length,
        playerCount: teams.reduce((s, t) => s + (t.players?.length || 0), 0),
        source: 'Transfermarkt', updatedAt: new Date().toISOString()
      });

      const BATCH_SIZE = 400;
      for (let i = 0; i < teams.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        for (const team of teams.slice(i, i + BATCH_SIZE)) {
          const teamId = team.id || toSlug(team.name);
          batch.set(doc(db, 'teams', teamId), {
            ...team, id: teamId, league: leagueId,
            playerCount: team.players?.length || 0,
            avgOverall: team.players?.length
              ? Math.round(team.players.reduce((s, p) => s + (p.overall || p.rating || 65), 0) / team.players.length)
              : 0,
            updatedAt: new Date().toISOString()
          });
        }
        await batch.commit();
      }
      console.log(`  ✅ ${leagueId}: ${teams.length} teams`);
      allLeagueIds.push(leagueId);
    } catch (e) {
      console.log(`  ❌ ${leagueId}: ${e.message}`);
    }
  }

  // Update metadata
  await setDoc(doc(db, 'metadata', 'stats'), {
    version: '2025-26',
    source: 'SoFIFA EA FC 26',
    lastUpdated: new Date().toISOString(),
    leagues: allLeagueIds
  });

  console.log(`\n✅ DONE! ${successCount} leagues, ${totalTeams} teams, ${totalPlayers} players.`);

  // Verify
  console.log('\n--- VERIFICATION ---');
  const laliga = JSON.parse(readFileSync(join(dataDir, 'laliga.json'), 'utf-8'));
  console.log(`LaLiga: ${laliga.length} teams`);
  laliga.forEach(t => console.log(`  ${t.id} | ${t.name} | ${t.players.length}p | avg ${Math.round(t.players.reduce((s,p)=>s+p.overall,0)/t.players.length)}`));

  const rm = laliga.find(t => t.name.includes('Real Madrid'));
  if (rm) {
    console.log(`\nReal Madrid top players:`);
    rm.players.slice(0, 5).forEach(p =>
      console.log(`  ${p.name}: OVR ${p.overall} | €${(p.value/1e6).toFixed(1)}M`)
    );
  }
  const betis = laliga.find(t => t.name.includes('Betis'));
  if (betis) {
    const isco = betis.players.find(p => p.name.includes('Isco'));
    if (isco) console.log(`\nIsco: OVR ${isco.overall} | €${(isco.value/1e6).toFixed(1)}M`);
  }

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
