import assert from 'node:assert/strict';
import { buildCareerLeagueGetters } from '../src/game/proManagerEngine.js';

const makePlayers = (prefix, count = 18) => Array.from(
  { length: count },
  (_, index) => ({ id: `${prefix}-p${index}`, name: `${prefix} P${index}`, overall: 66 + (index % 8) })
);

const staticLaliga = [
  { id: 'static-a', name: 'Static A', players: [{ name: 'A', overall: 70 }] },
  { id: 'static-b', name: 'Static B', players: makePlayers('static-b') },
  { id: 'static-c', name: 'Static C', players: [{ name: 'C', overall: 70 }] },
];

const promotedLaligaTable = [
  { teamId: 'promoted-one', teamName: 'Promoted One', points: 0 },
  { teamId: 'promoted-two', teamName: 'Promoted Two', points: 0 },
  { teamId: 'static-a', teamName: 'Static A', points: 0 },
  { teamId: 'static-b', teamName: 'Static B', points: 0 },
];

const state = {
  playerLeagueId: 'segunda',
  leagueTable: [
    { teamId: 'player-team', teamName: 'Player Team', points: 0 },
  ],
  leagueTeams: [
    { id: 'promoted-one', name: 'Promoted One Live', leagueId: 'laliga', players: makePlayers('promoted-one') },
    { id: 'promoted-two', name: 'Promoted Two Live', leagueId: 'laliga', players: makePlayers('promoted-two') },
    { id: 'static-b', name: 'Static B Saved Stub', leagueId: 'laliga', players: [] },
  ],
  otherLeagues: {
    laliga: {
      table: promotedLaligaTable,
      fixtures: [
        { week: 1, homeTeam: 'promoted-one', awayTeam: 'static-a', played: false },
      ],
    },
  },
};

const getters = buildCareerLeagueGetters(state, { laliga: () => staticLaliga });
const laligaTeams = getters.laliga();

assert.deepEqual(
  laligaTeams.map(t => t.id),
  ['promoted-one', 'promoted-two', 'static-a', 'static-b'],
  'ProManager offers/switches must use the career league composition, not static team getters'
);
assert.equal(laligaTeams[0].name, 'Promoted One');
assert.ok(laligaTeams[0].players.length >= 11, 'Dynamic promoted teams must hydrate players from state.leagueTeams');
assert.ok(laligaTeams[1].players.length >= 11, 'Second dynamic team must not become an empty table stub');
assert.equal(laligaTeams[2].players.length, 1, 'Known static team metadata should still be hydrated when ids match');
assert.ok(laligaTeams[3].players.length >= 11, 'Saved empty current-DB stubs must hydrate from static roster data');
assert.equal(laligaTeams[3].name, 'Static B', 'Table identity should win while static players hydrate the squad');

console.log(JSON.stringify({ ok: true, laligaTeams: laligaTeams.map(t => t.id) }));
