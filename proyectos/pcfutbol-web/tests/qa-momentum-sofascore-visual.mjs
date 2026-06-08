// QA probe for the SofaScore-style LIVE momentum / pressure chart.
//
// Drives a friendly match into the live (in-progress) MatchDay screen and
// asserts the new chart shape: dense thin buckets (>=40), two team crests
// stacked at the left, the chart exists, and nothing overflows horizontally.
// Modeled on tests/qa-matchday-result-visual.mjs but it STOPS on the live
// screen instead of skipping to the result.
import { chromium, devices } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 5199);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=momentum-sofascore-${Date.now()}`;
const OUT_DIR = path.join(ROOT, 'artifacts/qa-momentum-sofascore');

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

function makePlayers(prefix, baseOverall = 78) {
  const positions = ['GK','RB','CB','CB','LB','CM','CM','CAM','RW','LW','ST','GK','CB','LB','CM','CAM','RW','ST'];
  return positions.map((position, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `Jugador ${index + 1} ${prefix}`,
    number: index + 1,
    age: 22 + (index % 12),
    position,
    role: index < 11 ? 'starter' : 'rotation',
    overall: Math.min(92, baseOverall + ((index * 3) % 8) - 2),
    pace: 66 + (index % 18),
    shooting: position === 'ST' || position === 'RW' || position === 'LW' || position === 'CAM' ? 83 : 63,
    passing: position === 'CM' || position === 'CAM' ? 84 : 65,
    defense: position === 'CB' || position === 'LB' || position === 'RB' ? 82 : 58,
    physical: 70 + (index % 14),
    stamina: 88,
    salary: 10000,
    contractYears: 3,
  }));
}

const homeTeam = {
  id: 'qa-vit', teamId: 'qa-vit', name: 'Vitória Setúbal FC', shortName: 'VIT',
  budget: 5000000, reputation: 82, players: makePlayers('VIT', 82),
};
const awayTeam = {
  id: 'qa-elc', teamId: 'qa-elc', name: 'Elche CF', shortName: 'ELC',
  budget: 5000000, reputation: 80, players: makePlayers('ELC', 80),
};

const lineupSlots = ['GK', 'RB', 'CB1', 'CB2', 'LB', 'CM1', 'CDM', 'CM2', 'RW', 'ST', 'LW'];
const lineup = Object.fromEntries(lineupSlots.map((slot, index) => [slot, homeTeam.players[index].name]));
const convocados = homeTeam.players.slice(11).map(p => p.name);

const baseSave = {
  loaded: true, gameStarted: true, currentScreen: 'office', gameMode: 'career',
  teamId: homeTeam.id, team: homeTeam, leagueId: 'segunda', playerLeagueId: 'segunda',
  leagueTier: 2, currentSeason: 2025, careerStartSeason: 2025, databaseSeasonId: 'current',
  currentWeek: 1, money: homeTeam.budget, formation: '4-3-3', tactic: 'attacking',
  lineup, convocados,
  playerForm: Object.fromEntries(homeTeam.players.map(p => [p.name, 'excellent'])),
  fixtures: [], preseasonPhase: true, preseasonWeek: 1,
  preseasonMatches: [{ id: 'qa-friendly-match', week: 1, homeTeam: homeTeam.id, awayTeam: awayTeam.id, opponent: awayTeam, isHome: true }],
  leagueTeams: [homeTeam, awayTeam],
  leagueTable: [
    { teamId: homeTeam.id, teamName: homeTeam.name, shortName: homeTeam.shortName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], homeForm: [], awayForm: [], morale: 92, reputation: homeTeam.reputation, streak: 2 },
    { teamId: awayTeam.id, teamName: awayTeam.name, shortName: awayTeam.shortName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], homeForm: [], awayForm: [], morale: 86, reputation: awayTeam.reputation, streak: 1 },
  ],
  stadium: { level: 1, name: 'Arena Nuevo Estrella', realCapacity: 18000, seasonTickets: 6200, seasonTicketsFinal: 6200, ticketPrice: 24, grassCondition: 100, services: {} },
  facilities: { stadium: 1, training: 1, youth: 0, medical: 0, scouting: 0, sponsorship: 0 },
  facilitySpecs: { youth: null, medical: null, training: null },
  settings: { cityMode3D: false, autoSave: false, soundEnabled: false, musicVolume: 0, sfxVolume: 0, showTutorials: false, matchSpeed: 'normal' },
  _cityBypass: true, messages: [], results: [], playerSeasonStats: {},
};

async function injectMatchSave(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => !!window.__pcfGame && !!window.__pcfAuth, null, { timeout: 15000 });
  await page.evaluate(() => window.__pcfAuth.loginAsGuest());
  await page.waitForFunction(() => !!window.__pcfAuth?.isAuthenticated, null, { timeout: 8000 });
  await page.evaluate(async (save) => {
    window.__pcfGame.dispatch({ type: 'LOAD_SAVE', payload: save });
    await new Promise(resolve => setTimeout(resolve, 500));
  }, baseSave);
  await page.waitForFunction(() => window.__pcfGame?.state?.teamId === 'qa-vit' && !!window.__pcfGame?.state?.preseasonPhase && (window.__pcfGame?.state?.preseasonMatches?.length || 0) > 0, null, { timeout: 10000 });
  await page.waitForSelector('.office, .office__advance-btn', { timeout: 15000 });
}

async function measureMomentum(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.live-momentum-card');
    const chart = document.querySelector('.live-momentum-chart');
    const crests = card ? card.querySelectorAll('.momentum-crests .momentum-crest') : [];
    const crestGraphics = card ? card.querySelectorAll('.momentum-crests svg, .momentum-crests img') : [];
    const doc = document.documentElement;
    const chartOverflow = chart ? (chart.scrollWidth > chart.clientWidth + 2) : false;
    return {
      chartExists: !!chart,
      bucketCount: document.querySelectorAll('.live-momentum-chart .mom-bucket').length,
      dataBucketCount: card ? Number(card.getAttribute('data-bucket-count')) : null,
      crestCount: crests.length,
      crestGraphics: crestGraphics.length,
      zones: document.querySelectorAll('.live-momentum-chart .mom-zone').length,
      halftime: document.querySelectorAll('.live-momentum-chart .mom-halftime').length,
      docOverflow: doc.scrollWidth > doc.clientWidth + 2,
      chartOverflow,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
    };
  });
}

async function runViewport(browser, label, contextOptions) {
  const context = await browser.newContext({ ...contextOptions, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await context.newPage();
  await injectMatchSave(page);
  await page.locator('.office__advance-btn').evaluate(button => button.click(), { timeout: 10000 });
  await page.waitForSelector('.match-day__play-btn--primary', { timeout: 15000 });
  await page.locator('.match-day__play-btn--primary').click({ timeout: 10000 });
  // Live screen — DO NOT skip. Wait for the momentum chart, let a few minutes tick.
  await page.waitForSelector('.live-momentum-chart', { timeout: 15000 });
  await page.waitForTimeout(700);

  const m = await measureMomentum(page);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, `${label}.png`), fullPage: false });

  assert(m.chartExists, `${label}: .live-momentum-chart missing`, m);
  assert(m.bucketCount >= 40, `${label}: expected >=40 mom-bucket, got ${m.bucketCount}`, m);
  assert(m.dataBucketCount === 46, `${label}: expected data-bucket-count=46, got ${m.dataBucketCount}`, m);
  assert(m.crestCount === 2, `${label}: expected 2 crests in momentum card, got ${m.crestCount}`, m);
  assert(m.crestGraphics >= 2, `${label}: expected >=2 crest graphics, got ${m.crestGraphics}`, m);
  assert(m.zones === 2, `${label}: expected 2 team zones, got ${m.zones}`, m);
  assert(m.halftime === 1, `${label}: expected 1 halftime divider, got ${m.halftime}`, m);
  assert(!m.docOverflow, `${label}: document horizontal overflow (${m.docScrollWidth} > ${m.docClientWidth})`, m);
  assert(!m.chartOverflow, `${label}: chart horizontal overflow`, m);

  await context.close();
  return { label, ...m };
}

const server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await runViewport(browser, 'desktop-1280x800', { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } });
  const mobile = await runViewport(browser, 'mobile-390x844', { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const summary = { ok: true, desktop, mobile };
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('MOMENTUM_QA_OK ' + JSON.stringify(summary));
} catch (err) {
  console.error('MOMENTUM_QA_FAIL', err.message, JSON.stringify(err.details || {}, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
