import { getCupTeams, generateCupBracket } from './cupSystem';
import { buildSeasonCalendar, getEuropeanCompetitionIdsForSeason, remapFixturesForEuropean } from './europeanCompetitions';
import { LEAGUE_CONFIG, initializeOtherLeagues } from './multiLeagueEngine';
import { buildHistoricalUniverseFromDataset, initializeOtherLeaguesFromUniverse, toGameLeagueId } from '../data/activeSeasonUniverse';

function getTeamId(team) {
  return team?.id || team?.teamId || null;
}

function getUniqueLeagueWeeks(fixtures = []) {
  return [...new Set((fixtures || [])
    .map(fixture => Number(fixture?.week))
    .filter(week => Number.isFinite(week) && week > 0))]
    .sort((a, b) => a - b);
}

function getTotalLeagueMatchdays(fixtures = [], fallback = 38) {
  const weeks = getUniqueLeagueWeeks(fixtures);
  if (weeks.length > 0) return Math.max(...weeks);
  return fallback;
}

function fixturesLookSequential(fixtures = []) {
  const weeks = getUniqueLeagueWeeks(fixtures);
  return weeks.length > 0 && weeks.every((week, index) => week === index + 1);
}

export function shouldReplaceHistoricalOtherLeagues(otherLeagues) {
  if (!otherLeagues || Object.keys(otherLeagues).length === 0) return true;
  const tables = Object.values(otherLeagues)
    .flatMap(league => [
      ...(Array.isArray(league?.table) ? league.table : []),
      ...Object.values(league?.groups || {}).flatMap(group => Array.isArray(group?.table) ? group.table : []),
    ]);
  if (tables.length === 0) return true;
  return !tables.some(row => String(row?.teamId || row?.id || '').startsWith('tm-team-'));
}

export function buildDomesticCupBootstrap({
  playerLeagueId,
  playerTeam,
  leagueTable,
  otherLeagues,
  fixtures = [],
  historical = false,
  historicalTeams = [],
  universeEntries = [],
  allowStaticFallback,
  hasEuropean,
  seasonId = null,
  existingEuropeanCalendar = null,
  shouldRemapFixtures = null,
  includeCalendarWithoutCup = false,
} = {}) {
  const playerGameLeagueId = toGameLeagueId(playerLeagueId || 'laliga');
  if (!playerTeam || !Array.isArray(leagueTable) || leagueTable.length === 0) return null;
  const totalLeagueMDs = getTotalLeagueMatchdays(fixtures, leagueTable.length > 0 ? Math.max(1, (leagueTable.length - 1) * 2) : 38);
  const resolvedHasEuropean = hasEuropean ?? (
    !historical || getEuropeanCompetitionIdsForSeason(seasonId, { historical: true }).length > 0
  );
  const buildCalendarPayload = (cupRounds) => {
    const europeanCalendar = buildSeasonCalendar(totalLeagueMDs, {
      hasEuropean: resolvedHasEuropean,
      cupRounds,
    });
    const needsCalendar = !existingEuropeanCalendar ||
      !Array.isArray(existingEuropeanCalendar.cupWeeks) ||
      existingEuropeanCalendar.cupWeeks.length !== cupRounds;
    const remapSafe = shouldRemapFixtures ?? (!existingEuropeanCalendar && fixturesLookSequential(fixtures));
    const remappedFixtures = remapSafe
      ? remapFixturesForEuropean(fixtures, europeanCalendar.leagueWeekMap)
      : null;
    return {
      europeanCalendar,
      needsCalendar,
      remappedFixtures,
      shouldRemapFixtures: Boolean(remappedFixtures),
    };
  };
  const calendarOnly = () => includeCalendarWithoutCup ? {
    cupCompetition: null,
    cupRounds: 0,
    cupData: null,
    ...buildCalendarPayload(0),
    playerGameLeagueId,
  } : null;

  // South American leagues also have domestic cups in CUP_CONFIGS (e.g.
  // Copa Bolivia/Copa Paraguay). Do not short-circuit here: the earlier
  // calendar-only return left the Cup tab as "will start during the season"
  // for current 2025/26 South American careers.
  if (!LEAGUE_CONFIG[playerGameLeagueId]?.country) return calendarOnly();

  const cupData = getCupTeams(playerGameLeagueId, playerTeam, otherLeagues, leagueTable, {
    historical,
    playerGameLeagueId,
    historicalTeams,
    universeEntries,
    allowStaticFallback: allowStaticFallback ?? !historical,
  });
  if (!cupData || cupData.teams.length < 2) return calendarOnly();

  const cupCompetition = generateCupBracket(cupData.teams, getTeamId(playerTeam));
  if (!cupCompetition?.rounds?.length) return calendarOnly();

  const cupRounds = cupCompetition.rounds.length;
  return {
    cupCompetition,
    cupRounds,
    cupData,
    ...buildCalendarPayload(cupRounds),
    playerGameLeagueId,
  };
}

export function buildHistoricalLoadedCupBootstrap(state, dataset) {
  if (!state?.loaded || !state?.gameStarted || state?.cupCompetition || !state?.team) return null;
  if (!Array.isArray(state.leagueTable) || state.leagueTable.length === 0) return null;
  if (!state.historicalDatabase || !state.databaseSeasonId || state.databaseSeasonId === 'current') return null;

  const universe = buildHistoricalUniverseFromDataset(dataset, {
    id: state.databaseSeasonId,
    label: state.historicalDatabaseLabel,
    startYear: state.careerStartSeason,
  });
  const playerGameLeagueId = toGameLeagueId(state.playerLeagueId || state.leagueId || 'laliga');
  const otherLeagues = initializeOtherLeaguesFromUniverse(
    universe,
    playerGameLeagueId,
    state.playerGroupId || null
  );
  const bootstrap = buildDomesticCupBootstrap({
    playerLeagueId: playerGameLeagueId,
    playerTeam: state.team,
    leagueTable: state.leagueTable,
    otherLeagues,
    fixtures: state.fixtures || [],
    historical: true,
    historicalTeams: dataset?.teams || [],
    universeEntries: universe.entries || [],
    allowStaticFallback: false,
    seasonId: state.databaseSeasonId,
    hasEuropean: getEuropeanCompetitionIdsForSeason(state.databaseSeasonId, { historical: true }).length > 0,
    existingEuropeanCalendar: state.europeanCalendar,
    shouldRemapFixtures: !state.europeanCalendar && Number(state.currentWeek || 1) <= 2 && fixturesLookSequential(state.fixtures || []),
  });

  if (!bootstrap) return null;
  return {
    ...bootstrap,
    universe,
    otherLeagues,
    shouldReplaceOtherLeagues: shouldReplaceHistoricalOtherLeagues(state.otherLeagues),
  };
}

export function buildCurrentLoadedCupBootstrap(state) {
  if (!state?.loaded || !state?.gameStarted || state?.cupCompetition || !state?.team) return null;
  if (state.gameMode === 'ranked' || state.rankedMatchId) return null;
  if (state.historicalDatabase && state.databaseSeasonId && state.databaseSeasonId !== 'current') return null;
  if (!Array.isArray(state.leagueTable) || state.leagueTable.length === 0) return null;

  const playerLeagueId = state.playerLeagueId || state.leagueId || 'laliga';
  const otherLeagues = state.otherLeagues || initializeOtherLeagues(playerLeagueId, state.playerGroupId || null);
  return buildDomesticCupBootstrap({
    playerLeagueId,
    playerTeam: state.team,
    leagueTable: state.leagueTable,
    otherLeagues,
    fixtures: state.fixtures || [],
    historical: false,
    allowStaticFallback: true,
    existingEuropeanCalendar: state.europeanCalendar,
    shouldRemapFixtures: !state.europeanCalendar && Number(state.currentWeek || 1) <= 2 && fixturesLookSequential(state.fixtures || []),
  });
}
