import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeDatabase } from '../src/components/WorldCupDraft/worldCupDraftShape.js';
import { bandSlice, ROUND_DIFFICULTY_BANDS } from '../src/components/WorldCupDraft/campaignDifficulty.js';

// Focused QA for the progressive, match-by-match Mundial Draft tournament viewer.
// Verifies that hitting "Disputar Mundial" no longer dumps every result at once:
// only the first match is in focus, future matches stay locked, each user action
// reveals exactly one more match, and the final summary is reachable.
const baseUrl = process.env.QA_URL || 'http://127.0.0.1:4202/?qa=worldcup-draft-progressive';
const outDir = path.resolve(process.env.QA_OUT_DIR || 'tmp/qa-worldcup-draft-progressive');
fs.mkdirSync(outDir, { recursive: true });

{
  const dbPath = path.resolve('public/data/world-cup-draft-database.json');
  const { teams } = normalizeDatabase(JSON.parse(fs.readFileSync(dbPath, 'utf8')));
  const sortedTeams = [...teams].sort((a, b) => a.rating - b.rating);
  const ratingsOf = (round) => bandSlice(sortedTeams, round).map((team) => team.rating);
  const first = ratingsOf(0);
  const last = ratingsOf(ROUND_DIFFICULTY_BANDS.length - 1);
  const median = sortedTeams[Math.floor(sortedTeams.length / 2)].rating;
  const avgs = ROUND_DIFFICULTY_BANDS.map((_, index) => {
    const ratings = ratingsOf(index);
    return ratings.reduce((sum, value) => sum + value, 0) / Math.max(1, ratings.length);
  });
  const errors = [];
  if (!first.length || !last.length) errors.push('las bandas de dificultad quedaron vacías');
  if (first.length >= sortedTeams.length) errors.push('el primer partido usa todo el pool, no una banda baja');
  const firstMax = first.length ? Math.max(...first) : Infinity;
  const lastMin = last.length ? Math.min(...last) : -Infinity;
  if (firstMax > median) errors.push(`el primer partido no arranca en una banda baja (max ${firstMax} > mediana ${median})`);
  if (lastMin <= firstMax) errors.push(`la final no es más dura que el primer partido (finalMin ${lastMin} <= primerMax ${firstMax})`);
  for (let index = 1; index < avgs.length; index += 1) {
    if (avgs[index] < avgs[index - 1] - 0.5) {
      errors.push(`la dificultad media baja en la ronda ${index} (${avgs[index].toFixed(1)} < ${avgs[index - 1].toFixed(1)})`);
    }
  }
  if (errors.length) {
    console.error(JSON.stringify({ progressiveDifficulty: 'FAIL', errors, firstMax, lastMin, median, avgs }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ progressiveDifficulty: 'OK', poolSize: sortedTeams.length, firstBandSize: first.length, firstMax, lastMin, median }, null, 2));
}

async function gotoDraftBoard(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    localStorage.setItem('language', 'es');
  }).catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=MUNDIAL DRAFT', { timeout: 25000 });
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const activeWorldCup = () => [...document.querySelectorAll('button')]
      .find((button) => /MUNDIAL DRAFT/i.test(button.innerText || '') && /active/.test(String(button.className || '')));
    const next = [...document.querySelectorAll('button')]
      .find((button) => /^Siguiente$/i.test((button.innerText || '').trim()));
    for (let i = 0; i < 6 && !activeWorldCup(); i += 1) {
      next?.click();
      await wait(220);
    }
    (activeWorldCup() || [...document.querySelectorAll('button')].find((b) => /MUNDIAL DRAFT/i.test(b.innerText || '')))?.click();
  });
  await page.waitForSelector('text=EMPEZAR DRAFT', { timeout: 25000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((b) => /EMPEZAR DRAFT/i.test(b.innerText || ''));
    return button && !button.disabled;
  }, null, { timeout: 60000 });
  await page.getByRole('button', { name: /EMPEZAR DRAFT/i }).click();
  await page.waitForSelector('[data-draft-slot]', { timeout: 25000 });
}

async function fillEleven(page) {
  for (let guard = 0; guard < 25; guard += 1) {
    const empties = await page.$$('[data-draft-slot][data-slot-filled="false"]');
    if (!empties.length) break;
    await empties[0].evaluate((element) => element.click());
    await page.waitForSelector('[data-draft-card-picker][data-replacement-mode="false"]', { timeout: 10000 });
    await page.click('[data-draft-select-active]');
    await page.waitForSelector('[data-draft-card-picker]', { state: 'detached', timeout: 10000 });
  }
}

const revealedCount = (page) => page.evaluate(() => Number(
  document.querySelector('[data-worldcup-progressive]')?.getAttribute('data-revealed-count') || '0'
));
const countRows = (page, sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);

async function playLiveMatch(page, failed, screenshotPath = null) {
  const before = await revealedCount(page);
  await page.click('[data-worldcup-simulate-match]');
  await page.waitForSelector('[data-worldcup-live-match]', { timeout: 8000 });
  await page.waitForSelector('[data-worldcup-match-timeline]', { timeout: 8000 });
  const early = await page.evaluate(() => {
    const live = document.querySelector('[data-worldcup-live-match]');
    return {
      finished: live?.getAttribute('data-worldcup-live-finished'),
      minute: Number(live?.getAttribute('data-live-minute') || '0'),
      nextVisible: Boolean(document.querySelector('[data-worldcup-live-next]')),
      score: document.querySelector('[data-worldcup-live-score]')?.getAttribute('data-worldcup-live-score') || '',
      events: document.querySelectorAll('[data-worldcup-event]').length,
    };
  });
  if (early.finished !== 'false') failed.push(`el live debe empezar en progreso, finished=${early.finished}`);
  if (early.minute >= 90) failed.push(`el live arrancó ya al final (${early.minute}')`);
  if (early.nextVisible) failed.push('Siguiente aparece antes de que termine la simulación en vivo');
  // The tournament reveal counter is not rendered inside the separate live tab;
  // it is asserted after returning via [data-worldcup-live-next].
  await page.waitForTimeout(180);
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: false });

  await page.click('[data-worldcup-live-finish]');
  await page.waitForFunction(() => document.querySelector('[data-worldcup-live-match]')?.getAttribute('data-worldcup-live-finished') === 'true', null, { timeout: 8000 });
  await page.waitForSelector('[data-worldcup-live-next]', { timeout: 8000 });
  const detail = {
    live: await countRows(page, '[data-worldcup-live-match]'),
    timeline: await countRows(page, '[data-worldcup-match-timeline]'),
    influence: await countRows(page, '[data-worldcup-influence]'),
    momentum: await countRows(page, '[data-worldcup-momentum]'),
    buckets: await countRows(page, '[data-worldcup-mom-bucket]'),
    events: await countRows(page, '[data-worldcup-event]'),
    early,
  };
  if (detail.live !== 1) failed.push(`debe haber 1 pestaña live, hay ${detail.live}`);
  if (detail.timeline !== 1) failed.push(`debe haber 1 timeline live, hay ${detail.timeline}`);
  if (detail.influence !== 1) failed.push('falta el bloque de influencia en vivo');
  if (detail.momentum !== 1) failed.push('falta la franja de momentum en vivo');
  if (detail.buckets < 10) failed.push(`la franja de momentum no tiene suficientes barras (${detail.buckets})`);
  if (detail.events < 1) failed.push('la lista de eventos minuto a minuto está vacía tras saltar al final');
  await page.click('[data-worldcup-live-next]');
  await page.waitForSelector('[data-worldcup-progressive]', { timeout: 8000 });
  await page.waitForFunction((b) => Number(document.querySelector('[data-worldcup-progressive]')?.getAttribute('data-revealed-count') || '0') === b + 1, before, { timeout: 8000 });
  const after = await revealedCount(page);
  if (after !== before + 1) failed.push(`el live no incrementó exactamente 1 resultado (${before} -> ${after})`);
  return detail;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const pageErrors = [];
const consoleMessages = [];
page.on('pageerror', (err) => pageErrors.push(err.message));
page.on('console', (msg) => { if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`); });

const failed = [];

await gotoDraftBoard(page);
await fillEleven(page);

// The simulate CTA must be enabled with a complete XI.
await page.waitForSelector('[data-draft-simulate]:not([disabled])', { timeout: 15000 });
await page.click('[data-draft-simulate]');
await page.waitForSelector('[data-worldcup-progressive]', { timeout: 15000 });

// 1) Initial reveal: exactly one current match, nothing revealed yet, future
//    matches locked, and a "Simular partido" CTA visible. NOT a full dump.
const initial = {
  progressive: await countRows(page, '[data-worldcup-progressive]'),
  current: await countRows(page, '[data-worldcup-current-match]'),
  revealed: await countRows(page, '[data-worldcup-revealed]'),
  revealedCount: await revealedCount(page),
  locked: await countRows(page, '.worldcup-draft__steps [data-step-state="locked"]'),
  simulateBtn: await countRows(page, '[data-worldcup-simulate-match]'),
  lowerTimeline: await countRows(page, '[data-worldcup-timeline]'),
  newDraftButtons: await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((button) => /Nuevo draft/i.test(button.textContent || '')).length),
};
if (initial.progressive !== 1) failed.push('falta la sección progresiva');
if (initial.current !== 1) failed.push(`debe haber 1 partido en foco, hay ${initial.current}`);
if (initial.revealed !== 0 || initial.revealedCount !== 0) failed.push(`no debe haber resultados revelados al inicio (${initial.revealed}/${initial.revealedCount})`);
if (initial.locked < 1) failed.push('los partidos futuros deben aparecer bloqueados');
if (initial.simulateBtn !== 1) failed.push('falta el CTA "Simular partido"');
if (initial.lowerTimeline !== 0) failed.push('la lista inferior duplicada de fases sigue visible');
if (initial.newDraftButtons !== 0) failed.push('el botón "Nuevo draft" sigue visible en la pantalla de partido');
// The match-detail timeline must NOT exist before simulating (staged reveal).
if (await countRows(page, '[data-worldcup-match-timeline]') !== 0) failed.push('la timeline del partido aparece antes de simular');
await page.screenshot({ path: path.join(outDir, '01-initial.png'), fullPage: false });

// 2) Simulate the first match -> it opens a separate live tab, then returning
// reveals exactly one result and leaves the next fixture ready.
const detail = await playLiveMatch(page, failed, path.join(outDir, '02-live-match.png'));
if (await revealedCount(page) !== 1) failed.push('volver desde el live del primer partido no reveló exactamente 1 resultado');
await page.screenshot({ path: path.join(outDir, '02-first-revealed.png'), fullPage: false });

// 3) Advance at least twice; each live tab completion reveals exactly one more.
let advances = 0;
for (let guard = 0; guard < 8 && advances < 2; guard += 1) {
  if (!(await page.$('[data-worldcup-simulate-match]'))) break;
  await playLiveMatch(page, failed);
  advances += 1;
}
if (advances < 2) failed.push(`no se pudo avanzar al menos 2 partidos (avances=${advances})`);

// While the tournament is mid-way, future matches must still be locked in the top stepper.
if (await countRows(page, '.worldcup-draft__steps [data-step-state="locked"]') < 1) failed.push('los partidos futuros dejaron de estar bloqueados a mitad del torneo');
if (await countRows(page, '[data-worldcup-timeline]') !== 0) failed.push('la lista inferior duplicada reapareció a mitad del torneo');
await page.screenshot({ path: path.join(outDir, '03-mid-progress.png'), fullPage: false });

// 4) Drive to the end and reach the final summary (which may show everything).
for (let guard = 0; guard < 12; guard += 1) {
  if (await page.$('[data-worldcup-finish]')) break;
  const sim = await page.$('[data-worldcup-simulate-match]');
  if (sim) { await playLiveMatch(page, failed); await page.waitForTimeout(60); continue; }
  break;
}
const finishBtn = await page.$('[data-worldcup-finish]');
if (!finishBtn) {
  failed.push('nunca apareció el CTA "Ver resumen final"');
} else {
  await finishBtn.click();
  await page.waitForSelector('[data-worldcup-final-summary]', { timeout: 8000 });
}
await page.screenshot({ path: path.join(outDir, '04-final-summary.png'), fullPage: false });

const layout = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  hasFinalSummary: Boolean(document.querySelector('[data-worldcup-final-summary]')),
}));
if (!layout.hasFinalSummary) failed.push('no se alcanzó el resumen final');
if (layout.scrollWidth > layout.clientWidth + 2) failed.push(`overflow horizontal ${layout.scrollWidth}/${layout.clientWidth}`);
if (pageErrors.length) failed.push(`page errors: ${pageErrors.join(' | ')}`);
const severeConsole = consoleMessages.filter((msg) => !msg.includes('React DevTools')
  && !msg.includes('authorized')
  && !msg.includes('Installations: Create Installation request failed')
  && !msg.includes('Requests from referer http://127.0.0.1')
  && !msg.includes('Failed to load resource: the server responded with a status of 403'));
if (severeConsole.length) failed.push(`console: ${severeConsole.join(' | ')}`);

await browser.close();

console.log(JSON.stringify({ outDir, initial, detail, advances, layout, failed }, null, 2));
if (failed.length) process.exit(1);
