import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.mjs';
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
await deleteDoc(doc(db, 'editions', 'competicion_2025_26'));
console.log('✅ Deleted competicion_2025_26');
process.exit(0);
