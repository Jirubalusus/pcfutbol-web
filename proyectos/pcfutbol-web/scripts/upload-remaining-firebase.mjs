/**
 * Upload remaining leagues (Liga MX, J-League) + re-upload fixed Saudi to Firebase teams_v2
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TEAMS_COL = 'teams_v2';
const LEAGUES_COL = 'leagues_v2';

function toSlug(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const LEAGUES_TO_FIX = {
  saudiProLeague: { json: 'saudiProLeague.json', name: 'Arabian League',  country: 'Arabia Saudí' },
  ligaMX:         { json: 'ligamx.json',          name: 'Azteca League',   country: 'México' },
  jLeague:        { json: 'jleague.json',         name: 'Sakura League',   country: 'Japón' },
};

async function uploadLeague(leagueId, teams, meta) {
  const playerCount = teams.reduce((s, t) => s + (t.players?.length || 0), 0);
  await setDoc(doc(db, LEAGUES_COL, leagueId), {
    name: meta.name, country: meta.country,
    teamCount: teams.length, playerCount,
    source: 'PC Gaffer (renamed)', updatedAt: new Date().toISOString()
  });
  
  const BS = 400;
  for (let i = 0; i < teams.length; i += BS) {
    const batch = writeBatch(db);
    for (const team of teams.slice(i, i + BS)) {
      const teamId = team.id || toSlug(team.name);
      const avg = team.players?.length
        ? Math.round(team.players.reduce((s, p) => s + (p.overall || p.rating || 65), 0) / team.players.length)
        : 0;
      batch.set(doc(db, TEAMS_COL, teamId), {
        ...team, id: teamId, league: leagueId,
        playerCount: team.players?.length || 0, avgOverall: avg,
        updatedAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
  return { teams: teams.length, players: playerCount };
}

async function main() {
  console.log('📤 Uploading remaining leagues to teams_v2...\n');
  
  for (const [id, def] of Object.entries(LEAGUES_TO_FIX)) {
    const jsonPath = join(dataDir, def.json);
    if (!existsSync(jsonPath)) { console.log(`  ⚠️ ${def.json} not found`); continue; }
    
    const teams = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    process.stdout.write(`  📋 ${def.name} (${def.country})...`);
    try {
      const r = await uploadLeague(id, teams, def);
      console.log(` ✅ ${r.teams} teams, ${r.players} players`);
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }
  
  console.log('\n✅ Done!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
