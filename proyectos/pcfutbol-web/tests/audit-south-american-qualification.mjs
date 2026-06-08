// ============================================================
// AUDIT — South American continental qualification
// ============================================================
// Regression guard for the bug Pablo reported playing a Bolivian
// side on the 2008-09 historical database: Copa Libertadores /
// Copa Sudamericana qualification was broken for South American
// (especially smaller-country) careers.
//
// Verifies, end to end against the real 2008-09 dataset and with
// synthetic tables:
//   1. the 2008-09 Bolivia pool is recognised as `boliviaPrimera`;
//   2. a Bolivian final table at positions 1/2/3 maps to the right
//      cup, with the player reactive to his own finish (more than the
//      champion gets a Libertadores path);
//   3. both cups initialise with <=32 teams, no duplicate ids inside a
//      cup and no club shared between Libertadores and Sudamericana;
//   4. a historical 2008-09 draw is built ONLY from historical clubs —
//      no current/static team contamination;
//   5. next-season qualification follows the FINAL table position, not
//      reputation / a reset new-season order, and never silently drops
//      Bolivia/Venezuela because of the global field cap.
// ============================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import {
  SA_LEAGUE_SLOTS,
  COPA_LIBERTADORES,
  COPA_SUDAMERICANA,
  isSouthAmericanLeague,
  qualifyTeamsForSouthAmerica,
  buildSouthAmericanQualifiedTeams
} from '../src/game/southAmericanCompetitions.js';
import { initializeSACompetitions } from '../src/game/southAmericanSeason.js';

const SEASON_ID = '2008-09';
const SEASON_DIR = path.resolve(process.cwd(), 'public/historical-db/seasons', SEASON_ID);

function loadGz(file) {
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(SEASON_DIR, file)));
  return JSON.parse(raw.toString('utf8'));
}

function teamLeagueId(team) {
  return team.leagueId || team.league || team.competitionId;
}

const SA_LEAGUE_IDS = Object.keys(SA_LEAGUE_SLOTS);

// Build a synthetic final table: teamId `${prefix}_${pos}`, position = order.
function table(prefix, count) {
  return Array.from({ length: count }, (_, i) => ({
    teamId: `${prefix}_${i + 1}`,
    teamName: `${prefix} ${i + 1}`,
    shortName: `${prefix}${i + 1}`,
    leaguePosition: i + 1,
    points: 100 - i
  }));
}

// Combined field of both cups, for cross-competition checks.
function combinedIds(q) {
  return [...q.copaLibertadores, ...q.copaSudamericana].map(t => t.teamId);
}

let passed = 0;
const ok = (msg) => { passed++; console.log(`  ✓ ${msg}`); };

// ============================================================
console.log('1) 2008-09 Bolivia dataset is recognised as boliviaPrimera');
// ============================================================
const dsTeams = loadGz('teams.json.gz');
const dsLeagues = (() => { const l = loadGz('leagues.json.gz'); return Array.isArray(l) ? l : (l.leagues || []); })();

assert.ok(isSouthAmericanLeague('boliviaPrimera'), 'boliviaPrimera must be a South American league');
assert.ok(SA_LEAGUE_SLOTS.boliviaPrimera, 'boliviaPrimera must have SA slot config');
assert.ok(SA_LEAGUE_SLOTS.boliviaPrimera.copaLibertadores >= 2,
  'Bolivia must send more than its champion to the Libertadores');

const boliviaTeams = dsTeams.filter(t => teamLeagueId(t) === 'boliviaPrimera');
assert.ok(boliviaTeams.length >= 12, `boliviaPrimera 2008-09 must have a real pool (got ${boliviaTeams.length})`);
assert.ok(dsLeagues.some(l => l.id === 'boliviaPrimera'), 'leagues.json must declare boliviaPrimera');
ok(`boliviaPrimera recognised with ${boliviaTeams.length} teams and CL slots=${SA_LEAGUE_SLOTS.boliviaPrimera.copaLibertadores}`);

// ============================================================
console.log('2) Bolivia table positions 1/2/3 + player reactivity');
// ============================================================
// Player league only present — must still qualify (only guaranteed complete league).
const boliviaOnly = { boliviaPrimera: table('bo', 16) };
const qBol = buildSouthAmericanQualifiedTeams({
  leagueStandings: boliviaOnly,
  playerLeagueId: 'boliviaPrimera',
  allowFillers: false
});
const libIds = new Set(qBol.copaLibertadores.map(t => t.teamId));
const sudIds = new Set(qBol.copaSudamericana.map(t => t.teamId));

assert.ok(libIds.has('bo_1'), 'Bolivia champion (pos 1) → Libertadores');
assert.ok(libIds.has('bo_2'), 'Bolivia runner-up (pos 2) → Libertadores (more than champion)');
assert.ok(sudIds.has('bo_3'), 'Bolivia pos 3 → Sudamericana');
assert.ok(!libIds.has('bo_3'), 'Bolivia pos 3 must NOT be in Libertadores');
assert.ok(!sudIds.has('bo_1') && !sudIds.has('bo_2'), 'Libertadores clubs must not also be in Sudamericana');
ok('positions 1&2 → Libertadores, 3 → Sudamericana (player league alone qualifies)');

// Player reactivity: the player's cup depends on where HE finishes.
function playerCupAtPosition(pos) {
  const std = table('bo', 16);
  const playerId = std[pos - 1].teamId;
  const q = buildSouthAmericanQualifiedTeams({
    leagueStandings: { boliviaPrimera: std },
    playerLeagueId: 'boliviaPrimera',
    allowFillers: false
  });
  if (q.copaLibertadores.some(t => t.teamId === playerId)) return 'libertadores';
  if (q.copaSudamericana.some(t => t.teamId === playerId)) return 'sudamericana';
  return 'none';
}
assert.equal(playerCupAtPosition(1), 'libertadores', 'pos 1 player → Libertadores');
assert.equal(playerCupAtPosition(2), 'libertadores', 'pos 2 player → Libertadores');
assert.equal(playerCupAtPosition(3), 'sudamericana', 'pos 3 player → Sudamericana');
assert.equal(playerCupAtPosition(15), 'none', 'pos 15 player → no continental cup');
ok('player qualification is reactive to his own table position');

// ============================================================
console.log('3) Apertura/Clausura champions get guaranteed Libertadores berths');
// ============================================================
// Real-world regression guard: Paraguay 2024/2025 and Bolivia 2008 list the
// Apertura and Clausura champions in Copa Libertadores. They must claim those
// berths even if their Accumulated-table position is below the normal CL zone;
// the remaining CL/Sud slots then continue from Accumulated without duplicates.
const apclStd = table('py', 12);
apclStd[7].teamId = 'py_apertura_champion';
apclStd[7].teamName = 'Apertura Champion';
apclStd[8].teamId = 'py_clausura_champion';
apclStd[8].teamName = 'Clausura Champion';
const qApcl = buildSouthAmericanQualifiedTeams({
  leagueStandings: { paraguayPrimera: apclStd },
  playerLeagueId: 'paraguayPrimera',
  aperturaClausuraChampions: {
    paraguayPrimera: ['py_apertura_champion', 'py_clausura_champion']
  },
  allowFillers: false
});
const apclLib = new Set(qApcl.copaLibertadores.map(t => t.teamId));
const apclSud = new Set(qApcl.copaSudamericana.map(t => t.teamId));
assert.ok(apclLib.has('py_apertura_champion'), 'Apertura champion outside top aggregate positions → Libertadores');
assert.ok(apclLib.has('py_clausura_champion'), 'Clausura champion outside top aggregate positions → Libertadores');
assert.ok(apclLib.has('py_1') && apclLib.has('py_2'), 'remaining Libertadores berths still come from Accumulated');
assert.ok(apclSud.has('py_3') && apclSud.has('py_4'), 'Sudamericana starts from next accumulated teams after CL berths');
assert.ok(!apclSud.has('py_apertura_champion') && !apclSud.has('py_clausura_champion'), 'A/C champions must not duplicate into Sudamericana');
ok('Apertura and Clausura champions are guaranteed Libertadores; remaining slots use Accumulated');

// ============================================================
console.log('4) Field caps, no duplicates within a cup, none shared across cups');
// ============================================================
const fullStandings = {};
for (const lid of SA_LEAGUE_IDS) fullStandings[lid] = table(lid, 18);
const fullFiller = SA_LEAGUE_IDS.flatMap(lid => table(lid, 18).map(r => ({
  id: r.teamId, name: r.teamName, league: lid, reputation: 60
})));
const qFull = buildSouthAmericanQualifiedTeams({
  leagueStandings: fullStandings,
  fillerPool: fullFiller,
  playerLeagueId: 'boliviaPrimera'
});
const saState = initializeSACompetitions(qFull);

for (const [compId, cfg] of [['copaLibertadores', COPA_LIBERTADORES], ['copaSudamericana', COPA_SUDAMERICANA]]) {
  const comp = saState.competitions[compId];
  assert.ok(comp, `${compId} must initialise`);
  assert.ok(comp.teams.length <= cfg.teamsCount, `${compId} must have <= ${cfg.teamsCount} teams (got ${comp.teams.length})`);
  assert.equal(comp.teams.length, cfg.teamsCount, `${compId} must fill to ${cfg.teamsCount}`);
  const ids = comp.teams.map(t => t.teamId);
  assert.equal(new Set(ids).size, ids.length, `${compId} must have no duplicate team ids`);
}
const libField = new Set(saState.competitions.copaLibertadores.teams.map(t => t.teamId));
const sudField = saState.competitions.copaSudamericana.teams.map(t => t.teamId);
assert.ok(!sudField.some(id => libField.has(id)), 'no club may appear in BOTH Libertadores and Sudamericana');
ok('both cups = 32 teams, unique within each, disjoint across cups');

// No country with slots is silently dropped by the global cap.
for (const lid of ['boliviaPrimera', 'venezuelaPrimera']) {
  const present = [...libField, ...sudField].some(id => id.startsWith(`${lid}_`));
  assert.ok(present, `${lid} must not be silently dropped by the field cap`);
}
ok('Bolivia and Venezuela are represented (not dropped by cap ordering)');

// ============================================================
console.log('5) Historical 2008-09 draw uses ONLY historical clubs');
// ============================================================
const historicalIds = new Set(dsTeams.map(t => t.id || t.teamId).filter(Boolean));
const histStandings = {};
const histFiller = [];
for (const lid of SA_LEAGUE_IDS) {
  const teams = dsTeams.filter(t => teamLeagueId(t) === lid);
  if (!teams.length) continue;
  histStandings[lid] = teams.map((t, i) => ({
    teamId: t.id || t.teamId,
    teamName: t.name || t.teamName,
    shortName: t.shortName || '',
    leaguePosition: i + 1
  }));
  histFiller.push(...teams.map(t => ({ id: t.id || t.teamId, name: t.name, league: lid, reputation: t.reputation || 60 })));
}
const qHist = buildSouthAmericanQualifiedTeams({
  leagueStandings: histStandings,
  fillerPool: histFiller,
  playerLeagueId: 'boliviaPrimera'
});
const contaminators = combinedIds(qHist).filter(id => !historicalIds.has(id));
assert.deepEqual(contaminators, [], `historical draw must contain only 2008-09 clubs (found foreign: ${contaminators.slice(0, 5).join(', ')})`);
// And the Bolivian player league really did contribute its top finishers.
const boliviaIdSet = new Set(boliviaTeams.map(t => t.id || t.teamId));
assert.ok(combinedIds(qHist).some(id => boliviaIdSet.has(id)), 'historical Bolivian clubs must reach the draw');
ok(`no static contamination: all ${combinedIds(qHist).length} drawn clubs belong to the 2008-09 dataset`);

// ============================================================
console.log('6) Qualification follows FINAL position, not reputation / reset order');
// ============================================================
// Build a Bolivia table whose table order is the INVERSE of reputation:
// the champion (pos 1) is the lowest-reputation club, the last-placed the
// highest. If qualification looked at reputation (a reset/new-season proxy)
// the champion would be excluded. It must qualify by position.
const invStd = table('bo', 16);
const allTeamsMap = {};
invStd.forEach((row, i) => {
  // pos 1 → rep 1 (worst), pos 16 → rep 16 (best)
  allTeamsMap[row.teamId] = { id: row.teamId, name: row.teamName, reputation: i + 1 };
});
const qInv = buildSouthAmericanQualifiedTeams({
  leagueStandings: { boliviaPrimera: invStd },
  allTeamsMap,
  playerLeagueId: 'boliviaPrimera',
  allowFillers: false
});
const invLib = new Set(qInv.copaLibertadores.map(t => t.teamId));
assert.ok(invLib.has('bo_1'), 'table champion must qualify for Libertadores even with the lowest reputation');
assert.ok(!combinedIds(qInv).includes('bo_16'), 'highest-reputation but last-placed club must NOT qualify');
ok('qualification is driven by final table position, not reputation');

console.log(`\n✅ south american qualification audit OK (${passed} checks)`);
