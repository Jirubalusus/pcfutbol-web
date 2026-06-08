import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ensureHistoricalRosterCoverage } from '../src/data/historicalRosterRepair.js';

const repoRoot = process.cwd();
const seasonsRoot = path.join(repoRoot, 'public/historical-db/seasons');
const MIN_PLAYERS = 18;

function loadSeason(seasonId) {
  const seasonDir = path.join(seasonsRoot, seasonId);
  const teams = JSON.parse(fs.readFileSync(path.join(seasonDir, 'teams.json'), 'utf8'));
  const players = JSON.parse(fs.readFileSync(path.join(seasonDir, 'players.json'), 'utf8'));
  const squads = JSON.parse(fs.readFileSync(path.join(seasonDir, 'squads.json'), 'utf8'));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const squadsByTeam = new Map();
  for (const row of squads) {
    if (!squadsByTeam.has(row.teamId)) squadsByTeam.set(row.teamId, []);
    squadsByTeam.get(row.teamId).push(row);
  }
  return teams.map((team) => ({
    ...team,
    players: (squadsByTeam.get(team.id) || [])
      .map((row) => playersById.get(row.playerId))
      .filter(Boolean)
  }));
}

function assertCoverage(seasonId, repairedTeams) {
  const shortTeams = repairedTeams
    .filter((team) => (team.players || []).length < MIN_PLAYERS)
    .map((team) => ({
      id: team.id,
      name: team.name,
      leagueId: team.leagueId,
      players: (team.players || []).length
    }));

  assert.equal(shortTeams.length, 0, `${seasonId} still has teams below ${MIN_PLAYERS} players: ${JSON.stringify(shortTeams.slice(0, 20), null, 2)}`);
}

const ceutaSeason = loadSeason('2004-05');
const rawCeuta = ceutaSeason.find((team) => team.name === 'AD Ceuta (- 2012)');
assert.ok(rawCeuta, 'AD Ceuta exists in 2004-05 dataset');
assert.equal((rawCeuta.players || []).length, 0, 'fixture must reproduce the reported empty-roster bug before repair');

const repaired2004 = ensureHistoricalRosterCoverage(ceutaSeason, { seasonId: '2004-05', minimumPlayers: MIN_PLAYERS });
const repairedCeuta = repaired2004.find((team) => team.id === rawCeuta.id);
assert.equal(repairedCeuta.players.length, MIN_PLAYERS, 'AD Ceuta gets a playable reconstructed roster');
assert.ok(repairedCeuta.players.every((player) => player.id && player.name && player.position && Number.isFinite(player.overall)), 'generated players have playable fields');
assert.ok(repairedCeuta.players.some((player) => player.isHistoricalRosterFiller), 'repaired roster marks generated filler players');
assertCoverage('2004-05', repaired2004);

const index = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/historical-db/index.json'), 'utf8'));
const playableSeasonIds = (index.seasons || []).map((season) => season.id);

for (const seasonId of playableSeasonIds) {
  const teams = loadSeason(seasonId);
  const repaired = ensureHistoricalRosterCoverage(teams, { seasonId, minimumPlayers: MIN_PLAYERS });
  assertCoverage(seasonId, repaired);
}

console.log(JSON.stringify({ ok: true, checkedSeasons: playableSeasonIds.length, minimumPlayers: MIN_PLAYERS }, null, 2));
