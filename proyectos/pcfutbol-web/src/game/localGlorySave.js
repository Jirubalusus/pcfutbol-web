// Local (on-device) backup for Glory Mode — "Camino a la Gloria".
//
// Glory is an authenticated, cloud-saved mode. But the cloud write is async and
// debounced, so it can be dropped when the tab is refreshed/closed before the
// Firestore setDoc lands — exactly the failure that the Carrera bug exposed
// (see localCareerSave). Carrera survived a refresh because it ALSO writes a
// synchronous on-device backup; Glory had no such net, so a just-started or
// just-advanced run could vanish from the menu on reload even though it was
// visible in-session (in-memory).
//
// This mirrors localCareerSave, adapted for Glory: a UID-scoped localStorage
// backup that survives refresh, lets MainMenu / GloryMenu surface the save when
// the cloud is missing or unreadable, and is reconciled with the cloud copy by
// timestamp on Continue. Glory is auth-only (no trial), so backups are ALWAYS
// UID-scoped — there is no stable trial key and no UID means a no-op.
//
// Intentionally browser-safe AND Node-testable: all storage access goes through
// getStore(), which returns globalThis.localStorage when present and null
// otherwise, so audits can run without a DOM.

export const GLORY_SCHEMA_VERSION = 1;
// Authenticated on-device Glory backups are namespaced per-UID so accounts never collide.
export const GLORY_BACKUP_PREFIX = 'pcfutbol_glory_backup_';

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
  return uid ? `${GLORY_BACKUP_PREFIX}${uid}` : null;
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

// Mirror the cloud strip (glorySaveService.saveGlory): drop the transient handle
// and the reconstructible league scaffolding so the stored shape matches the cloud
// save EXACTLY. The Glory cloud doc already fits Firestore's 1MB limit, so the same
// payload is comfortably within the localStorage quota, and LOAD_SAVE rebuilds
// otherLeagues on load just like it does for a cloud save.
export function stripForLocalGlory(gameState) {
  const data = { ...gameState };
  delete data.loaded;
  delete data.leagueTeams;
  delete data.otherLeagues;
  delete data._gloryUserId;
  return data;
}

// Metadata needed by the Glory "Continuar" card so a save shows up after refresh
// without deserializing the whole campaign. Matches hasActiveGlory's summary shape.
export function buildGlorySummary(gameState) {
  return {
    teamName: gameState.team?.name || gameState.gloryData?.teamName || 'FC Gloria',
    season: gameState.gloryData?.season || 1,
    division: gameState.gloryData?.division || 'segundaRFEF',
    week: gameState.currentWeek || 1,
    cards: (gameState.gloryData?.pickedCards || []).length,
    databaseSeasonId: gameState.databaseSeasonId || 'current',
  };
}

// Persist the active Glory run to this device. Returns { ok, reason?, error? }.
//   reason: 'unavailable' (no UID or no storage — not an error to report)
//         | 'serialize'   (state had a circular ref / non-serializable value)
//         | 'quota'       (localStorage full)
//         | 'write'       (other write failure, e.g. private mode)
// A freshly-written backup is flagged `pending` until a cloud write is CONFIRMED
// via markLocalGlorySynced(). That is what makes us refresh-resilient: if the
// Firestore write never lands (offline / tab closed), the backup stays pending and
// the menu prefers it over a stale/absent cloud doc.
export function saveLocalGlory(gameState, { uid = null } = {}) {
  if (!gameState || !gameState.gameStarted || gameState.gameMode !== 'glory') {
    return { ok: false, reason: 'unavailable' };
  }
  const store = getStore();
  const key = storageKey(uid);
  if (!store || !key) return { ok: false, reason: 'unavailable' };

  // Preserve prior cloud-sync history across rewrites so retries can reason about it.
  let priorSync = null;
  try {
    const prevRaw = store.getItem(key);
    if (prevRaw) priorSync = JSON.parse(prevRaw)?._sync || null;
  } catch { /* ignore unreadable previous save */ }

  let serialized;
  try {
    const payload = {
      _schema: GLORY_SCHEMA_VERSION,
      _savedAt: Date.now(),
      summary: buildGlorySummary(gameState),
      state: stripForLocalGlory(gameState),
      _sync: {
        pending: true,
        lastAttemptAt: null,
        lastError: priorSync?.lastError ?? null,
        lastErrorCode: priorSync?.lastErrorCode ?? null,
        lastSyncedAt: priorSync?.lastSyncedAt ?? null,
        syncedSavedAt: priorSync?.syncedSavedAt ?? null,
      },
    };
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

// Patch ONLY the _sync metadata of an existing backup without rewriting the
// (potentially large) game state — used by the cloud-confirm/fail paths.
function patchSyncMeta(uid, patch) {
  const store = getStore();
  const key = storageKey(uid);
  if (!store || !key) return;
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
export function markLocalGlorySynced({ uid = null } = {}) {
  if (!uid) return;
  const store = getStore();
  const key = storageKey(uid);
  let syncedSavedAt = null;
  if (store && key) {
    try { syncedSavedAt = JSON.parse(store.getItem(key))?._savedAt ?? null; } catch { /* ignore */ }
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

// Cloud write FAILED: keep the local backup and flag it pending so the menu keeps
// preferring it until a cloud write confirms. Progress is never lost.
export function markLocalGlorySyncFailed({ uid = null } = {}, error) {
  if (!uid) return;
  patchSyncMeta(uid, {
    pending: true,
    lastAttemptAt: Date.now(),
    lastError: error ? String(error.message || error) : 'unknown',
    lastErrorCode: error?.code ? String(error.code) : null,
  });
}

// Backward-compatible reader: accepts the current versioned envelope or a raw
// game-state blob, normalizing to { state, summary, savedAt, sync }.
function normalizeLoaded(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.state && (parsed._schema === GLORY_SCHEMA_VERSION || parsed.summary)) {
    return {
      state: parsed.state,
      summary: parsed.summary || buildGlorySummary(parsed.state),
      savedAt: parsed._savedAt || null,
      sync: parsed._sync || null,
    };
  }
  if (parsed.gameStarted && parsed.gameMode === 'glory') {
    return { state: parsed, summary: buildGlorySummary(parsed), savedAt: parsed._savedAt || null, sync: null };
  }
  return null;
}

export function loadLocalGlory({ uid = null } = {}) {
  const store = getStore();
  const key = storageKey(uid);
  if (!store || !key) return null;
  let raw;
  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupted blob — drop it so we don't keep failing to read it.
    try { store.removeItem(key); } catch { /* ignore */ }
    return null;
  }
  return normalizeLoaded(parsed);
}

export function getLocalGloryInfo({ uid = null } = {}) {
  const loaded = loadLocalGlory({ uid });
  if (!loaded || loaded.state?.gameStarted !== true || loaded.state?.gameMode !== 'glory') {
    return { hasActive: false, summary: null };
  }
  return { hasActive: true, source: 'local', summary: loaded.summary, savedAt: loaded.savedAt };
}

export function deleteLocalGlory({ uid = null } = {}) {
  const store = getStore();
  const key = storageKey(uid);
  if (!store || !key) return;
  try { store.removeItem(key); } catch { /* ignore */ }
}
