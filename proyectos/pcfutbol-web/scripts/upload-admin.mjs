/**
 * Upload regenerated leagues to Firestore using Firebase Admin SDK
 * Uses Application Default Credentials (firebase CLI login)
 */

import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

// Initialize with ADC (uses firebase CLI credentials)
admin.initializeApp({ projectId: 'pcfutbol-web' });
const db = admin.firestore();

const TEAMS_COL = 'teams_v2';
const LEAGUES_COL = 'leagues_v2';

// Only the leagues we need to update
const LEAGUES_TO_UPLOAD = {
  greekSuperLeague:   { json: 'greekSuperLeague.json',   name: 'Super League',          country: 'Grecia' },
  czechLeague:        { json: 'czechLeague.json',         name: 'Chance Liga',           country: 'Chequia' },
  croatianLeague:     { json: 'croatianLeague.json',      name: 'HNL',                   country: 'Croacia' },
  colombiaPrimera:    { json: 'colombiaPrimera.json',     name: 'Liga BetPlay',          country: 'Colombia' },
  chilePrimera:       { json: 'chilePrimera.json',        name: 'Primera División',      country: 'Chile' },
  uruguayPrimera:     { json: 'uruguayPrimera.json',      name: 'Primera División',      country: 'Uruguay' },
  ecuadorLigaPro:     { json: 'ecuadorLigaPro.json',      name: 'LigaPro',               country: 'Ecuador' },
  paraguayPrimera:    { json: 'paraguayPrimera.json',     name: 'División de Honor',     country: 'Paraguay' },
  peruLiga1:          { json: 'peruLiga1.json',           name: 'Liga 1',                country: 'Perú' },
  boliviaPrimera:     { json: 'boliviaPrimera.json',      name: 'División Profesional',  country: 'Bolivia' },
  venezuelaPrimera:   { json: 'venezuelaPrimera.json',    name: 'Liga FUTVE',            country: 'Venezuela' },
};

function toSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function uploadLeague(leagueId, teams, metadata) {
  const playerCount = teams.reduce((s, t) => s + (t.players?.length || 0), 0);

  // Write league doc
  await db.collection(LEAGUES_COL).doc(leagueId).set({
    name: metadata.name,
    country: metadata.country,
    teamCount: teams.length,
    playerCount,
    source: 'PC Gaffer (renamed)',
    updatedAt: new Date().toISOString()
  });

  // Write teams in batches of 400
  for (let i = 0; i < teams.length; i += 400) {
    const batch = db.batch();
    for (const team of teams.slice(i, i + 400)) {
      const teamId = team.id || toSlug(team.name);
      const avgOverall = team.avgOverall || (team.players?.length
        ? Math.round(team.players.reduce((s, p) => s + (p.overall || 65), 0) / team.players.length)
        : 0);

      batch.set(db.collection(TEAMS_COL).doc(teamId), {
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

async function main() {
  console.log('🏟️  Uploading regenerated leagues to Firestore (Admin SDK)\n');

  let totalTeams = 0, totalPlayers = 0, success = 0;

  for (const [leagueId, def] of Object.entries(LEAGUES_TO_UPLOAD)) {
    const jsonPath = join(dataDir, def.json);
    if (!existsSync(jsonPath)) {
      console.log(`  ⚠️  ${leagueId}: ${def.json} not found`);
      continue;
    }

    const teams = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    if (!Array.isArray(teams) || teams.length === 0) {
      console.log(`  ⚠️  ${leagueId}: empty data`);
      continue;
    }

    process.stdout.write(`  ⚽ ${def.name} (${def.country})...`);
    try {
      const r = await uploadLeague(leagueId, teams, def);
      console.log(` ✅ ${r.teams} teams, ${r.players} players`);
      totalTeams += r.teams;
      totalPlayers += r.players;
      success++;
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }

  console.log(`\n✅ Done! ${success}/${Object.keys(LEAGUES_TO_UPLOAD).length} leagues: ${totalTeams} teams, ${totalPlayers} players`);
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
