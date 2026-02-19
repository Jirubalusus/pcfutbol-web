/**
 * Update the existing edition pack (real_names_2025_26) in Firestore
 * Adds mappings for the 11 regenerated leagues: fictional name → real Transfermarkt name
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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

function generateEditionEntries(scrapedTeams, fictionalTeams) {
  const entries = {};
  
  for (let i = 0; i < fictionalTeams.length && i < scrapedTeams.length; i++) {
    const fictional = fictionalTeams[i];
    const real = scrapedTeams[i];
    
    const teamEntry = {};
    
    // Map fictional team name → real team name
    if (fictional.name !== real.name) {
      teamEntry.name = real.name;
    }
    
    // Map fictional stadium → real stadium (if we had it; scraped data doesn't have stadiums)
    // We'll skip stadium mapping since scraped data doesn't include it
    
    // Map fictional player names → real player names
    if (fictional.players && real.players) {
      const playerMap = {};
      const realPlayers = [...real.players]; // copy to track used
      
      for (let j = 0; j < fictional.players.length && j < realPlayers.length; j++) {
        const fp = fictional.players[j];
        const rp = realPlayers[j];
        
        if (fp.name !== rp.name) {
          playerMap[fp.name] = rp.name;
        }
      }
      
      if (Object.keys(playerMap).length > 0) {
        teamEntry.players = playerMap;
      }
    }
    
    if (Object.keys(teamEntry).length > 0) {
      // Key by fictional team name (matches how applyActiveEdition looks up)
      entries[fictional.name] = teamEntry;
    }
  }
  
  return entries;
}

async function main() {
  console.log('📝 Updating edition pack with 11 regenerated leagues...\n');
  
  // Step 1: Read existing edition
  console.log('📖 Reading existing edition pack...');
  const editionSnap = await getDoc(doc(db, 'editions', EDITION_ID));
  if (!editionSnap.exists()) {
    console.error('❌ Edition not found:', EDITION_ID);
    process.exit(1);
  }
  
  const existingEdition = editionSnap.data();
  const existingTeams = existingEdition.teams || {};
  console.log(`   Found: ${Object.keys(existingTeams).length} teams, ${existingEdition.playerCount} players\n`);
  
  // Step 2: Find and remove old entries for the leagues we're regenerating
  // The old entries used different fictional names - we need to identify them
  // by checking which teams in the edition were from these leagues
  // We'll load the old public/data files to find the old fictional names
  
  // Step 3: Generate new entries for each league
  let newEntries = {};
  let totalNewTeams = 0;
  let totalNewPlayers = 0;
  
  for (const league of LEAGUES) {
    const scrapedPath = join(scrapedDir, league.scraped);
    const fictionalPath = join(publicDataDir, league.publicJson);
    
    const scrapedTeams = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
    const fictionalTeams = JSON.parse(readFileSync(fictionalPath, 'utf-8'));
    
    const entries = generateEditionEntries(scrapedTeams, fictionalTeams);
    const playerCount = Object.values(entries).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
    
    console.log(`  ⚽ ${league.scraped}: ${Object.keys(entries).length} teams, ${playerCount} players`);
    
    Object.assign(newEntries, entries);
    totalNewTeams += Object.keys(entries).length;
    totalNewPlayers += playerCount;
  }
  
  console.log(`\n📊 New entries: ${totalNewTeams} teams, ${totalNewPlayers} players`);
  
  // Step 4: Merge with existing edition (add new, keep all existing)
  const mergedTeams = { ...existingTeams, ...newEntries };
  const mergedTeamCount = Object.keys(mergedTeams).length;
  const mergedPlayerCount = Object.values(mergedTeams).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
  
  console.log(`📊 Merged total: ${mergedTeamCount} teams, ${mergedPlayerCount} players`);
  console.log(`   (was: ${Object.keys(existingTeams).length} teams, ${existingEdition.playerCount} players)\n`);
  
  // Step 5: Upload merged edition
  console.log('📤 Uploading merged edition...');
  try {
    await setDoc(doc(db, 'editions', EDITION_ID), {
      ...existingEdition,
      teams: mergedTeams,
      teamCount: mergedTeamCount,
      playerCount: mergedPlayerCount,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Upload error:', err.message || err);
    throw err;
  }
  
  console.log('✅ Edition pack updated successfully!');
  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
