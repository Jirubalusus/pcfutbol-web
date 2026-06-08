import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const seasons = Number(process.env.SEASONS || 10);
const out = new URL('../dogfood-output/long-career-e2e/', import.meta.url);
await fs.mkdir(out, { recursive: true });

const scenarios = [
  { id: 'europe_laliga', label: 'Equipo europeo / España / LaLiga', country: /España|Spain/i, league: /Liga Ibérica|LaLiga|Primera/i, team: null, maxEarlyMoney: null },
  { id: 'south_america_brazil', label: 'Equipo sudamericano / Brasil / Série A', country: /Brasil|Brazil/i, league: /Série A|Serie A|Brasile/i, team: null, maxEarlyMoney: null },
  { id: 'spain_2rfef', label: 'Equipo bajo / España / Segunda Federación', country: /España|Spain/i, league: /Segunda Federación|2.?RFEF|Segunda RFEF/i, team: null, maxEarlyMoney: 50_000_000 },
];
const scenarioFilter = process.env.SCENARIO || '';
const selectedScenarios = scenarioFilter ? scenarios.filter(s => s.id.includes(scenarioFilter)) : scenarios;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();
const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));

const sleep = ms => page.waitForTimeout(ms);
const moneyFmt = n => `${Math.round(n).toLocaleString('es-ES')}€`;

async function waitApp() {
  await page.waitForFunction(() => window.__pcfGame && window.__pcfGame.state.loaded, null, { timeout: 60000 });
}
async function setScreen(screen) {
  await page.evaluate(s => window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: s }), screen);
  await sleep(800);
}
async function clickVisibleByText(regex, label, timeout = 8000) {
  const loc = page.locator('button:visible,a:visible,[role="button"]:visible,.map-selection__country-card:visible,.map-selection__division-card:visible,.team-row:visible,.preseason-card:visible').filter({ hasText: regex }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.click({ timeout });
  await sleep(700);
}
async function clickFirstVisible(selectors, label, timeout = 8000) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    const n = await loc.count().catch(() => 0);
    if (!n) continue;
    try {
      await loc.waitFor({ state: 'visible', timeout: Math.min(timeout, 3000) });
      await loc.click({ timeout });
      await sleep(800);
      return true;
    } catch {}
  }
  throw new Error(`No se pudo clicar ${label}: ${selectors.join(', ')}`);
}
function metricFromState(state) {
  const players = state.team?.players || [];
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const salaryAnnual = players.reduce((sum, p) => {
    const share = (p.onLoan && p.loanSalaryShare != null) ? p.loanSalaryShare : 1;
    return sum + ((p.salary || 0) * share * 52);
  }, 0);
  const playerSig = players.map(p => `${p.name}|${p.age}|${p.overall}`).sort();
  const aiTeams = (state.leagueTeams || []).filter(t => t.id !== state.teamId && (t.players || []).length);
  const sampled = aiTeams.slice(0, 12).map(t => ({ id: t.id, name: t.name, count: t.players?.length || 0, sig: (t.players || []).map(p => p.name).sort().slice(0, 25).join('|'), budget: t.budget || 0 }));
  const old = players.filter(p => (p.age || 0) >= 33).length;
  const young = players.filter(p => (p.age || 0) <= 23).length;
  const tablePos = (state.leagueTable || []).findIndex(t => t.teamId === state.teamId) + 1;
  return {
    season: state.currentSeason,
    week: state.currentWeek,
    screen: state.currentScreen,
    leagueId: state.playerLeagueId || state.leagueId,
    teamId: state.teamId,
    teamName: state.team?.name,
    money: state.money || 0,
    managerFired: !!state.managerFired,
    players: players.length,
    avgOvr: Number(avg(players.map(p => p.overall || 0)).toFixed(2)),
    avgAge: Number(avg(players.map(p => p.age || 0)).toFixed(2)),
    minAge: players.length ? Math.min(...players.map(p => p.age || 0)) : 0,
    maxAge: players.length ? Math.max(...players.map(p => p.age || 0)) : 0,
    old,
    young,
    retiringInSquad: players.filter(p => p.retiring).length,
    tablePos,
    totalTeams: state.leagueTable?.length || 0,
    transferTotal: state.globalMarket?.summary?.totalTransfers || 0,
    transferSpent: state.globalMarket?.summary?.totalSpent || 0,
    salaryAnnual,
    stadiumCapacity: state.stadium?.realCapacity || 0,
    seasonTicketsFinal: state.stadium?.seasonTicketsFinal || 0,
    seasonTicketPrice: state.stadium?.seasonTicketPriceFinal || state.stadium?.seasonTicketPrice || 0,
    seasonTicketIncomeCollected: state.stadium?.seasonTicketIncomeCollected || 0,
    accumulatedTicketIncome: state.stadium?.accumulatedTicketIncome || 0,
    accumulatedServicesIncome: state.stadium?.accumulatedServicesIncome || 0,
    namingYearlyIncome: state.stadium?.naming?.yearlyIncome || 0,
    transfersSpent: state.transfersSpent || 0,
    transfersEarned: state.transfersEarned || 0,
    prizeIncome: state.prizeIncome || 0,
    aiSample: sampled,
    playerSig,
    messages: (state.messages || []).slice(0, 10).map(m => m.title || m.titleKey || m.type),
  };
}
async function getMetric() {
  return await page.evaluate(() => metricFromState(window.__pcfGame.state).toString(), null).catch(async () => {
    return await page.evaluate(() => {
      const state = window.__pcfGame.state;
      const players = state.team?.players || [];
      const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const aiTeams = (state.leagueTeams || []).filter(t => t.id !== state.teamId && (t.players || []).length);
      const salaryAnnual = players.reduce((sum, p) => {
        const share = (p.onLoan && p.loanSalaryShare != null) ? p.loanSalaryShare : 1;
        return sum + ((p.salary || 0) * share * 52);
      }, 0);
      return {
        season: state.currentSeason,
        week: state.currentWeek,
        screen: state.currentScreen,
        leagueId: state.playerLeagueId || state.leagueId,
        teamId: state.teamId,
        teamName: state.team?.name,
        money: state.money || 0,
        managerFired: !!state.managerFired,
        players: players.length,
        avgOvr: Number(avg(players.map(p => p.overall || 0)).toFixed(2)),
        avgAge: Number(avg(players.map(p => p.age || 0)).toFixed(2)),
        minAge: players.length ? Math.min(...players.map(p => p.age || 0)) : 0,
        maxAge: players.length ? Math.max(...players.map(p => p.age || 0)) : 0,
        old: players.filter(p => (p.age || 0) >= 33).length,
        young: players.filter(p => (p.age || 0) <= 23).length,
        retiringInSquad: players.filter(p => p.retiring).length,
        tablePos: (state.leagueTable || []).findIndex(t => t.teamId === state.teamId) + 1,
        totalTeams: state.leagueTable?.length || 0,
        transferTotal: state.globalMarket?.summary?.totalTransfers || 0,
        transferSpent: state.globalMarket?.summary?.totalSpent || 0,
        salaryAnnual,
        stadiumCapacity: state.stadium?.realCapacity || 0,
        seasonTicketsFinal: state.stadium?.seasonTicketsFinal || 0,
        seasonTicketPrice: state.stadium?.seasonTicketPriceFinal || state.stadium?.seasonTicketPrice || 0,
        seasonTicketIncomeCollected: state.stadium?.seasonTicketIncomeCollected || 0,
        accumulatedTicketIncome: state.stadium?.accumulatedTicketIncome || 0,
        accumulatedServicesIncome: state.stadium?.accumulatedServicesIncome || 0,
        namingYearlyIncome: state.stadium?.naming?.yearlyIncome || 0,
        transfersSpent: state.transfersSpent || 0,
        transfersEarned: state.transfersEarned || 0,
        prizeIncome: state.prizeIncome || 0,
        aiSample: aiTeams.slice(0, 12).map(t => ({ id: t.id, name: t.name, count: t.players?.length || 0, sig: (t.players || []).map(p => p.name).sort().slice(0, 25).join('|'), budget: t.budget || 0 })),
        playerSig: players.map(p => `${p.name}|${p.age}|${p.overall}`).sort(),
        messages: (state.messages || []).slice(0, 10).map(m => m.title || m.titleKey || m.type),
      };
    });
  });
}

async function startScenario(sc) {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitApp();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitApp();
  await setScreen('team_selection');
  await clickVisibleByText(sc.country, `${sc.label}: país`);
  await clickVisibleByText(sc.league, `${sc.label}: liga`);
  // Grouped leagues (e.g. Segunda Federación) show group cards before teams.
  if (await page.locator('.group-card:visible').count().catch(() => 0)) {
    await clickFirstVisible(['.group-card:visible'], `${sc.label}: primer grupo`);
  }
  if (sc.team) await clickVisibleByText(sc.team, `${sc.label}: equipo`);
  else await clickFirstVisible(['.team-row:visible', 'button:visible:has-text("FC")', 'button:visible:has-text("CF")', 'button:visible:has-text("CD")'], `${sc.label}: primer equipo`);
  await clickFirstVisible(['.btn-start:visible', 'button:visible:has-text("EMPEZAR")', 'button:visible:has-text("INICIAR")', 'button:visible:has-text("START")'], `${sc.label}: empezar`);
  await clickFirstVisible(['.preseason-actions .btn-skip:visible', 'button:visible:has-text("Saltar pretemporada")', 'button:visible:has-text("Skip")'], `${sc.label}: saltar pretemporada`);
  await page.waitForFunction(() => window.__pcfGame?.state?.currentScreen === 'office' && !window.__pcfGame?.state?.preseasonPhase, null, { timeout: 60000 });
  // Give deferred init time to load global teams/competitions.
  await page.waitForFunction(() => (window.__pcfGame?.state?.leagueTeams || []).length > 30, null, { timeout: 60000 }).catch(() => {});
  await sleep(1000);
}

async function clickSimOption(regex, label) {
  await page.evaluate(() => document.querySelectorAll('.sim-summary-overlay').forEach(el => el.remove())).catch(() => {});
  await page.locator('.office__sim-dropdown').hover({ timeout: 8000 });
  await sleep(250);
  const option = page.locator('.office__sim-options button:visible, button:visible').filter({ hasText: regex }).first();
  await option.click({ timeout: 8000 });
}

async function simulateWeeksViaApp(numWeeks) {
  await page.waitForFunction(() => typeof window.__pcfOffice?.simulateWeeks === 'function', null, { timeout: 30000 });
  await page.evaluate((weeks) => window.__pcfOffice.simulateWeeks(weeks), numWeeks);
}

async function closeSimulationSummaryIfVisible() {
  await sleep(800);
  if (await page.locator('.sim-summary-overlay').count().catch(() => 0)) {
    await page.locator('.sim-summary__continue').click({ timeout: 3000, force: true }).catch(async () => {
      await page.locator('.sim-summary-overlay').click({ position: { x: 5, y: 5 }, timeout: 3000, force: true }).catch(() => {});
    });
  }
  await page.waitForFunction(() => !document.querySelector('.sim-summary-overlay'), null, { timeout: 8000 }).catch(async () => {
    await page.evaluate(() => document.querySelector('.sim-summary-overlay')?.remove()).catch(() => {});
  });
  await sleep(500);
}

async function resolvePendingSeasonEndInteractions() {
  for (let i = 0; i < 12; i++) {
    const text = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const needsPlayoffMatch = /Próximo partido|Next match|Pendiente/i.test(text);
    if (/Resumen de temporada|Fin de temporada/i.test(text) && !needsPlayoffMatch) return;

    let clicked = false;
    if (needsPlayoffMatch && await page.locator('.btn-play-match:visible').count().catch(() => 0)) {
      clicked = await page.locator('.btn-play-match:visible').first().click({ timeout: 5000, force: true }).then(() => true).catch(() => false);
    }
    if (!clicked) {
      clicked = await page.locator('button:visible').filter({ hasText: /Jugar partido|Play match|Continuar|Ver resumen|Resumen de temporada|Season summary/i }).first().click({ timeout: 5000, force: true }).then(() => true).catch(() => false);
    }
    if (!clicked) break;
    await sleep(900);
  }
}

async function finishSeason(sc, yearIdx) {
  const before = await getMetric();
  const maxWeek = await page.evaluate(() => Math.max(...(window.__pcfGame.state.fixtures || []).map(f => f.week), 38));
  const halfSeason = Math.ceil(maxWeek / 2);
  if ((before.week || 1) <= halfSeason) {
    await simulateWeeksViaApp(Math.max(1, halfSeason - (before.week || 1)));
    await page.waitForFunction((prevWeek) => (window.__pcfGame?.state?.currentWeek || 0) > prevWeek || /Resumen de simulación|Simulation/i.test(document.body.innerText), before.week, { timeout: 180000 });
    await closeSimulationSummaryIfVisible();
  }
  const mid = await getMetric();
  await simulateWeeksViaApp(Math.max(1, maxWeek - (mid.week || 1) + 2));
  await page.waitForFunction((prevSeason) => {
    const text = document.body.innerText;
    const st = window.__pcfGame?.state;
    return /Fin de temporada|Resumen de temporada|Season summary|Continuar|pretemporada|DESTITUIDO/i.test(text) || st?.currentSeason > prevSeason || st?.managerFired;
  }, before.season, { timeout: 180000 });
  await sleep(1000);
  await resolvePendingSeasonEndInteractions();
  const seasonEndSnapshot = await getMetric();
  if (seasonEndSnapshot.managerFired) {
    return { before, seasonEndSnapshot, after: seasonEndSnapshot, maxWeek, stoppedReason: 'managerFired' };
  }
  const hasSeasonEndHook = await page.evaluate(() => !!window.__pcfSeasonEnd).catch(() => false);
  if (hasSeasonEndHook) {
    await page.evaluate(() => window.__pcfSeasonEnd.goPreseason()).catch(() => {});
    await page.waitForFunction(() => window.__pcfSeasonEnd?.getPhase?.() === 'preseason', null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__pcfSeasonEnd?.skipPreseason?.()).catch(() => {});
  } else {
    // Summary → preseason selection. Prefer the concrete season-end button: text can be
    // visually truncated on small viewports, which made hasText locators flaky.
    if (await page.locator('.season-end .btn-continue:visible').count().catch(() => 0)) {
      await page.locator('.season-end .btn-continue:visible').last().click({ timeout: 12000, force: true }).catch(async () => {
        await page.locator('button:visible').filter({ hasText: /Continuar|pretemporada|Siguiente temporada/i }).first().click({ timeout: 12000, force: true }).catch(() => {});
      });
      await sleep(1000);
    }
    // Preseason selection → skip preseason.
    if (await page.locator('.season-end .btn-skip:visible').count().catch(() => 0)) {
      await page.locator('.season-end .btn-skip:visible').first().click({ timeout: 12000, force: true }).catch(async () => {
        await page.locator('button:visible').filter({ hasText: /Saltar pretemporada|Skip/i }).first().click({ timeout: 12000, force: true }).catch(() => {});
      });
    } else if (await page.locator('button:visible').filter({ hasText: /Saltar pretemporada|Skip/i }).count().catch(() => 0)) {
      await page.locator('button:visible').filter({ hasText: /Saltar pretemporada|Skip/i }).first().click({ timeout: 12000, force: true }).catch(() => {});
    }
  }
  await page.waitForFunction((prevSeason) => {
    const st = window.__pcfGame?.state;
    return st && st.currentScreen === 'office' && st.currentSeason > prevSeason && !st.preseasonPhase;
  }, before.season, { timeout: 120000 });
  await sleep(800);
  const after = await getMetric();
  return { before, seasonEndSnapshot, after, maxWeek };
}

function analyzeScenario(sc, snapshots, seasonTransitions) {
  const anomalies = [];
  const start = snapshots[0];
  const end = snapshots.at(-1);
  for (const s of snapshots) {
    if (!Number.isFinite(s.money)) anomalies.push({ severity: 'High', season: s.season, title: 'Dinero no finito', money: s.money });
    // Plantillas cortas aparecen de forma lógica si el usuario no renueva contratos;
    // se registran en snapshots, pero no cuentan como bug de economía/progresión.
    if (s.avgOvr > 92 || s.avgOvr < 35) anomalies.push({ severity: 'Medium', season: s.season, title: 'Media de plantilla fuera de rango lógico', avgOvr: s.avgOvr });
    if (s.maxAge > 45) anomalies.push({ severity: 'Medium', season: s.season, title: 'Jugador demasiado viejo sigue activo', maxAge: s.maxAge });
    // El despido por no renovar/plantilla corta es un final lógico de la partida,
    // no una anomalía de simulación para esta auditoría.
    if (sc.maxEarlyMoney && s.season <= start.season + 3 && s.money > sc.maxEarlyMoney) {
      anomalies.push({ severity: 'High', season: s.season, title: 'Economía inflada en equipo bajo: supera 50M demasiado pronto', money: s.money, leagueId: s.leagueId });
    }
  }
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const cur = snapshots[i];
    if (cur.avgAge <= prev.avgAge - 1.5 && cur.young <= prev.young) anomalies.push({ severity: 'Low', season: cur.season, title: 'Edad media bajó mucho sin rejuvenecimiento claro', prev: prev.avgAge, cur: cur.avgAge });
    if (cur.money - prev.money > 35_000_000 && /segundaRFEF|primeraRFEF/i.test(String(cur.leagueId))) {
      anomalies.push({ severity: 'High', season: cur.season, title: 'Salto económico excesivo en categorías bajas', delta: cur.money - prev.money, leagueId: cur.leagueId });
    }
  }
  const aiChangedTeams = end.aiSample.filter(t => {
    const initial = start.aiSample.find(x => x.id === t.id);
    return initial && initial.sig !== t.sig;
  }).length;
  const playerChanged = start.playerSig.join('\n') !== end.playerSig.join('\n');
  if ((end.transferTotal - start.transferTotal) < 10) anomalies.push({ severity: 'Medium', title: 'Pocos fichajes globales en 10 temporadas', transfers: end.transferTotal - start.transferTotal });
  if (aiChangedTeams < 3) anomalies.push({ severity: 'Medium', title: 'Pocos equipos IA cambian plantilla', aiChangedTeams });
  if (!playerChanged) anomalies.push({ severity: 'High', title: 'La plantilla del jugador no evoluciona' });
  return {
    id: sc.id,
    label: sc.label,
    startSeason: start.season,
    endSeason: end.season,
    seasonsAdvanced: end.season - start.season,
    startMoney: start.money,
    endMoney: end.money,
    moneyDelta: end.money - start.money,
    startAvgOvr: start.avgOvr,
    endAvgOvr: end.avgOvr,
    startAvgAge: start.avgAge,
    endAvgAge: end.avgAge,
    transfersDelta: end.transferTotal - start.transferTotal,
    transferSpentDelta: end.transferSpent - start.transferSpent,
    aiChangedTeams,
    finalLeague: end.leagueId,
    anomalies,
    snapshots: snapshots.map(({ playerSig, aiSample, ...rest }) => rest),
    seasonTransitions,
  };
}

const results = [];
for (const sc of selectedScenarios) {
  const scenarioErrors = [];
  const snapshots = [];
  const seasonTransitions = [];
  try {
    await startScenario(sc);
    snapshots.push(await getMetric());
    for (let i = 0; i < seasons; i++) {
      const transition = await finishSeason(sc, i + 1);
      seasonTransitions.push({
        idx: i + 1,
        fromSeason: transition.before.season,
        toSeason: transition.after.season,
        maxWeek: transition.maxWeek,
        moneyBefore: transition.before.money,
        moneyAfter: transition.after.money,
        avgOvrBefore: transition.before.avgOvr,
        avgOvrAfter: transition.after.avgOvr,
        playersBefore: transition.before.players,
        playersAfter: transition.after.players,
        transfersBefore: transition.before.transferTotal,
        transfersAfter: transition.after.transferTotal,
        salaryAnnualBefore: transition.before.salaryAnnual,
        salaryAnnualAtSeasonEnd: transition.seasonEndSnapshot?.salaryAnnual,
        seasonTicketIncomeAtSeasonEnd: transition.seasonEndSnapshot?.seasonTicketIncomeCollected,
        accumulatedTicketIncomeAtSeasonEnd: transition.seasonEndSnapshot?.accumulatedTicketIncome,
        accumulatedServicesIncomeAtSeasonEnd: transition.seasonEndSnapshot?.accumulatedServicesIncome,
        namingIncomeAtSeasonEnd: transition.seasonEndSnapshot?.namingYearlyIncome,
        stadiumCapacityAtSeasonEnd: transition.seasonEndSnapshot?.stadiumCapacity,
        seasonTicketsFinalAtSeasonEnd: transition.seasonEndSnapshot?.seasonTicketsFinal,
        seasonTicketPriceAtSeasonEnd: transition.seasonEndSnapshot?.seasonTicketPrice,
        leagueBefore: transition.before.leagueId,
        leagueAfter: transition.after.leagueId,
        stoppedReason: transition.stoppedReason,
      });
      snapshots.push(transition.after);
      if (transition.stoppedReason) break;
    }
    const summary = analyzeScenario(sc, snapshots, seasonTransitions);
    const lastTransition = seasonTransitions.at(-1);
    if (lastTransition?.stoppedReason) summary.stoppedReason = lastTransition.stoppedReason;
    results.push(summary);
  } catch (error) {
    scenarioErrors.push(error.stack || error.message);
    const debug = await page.evaluate(() => ({
      screen: window.__pcfGame?.state?.currentScreen,
      season: window.__pcfGame?.state?.currentSeason,
      week: window.__pcfGame?.state?.currentWeek,
      preseason: window.__pcfGame?.state?.preseasonPhase,
      league: window.__pcfGame?.state?.playerLeagueId || window.__pcfGame?.state?.leagueId,
      team: window.__pcfGame?.state?.team?.name,
      hasOffice: typeof window.__pcfOffice?.simulateWeeks === 'function',
      pendingCup: !!window.__pcfGame?.state?.pendingCupMatch,
      pendingEuropean: !!window.__pcfGame?.state?.pendingEuropeanMatch,
      pendingSA: !!window.__pcfGame?.state?.pendingSAMatch,
      text: document.body.innerText.slice(0, 500)
    })).catch(() => null);
    results.push({ id: sc.id, label: sc.label, fatal: error.message, errors: scenarioErrors, snapshots, seasonTransitions, debug });
  }
}

const errors = consoleMessages.filter(m => ['error', 'pageerror'].includes(m.type) && !/favicon|manifest|Failed to load resource/i.test(m.text));
const report = { generatedAt: new Date().toISOString(), baseURL, seasons, results, consoleErrors: errors.slice(0, 100) };
await fs.writeFile(new URL('audit.json', out), JSON.stringify(report, null, 2));
const md = [`# Long career E2E audit`, ``, `Temporadas por escenario: ${seasons}`, `Errores de consola: ${errors.length}`, ``];
for (const r of results) {
  md.push(`## ${r.label}`);
  if (r.fatal) {
    md.push(`- FATAL: ${r.fatal}`, '');
    continue;
  }
  md.push(`- Temporadas avanzadas: ${r.seasonsAdvanced}`);
  md.push(`- Liga final: ${r.finalLeague}`);
  md.push(`- Dinero: ${moneyFmt(r.startMoney)} → ${moneyFmt(r.endMoney)} (${moneyFmt(r.moneyDelta)})`);
  md.push(`- Media OVR: ${r.startAvgOvr} → ${r.endAvgOvr}`);
  md.push(`- Edad media: ${r.startAvgAge} → ${r.endAvgAge}`);
  md.push(`- Fichajes globales: +${r.transfersDelta}, gasto global: ${moneyFmt(r.transferSpentDelta)}`);
  md.push(`- Equipos IA muestreados con plantilla cambiada: ${r.aiChangedTeams}`);
  md.push(`- Anomalías: ${r.anomalies.length}`);
  for (const a of r.anomalies) md.push(`  - [${a.severity}] T${a.season || '-'} ${a.title} ${a.money ? moneyFmt(a.money) : ''}`);
  md.push('');
}
await fs.writeFile(new URL('report.md', out), md.join('\n'));
console.log(JSON.stringify({ out: out.pathname, results: results.map(r => ({ id: r.id, fatal: r.fatal, seasonsAdvanced: r.seasonsAdvanced, anomalies: r.anomalies?.length, moneyDelta: r.moneyDelta, transfersDelta: r.transfersDelta, finalLeague: r.finalLeague })), consoleErrors: errors.length }, null, 2));
await browser.close();
