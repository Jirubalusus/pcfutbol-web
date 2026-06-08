import assert from 'node:assert/strict';
import { validateLeagueSlots, LEAGUE_SLOTS, ensureEuropeanLeagueStandings, qualifyTeamsForEurope } from '../src/game/europeanCompetitions.js';
import { SA_LEAGUE_SLOTS, qualifyTeamsForSouthAmerica } from '../src/game/southAmericanCompetitions.js';

const row = (teamId, position, points = 100 - position) => ({
  teamId,
  teamName: teamId,
  shortName: teamId,
  played: 10,
  won: Math.max(0, Math.floor(points / 3)),
  drawn: points % 3,
  lost: 0,
  goalsFor: points,
  goalsAgainst: 10,
  goalDifference: points - 10,
  points,
});

const computeAccumulatedForTest = (apertura, clausura) => apertura.map(a => {
  const c = clausura.find(x => x.teamId === a.teamId) || {};
  return {
    ...a,
    played: (a.played || 0) + (c.played || 0),
    won: (a.won || 0) + (c.won || 0),
    drawn: (a.drawn || 0) + (c.drawn || 0),
    lost: (a.lost || 0) + (c.lost || 0),
    goalsFor: (a.goalsFor || 0) + (c.goalsFor || 0),
    goalsAgainst: (a.goalsAgainst || 0) + (c.goalsAgainst || 0),
    goalDifference: (a.goalDifference || 0) + (c.goalDifference || 0),
    points: (a.points || 0) + (c.points || 0),
  };
}).sort((a, b) => (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor));

const table = (prefix, count) => Array.from({ length: count }, (_, i) => row(`${prefix}_${i + 1}`, i + 1));

// European slot math must remain exactly 32/32/32.
assert.doesNotThrow(() => validateLeagueSlots(LEAGUE_SLOTS), 'LEAGUE_SLOTS debe cuadrar 32 equipos por competición europea');

const europeanStandings = ensureEuropeanLeagueStandings({}, (leagueId) => {
  const slots = LEAGUE_SLOTS[leagueId];
  const needed = (slots.championsLeague || 0) + (slots.europaLeague || 0) + (slots.conferenceleague || 0);
  return table(leagueId, Math.max(needed, 8)).map((r, idx) => ({ id: r.teamId, name: r.teamName, reputation: 90 - idx }));
});
const europe = qualifyTeamsForEurope(europeanStandings, {});
assert.equal(europe.championsLeague.length, 32, 'Champions debe tener 32 clasificados');
assert.equal(europe.europaLeague.length, 32, 'Europa League debe tener 32 clasificados');
assert.equal(europe.conferenceleague.length, 32, 'Conference debe tener 32 clasificados');
assert.ok(europe.championsLeague.some(t => t.teamId === 'laliga_1'), 'LaLiga 1º debe entrar en Champions');
assert.ok(europe.europaLeague.some(t => t.teamId === 'laliga_5'), 'LaLiga 5º debe entrar en Europa League');
assert.ok(europe.conferenceleague.some(t => t.teamId === 'laliga_7'), 'LaLiga 7º debe entrar en Conference');

// South America / Libertadores slot sanity.
const saStandings = {};
for (const [leagueId, slots] of Object.entries(SA_LEAGUE_SLOTS)) {
  const needed = (slots.copaLibertadores || 0) + (slots.copaSudamericana || 0);
  saStandings[leagueId] = table(leagueId, Math.max(needed, 12));
}
const southAmerica = qualifyTeamsForSouthAmerica(saStandings, {});
assert.equal(southAmerica.copaLibertadores.length, 32, 'Libertadores debe tener 32 clasificados');
assert.equal(southAmerica.copaSudamericana.length, 32, 'Sudamericana debe quedar cerrada en 32 clasificados');
assert.ok(southAmerica.copaLibertadores.some(t => t.teamId === 'argentinaPrimera_1'), 'Argentina 1º debe entrar en Libertadores');
assert.ok(southAmerica.copaSudamericana.some(t => t.teamId === 'argentinaPrimera_7'), 'Argentina, tras 6 cupos Libertadores, debe mandar el 7º a Sudamericana');

// Argentina/AP-CL: clasificación debe mirarse por acumulada, no solo Clausura.
const apertura = table('argentinaPrimera', 30);
const clausura = table('argentinaPrimera', 30).reverse().map((r, idx) => ({ ...r, points: idx + 1 }));
const accumulated = computeAccumulatedForTest(apertura, clausura);
const topAccumulatedId = accumulated[0].teamId;
assert.ok(!clausura.slice(0, 6).some(t => t.teamId === topAccumulatedId), 'solo Clausura puede dejar fuera a un equipo top acumulado');
assert.ok(accumulated.slice(0, 6).some(t => t.teamId === topAccumulatedId), 'Argentina debe clasificar por tabla acumulada');

console.log('✅ continental qualification audit OK');
