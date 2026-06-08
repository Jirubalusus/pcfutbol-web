// Loads the World Cup Draft database. Three resilient tiers, tried in order:
//   1. Firestore — primary source (one slim doc per edition + a `teams`
//      subcollection per edition, well under the 1 MiB document limit).
//   2. Bundled public JSON — the full offline/rules-failure fallback. Fetched
//      with `cache: 'no-store'` + a cache-busting query so a stale mobile HTTP
//      cache (which may hold the SPA HTML shell from an older deploy under the
//      data URL) can never poison this read.
//   3. Embedded emergency subset — a tiny, real curated dataset shipped inside
//      the app bundle, used only as a last resort so the setup screen can ALWAYS
//      start a draft instead of dead-ending on a red error.
// `loadWorldCupDraftDatabase` throws only if all three fail.
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  WORLD_CUP_DRAFT_EDITIONS_COLLECTION,
  WORLD_CUP_DRAFT_TEAMS_SUBCOLLECTION,
  assembleRawFromFirestore,
  normalizeDatabase,
} from './worldCupDraftShape';
import { WORLD_CUP_DRAFT_EMERGENCY_DATABASE } from './worldCupDraftEmergencyData';

const LOCAL_JSON_PATH = 'data/world-cup-draft-database.json';

// Bumped whenever the bundled JSON changes so the cache-busting query always
// reflects the current deploy. Kept in sync with the index.html cache marker.
const DATA_CACHE_VERSION = 'mundial-draft-premium-cards-20260607';

async function loadRawFromFirestore(firestore) {
  const editionsSnap = await getDocs(collection(firestore, WORLD_CUP_DRAFT_EDITIONS_COLLECTION));
  if (editionsSnap.empty) {
    throw new Error('world-cup-draft: no editions in Firestore');
  }

  const editionDocs = editionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const teamDocsByEditionId = new Map();

  await Promise.all(
    editionDocs.map(async (editionDoc) => {
      const teamsSnap = await getDocs(
        collection(
          firestore,
          WORLD_CUP_DRAFT_EDITIONS_COLLECTION,
          editionDoc.id,
          WORLD_CUP_DRAFT_TEAMS_SUBCOLLECTION,
        ),
      );
      teamDocsByEditionId.set(
        editionDoc.id,
        teamsSnap.docs.map((d) => d.data()),
      );
    }),
  );

  return assembleRawFromFirestore(editionDocs, teamDocsByEditionId);
}

async function loadRawFromLocalJson(baseUrl, fetchImpl) {
  // Cache-bust + bypass the HTTP cache entirely. Firebase Hosting serves
  // /data/** with a multi-day max-age, so a client that once cached the SPA
  // HTML shell (or an older JSON) under this URL would otherwise keep getting
  // the stale bytes for days. `no-store` + a versioned query forces a fresh hit.
  const url = `${baseUrl}${LOCAL_JSON_PATH}?v=${DATA_CACHE_VERSION}`;
  let response;
  try {
    response = await fetchImpl(url, { cache: 'no-store' });
  } catch (networkError) {
    // Some environments reject the `cache` option or the network fails outright;
    // retry once without options so a transient/option issue still recovers.
    response = await fetchImpl(url);
  }
  if (!response.ok) {
    throw new Error(`world-cup-draft-database: fallback fetch ${response.status} for ${url}`);
  }
  // Firebase Hosting rewrites every unmatched path to /index.html (HTTP 200).
  // If the fallback JSON was pruned from the deploy, the fetch "succeeds" but
  // returns the SPA shell, so response.json() would blow up with an opaque
  // SyntaxError. Read as text and detect that case explicitly so the failure is
  // diagnosable instead of a generic parse crash.
  const text = await response.text();
  const contentType = response.headers?.get?.('content-type') || 'unknown';
  const trimmed = text.trimStart();
  if (trimmed.startsWith('<')) {
    throw new Error(`world-cup-draft-database: fallback asset missing (got HTML, content-type=${contentType}, ${text.length} bytes from ${url}); ensure the build keeps public/data/world-cup-draft-database.json`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (parseError) {
    throw new Error(`world-cup-draft-database: fallback JSON is not parseable from ${url} (content-type=${contentType}, ${text.length} bytes, ${parseError?.message || parseError})`);
  }
  if (!raw || !Array.isArray(raw.editions) || raw.editions.length === 0) {
    throw new Error(`world-cup-draft-database: fallback JSON from ${url} has no editions`);
  }
  return raw;
}

function buildFromRaw(raw, label) {
  const database = normalizeDatabase(raw);
  if (!database.players.length) {
    throw new Error(`world-cup-draft: ${label} produced no players`);
  }
  return database;
}

// Returns `{ database, source }` where database is the normalized shape the UI
// expects and source is 'firestore' | 'local-json' | 'emergency'. Throws only
// when all three tiers fail — which, since the emergency tier is embedded in the
// bundle, only happens if the embedded data is itself somehow unusable.
export async function loadWorldCupDraftDatabase({
  firestore = db,
  baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/',
  fetchImpl = (typeof fetch !== 'undefined' ? fetch : undefined),
} = {}) {
  const warn = (...args) => { if (typeof console !== 'undefined') console.warn('[WorldCupDraft]', ...args); };

  // Tier 1: Firestore.
  try {
    const database = buildFromRaw(await loadRawFromFirestore(firestore), 'Firestore assembly');
    return { database, source: 'firestore' };
  } catch (firestoreError) {
    warn('Firestore load failed, falling back to bundled JSON:', firestoreError?.message || firestoreError);

    // Tier 2: full bundled JSON.
    if (fetchImpl) {
      try {
        const database = buildFromRaw(await loadRawFromLocalJson(baseUrl, fetchImpl), 'local fallback');
        return { database, source: 'local-json' };
      } catch (localError) {
        warn('Bundled JSON load failed, using embedded emergency dataset:', localError?.message || localError);
      }
    } else {
      warn('No fetch available; using embedded emergency dataset.');
    }

    // Tier 3: embedded emergency subset. Last resort — always present in the
    // bundle so setup can start. If even this fails the data is broken at build
    // time, so surface the original Firestore error with full context.
    try {
      const database = buildFromRaw(WORLD_CUP_DRAFT_EMERGENCY_DATABASE, 'embedded emergency dataset');
      return { database, source: 'emergency' };
    } catch (emergencyError) {
      if (typeof console !== 'undefined') {
        console.error('[WorldCupDraft] All data sources failed (Firestore + bundled JSON + embedded emergency).', {
          firestore: firestoreError?.message || String(firestoreError),
          emergency: emergencyError?.message || String(emergencyError),
        });
      }
      throw emergencyError;
    }
  }
}
