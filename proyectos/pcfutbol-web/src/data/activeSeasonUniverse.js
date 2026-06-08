import { getActiveDatabaseOption, CURRENT_DATABASE_ID } from './activeDatabaseService';
import { loadHistoricalSeason } from './historicalDatabaseService';
import { normalizeLeagueId } from './leagueRegistry';
import { initializeLeague } from '../game/leagueEngine';
import { initializeGroupLeague } from '../game/groupLeagueEngine';
import { LEAGUE_CONFIG } from '../game/multiLeagueEngine';

const HISTORICAL_TO_GAME_LEAGUE_ID = {
  laliga2: 'segunda',
  premier: 'premierLeague',
  seriea: 'serieA',
  ligaMx: 'ligaMX',
  jleague: 'jLeague',
};

const GROUP_SOURCE_ID_RE = /(?:G\d+|grupo\d+)$/i;

export function toGameLeagueId(leagueId) {
  const normalized = normalizeLeagueId(leagueId);
  return HISTORICAL_TO_GAME_LEAGUE_ID[normalized] || normalized;
}

function cloneTeamForLeague(team, leagueId, sourceLeagueId = team.leagueId || team.league || team.competitionId, sourceLeagueName = null) {
  const hasRealBudget = team.budget != null || team.transferBudget != null;
  return {
    ...team,
    id: team.id || team.teamId,
    name: team.name || team.teamName,
    players: team.players || [],
    budget: team.budget ?? team.transferBudget ?? (team.reputation > 4 ? 100_000_000 : team.reputation > 3 ? 50_000_000 : 20_000_000),
    _syntheticBudget: !hasRealBudget,
    leagueId,
    sourceLeagueId,
    historicalLeagueId: sourceLeagueId,
    historicalLeagueName: sourceLeagueName,
  };
}

function getStaticLeagueEntries() {
  return Object.entries(LEAGUE_CONFIG).flatMap(([leagueId, config]) => {
    if (config.isGroupLeague) {
      const groups = config.getGroups?.() || {};
      return Object.entries(groups).map(([groupId, groupData]) => {
        const teams = Array.isArray(groupData) ? groupData : (groupData?.teams || []);
        return {
          id: leagueId,
          sourceLeagueId: groupId,
          groupId,
          name: groupData?.name || `${config.name} ${groupId}`,
          country: config.country,
          tier: null,
          isGroup: true,
          teams: teams.map(team => cloneTeamForLeague(team, leagueId, groupId, groupData?.name || `${config.name} ${groupId}`)),
        };
      }).filter(entry => entry.teams.length > 0);
    }
    const teams = config.getTeams?.() || [];
    return [{
      id: leagueId,
      sourceLeagueId: leagueId,
      groupId: null,
      name: config.name,
      country: config.country,
      tier: null,
      isGroup: false,
      teams: teams.map(team => cloneTeamForLeague(team, leagueId, leagueId, config.name)),
    }];
  }).filter(entry => entry.teams.length > 0);
}

export function buildHistoricalLeagueEntries(dataset) {
  const teams = dataset?.teams || [];
  const entries = (dataset?.leagues || []).map((league) => {
    const gameLeagueId = toGameLeagueId(league.id);
    const exactTeams = teams
      .filter(team => (team.leagueId || team.league || team.competitionId) === league.id)
      .map(team => cloneTeamForLeague(team, gameLeagueId, league.id, league.name || LEAGUE_CONFIG[gameLeagueId]?.name || league.id));
    const isKnownGroup = Boolean(LEAGUE_CONFIG[gameLeagueId]?.isGroupLeague);
    return {
      id: gameLeagueId,
      sourceLeagueId: league.id,
      groupId: isKnownGroup ? league.id : null,
      name: league.name || LEAGUE_CONFIG[gameLeagueId]?.name || league.id,
      country: league.country || LEAGUE_CONFIG[gameLeagueId]?.country || '',
      tier: league.tier || null,
      isGroup: isKnownGroup && (GROUP_SOURCE_ID_RE.test(league.id) || gameLeagueId !== league.id),
      teams: exactTeams,
    };
  }).filter(entry => entry.teams.length > 0);

  // Some historical datasets store a parent league id directly. Keep those usable too.
  return entries;
}

export async function loadActiveSeasonUniverse() {
  const option = await getActiveDatabaseOption();
  if (!option?.historical || option.id === CURRENT_DATABASE_ID) {
    return {
      historical: false,
      databaseSeasonId: CURRENT_DATABASE_ID,
      label: option?.label || 'Temporada actual 2025/26',
      startYear: option?.startYear || 2025,
      dataset: null,
      entries: getStaticLeagueEntries(),
    };
  }

  const dataset = await loadHistoricalSeason(option.id);
  return buildHistoricalUniverseFromDataset(dataset, option);
}

export function buildHistoricalUniverseFromDataset(dataset, option = {}) {
  return {
    historical: true,
    databaseSeasonId: option.id || dataset?.seasonInfo?.id,
    label: option.label || dataset?.seasonInfo?.label || option.id || dataset?.seasonInfo?.id,
    startYear: option.startYear || dataset?.seasonInfo?.startYear,
    dataset,
    entries: buildHistoricalLeagueEntries(dataset),
  };
}

export function getAllTeamsFromUniverse(universe) {
  const byId = new Map();
  for (const entry of universe?.entries || []) {
    for (const team of entry.teams || []) {
      const id = team.id || team.teamId;
      if (id && !byId.has(id)) byId.set(id, team);
    }
  }
  return Array.from(byId.values());
}

export function buildLeagueGettersFromUniverse(universe) {
  const getters = {};
  for (const entry of universe?.entries || []) {
    if (!getters[entry.id]) getters[entry.id] = () => [];
  }
  Object.keys(getters).forEach((leagueId) => {
    getters[leagueId] = () => (universe?.entries || [])
      .filter(entry => entry.id === leagueId)
      .flatMap(entry => entry.teams || []);
  });
  return getters;
}

export function getLeagueEntries(universe, leagueId) {
  const gameLeagueId = toGameLeagueId(leagueId);
  return (universe?.entries || []).filter(entry => entry.id === gameLeagueId);
}

export function getTeamsForLeague(universe, leagueId) {
  return getLeagueEntries(universe, leagueId).flatMap(entry => entry.teams || []);
}

export function getGroupEntriesForLeague(universe, leagueId) {
  return getLeagueEntries(universe, leagueId).filter(entry => entry.isGroup || entry.groupId);
}

/**
 * Build a `(gameLeagueId) => Team[]` getter for `ensureEuropeanLeagueStandings`
 * that derives the team pool for each European league from the *live* career
 * state (the just-completed season) instead of the static current-era
 * LEAGUE_CONFIG getters.
 *
 * Resolution order (first non-empty wins):
 *   1. The player's own final league table (when the league id matches).
 *   2. The live `otherLeagues[leagueId]` table / accumulated table / group
 *      tables — this is what keeps a historical career's Champions/Europe draw
 *      on historical clubs and reactive to the season that was actually played.
 *   3. As a LAST resort only, the static LEAGUE_CONFIG getter. For historical
 *      saves this static fallback is suppressed so a 2004-05 career never seeds
 *      its continental draw with 2025/26 clubs; the league is simply skipped
 *      (documented fallback — leagues absent from a historical dataset, e.g.
 *      Ukraine/Poland in older seasons, contribute no entrants rather than
 *      contaminating the draw).
 *
 * Pass `allowStaticFallback: true` to force the static getter even for
 * historical saves (used by callers that would otherwise crash because a
 * LEAGUE_SLOTS league has no live data at all and they prefer real-but-current
 * clubs over losing the whole competition).
 *
 * @param {object} completedState - state of the season that just ended
 * @param {object} [options]
 * @param {object} [options.fallbackState] - secondary state to read flags from
 * @param {object} [options.allTeamsMap] - id → full team for metadata enrichment
 * @param {boolean} [options.allowStaticFallback]
 * @returns {(gameLeagueId: string) => Array|undefined}
 */
export function buildEuropeanFallbackTeamGetter(completedState, options = {}) {
  const { fallbackState = completedState, allTeamsMap = {}, allowStaticFallback = false } = options;
  const isHistorical = Boolean(completedState?.historicalDatabase || fallbackState?.historicalDatabase);
  const otherLeagues = completedState?.otherLeagues || fallbackState?.otherLeagues || {};
  const playerLeagueId = completedState?.playerLeagueId || fallbackState?.playerLeagueId || fallbackState?.leagueId;
  const playerTable = completedState?.leagueTable || fallbackState?.leagueTable || [];

  const enrich = (row) => {
    if (!row) return null;
    const id = row.teamId || row.id;
    if (!id) return null;
    const full = allTeamsMap[id] || {};
    return {
      id,
      teamId: id,
      name: row.teamName || full.name || id,
      teamName: row.teamName || full.name || id,
      shortName: row.shortName || full.shortName || '',
      reputation: full.reputation ?? row.reputation ?? 70,
      overall: full.overall ?? row.overall ?? 70,
      players: full.players || [],
    };
  };
  const tableToTeams = (table) => (table || []).map(enrich).filter(Boolean);

  return (gameLeagueId) => {
    // 1) Player's own final table.
    if (gameLeagueId === playerLeagueId && Array.isArray(playerTable) && playerTable.length > 0) {
      const teams = tableToTeams(playerTable);
      if (teams.length > 0) return teams;
    }

    // 2) Live composition carried in otherLeagues (historical/diverged clubs).
    const ld = otherLeagues[gameLeagueId];
    if (ld) {
      if (ld.groups && (ld.isGroupLeague || Object.keys(ld.groups).length > 0)) {
        const teams = Object.values(ld.groups).flatMap(group => tableToTeams(group?.table));
        if (teams.length > 0) return teams;
      }
      const table = (ld.accumulatedTable && ld.accumulatedTable.length > 0) ? ld.accumulatedTable : ld.table;
      const teams = tableToTeams(table);
      if (teams.length > 0) return teams;
    }

    // 3) Static current-era pool — last resort, suppressed for historical saves
    //    unless the caller explicitly opts in.
    if (!isHistorical || allowStaticFallback) {
      return LEAGUE_CONFIG[gameLeagueId]?.getTeams?.();
    }
    return undefined;
  };
}

export function initializeOtherLeaguesFromUniverse(universe, playerLeagueId, playerGroupId = null) {
  const otherLeagues = {};
  const entriesByLeague = new Map();
  for (const entry of universe?.entries || []) {
    if (!entriesByLeague.has(entry.id)) entriesByLeague.set(entry.id, []);
    entriesByLeague.get(entry.id).push(entry);
  }

  for (const [leagueId, entries] of entriesByLeague.entries()) {
    const config = LEAGUE_CONFIG[leagueId] || {};
    const hasGroups = config.isGroupLeague || entries.some(entry => entry.isGroup || entry.groupId);

    if (hasGroups) {
      const groupsData = {};
      entries.forEach((entry, index) => {
        const groupId = entry.groupId || entry.sourceLeagueId || `grupo${index + 1}`;
        if (leagueId === playerLeagueId && playerGroupId && groupId === playerGroupId) return;
        groupsData[groupId] = entry.teams || [];
      });
      if (leagueId === playerLeagueId && !playerGroupId) continue;
      if (!Object.keys(groupsData).length) continue;
      otherLeagues[leagueId] = {
        isGroupLeague: true,
        playerGroup: leagueId === playerLeagueId ? playerGroupId : null,
        ...initializeGroupLeague(groupsData, null),
      };
      continue;
    }

    if (leagueId === playerLeagueId) continue;
    const teams = entries.flatMap(entry => entry.teams || []);
    if (!teams.length) continue;
    otherLeagues[leagueId] = initializeLeague(teams, null);
  }

  return otherLeagues;
}
