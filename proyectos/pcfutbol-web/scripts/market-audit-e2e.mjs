import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const scenario = process.env.SCENARIO || '2rfef';
const seasons = Number(process.env.SEASONS || 2);
const out = new URL('../dogfood-output/market-audit-e2e/', import.meta.url);
await fs.mkdir(out, { recursive: true });

const scenarios = {
  laliga: { id: 'laliga', country: /España|Spain/i, league: /Liga Ibérica|LaLiga|Primera/i },
  brazil: { id: 'brazil', country: /Brasil|Brazil/i, league: /Série A|Serie A|Brasile/i },
  '2rfef': { id: '2rfef', country: /España|Spain/i, league: /Segunda Federación|2.?RFEF|Segunda RFEF/i },
};
const sc = scenarios[scenario] || scenarios['2rfef'];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['Desktop Chrome'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();
const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));
const sleep = ms => page.waitForTimeout(ms);

async function waitApp() {
  await page.waitForFunction(() => window.__pcfGame && window.__pcfGame.state.loaded, null, { timeout: 60000 });
}
async function setScreen(screen) {
  await page.evaluate(s => window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: s }), screen);
  await sleep(700);
}
async function clickVisibleByText(regex, label, timeout = 10000) {
  const loc = page.locator('button:visible,a:visible,[role="button"]:visible,.map-selection__country-card:visible,.map-selection__division-card:visible,.team-row:visible').filter({ hasText: regex }).first();
  await loc.waitFor({ state: 'visible', timeout });
  await loc.click({ timeout });
  await sleep(700);
}
async function clickFirstVisible(selectors, label, timeout = 10000) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (!await loc.count().catch(() => 0)) continue;
    try {
      await loc.waitFor({ state: 'visible', timeout: Math.min(timeout, 3000) });
      await loc.click({ timeout });
      await sleep(800);
      return true;
    } catch {}
  }
  throw new Error(`No se pudo clicar ${label}`);
}
async function startScenario() {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitApp();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitApp();
  await setScreen('team_selection');
  await clickVisibleByText(sc.country, `${sc.id}: país`);
  await clickVisibleByText(sc.league, `${sc.id}: liga`);
  if (await page.locator('.group-card:visible').count().catch(() => 0)) {
    await clickFirstVisible(['.group-card:visible'], `${sc.id}: grupo`);
  }
  await clickFirstVisible(['.team-row:visible', 'button:visible:has-text("FC")', 'button:visible:has-text("CF")', 'button:visible:has-text("CD")'], `${sc.id}: equipo`);
  await clickFirstVisible(['.btn-start:visible', 'button:visible:has-text("EMPEZAR")', 'button:visible:has-text("INICIAR")'], `${sc.id}: empezar`);
  await clickFirstVisible(['.preseason-actions .btn-skip:visible', 'button:visible:has-text("Saltar pretemporada")'], `${sc.id}: saltar pretemporada`);
  await page.waitForFunction(() => window.__pcfGame?.state?.currentScreen === 'office' && !window.__pcfGame?.state?.preseasonPhase, null, { timeout: 60000 });
  await page.waitForFunction(() => (window.__pcfGame?.state?.leagueTeams || []).length > 30, null, { timeout: 60000 }).catch(() => {});
  await sleep(1200);
}
async function simulateWeeksViaApp(numWeeks) {
  await page.waitForFunction(() => typeof window.__pcfOffice?.simulateWeeks === 'function', null, { timeout: 30000 });
  await page.evaluate((weeks) => window.__pcfOffice.simulateWeeks(weeks), numWeeks);
}
async function closeSummary() {
  await sleep(700);
  if (await page.locator('.sim-summary-overlay').count().catch(() => 0)) {
    await page.locator('.sim-summary__continue').click({ timeout: 3000, force: true }).catch(() => {});
  }
  await page.waitForFunction(() => !document.querySelector('.sim-summary-overlay'), null, { timeout: 10000 }).catch(() => page.evaluate(() => document.querySelector('.sim-summary-overlay')?.remove()));
  await sleep(400);
}
async function resolveSeasonEnd() {
  const fired = await page.evaluate(() => !!window.__pcfGame?.state?.managerFired).catch(() => false);
  if (fired) return 'managerFired';
  const hasHook = await page.evaluate(() => !!window.__pcfSeasonEnd).catch(() => false);
  if (hasHook) {
    await page.evaluate(() => window.__pcfSeasonEnd.goPreseason()).catch(() => {});
    await page.waitForFunction(() => window.__pcfSeasonEnd?.getPhase?.() === 'preseason', null, { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => window.__pcfSeasonEnd?.skipPreseason?.()).catch(() => {});
  }
  return null;
}
async function snapshot(label) {
  return await page.evaluate((label) => {
    const st = window.__pcfGame.state;
    const teams = st.leagueTeams || [];
    const teamsWithPlayers = teams.filter(t => (t.players || []).length);
    const countByLeague = {};
    for (const t of teams) countByLeague[t.leagueId || 'none'] = (countByLeague[t.leagueId || 'none'] || 0) + 1;
    const hist = st.globalMarket?.summary?.recentTransfers || [];
    const priceStats = hist.length ? {
      count: hist.length,
      max: Math.max(...hist.map(t => t.price || 0)),
      min: Math.min(...hist.map(t => t.price || 0)),
      avg: Math.round(hist.reduce((s,t)=>s+(t.price||0),0)/hist.length),
      sample: hist.slice(0, 10).map(t => ({ player: t.player?.name, ovr: t.player?.overall, age: t.player?.age, from: t.from?.name, to: t.to?.name, price: t.price, season: t.season, week: t.week }))
    } : { count: 0, sample: [] };
    const budgets = teams.map(t => t.budget || 0).filter(Number.isFinite);
    const squadSizes = teamsWithPlayers.map(t => (t.players || []).length);
    const playerNameCounts = new Map();
    const playerKeyCounts = new Map();
    for (const t of teamsWithPlayers) {
      for (const p of (t.players || [])) {
        const name = p.name || 'Sin nombre';
        playerNameCounts.set(name, (playerNameCounts.get(name) || 0) + 1);
        const key = `${name}|${p.overall || 0}|${p.age || 0}|${p.position || ''}`;
        playerKeyCounts.set(key, (playerKeyCounts.get(key) || 0) + 1);
      }
    }
    const topDuplicateNames = Array.from(playerNameCounts.entries()).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
    const topDuplicateKeys = Array.from(playerKeyCounts.entries()).filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([key, count]) => ({ key, count }));
    const byTeamTransfers = {};
    for (const t of hist) {
      if (t.to?.name) byTeamTransfers[t.to.name] = (byTeamTransfers[t.to.name] || 0) + 1;
      if (t.from?.name) byTeamTransfers[t.from.name] = (byTeamTransfers[t.from.name] || 0) + 1;
    }
    return {
      label,
      season: st.currentSeason,
      week: st.currentWeek,
      screen: st.currentScreen,
      managerFired: !!st.managerFired,
      playerLeagueId: st.playerLeagueId || st.leagueId,
      playerTeam: st.team?.name,
      playerSquad: st.team?.players?.length || 0,
      leagueTeams: teams.length,
      teamsWithPlayers: teamsWithPlayers.length,
      countByLeague,
      squadMin: squadSizes.length ? Math.min(...squadSizes) : 0,
      squadMax: squadSizes.length ? Math.max(...squadSizes) : 0,
      squadAvg: squadSizes.length ? Number((squadSizes.reduce((a,b)=>a+b,0)/squadSizes.length).toFixed(2)) : 0,
      budgetMin: budgets.length ? Math.min(...budgets) : 0,
      budgetMax: budgets.length ? Math.max(...budgets) : 0,
      budgetAvg: budgets.length ? Math.round(budgets.reduce((a,b)=>a+b,0)/budgets.length) : 0,
      duplicatePlayerNames: Array.from(playerNameCounts.values()).filter(count => count > 1).length,
      duplicatePlayerKeys: Array.from(playerKeyCounts.values()).filter(count => count > 1).length,
      topDuplicateNames,
      topDuplicateKeys,
      totalTransfers: st.globalMarket?.summary?.totalTransfers || 0,
      totalSpent: st.globalMarket?.summary?.totalSpent || 0,
      recentPriceStats: priceStats,
      recentTeamActivity: Object.entries(byTeamTransfers).sort((a,b)=>b[1]-a[1]).slice(0, 10).map(([name,count])=>({name,count})),
    };
  }, label);
}

const snapshots = [];
try {
  await startScenario();
  snapshots.push(await snapshot('start'));
  for (let seasonIdx = 1; seasonIdx <= seasons; seasonIdx++) {
    const maxWeek = await page.evaluate(() => Math.max(...(window.__pcfGame.state.fixtures || []).map(f => f.week), 38));
    const checkpoints = [8, 24, maxWeek + 1];
    for (const targetWeek of checkpoints) {
      const cur = await page.evaluate(() => window.__pcfGame.state.currentWeek);
      if (cur <= targetWeek) {
        await simulateWeeksViaApp(Math.max(1, targetWeek - cur + 1));
        await closeSummary();
        await sleep(600);
        snapshots.push(await snapshot(`season${seasonIdx}-week${targetWeek}`));
        if (await page.evaluate(() => !!window.__pcfGame.state.managerFired).catch(() => false)) break;
      }
    }
    if (await page.evaluate(() => !!window.__pcfGame.state.managerFired).catch(() => false)) break;
    await page.waitForFunction((prevSeason) => {
      const st = window.__pcfGame?.state;
      return /Fin de temporada|Resumen de temporada|DESTITUIDO/i.test(document.body.innerText) || st?.currentSeason > prevSeason || st?.managerFired;
    }, seasonIdx, { timeout: 180000 }).catch(() => {});
    const stop = await resolveSeasonEnd();
    snapshots.push(await snapshot(`season${seasonIdx}-end`));
    if (stop) break;
    await page.waitForFunction((prevSeason) => window.__pcfGame?.state?.currentSeason > prevSeason && window.__pcfGame?.state?.currentScreen === 'office', seasonIdx, { timeout: 120000 }).catch(() => {});
  }
} finally {
  const errors = consoleMessages.filter(m => ['error','pageerror'].includes(m.type) && !/favicon|manifest|Failed to load resource/i.test(m.text));
  const report = { generatedAt: new Date().toISOString(), baseURL, scenario: sc.id, seasons, snapshots, consoleErrors: errors };
  await fs.writeFile(new URL(`market-${sc.id}.json`, out), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ out: out.pathname, scenario: sc.id, snapshots: snapshots.map(s => ({ label: s.label, season: s.season, week: s.week, transfers: s.totalTransfers, spent: s.totalSpent, teams: s.leagueTeams, teamsWithPlayers: s.teamsWithPlayers, budgetAvg: s.budgetAvg, managerFired: s.managerFired })), consoleErrors: errors.length }, null, 2));
  await browser.close();
}
