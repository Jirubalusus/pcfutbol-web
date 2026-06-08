import assert from 'node:assert/strict';
import {
  saveLocalGlory,
  loadLocalGlory,
  getLocalGloryInfo,
  deleteLocalGlory,
} from '../src/game/localGlorySave.js';

const store = new Map();

globalThis.localStorage = {
  get length() { return store.size; },
  key(index) { return [...store.keys()][index] ?? null; },
  getItem(key) { return store.has(key) ? store.get(key) : null; },
  setItem(key, value) { store.set(String(key), String(value)); },
  removeItem(key) { store.delete(key); },
  clear() { store.clear(); },
};

const gameState = {
  gameStarted: true,
  gameMode: 'glory',
  team: { name: 'Gloria FC' },
  teamId: 'glory-fc',
  currentWeek: 7,
  databaseSeasonId: 'current',
  gloryData: {
    teamName: 'Gloria FC',
    season: 2,
    division: 'segundaRFEF',
    pickedCards: [{ id: 'card-1' }],
  },
  leagueTeams: [{ id: 'x', players: [] }],
  otherLeagues: [{ id: 'y' }],
  _gloryUserId: 'uid-123',
};

const saved = saveLocalGlory(gameState, { uid: 'uid-123' });
assert.equal(saved.ok, true, 'local glory save should succeed');

const loaded = loadLocalGlory({ uid: 'uid-123' });
assert.ok(loaded?.state, 'saved glory state should reload');
assert.equal(loaded.state.gameMode, 'glory');
assert.equal(loaded.state._gloryUserId, undefined);
assert.equal(loaded.summary.teamName, 'Gloria FC');
assert.equal(loaded.summary.season, 2);
assert.equal(loaded.summary.week, 7);
assert.equal(loaded.summary.cards, 1);

const info = getLocalGloryInfo({ uid: 'uid-123' });
assert.equal(info.hasActive, true);
assert.equal(info.summary.teamName, 'Gloria FC');

deleteLocalGlory({ uid: 'uid-123' });
assert.equal(loadLocalGlory({ uid: 'uid-123' }), null, 'deleteLocalGlory should remove the backup');

console.log('glory local save audit passed');
