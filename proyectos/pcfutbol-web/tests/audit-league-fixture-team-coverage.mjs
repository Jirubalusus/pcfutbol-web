import assert from 'node:assert/strict';

const { simulateWeekMatches } = await import('../src/game/leagueEngine.js');

const table = [
  { teamId: 'known-home', teamName: 'Known Home', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], morale: 70 },
  { teamId: 'promoted-away', teamName: 'Promoted Away', played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], morale: 70 },
];

const fixtures = [
  { id: '1_0', week: 1, homeTeam: 'known-home', awayTeam: 'promoted-away', homeScore: null, awayScore: null, played: false, events: [] },
];

const allTeamsMissingPromoted = [
  { id: 'known-home', name: 'Known Home', reputation: 70, players: [] },
];

const result = simulateWeekMatches(fixtures, table, 1, 'player-team-not-in-this-fixture', allTeamsMissingPromoted);

assert.equal(result.fixtures[0].played, true, 'Los partidos CPU vs CPU deben jugarse aunque un ascendido no exista en el catálogo estático allTeams');
assert.equal(result.table.find(t => t.teamId === 'known-home').played, 1, 'El local debe sumar PJ');
assert.equal(result.table.find(t => t.teamId === 'promoted-away').played, 1, 'El ascendido debe sumar PJ');

console.log(JSON.stringify({ ok: true, played: result.fixtures[0].played, table: result.table.map(t => ({ id: t.teamId, pj: t.played })) }));
