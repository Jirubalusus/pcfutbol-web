import { applyHistoricalIdentities } from './historicalIdentityService.js';
import { getActiveEditionId, getEdition } from './editions/editionService';
import { ensureHistoricalRosterCoverage } from './historicalRosterRepair.js';

const HISTORICAL_DB_BASE_URL = '/historical-db';

let indexCache = null;
const seasonCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar ${url}: ${response.status}`);
  return response.json();
}

async function fetchMaybeGzipJson(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar ${url}: ${response.status}`);

  if (url.endsWith('.gz')) {
    // Vite/Firebase may serve .gz files with Content-Encoding:gzip; fetch then returns
    // an already-decoded body. If there is no content-encoding header, decode manually.
    if (response.headers.get('content-encoding') === 'gzip') {
      return response.json();
    }
    if (typeof DecompressionStream === 'undefined') {
      return fetchJson(url.replace(/\.gz$/, ''));
    }
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).json();
  }

  return response.json();
}

export async function getHistoricalIndex() {
  if (!indexCache) {
    indexCache = await fetchJson(`${HISTORICAL_DB_BASE_URL}/index.json`);
  }
  return indexCache;
}

export async function getAvailableHistoricalSeasons() {
  const index = await getHistoricalIndex();
  return index.seasons || [];
}

export async function loadHistoricalSeason(seasonId) {
  const activeEditionId = getActiveEditionId();
  const cacheKey = `${seasonId}::${activeEditionId || 'no-edition'}`;
  if (seasonCache.has(cacheKey)) return seasonCache.get(cacheKey);

  const index = await getHistoricalIndex();
  const seasonInfo = (index.seasons || []).find((season) => season.id === seasonId);
  if (!seasonInfo) throw new Error(`Temporada histórica no disponible: ${seasonId}`);

  const basePath = `${HISTORICAL_DB_BASE_URL}/${seasonInfo.basePath}`;
  const manifest = await fetchJson(`${basePath}/manifest.json`);
  const files = manifest.files || {};

  const [teams, players, squads, leagues] = await Promise.all([
    fetchMaybeGzipJson(`${basePath}/${files.teams || 'teams.json'}`),
    fetchMaybeGzipJson(`${basePath}/${files.players || 'players.json'}`),
    fetchMaybeGzipJson(`${basePath}/${files.squads || 'squads.json'}`),
    fetchMaybeGzipJson(`${basePath}/${files.leagues || 'leagues.json'}`),
  ]);

  const playersById = new Map(players.map((player) => [player.id, player]));
  const squadsByTeam = new Map();
  for (const row of squads) {
    if (!squadsByTeam.has(row.teamId)) squadsByTeam.set(row.teamId, []);
    squadsByTeam.get(row.teamId).push(row);
  }

  const teamsWithPlayers = teams.map((team) => ({
    ...team,
    players: (squadsByTeam.get(team.id) || [])
      .map((row) => playersById.get(row.playerId))
      .filter(Boolean)
  }));
  const repairedTeams = ensureHistoricalRosterCoverage(teamsWithPlayers, {
    seasonId,
    minimumPlayers: 18
  });

  const rawDataset = { manifest, teams: repairedTeams, players, squads, leagues, seasonInfo };
  const activeEdition = activeEditionId ? await getEdition(activeEditionId) : null;
  const dataset = applyHistoricalIdentities(rawDataset, seasonId, {
    edition: activeEdition,
    revealOriginalNames: Boolean(activeEditionId)
  });
  seasonCache.set(cacheKey, dataset);
  return dataset;
}

export function clearHistoricalSeasonCache() {
  indexCache = null;
  seasonCache.clear();
}
