/**
 * Offline audit: prove that the sharded Firestore model (one slim edition doc +
 * a teams subcollection per edition) reassembles into EXACTLY the normalized
 * shape the game consumes — without needing a live Firebase connection.
 *
 * It simulates the upload by sharding the local JSON the same way the upload
 * script does (editionToDoc + teamToDoc), then runs the loader's reassembly
 * (assembleRawFromFirestore) and compares the normalized result against the
 * normalized local JSON. It also checks every team doc stays under 1 MiB.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  editionDocId,
  editionToDoc,
  teamToDoc,
  assembleRawFromFirestore,
  normalizeDatabase,
} from '../src/components/WorldCupDraft/worldCupDraftShape.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'public', 'data', 'world-cup-draft-database.json');
const ONE_MIB = 1024 * 1024;

const errors = [];
const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
const editions = Array.isArray(raw.editions) ? raw.editions : [];

// 1) Shard exactly like the upload script.
const editionDocs = [];
const teamDocsByEditionId = new Map();
let maxTeamDocBytes = 0;

for (const edition of editions) {
  const id = editionDocId(edition.year);
  editionDocs.push(editionToDoc(edition));
  const teamDocs = (edition.teams || []).map((team, index) => {
    const teamDoc = teamToDoc(team, id, index);
    const bytes = Buffer.byteLength(JSON.stringify(teamDoc), 'utf-8');
    if (bytes > maxTeamDocBytes) maxTeamDocBytes = bytes;
    if (bytes >= ONE_MIB) {
      errors.push(`Team doc ${team.id} is ${bytes} bytes (>= 1 MiB Firestore limit)`);
    }
    return teamDoc;
  });
  teamDocsByEditionId.set(id, teamDocs);
}

// 2) Reassemble from the simulated Firestore docs and normalize both sides.
const reassembledRaw = assembleRawFromFirestore(editionDocs, teamDocsByEditionId);
const fromLocal = normalizeDatabase(raw);
const fromFirestore = normalizeDatabase(reassembledRaw);

// 3) Counts must match expectations and each other.
if (fromFirestore.editions.length !== 22) {
  errors.push(`Firestore assembly editions=${fromFirestore.editions.length}, expected 22`);
}
if (fromLocal.editions.length !== fromFirestore.editions.length) {
  errors.push(`Edition count mismatch: local=${fromLocal.editions.length} firestore=${fromFirestore.editions.length}`);
}
if (fromFirestore.teams.length !== 489) {
  errors.push(`Firestore assembly teams=${fromFirestore.teams.length}, expected 489`);
}
if (fromLocal.teams.length !== fromFirestore.teams.length) {
  errors.push(`Team count mismatch: local=${fromLocal.teams.length} firestore=${fromFirestore.teams.length}`);
}
if (fromFirestore.players.length !== 10964) {
  errors.push(`Firestore assembly players=${fromFirestore.players.length}, expected 10964`);
}
if (fromLocal.players.length !== fromFirestore.players.length) {
  errors.push(`Player count mismatch: local=${fromLocal.players.length} firestore=${fromFirestore.players.length}`);
}

// 4) Deep-equality of the normalized teams (order + every field) so the sharded
//    round trip is byte-for-byte faithful to the bundled JSON.
const localJson = JSON.stringify(fromLocal.teams);
const firestoreJson = JSON.stringify(fromFirestore.teams);
if (localJson !== firestoreJson) {
  // Find the first diverging team to make the failure actionable.
  for (let i = 0; i < fromLocal.teams.length; i += 1) {
    if (JSON.stringify(fromLocal.teams[i]) !== JSON.stringify(fromFirestore.teams[i])) {
      errors.push(`Team #${i} (${fromLocal.teams[i]?.id}) differs after Firestore round trip`);
      break;
    }
  }
  if (localJson.length !== firestoreJson.length) {
    errors.push(`Normalized team payload differs in size: local=${localJson.length} firestore=${firestoreJson.length}`);
  }
}

if (errors.length) {
  process.stderr.write(`WorldCup draft Firestore assembly audit failed:\n${errors.slice(0, 40).map((e) => `- ${e}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write(
  `WorldCup draft Firestore assembly audit passed: ${fromFirestore.editions.length} editions, ` +
  `${fromFirestore.teams.length} teams, ${fromFirestore.players.length} players; ` +
  `largest team doc ${maxTeamDocBytes} bytes (< 1 MiB).\n`,
);
