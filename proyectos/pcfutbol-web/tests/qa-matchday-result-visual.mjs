import { chromium, devices } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 5198);
const configuredBaseUrl = process.env.PCG_QA_BASE_URL;
const BASE_URL = (() => {
  if (configuredBaseUrl) {
    const url = new URL(configuredBaseUrl);
    url.searchParams.set('qa', `matchday-result-visual-${Date.now()}`);
    return url.href;
  }
  return `http://127.0.0.1:${PORT}/?qa=matchday-result-visual-${Date.now()}`;
})();
const SHOULD_START_SERVER = !configuredBaseUrl;
const OUT_DIR = path.join(ROOT, 'artifacts/qa-matchday-result-chronology-20260603');

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

function makePlayers(prefix, baseOverall = 78) {
  const positions = ['GK','RB','CB','CB','LB','CM','CM','CAM','RW','LW','ST','GK','CB','LB','CM','CAM','RW','ST'];
  const names = [
    'Portero', 'Lateral Derecho', 'Central Uno', 'Central Dos', 'Lateral Izquierdo',
    'Bruno Gallo', 'Jorge Luiz', 'Amoreirinha', 'Pedro Santos', 'Igor Rocha', 'Albert Meyong',
    'Kiko', 'Danilo', 'Nelson Pedroso', 'Peter Suswam', 'Aarón Ñíguez', 'Javi Flores', 'Ferran Corominas'
  ];
  return positions.map((position, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `${names[index] || `Jugador ${index + 1}`} ${prefix}`,
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
  id: 'qa-vit',
  teamId: 'qa-vit',
  name: 'Vitória Setúbal FC',
  shortName: 'VIT',
  budget: 5000000,
  reputation: 82,
  players: makePlayers('VIT', 82),
};

const awayTeam = {
  id: 'qa-elc',
  teamId: 'qa-elc',
  name: 'Elche CF',
  shortName: 'ELC',
  budget: 5000000,
  reputation: 80,
  players: makePlayers('ELC', 80),
};

const lineupSlots = ['GK', 'RB', 'CB1', 'CB2', 'LB', 'CM1', 'CDM', 'CM2', 'RW', 'ST', 'LW'];
const lineup = Object.fromEntries(lineupSlots.map((slot, index) => [slot, homeTeam.players[index].name]));
const convocados = homeTeam.players.slice(11).map(p => p.name);

const baseSave = {
  loaded: true,
  gameStarted: true,
  currentScreen: 'office',
  gameMode: 'career',
  teamId: homeTeam.id,
  team: homeTeam,
  leagueId: 'segunda',
  playerLeagueId: 'segunda',
  leagueTier: 2,
  currentSeason: 2025,
  careerStartSeason: 2025,
  databaseSeasonId: 'current',
  currentWeek: 1,
  money: homeTeam.budget,
  formation: '4-3-3',
  tactic: 'attacking',
  lineup,
  convocados,
  playerForm: Object.fromEntries(homeTeam.players.map(p => [p.name, 'excellent'])),
  fixtures: [],
  preseasonPhase: true,
  preseasonWeek: 1,
  preseasonMatches: [
    {
      id: 'qa-friendly-match',
      week: 1,
      homeTeam: homeTeam.id,
      awayTeam: awayTeam.id,
      opponent: awayTeam,
      isHome: true,
    }
  ],
  leagueTeams: [homeTeam, awayTeam],
  leagueTable: [
    { teamId: homeTeam.id, teamName: homeTeam.name, shortName: homeTeam.shortName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], homeForm: [], awayForm: [], morale: 92, reputation: homeTeam.reputation, streak: 2 },
    { teamId: awayTeam.id, teamName: awayTeam.name, shortName: awayTeam.shortName, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [], homeForm: [], awayForm: [], morale: 86, reputation: awayTeam.reputation, streak: 1 },
  ],
  stadium: {
    level: 1,
    name: 'Arena Nuevo Estrella',
    realCapacity: 18000,
    seasonTickets: 6200,
    seasonTicketsFinal: 6200,
    ticketPrice: 24,
    grassCondition: 100,
    services: {},
  },
  facilities: { stadium: 1, training: 1, youth: 0, medical: 0, scouting: 0, sponsorship: 0 },
  facilitySpecs: { youth: null, medical: null, training: null },
  settings: { cityMode3D: false, autoSave: false, soundEnabled: false, musicVolume: 0, sfxVolume: 0, showTutorials: false, matchSpeed: 'fast' },
  _cityBypass: true,
  messages: [],
  results: [],
  playerSeasonStats: {},
};

async function injectMatchSave(page) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForFunction(() => !!window.__pcfGame && !!window.__pcfAuth, null, { timeout: 15000 });
  await page.evaluate(() => window.__pcfAuth.loginAsGuest());
  await page.waitForFunction(() => !!window.__pcfAuth?.isAuthenticated, null, { timeout: 8000 });
  const dispatchDebug = await page.evaluate(async (save) => {
    const before = { saveHasPending: !!save.pendingCupMatch, saveKeys: Object.keys(save).filter(k => k.toLowerCase().includes('cup') || k.toLowerCase().includes('pending')) };
    window.__pcfGame.dispatch({ type: 'LOAD_SAVE', payload: save });
    await new Promise(resolve => setTimeout(resolve, 500));
    return before;
  }, baseSave);
  const loadedDebug = await page.evaluate((dispatchDebug) => ({
    dispatchDebug,
    teamId: window.__pcfGame?.state?.teamId,
    currentWeek: window.__pcfGame?.state?.currentWeek,
    preseasonPhase: window.__pcfGame?.state?.preseasonPhase,
    preseasonMatchesCount: window.__pcfGame?.state?.preseasonMatches?.length || 0,
    currentScreen: window.__pcfGame?.state?.currentScreen,
    text: document.body.innerText.slice(0, 500),
  }), dispatchDebug);
  if (loadedDebug.teamId !== 'qa-vit' || !loadedDebug.preseasonPhase || loadedDebug.preseasonMatchesCount < 1) {
    console.error('injectMatchSave state did not keep preseason QA match', JSON.stringify(loadedDebug, null, 2));
  }
  await page.waitForFunction(() => window.__pcfGame?.state?.teamId === 'qa-vit' && !!window.__pcfGame?.state?.preseasonPhase && (window.__pcfGame?.state?.preseasonMatches?.length || 0) > 0, null, { timeout: 10000 });
  await page.waitForSelector('.office, .office__advance-btn', { timeout: 15000 });
}

async function runViewport(browser, label, contextOptions) {
  const context = await browser.newContext({ ...contextOptions, locale: 'es-ES', timezoneId: 'Europe/Madrid' });
  const page = await context.newPage();
  const consoleIssues = [];
  page.on('console', msg => {
    const text = msg.text();
    if (['error', 'warning'].includes(msg.type()) && !text.includes('Download the React DevTools')) {
      consoleIssues.push({ type: msg.type(), text: text.slice(0, 300) });
    }
  });
  page.on('pageerror', err => consoleIssues.push({ type: 'pageerror', text: String(err?.message || err).slice(0, 300) }));

  let resultSummary = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    await injectMatchSave(page);
    await page.locator('.office__advance-btn').evaluate(button => button.click(), { timeout: 10000 });
    try {
      await page.waitForSelector('.match-day__play-btn--primary', { timeout: 12000 });
    } catch (error) {
      const debug = await page.evaluate(() => ({
        text: document.body.innerText.slice(0, 2500),
        htmlClass: document.documentElement.className,
        selectors: {
          office: !!document.querySelector('.office'),
          matchDay: !!document.querySelector('.match-day'),
          noMatch: !!document.querySelector('.match-day__no-match'),
          advance: !!document.querySelector('.office__advance-btn'),
          injuredWarning: !!document.querySelector('.injured-warning-modal'),
          seasonEnd: !!document.querySelector('.season-end'),
        },
        state: window.__pcfGame?.state ? {
          currentScreen: window.__pcfGame.state.currentScreen,
          currentWeek: window.__pcfGame.state.currentWeek,
          teamId: window.__pcfGame.state.teamId,
          fixtures: window.__pcfGame.state.fixtures,
          leagueTeams: window.__pcfGame.state.leagueTeams,
          pendingMatch: window.__pcfGame.state.pendingMatch,
          loaded: window.__pcfGame.state.loaded,
          gameStarted: window.__pcfGame.state.gameStarted,
        } : null,
      }));
      console.error(`${label}: did not reach MatchDay preview`, JSON.stringify(debug, null, 2));
      throw error;
    }
    await page.locator('.match-day__play-btn--primary').click({ timeout: 10000 });
    await page.waitForSelector('.match-day__skip-btn', { timeout: 12000 });
    await page.locator('.match-day__skip-btn').click({ timeout: 10000 });
    await page.waitForSelector('.match-day__result .result-momentum-card', { timeout: 15000 });
    await page.waitForTimeout(350);
    resultSummary = await page.evaluate(() => {
      const events = [...document.querySelectorAll('.events-column .event-item')].map(e => e.innerText.trim());
      const subs = [...document.querySelectorAll('.result-substitutions')].map(e => e.innerText.trim());
      const momentumMarkers = [...document.querySelectorAll('.result-event-marker')].map(e => e.getAttribute('aria-label') || e.getAttribute('title') || '');
      return {
        score: document.querySelector('.result-score-pcf')?.innerText.trim(),
        eventItems: events,
        substitutions: subs,
        momentumMarkers,
        subRows: document.querySelectorAll('.sub-row').length,
        momentumMarkersCount: document.querySelectorAll('.result-event-marker').length,
        inlineSubItems: document.querySelectorAll('.events-column .event-item.substitution').length,
        momentumEmpty: !!document.querySelector('.result-momentum-empty'),
      };
    });
    if (resultSummary.momentumMarkersCount >= 1 && resultSummary.subRows >= 2) break;
  }

  const metrics = await page.evaluate(() => {
    const q = (sel) => document.querySelector(sel);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const body = document.body;
    const doc = document.documentElement;
    const resultRoot = q('.match-day--result');
    const continueBtn = q('.match-day__continue-btn');
    const bottomRow = q('.result-bottom-row');
    const momentum = q('.result-momentum-card');
    const momentumChart = q('[data-result-momentum-chart]');
    const result = q('.match-day__result');
    const ctaStyle = continueBtn ? getComputedStyle(continueBtn) : null;
    // Every scroll-capable ancestor of the result root must be locked so the
    // result root is the SOLE vertical scroll owner. We check computed overflow
    // (robust to URL-bar dynamics that headless can't reproduce) AND the raw
    // scrollHeight-clientHeight delta.
    const ancestorSelectors = ['html', 'body', '#root', '.app', '.app-screen-transition'];
    const ancestors = ancestorSelectors.map((sel) => {
      const el = sel === 'html' ? document.documentElement
        : sel === 'body' ? document.body
        : document.querySelector(sel);
      if (!el) return { sel, present: false };
      const cs = getComputedStyle(el);
      return {
        sel,
        present: true,
        overflowY: cs.overflowY,
        scrollable: el.scrollHeight - el.clientHeight,
      };
    });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      buildMarker: result?.getAttribute('data-md-result-build') || null,
      ancestors,
      document: {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        bodyClientWidth: body.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        bodyClientHeight: body.clientHeight,
        scrollingElementTag: document.scrollingElement?.tagName || null,
        documentScrollable: doc.scrollHeight - doc.clientHeight,
        bodyScrollable: body.scrollHeight - body.clientHeight,
        resultRootScrollable: resultRoot ? resultRoot.scrollHeight - resultRoot.clientHeight : null,
      },
      resultRoot: resultRoot ? {
        rect: rect(resultRoot),
        overflowY: getComputedStyle(resultRoot).overflowY,
        scrollHeight: resultRoot.scrollHeight,
        clientHeight: resultRoot.clientHeight,
        scrollable: resultRoot.scrollHeight - resultRoot.clientHeight,
      } : null,
      result: rect(result),
      momentum: rect(momentum),
      momentumChart: momentumChart ? { overflowX: getComputedStyle(momentumChart).overflowX, scrollWidth: momentumChart.scrollWidth, clientWidth: momentumChart.clientWidth } : null,
      cta: continueBtn ? { rect: rect(continueBtn), position: ctaStyle.position, bottomCss: ctaStyle.bottom } : null,
      bottomRow: rect(bottomRow),
      hooks: {
        resultSubstitutions: document.querySelectorAll('.result-substitutions').length,
        resultMomentum: document.querySelectorAll('.result-momentum-card').length,
        subRows: document.querySelectorAll('.sub-row').length,
        momentumMarkers: document.querySelectorAll('.result-event-marker').length,
        inlineSubItems: document.querySelectorAll('.events-column .event-item.substitution').length,
      },
      text: document.body.innerText.slice(0, 2000),
    };
  });

  // Build/cache freshness marker — guards against shipping a result screen that
  // lost the CTA-geometry fix (and lets a stale preprod bundle be spotted in DOM).
  assert(metrics.buildMarker === 'matchday-result-scrolllock-20260606', `${label}: result build marker missing/stale`, { buildMarker: metrics.buildMarker });

  // SINGLE SCROLL OWNER: html/body/#root/.app/.app-screen-transition must all be
  // overflow-locked during the result phase, so the only vertical scroller is
  // .match-day--result. This is the robust guard against the Android double-scroll
  // (computed overflow doesn't depend on URL-bar height the way scrollHeight does).
  const okOverflow = (v) => v === 'hidden' || v === 'clip';
  const leakyAncestor = metrics.ancestors.find(a => a.present && (!okOverflow(a.overflowY) || a.scrollable > 4));
  assert(!leakyAncestor, `${label}: a result-screen ancestor can still scroll (multiple vertical scroll owners)`, { leakyAncestor, ancestors: metrics.ancestors });
  assert(metrics.hooks.resultSubstitutions === 2, `${label}: expected two CAMBIOS blocks`, metrics.hooks);
  assert(metrics.hooks.resultMomentum === 1, `${label}: expected one MOMENTUM block`, metrics.hooks);
  assert(metrics.hooks.inlineSubItems === 0, `${label}: substitutions duplicated inline`, metrics.hooks);
  assert(metrics.hooks.subRows >= 2, `${label}: expected visible substitution rows`, { metrics, resultSummary });
  assert(metrics.hooks.momentumMarkers >= 1, `${label}: expected visible result momentum event markers`, { metrics, resultSummary });
  assert(metrics.document.scrollWidth <= metrics.document.clientWidth + 2, `${label}: document horizontal overflow`, metrics.document);
  assert(metrics.document.bodyScrollWidth <= metrics.document.bodyClientWidth + 2, `${label}: body horizontal overflow`, metrics.document);
  assert(metrics.cta?.position === 'fixed', `${label}: continue CTA is not fixed`, metrics.cta);
  assert(metrics.cta.rect.bottom <= metrics.viewport.height + 1 && metrics.cta.rect.top >= 0, `${label}: continue CTA outside viewport`, metrics.cta);
  assert(metrics.resultRoot?.overflowY === 'auto' || metrics.resultRoot?.overflowY === 'scroll', `${label}: result root is not the vertical scroll container`, metrics.resultRoot);
  assert(metrics.resultRoot?.scrollable > 40, `${label}: .match-day--result is not scrollable`, metrics.resultRoot);
  assert(metrics.document.documentScrollable <= 4, `${label}: document is scrollable in addition to result root`, metrics.document);
  assert(metrics.document.bodyScrollable <= 4, `${label}: body is scrollable in addition to result root`, metrics.document);

  // <html> is `overflow:hidden`, so the document/window never scrolls. Resolve
  // the element that actually owns the result-screen scroll: the phase-specific
  // .match-day--result container first, then fall back to scrollingElement/body.
  await page.evaluate(() => {
    window.__pcfResultScroller = () => {
      const result = document.querySelector('.match-day--result');
      if (result && result.scrollHeight - result.clientHeight > 4) return result;
      const se = document.scrollingElement || document.documentElement;
      if (se && se.scrollHeight - se.clientHeight > 4) return se;
      if (document.body && document.body.scrollHeight - document.body.clientHeight > 4) return document.body;
      return result || se || document.body;
    };
  });

  const scrollOwnerInfo = await page.evaluate(() => {
    const el = window.__pcfResultScroller();
    const kind = el.classList?.contains('match-day--result') ? '.match-day--result'
      : el === (document.scrollingElement || document.documentElement) ? 'window/scrollingElement'
      : el === document.body ? 'body' : (el.className || el.tagName);
    const body = document.body;
    const doc = document.documentElement;
    return {
      kind,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollable: el.scrollHeight - el.clientHeight,
      documentScrollable: doc.scrollHeight - doc.clientHeight,
      bodyScrollable: body.scrollHeight - body.clientHeight,
    };
  });
  assert(scrollOwnerInfo.kind === '.match-day--result', `${label}: wrong result scroll owner`, scrollOwnerInfo);
  assert(scrollOwnerInfo.scrollable > 40, `${label}: result content is not scrollable — momentum/bottom panels would be unreachable`, scrollOwnerInfo);
  assert(scrollOwnerInfo.documentScrollable <= 4 && scrollOwnerInfo.bodyScrollable <= 4, `${label}: multiple vertical scroll owners on result screen`, scrollOwnerInfo);

  const scrollTo = async (ratio) => {
    await page.evaluate((r) => {
      const el = window.__pcfResultScroller();
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.round(max * r);
    }, ratio);
    await page.waitForTimeout(220);
  };

  const rectsAt = () => page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      cta: rect('.match-day__continue-btn'),
      bottomRow: rect('.result-bottom-row'),
      momentum: rect('.result-momentum-card'),
      stats: rect('.result-stats'),
      lastStatRow: rect('.result-stats .stat-row:last-child'),
      scoreboard: rect('.result-scoreboard-pcf'),
    };
  });

  // Every important result section must be reachable ABOVE the fixed CTA — at
  // some scroll position its bottom clears the CTA top, so the CTA never
  // permanently hides readable content (the PARADAS/stats-row regression).
  const assertClearable = async (sel, name) => {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      const cta = document.querySelector('.match-day__continue-btn');
      const scroller = window.__pcfResultScroller();
      if (!el || !cta) return;
      const ctaTop = cta.getBoundingClientRect().top;
      // Aim the element's bottom ~24px above the CTA top; clamps at max scroll.
      scroller.scrollTop += el.getBoundingClientRect().bottom - (ctaTop - 24);
    }, sel);
    await page.waitForTimeout(200);
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s);
      const cta = document.querySelector('.match-day__continue-btn');
      if (!el || !cta) return null;
      const er = el.getBoundingClientRect();
      const cr = cta.getBoundingClientRect();
      return { sel: s, elBottom: er.bottom, elTop: er.top, ctaTop: cr.top, vh: innerHeight };
    }, sel);
    assert(r && r.elBottom <= r.ctaTop + 1, `${label}: ${name} cannot clear the fixed CTA (hidden behind it)`, r);
  };

  // TOP evidence — scoreboard reachable at the top of the scroller.
  await scrollTo(0);
  const topRects = await rectsAt();
  const topPath = path.join(OUT_DIR, `${label}-top-viewport.png`);
  await page.screenshot({ path: topPath, fullPage: false });
  assert(topRects.scoreboard && topRects.scoreboard.top >= -4 && topRects.scoreboard.top < topRects.viewport.height,
    `${label}: scoreboard not reachable at top of scroll`, topRects);

  // MOMENTUM evidence — scroll the owner until the momentum panel is in view.
  await page.evaluate(() => {
    const el = window.__pcfResultScroller();
    const momentum = document.querySelector('.result-momentum-card');
    if (momentum) {
      const cr = momentum.getBoundingClientRect();
      el.scrollTop += cr.top - Math.max(16, innerHeight * 0.2);
    }
  });
  await page.waitForTimeout(220);
  const momentumRects = await rectsAt();
  const momentumPath = path.join(OUT_DIR, `${label}-momentum-viewport.png`);
  await page.screenshot({ path: momentumPath, fullPage: false });
  const momentumVisible = momentumRects.momentum
    && momentumRects.momentum.bottom > 0
    && momentumRects.momentum.top < momentumRects.viewport.height;
  assert(momentumVisible, `${label}: result momentum not reachable by scrolling the result scroller`, momentumRects);

  // Full-page reference capture.
  const fullPath = path.join(OUT_DIR, `${label}-full.png`);
  await page.screenshot({ path: fullPath, fullPage: true });

  // BOTTOM evidence — stadium/MOTM row reachable and not covered by the CTA.
  await scrollTo(1);
  const bottomMetrics = await rectsAt();
  const bottomPath = path.join(OUT_DIR, `${label}-bottom-viewport.png`);
  await page.screenshot({ path: bottomPath, fullPage: false });
  assert(bottomMetrics.cta.bottom <= bottomMetrics.viewport.height + 1, `${label}: CTA bottom not pinned after scroll`, bottomMetrics);
  const bottomRowVisible = bottomMetrics.bottomRow
    && bottomMetrics.bottomRow.bottom > 0
    && bottomMetrics.bottomRow.top < bottomMetrics.viewport.height;
  assert(bottomRowVisible, `${label}: stadium/MOTM bottom row not reachable at end of scroll`, bottomMetrics);
  const bottomRowOverlapsCta = bottomRowVisible
    && !(bottomMetrics.bottomRow.bottom <= bottomMetrics.cta.top - 8 || bottomMetrics.bottomRow.top >= bottomMetrics.cta.bottom + 8);
  assert(!bottomRowOverlapsCta, `${label}: CTA overlaps bottom stadium/MOTM panel after scroll`, bottomMetrics);

  // End gap must be SANE: the final block sits a modest distance above the CTA —
  // not negative/overlapping, and not a huge dead tail. Reserve = CTA height +
  // inset + ~20px gap, so the expected gap is small and roughly device-independent.
  const END_GAP_MIN = 6;
  const END_GAP_MAX = 64;
  const endGap = bottomMetrics.cta.top - bottomMetrics.bottomRow.bottom;
  assert(endGap >= END_GAP_MIN && endGap <= END_GAP_MAX,
    `${label}: end gap between final block and CTA out of sane range (${Math.round(endGap)}px, expected ${END_GAP_MIN}-${END_GAP_MAX})`,
    { endGap, ...bottomMetrics });

  // No important section may be permanently hidden behind the fixed CTA.
  await assertClearable('.result-stats .stat-row:last-child', 'last stats row (PARADAS area)');
  await assertClearable('.result-momentum-card', 'momentum panel');
  await assertClearable('.result-bottom-row', 'stadium/MOTM bottom row');

  await context.close();
  return { label, scrollOwner: scrollOwnerInfo, topPath, momentumPath, fullPath, bottomPath, metrics, topRects, momentumRects, bottomMetrics, resultSummary, consoleIssues };
}

await fs.mkdir(OUT_DIR, { recursive: true });
const server = await createServer({ root: ROOT, server: { host: '127.0.0.1', port: PORT, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await runViewport(browser, 'desktop-1365x900', { ...devices['Desktop Chrome'], viewport: { width: 1365, height: 900 } });
  const mobile = await runViewport(browser, 'mobile-pixel7', { ...devices['Pixel 7'], viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  const summary = { ok: true, desktop, mobile };
  await fs.writeFile(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  await server.close();
}
