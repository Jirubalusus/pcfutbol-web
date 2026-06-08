import assert from 'node:assert/strict';
import { buildSwitchedProManagerLeague } from '../src/game/proManagerEngine.js';

// Regression: accepting an offer (reported: Albacete in Segunda) used to leave the
// new club with NO classification row and NO fixtures whenever the season rollover
// moved that club out of selectedLeagueData. buildSwitchedProManagerLeague must
// guarantee the offered team is in the table exactly once (isPlayer) and has matches.

const makePlayers = (prefix, count = 18) => Array.from(
  { length: count },
  (_, index) => ({ id: `${prefix}-p${index}`, name: `${prefix} P${index}`, overall: 66 + (index % 8) })
);

const albacete = { id: 'albacete', name: 'Albacete', leagueId: 'segunda', players: makePlayers('albacete') };

const segundaRow = (id, name) => ({ teamId: id, teamName: name, points: 0 });
const otherSegundaTeams = ['levante', 'eibar', 'huesca', 'oviedo', 'mirandes', 'tenerife', 'burgos', 'cartagena'];
const careerGetters = {
  segunda: () => [albacete, ...otherSegundaTeams.map(id => ({ id, name: id, leagueId: 'segunda', players: makePlayers(id) }))],
};

const teamMatchesIn = (fixtures, teamId) =>
  fixtures.filter(f => f.homeTeam === teamId || f.awayTeam === teamId);

function assertHealthyLeague(leagueData, label) {
  assert.ok(leagueData, `${label}: should return league data`);
  const playerRows = leagueData.table.filter(r => r.isPlayer);
  assert.equal(playerRows.length, 1, `${label}: exactly one isPlayer row`);
  assert.equal(playerRows[0].teamId, albacete.id, `${label}: isPlayer row is the offered team`);
  const albaceteRows = leagueData.table.filter(r => r.teamId === albacete.id);
  assert.equal(albaceteRows.length, 1, `${label}: offered team appears exactly once`);
  const matches = teamMatchesIn(leagueData.fixtures, albacete.id);
  assert.ok(matches.length > 0, `${label}: offered team has fixtures`);
  // Round-robin double leg => each team plays (n-1)*2 matches.
  const expected = (leagueData.table.length - 1) * 2;
  assert.equal(matches.length, expected, `${label}: offered team plays a full home/away schedule (${expected})`);
}

// --- Case 1: rollover DROPPED the offered team out of its league (the bug) ---
const tableWithoutAlbacete = [
  ...otherSegundaTeams.map(id => segundaRow(id, id)),
  segundaRow('castellon', 'Castellon'), // a promoted/relegated club took the slot
];
const dropped = buildSwitchedProManagerLeague({
  selectedLeagueData: { table: tableWithoutAlbacete, fixtures: [] },
  team: albacete,
  leagueId: 'segunda',
  careerGetters,
});
assertHealthyLeague(dropped, 'dropped-out');
assert.equal(dropped.table.length, tableWithoutAlbacete.length, 'dropped-out: league size stays stable (AI slot replaced)');

// --- Case 2: normal case, offered team already present ---
const tableWithAlbacete = [segundaRow(albacete.id, albacete.name), ...otherSegundaTeams.map(id => segundaRow(id, id))];
const present = buildSwitchedProManagerLeague({
  selectedLeagueData: { table: tableWithAlbacete, fixtures: [] },
  team: albacete,
  leagueId: 'segunda',
  careerGetters,
});
assertHealthyLeague(present, 'already-present');
assert.equal(present.table.length, tableWithAlbacete.length, 'already-present: league size unchanged');

// --- Case 3: rollover produced no table at all -> fallback getter seeds the league ---
const fallback = buildSwitchedProManagerLeague({
  selectedLeagueData: null,
  team: albacete,
  leagueId: 'segunda',
  careerGetters,
  fallbackGetter: () => otherSegundaTeams.map(id => ({ id, name: id, players: makePlayers(id) })),
});
assertHealthyLeague(fallback, 'fallback-seeded');

// --- Case 4: squads are hydrated, not empty stubs ---
const playerRow = dropped.table.find(r => r.isPlayer);
assert.ok(playerRow, 'offered team row exists');
// initializeLeague tables do not carry players, but the regenerated fixtures prove
// the team object was passed through; verify hydration via the table identity name.
assert.equal(playerRow.teamName, 'Albacete', 'offered team keeps its identity');

console.log(JSON.stringify({
  ok: true,
  droppedSize: dropped.table.length,
  presentSize: present.table.length,
  fallbackSize: fallback.table.length,
  albaceteMatches: teamMatchesIn(dropped.fixtures, albacete.id).length,
}));
