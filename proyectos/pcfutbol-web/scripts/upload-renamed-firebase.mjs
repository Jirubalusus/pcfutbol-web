/**
 * Upload RENAMED team data to Firebase — NEW collections (teams_v2, leagues_v2)
 * Does NOT touch original collections (teams, leagues)
 * Reads from public/data/*.json (already renamed with fictional names)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// NEW collection names — keep originals untouched
// ============================================================
const TEAMS_COLLECTION = 'teams_v2';
const LEAGUES_COLLECTION = 'leagues_v2';
const METADATA_DOC = 'stats_v2';

// ============================================================
// League definitions with renamed display names
// Matches the LEAGUES object in teamsFirestore.js
// ============================================================
const LEAGUE_DEFS = {
  laliga:             { json: 'laliga.json',             name: 'Liga Ibérica',          country: 'España' },
  laliga2:            { json: 'laliga2.json',            name: 'Segunda Ibérica',       country: 'España' },
  'primera-rfef':     { json: 'primera-rfef.json',       name: 'Primera Federación',    country: 'España' },
  'segunda-rfef':     { json: 'segunda-rfef.json',       name: 'Segunda Federación',    country: 'España' },
  premier:            { json: 'premier.json',            name: 'First League',           country: 'Inglaterra' },
  seriea:             { json: 'seriea.json',             name: 'Calcio League',          country: 'Italia' },
  bundesliga:         { json: 'bundesliga.json',         name: 'Erste Liga',             country: 'Alemania' },
  ligue1:             { json: 'ligue1.json',             name: 'Division Première',      country: 'Francia' },
  eredivisie:         { json: 'eredivisie.json',         name: 'Dutch First',            country: 'Países Bajos' },
  primeiraLiga:       { json: 'primeiraLiga.json',       name: 'Liga Lusitana',          country: 'Portugal' },
  championship:       { json: 'championship.json',       name: 'Second League',          country: 'Inglaterra' },
  belgianPro:         { json: 'belgianPro.json',         name: 'Belgian First',          country: 'Bélgica' },
  superLig:           { json: 'superLig.json',           name: 'Anatolian League',       country: 'Turquía' },
  scottishPrem:       { json: 'scottishPrem.json',       name: 'Highland League',        country: 'Escocia' },
  serieB:             { json: 'serieB.json',             name: 'Calcio B',               country: 'Italia' },
  bundesliga2:        { json: 'bundesliga2.json',        name: 'Zweite Liga',            country: 'Alemania' },
  ligue2:             { json: 'ligue2.json',             name: 'Division Seconde',       country: 'Francia' },
  swissSuperLeague:   { json: 'swissSuperLeague.json',   name: 'Alpine League',          country: 'Suiza' },
  austrianBundesliga: { json: 'austrianBundesliga.json', name: 'Erste Liga (AT)',        country: 'Austria' },
  greekSuperLeague:   { json: 'greekSuperLeague.json',   name: 'Super League',           country: 'Grecia' },
  danishSuperliga:    { json: 'danishSuperliga.json',    name: 'Superligaen',            country: 'Dinamarca' },
  croatianLeague:     { json: 'croatianLeague.json',     name: 'HNL',                    country: 'Croacia' },
  czechLeague:        { json: 'czechLeague.json',        name: 'Chance Liga',            country: 'Chequia' },
  // South America
  argentinaPrimera:   { json: 'argentinaPrimera.json',   name: 'Liga Profesional',       country: 'Argentina' },
  brasileiraoA:       { json: 'brasileiraoA.json',       name: 'Série A',                country: 'Brasil' },
  colombiaPrimera:    { json: 'colombiaPrimera.json',    name: 'Liga BetPlay',           country: 'Colombia' },
  chilePrimera:       { json: 'chilePrimera.json',       name: 'Primera División',       country: 'Chile' },
  uruguayPrimera:     { json: 'uruguayPrimera.json',     name: 'Primera División',       country: 'Uruguay' },
  ecuadorLigaPro:     { json: 'ecuadorLigaPro.json',     name: 'LigaPro',                country: 'Ecuador' },
  paraguayPrimera:    { json: 'paraguayPrimera.json',    name: 'División de Honor',      country: 'Paraguay' },
  peruLiga1:          { json: 'peruLiga1.json',          name: 'Liga 1',                 country: 'Perú' },
  boliviaPrimera:     { json: 'boliviaPrimera.json',     name: 'División Profesional',   country: 'Bolivia' },
  venezuelaPrimera:   { json: 'venezuelaPrimera.json',   name: 'Liga FUTVE',             country: 'Venezuela' },
  // Rest of World (also in Firebase now)
  saudiProLeague:     { json: 'saudiProLeague.json',     name: 'Arabian League',         country: 'Arabia Saudí' },
  mls:                { json: 'mls.json',                name: 'American League',        country: 'Estados Unidos' },
};

// ============================================================
// Helper: extract teams from JSON (handles different structures)
// ============================================================
function extractTeams(jsonPath) {
  if (!existsSync(jsonPath)) return null;
  const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  // RFEF format: { groups: {...}, allTeams: [...] }
  if (raw.allTeams && Array.isArray(raw.allTeams)) {
    return raw.allTeams;
  }
  // Standard format: [team, team, ...]
  if (Array.isArray(raw)) {
    return raw;
  }
  return null;
}

// ============================================================
// Upload a single league
// ============================================================
async function uploadLeague(leagueId, teams, metadata) {
  const playerCount = teams.reduce((s, t) => s + (t.players?.length || 0), 0);
  
  // Write league document
  await setDoc(doc(db, LEAGUES_COLLECTION, leagueId), {
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount,
    source: 'PC Gaffer (renamed)',
    updatedAt: new Date().toISOString()
  });

  // Write team documents in batches
  const BATCH_SIZE = 400;
  for (let i = 0; i < teams.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const team of teams.slice(i, i + BATCH_SIZE)) {
      const teamId = team.id || toSlug(team.name);
      const avgOverall = team.players?.length
        ? Math.round(team.players.reduce((s, p) => s + (p.overall || p.rating || 65), 0) / team.players.length)
        : 0;
      
      batch.set(doc(db, TEAMS_COLLECTION, teamId), {
        ...team,
        id: teamId,
        league: leagueId,
        playerCount: team.players?.length || 0,
        avgOverall,
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
  
  return { teams: teams.length, players: playerCount };
}

function toSlug(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('🏟️  Upload RENAMED data to Firebase (new collections)');
  console.log(`   teams → ${TEAMS_COLLECTION}`);
  console.log(`   leagues → ${LEAGUES_COLLECTION}`);
  console.log('   Original collections are NOT touched.\n');

  let totalTeams = 0, totalPlayers = 0, successCount = 0;
  const allLeagueIds = [];

  for (const [leagueId, def] of Object.entries(LEAGUE_DEFS)) {
    const jsonPath = join(dataDir, def.json);
    const teams = extractTeams(jsonPath);
    
    if (!teams || teams.length === 0) {
      console.log(`  ⚠️  ${leagueId}: no data (${def.json})`);
      continue;
    }

    process.stdout.write(`  📋 ${def.name} (${def.country})...`);
    try {
      const result = await uploadLeague(leagueId, teams, def);
      console.log(` ✅ ${result.teams} teams, ${result.players} players`);
      totalTeams += result.teams;
      totalPlayers += result.players;
      successCount++;
      allLeagueIds.push(leagueId);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }

  // Write metadata
  await setDoc(doc(db, 'metadata', METADATA_DOC), {
    version: '2025-26',
    source: 'PC Gaffer (renamed)',
    lastUpdated: new Date().toISOString(),
    leagues: allLeagueIds
  });

  console.log(`\n✅ DONE! ${successCount} leagues, ${totalTeams} teams, ${totalPlayers} players`);
  console.log(`   Collections: ${TEAMS_COLLECTION}, ${LEAGUES_COLLECTION}`);
  console.log('   Original data preserved in: teams, leagues\n');

  // Quick verification
  console.log('--- VERIFICATION ---');
  const laliga = extractTeams(join(dataDir, 'laliga.json'));
  if (laliga) {
    console.log('LaLiga teams (first 5):');
    laliga.slice(0, 5).forEach(t => console.log(`  ${t.name} — ${t.players?.slice(0, 2).map(p => p.name).join(', ')}...`));
  }

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
