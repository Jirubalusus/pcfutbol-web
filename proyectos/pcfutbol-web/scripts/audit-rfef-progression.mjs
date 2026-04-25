import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const playerTeamId = 'recreativo';

globalThis.fetch = async (url) => {
  if (url !== '/data/all-teams.json') throw new Error(`Unexpected fetch URL: ${url}`);
  const text = await fs.readFile(path.join(repoRoot, 'public/data/all-teams.json'), 'utf8');
  return { ok: true, text: async () => text };
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

const server = await createServer({
  root: repoRoot,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error'
});

const teamsFirestore = await server.ssrLoadModule('/src/data/teamsFirestore.js');
const groupLeagueEngine = await server.ssrLoadModule('/src/game/groupLeagueEngine.js');
const multiLeagueEngine = await server.ssrLoadModule('/src/game/multiLeagueEngine.js');
const playoffEngine = await server.ssrLoadModule('/src/game/playoffEngine.js');
const gameContext = await server.ssrLoadModule('/src/context/GameContext.jsx');

const {
  loadAllData,
  getPrimeraRfefTeams,
  getPrimeraRfefGroups,
  getSegundaRfefTeams,
  getSegundaRfefGroups
} = teamsFirestore;
const { initializeGroupLeague } = groupLeagueEngine;
const { initializeOtherLeagues, initializeNewSeasonWithPromotions } = multiLeagueEngine;
const {
  generateAllGroupPlayoffs,
  simulateAllGroupPlayoffs,
  getNextPlayoffMatch,
  advanceGroupPlayoffBracket,
  autoResolvePlayoffUntilPlayerMatch
} = playoffEngine;
const { gameReducer, initialState } = gameContext;

const leagueMeta = {
  primeraRFEF: {
    groups: getPrimeraRfefGroups,
    teams: getPrimeraRfefTeams,
    groupIds: ['grupo1', 'grupo2'],
    promotedTo: 'segunda',
    playoffPayloadKey: 'primeraRFEFPlayoffBrackets'
  },
  segundaRFEF: {
    groups: getSegundaRfefGroups,
    teams: getSegundaRfefTeams,
    groupIds: ['grupo1', 'grupo2', 'grupo3', 'grupo4', 'grupo5'],
    promotedTo: 'primeraRFEF',
    playoffPayloadKey: 'segundaRFEFPlayoffBrackets'
  }
};

const summary = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function scenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    summary.push({ name, ok: true, ms: Date.now() - started });
    console.log(`PASS ${name}`);
  } catch (error) {
    summary.push({ name, ok: false, ms: Date.now() - started, error });
    console.error(`FAIL ${name}`);
    console.error(`     ${error.message}`);
  }
}

function normalizeGroups(rawGroups, groupIds) {
  return Object.fromEntries(groupIds.map(groupId => [
    groupId,
    rawGroups[groupId]?.teams || rawGroups[groupId] || []
  ]));
}

function injectPlayerIntoFirstGroup(groupsData, leagueId, teamOverride = null) {
  const teams = leagueMeta[leagueId].teams();
  const playerTeam = teamOverride
    || teams.find(team => team.id === playerTeamId)
    || getSegundaRfefTeams().find(team => team.id === playerTeamId);
  assert(playerTeam, `Missing ${playerTeamId} team data for ${leagueId}`);

  const entries = Object.entries(groupsData);
  const currentGroup = entries.find(([, teamsInGroup]) => teamsInGroup.some(team => team.id === playerTeamId))?.[0];
  const targetGroup = currentGroup || entries[0]?.[0];
  assert(targetGroup, `No groups available for ${leagueId}`);

  const nextGroups = {};
  for (const [groupId, teamsInGroup] of entries) {
    let nextTeams = teamsInGroup.filter(team => team.id !== playerTeamId);
    if (groupId === targetGroup) {
      nextTeams = [playerTeam, ...nextTeams].slice(0, teamsInGroup.length || 18);
    }
    nextGroups[groupId] = nextTeams;
  }
  return nextGroups;
}

function rankTableWithPlayerAt(table, teamId, position) {
  const entries = table.map(entry => ({ ...entry }));
  const player = entries.find(entry => entry.teamId === teamId);
  assert(player, `Missing ${teamId} in table`);

  const others = entries.filter(entry => entry.teamId !== teamId);
  const ordered = [
    ...others.slice(0, position - 1),
    player,
    ...others.slice(position - 1)
  ];

  return ordered.map((entry, index) => ({
    ...entry,
    played: Math.max(1, (ordered.length - 1) * 2),
    won: Math.max(0, ordered.length - index),
    drawn: 0,
    lost: Math.max(0, index),
    goalsFor: 80 - index,
    goalsAgainst: 20 + index,
    goalDifference: 60 - (index * 2),
    points: (ordered.length - index) * 3
  }));
}

function makeGroupState(leagueId, playerPosition, teamOverride = null) {
  const meta = leagueMeta[leagueId];
  const groupsData = injectPlayerIntoFirstGroup(
    normalizeGroups(meta.groups(), meta.groupIds),
    leagueId,
    teamOverride
  );
  const groupLeague = initializeGroupLeague(groupsData, playerTeamId);
  const playerGroupId = groupLeague.playerGroup;
  assert(playerGroupId, `${playerTeamId} group was not found in ${leagueId}`);

  const playerGroup = groupLeague.groups[playerGroupId];
  playerGroup.table = rankTableWithPlayerAt(playerGroup.table, playerTeamId, playerPosition);

  const otherLeagues = initializeOtherLeagues(leagueId, playerGroupId);
  if (otherLeagues[leagueId]?.groups) {
    otherLeagues[leagueId].groups = Object.fromEntries(
      Object.entries(groupLeague.groups).filter(([groupId]) => groupId !== playerGroupId)
    );
    otherLeagues[leagueId].playerGroup = playerGroupId;
  }

  const team = teamOverride
    || meta.teams().find(team => team.id === playerTeamId)
    || getSegundaRfefTeams().find(team => team.id === playerTeamId);
  assert(team, `${playerTeamId} team data was not found`);

  return {
    playerLeagueId: leagueId,
    leagueId,
    playerGroupId,
    teamId: playerTeamId,
    team,
    leagueTable: playerGroup.table,
    fixtures: playerGroup.fixtures,
    otherLeagues
  };
}

function makeWinResult(match, winnerId) {
  const loser = match.homeTeam.teamId === winnerId ? match.awayTeam : match.homeTeam;
  const homeWon = match.homeTeam.teamId === winnerId;
  return {
    homeScore: homeWon ? 2 : 0,
    awayScore: homeWon ? 0 : 2,
    finalHomeScore: homeWon ? 2 : 0,
    finalAwayScore: homeWon ? 0 : 2,
    extraTime: false,
    penalties: null,
    winnerId,
    winnerName: winnerId,
    loserName: loser.teamName || loser.teamId,
    events: [],
    homeTeamName: match.homeTeam.teamName || match.homeTeam.teamId,
    awayTeamName: match.awayTeam.teamName || match.awayTeam.teamId
  };
}

function completePlayerGroupPlayoff(state, playerWins = true) {
  const fullGroups = {
    ...(state.otherLeagues[state.playerLeagueId]?.groups || {}),
    [state.playerGroupId]: {
      table: state.leagueTable,
      fixtures: state.fixtures
    }
  };
  const groupLeagueData = {
    isGroupLeague: true,
    groups: fullGroups,
    playerGroup: state.playerGroupId
  };

  const { brackets } = generateAllGroupPlayoffs(groupLeagueData, leagueMeta[state.playerLeagueId].teams(), playerTeamId);
  const simulated = simulateAllGroupPlayoffs(brackets, playerTeamId);
  let playerBracket = simulated.playerBracket;
  assert(playerBracket, 'Player playoff bracket was not created');

  const semi = getNextPlayoffMatch(playerTeamId, playerBracket);
  assert(semi, 'Player semifinal was not found');
  playerBracket = advanceGroupPlayoffBracket(playerBracket, semi.id, makeWinResult(semi, playerTeamId));
  playerBracket = autoResolvePlayoffUntilPlayerMatch(playerBracket, playerTeamId);

  const final = getNextPlayoffMatch(playerTeamId, playerBracket);
  assert(final?.id?.endsWith('_final'), 'Winning the semifinal did not create a playable final');
  const finalWinner = playerWins
    ? playerTeamId
    : (final.homeTeam.teamId === playerTeamId ? final.awayTeam.teamId : final.homeTeam.teamId);
  playerBracket = advanceGroupPlayoffBracket(playerBracket, final.id, makeWinResult(final, finalWinner));

  const completed = {
    ...simulated.brackets,
    [state.playerGroupId]: playerBracket
  };
  assert(playerBracket.phase === 'completed', 'Player playoff did not complete');
  assert(playerWins === (playerBracket.winner === playerTeamId), 'Unexpected player playoff winner');
  return completed;
}

function initializeNextSeason(state, rfefPlayoffBrackets = null) {
  const payload = rfefPlayoffBrackets
    ? { [leagueMeta[state.playerLeagueId].playoffPayloadKey]: rfefPlayoffBrackets }
    : {};
  return initializeNewSeasonWithPromotions(state, playerTeamId, null, payload);
}

function assertPlayablePlayerLeague(result, expectedLeagueId, label = expectedLeagueId) {
  assert(result.newPlayerLeagueId === expectedLeagueId, `${label}: expected ${expectedLeagueId}, got ${result.newPlayerLeagueId}`);
  assert(Array.isArray(result.playerLeague.table) && result.playerLeague.table.length > 0, `${label}: player table is empty`);
  assert(Array.isArray(result.playerLeague.fixtures) && result.playerLeague.fixtures.length > 0, `${label}: player fixtures are empty`);
  assert(result.playerLeague.table.some(entry => entry.teamId === playerTeamId), `${label}: table does not include ${playerTeamId}`);
  assert(result.playerLeague.fixtures.some(f => f.homeTeam === playerTeamId || f.awayTeam === playerTeamId), `${label}: fixtures do not include ${playerTeamId}`);
  if (['primeraRFEF', 'segundaRFEF'].includes(expectedLeagueId)) {
    assert(result.playerLeague.playerGroup, `${label}: player group was not assigned`);
    assert(result.otherLeagues[expectedLeagueId]?.playerGroup === result.playerLeague.playerGroup, `${label}: otherLeagues lost player group metadata`);
  }
}

function makeReducerReadyState(sourceState) {
  return {
    ...initialState,
    gameStarted: true,
    currentSeason: sourceState.currentSeason || 1,
    currentWeek: 34,
    teamId: playerTeamId,
    team: sourceState.team,
    playerLeagueId: sourceState.playerLeagueId,
    leagueId: sourceState.leagueId,
    playerGroupId: sourceState.playerGroupId,
    leagueTable: sourceState.leagueTable,
    fixtures: sourceState.fixtures,
    otherLeagues: sourceState.otherLeagues,
    leagueTeams: [sourceState.team],
    activeLoans: [],
    messages: [],
    lineup: {},
    convocados: []
  };
}

function applyStartNewSeason(sourceState, newSeasonData, label) {
  const expectedSeason = (sourceState.currentSeason || 1) + 1;
  const nextState = gameReducer(makeReducerReadyState(sourceState), {
    type: 'START_NEW_SEASON',
    payload: {
      seasonResult: { position: 1, promotion: newSeasonData.newPlayerLeagueId !== sourceState.playerLeagueId },
      objectiveRewards: { netResult: 0 },
      europeanBonus: 0,
      preseasonMatches: [],
      moneyChange: 0,
      newFixtures: newSeasonData.playerLeague.fixtures,
      newTable: newSeasonData.playerLeague.table,
      newObjectives: [],
      newPlayerLeagueId: newSeasonData.newPlayerLeagueId,
      newPlayerGroupId: newSeasonData.playerLeague.playerGroup || null,
      europeanCalendar: null
    }
  });

  assert(nextState.currentSeason === expectedSeason, `${label}: START_NEW_SEASON did not increment season`);
  assert(nextState.currentWeek === 1, `${label}: START_NEW_SEASON did not reset week`);
  assert(nextState.playerLeagueId === newSeasonData.newPlayerLeagueId, `${label}: START_NEW_SEASON did not atomically set playerLeagueId`);
  assert(nextState.leagueId === newSeasonData.newPlayerLeagueId, `${label}: START_NEW_SEASON did not atomically set leagueId`);
  assert(nextState.playerGroupId === (newSeasonData.playerLeague.playerGroup || null), `${label}: START_NEW_SEASON did not atomically set playerGroupId`);
  assert(nextState.leagueTable.some(entry => entry.teamId === playerTeamId), `${label}: reducer table lost ${playerTeamId}`);
  assert(nextState.fixtures.some(f => f.homeTeam === playerTeamId || f.awayTeam === playerTeamId), `${label}: reducer fixtures lost ${playerTeamId}`);
  return nextState;
}

assert(await loadAllData(), 'Team data did not load successfully');

await scenario('Segunda RFEF direct champion promotion creates playable Primera RFEF season', () => {
  const state = makeGroupState('segundaRFEF', 1);
  const next = initializeNextSeason(state);
  assertPlayablePlayerLeague(next, 'primeraRFEF', 'Segunda RFEF direct promotion');
  assert(Object.keys(next.otherLeagues.primeraRFEF?.groups || {}).length > 0, 'Current Primera RFEF non-player groups were not preserved');
  applyStartNewSeason(state, next, 'Segunda RFEF direct promotion');
});

await scenario('Segunda RFEF playoff winner advances semifinal to final and promotes', () => {
  const state = makeGroupState('segundaRFEF', 2);
  const completedPlayoffs = completePlayerGroupPlayoff(state, true);
  const next = initializeNextSeason(state, completedPlayoffs);
  assertPlayablePlayerLeague(next, 'primeraRFEF', 'Segunda RFEF playoff promotion');
  applyStartNewSeason(state, next, 'Segunda RFEF playoff promotion');
});

await scenario('Segunda RFEF playoff final loss stays in Segunda RFEF with a fresh season', () => {
  const state = makeGroupState('segundaRFEF', 2);
  const completedPlayoffs = completePlayerGroupPlayoff(state, false);
  const next = initializeNextSeason(state, completedPlayoffs);
  assertPlayablePlayerLeague(next, 'segundaRFEF', 'Segunda RFEF playoff loss');
  applyStartNewSeason(state, next, 'Segunda RFEF playoff loss');
});

await scenario('Segunda RFEF mid-table finish stays in division with standings and fixtures', () => {
  const state = makeGroupState('segundaRFEF', 8);
  const next = initializeNextSeason(state);
  assertPlayablePlayerLeague(next, 'segundaRFEF', 'Segunda RFEF survival');
  applyStartNewSeason(state, next, 'Segunda RFEF survival');
});

await scenario('Primera RFEF direct champion promotion creates playable Segunda season', () => {
  const state = makeGroupState('primeraRFEF', 1);
  const next = initializeNextSeason(state);
  assertPlayablePlayerLeague(next, 'segunda', 'Primera RFEF direct promotion');
  applyStartNewSeason(state, next, 'Primera RFEF direct promotion');
});

await scenario('Primera RFEF playoff winner promotes to Segunda', () => {
  const state = makeGroupState('primeraRFEF', 2);
  const completedPlayoffs = completePlayerGroupPlayoff(state, true);
  const next = initializeNextSeason(state, completedPlayoffs);
  assertPlayablePlayerLeague(next, 'segunda', 'Primera RFEF playoff promotion');
  applyStartNewSeason(state, next, 'Primera RFEF playoff promotion');
});

await scenario('Primera RFEF safe finish rolls over in Primera RFEF', () => {
  const state = makeGroupState('primeraRFEF', 7);
  const next = initializeNextSeason(state);
  assertPlayablePlayerLeague(next, 'primeraRFEF', 'Primera RFEF survival');
  applyStartNewSeason(state, next, 'Primera RFEF survival');
});

await scenario('Primera RFEF relegation drops to playable Segunda RFEF season', () => {
  const state = makeGroupState('primeraRFEF', 18);
  const next = initializeNextSeason(state);
  assertPlayablePlayerLeague(next, 'segundaRFEF', 'Primera RFEF relegation');
  applyStartNewSeason(state, next, 'Primera RFEF relegation');
});

await scenario('Multiple-season chain: Segunda RFEF to Primera RFEF to Segunda never creates an empty next season', () => {
  const seasonOne = makeGroupState('segundaRFEF', 1);
  const seasonTwoData = initializeNextSeason(seasonOne);
  assertPlayablePlayerLeague(seasonTwoData, 'primeraRFEF', 'multi-season year 2');
  const seasonTwoReducerState = applyStartNewSeason(seasonOne, seasonTwoData, 'multi-season year 2 reducer');

  const seasonTwo = {
    ...seasonTwoReducerState,
    playerLeagueId: 'primeraRFEF',
    leagueId: 'primeraRFEF',
    playerGroupId: seasonTwoData.playerLeague.playerGroup,
    leagueTable: rankTableWithPlayerAt(seasonTwoData.playerLeague.table, playerTeamId, 1),
    fixtures: seasonTwoData.playerLeague.fixtures,
    otherLeagues: seasonTwoData.otherLeagues
  };
  const seasonThreeData = initializeNextSeason(seasonTwo);
  assertPlayablePlayerLeague(seasonThreeData, 'segunda', 'multi-season year 3');
  const seasonThreeReducerState = applyStartNewSeason(seasonTwo, seasonThreeData, 'multi-season year 3 reducer');
  assert(seasonThreeReducerState.currentSeason === 3, 'multi-season chain did not roll into the third season');
});

await server.close();

const passed = summary.filter(result => result.ok).length;
const failed = summary.length - passed;
console.log('\nRFEF progression regression summary');
console.log('='.repeat(40));
for (const result of summary) {
  const status = result.ok ? 'PASS' : 'FAIL';
  console.log(`${status} ${String(result.ms).padStart(4)}ms ${result.name}`);
}
console.log('-'.repeat(40));
console.log(`${passed}/${summary.length} scenarios passed`);

if (failed > 0) {
  process.exitCode = 1;
}
