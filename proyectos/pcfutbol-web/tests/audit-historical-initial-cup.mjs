// ============================================================
// AUDIT — Historical initial domestic cup bootstrap
// ============================================================
// Verifies a newly-started historical Spanish career immediately creates a
// Copa bracket from the active historical universe, not 2025/26 static teams.
//
// Run: npm run audit:historical-initial-cup
// ============================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.fetch = async () => { throw new Error('network disabled in audit'); };

const {
  buildHistoricalUniverseFromDataset,
  initializeOtherLeaguesFromUniverse,
  getTeamsForLeague,
  toGameLeagueId,
} = await import('../src/data/activeSeasonUniverse.js');
const { initializeLeague } = await import('../src/game/leagueEngine.js');
const { buildSeasonCalendar } = await import('../src/game/europeanCompetitions.js');
const { getCupTeams, generateCupBracket } = await import('../src/game/cupSystem.js');
const { LEAGUE_CONFIG } = await import('../src/game/multiLeagueEngine.js');
const { buildHistoricalLoadedCupBootstrap, buildCurrentLoadedCupBootstrap } = await import('../src/game/cupBootstrap.js');

const SEASONS_DIR = new URL('../public/historical-db/seasons/', import.meta.url);

function readSeasonFile(seasonId, name) {
  const base = new URL(`${seasonId}/`, SEASONS_DIR);
  const plain = new URL(`${name}.json`, base);
  if (fs.existsSync(plain)) return JSON.parse(fs.readFileSync(plain, 'utf8'));
  const gz = new URL(`${name}.json.gz`, base);
  if (fs.existsSync(gz)) return JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8'));
  throw new Error(`Dataset file not found: ${seasonId}/${name}.json(.gz)`);
}

function loadSeasonDatasetFromDisk(seasonId) {
  const teams = readSeasonFile(seasonId, 'teams');
  const leagues = readSeasonFile(seasonId, 'leagues');
  const players = readSeasonFile(seasonId, 'players');
  const squads = readSeasonFile(seasonId, 'squads');
  const playersById = new Map(players.map(player => [player.id, player]));
  const squadsByTeam = new Map();
  for (const row of squads) {
    if (!squadsByTeam.has(row.teamId)) squadsByTeam.set(row.teamId, []);
    squadsByTeam.get(row.teamId).push(row);
  }
  return {
    teams: teams.map(team => ({
      ...team,
      players: (squadsByTeam.get(team.id) || []).map(row => playersById.get(row.playerId)).filter(Boolean),
    })),
    leagues,
    seasonInfo: { id: seasonId, label: seasonId, startYear: Number(seasonId.slice(0, 4)) },
  };
}

function tableFromTeams(teams) {
  return [...teams]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((team, index) => ({
      teamId: team.id || team.teamId,
      teamName: team.name || team.teamName,
      shortName: team.shortName || '',
      reputation: team.reputation || team.avgOverall || team.overall || 70,
      overall: team.overall || team.avgOverall || 70,
      leaguePosition: index + 1,
    }));
}

function assertHistoricalSpanishCup(seasonId) {
  const dataset = loadSeasonDatasetFromDisk(seasonId);
  const universe = buildHistoricalUniverseFromDataset(dataset, dataset.seasonInfo);
  const playerGameLeagueId = toGameLeagueId('laliga');
  const laligaTeams = getTeamsForLeague(universe, playerGameLeagueId);
  const betis = laligaTeams.find(team => /betis/i.test(team.name || ''));
  assert.ok(betis, `${seasonId}: Real Betis missing from historical LaLiga`);
  assert.ok(String(betis.id).startsWith('tm-team-'), `${seasonId}: Betis must use Transfermarkt team id`);

  const leagueData = initializeLeague(laligaTeams, betis.id);
  leagueData.table = tableFromTeams(laligaTeams);
  const otherLeagues = initializeOtherLeaguesFromUniverse(universe, playerGameLeagueId);

  const cupData = getCupTeams(playerGameLeagueId, betis, otherLeagues, leagueData.table, {
    historical: true,
    playerGameLeagueId,
    historicalTeams: dataset.teams,
    universeEntries: universe.entries,
    allowStaticFallback: false,
  });

  assert.ok(cupData, `${seasonId}: cupData not created`);
  assert.equal(cupData.country, 'España', `${seasonId}: Spanish game league must resolve Copa config`);
  assert.ok(cupData.teams.length >= 16, `${seasonId}: expected >=16 cup teams, got ${cupData.teams.length}`);
  assert.ok(cupData.teams.some(team => team.teamId === betis.id), `${seasonId}: player team not included`);

  const tmTeams = cupData.teams.filter(team => String(team.teamId).startsWith('tm-team-'));
  assert.ok(tmTeams.length / cupData.teams.length >= 0.9,
    `${seasonId}: historical cup contaminated by non-historical ids (${tmTeams.length}/${cupData.teams.length})`);
  assert.ok(cupData.teams.every(team => (team.players || []).length > 0),
    `${seasonId}: historical cup entrants should carry active-season players`);

  const bracket = generateCupBracket(cupData.teams, betis.id);
  assert.ok(bracket?.rounds?.length > 0, `${seasonId}: bracket has no rounds`);
  assert.ok(bracket.rounds.some(round => round.matches?.some(match => match.homeTeam || match.awayTeam)),
    `${seasonId}: bracket has no populated match`);

  const cupRounds = bracket.rounds.length;
  const totalLeagueMDs = Math.max(...leagueData.fixtures.map(fixture => fixture.week));
  const calendar = buildSeasonCalendar(totalLeagueMDs, { hasEuropean: true, cupRounds });
  assert.equal(calendar.cupWeeks.length, cupRounds,
    `${seasonId}: cupWeeks must match cup rounds`);

  return { seasonId, teams: cupData.teams.length, rounds: cupRounds, playerTeamId: betis.id };
}

function assertStrippedLoadedHistoricalSave(seasonId) {
  const dataset = loadSeasonDatasetFromDisk(seasonId);
  const universe = buildHistoricalUniverseFromDataset(dataset, dataset.seasonInfo);
  const playerGameLeagueId = toGameLeagueId('laliga');
  const laligaTeams = getTeamsForLeague(universe, playerGameLeagueId);
  const betis = laligaTeams.find(team => /betis/i.test(team.name || ''));
  assert.ok(betis, `${seasonId}: Real Betis missing from historical LaLiga`);
  assert.ok(String(betis.id).startsWith('tm-team-'), `${seasonId}: Betis must use Transfermarkt team id`);

  const leagueData = initializeLeague(laligaTeams, betis.id);
  leagueData.table = tableFromTeams(laligaTeams);
  const strippedLoadedState = {
    loaded: true,
    gameStarted: true,
    gameMode: 'career',
    saveId: 'audit-stripped-historical-betis',
    currentSeason: 1,
    currentWeek: 2,
    historicalDatabase: true,
    databaseSeasonId: seasonId,
    historicalDatabaseLabel: seasonId,
    careerStartSeason: Number(seasonId.slice(0, 4)),
    playerLeagueId: 'laliga',
    leagueId: 'laliga',
    teamId: betis.id,
    team: betis,
    leagueTable: leagueData.table,
    fixtures: leagueData.fixtures,
    otherLeagues: {},
    cupCompetition: null,
    europeanCalendar: null,
  };

  const bootstrap = buildHistoricalLoadedCupBootstrap(strippedLoadedState, dataset);
  assert.ok(bootstrap?.cupCompetition, `${seasonId}: stripped save did not rebuild cup bracket`);
  assert.ok(bootstrap.shouldReplaceOtherLeagues, `${seasonId}: stripped save should replace missing/static otherLeagues`);
  assert.ok(bootstrap.europeanCalendar, `${seasonId}: stripped save did not rebuild season calendar`);
  assert.ok(bootstrap.shouldRemapFixtures, `${seasonId}: early stripped save should remap sequential fixtures`);

  const cupTeams = bootstrap.cupData.teams;
  assert.ok(cupTeams.length >= 16, `${seasonId}: expected >=16 cup teams, got ${cupTeams.length}`);
  assert.ok(cupTeams.some(team => team.teamId === betis.id), `${seasonId}: Betis missing from loaded-save Copa`);
  assert.ok(cupTeams.every(team => String(team.teamId).startsWith('tm-team-')),
    `${seasonId}: loaded-save Copa must use historical Transfermarkt ids`);
  assert.ok(bootstrap.cupCompetition.rounds.length > 0, `${seasonId}: loaded-save bracket has no rounds`);
  assert.equal(bootstrap.europeanCalendar.cupWeeks.length, bootstrap.cupCompetition.rounds.length,
    `${seasonId}: loaded-save cupWeeks must match cup rounds`);

  return {
    seasonId,
    teams: cupTeams.length,
    rounds: bootstrap.cupCompetition.rounds.length,
    playerTeamId: betis.id,
  };
}

function assertCurrentSeasonSanity() {
  const teams = LEAGUE_CONFIG.laliga.getTeams();
  if (!teams.length) return false;
  const player = teams.find(team => /betis/i.test(team.name || team.id)) || teams[0];
  const leagueData = initializeLeague(teams, player.id);
  const cupData = getCupTeams('laliga', player, {}, leagueData.table);
  assert.ok(cupData?.teams?.length >= teams.length, 'current-season Copa should still bootstrap');
  const bracket = generateCupBracket(cupData.teams, player.id);
  assert.ok(bracket?.rounds?.length > 0, 'current-season Copa bracket should still generate');
  const loadedBootstrap = buildCurrentLoadedCupBootstrap({
    loaded: true,
    gameStarted: true,
    gameMode: 'career',
    teamId: player.id,
    team: player,
    playerLeagueId: 'laliga',
    leagueId: 'laliga',
    leagueTable: leagueData.table,
    fixtures: leagueData.fixtures,
    otherLeagues: {},
    cupCompetition: null,
    europeanCalendar: null,
    currentWeek: 1,
  });
  assert.ok(loadedBootstrap?.cupCompetition?.rounds?.length > 0,
    'current-season stripped save should rebuild Copa bracket');
  return true;
}

console.log('AUDIT: historical initial domestic cup bootstrap\n');
const preferredSeason = fs.existsSync(new URL('2005-06/teams.json', SEASONS_DIR)) ? '2005-06' : '2007-08';
const result = assertHistoricalSpanishCup(preferredSeason);
console.log(`  historical ${result.seasonId}: ${result.teams} Copa teams, ${result.rounds} rounds, player ${result.playerTeamId}`);
const loadedResult = assertStrippedLoadedHistoricalSave(preferredSeason);
console.log(`  stripped loaded save ${loadedResult.seasonId}: ${loadedResult.teams} Copa teams, ${loadedResult.rounds} rounds`);
if (assertCurrentSeasonSanity()) {
  console.log('  current season sanity: Copa bracket still generates');
} else {
  console.log('  current season sanity: skipped (static app data not preloaded in Node audit)');
}
console.log('\nAUDIT PASSED — historical initial Copa bootstrap is active.');
