import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5175';
const seasons = (process.env.SEASONS || 'current,2012-13,2022-23,2004-05').split(',').map(s => s.trim()).filter(Boolean);
const outDir = new URL('../dogfood-output/playwright-modes-season-audit/', import.meta.url);
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();
const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));

function fail(message, data = {}) {
  const error = new Error(message);
  error.auditData = data;
  throw error;
}

await page.goto(`${baseURL}/?v=playwright-modes-season-audit-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => document.readyState !== 'loading', null, { timeout: 60000 });

const report = await page.evaluate(async ({ seasons }) => {
  const assertBrowser = (condition, message, data = {}) => {
    if (!condition) {
      const error = new Error(message);
      error.auditData = data;
      throw error;
    }
  };

  const seededRandomFactory = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  };

  const originalRandom = Math.random;
  Math.random = seededRandomFactory(0x51a7e202);

  try {
    const teamsDataMod = await import('/src/data/teamsFirestore.js');
    await teamsDataMod.loadAllData();
    const universeMod = await import('/src/data/activeSeasonUniverse.js');
    const leagueMod = await import('/src/game/leagueEngine.js');
    const groupLeagueMod = await import('/src/game/groupLeagueEngine.js');
    const multiLeagueMod = await import('/src/game/multiLeagueEngine.js');
    const transferMod = await import('/src/game/globalTransferEngine.js');
    const rankedMod = await import('/src/game/rankedSimulation.js');

    const tableFromTeams = (teams, played = 38) => teams.map((team, index) => ({
      teamId: team.id,
      teamName: team.name || team.shortName || team.id,
      played,
      won: Math.max(0, teams.length - index - 1),
      drawn: 0,
      lost: index,
      goalsFor: Math.max(0, teams.length - index) * 2,
      goalsAgainst: index,
      goalDifference: Math.max(0, teams.length - index) * 2 - index,
      points: (teams.length - index) * 3,
      form: [],
      morale: 70,
    }));

    const countPlayers = (teams) => teams.reduce((sum, team) => sum + ((team.players || []).length), 0);
    const duplicateCompositeCount = (teams) => {
      const counts = new Map();
      for (const team of teams) {
        for (const p of (team.players || [])) {
          const key = `${p.name || 'sin'}|${p.overall || 0}|${p.age || 0}|${p.position || ''}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      return Array.from(counts.values()).filter(v => v > 1).length;
    };

    const ids = arr => (arr || []).map(item => item.teamId || item.id).filter(Boolean);
    const hasAll = (container, expected) => expected.every(id => container.includes(id));
    const findEntry = (universe, leagueId) => universe.entries.find(e => e.id === leagueId && (e.teams || []).length >= 6);
    const sampleTeamNames = entry => (entry?.teams || []).slice(0, 5).map(t => t.name || t.id);

    const choosePairs = (universe) => {
      const pairs = [
        ['laliga', 'segunda'],
        ['premierLeague', 'championship'],
        ['serieA', 'serieB'],
        ['bundesliga', 'bundesliga2'],
        ['ligue1', 'ligue2'],
      ];
      return pairs
        .map(([top, bottom]) => ({ top, bottom, topEntry: findEntry(universe, top), bottomEntry: findEntry(universe, bottom) }))
        .filter(p => p.topEntry && p.bottomEntry);
    };

    const auditModeSetup = (season, universe, allTeams) => {
      const entries = universe.entries.filter(e => (e.teams || []).length >= 6);
      assertBrowser(entries.length >= 3, `Universo insuficiente para ${season}`, { entries: entries.length });
      assertBrowser(allTeams.length >= 80, `Pool global demasiado pequeño para ${season}`, { teams: allTeams.length });

      const sampledEntries = entries.slice(0, 6);
      const careerLeagues = sampledEntries.map(entry => {
        const initialized = leagueMod.initializeLeague(entry.teams, entry.teams[0]?.id);
        assertBrowser(initialized.table.length === entry.teams.length, `Carrera no inicializa tabla completa en ${season}/${entry.id}`, { expected: entry.teams.length, actual: initialized.table.length });
        assertBrowser(initialized.fixtures.length > 0, `Carrera sin calendario en ${season}/${entry.id}`);
        return { id: entry.id, sourceLeagueId: entry.sourceLeagueId, teams: entry.teams.length, fixtures: initialized.fixtures.length, sample: sampleTeamNames(entry) };
      });

      // Contrarreloj and ProManager use the same active-season universe pool for candidates/offers.
      const candidates = allTeams.filter(t => (t.players || []).length >= 10).slice(0, 12);
      assertBrowser(candidates.length >= 6, `Contrarreloj/ProManager sin candidatos suficientes en ${season}`, { candidates: candidates.length });

      // Glory must find a lower Spanish tier in the active universe, even for old Segunda B seasons.
      const lowerSpanish = universe.entries.find(e => ['segundaRFEF', 'primeraRFEF'].includes(e.id) && (e.teams || []).length >= 6)
        || universe.entries.find(e => /España|Spain/i.test(e.country || '') && Number(e.tier || 99) >= 3 && (e.teams || []).length >= 6);
      assertBrowser(!!lowerSpanish, `Camino a la Gloria no encuentra división baja en ${season}`);
      const gloryInit = lowerSpanish.isGroup || lowerSpanish.groupId
        ? groupLeagueMod.initializeGroupLeague({ [lowerSpanish.groupId || lowerSpanish.sourceLeagueId || 'grupo1']: lowerSpanish.teams }, lowerSpanish.teams[0]?.id)
        : leagueMod.initializeLeague(lowerSpanish.teams, lowerSpanish.teams[0]?.id);
      const gloryFixtures = lowerSpanish.isGroup || lowerSpanish.groupId
        ? Object.values(gloryInit.groups || {}).reduce((sum, group) => sum + (group.fixtures || []).length, 0)
        : gloryInit.fixtures.length;
      assertBrowser(gloryFixtures > 0, `Camino a la Gloria sin calendario en ${season}/${lowerSpanish.id}`);

      return {
        career: careerLeagues,
        contrarreloj: { candidates: candidates.length, sample: candidates.slice(0, 5).map(t => t.name) },
        proManager: { offersPool: candidates.length, sample: candidates.slice(0, 5).map(t => t.name) },
        glory: { leagueId: lowerSpanish.id, sourceLeagueId: lowerSpanish.sourceLeagueId, teams: lowerSpanish.teams.length, fixtures: gloryFixtures, sample: sampleTeamNames(lowerSpanish) },
      };
    };

    const auditTransfers = (season, allTeams) => {
      const teams = allTeams.filter(t => (t.players || []).length >= 12).slice(0, 260);
      assertBrowser(teams.length >= 30, `No hay equipos suficientes con plantilla para fichajes en ${season}`, { teams: teams.length });
      const initialPlayers = countPlayers(teams);
      const initialDuplicateComposite = duplicateCompositeCount(teams);
      const engine = new transferMod.GlobalTransferEngine(new Map(), teams[0].id);
      engine.initializeTeams(teams);
      let transferEvents = 0;
      for (let week = 1; week <= 16; week += 1) {
        const events = engine.simulateWeek(week, true, week <= 8 ? 'summer' : 'winter');
        transferEvents += events.filter(e => e.type === 'transfer').length;
      }
      const finalTeams = Array.from(engine.allTeams.values());
      const finalPlayers = countPlayers(finalTeams);
      const finalDuplicateComposite = duplicateCompositeCount(finalTeams);
      const budgets = finalTeams.map(t => t.budget).filter(Number.isFinite);
      assertBrowser(transferEvents > 0, `Mercado sin fichajes en 16 semanas para ${season}`);
      assertBrowser(finalPlayers === initialPlayers, `Fichajes no conservan jugadores en ${season}`, { initialPlayers, finalPlayers, transferEvents });
      assertBrowser(finalDuplicateComposite <= initialDuplicateComposite + 3, `Fichajes crean duplicados anómalos en ${season}`, { initialDuplicateComposite, finalDuplicateComposite });
      assertBrowser(budgets.every(b => b >= 0), `Presupuestos negativos/NaN tras fichajes en ${season}`);
      return {
        teams: teams.length,
        initialPlayers,
        finalPlayers,
        transfers: transferEvents,
        totalSpent: engine.transferHistory.reduce((sum, t) => sum + (t.price || 0), 0),
        duplicateCompositeBefore: initialDuplicateComposite,
        duplicateCompositeAfter: finalDuplicateComposite,
        budgetMin: Math.min(...budgets),
        budgetMax: Math.max(...budgets),
        sample: engine.transferHistory.slice(0, 8).map(t => ({ player: t.player?.name, from: t.from?.name, to: t.to?.name, price: t.price })),
      };
    };

    const auditPromotions = (season, universe, allTeams) => {
      const pairs = choosePairs(universe).slice(0, 3);
      assertBrowser(pairs.length >= 1, `No hay pares de ascenso/descenso auditables en ${season}`);
      return pairs.map(pair => {
        const topTeams = pair.topEntry.teams.slice(0, pair.top === 'segunda' ? 22 : 20);
        const bottomTeams = pair.bottomEntry.teams.slice(0, pair.bottom === 'segunda' ? 22 : 24);
        const topTable = tableFromTeams(topTeams);
        const bottomTable = tableFromTeams(bottomTeams);
        const otherLeagues = universeMod.initializeOtherLeaguesFromUniverse(universe, pair.top, null);
        otherLeagues[pair.top] = { table: topTable, fixtures: leagueMod.initializeLeague(topTeams, null).fixtures };
        otherLeagues[pair.bottom] = { table: bottomTable, fixtures: leagueMod.initializeLeague(bottomTeams, null).fixtures };
        const state = {
          gameMode: 'career',
          databaseSeasonId: universe.databaseSeasonId,
          playerLeagueId: pair.top,
          leagueId: pair.top,
          teamId: topTeams[0].id,
          team: topTeams[0],
          leagueTable: topTable,
          fixtures: otherLeagues[pair.top].fixtures,
          otherLeagues,
          leagueTeams: allTeams,
        };
        const result = multiLeagueMod.initializeNewSeasonWithPromotions(state, state.teamId, null, {});
        const newTopIds = ids(result.newPlayerLeagueId === pair.top ? result.playerLeague.table : result.otherLeagues[pair.top]?.table);
        const newBottomIds = ids(result.newPlayerLeagueId === pair.bottom ? result.playerLeague.table : result.otherLeagues[pair.bottom]?.table);
        const directPromoted = ids(bottomTable).slice(0, pair.bottom === 'segunda' ? 2 : 2);
        const directRelegated = ids(topTable).slice(-(pair.top === 'laliga' ? 3 : 2));
        assertBrowser(newTopIds.length === topTeams.length, `Ascensos/descensos cambian tamaño de ${pair.top} en ${season}`, { old: topTeams.length, new: newTopIds.length, pair });
        assertBrowser(newBottomIds.length === bottomTeams.length, `Ascensos/descensos cambian tamaño de ${pair.bottom} en ${season}`, { old: bottomTeams.length, new: newBottomIds.length, pair });
        assertBrowser(hasAll(newTopIds, directPromoted), `Ascendidos directos no aparecen en ${pair.top} (${season})`, { directPromoted, newTopIds: newTopIds.slice(0, 30), pair });
        assertBrowser(directRelegated.every(id => !newTopIds.includes(id)), `Descendidos siguen en ${pair.top} (${season})`, { directRelegated, pair });
        assertBrowser(hasAll(newBottomIds, directRelegated), `Descendidos no aparecen en ${pair.bottom} (${season})`, { directRelegated, pair });
        return {
          top: pair.top,
          bottom: pair.bottom,
          topSource: pair.topEntry.sourceLeagueId,
          bottomSource: pair.bottomEntry.sourceLeagueId,
          oldTopSample: topTeams.slice(0, 4).map(t => t.name),
          promotedDirect: directPromoted.map(id => bottomTable.find(t => t.teamId === id)?.teamName || id),
          relegatedDirect: directRelegated.map(id => topTable.find(t => t.teamId === id)?.teamName || id),
          newTopSize: newTopIds.length,
          newBottomSize: newBottomIds.length,
        };
      });
    };

    const auditHalfSeason = (season, universe) => {
      const candidates = universe.entries.filter(e => !e.isGroup && (e.teams || []).length >= 16).slice(0, 3);
      assertBrowser(candidates.length >= 1, `No hay ligas válidas para media temporada en ${season}`);
      return candidates.map(entry => {
        const teams = entry.teams.slice(0, Math.min(20, entry.teams.length));
        const p1 = teams[0]?.id;
        const p2 = teams[1]?.id;
        const half = rankedMod.simulateHalfSeason(teams, p1, p2, { formation: '4-4-2', tactic: 'balanced' }, { formation: '4-3-3', tactic: 'attacking' }, entry.id);
        const played = half.fixtures.filter(f => f.played).length;
        const unplayed = half.fixtures.filter(f => !f.played).length;
        assertBrowser(half.table.length === teams.length, `Media temporada devuelve tabla incompleta en ${season}/${entry.id}`, { table: half.table.length, teams: teams.length });
        assertBrowser(played > 0 && unplayed > 0, `Media temporada no deja primera/segunda vuelta coherente en ${season}/${entry.id}`, { played, unplayed, midpoint: half.midpoint });
        assertBrowser(half.table.every(t => Number.isFinite(t.points) && Number.isFinite(t.played)), `Tabla con valores inválidos en media temporada ${season}/${entry.id}`);
        const full = rankedMod.simulateFullSeason(half, teams, p1, p2, { formation: '4-4-2', tactic: 'balanced' }, { formation: '4-3-3', tactic: 'attacking' });
        const fullPlayed = half.fixtures.filter(f => f.played).length;
        assertBrowser(fullPlayed === half.fixtures.length, `Temporada completa tras media no completa fixtures en ${season}/${entry.id}`, { fullPlayed, fixtures: half.fixtures.length });
        assertBrowser(full.table.length === teams.length, `Temporada completa tras media devuelve tabla incompleta en ${season}/${entry.id}`, { table: full.table.length, teams: teams.length });
        return { leagueId: entry.id, sourceLeagueId: entry.sourceLeagueId, teams: teams.length, midpoint: half.midpoint, playedAtHalf: played, totalFixtures: half.fixtures.length, champion: full.champion?.teamName || full.table?.[0]?.teamName };
      });
    };

    const results = [];
    for (const season of seasons) {
      if (season === 'current') localStorage.removeItem('pcgaffer_active_database_season');
      else localStorage.setItem('pcgaffer_active_database_season', season);
      const universe = await universeMod.loadActiveSeasonUniverse();
      const allTeams = universeMod.getAllTeamsFromUniverse(universe);
      const seasonReport = {
        requestedSeason: season,
        databaseSeasonId: universe.databaseSeasonId,
        historical: universe.historical,
        label: universe.label,
        entries: universe.entries.length,
        teams: allTeams.length,
        sampleEntries: universe.entries.slice(0, 8).map(e => ({ id: e.id, sourceLeagueId: e.sourceLeagueId, country: e.country, teams: e.teams.length, sample: sampleTeamNames(e) })),
      };
      seasonReport.modeSetup = auditModeSetup(season, universe, allTeams);
      seasonReport.transfers = auditTransfers(season, allTeams);
      seasonReport.promotions = auditPromotions(season, universe, allTeams);
      seasonReport.halfSeason = auditHalfSeason(season, universe);
      results.push(seasonReport);
    }

    return { ok: true, generatedAt: new Date().toISOString(), results };
  } finally {
    Math.random = originalRandom;
  }
}, { seasons });

const errors = consoleMessages.filter(m => ['error', 'pageerror'].includes(m.type) && !/favicon|manifest|Failed to load resource/i.test(m.text));
report.consoleErrors = errors;
await fs.writeFile(new URL('report.json', outDir), JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  ok: report.ok,
  out: outDir.pathname,
  seasons: report.results.map(r => ({
    season: r.databaseSeasonId,
    historical: r.historical,
    entries: r.entries,
    teams: r.teams,
    transfers: r.transfers.transfers,
    promotionPairs: r.promotions.map(p => `${p.top}/${p.bottom}`),
    halfSeasonLeagues: r.halfSeason.map(h => h.leagueId),
    glory: r.modeSetup.glory.leagueId,
  })),
  consoleErrors: errors.length,
}, null, 2));

assert.equal(errors.length, 0, `Errores JS en consola durante auditoría: ${errors.map(e => e.text).join('\n')}`);
await browser.close();
