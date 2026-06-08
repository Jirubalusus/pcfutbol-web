import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const season = '2006-07';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const seasonDir = path.join(root, 'public', 'historical-db', 'seasons', season);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(seasonDir, file), 'utf8'));
}

function hydrateHistoricalDataset() {
  const teams = readJson('teams.json');
  const players = readJson('players.json');
  const squads = readJson('squads.json');
  const leagues = readJson('leagues.json');
  const manifest = readJson('manifest.json');
  const seasonInfo = { id: season, label: '2006/07', startYear: 2006 };
  const playersById = new Map(players.map(player => [player.id, player]));
  const squadsByTeam = new Map();
  for (const row of squads) {
    if (!squadsByTeam.has(row.teamId)) squadsByTeam.set(row.teamId, []);
    squadsByTeam.get(row.teamId).push(row);
  }
  const teamsWithPlayers = teams.map(team => ({
    ...team,
    players: (squadsByTeam.get(team.id) || [])
      .map(row => playersById.get(row.playerId))
      .filter(Boolean)
  }));
  return { manifest, teams: teamsWithPlayers, players, squads, leagues, seasonInfo };
}

function assert(condition, message, extra = {}) {
  if (!condition) {
    console.error(JSON.stringify({ ok: false, message, ...extra }, null, 2));
    process.exit(1);
  }
}

const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { buildHistoricalUniverseFromDataset, getAllTeamsFromUniverse, initializeOtherLeaguesFromUniverse } = await vite.ssrLoadModule('/src/data/activeSeasonUniverse.js');
  const { initializeLeague, simulateMatch } = await vite.ssrLoadModule('/src/game/leagueEngine.js');

  const dataset = hydrateHistoricalDataset();
  const universe = buildHistoricalUniverseFromDataset(dataset, { id: season, label: '2006/07', startYear: 2006 });
  const allTeams = getAllTeamsFromUniverse(universe);
  const atletico = allTeams.find(team => team.name === 'Atlético de Madrid' || team.name === 'Atlético Madrid');
  const recreativo = allTeams.find(team => team.name === 'Recreativo de Huelva');
  const laligaTeams = allTeams.filter(team => team.sourceLeagueId === 'laliga' || team.historicalLeagueId === 'laliga');

  assert(atletico, 'No se encontró Atlético Madrid 2006/07');
  assert(recreativo, 'No se encontró Recreativo de Huelva 2006/07');
  assert(laligaTeams.length === 20, 'LaLiga 2006/07 debe tener 20 equipos', { laligaTeams: laligaTeams.length });
  assert((atletico.players || []).length >= 20, 'Atlético 2006/07 debe llegar hidratado con plantilla histórica', { count: atletico.players?.length });
  assert((recreativo.players || []).length >= 20, 'Recreativo 2006/07 debe llegar hidratado con plantilla histórica', { count: recreativo.players?.length });

  const atleticoPlayerNames = new Set(atletico.players.map(player => player.name));
  for (const modernName of ['J. Oblak', 'Julián Álvarez', 'J. Alvarez', 'A. Griezmann', 'Álex Baena']) {
    assert(!atleticoPlayerNames.has(modernName), 'Se coló un jugador moderno en Atlético 2006/07', { modernName });
  }
  for (const historicalName of ['Fernando Torres', 'Leo Franco', 'Martin Petrov']) {
    assert(atleticoPlayerNames.has(historicalName), 'Falta un jugador histórico esperado en Atlético 2006/07', { historicalName });
  }

  const { table, fixtures } = initializeLeague(laligaTeams, atletico.id);
  const firstRecreativoFixture = fixtures.find(fixture =>
    (fixture.homeTeam === atletico.id && fixture.awayTeam === recreativo.id) ||
    (fixture.homeTeam === recreativo.id && fixture.awayTeam === atletico.id)
  );
  assert(firstRecreativoFixture, 'No se generó fixture Atlético-Recreativo');

  const result = simulateMatch(
    firstRecreativoFixture.homeTeam,
    firstRecreativoFixture.awayTeam,
    firstRecreativoFixture.homeTeam === atletico.id ? atletico : recreativo,
    firstRecreativoFixture.awayTeam === atletico.id ? atletico : recreativo,
    { homeTactic: 'balanced', awayTactic: 'balanced', homeMorale: 70, awayMorale: 70 },
    {},
    atletico.id
  );
  const eventNames = (result.events || []).flatMap(event => [event.player?.name || event.player, event.assist?.name || event.assist]).filter(Boolean);
  assert(!eventNames.some(name => /^Jugador \d+$/.test(name)), 'La simulación histórica no debe generar nombres genéricos', { eventNames });

  const otherLeagues = initializeOtherLeaguesFromUniverse(universe, 'laliga', null);
  assert(otherLeagues.segunda?.table?.length >= 20, 'Otras ligas históricas deben inicializarse desde 2006/07, no desde 2025/26', { segundaRows: otherLeagues.segunda?.table?.length });

  console.log(JSON.stringify({
    ok: true,
    season,
    atleticoPlayers: atletico.players.length,
    recreativoPlayers: recreativo.players.length,
    laligaTeams: laligaTeams.length,
    sampleAtleticoPlayers: atletico.players.slice(0, 8).map(player => player.name),
    simulatedEventNames: eventNames.slice(0, 8),
    otherLeagues: Object.keys(otherLeagues).length,
    tableRows: table.length
  }, null, 2));
} finally {
  await vite.close();
}
