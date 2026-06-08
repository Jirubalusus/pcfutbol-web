import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BACKUP_PREFIX,
  TRIAL_KEY,
  deleteLocalCareer,
  getLocalCareerInfo,
  getLocalCareerSyncMeta,
  isLocalCareerPendingSync,
  listPendingCareerSyncUids,
  loadLocalCareer,
  markLocalCareerSyncFailed,
  markLocalCareerSynced,
  saveLocalCareer,
  stripForLocalSave,
} from '../src/game/localCareerSave.js';

const readSource = (path) => readFileSync(path, 'utf8');

function createMockStorage({ throwOnSet = null } = {}) {
  const data = new Map();
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) {
      if (throwOnSet) throw throwOnSet;
      data.set(key, String(value));
    },
    removeItem(key) { data.delete(key); },
    clear() { data.clear(); },
    // Standard Storage API surface so production-style key iteration works.
    get length() { return data.size; },
    key(i) { return Array.from(data.keys())[i] ?? null; },
  };
}

function installStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
  });
}

const sampleState = {
  loaded: true,
  saveId: 'runtime-only',
  gameStarted: true,
  gameMode: 'career',
  teamId: 'betis',
  team: { id: 'betis', name: 'Betis', players: [{ id: 'p1', name: 'Joaquin' }] },
  currentSeason: 2,
  currentWeek: 12,
  money: 1234567,
  databaseSeasonId: '2005-06',
  leagueTeams: [{ id: 'heavy' }],
  otherLeagues: { heavy: true },
  europeanCompetitions: { heavy: true },
  saCompetitions: { heavy: true },
  cupCompetition: { heavy: true },
  playerMarket: [{ id: 'market' }],
  freeAgents: [{ id: 'free' }],
  fixtures: [
    { id: 'played', played: true },
    { id: 'future', played: false },
  ],
  results: [{ week: 1, homeTeamId: 'a', awayTeamId: 'b', homeGoals: 1, awayGoals: 0, played: true, debug: 'strip' }],
};

// Trial/no-login save roundtrip uses a stable key and appears in Continue metadata.
{
  const storage = createMockStorage();
  installStorage(storage);
  const result = saveLocalCareer(sampleState);
  assert.equal(result.ok, true);
  assert.equal(storage.data.has(TRIAL_KEY), true, 'trial save must use stable no-uid key');
  const info = getLocalCareerInfo();
  assert.equal(info.hasActive, true);
  assert.equal(info.source, 'local');
  assert.equal(info.summary.teamName, 'Betis');
  assert.equal(info.summary.week, 12);
  const loaded = loadLocalCareer();
  assert.equal(loaded.state.gameStarted, true);
  assert.equal(loaded.state.team.name, 'Betis');
  assert.equal(loaded.state.fixtures.length, 1, 'played fixtures are stripped');
  assert.equal(loaded.state.europeanCompetitions?.heavy, true, 'active European competition is retained');
  assert.equal(loaded.state.fixtures[0].id, 'future');
  assert.deepEqual(Object.keys(loaded.state.results[0]).sort(), ['awayGoals', 'awayTeamId', 'homeGoals', 'homeTeamId', 'played', 'week'].sort());
}

// Authenticated backup is uid-namespaced and does not collide with trial save.
{
  const storage = createMockStorage();
  installStorage(storage);
  assert.equal(saveLocalCareer(sampleState).ok, true);
  assert.equal(saveLocalCareer(sampleState, { uid: 'uid_123' }).ok, true);
  assert.equal(storage.data.has(TRIAL_KEY), true);
  assert.equal(storage.data.has(`${BACKUP_PREFIX}uid_123`), true);
  assert.notEqual(storage.getItem(TRIAL_KEY), null);
  assert.notEqual(storage.getItem(`${BACKUP_PREFIX}uid_123`), null);
  assert.equal(loadLocalCareer({ uid: 'uid_123' }).summary.teamId, 'betis');
  deleteLocalCareer({ uid: 'uid_123' });
  assert.equal(storage.data.has(`${BACKUP_PREFIX}uid_123`), false);
  assert.equal(storage.data.has(TRIAL_KEY), true, 'deleting uid backup must not delete trial save');
}

// Heavy reconstructible fields are removed so localStorage quota is not blown,
// but the active European competition must survive refreshes.
{
  const stripped = stripForLocalSave(sampleState);
  for (const key of ['loaded', 'leagueTeams', 'otherLeagues', 'saCompetitions', 'cupCompetition', 'playerMarket', 'freeAgents']) {
    assert.equal(Object.hasOwn(stripped, key), false, `${key} should be stripped`);
  }
  assert.equal(Object.hasOwn(stripped, 'europeanCompetitions'), true, 'europeanCompetitions should be preserved');
}

// Quota/write failures return explicit failure instead of silently claiming success.
{
  const quota = new DOMException('full', 'QuotaExceededError');
  installStorage(createMockStorage({ throwOnSet: quota }));
  const result = saveLocalCareer(sampleState);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'quota');
}

// Authenticated save starts pending cloud sync; a failed cloud write keeps it
// pending (progress preserved, retry-able) and records the error.
{
  const storage = createMockStorage();
  installStorage(storage);
  assert.equal(saveLocalCareer(sampleState, { uid: 'uid_sync' }).ok, true);
  // Freshly written authenticated backup is pending until cloud confirms.
  assert.equal(isLocalCareerPendingSync({ uid: 'uid_sync' }), true, 'new auth save is pending sync');
  const meta0 = getLocalCareerSyncMeta({ uid: 'uid_sync' });
  assert.equal(meta0.pending, true);
  assert.equal(meta0.lastSyncedAt, null);

  // Simulate an offline / Firestore failure.
  markLocalCareerSyncFailed({ uid: 'uid_sync' }, new Error('network down'));
  const metaFail = getLocalCareerSyncMeta({ uid: 'uid_sync' });
  assert.equal(metaFail.pending, true, 'failed cloud sync stays pending');
  assert.equal(metaFail.lastError, 'network down');
  assert.equal(metaFail.lastErrorCode, null);
  assert.ok(metaFail.lastAttemptAt > 0, 'failed sync records an attempt time');
  // The game state must still be fully intact after a failed cloud sync.
  assert.equal(loadLocalCareer({ uid: 'uid_sync' }).state.team.name, 'Betis');
}

// A successful cloud sync clears the pending flag and stamps lastSyncedAt.
{
  const storage = createMockStorage();
  installStorage(storage);
  saveLocalCareer(sampleState, { uid: 'uid_ok' });
  assert.equal(isLocalCareerPendingSync({ uid: 'uid_ok' }), true);
  markLocalCareerSynced({ uid: 'uid_ok' });
  assert.equal(isLocalCareerPendingSync({ uid: 'uid_ok' }), false, 'synced save is no longer pending');
  const meta = getLocalCareerSyncMeta({ uid: 'uid_ok' });
  assert.equal(meta.pending, false);
  assert.equal(meta.lastError, null);
  assert.equal(meta.lastErrorCode, null);
  assert.ok(meta.lastSyncedAt > 0, 'successful sync records lastSyncedAt');
  assert.ok(meta.syncedSavedAt > 0, 'successful sync records which save version synced');
  // Re-saving after a sync resets to pending but preserves the lastSyncedAt history.
  saveLocalCareer(sampleState, { uid: 'uid_ok' });
  const meta2 = getLocalCareerSyncMeta({ uid: 'uid_ok' });
  assert.equal(meta2.pending, true, 'a new save after sync is pending again');
  assert.ok(meta2.lastSyncedAt > 0, 'prior cloud-sync history is preserved across rewrites');
}

// Pending UID-scoped backups can be discovered for retry; synced ones drop out.
{
  const storage = createMockStorage();
  installStorage(storage);
  saveLocalCareer(sampleState, { uid: 'uid_a' });
  saveLocalCareer(sampleState, { uid: 'uid_b' });
  markLocalCareerSynced({ uid: 'uid_b' });
  const pending = listPendingCareerSyncUids();
  assert.deepEqual(pending, ['uid_a'], 'only the still-pending uid is discovered');
}

// Trial / no-login saves must never look like they need a cloud sync, and the
// sync mark helpers must be no-ops without a real UID.
{
  const storage = createMockStorage();
  installStorage(storage);
  saveLocalCareer(sampleState); // trial, no uid
  assert.equal(isLocalCareerPendingSync({ uid: null }), false, 'trial save is never pending sync');
  assert.equal(getLocalCareerSyncMeta({ uid: null }), null, 'trial save carries no sync metadata');
  // Trial envelope must not contain a _sync block at all.
  assert.equal(JSON.parse(storage.getItem(TRIAL_KEY))._sync, undefined, 'trial save has no _sync block');
  // No-uid mark helpers do nothing and never throw.
  markLocalCareerSynced({});
  markLocalCareerSyncFailed({}, new Error('ignored'));
  assert.equal(listPendingCareerSyncUids().length, 0, 'no trial cloud-sync is ever queued');
}

// Failed cloud sync metadata preserves both Firebase-style code and message.
{
  const storage = createMockStorage();
  installStorage(storage);
  saveLocalCareer(sampleState, { uid: 'uid_error_code' });
  const error = new Error('client is offline');
  error.code = 'unavailable';
  markLocalCareerSyncFailed({ uid: 'uid_error_code' }, error);
  const meta = getLocalCareerSyncMeta({ uid: 'uid_error_code' });
  assert.equal(meta.pending, true);
  assert.equal(meta.lastError, 'client is offline');
  assert.equal(meta.lastErrorCode, 'unavailable');
}

// Source contract: Carrera saves must be local-first and cloud failure must be
// non-fatal when the local backup exists.
{
  const game = readSource('src/context/GameContext.jsx');
  const localFirstIndex = game.indexOf('const localResult = saveLocalCareer(state, { uid: userId || null });');
  const cloudSaveIndex = game.indexOf('await saveCareer(userId, state);', localFirstIndex);
  assert.ok(localFirstIndex >= 0, 'GameContext must save Carrera locally before cloud sync');
  assert.ok(cloudSaveIndex > localFirstIndex, 'local Carrera save must happen before saveCareer cloud attempt');
  assert.ok(game.includes('markLocalCareerSyncFailed({ uid: userId }, error)'), 'cloud failure must mark local backup pending with metadata');
  assert.ok(game.includes('markLocalCareerSynced({ uid: userId })'), 'cloud success must mark local backup synced');
  assert.ok(game.includes('retryPendingCareerSync({ force: true })'), 'app init / recovery must retry pending cloud sync without blocking play');
  assert.ok(game.includes("window.addEventListener('online'"), 'online recovery hook should retry pending sync');
  assert.ok(game.includes("document.addEventListener('visibilitychange'"), 'visibility recovery hook should retry pending sync');
  assert.ok(game.includes('notifyCloudSaveError(localResult.ok)'), 'cloud failure warning/error must depend on whether local backup really succeeded');
  assert.ok(
    game.includes('Partida guardada en este dispositivo. La sincronización con la nube queda pendiente y se reintentará.'),
    'cloud failure after local save must show the non-fatal Spanish pending-sync warning'
  );
  assert.equal(game.includes('No se pudo guardar la partida. Comprueba tu conexión.'), false, 'old fatal cloud/offline save copy must be absent');
  assert.equal(game.includes('navigator.onLine === false'), false, 'navigator.onLine false must not hard-stop Carrera saving');
}

// Source contract: Continue must not let older cloud state overwrite pending or
// newer local progress.
{
  const mainMenu = readSource('src/components/MainMenu/MainMenu.jsx');
  assert.ok(mainMenu.includes('function shouldPreferLocalBackup(local, saveData)'), 'MainMenu must centralize local-vs-cloud Continue resolution');
  assert.ok(mainMenu.includes('if (local.sync?.pending) return true;'), 'Continue must prefer a pending local backup');
  assert.ok(mainMenu.includes('return localMs > 0 && localMs > cloudMs;'), 'Continue must prefer a newer local backup');
  assert.ok(mainMenu.includes('const saveData = await getCareerSave(user.uid);'), 'authenticated Continue should read cloud save');
  assert.ok(mainMenu.includes('const local = loadLocalCareer({ uid: user.uid });'), 'authenticated Continue should read UID local backup');
  assert.ok(mainMenu.includes('!shouldPreferLocalBackup(local, saveData)'), 'cloud load must be gated by local preference resolution');
  assert.ok(mainMenu.includes('const loaded = loadLocalCareer();'), 'trial Continue must read the stable local Carrera key');
  assert.ok(mainMenu.includes('deleteLocalCareer({ uid: user.uid });'), 'new/delete flow must clear authenticated local backup');
  assert.ok(mainMenu.includes('deleteLocalCareer();'), 'new/delete flow must clear stable trial local backup');
}

console.log('✓ local career save audit passed');
