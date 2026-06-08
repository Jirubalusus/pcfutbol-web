import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { SA_LEAGUE_SLOTS, buildSouthAmericanQualifiedTeams } from '../src/game/southAmericanCompetitions.js';
import { initializeSACompetitions } from '../src/game/southAmericanSeason.js';
import { getEuropeanSpotsForLeague, getSeasonOutcomeFromSpots } from '../src/game/seasonManager.js';
import { getCupTeams, generateCupBracket } from '../src/game/cupSystem.js';
import { buildCurrentLoadedCupBootstrap } from '../src/game/cupBootstrap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const readTeams = (leagueId) => JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', `${leagueId}.json`), 'utf8'));
const idOf = (team) => team.id || team.teamId;
const nameOf = (team) => team.name || team.teamName || idOf(team);
const tableFromTeams = (teams) => teams.map((team, index) => ({
  teamId: idOf(team),
  teamName: nameOf(team),
  points: (teams.length - index) * 3,
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  goalDifference: 0,
  reputation: team.reputation || team.overall || 70,
  players: team.players || [],
}));

const allSAIds = ['argentinaPrimera','brasileiraoA','colombiaPrimera','chilePrimera','uruguayPrimera','ecuadorLigaPro','paraguayPrimera','peruLiga1','boliviaPrimera','venezuelaPrimera'];
const teamsByLeague = Object.fromEntries(allSAIds.map((leagueId) => [leagueId, readTeams(leagueId)]));
const standings = Object.fromEntries(Object.entries(teamsByLeague).map(([leagueId, teams]) => [leagueId, tableFromTeams(teams)]));
const allTeamsMap = Object.fromEntries(Object.values(teamsByLeague).flat().map((team) => [idOf(team), team]));

function idsIn(comp) {
  return new Set((comp?.teams || []).map((team) => team.teamId));
}

function assertCurrentLeagueZones(leagueId, expectedLib, expectedSud) {
  const slots = SA_LEAGUE_SLOTS[leagueId];
  assert.equal(slots.copaLibertadores, expectedLib, `${leagueId} Libertadores slots`);
  assert.equal(slots.copaSudamericana, expectedSud, `${leagueId} Sudamericana slots`);

  const spots = getEuropeanSpotsForLeague(leagueId);
  assert.deepEqual(spots.libertadores, Array.from({ length: expectedLib }, (_, i) => i + 1), `${leagueId} UI/outcome Libertadores positions`);
  assert.deepEqual(spots.sudamericana, Array.from({ length: expectedSud }, (_, i) => expectedLib + i + 1), `${leagueId} UI/outcome Sudamericana positions`);
  assert.equal(getSeasonOutcomeFromSpots(1, leagueId).libertadores, true, `${leagueId} 1st qualifies Libertadores`);
  assert.equal(getSeasonOutcomeFromSpots(expectedLib, leagueId).libertadores, true, `${leagueId} ${expectedLib}th qualifies Libertadores`);
  assert.equal(getSeasonOutcomeFromSpots(expectedLib + 1, leagueId).sudamericana, true, `${leagueId} first post-Libertadores position qualifies Sudamericana`);
}

console.log('AUDIT: current 2025/26 South America zones, Copa, and rollover');

assertCurrentLeagueZones('boliviaPrimera', 2, 3);
assertCurrentLeagueZones('paraguayPrimera', 4, 4);
console.log('  ✓ Bolivia/Paraguay current slots feed UI/outcome source of truth');

for (const leagueId of ['boliviaPrimera', 'paraguayPrimera']) {
  const table = standings[leagueId];
  const playerTeam = teamsByLeague[leagueId][0];
  const cupData = getCupTeams(leagueId, playerTeam, {}, table, { playerGameLeagueId: leagueId, allowStaticFallback: true });
  assert.ok(cupData, `${leagueId} cup data exists`);
  assert.ok(cupData.teams.length >= table.length, `${leagueId} cup includes current league teams`);
  assert.ok(cupData.teams.some((team) => team.teamId === idOf(playerTeam)), `${leagueId} cup includes player team`);
  const cup = generateCupBracket(cupData.teams, idOf(playerTeam));
  assert.ok(cup?.rounds?.length > 0, `${leagueId} cup bracket has rounds`);
  assert.ok(cup.rounds[0].matches.length > 0, `${leagueId} cup first round has matches`);

  const bootstrap = buildCurrentLoadedCupBootstrap({
    loaded: true,
    gameStarted: true,
    team: playerTeam,
    teamId: idOf(playerTeam),
    playerLeagueId: leagueId,
    leagueId,
    leagueTable: table,
    fixtures: [],
    otherLeagues: {},
    currentWeek: 1,
    currentSeason: 1,
    databaseSeasonId: 'current',
  });
  assert.ok(bootstrap?.cupCompetition?.rounds?.length > 0, `${leagueId} loaded/current bootstrap creates cupCompetition`);
  assert.ok(bootstrap.cupCompetition.rounds[0].matches.length > 0, `${leagueId} loaded/current bootstrap has first-round cup matches`);
}
console.log('  ✓ Current Bolivia/Paraguay domestic Copa bootstraps a playable bracket');

const season1 = buildSouthAmericanQualifiedTeams({ leagueStandings: standings, allTeamsMap, playerLeagueId: 'boliviaPrimera' });
const saSeason1 = initializeSACompetitions(season1);
assert.equal(saSeason1.initialized, true, 'SA season 1 initialized');
assert.ok(saSeason1.competitions.copaLibertadores?.teams.length > 0, 'Libertadores season 1 has teams');
assert.ok(saSeason1.competitions.copaSudamericana?.teams.length > 0, 'Sudamericana season 1 has teams');

// Simulate a new season with a changed final table: reverse Bolivia/Paraguay.
const nextStandings = {
  ...standings,
  boliviaPrimera: [...standings.boliviaPrimera].reverse(),
  paraguayPrimera: [...standings.paraguayPrimera].reverse(),
};
const season2 = buildSouthAmericanQualifiedTeams({ leagueStandings: nextStandings, allTeamsMap, playerLeagueId: 'boliviaPrimera' });
const saSeason2 = initializeSACompetitions(season2);
assert.equal(saSeason2.initialized, true, 'SA rollover season initialized');

const lib1 = idsIn(saSeason1.competitions.copaLibertadores);
const lib2 = idsIn(saSeason2.competitions.copaLibertadores);
const sud2 = idsIn(saSeason2.competitions.copaSudamericana);
const newBoliviaTop = nextStandings.boliviaPrimera.slice(0, 2).map((team) => team.teamId);
for (const id of newBoliviaTop) assert.ok(lib2.has(id), `new Bolivia top-2 ${id} enters rollover Libertadores`);
assert.notDeepEqual([...lib1].sort(), [...lib2].sort(), 'rollover Libertadores field changes when final tables change');
for (const id of lib2) assert.equal(sud2.has(id), false, `team ${id} is not duplicated across SA cups`);
console.log('  ✓ Rollover rebuilds Libertadores/Sudamericana from new final tables without stale entrants/duplicates');

console.log('\nAUDIT PASSED — current 2025/26 Bolivia/Paraguay zones, Copa bootstrap, and SA rollover are covered.');
