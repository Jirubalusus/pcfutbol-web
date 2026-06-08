/**
 * Audit: historical season → European competition → prize economy balance.
 *
 * Pablo's report (paraphrased): playing a historical season, a SMALL club that
 * reaches Europe earns too much spendable cash — one continental run makes an
 * underdog instantly rich and trivialises the climb. This audit pins down the
 * fix and guards the surrounding flow end-to-end on a real historical dataset.
 *
 * It loads a representative playable historical season from disk (2009-10,
 * falling back to the newest available), with NO network, and asserts:
 *
 *   PART A — Historical integrity (no current-era contamination):
 *     1. Continental entrants qualified from the season's live final tables are
 *        the season's HISTORICAL clubs (for leagues present in the dataset).
 *     2. A full Champions run for a real historical entrant initialises, plays
 *        and completes, accumulating gross prize money.
 *     3. LaLiga ↔ Segunda promotion/relegation rollover swaps real historical
 *        clubs between the two tiers (direct pair, as requested).
 *
 *   PART B — Prize → spendable cash balance:
 *     4. getEuropeanPrizeCashflowMultiplier is bounded in [0.4, 1.0], monotonic
 *        non-decreasing in reputation, floors at <=60 rep, ceils at >=85 rep.
 *     5. Elite clubs (rep 90) bank the FULL gross prize (multiplier 1.0).
 *     6. A small club (rep ~64) reaching Europe banks a REDUCED, sane amount:
 *        - a Champions PARTICIPATION fee no longer dwarfs a small budget,
 *        - a realistic group-stage Conference run stays in a sane cash band,
 *        - the same gross always credits a small club strictly less than elite.
 *
 * Run: npm run audit:european-prize-economy
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
globalThis.fetch = async () => { throw new Error('network disabled in audit'); };

const {
  buildHistoricalUniverseFromDataset,
  getTeamsForLeague,
  getAllTeamsFromUniverse,
  initializeOtherLeaguesFromUniverse,
} = await import('../src/data/activeSeasonUniverse.js');
const {
  qualifyTeamsForEurope,
  ensureEuropeanLeagueStandings,
  calculatePrizeMoney,
  getEuropeanPrizeCashflowMultiplier,
  applyEuropeanPrizeCashflow,
  LEAGUE_SLOTS,
  CHAMPIONS_LEAGUE,
  CONFERENCE_LEAGUE,
} = await import('../src/game/europeanCompetitions.js');
const {
  initializeEuropeanCompetitions,
  simulateEuropeanMatchday,
  advanceEuropeanPhase,
  recordPlayerLeagueResult,
  recordPlayerKnockoutResult,
} = await import('../src/game/europeanSeason.js');
const { initializeNewSeasonWithPromotions } = await import('../src/game/multiLeagueEngine.js');

// ── on-disk dataset loading (mirrors audit-historical-season-rollover) ───────
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

const index = JSON.parse(fs.readFileSync(INDEX_URL, 'utf8'));
const playable = (index.seasons || []).filter((s) => (s.counts?.players ?? 0) > 0);
assert.ok(playable.length > 0, 'No hay temporadas históricas jugables en index.json');
// Representative season requested by Pablo, with a deterministic fallback.
const seasonInfo = playable.find((s) => s.id === '2009-10') || playable[0];

const dataset = {
  teams: readSeasonFile(seasonInfo.id, 'teams'),
  leagues: readSeasonFile(seasonInfo.id, 'leagues'),
  seasonInfo,
};
const universe = buildHistoricalUniverseFromDataset(dataset, {
  id: seasonInfo.id,
  label: seasonInfo.label,
  startYear: seasonInfo.seasonStartYear,
});
const historicalTeamIds = new Set(dataset.teams.map((t) => t.id));

const neededFor = (leagueId) => {
  const s = LEAGUE_SLOTS[leagueId];
  return (s.championsLeague || 0) + (s.europaLeague || 0) + (s.conferenceleague || 0);
};
function entryStandings(teams) {
  return [...teams]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .map((t, i) => ({
      teamId: t.id, teamName: t.name, shortName: t.shortName || '',
      reputation: t.reputation || 70, overall: t.overall || 70, leaguePosition: i + 1,
    }));
}

// ── PART A.1 — historical continental qualification ──────────────────────────
const allTeamsMap = {};
for (const team of getAllTeamsFromUniverse(universe)) {
  allTeamsMap[team.id || team.teamId] = team;
}
const universeLeagueIds = new Set(universe.entries.map((e) => e.id));
const presentEuropean = Object.keys(LEAGUE_SLOTS).filter((id) => universeLeagueIds.has(id));

const liveStandings = {};
for (const leagueId of presentEuropean) {
  const teams = getTeamsForLeague(universe, leagueId);
  if (teams.length >= neededFor(leagueId)) liveStandings[leagueId] = entryStandings(teams);
}
const auditGetter = (leagueId) => {
  const teams = getTeamsForLeague(universe, leagueId);
  return teams.length ? entryStandings(teams) : null;
};
const patched = ensureEuropeanLeagueStandings(liveStandings, auditGetter);
// Last-resort synthetic fillers for slot-leagues absent from this old dataset.
for (const leagueId of Object.keys(LEAGUE_SLOTS)) {
  if (!Array.isArray(patched[leagueId]) || patched[leagueId].length < neededFor(leagueId)) {
    const n = Math.max(neededFor(leagueId) + 4, 10);
    patched[leagueId] = Array.from({ length: n }, (_, i) => ({
      teamId: `synthetic-${leagueId}-${i + 1}`, teamName: `${leagueId} filler ${i + 1}`,
      shortName: 'SYN', reputation: 70, overall: 70, leaguePosition: i + 1,
    }));
  }
}
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

// ── PART A.2 — full Champions run for a real historical entrant ──────────────
// Pick the top Champions entrant (whichever club tops the strongest league) so
// membership is guaranteed; the player wins every match → prize accrual is
// deterministic regardless of the random Swiss/knockout draws.
const playerEntrant = qualified.championsLeague[0];
const playerTeamId = playerEntrant.teamId;
assert.ok(historicalTeamIds.has(playerTeamId), `Entrant Champions no histórico: ${playerTeamId}`);

const europeanState = initializeEuropeanCompetitions(qualified);
let comp = europeanState.competitions.championsLeague;
assert.ok(comp.teams.some((t) => t.teamId === playerTeamId), 'Jugador ausente del estado Champions');

const playerWin = (homeTeamId, awayTeamId) => {
  const playerHome = homeTeamId === playerTeamId;
  return { homeTeamId, awayTeamId, homeScore: playerHome ? 3 : 0, awayScore: playerHome ? 0 : 3, events: [] };
};
for (let md = 1; md <= 8; md++) {
  const { updatedState, playerMatch } = simulateEuropeanMatchday(comp, md, playerTeamId);
  comp = updatedState;
  assert.ok(playerMatch, `No se encontró el partido del jugador en la jornada ${md}`);
  comp = recordPlayerLeagueResult(comp, playerWin(playerMatch.homeTeamId, playerMatch.awayTeamId), md);
}
const matchupTeams = (m) => [m.team1 || m.homeTeam, m.team2 || m.awayTeam];
const findPlayerKO = (c, phase) => {
  if (phase === 'final') return c.finalMatchup && !c.finalResult ? c.finalMatchup : null;
  return (c[`${phase}Results`] || []).find(
    (r) => !r.winner && (r.team1?.teamId === playerTeamId || r.team2?.teamId === playerTeamId)
  ) || null;
};
for (let guard = 0; guard < 20 && comp.phase !== 'completed'; guard++) {
  const phase = comp.phase;
  if (['playoff', 'r16', 'qf', 'sf', 'final'].includes(phase)) {
    const m = findPlayerKO(comp, phase);
    if (m) {
      const [t1, t2] = matchupTeams(m);
      comp = recordPlayerKnockoutResult(comp, playerWin(t1.teamId, t2.teamId), phase);
      continue;
    }
  }
  const { updatedState, playerMatch } = advanceEuropeanPhase(comp, playerTeamId);
  comp = updatedState;
  if (playerMatch) {
    const ph = phase === 'league' ? 'playoff' : phase;
    const [t1, t2] = matchupTeams(playerMatch);
    comp = recordPlayerKnockoutResult(comp, playerWin(t1.teamId, t2.teamId), ph);
  }
}
assert.equal(comp.phase, 'completed', `La Champions histórica no se completó (fase=${comp.phase})`);
const grossChampionsRun = comp.prizesMoney?.[playerTeamId] || 0;
assert.ok(grossChampionsRun > 0, 'La temporada europea histórica no acumuló premios');

// ── PART A.3 — LaLiga ↔ Segunda rollover swaps real historical clubs ─────────
const otherLeagues = initializeOtherLeaguesFromUniverse(universe, 'laliga');
const laligaTeam = getTeamsForLeague(universe, 'laliga')[0];
const rolloverState = {
  historicalDatabase: true,
  databaseSeasonId: seasonInfo.id,
  playerLeagueId: 'laliga',
  teamId: laligaTeam.id,
  team: laligaTeam,
  leagueTable: liveStandings.laliga || [],
  fixtures: [],
  leagueTeams: getAllTeamsFromUniverse(universe),
  otherLeagues,
};
const rollover = initializeNewSeasonWithPromotions(rolloverState, laligaTeam.id);
const nextLaLiga = (rollover.newPlayerLeagueId === 'laliga'
  ? rollover.playerLeague?.table
  : rollover.otherLeagues?.laliga?.table) || [];
assert.ok(nextLaLiga.length >= 18, 'Rollover dejó LaLiga incompleta');
const nextLaLigaIds = new Set(nextLaLiga.map((t) => t.teamId || t.id));
for (const row of nextLaLiga) {
  assert.ok(historicalTeamIds.has(row.teamId || row.id), `Rollover metió club no histórico ${row.teamId || row.id}`);
}
const segundaTop2 = (otherLeagues.segunda?.table || []).slice(0, 2).map((t) => t.teamId);
const laligaBottom3 = (liveStandings.laliga || []).slice(-3).map((t) => t.teamId);
assert.ok(segundaTop2.length === 2, 'No hay Segunda histórica para ascender');
for (const id of segundaTop2) {
  assert.ok(nextLaLigaIds.has(id), `Ascenso Segunda→LaLiga no aplicado (${id})`);
}
for (const id of laligaBottom3) {
  assert.ok(!nextLaLigaIds.has(id), `Descenso LaLiga→Segunda no aplicado (${id})`);
}

// ── PART B.4 — multiplier is bounded + monotonic ─────────────────────────────
let prev = -1;
for (let rep = 40; rep <= 99; rep++) {
  const m = getEuropeanPrizeCashflowMultiplier({ reputation: rep });
  assert.ok(m >= 0.4 - 1e-9 && m <= 1.0 + 1e-9, `Multiplier fuera de [0.4,1] en rep=${rep}: ${m}`);
  assert.ok(m >= prev - 1e-9, `Multiplier no monótono en rep=${rep}: ${m} < ${prev}`);
  prev = m;
}
assert.equal(getEuropeanPrizeCashflowMultiplier({ reputation: 55 }), 0.4, 'Suelo de small club roto');
assert.equal(getEuropeanPrizeCashflowMultiplier({ reputation: 60 }), 0.4, 'Suelo en rep=60 roto');
assert.equal(getEuropeanPrizeCashflowMultiplier({ reputation: 85 }), 1.0, 'Techo en rep=85 roto');
assert.equal(getEuropeanPrizeCashflowMultiplier({ reputation: 95 }), 1.0, 'Techo de elite roto');
assert.equal(getEuropeanPrizeCashflowMultiplier({}), getEuropeanPrizeCashflowMultiplier({ reputation: 70 }),
  'Default de reputación debe ser 70');

// ── PART B.5 — elite clubs bank the full gross ───────────────────────────────
const eliteTeam = { reputation: 90 };
const grossParticipationCL = CHAMPIONS_LEAGUE.prizes.participation; // 15M
assert.equal(applyEuropeanPrizeCashflow(grossParticipationCL, eliteTeam), grossParticipationCL,
  'Elite no recibe el premio íntegro');
assert.equal(applyEuropeanPrizeCashflow(grossChampionsRun, eliteTeam), Math.round(grossChampionsRun),
  'Elite no recibe la campaña Champions íntegra');

// ── PART B.6 — a small club banks a reduced, sane amount ─────────────────────
const smallTeam = { reputation: 64 }; // typical promoted / small LaLiga side
const smallMult = getEuropeanPrizeCashflowMultiplier(smallTeam);

// (a) Champions participation fee no longer dwarfs a small budget.
const creditedParticipation = applyEuropeanPrizeCashflow(grossParticipationCL, smallTeam);
assert.ok(creditedParticipation < grossParticipationCL,
  'La cuota de participación Champions no se redujo para un equipo pequeño');
// A small club's budget is ~3M–15M; the credited participation must not exceed
// it outright (15M flat is the bug). Bounded well under the full fee.
assert.ok(creditedParticipation <= 9_000_000,
  `Participación Champions acreditada demasiado alta para club pequeño: ${creditedParticipation}`);

// (b) A realistic Conference group-stage run (the path a small club actually
//     takes: lower slots → Conference) stays in a sane spendable band.
const conferenceRun = calculatePrizeMoney(CONFERENCE_LEAGUE, {
  wins: 3, draws: 2, phasesReached: [], isWinner: false, // eliminated in league phase
});
const creditedConference = applyEuropeanPrizeCashflow(conferenceRun, smallTeam);
assert.ok(creditedConference >= 1_000_000 && creditedConference <= 4_000_000,
  `Campaña Conference de club pequeño fuera de banda sana: ${creditedConference} (bruto ${conferenceRun})`);

// (c) The same gross always credits a small club strictly less than an elite one.
for (const gross of [grossParticipationCL, conferenceRun, grossChampionsRun]) {
  const small = applyEuropeanPrizeCashflow(gross, smallTeam);
  const elite = applyEuropeanPrizeCashflow(gross, eliteTeam);
  assert.ok(small < elite, `Club pequeño no recibe menos que elite para bruto ${gross}`);
}

// ── report ───────────────────────────────────────────────────────────────────
console.log('✅ Audit european-prize-economy OK');
console.log(`   Temporada histórica:            ${seasonInfo.id} (${seasonInfo.label})`);
console.log(`   Ligas europeas presentes:       ${presentEuropean.length}`);
console.log(`   Campaña Champions (bruto):      €${(grossChampionsRun / 1_000_000).toFixed(1)}M (entrante histórico ${playerEntrant.teamName})`);
console.log(`   Multiplicador cashflow rep=64:  ${smallMult.toFixed(3)} (small)  |  rep=90: 1.000 (elite)`);
console.log('   Banda de caja para club pequeño:');
console.log(`     - Participación Champions: bruto €15.0M → acreditado €${(creditedParticipation / 1_000_000).toFixed(2)}M`);
console.log(`     - Conference fase liga:    bruto €${(conferenceRun / 1_000_000).toFixed(1)}M → acreditado €${(creditedConference / 1_000_000).toFixed(2)}M`);
console.log('   Rollover LaLiga↔Segunda:        ascensos/descensos históricos aplicados ✔');
