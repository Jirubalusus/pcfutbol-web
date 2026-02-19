/**
 * Update edition pack using Firebase client SDK with anonymous authentication
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const scrapedDir = join(projectRoot, 'scraped-data', '2025-26');
const publicDataDir = join(projectRoot, 'public', 'data');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const EDITION_ID = 'real_names_2025_26';

const LEAGUES = [
  'greekSuperLeague','czechLeague','croatianLeague','colombiaPrimera','chilePrimera',
  'uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'
];

async function main() {
  // Sign in anonymously
  console.log('🔑 Signing in anonymously...');
  try {
    const cred = await signInAnonymously(auth);
    console.log('   Signed in as:', cred.user.uid);
  } catch (e) {
    console.log('   Anonymous auth failed:', e.message);
    console.log('   Proceeding without auth...');
  }

  console.log('\n📖 Reading existing edition...');
  const snap = await getDoc(doc(db, 'editions', EDITION_ID));
  const edition = snap.data();
  console.log(`   Current: ${Object.keys(edition.teams).length} teams, ${edition.playerCount} players`);

  // Build all entries
  for (const league of LEAGUES) {
    const scrapedTeams = JSON.parse(readFileSync(join(scrapedDir, league + '.json'), 'utf-8'));
    const fictionalTeams = JSON.parse(readFileSync(join(publicDataDir, league + '.json'), 'utf-8'));

    let count = 0;
    for (let i = 0; i < fictionalTeams.length && i < scrapedTeams.length; i++) {
      const fictional = fictionalTeams[i];
      const real = scrapedTeams[i];
      const teamEntry = {};
      if (fictional.name !== real.name) teamEntry.name = real.name;
      const playerMap = {};
      for (let j = 0; j < fictional.players.length && j < real.players.length; j++) {
        if (fictional.players[j].name !== real.players[j].name)
          playerMap[fictional.players[j].name] = real.players[j].name;
      }
      if (Object.keys(playerMap).length > 0) teamEntry.players = playerMap;
      if (Object.keys(teamEntry).length > 0) {
        edition.teams[fictional.name] = teamEntry;
        count++;
      }
    }
    console.log(`  ⚽ ${league}: ${count} teams`);
  }

  edition.teamCount = Object.keys(edition.teams).length;
  edition.playerCount = Object.values(edition.teams).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
  edition.updatedAt = new Date().toISOString();

  console.log(`\n📊 Final: ${edition.teamCount} teams, ${edition.playerCount} players`);

  console.log('📤 Uploading...');
  try {
    await setDoc(doc(db, 'editions', EDITION_ID), edition);
    console.log('✅ Success!');
  } catch (e) {
    console.log('❌ Error:', e.code, e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
