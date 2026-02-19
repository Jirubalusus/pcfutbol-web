import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.mjs';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const snapshot = await getDocs(collection(db, 'editions'));
  for (const d of snapshot.docs) {
    const data = d.data();
    const teamKeys = data.teams ? Object.keys(data.teams) : [];
    console.log(`\nID: ${d.id}`);
    console.log(`Name: ${data.name}`);
    console.log(`Teams: ${teamKeys.length}`);
    console.log(`Sample keys (5):`, teamKeys.slice(0, 5));
    if (teamKeys.length > 0) {
      const sample = data.teams[teamKeys[0]];
      console.log(`Sample team:`, JSON.stringify(sample).substring(0, 500));
    }
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
