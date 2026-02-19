/**
 * Fix incomplete player maps in edition pack
 * Retries each team individually
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
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

// Leagues with incomplete players
const INCOMPLETE = ['czechLeague','croatianLeague','colombiaPrimera','chilePrimera','paraguayPrimera','peruLiga1','boliviaPrimera'];

async function main() {
  // Read current edition
  const snap = await getDoc(doc(db, 'editions', EDITION_ID));
  const edition = snap.data();
  
  for (const league of INCOMPLETE) {
    const scrapedTeams = JSON.parse(readFileSync(join(scrapedDir, league + '.json'), 'utf-8'));
    const fictionalTeams = JSON.parse(readFileSync(join(publicDataDir, league + '.json'), 'utf-8'));
    
    let fixed = 0;
    
    for (let i = 0; i < fictionalTeams.length && i < scrapedTeams.length; i++) {
      const fictional = fictionalTeams[i];
      const real = scrapedTeams[i];
      const existing = edition.teams[fictional.name];
      
      const expectedPlayers = Math.min(fictional.players.length, real.players.length);
      const currentPlayers = existing?.players ? Object.keys(existing.players).length : 0;
      
      if (currentPlayers >= expectedPlayers) continue;
      
      // Build full player map for this team
      const playerMap = {};
      for (let j = 0; j < fictional.players.length && j < real.players.length; j++) {
        if (fictional.players[j].name !== real.players[j].name) {
          playerMap[fictional.players[j].name] = real.players[j].name;
        }
      }
      
      // Update just this team's entry
      const teamEntry = { ...(existing || {}) };
      if (fictional.name !== real.name) teamEntry.name = real.name;
      if (Object.keys(playerMap).length > 0) teamEntry.players = playerMap;
      
      try {
        const update = {};
        update[`teams.${fictional.name}`] = teamEntry;
        await updateDoc(doc(db, 'editions', EDITION_ID), update);
        fixed++;
        process.stdout.write('.');
      } catch (e) {
        process.stdout.write('X');
        // Wait and retry once
        await new Promise(r => setTimeout(r, 2000));
        try {
          const update = {};
          update[`teams.${fictional.name}`] = teamEntry;
          await updateDoc(doc(db, 'editions', EDITION_ID), update);
          fixed++;
          process.stdout.write('+');
        } catch (e2) {
          process.stdout.write('!');
        }
      }
    }
    
    console.log(`\n  ${league}: fixed ${fixed} teams`);
  }
  
  // Update counts
  const finalSnap = await getDoc(doc(db, 'editions', EDITION_ID));
  const finalData = finalSnap.data();
  const teamCount = Object.keys(finalData.teams).length;
  const playerCount = Object.values(finalData.teams).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
  
  try {
    await updateDoc(doc(db, 'editions', EDITION_ID), { teamCount, playerCount, updatedAt: new Date().toISOString() });
    console.log(`\n📊 Final: ${teamCount} teams, ${playerCount} players`);
  } catch (e) {
    console.log(`\n📊 Counts: ${teamCount} teams, ${playerCount} players (failed to update doc)`);
  }
  
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
