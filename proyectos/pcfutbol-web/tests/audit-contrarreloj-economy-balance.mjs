import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeLeague } from '../src/game/leagueEngine.js';
import { getLeagueTier } from '../src/game/leagueTiers.js';
import { getStadiumInfo, getStadiumLevel } from '../src/data/stadiumCapacities.js';
import { toGameLeagueId } from '../src/data/activeSeasonUniverse.js';
import { ensureHistoricalRosterCoverage } from '../src/data/historicalRosterRepair.js';
import {
  CONTRARRELOJ_BALANCE_CEIL,
  CONTRARRELOJ_BALANCE_FLOOR,
  getSquadMarketValue,
  prepareContrarrelojTeam,
  projectContrarrelojStartingBalance
} from '../src/game/contrarrelojEconomy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const seasonsRoot = path.join(repoRoot, 'public', 'historical-db', 'seasons');
// Mantén la auditoría alineada con el suelo/techo reales de producción
// (CONTRARRELOJ_BALANCE_FLOOR/CEIL). Un equipo entre -5,5M y -5M pasaría una
// auditoría laxa pero re-normalizaría en CADA carga (shouldNormalizeContrarrelojSave
// dispara por debajo del suelo), así que auditamos contra el suelo exacto.
const BALANCE_MIN = CONTRARRELOJ_BALANCE_FLOOR;
const BALANCE_MAX = CONTRARRELOJ_BALANCE_CEIL;
const MESSINA_MAX_ANNUAL_SALARIES = 12_000_000;
const EXCLUDED_LEAGUES = new Set(['primeraRFEF']);
const REST_OF_WORLD = new Set(['mls', 'saudiPro', 'ligaMX', 'jLeague']);

const fmt = (n) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSeason(seasonId) {
  const seasonPath = path.join(seasonsRoot, seasonId);
  const teams = readJson(path.join(seasonPath, 'teams.json'));
  const players = readJson(path.join(seasonPath, 'players.json'));
  const squads = readJson(path.join(seasonPath, 'squads.json'));
  const leagues = readJson(path.join(seasonPath, 'leagues.json'));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const squadsByTeam = new Map();
  for (const row of squads) {
    if (!squadsByTeam.has(row.teamId)) squadsByTeam.set(row.teamId, []);
    squadsByTeam.get(row.teamId).push(row);
  }
  const teamsWithPlayers = teams.map((team) => ({
    ...team,
    id: team.id || team.teamId,
    name: team.name || team.teamName,
    players: (squadsByTeam.get(team.id) || []).map((row) => playersById.get(row.playerId)).filter(Boolean),
    _syntheticBudget: team.budget == null && team.transferBudget == null
  }));
  return {
    teams: ensureHistoricalRosterCoverage(teamsWithPlayers, { seasonId, minimumPlayers: 18 }),
    leagues
  };
}

function buildLeagueEntries(dataset) {
  return (dataset.leagues || []).map((league) => {
    const leagueId = toGameLeagueId(league.id);
    const teams = dataset.teams
      .filter((team) => (team.leagueId || team.league || team.competitionId) === league.id)
      .map((team) => ({
        ...team,
        leagueId,
        sourceLeagueId: league.id,
        historicalLeagueId: league.id
      }));
    return {
      id: leagueId,
      sourceLeagueId: league.id,
      name: league.name || league.id,
      country: league.country || '',
      tier: league.tier || null,
      teams
    };
  }).filter((entry) => entry.teams.length > 0);
}

function getTotalCalendarWeeks(entry, playerTeamId) {
  try {
    const leagueData = initializeLeague(entry.teams, playerTeamId);
    return (leagueData.fixtures || []).length > 0
      ? Math.max(...leagueData.fixtures.map((fixture) => fixture.week || 0))
      : 38;
  } catch {
    return 38;
  }
}

const seasonIds = fs.readdirSync(seasonsRoot)
  .filter((name) => fs.statSync(path.join(seasonsRoot, name)).isDirectory())
  .filter((name) => ['teams.json', 'players.json', 'squads.json', 'leagues.json'].every((file) => fs.existsSync(path.join(seasonsRoot, name, file))))
  .sort();

let auditedTeams = 0;
let worstNegative = null;
let worstPositive = null;
let messinaRow = null;

for (const seasonId of seasonIds) {
  const dataset = loadSeason(seasonId);
  for (const entry of buildLeagueEntries(dataset)) {
    if (EXCLUDED_LEAGUES.has(entry.id)) continue;
    if (REST_OF_WORLD.has(entry.id)) continue;
    const tier = entry.tier || getLeagueTier(entry.id);
    const weeksCache = new Map();

    for (const rawTeam of entry.teams) {
      if (rawTeam.name && /\sB$/i.test(rawTeam.name.trim())) continue;
      const candidateSeed = prepareContrarrelojTeam(rawTeam, entry.id);
      if (!(candidateSeed.reputation <= 2 || tier >= 3)) continue;

      if (!weeksCache.has(rawTeam.id)) {
        weeksCache.set(rawTeam.id, getTotalCalendarWeeks(entry, rawTeam.id));
      }
      const totalCalendarWeeks = weeksCache.get(rawTeam.id);
      const stadiumInfo = getStadiumInfo(rawTeam.id, candidateSeed.reputation);
      const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);
      const team = prepareContrarrelojTeam(candidateSeed, entry.id, { stadiumLevel, totalCalendarWeeks });
      const projection = projectContrarrelojStartingBalance({ team, leagueId: entry.id, stadiumLevel, totalCalendarWeeks });
      const row = {
        seasonId,
        leagueId: entry.id,
        teamId: rawTeam.id,
        teamName: rawTeam.name,
        squadCount: team.players.length,
        squadValue: getSquadMarketValue(team),
        weeklySalaries: projection.weeklySalaries,
        annualSalaries: projection.annualSalaries,
        balance: projection.balance
      };

      auditedTeams += 1;
      if (!worstNegative || row.balance < worstNegative.balance) worstNegative = row;
      if (!worstPositive || row.balance > worstPositive.balance) worstPositive = row;

      assert.ok(
        row.balance >= BALANCE_MIN && row.balance <= BALANCE_MAX,
        `${seasonId} ${entry.id} ${rawTeam.name}: balance ${fmt(row.balance)} fuera de rango (${fmt(BALANCE_MIN)}..${fmt(BALANCE_MAX)})`
      );

      if (seasonId === '2005-06' && /FC Messina Peloro/i.test(rawTeam.name || '')) {
        messinaRow = row;
      }
    }
  }
}

assert.ok(auditedTeams > 0, 'No se auditó ningún candidato de Contrarreloj');
assert.ok(messinaRow, 'No se encontró FC Messina Peloro en 2005-06');
assert.ok(Math.abs(messinaRow.balance) <= 5_000_000, `Messina 2005-06 balance fuera de ±€5M: ${fmt(messinaRow.balance)}`);
assert.ok(
  messinaRow.annualSalaries < MESSINA_MAX_ANNUAL_SALARIES,
  `Messina 2005-06 salarios anuales demasiado altos: ${fmt(messinaRow.annualSalaries)}`
);

console.log('✅ Audit contrarreloj-economy-balance OK');
console.log(`   Temporadas auditadas: ${seasonIds.length}`);
console.log(`   Equipos candidatos auditados: ${auditedTeams}`);
console.log(`   Peor negativo: ${worstNegative.seasonId} · ${worstNegative.leagueId} · ${worstNegative.teamName} · balance ${fmt(worstNegative.balance)} · salarios ${fmt(worstNegative.annualSalaries)}`);
console.log(`   Peor positivo: ${worstPositive.seasonId} · ${worstPositive.leagueId} · ${worstPositive.teamName} · balance ${fmt(worstPositive.balance)} · salarios ${fmt(worstPositive.annualSalaries)}`);
console.log(`   Messina 2005-06: balance ${fmt(messinaRow.balance)} · salarios ${fmt(messinaRow.annualSalaries)} · semanal ${fmt(messinaRow.weeklySalaries)} · plantilla ${messinaRow.squadCount} · valor ${fmt(messinaRow.squadValue)}`);
