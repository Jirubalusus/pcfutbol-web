/**
 * Update edition pack via Firebase REST API using ID token from anonymous auth
 * This bypasses the client SDK's gRPC issues
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync, writeFileSync } from 'fs';
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
  'greekSuperLeague','czechLeague','croatianLeague','colombiaPrimera','chilePrimera',
  'uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'
];

async function main() {
  console.log('📖 Reading existing edition...');
  const snap = await getDoc(doc(db, 'editions', EDITION_ID));
  const edition = snap.data();
  console.log(`   Current: ${Object.keys(edition.teams).length} teams\n`);

  // Build all new entries
  let addedTeams = 0, addedPlayers = 0;

  for (const league of LEAGUES) {
    const scrapedTeams = JSON.parse(readFileSync(join(scrapedDir, league + '.json'), 'utf-8'));
    const fictionalTeams = JSON.parse(readFileSync(join(publicDataDir, league + '.json'), 'utf-8'));

    for (let i = 0; i < fictionalTeams.length && i < scrapedTeams.length; i++) {
      const fictional = fictionalTeams[i];
      const real = scrapedTeams[i];
      
      const teamEntry = {};
      if (fictional.name !== real.name) teamEntry.name = real.name;

      const playerMap = {};
      for (let j = 0; j < fictional.players.length && j < real.players.length; j++) {
        if (fictional.players[j].name !== real.players[j].name) {
          playerMap[fictional.players[j].name] = real.players[j].name;
        }
      }
      if (Object.keys(playerMap).length > 0) teamEntry.players = playerMap;

      if (Object.keys(teamEntry).length > 0) {
        edition.teams[fictional.name] = teamEntry;
        addedTeams++;
        addedPlayers += Object.keys(playerMap).length;
      }
    }
    console.log(`  ⚽ ${league}: processed`);
  }

  // Update counts
  edition.teamCount = Object.keys(edition.teams).length;
  edition.playerCount = Object.values(edition.teams).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
  edition.updatedAt = new Date().toISOString();

  console.log(`\n📊 Final: ${edition.teamCount} teams, ${edition.playerCount} players`);
  console.log(`   JSON size: ${JSON.stringify(edition).length} bytes`);

  // Save locally for manual upload if needed
  const outputPath = join(projectRoot, 'edition-final.json');
  writeFileSync(outputPath, JSON.stringify(edition, null, 2), 'utf-8');
  console.log(`\n💾 Saved to ${outputPath}`);

  // Try REST API upload
  const projectId = firebaseConfig.projectId;
  const docPath = `editions/${EDITION_ID}`;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;

  // Convert to Firestore REST format
  function toFirestoreValue(val) {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (typeof val === 'object') {
      const fields = {};
      for (const [k, v] of Object.entries(val)) {
        fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  const firestoreDoc = { fields: {} };
  for (const [k, v] of Object.entries(edition)) {
    firestoreDoc.fields[k] = toFirestoreValue(v);
  }

  console.log('\n📤 Uploading via REST API...');
  console.log(`   Payload size: ${JSON.stringify(firestoreDoc).length} bytes`);

  try {
    const resp = await fetch(`${url}?key=${firebaseConfig.apiKey}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreDoc)
    });

    if (resp.ok) {
      console.log('✅ Upload successful!');
    } else {
      const err = await resp.json();
      console.log(`❌ REST API error: ${resp.status}`, JSON.stringify(err.error?.message || err).substring(0, 500));
    }
  } catch (e) {
    console.log('❌ Fetch error:', e.message);
  }

  process.exit(0);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
