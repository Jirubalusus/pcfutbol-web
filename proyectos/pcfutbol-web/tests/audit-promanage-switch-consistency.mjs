import assert from 'node:assert/strict';
import { buildCareerLeagueGetters } from '../src/game/proManagerEngine.js';

const staticLaliga = [
  { id: 'static-a', name: 'Static A', players: [{ name: 'A', overall: 70 }] },
  { id: 'static-b', name: 'Static B', players: [{ name: 'B', overall: 70 }] },
  { id: 'static-c', name: 'Static C', players: [{ name: 'C', overall: 70 }] },
];

const promotedLaligaTable = [
  { teamId: 'promoted-one', teamName: 'Promoted One', points: 0 },
  { teamId: 'promoted-two', teamName: 'Promoted Two', points: 0 },
  { teamId: 'static-a', teamName: 'Static A', points: 0 },
];

const state = {
  playerLeagueId: 'segunda',
  leagueTable: [
    { teamId: 'player-team', teamName: 'Player Team', points: 0 },
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
  ['promoted-one', 'promoted-two', 'static-a'],
  'ProManager offers/switches must use the career league composition, not static team getters'
);
assert.equal(laligaTeams[0].name, 'Promoted One');
assert.equal(laligaTeams[2].players.length, 1, 'Known static team metadata should still be hydrated when ids match');

console.log(JSON.stringify({ ok: true, laligaTeams: laligaTeams.map(t => t.id) }));
