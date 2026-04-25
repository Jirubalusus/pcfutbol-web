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

const {
  loadAllData,
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
    played: 34,
    won: Math.max(0, 25 - index),
    drawn: 0,
    lost: Math.max(0, index),
    goalsFor: 70 - index,
    goalsAgainst: 20 + index,
    goalDifference: 50 - (index * 2),
    points: (ordered.length - index) * 3
  }));
}

function makeGroupState(leagueId, playerPosition, teamOverride = null) {
  const configGroups = getSegundaRfefGroups();
  const groupsData = {
    grupo1: configGroups.grupo1?.teams || [],
    grupo2: configGroups.grupo2?.teams || [],
    grupo3: configGroups.grupo3?.teams || [],
    grupo4: configGroups.grupo4?.teams || [],
    grupo5: configGroups.grupo5?.teams || []
  };

  const groupLeague = initializeGroupLeague(groupsData, playerTeamId);
  const playerGroupId = groupLeague.playerGroup;
  assert(playerGroupId, 'Recreativo group was not found');

  const playerGroup = groupLeague.groups[playerGroupId];
  playerGroup.table = rankTableWithPlayerAt(playerGroup.table, playerTeamId, playerPosition);

  const otherLeagues = initializeOtherLeagues(leagueId, playerGroupId);
  if (otherLeagues[leagueId]?.groups) {
    otherLeagues[leagueId].groups = Object.fromEntries(
      Object.entries(groupLeague.groups).filter(([groupId]) => groupId !== playerGroupId)
    );
    otherLeagues[leagueId].playerGroup = playerGroupId;
  }

  const team = teamOverride || getSegundaRfefTeams().find(team => team.id === playerTeamId);
  assert(team, 'Recreativo team data was not found');

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

function completePlayerGroupPlayoff(state) {
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

  const { brackets } = generateAllGroupPlayoffs(groupLeagueData, getSegundaRfefTeams(), playerTeamId);
  const simulated = simulateAllGroupPlayoffs(brackets, playerTeamId);
  let playerBracket = simulated.playerBracket;
  assert(playerBracket, 'Player playoff bracket was not created');

  const semi = getNextPlayoffMatch(playerTeamId, playerBracket);
  assert(semi, 'Player semifinal was not found');
  playerBracket = advanceGroupPlayoffBracket(playerBracket, semi.id, makeWinResult(semi, playerTeamId));
  playerBracket = autoResolvePlayoffUntilPlayerMatch(playerBracket, playerTeamId);

  const final = getNextPlayoffMatch(playerTeamId, playerBracket);
  assert(final?.id?.endsWith('_final'), 'Winning the semifinal did not create a playable final');
  playerBracket = advanceGroupPlayoffBracket(playerBracket, final.id, makeWinResult(final, playerTeamId));

  const completed = {
    ...simulated.brackets,
    [state.playerGroupId]: playerBracket
  };
  assert(playerBracket.phase === 'completed' && playerBracket.winner === playerTeamId, 'Player playoff did not finish with promotion');
  return completed;
}

function assertPlayablePlayerLeague(result, expectedLeagueId) {
  assert(result.newPlayerLeagueId === expectedLeagueId, `Expected ${expectedLeagueId}, got ${result.newPlayerLeagueId}`);
  assert(result.playerLeague.table.some(entry => entry.teamId === playerTeamId), `${expectedLeagueId} table does not include Recreativo`);
  assert(result.playerLeague.fixtures.some(f => f.homeTeam === playerTeamId || f.awayTeam === playerTeamId), `${expectedLeagueId} fixtures do not include Recreativo`);
  assert(result.playerLeague.table.length > 0, `${expectedLeagueId} table is empty`);
  assert(result.playerLeague.fixtures.length > 0, `${expectedLeagueId} fixtures are empty`);
}

assert(await loadAllData(), 'Team data did not load successfully');

const playoffState = makeGroupState('segundaRFEF', 2);
const completedPlayoffs = completePlayerGroupPlayoff(playoffState);
const playoffPromotion = initializeNewSeasonWithPromotions(playoffState, playerTeamId, null, {
  segundaRFEFPlayoffBrackets: completedPlayoffs
});
assertPlayablePlayerLeague(playoffPromotion, 'primeraRFEF');
console.log('OK: Segunda RFEF playoff semifinal advances to final and promotes after final win');

const directPromotionState = makeGroupState('segundaRFEF', 1);
const directPromotion = initializeNewSeasonWithPromotions(directPromotionState, playerTeamId);
assertPlayablePlayerLeague(directPromotion, 'primeraRFEF');
assert(
  Object.keys(directPromotion.otherLeagues.primeraRFEF?.groups || {}).length > 0,
  'Current Primera RFEF non-player groups were not preserved in otherLeagues'
);
console.log('OK: Segunda RFEF champion promotes to Primera RFEF with generated table and fixtures');

const primeraGroupId = directPromotion.playerLeague.playerGroup;
assert(primeraGroupId, 'Promoted Primera RFEF player group was not assigned');

const primeraSurvivalState = {
  playerLeagueId: 'primeraRFEF',
  leagueId: 'primeraRFEF',
  playerGroupId: primeraGroupId,
  teamId: playerTeamId,
  team: directPromotionState.team,
  leagueTable: rankTableWithPlayerAt(directPromotion.playerLeague.table, playerTeamId, 7),
  fixtures: directPromotion.playerLeague.fixtures,
  otherLeagues: directPromotion.otherLeagues
};

const primeraSurvival = initializeNewSeasonWithPromotions(primeraSurvivalState, playerTeamId);
assertPlayablePlayerLeague(primeraSurvival, 'primeraRFEF');
console.log('OK: Primera RFEF 7th-place survival rolls over with classification and fixtures');

await server.close();
