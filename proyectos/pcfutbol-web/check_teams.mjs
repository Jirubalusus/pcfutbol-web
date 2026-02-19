import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyBIpJz1ZoZx_roIne3oc0yArVzeo4kDmvw',
  projectId: 'pcfutbol-web'
});
const db = getFirestore(app);

const leagues = ['greekSuperLeague','czechLeague','croatianLeague','chilePrimera','uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera','colombiaPrimera'];

for (const league of leagues) {
  const q = query(collection(db, 'teams_v2'), where('league', '==', league));
  const snap = await getDocs(q);
  console.log(`\n=== ${league}: ${snap.size} teams ===`);
  snap.forEach(doc => {
    const d = doc.data();
    console.log(`  ${d.name} (${d.shortName}) - rep:${d.reputation} budget:${d.budget}`);
    if (snap.size <= 2) {
      // Print full first team as format reference
      console.log(JSON.stringify(d, null, 2).substring(0, 3000));
    }
  });
}

// Print one full team for format reference
const q2 = query(collection(db, 'teams_v2'), where('league', '==', 'greekSuperLeague'));
const snap2 = await getDocs(q2);
const firstDoc = snap2.docs[0];
if (firstDoc) {
  const d = firstDoc.data();
  console.log('\n=== FULL FORMAT REFERENCE ===');
  const sample = { ...d, players: d.players ? [d.players[0], d.players[1]] : [] };
  console.log(JSON.stringify(sample, null, 2));
}

process.exit(0);
