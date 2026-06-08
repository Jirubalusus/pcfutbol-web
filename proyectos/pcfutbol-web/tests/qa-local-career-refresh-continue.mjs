import assert from 'node:assert/strict';
import {
  BACKUP_PREFIX,
  TRIAL_KEY,
  getLocalCareerInfo,
  loadLocalCareer,
  markLocalCareerSyncFailed,
  saveLocalCareer,
} from '../src/game/localCareerSave.js';

function createMockStorage() {
  const data = new Map();
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    clear() { data.clear(); },
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

const state = {
  loaded: true,
  gameStarted: true,
  gameMode: 'career',
  teamId: 'depor',
  team: { id: 'depor', name: 'Deportivo', players: [] },
  currentSeason: 3,
  currentWeek: 19,
  money: 7654321,
  databaseSeasonId: 'current',
  fixtures: [],
  results: [],
  europeanCompetitions: { competitions: { championsLeague: { phase: 'league', currentMatchday: 4 } } },
};

// Trial/no-login: save, "refresh", then Continue metadata and payload are still
// available from the stable key.
{
  const storage = createMockStorage();
  installStorage(storage);
  assert.equal(saveLocalCareer(state).ok, true);
  assert.ok(storage.getItem(TRIAL_KEY), 'trial save is written to the stable key');

  // Simulated refresh: React memory is gone, localStorage remains.
  installStorage(storage);
  const info = getLocalCareerInfo();
  const loaded = loadLocalCareer();
  assert.equal(info.hasActive, true, 'Main Menu can show Continuar after refresh');
  assert.equal(info.summary.teamName, 'Deportivo');
  assert.equal(loaded.state.currentWeek, 19, 'Continue can restore the saved week');
  assert.equal(loaded.state.europeanCompetitions?.competitions?.championsLeague?.currentMatchday, 4, 'European competition state survives refresh');
}

// Authenticated cloud failure: UID backup remains pending and usable after a
// refresh, so Continue can prefer it over an older cloud save.
{
  const storage = createMockStorage();
  installStorage(storage);
  assert.equal(saveLocalCareer(state, { uid: 'uid_refresh' }).ok, true);
  markLocalCareerSyncFailed({ uid: 'uid_refresh' }, new Error('simulated Firestore outage'));
  assert.ok(storage.getItem(`${BACKUP_PREFIX}uid_refresh`), 'authenticated backup is written under the UID key');

  installStorage(storage);
  const local = loadLocalCareer({ uid: 'uid_refresh' });
  assert.equal(local.sync.pending, true, 'pending sync survives refresh');
  assert.equal(local.sync.lastError, 'simulated Firestore outage');
  assert.equal(local.state.currentSeason, 3);
}

console.log('✓ local career refresh/continue QA passed');
