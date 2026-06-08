// Local (offline / trial) career persistence.
//
// Trial visitors play Carrera without a Firebase account, so they have no UID and
// nothing to write to Firestore. Before this module their progress lived only in
// React memory and vanished on refresh — the "no se guardan las partidas" report.
//
// This module persists the active career to localStorage with a STABLE key (never
// a transient/undefined UID), so:
//   - a no-login (trial) game survives refreshes and shows up in "Continuar".
//   - an authenticated game gets a synchronous on-device backup that survives even
//     when the async Firestore write is dropped on tab close (best-effort safety net).
//
// It is intentionally browser-safe AND Node-testable: all storage access goes
// through getStore(), which returns globalThis.localStorage when present and null
// otherwise, so audits can inject a mock store.

export const SCHEMA_VERSION = 1;
// Stable trial key — shared across trial sessions on this device (no UID involved).
export const TRIAL_KEY = 'pcfutbol_local_career_v1';
// Authenticated on-device backups are namespaced per-UID so accounts never collide.
export const BACKUP_PREFIX = 'pcfutbol_career_backup_';

function getStore() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Access to localStorage can throw in sandboxed iframes / disabled storage.
  }
  return null;
}

function storageKey(uid) {
  return uid ? `${BACKUP_PREFIX}${uid}` : TRIAL_KEY;
}

function isQuotaError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

// Mirror the cloud strip (careerSaveService): drop heavy, fully reconstructible
// data so we stay well under the ~5MB localStorage quota and reuse the exact same
// load-time reconstruction (otherLeagues, leagueTeams, cup) the cloud path relies
// on. Keeping the SAME shape as a cloud save means LOAD_SAVE handles both identically.
export function stripForLocalSave(gameState) {
  const data = { ...gameState };
  delete data.loaded;
  delete data.leagueTeams;
  delete data.otherLeagues;
  // Keep the active European competition state so a refresh can restore the
  // competition tab instead of rebuilding it from scratch.
  delete data.saCompetitions;
  delete data.cupCompetition;
  delete data.playerMarket;
  delete data.freeAgents;
  // Transient cloud-user handles must never be persisted into a local save.
  delete data._contrarrelojUserId;
  delete data._proManagerUserId;
  delete data._gloryUserId;
  if (Array.isArray(data.fixtures)) {
    data.fixtures = data.fixtures.filter(f => !f.played);
  }
  if (Array.isArray(data.results) && data.results.length > 0) {
    data.results = data.results.map(r => ({
      week: r.week,
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      played: r.played,
    }));
  }
  return data;
}

// Metadata needed by the "Continuar" card so a save shows up after refresh
// without having to deserialize the whole campaign.
export function buildLocalSummary(gameState) {
  return {
    teamName: gameState.team?.name || 'Equipo',
    teamId: gameState.teamId ?? null,
    season: gameState.currentSeason || 1,
    week: gameState.currentWeek || 1,
    money: gameState.money || 0,
    databaseSeasonId: gameState.databaseSeasonId || 'current',
  };
}

// Persist the active career. Returns { ok, reason?, error? } — callers surface
// real failures (quota/serialize) to the user instead of swallowing them.
//   reason: 'unavailable' (no storage — not an error to report)
//         | 'serialize'   (state had a circular ref / non-serializable value)
//         | 'quota'       (localStorage full)
//         | 'write'       (other write failure, e.g. private mode)
export function saveLocalCareer(gameState, { uid = null } = {}) {
  if (!gameState || !gameState.gameStarted) return { ok: false, reason: 'unavailable' };
  const store = getStore();
  if (!store) return { ok: false, reason: 'unavailable' };

  const key = storageKey(uid);

  // For authenticated users, preserve prior cloud-sync history (last successful
  // sync timestamp) across rewrites so retries can reason about what was synced.
  let priorSync = null;
  if (uid) {
    try {
      const prevRaw = store.getItem(key);
      if (prevRaw) priorSync = JSON.parse(prevRaw)?._sync || null;
    } catch { /* ignore unreadable previous save */ }
  }

  let serialized;
  try {
    const payload = {
      _schema: SCHEMA_VERSION,
      _savedAt: Date.now(),
      summary: buildLocalSummary(gameState),
      state: stripForLocalSave(gameState),
    };
    // Authenticated saves carry cloud-sync metadata. A freshly-written local save
    // is "pending" until a cloud write is CONFIRMED via markLocalCareerSynced().
    // This is what makes us offline-resilient: if the Firestore write never runs
    // (offline / tab closed), the save stays flagged pending and gets retried.
    // Trial / no-login saves have no UID and never get a _sync block.
    if (uid) {
      payload._sync = {
        pending: true,
        lastAttemptAt: null,
        lastError: priorSync?.lastError ?? null,
        lastErrorCode: priorSync?.lastErrorCode ?? null,
        lastSyncedAt: priorSync?.lastSyncedAt ?? null,
        syncedSavedAt: priorSync?.syncedSavedAt ?? null,
      };
    }
    serialized = JSON.stringify(payload);
  } catch (error) {
    return { ok: false, reason: 'serialize', error };
  }

  try {
    store.setItem(key, serialized);
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? 'quota' : 'write', error };
  }
}

// Patch ONLY the _sync metadata of an existing authenticated envelope without
// rewriting the (potentially large) game state. Used by the cloud-sync retry
// path so marking a save synced/failed is cheap and never touches gameplay data.
function patchSyncMeta(uid, patch) {
  if (!uid) return;
  const store = getStore();
  if (!store) return;
  const key = storageKey(uid);
  let parsed;
  try {
    const raw = store.getItem(key);
    if (!raw) return;
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  parsed._sync = { ...(parsed._sync || {}), ...patch };
  try { store.setItem(key, JSON.stringify(parsed)); } catch { /* ignore */ }
}

// Cloud write CONFIRMED: clear the pending flag and record when/what synced.
export function markLocalCareerSynced({ uid = null } = {}) {
  if (!uid) return;
  const store = getStore();
  let syncedSavedAt = null;
  if (store) {
    try { syncedSavedAt = JSON.parse(store.getItem(storageKey(uid)))?._savedAt ?? null; } catch { /* ignore */ }
  }
  patchSyncMeta(uid, {
    pending: false,
    lastAttemptAt: Date.now(),
    lastSyncedAt: Date.now(),
    syncedSavedAt,
    lastError: null,
    lastErrorCode: null,
  });
}

// Cloud write FAILED (offline / network / Firestore): keep the local save and
// flag it pending so the retry hooks pick it up later. Progress is never lost.
export function markLocalCareerSyncFailed({ uid = null } = {}, error) {
  if (!uid) return;
  patchSyncMeta(uid, {
    pending: true,
    lastAttemptAt: Date.now(),
    lastError: error ? String(error.message || error) : 'unknown',
    lastErrorCode: error?.code ? String(error.code) : null,
  });
}

// Read the cloud-sync metadata for an authenticated backup (null for trial saves).
export function getLocalCareerSyncMeta({ uid = null } = {}) {
  if (!uid) return null;
  const store = getStore();
  if (!store) return null;
  try {
    return JSON.parse(store.getItem(storageKey(uid)))?._sync || null;
  } catch {
    return null;
  }
}

// True only for a real UID whose on-device backup still needs a cloud write.
// Never true for trial/no-login saves (no UID → nothing to sync).
export function isLocalCareerPendingSync({ uid = null } = {}) {
  if (!uid) return false;
  return !!getLocalCareerSyncMeta({ uid })?.pending;
}

// Discover every UID-scoped backup currently awaiting a cloud sync. Lets the app
// retry pending saves even for an account that isn't the one in memory.
export function listPendingCareerSyncUids() {
  const store = getStore();
  if (!store) return [];
  const keys = [];
  try {
    if (typeof store.length === 'number' && typeof store.key === 'function') {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k) keys.push(k);
      }
    }
  } catch {
    return [];
  }
  const uids = [];
  for (const k of keys) {
    if (!k.startsWith(BACKUP_PREFIX)) continue;
    let parsed;
    try { parsed = JSON.parse(store.getItem(k)); } catch { continue; }
    if (parsed?._sync?.pending) uids.push(k.slice(BACKUP_PREFIX.length));
  }
  return uids;
}

// Backward-compatible reader: accepts the current versioned envelope, an older
// un-versioned envelope, or a raw game-state blob, and normalizes to
// { state, summary, savedAt }.
function normalizeLoaded(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  // v1 envelope (current).
  if (parsed.state && (parsed._schema === SCHEMA_VERSION || parsed.summary)) {
    return {
      state: parsed.state,
      summary: parsed.summary || buildLocalSummary(parsed.state),
      savedAt: parsed._savedAt || null,
      sync: parsed._sync || null,
    };
  }
  // Legacy / hand-written: the whole object is the game state.
  if (parsed.gameStarted || parsed.team || parsed.teamId) {
    return { state: parsed, summary: buildLocalSummary(parsed), savedAt: parsed._savedAt || null, sync: null };
  }
  return null;
}

export function loadLocalCareer({ uid = null } = {}) {
  const store = getStore();
  if (!store) return null;
  let raw;
  try {
    raw = store.getItem(storageKey(uid));
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupted blob — drop it so we don't keep failing to read it.
    try { store.removeItem(storageKey(uid)); } catch { /* ignore */ }
    return null;
  }
  return normalizeLoaded(parsed);
}

export function getLocalCareerInfo({ uid = null } = {}) {
  const loaded = loadLocalCareer({ uid });
  if (!loaded || !loaded.state?.gameStarted) return { hasActive: false, summary: null };
  return { hasActive: true, source: 'local', summary: loaded.summary, savedAt: loaded.savedAt };
}

export function hasLocalCareer({ uid = null } = {}) {
  return getLocalCareerInfo({ uid }).hasActive;
}

export function deleteLocalCareer({ uid = null } = {}) {
  const store = getStore();
  if (!store) return;
  try { store.removeItem(storageKey(uid)); } catch { /* ignore */ }
}
