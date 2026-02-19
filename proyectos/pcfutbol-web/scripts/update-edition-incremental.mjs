/**
 * Update edition pack incrementally using dot-notation field updates
 * This avoids rewriting the entire document (which may exceed 1MB)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const publicDataDir = join(projectRoot, 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EDITION_ID = 'real_names_2025_26';

const LEAGUES = [
  { scraped: 'greekSuperLeague.json', publicJson: 'greekSuperLeague.json' },
  { scraped: 'czechLeague.json', publicJson: 'czechLeague.json' },
  { scraped: 'croatianLeague.json', publicJson: 'croatianLeague.json' },
  { scraped: 'colombiaPrimera.json', publicJson: 'colombiaPrimera.json' },
  { scraped: 'chilePrimera.json', publicJson: 'chilePrimera.json' },
  { scraped: 'uruguayPrimera.json', publicJson: 'uruguayPrimera.json' },
  { scraped: 'ecuadorLigaPro.json', publicJson: 'ecuadorLigaPro.json' },
  { scraped: 'paraguayPrimera.json', publicJson: 'paraguayPrimera.json' },
  { scraped: 'peruLiga1.json', publicJson: 'peruLiga1.json' },
  { scraped: 'boliviaPrimera.json', publicJson: 'boliviaPrimera.json' },
  { scraped: 'venezuelaPrimera.json', publicJson: 'venezuelaPrimera.json' },
];

async function main() {
  console.log('📝 Updating edition pack incrementally...\n');

  let totalTeams = 0;
  let totalPlayers = 0;

  for (const league of LEAGUES) {
    const scrapedTeams = JSON.parse(readFileSync(join(scrapedDir, league.scraped), 'utf-8'));
    const fictionalTeams = JSON.parse(readFileSync(join(publicDataDir, league.publicJson), 'utf-8'));

    // Build dot-notation updates for this league
    const updates = {};
    let leagueTeams = 0;
    let leaguePlayers = 0;

    for (let i = 0; i < fictionalTeams.length && i < scrapedTeams.length; i++) {
      const fictional = fictionalTeams[i];
      const real = scrapedTeams[i];

      const teamEntry = {};
      if (fictional.name !== real.name) teamEntry.name = real.name;

      // Map players
      if (fictional.players && real.players) {
        const playerMap = {};
        for (let j = 0; j < fictional.players.length && j < real.players.length; j++) {
          if (fictional.players[j].name !== real.players[j].name) {
            playerMap[fictional.players[j].name] = real.players[j].name;
            leaguePlayers++;
          }
        }
        if (Object.keys(playerMap).length > 0) teamEntry.players = playerMap;
      }

      if (Object.keys(teamEntry).length > 0) {
        // Use dot notation: `teams.Fictional Team Name` = { name: "Real", players: {...} }
        const key = `teams.${fictional.name}`;
        updates[key] = teamEntry;
        leagueTeams++;
      }
    }

    // Upload this league's entries
    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(doc(db, 'editions', EDITION_ID), updates);
        console.log(`  ⚽ ${league.scraped}: ✅ ${leagueTeams} teams, ${leaguePlayers} players`);
      } catch (e) {
        console.log(`  ⚽ ${league.scraped}: ❌ ${e.message}`);
      }
    }

    totalTeams += leagueTeams;
    totalPlayers += leaguePlayers;
  }

  // Update counts
  try {
    // Read current to get accurate count
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'editions', EDITION_ID));
    const data = snap.data();
    const teamCount = Object.keys(data.teams || {}).length;
    const playerCount = Object.values(data.teams || {}).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);

    await updateDoc(doc(db, 'editions', EDITION_ID), {
      teamCount,
      playerCount,
      updatedAt: new Date().toISOString()
    });
    console.log(`\n📊 Updated counts: ${teamCount} teams, ${playerCount} players`);
  } catch (e) {
    console.log(`\n⚠️  Count update failed: ${e.message}`);
  }

  console.log(`\n✅ Added ${totalTeams} teams, ${totalPlayers} players to edition pack`);
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
