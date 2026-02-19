import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'public', 'data');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const LEAGUES = [
  { file: 'greekSuperLeague.json', id: 'greekSuperLeague', name: 'Super League', country: 'Grecia' },
  { file: 'czechLeague.json', id: 'czechLeague', name: 'Chance Liga', country: 'Chequia' },
  { file: 'croatianLeague.json', id: 'croatianLeague', name: 'HNL', country: 'Croacia' },
  { file: 'colombiaPrimera.json', id: 'colombiaPrimera', name: 'Liga BetPlay', country: 'Colombia' },
  { file: 'chilePrimera.json', id: 'chilePrimera', name: 'Primera División', country: 'Chile' },
  { file: 'uruguayPrimera.json', id: 'uruguayPrimera', name: 'Primera División', country: 'Uruguay' },
  { file: 'ecuadorLigaPro.json', id: 'ecuadorLigaPro', name: 'LigaPro', country: 'Ecuador' },
  { file: 'paraguayPrimera.json', id: 'paraguayPrimera', name: 'División de Honor', country: 'Paraguay' },
  { file: 'peruLiga1.json', id: 'peruLiga1', name: 'Liga 1', country: 'Perú' },
  { file: 'boliviaPrimera.json', id: 'boliviaPrimera', name: 'División Profesional', country: 'Bolivia' },
  { file: 'venezuelaPrimera.json', id: 'venezuelaPrimera', name: 'Liga FUTVE', country: 'Venezuela' },
];

async function main() {
  console.log('📤 Uploading 11 leagues to Firestore...\n');

  for (const league of LEAGUES) {
    const filePath = join(dataDir, league.file);
    const teams = JSON.parse(readFileSync(filePath, 'utf8'));

    // Upload teams to teams_v2/{leagueId}
    await setDoc(doc(db, 'teams_v2', league.id), { teams });
    console.log(`✅ teams_v2/${league.id}: ${teams.length} teams`);

    // Upload league metadata to leagues_v2/{leagueId}
    await setDoc(doc(db, 'leagues_v2', league.id), {
      name: league.name,
      country: league.country,
      teamCount: teams.length,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`✅ leagues_v2/${league.id}: metadata`);
  }

  console.log('\n🎉 Done! 11 leagues uploaded.');
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
