import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const data = JSON.parse(readFileSync(join(root, 'edition-final.json'), 'utf8'));
console.log(`Uploading pack: ${data.name} — ${Object.keys(data.teams).length} teams`);

await setDoc(doc(db, 'editions', 'real_names_2025_26'), {
  name: data.name || 'Competición 2025/2026',
  description: data.description || 'Nombres reales de equipos y jugadores — Temporada 2025/2026',
  author: data.author || 'PC Gaffer',
  version: data.version || 'v1.0',
  status: 'approved',
  season: '2025-2026',
  teams: data.teams,
  teamCount: Object.keys(data.teams).length,
  playerCount: data.playerCount || 20236,
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

console.log('✅ Pack restored to editions/real_names_2025_26');
process.exit(0);
