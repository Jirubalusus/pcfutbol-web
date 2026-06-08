/**
 * Upload the World Cup Draft database to Firestore using the Firebase CLI
 * OAuth token. No secrets are embedded; credentials come from `firebase login`.
 *
 * Model (sharded to stay well under Firestore's 1 MiB document limit):
 *   world_cup_draft_editions/{worldcup-YEAR}            -> slim edition metadata (no teams/players)
 *   world_cup_draft_editions/{worldcup-YEAR}/teams/{id} -> one team + its players (~19 KB max)
 *   metadata/world_cup_draft                            -> counts, version, source, updatedAt
 *
 * Idempotent: every write is an update keyed by a stable document path.
 *
 * Usage:
 *   npm run upload:worldcup-draft:firebase
 *   (requires `firebase login` with Firestore write access to project pcfutbol-web)
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORLD_CUP_DRAFT_EDITIONS_COLLECTION,
  WORLD_CUP_DRAFT_TEAMS_SUBCOLLECTION,
  WORLD_CUP_DRAFT_METADATA_DOC,
  editionDocId,
  editionToDoc,
  teamToDoc,
} from '../../src/components/WorldCupDraft/worldCupDraftShape.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', '..', 'public', 'data', 'world-cup-draft-database.json');
const PROJECT_ID = 'pcfutbol-web';
const DATABASE_ID = '(default)';
const METADATA_COLLECTION = 'metadata';
const BATCH_LIMIT = 80; // safely under Firestore write-count and 10 MiB REST payload limits

function getFirebaseCliAccessToken() {
  const candidates = [
    'configstore',
    '/mnt/c/Users/Pablo/AppData/Roaming/npm/node_modules/firebase-tools/node_modules/configstore',
  ];

  for (const candidate of candidates) {
    try {
      const Configstore = require(candidate);
      const config = new Configstore('firebase-tools');
      const token = config.get('tokens.access_token');
      if (token) return token;
    } catch {
      // Try the next configstore location.
    }
  }

  throw new Error('No Firebase CLI access token found. Run `firebase login` first.');
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) {
    return value.length
      ? { arrayValue: { values: value.map(toFirestoreValue) } }
      : { arrayValue: {} };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      fields[key] = toFirestoreValue(nestedValue);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function toFirestoreFields(data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function documentName(docPath) {
  return `projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${docPath}`;
}

async function commitInBatches(writes, accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents:commit`;
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const chunk = writes.slice(i, i + BATCH_LIMIT);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        writes: chunk.map(({ path, data }) => ({
          update: {
            name: documentName(path),
            fields: toFirestoreFields(data),
          },
        })),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Firestore commit failed (${response.status}) for writes ${i + 1}-${i + chunk.length}: ${text.slice(0, 600)}`);
    }
    console.log(`  ✅ Committed writes ${i + 1}-${i + chunk.length}`);
  }
}

async function main() {
  console.log('🌍 Uploading World Cup Draft database to Firestore (Firebase CLI OAuth)\n');

  const accessToken = getFirebaseCliAccessToken();
  const raw = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const editions = Array.isArray(raw.editions) ? raw.editions : [];
  if (editions.length === 0) {
    throw new Error('No editions found in world-cup-draft-database.json');
  }

  const writes = [];
  let teamCount = 0;
  let playerCount = 0;

  for (const edition of editions) {
    const id = editionDocId(edition.year);
    writes.push({
      path: `${WORLD_CUP_DRAFT_EDITIONS_COLLECTION}/${id}`,
      data: editionToDoc(edition),
    });

    const teams = Array.isArray(edition.teams) ? edition.teams : [];
    teams.forEach((team, index) => {
      if (!team.id || team.id.includes('/')) {
        throw new Error(`Invalid team id for Firestore document path: ${team.id || '(missing)'}`);
      }
      teamCount += 1;
      playerCount += team.players?.length || 0;
      writes.push({
        path: `${WORLD_CUP_DRAFT_EDITIONS_COLLECTION}/${id}/${WORLD_CUP_DRAFT_TEAMS_SUBCOLLECTION}/${team.id}`,
        data: teamToDoc(team, id, index),
      });
    });
  }

  // Metadata doc last so its counts reflect a fully-prepared upload.
  writes.push({
    path: `${METADATA_COLLECTION}/${WORLD_CUP_DRAFT_METADATA_DOC}`,
    data: {
      version: 1,
      source: 'public/data/world-cup-draft-database.json',
      editions: editions.length,
      teams: teamCount,
      players: playerCount,
      updatedAt: new Date().toISOString(),
    },
  });

  console.log(`  Preparing ${writes.length} writes: ${editions.length} editions, ${teamCount} teams, ${playerCount} players`);
  await commitInBatches(writes, accessToken);

  console.log(`\n✅ Done. Uploaded ${editions.length} editions, ${teamCount} teams, ${playerCount} players.`);
  console.log(`   metadata/${WORLD_CUP_DRAFT_METADATA_DOC} updated.`);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err.message || err);
  process.exit(1);
});
