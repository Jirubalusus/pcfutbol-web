import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('artifacts/qa-save-roundtrip-20260604');
fs.mkdirSync(outDir, { recursive: true });
const base = 'http://127.0.0.1:5192/?qaSaveRoundtrip=1';

const careerState = {
  loaded: true,
  gameStarted: true,
  gameMode: 'career',
  currentScreen: 'office',
  currentWeek: 7,
  currentSeason: 3,
  teamId: 'betis',
  team: { id: 'betis', teamId: 'betis', name: 'Betis', players: [{ id: 'p1', name: 'Joaquin', overall: 80 }] },
  leagueId: 'laliga',
  playerLeagueId: 'laliga',
  money: 7654321,
  databaseSeasonId: '2005-06',
  leagueTable: [{ teamId: 'betis', points: 21 }],
  fixtures: [{ id: 'old', played: true }, { id: 'next', played: false, week: 7, homeTeam: 'betis', awayTeam: 'sevilla' }],
  results: [{ week: 1, homeTeamId: 'betis', awayTeamId: 'sevilla', homeGoals: 2, awayGoals: 1, played: true, noisy: 'strip' }],
  settings: { autoSave: true, showTutorials: true, soundEnabled: true, musicVolume: 70, sfxVolume: 80 },
};

async function run(viewport, name, isMobile = false) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport, isMobile, deviceScaleFactor: isMobile ? 2 : 1, hasTouch: isMobile });
  const page = await context.newPage();
  const errors = [];
  page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`); });
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__pcfGame?.dispatch && window.__pcfGame?.state?.loaded, null, { timeout: 30000 });
  await page.evaluate((state) => {
    localStorage.removeItem('pcfutbol_local_career_v1');
    window.__pcfGame.dispatch({ type: 'LOAD_SAVE', payload: state });
  }, careerState);
  await page.waitForFunction(() => window.__pcfGame?.state?.gameStarted && window.__pcfGame?.state?.teamId === 'betis', null, { timeout: 10000 });
  await page.evaluate(() => window.__pcfGame.saveGame());
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('pcfutbol_local_career_v1');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.state?.teamId === 'betis' && parsed?.summary?.week === 7;
  }, null, { timeout: 10000 });
  const savedBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('pcfutbol_local_career_v1')));

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__pcfGame?.dispatch && window.__pcfGame?.state?.loaded, null, { timeout: 30000 });
  const menuInfo = await page.evaluate(() => ({
    screen: window.__pcfGame.state.currentScreen,
    storageExists: !!localStorage.getItem('pcfutbol_local_career_v1'),
    bodyText: document.body.innerText,
    gameStarted: window.__pcfGame.state.gameStarted,
  }));
  const playButton = page.getByText(/Jugar ahora|Play now/i).first();
  await playButton.click({ timeout: 15000 });
  await page.waitForTimeout(500);
  const afterPlayText = await page.evaluate(() => document.body.innerText);
  const hasContinuePrompt = /Continuar|Continue/i.test(afterPlayText) && /Nueva|New/i.test(afterPlayText);
  const continueButton = page.getByText(/Continuar|Continue/i).first();
  await continueButton.click({ timeout: 15000 });
  await page.waitForFunction(() => window.__pcfGame?.state?.currentScreen === 'office' && window.__pcfGame?.state?.teamId === 'betis' && window.__pcfGame?.state?.currentWeek === 7, null, { timeout: 15000 });
  const finalState = await page.evaluate(() => ({
    screen: window.__pcfGame.state.currentScreen,
    teamId: window.__pcfGame.state.teamId,
    week: window.__pcfGame.state.currentWeek,
    season: window.__pcfGame.state.currentSeason,
    money: window.__pcfGame.state.money,
    futureFixtures: window.__pcfGame.state.fixtures?.length,
  }));
  const screenshot = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });
  await browser.close();
  return {
    name,
    screenshot,
    errors,
    savedSummary: savedBeforeReload.summary,
    savedState: { teamId: savedBeforeReload.state.teamId, week: savedBeforeReload.state.currentWeek, strippedHeavy: !('leagueTeams' in savedBeforeReload.state) && !('otherLeagues' in savedBeforeReload.state), fixtures: savedBeforeReload.state.fixtures?.length },
    menuInfo: { screen: menuInfo.screen, storageExists: menuInfo.storageExists, gameStarted: menuInfo.gameStarted },
    hasContinuePrompt,
    finalState,
  };
}

const results = [
  await run({ width: 1365, height: 768 }, 'desktop'),
  await run({ width: 390, height: 844 }, 'mobile', true),
];
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
