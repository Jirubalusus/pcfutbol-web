// ============================================================
// QA · Contrarreloj · Pantalla de finanzas FC Messina Peloro 2005/06
// ------------------------------------------------------------
// Reproduce EXACTAMENTE las cifras de inicio de temporada que mostraría
// src/components/Finance/Finance.jsx para el caso reportado por Pablo
// (presupuesto, salarios anuales, mantenimiento, comercial y balance) y
// comprueba que el balance proyectado está dentro de ±€5M en vez de -€45M.
//
// El cálculo usa los módulos reales (contrarrelojEconomy.js + leagueTiers.js),
// así que no depende de Firebase ni de credenciales.
//
// Evidencia visual desktop+mobile OPCIONAL: si hay un dev server accesible en
// QA_URL (por defecto http://127.0.0.1:5175) usa los DEV hooks (window.__pcfGame
// / window.__pcfAuth, solo activos en DEV) para inyectar la partida y capturar
// la pantalla real de finanzas en 1600px y 390px. Si no hay server, el harness
// igualmente escribe el informe y termina OK (las capturas son un extra).
//
// Uso:
//   npm run qa:contrarreloj-messina-finance
//   QA_URL=http://127.0.0.1:5175 npm run qa:contrarreloj-messina-finance   (con capturas)
// ============================================================

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initializeLeague } from '../src/game/leagueEngine.js';
import { getLeagueTier, getBaseCommercialIncome } from '../src/game/leagueTiers.js';
import { getStadiumInfo, getStadiumLevel } from '../src/data/stadiumCapacities.js';
import { toGameLeagueId } from '../src/data/activeSeasonUniverse.js';
import { ensureHistoricalRosterCoverage } from '../src/data/historicalRosterRepair.js';
import {
  CONTRARRELOJ_BALANCE_CEIL,
  CONTRARRELOJ_BALANCE_FLOOR,
  CONTRARRELOJ_WEEKS_PER_YEAR,
  getSquadMarketValue,
  prepareContrarrelojTeam,
  projectContrarrelojStartingBalance
} from '../src/game/contrarrelojEconomy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const seasonsRoot = path.join(repoRoot, 'public', 'historical-db', 'seasons');
const artifactsRoot = path.join(repoRoot, 'artifacts');
fs.mkdirSync(artifactsRoot, { recursive: true });

const SEASON_ID = '2005-06';
const MESSINA_RE = /FC Messina Peloro/i;
const QA_URL = process.env.QA_URL || 'http://127.0.0.1:5175/';

const fmt = (n) => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}€${(abs / 1_000_000).toFixed(2)}M`;
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Carga de temporada equivalente a la del audit global y a ContrarrelojSetup.
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
      .map((team) => ({ ...team, leagueId, sourceLeagueId: league.id, historicalLeagueId: league.id }));
    return { id: leagueId, name: league.name || league.id, tier: league.tier || null, teams };
  }).filter((entry) => entry.teams.length > 0);
}

function findMessina(dataset) {
  for (const entry of buildLeagueEntries(dataset)) {
    const rawTeam = entry.teams.find((team) => MESSINA_RE.test(team.name || ''));
    if (rawTeam) return { entry, rawTeam };
  }
  return null;
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

// ------------------------------------------------------------
// 1) Construir el equipo igual que ContrarrelojSetup.handleStart
// ------------------------------------------------------------
const dataset = loadSeason(SEASON_ID);
const found = findMessina(dataset);
assert.ok(found, `No se encontró ${MESSINA_RE} en ${SEASON_ID}`);

const { entry, rawTeam } = found;
const leagueId = entry.id;
const candidateSeed = prepareContrarrelojTeam({ ...rawTeam }, leagueId);
const totalCalendarWeeks = getTotalCalendarWeeks(entry, rawTeam.id);
const stadiumInfo = getStadiumInfo(rawTeam.id, candidateSeed.reputation);
const stadiumLevel = getStadiumLevel(stadiumInfo.capacity);
const team = prepareContrarrelojTeam(candidateSeed, leagueId, { stadiumLevel, totalCalendarWeeks });

// ------------------------------------------------------------
// 2) Reproducir las cifras de inicio de temporada de Finance.jsx
//    En el arranque: abonos/acumulados/traspasos/premios = 0, por lo que
//    balance = comercial anual - salarios anuales - mantenimiento, que es
//    exactamente projectContrarrelojStartingBalance (mismo WEEKS_PER_YEAR=52).
// ------------------------------------------------------------
const projection = projectContrarrelojStartingBalance({ team, leagueId, stadiumLevel, totalCalendarWeeks });
const budget = Number(team.budget) || 0; // state.money en NEW_GAME = team.budget

const finance = {
  seasonId: SEASON_ID,
  leagueId,
  teamId: rawTeam.id,
  teamName: rawTeam.name,
  reputation: team.reputation,
  squadCount: team.players.length,
  squadValue: getSquadMarketValue(team),
  budget,
  weeklySalaries: projection.weeklySalaries,
  annualSalaries: projection.annualSalaries,
  maintenanceCost: projection.maintenanceCost,
  sponsorWeekly: projection.sponsorWeekly,
  sponsorAnnualIncome: projection.sponsorAnnualIncome,
  totalCalendarWeeks: projection.totalCalendarWeeks,
  startingBalance: projection.balance,
  baseCommercial: getBaseCommercialIncome(leagueId),
  weeksPerYear: CONTRARRELOJ_WEEKS_PER_YEAR
};

// ------------------------------------------------------------
// 3) Aserciones: el balance de arranque debe ser sano (±€5M), no -€45M
// ------------------------------------------------------------
assert.ok(budget > 0, `Presupuesto inicial inválido: ${fmt(budget)}`);
assert.ok(
  finance.startingBalance >= CONTRARRELOJ_BALANCE_FLOOR && finance.startingBalance <= CONTRARRELOJ_BALANCE_CEIL,
  `Balance de arranque fuera de [${fmt(CONTRARRELOJ_BALANCE_FLOOR)}, ${fmt(CONTRARRELOJ_BALANCE_CEIL)}]: ${fmt(finance.startingBalance)}`
);
assert.ok(
  finance.annualSalaries < 12_000_000,
  `Salarios anuales fuera de escala (regresión al bug de -€45M): ${fmt(finance.annualSalaries)}`
);
// Regresión específica del bug reportado: nunca volver a ~-€45M
assert.ok(finance.startingBalance > -10_000_000, `Balance catastrófico (bug -€45M): ${fmt(finance.startingBalance)}`);

console.log('✅ QA Messina 2005/06 · finanzas de arranque OK');
console.log(`   Equipo: ${finance.teamName} (${leagueId}, rep ${finance.reputation}, plantilla ${finance.squadCount})`);
console.log(`   Presupuesto: ${fmt(finance.budget)} · valor plantilla ${fmt(finance.squadValue)}`);
console.log(`   Salarios anuales: ${fmt(finance.annualSalaries)} (semanal ${fmt(finance.weeklySalaries)} × ${finance.weeksPerYear})`);
console.log(`   Mantenimiento: ${fmt(finance.maintenanceCost)} · Comercial anual: ${fmt(finance.sponsorAnnualIncome)} (${fmt(finance.sponsorWeekly)}/sem × ${finance.totalCalendarWeeks})`);
console.log(`   Balance de arranque: ${fmt(finance.startingBalance)}  (objetivo ±€5M, antes ~-€45,67M)`);

// ------------------------------------------------------------
// 4) Evidencia visual OPCIONAL (desktop + mobile) sobre la app real
// ------------------------------------------------------------
const report = {
  ok: true,
  generatedFor: 'FC Messina Peloro 2005/06 · Contrarreloj',
  reportedBug: { budget: 24_635_000, annualSalaries: 43_155_262, maintenance: 3_200_000, commercial: 686_000, startingBalance: -45_669_262 },
  finance,
  bounds: { floor: CONTRARRELOJ_BALANCE_FLOOR, ceil: CONTRARRELOJ_BALANCE_CEIL },
  screenshots: { desktop: null, mobile: null, skipped: null }
};

async function serverReachable(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function captureRealApp() {
  const reachable = await serverReachable(QA_URL);
  if (!reachable) {
    report.screenshots.skipped = `Dev server no accesible en ${QA_URL}. Lanza "npm run dev" y reejecuta con QA_URL para generar capturas.`;
    console.log(`   ℹ️  ${report.screenshots.skipped}`);
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    report.screenshots.skipped = 'Playwright no disponible; se omiten las capturas.';
    console.log(`   ℹ️  ${report.screenshots.skipped}`);
    return;
  }

  // Payload de NEW_GAME equivalente al que emite ContrarrelojSetup.handleStart,
  // pero con preseasonPhase=false para aterrizar directamente en la oficina.
  const newGamePayload = {
    teamId: team.id,
    team: { ...team },
    leagueId,
    group: null,
    stadiumInfo,
    stadiumLevel,
    totalCalendarWeeks,
    preseasonMatches: [],
    preseasonPhase: false,
    gameMode: 'contrarreloj',
    databaseSeasonId: SEASON_ID,
    careerStartSeason: 2005,
    historicalDatabase: true,
    historicalDatabaseLabel: 'Temporada 2005/06'
  };

  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  try {
    const shoot = async (label, viewport) => {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      page.on('pageerror', (err) => consoleErrors.push(`[${label}] ${err.message}`));
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(`[${label}] ${msg.text()}`); });
      await page.goto(QA_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForFunction(() => !!window.__pcfGame?.dispatch && !!window.__pcfAuth?.loginAsGuest, { timeout: 45000 });
      await page.evaluate(() => window.__pcfAuth.loginAsGuest());
      await page.waitForFunction(() => window.__pcfAuth?.isAuthenticated === true, { timeout: 45000 });
      await page.evaluate((payload) => {
        window.__pcfGame.dispatch({ type: 'NEW_GAME', payload });
        window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: 'office' });
        window.__pcfGame.dispatch({ type: 'NAVIGATE_TAB', payload: 'finance' });
      }, newGamePayload);
      await page.waitForSelector('.finance', { timeout: 45000 });
      await page.waitForTimeout(1200);
      const pageText = await page.evaluate(() => document.body.innerText || '');
      const heroText = await page.evaluate(() => document.querySelector('.finance__hero-amount')?.textContent?.trim() || '');
      assert.match(pageText, /€42K\/sem\s*×\s*52/i, `[${label}] la UI no muestra salarios normalizados de ~€42K/sem`);
      assert.match(pageText, /Season balance\s*[-−]€2\.1M/i, `[${label}] la UI no muestra balance normalizado ~-€2.1M`);
      assert.doesNotMatch(pageText, /€897K\/sem|[-−]€46\.6M|[-−]€47\.1M/i, `[${label}] la UI volvió a mostrar el bug de salarios/balance catastrófico`);
      const out = path.join(artifactsRoot, `qa-contrarreloj-messina-finance-${label}.png`);
      await page.screenshot({ path: out, fullPage: true });
      await page.close();
      return { screenshot: out, heroText };
    };

    report.screenshots.desktop = await shoot('desktop', { width: 1600, height: 1000 });
    report.screenshots.mobile = await shoot('mobile', { width: 390, height: 844 });
    report.consoleErrors = consoleErrors;
    if (consoleErrors.length) {
      report.ok = false;
      console.log(`   ⚠️  Errores de consola durante la captura: ${consoleErrors.length}`);
    } else {
      console.log(`   📸 Capturas: ${report.screenshots.desktop.screenshot} · ${report.screenshots.mobile.screenshot}`);
    }
  } finally {
    await browser.close();
  }
}

await captureRealApp();

fs.writeFileSync(
  path.join(artifactsRoot, 'qa-contrarreloj-messina-finance-report.json'),
  JSON.stringify(report, null, 2)
);

if (!report.ok) process.exit(1);
