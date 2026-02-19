import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const snap = await getDoc(doc(db, 'editions', 'real_names_2025_26'));
const data = snap.data();
const json = JSON.stringify(data);
console.log('JSON size:', json.length, 'bytes');
console.log('Teams:', Object.keys(data.teams).length);
const playerCount = Object.values(data.teams).reduce((s, e) => s + (e.players ? Object.keys(e.players).length : 0), 0);
console.log('Players:', playerCount);

// Check which of our leagues are already in
const publicData = join(__dirname, '..', 'public', 'data');
const leagues = ['greekSuperLeague','czechLeague','croatianLeague','colombiaPrimera','chilePrimera','uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'];
const fs = await import('fs');
for (const l of leagues) {
  const fictional = JSON.parse(fs.readFileSync(join(publicData, l + '.json'), 'utf8'));
  let found = 0;
  for (const t of fictional) {
    if (data.teams[t.name]) found++;
  }
  console.log(`  ${l}: ${found}/${fictional.length} teams already in edition`);
}

// Save updated dump
writeFileSync(join(__dirname, '..', 'edition-dump-current.json'), json, 'utf-8');
process.exit(0);
