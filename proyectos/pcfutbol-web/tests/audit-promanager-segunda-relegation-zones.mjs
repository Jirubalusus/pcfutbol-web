import assert from 'node:assert/strict';
import { buildSwitchedProManagerLeague } from '../src/game/proManagerEngine.js';
import { resolveRowZone } from '../src/game/leagueTableZones.js';
import { getSeasonResult } from '../src/game/seasonManager.js';
import { LEAGUE_CONFIG, processRFEFPromotionRelegation } from '../src/game/multiLeagueEngine.js';

// Regression (Pablo): after being fired and accepting Albacete in Segunda Ibérica,
// the career league ran with 22 teams but the classification painted relegation on
// positions 18-20 (the static 20-team config) instead of the true last 3 (20,21,22).
// The fix anchors relegation to the ACTUAL table length while keeping promotion /
// playoff top-anchored, and must not let the player-row highlight hide relegation.

const segundaZones = LEAGUE_CONFIG.segunda.zones; // promotion [1,2], playoff [3-6], relegation [18,19,20]
assert.deepEqual(segundaZones.relegation, [18, 19, 20], 'precondition: static segunda config is a 20-team relegation [18,19,20]');

const makePlayers = (prefix, count = 18) => Array.from(
  { length: count },
  (_, index) => ({ id: `${prefix}-p${index}`, name: `${prefix} P${index}`, overall: 66 + (index % 8) })
);

const albacete = { id: 'albacete', name: 'Albacete', leagueId: 'segunda', players: makePlayers('albacete') };

// A 22-team Segunda Ibérica career universe (21 AI clubs + Albacete).
const otherSegundaTeams = [
  'levante', 'eibar', 'huesca', 'oviedo', 'mirandes', 'tenerife', 'burgos', 'cartagena',
  'zaragoza', 'sporting', 'racing', 'valladolid', 'almeria', 'granada', 'cadiz', 'malaga',
  'castellon', 'andorra', 'cordoba', 'ceuta', 'cultural',
];
assert.equal(otherSegundaTeams.length, 21, 'precondition: 21 AI clubs + Albacete = 22-team league');

const careerGetters = {
  segunda: () => [albacete, ...otherSegundaTeams.map(id => ({ id, name: id, leagueId: 'segunda', players: makePlayers(id) }))],
};

// Rollover dropped Albacete (the original Albacete bug): a promoted club took its slot.
const tableWithoutAlbacete = [
  ...otherSegundaTeams.map(id => ({ teamId: id, teamName: id, points: 0 })),
  { teamId: 'leganes', teamName: 'Leganes', points: 0 },
];
const league = buildSwitchedProManagerLeague({
  selectedLeagueData: { table: tableWithoutAlbacete, fixtures: [] },
  team: albacete,
  leagueId: 'segunda',
  careerGetters,
});

assert.ok(league, 'switched league built');
const tableLength = league.table.length;
assert.equal(tableLength, 22, 'switched Segunda Ibérica runs with 22 teams');

const zoneAt = (position) => resolveRowZone({ position, leagueConfig: segundaZones, tableLength });

// --- Promotion / playoff stay top-anchored ---
assert.equal(zoneAt(1), 'promotion', 'pos 1 is promotion');
assert.equal(zoneAt(2), 'promotion', 'pos 2 is promotion');
for (const p of [3, 4, 5, 6]) assert.equal(zoneAt(p), 'playoff', `pos ${p} is playoff`);

// --- The fix: relegation is the LAST 3 rows (20,21,22), not the static [18,19,20] ---
assert.equal(zoneAt(18), '', 'pos 18 is NOT relegation in a 22-team table (was the bug)');
assert.equal(zoneAt(19), '', 'pos 19 is NOT relegation in a 22-team table (was the bug)');
assert.equal(zoneAt(20), 'relegation', 'pos 20 is relegation');
assert.equal(zoneAt(21), 'relegation', 'pos 21 is relegation');
assert.equal(zoneAt(22), 'relegation', 'pos 22 is relegation');

// Exactly 3 relegation rows across the whole table.
const relegationPositions = Array.from({ length: tableLength }, (_, i) => i + 1).filter(p => zoneAt(p) === 'relegation');
assert.deepEqual(relegationPositions, [20, 21, 22], 'exactly the last 3 positions are relegation');

// --- Player-row highlight must NOT override relegation semantics ---
// Zone is purely position-driven; isPlayer is a separate CSS class. If Albacete
// finishes 22nd it is still in the relegation zone.
assert.equal(zoneAt(22), 'relegation', 'a player team in 22nd is still flagged relegation');

// --- Sanity: a normal 20-team Segunda still relegates [18,19,20] (no regression) ---
for (const p of [18, 19, 20]) {
  assert.equal(resolveRowZone({ position: p, leagueConfig: segundaZones, tableLength: 20 }), 'relegation', `20-team table: pos ${p} relegation`);
}
assert.equal(resolveRowZone({ position: 17, leagueConfig: segundaZones, tableLength: 20 }), '', '20-team table: pos 17 safe');

// --- Sanity: unknown table length falls back to the static array ---
assert.equal(resolveRowZone({ position: 18, leagueConfig: segundaZones, tableLength: 0 }), 'relegation', 'unknown length falls back to static [18,19,20]');

// --- Functional season result: dismissal/relegation uses the same bottom-N semantics ---
const seasonTable22 = Array.from({ length: 22 }, (_, i) => ({
  teamId: `s${i + 1}`,
  teamName: `Segunda ${i + 1}`,
  points: 66 - i,
}));
assert.equal(getSeasonResult(seasonTable22, 's19', 'segunda').relegation, false, 'season result: pos 19 is safe in 22-team Segunda');
assert.equal(getSeasonResult(seasonTable22, 's20', 'segunda').relegation, true, 'season result: pos 20 is relegation in 22-team Segunda');
assert.equal(getSeasonResult(seasonTable22, 's22', 'segunda').relegation, true, 'season result: pos 22 is relegation in 22-team Segunda');

const seasonTable20 = seasonTable22.slice(0, 20);
assert.equal(getSeasonResult(seasonTable20, 's17', 'segunda').relegation, false, 'season result: pos 17 is safe in 20-team Segunda');
assert.equal(getSeasonResult(seasonTable20, 's18', 'segunda').relegation, true, 'season result: pos 18 is relegation in 20-team Segunda');
assert.equal(getSeasonResult(seasonTable20, 's20', 'segunda').relegation, true, 'season result: pos 20 is relegation in 20-team Segunda');

// --- Functional rollover: normal 3-up RFEF case demotes 20-22, not 18/19 ---
const rfefTable = (prefix) => Array.from({ length: 6 }, (_, i) => ({
  teamId: `${prefix}${i + 1}`,
  teamName: `${prefix.toUpperCase()} ${i + 1}`,
  points: 18 - i,
}));
const rfefChanges = processRFEFPromotionRelegation(
  seasonTable22,
  {
    groups: {
      grupo1: { table: rfefTable('g1') },
      grupo2: { table: rfefTable('g2') },
    },
  },
  null,
  {
    primeraRFEFPlayoffBrackets: {
      onlyOnePromotedPlayoffWinner: { winner: 'g13' },
    },
  }
);
assert.deepEqual(rfefChanges.segundaToRFEF, ['s20', 's21', 's22'], 'rollover: 22-team Segunda normal 3 demotions are bottom 3');
assert.ok(!rfefChanges.segundaToRFEF.includes('s18'), 'rollover: pos 18 is safe in normal 3-demotion case');
assert.ok(!rfefChanges.segundaToRFEF.includes('s19'), 'rollover: pos 19 is safe in normal 3-demotion case');

const rfefChangesWithTwoPlayoffWinners = processRFEFPromotionRelegation(
  seasonTable22,
  {
    groups: {
      grupo1: { table: rfefTable('g1') },
      grupo2: { table: rfefTable('g2') },
    },
  },
  null,
  {
    primeraRFEFPlayoffBrackets: {
      grupo1: { winner: 'g13' },
      grupo2: { winner: 'g23' },
    },
  }
);
assert.deepEqual(rfefChangesWithTwoPlayoffWinners.rfefToSegunda, ['g11', 'g21', 'g13'], 'rollover: RFEF promotions are capped to the visible 3 Segunda slots');
assert.deepEqual(rfefChangesWithTwoPlayoffWinners.segundaToRFEF, ['s20', 's21', 's22'], 'rollover: even with two playoff winners, Segunda demotes only the bottom 3');

console.log(JSON.stringify({ ok: true, tableLength, relegationPositions, seasonRelegated: ['s20', 's21', 's22'] }));
