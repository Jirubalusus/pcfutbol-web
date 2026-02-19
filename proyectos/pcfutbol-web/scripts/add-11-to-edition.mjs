/**
 * Add 11 new leagues' real names to the existing edition pack "real_names_2025_26"
 * Maps fictional names (from public/data/) → real names (from scraped-data/2025-26/)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from './firebase-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataDir = join(root, 'public', 'data');
const scrapedDir = join(root, 'scraped-data', '2025-26');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const LEAGUES = [
  { fictional: 'greekSuperLeague.json', scraped: 'greekSuperLeague.json' },
  { fictional: 'czechLeague.json', scraped: 'czechLeague.json' },
  { fictional: 'croatianLeague.json', scraped: 'croatianLeague.json' },
  { fictional: 'colombiaPrimera.json', scraped: 'colombiaPrimera.json' },
  { fictional: 'chilePrimera.json', scraped: 'chilePrimera.json' },
  { fictional: 'uruguayPrimera.json', scraped: 'uruguayPrimera.json' },
  { fictional: 'ecuadorLigaPro.json', scraped: 'ecuadorLigaPro.json' },
  { fictional: 'paraguayPrimera.json', scraped: 'paraguayPrimera.json' },
  { fictional: 'peruLiga1.json', scraped: 'peruLiga1.json' },
  { fictional: 'boliviaPrimera.json', scraped: 'boliviaPrimera.json' },
  { fictional: 'venezuelaPrimera.json', scraped: 'venezuelaPrimera.json' },
];

// Map TM positions to game positions
const POS_MAP = {
  'Portero': 'GK', 'Defensa central': 'CB', 'Lateral izquierdo': 'LB',
  'Lateral derecho': 'RB', 'Pivote': 'CDM', 'Mediocentro': 'CM',
  'Mediapunta': 'CAM', 'Interior izquierdo': 'CM', 'Interior derecho': 'CM',
  'Extremo izquierdo': 'LW', 'Extremo derecho': 'RW',
  'Delantero centro': 'ST', 'Mediapunta': 'CAM',
  'Media punta': 'CAM', 'Medio centro': 'CM',
};

function normalizePos(raw) {
  return POS_MAP[raw] || raw;
}

function posGroup(pos) {
  if (['GK', 'POR'].includes(pos)) return 'GK';
  if (['CB', 'DFC', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'MCD', 'MC', 'MCO', 'LM', 'RM', 'MI', 'MD'].includes(pos)) return 'MID';
  return 'FWD';
}

async function main() {
  console.log('📖 Reading existing edition pack...');
  const edRef = doc(db, 'editions', 'real_names_2025_26');
  const snap = await getDoc(edRef);
  if (!snap.exists()) {
    console.error('❌ Pack real_names_2025_26 not found!');
    process.exit(1);
  }
  const edition = snap.data();
  const teams = edition.teams || {};
  const existingCount = Object.keys(teams).length;
  console.log(`📦 Existing pack has ${existingCount} teams`);

  let addedTeams = 0;
  let addedPlayers = 0;

  for (const league of LEAGUES) {
    const fictionalPath = join(dataDir, league.fictional);
    const scrapedPath = join(scrapedDir, league.scraped);

    const fictionalTeams = JSON.parse(readFileSync(fictionalPath, 'utf8'));
    const scrapedTeams = JSON.parse(readFileSync(scrapedPath, 'utf8'));

    const count = Math.min(fictionalTeams.length, scrapedTeams.length);
    console.log(`\n🔄 ${league.fictional}: ${count} teams to map`);

    for (let i = 0; i < count; i++) {
      const ft = fictionalTeams[i];
      const st = scrapedTeams[i];
      const fictName = ft.name;
      const realName = st.name;

      // Map players by position group + index within group
      const playerMap = {};
      if (ft.players && st.players) {
        // Group fictional players by position
        const fGroups = {};
        for (const p of ft.players) {
          const g = posGroup(p.position);
          if (!fGroups[g]) fGroups[g] = [];
          fGroups[g].push(p);
        }
        // Group real players by position
        const rGroups = {};
        for (const p of st.players) {
          const g = posGroup(normalizePos(p.positionRaw || p.position));
          if (!rGroups[g]) rGroups[g] = [];
          rGroups[g].push(p);
        }
        // Match within each group
        for (const g of ['GK', 'DEF', 'MID', 'FWD']) {
          const fList = fGroups[g] || [];
          const rList = rGroups[g] || [];
          for (let j = 0; j < fList.length && j < rList.length; j++) {
            playerMap[fList[j].name] = rList[j].name;
            addedPlayers++;
          }
        }
      }

      teams[fictName] = {
        name: realName,
        players: playerMap
      };
      addedTeams++;
    }
  }

  console.log(`\n📤 Uploading updated pack: ${Object.keys(teams).length} total teams (+${addedTeams} new)`);
  console.log(`   ${addedPlayers} player mappings added`);

  await setDoc(edRef, {
    ...edition,
    teams,
    teamCount: Object.keys(teams).length,
    updatedAt: new Date().toISOString()
  });

  console.log('✅ Done!');
  process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
