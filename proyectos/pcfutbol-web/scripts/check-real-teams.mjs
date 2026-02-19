import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.mjs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const leagues = ['greekSuperLeague','czechLeague','croatianLeague','colombiaPrimera','chilePrimera','uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'];

for (const lid of leagues) {
  const q = query(collection(db, 'teams'), where('league', '==', lid));
  const snap = await getDocs(q);
  console.log(`${lid}: ${snap.size} teams in 'teams' collection`);
  if (snap.size > 0) {
    const t = snap.docs[0].data();
    console.log(`  Sample: ${t.name} - ${t.players?.length || 0} players`);
    if (t.players?.[0]) console.log(`  Player: ${t.players[0].name}`);
  }
}
process.exit(0);
