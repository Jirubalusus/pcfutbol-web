/**
 * Audit: historical-season continental draw + league rollover integrity.
 *
 * Goal (Pablo's bug report): starting a career from a historical database season,
 * the Champions / Europe draw must NOT be frozen or reseeded with current-era
 * (2025/26) clubs season after season. It has to be derived from the live final
 * tables of the season that was actually played, and it must change when those
 * tables change. League promotion/relegation must keep the historical league
 * compositions, with both tiers swapping real teams when they exist.
 *
 * This audit iterates every playable historical season in
 * public/historical-db/index.json, loads the on-disk datasets (no network), and
 * asserts:
 *   1. The European fallback getter built from live state returns HISTORICAL
 *      clubs for present leagues and never seeds historical saves with the
 *      static current-era pool.
 *   2. qualifyTeamsForEurope, fed the live historical standings, produces
 *      continental entrants drawn from that season's historical clubs (for the
 *      leagues that exist in the dataset).
 *   3. Different final standings produce different Champions entrants
 *      (i.e. the draw is reactive to the season actually played, not frozen).
 *   4. Promotion/relegation tiers (LaLiga↔Segunda and the available non-Spanish
 *      pairs) exist with enough teams to swap real clubs.
 *
 * Run: npm run audit:historical-season-rollover
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Defensive fetch stub: this audit reads datasets from disk, but importing the
// universe builder pulls in modules that may probe network/config lazily.
globalThis.fetch = async () => { throw new Error('network disabled in audit'); };

const {
  buildHistoricalUniverseFromDataset,
  buildEuropeanFallbackTeamGetter,
  initializeOtherLeaguesFromUniverse,
  getTeamsForLeague,
  getAllTeamsFromUniverse,
  toGameLeagueId,
} = await import('../src/data/activeSeasonUniverse.js');
const {
  qualifyTeamsForEurope,
  ensureEuropeanLeagueStandings,
  LEAGUE_SLOTS,
} = await import('../src/game/europeanCompetitions.js');
const {
  simulateOtherLeaguesWeek,
  initializeNewSeasonWithPromotions,
} = await import('../src/game/multiLeagueEngine.js');

// ── on-disk dataset loading ────────────────────────────────────────────────
const SEASONS_DIR = new URL('../public/historical-db/seasons/', import.meta.url);
const INDEX_URL = new URL('../public/historical-db/index.json', import.meta.url);

function readSeasonFile(seasonId, name) {
  const base = new URL(`${seasonId}/`, SEASONS_DIR);
  const plain = new URL(`${name}.json`, base);
  if (fs.existsSync(plain)) return JSON.parse(fs.readFileSync(plain, 'utf8'));
  const gz = new URL(`${name}.json.gz`, base);
  if (fs.existsSync(gz)) return JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString('utf8'));
  throw new Error(`Dataset file no encontrado: ${seasonId}/${name}.json(.gz)`);
}

function loadSeasonDatasetFromDisk(seasonInfo) {
  const teams = readSeasonFile(seasonInfo.id, 'teams');
  const leagues = readSeasonFile(seasonInfo.id, 'leagues');
  // Players/squads are not needed for league-composition / qualification checks.
  return { teams, leagues, seasonInfo };
}

// ── helpers ────────────────────────────────────────────────────────────────
const slotsFor = (leagueId) => LEAGUE_SLOTS[leagueId];
const neededFor = (leagueId) => {
  const s = slotsFor(leagueId);
  return (s.championsLeague || 0) + (s.europaLeague || 0) + (s.conferenceleague || 0);
};

// Build a "final table" for a league entry by ordering its teams by historical
// rank (rank 1 = champion). Stable + realistic; the exact order only needs to be
// deterministic and perturbable.
function entryStandings(teams) {
  return [...teams]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((t, i) => ({
      teamId: t.id,
      teamName: t.name,
      shortName: t.shortName || '',
      reputation: t.reputation || 70,
      overall: t.overall || 70,
      leaguePosition: i + 1,
    }));
}

// Synthetic real-ish standings for LEAGUE_SLOTS leagues absent from a historical
// dataset (e.g. Ukraine/Poland/Sweden in older seasons). Mirrors the documented
// last-resort fallback so qualification completes; clearly tagged non-historical.
function syntheticStandings(leagueId) {
  const n = Math.max(neededFor(leagueId) + 4, 10);
  return Array.from({ length: n }, (_, i) => ({
    teamId: `synthetic-${leagueId}-${i + 1}`,
    teamName: `${leagueId} placeholder ${i + 1}`,
    shortName: 'SYN',
    reputation: 70,
    overall: 70,
    leaguePosition: i + 1,
  }));
}

const championsIds = (qualified) =>
  qualified.championsLeague.map((t) => t.teamId || t.id);

// Non-Spanish promotion/relegation pairs we expect to find in historical data.
const PROMOTION_PAIRS = [
  { top: 'laliga', bottom: 'laliga2', label: 'LaLiga ↔ Segunda' },
  { top: 'premierLeague', bottom: 'championship', label: 'Premier ↔ Championship' },
  { top: 'serieA', bottom: 'serieB', label: 'Serie A ↔ Serie B' },
  { top: 'bundesliga', bottom: 'bundesliga2', label: 'Bundesliga ↔ Bundesliga 2' },
  { top: 'ligue1', bottom: 'ligue2', label: 'Ligue 1 ↔ Ligue 2' },
];

// ── main ───────────────────────────────────────────────────────────────────
const index = JSON.parse(fs.readFileSync(INDEX_URL, 'utf8'));
const seasons = (index.seasons || []).filter((s) => (s.counts?.players ?? 1) > 0);
assert.ok(seasons.length > 0, 'No hay temporadas históricas jugables en index.json');

let totalSeasons = 0;
let totalEuropeanLeaguesChecked = 0;
let totalReactivityChecks = 0;
let totalOtherLeagueSimulationChecks = 0;
let totalRolloverChecks = 0;
let totalPromotionSwapChecks = 0;
const pairAvailability = Object.fromEntries(PROMOTION_PAIRS.map((p) => [p.label, 0]));

for (const seasonInfo of seasons) {
  const dataset = loadSeasonDatasetFromDisk(seasonInfo);
  const universe = buildHistoricalUniverseFromDataset(dataset, {
    id: seasonInfo.id,
    label: seasonInfo.label,
    startYear: seasonInfo.seasonStartYear,
  });

  const historicalTeamIds = new Set(dataset.teams.map((t) => t.id));
  const allTeamsMap = {};
  for (const team of getAllTeamsFromUniverse(universe)) {
    allTeamsMap[team.id || team.teamId] = team;
  }

  // Present European leagues in this season's universe.
  const presentEuropean = [];
  const universeLeagueIds = new Set(universe.entries.map((e) => e.id));
  for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
    if (universeLeagueIds.has(leagueId)) presentEuropean.push(leagueId);
  }
  assert.ok(
    presentEuropean.length >= 10,
    `${seasonInfo.id}: muy pocas ligas europeas presentes (${presentEuropean.length})`
  );

  // Live standings for the season that just ended.
  const liveStandings = {};
  for (const leagueId of presentEuropean) {
    const teams = getTeamsForLeague(universe, leagueId);
    if (teams.length >= neededFor(leagueId)) {
      liveStandings[leagueId] = entryStandings(teams);
    }
  }

  // ── 1) Fallback getter: live history first, no current-era contamination ──
  const otherLeagues = initializeOtherLeaguesFromUniverse(universe, 'laliga');
  const historicalState = {
    historicalDatabase: true,
    databaseSeasonId: seasonInfo.id,
    playerLeagueId: 'laliga',
    leagueTable: liveStandings.laliga || [],
    otherLeagues,
  };
  const liveGetter = buildEuropeanFallbackTeamGetter(historicalState, { allTeamsMap });

  for (const leagueId of presentEuropean) {
    if (leagueId === 'laliga') continue; // player league validated below
    const got = liveGetter(leagueId);
    if (got && got.length) {
      for (const team of got) {
        assert.ok(
          historicalTeamIds.has(team.id || team.teamId),
          `${seasonInfo.id}: getter europeo devolvió un club NO histórico para ${leagueId}: ${team.id}`
        );
      }
    }
  }
  // Player league resolves from the live final table.
  if ((liveStandings.laliga || []).length) {
    const playerPool = liveGetter('laliga');
    assert.ok(playerPool && playerPool.length > 0, `${seasonInfo.id}: getter no resolvió la liga del jugador`);
    for (const team of playerPool) {
      assert.ok(
        historicalTeamIds.has(team.id || team.teamId),
        `${seasonInfo.id}: liga del jugador con club no histórico ${team.id}`
      );
    }
  }
  // Historical save must NOT seed an absent league with current-era clubs.
  const absent = Object.keys(LEAGUE_SLOTS).find((id) => !universeLeagueIds.has(id));
  if (absent) {
    const noStaticGetter = buildEuropeanFallbackTeamGetter(historicalState, { allTeamsMap, allowStaticFallback: false });
    const seeded = noStaticGetter(absent);
    assert.ok(
      !seeded || seeded.length === 0,
      `${seasonInfo.id}: liga ausente ${absent} fue sembrada con datos estáticos en una partida histórica`
    );
  }

  // ── 2) Qualification uses historical clubs for present leagues ───────────
  const fullStandings = { ...liveStandings };
  for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
    if (!fullStandings[leagueId]) fullStandings[leagueId] = syntheticStandings(leagueId);
  }
  const auditGetter = (leagueId) => liveGetter(leagueId) || syntheticStandings(leagueId);
  const patched = ensureEuropeanLeagueStandings(fullStandings, auditGetter);
  const qualified = qualifyTeamsForEurope(patched, allTeamsMap);

  for (const comp of ['championsLeague', 'europaLeague', 'conferenceleague']) {
    for (const team of qualified[comp]) {
      if (presentEuropean.includes(team.league)) {
        assert.ok(
          historicalTeamIds.has(team.teamId || team.id),
          `${seasonInfo.id}: ${comp} incluye club no histórico ${team.teamId} de ${team.league}`
        );
      }
    }
  }
  totalEuropeanLeaguesChecked += presentEuropean.length;

  // ── 3) Reactivity: different final tables → different Champions ──────────
  // Pick the biggest present league and reverse its table.
  const reactLeague = presentEuropean
    .filter((id) => (liveStandings[id]?.length || 0) >= neededFor(id) + 4)
    .sort((a, b) => (liveStandings[b].length - liveStandings[a].length))[0];
  if (reactLeague) {
    const baseChampions = qualifyTeamsForEurope(patched, allTeamsMap)
      .championsLeague.filter((t) => t.league === reactLeague)
      .map((t) => t.teamId);
    const perturbed = { ...patched, [reactLeague]: [...patched[reactLeague]].reverse() };
    const newChampions = qualifyTeamsForEurope(perturbed, allTeamsMap)
      .championsLeague.filter((t) => t.league === reactLeague)
      .map((t) => t.teamId);
    assert.notDeepEqual(
      [...baseChampions].sort(),
      [...newChampions].sort(),
      `${seasonInfo.id}: la Champions de ${reactLeague} no cambió al alterar la tabla final (draw congelado)`
    );
    totalReactivityChecks++;
  }

  // ── 4) Runtime proof: historical other-league fixtures actually play ─────
  // This catches the original freeze: simulateOtherLeaguesWeek used static
  // 2025/26 pools, so historical fixture team IDs were not found and week-1
  // matches stayed unplayed forever.
  const simLeagueId = ['premierLeague', 'serieA', 'bundesliga', 'ligue1']
    .find((id) => otherLeagues[id]?.fixtures?.some((f) => f.week === 1 && !f.played));
  assert.ok(simLeagueId, `${seasonInfo.id}: no hay liga histórica simulable para semana 1`);
  const beforeUnplayed = otherLeagues[simLeagueId].fixtures.filter((f) => f.week === 1 && !f.played).length;
  const simulated = simulateOtherLeaguesWeek({ [simLeagueId]: otherLeagues[simLeagueId] }, 1)[simLeagueId];
  const afterPlayed = simulated.fixtures.filter((f) => f.week === 1 && f.played).length;
  assert.equal(
    afterPlayed,
    beforeUnplayed,
    `${seasonInfo.id}: ${simLeagueId} no simuló todos los partidos históricos de semana 1`
  );
  totalOtherLeagueSimulationChecks++;

  // ── 5) Runtime proof: rollover preserves historical composition + swaps ──
  const playerTeam = getTeamsForLeague(universe, 'laliga')[0];
  assert.ok(playerTeam?.id, `${seasonInfo.id}: no hay equipo jugador para rollover histórico`);
  const rolloverState = {
    historicalDatabase: true,
    databaseSeasonId: seasonInfo.id,
    playerLeagueId: 'laliga',
    teamId: playerTeam.id,
    team: playerTeam,
    leagueTable: liveStandings.laliga || [],
    fixtures: [],
    leagueTeams: getAllTeamsFromUniverse(universe),
    otherLeagues,
  };
  const rollover = initializeNewSeasonWithPromotions(rolloverState, playerTeam.id);
  const nextTable = (leagueId) => (
    rollover.newPlayerLeagueId === leagueId ? rollover.playerLeague?.table : rollover.otherLeagues?.[leagueId]?.table
  ) || [];
  const nextLaLiga = nextTable('laliga');
  const nextPremier = nextTable('premierLeague');
  assert.ok(nextLaLiga.length >= 18, `${seasonInfo.id}: rollover dejó LaLiga incompleta`);
  assert.ok(nextPremier.length >= 18, `${seasonInfo.id}: rollover dejó Premier incompleta`);
  for (const row of [...nextLaLiga, ...nextPremier]) {
    assert.ok(
      historicalTeamIds.has(row.teamId || row.id),
      `${seasonInfo.id}: rollover metió club estático/no histórico ${row.teamId || row.id}`
    );
  }

  const segundaTop2 = (otherLeagues.segunda?.table || []).slice(0, 2).map((t) => t.teamId);
  const laligaBottom3 = (liveStandings.laliga || []).slice(-3).map((t) => t.teamId);
  const nextLaLigaIds = new Set(nextLaLiga.map((t) => t.teamId));
  for (const id of segundaTop2) {
    assert.ok(nextLaLigaIds.has(id), `${seasonInfo.id}: ascenso histórico Segunda→LaLiga no aplicado (${id})`);
  }
  for (const id of laligaBottom3) {
    assert.ok(!nextLaLigaIds.has(id), `${seasonInfo.id}: descenso histórico LaLiga→Segunda no aplicado (${id})`);
  }

  const championshipTop2 = (otherLeagues.championship?.table || []).slice(0, 2).map((t) => t.teamId);
  const nextPremierIds = new Set(nextPremier.map((t) => t.teamId));
  for (const id of championshipTop2) {
    assert.ok(nextPremierIds.has(id), `${seasonInfo.id}: ascenso histórico Championship→Premier no aplicado (${id})`);
  }
  totalRolloverChecks++;
  totalPromotionSwapChecks += 2;

  // ── 6) Promotion/relegation tiers exist with real teams to swap ──────────
  for (const pair of PROMOTION_PAIRS) {
    const topTeams = getTeamsForLeague(universe, pair.top);
    const bottomTeams = getTeamsForLeague(universe, pair.bottom);
    if (topTeams.length >= 16 && bottomTeams.length >= 8) {
      pairAvailability[pair.label]++;
      // Tiers must be disjoint real clubs (so promotions move actual teams).
      const overlap = topTeams.filter((t) => bottomTeams.some((b) => b.id === t.id));
      assert.equal(
        overlap.length, 0,
        `${seasonInfo.id}: ${pair.label} comparte clubes entre divisiones (${overlap.length})`
      );
    }
  }
  // LaLiga↔Segunda must always be available with full divisions.
  assert.ok(
    getTeamsForLeague(universe, 'laliga').length >= 18,
    `${seasonInfo.id}: LaLiga histórica incompleta`
  );
  assert.ok(
    getTeamsForLeague(universe, 'laliga2').length >= 18,
    `${seasonInfo.id}: Segunda histórica incompleta`
  );

  totalSeasons++;
}

// ── report ───────────────────────────────────────────────────────────────
console.log('✅ Audit historical-season-rollover OK');
console.log(`   Temporadas comprobadas:        ${totalSeasons}`);
console.log(`   Ligas europeas verificadas:    ${totalEuropeanLeaguesChecked}`);
console.log(`   Comprobaciones de reactividad:  ${totalReactivityChecks} (Champions cambia con la tabla)`);
console.log(`   Simulación histórica week-1:    ${totalOtherLeagueSimulationChecks} ligas comprobadas`);
console.log(`   Rollovers históricos:           ${totalRolloverChecks} temporadas comprobadas`);
console.log(`   Swaps asc/desc runtime:         ${totalPromotionSwapChecks} pares directos comprobados`);
console.log('   Disponibilidad de pares de ascenso/descenso:');
for (const [label, count] of Object.entries(pairAvailability)) {
  console.log(`     - ${label}: ${count}/${totalSeasons} temporadas`);
}
