import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

const PORT = Number(process.env.PORT || 5196);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=spanish-racing-santander-identity`;

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

const leagueTable = [
  { teamId: 'fc-barcelona', teamName: 'FC Barcelona', played: 4, won: 4, drawn: 0, lost: 0, goalsFor: 12, goalsAgainst: 3, goalDifference: 9, points: 12 },
  // Legacy/broken save shape: Spanish table row got the Argentine Racing label/id.
  { teamId: 'racing-club', teamName: 'Racing Club', played: 4, won: 2, drawn: 1, lost: 1, goalsFor: 7, goalsAgainst: 5, goalDifference: 2, points: 7 },
  { teamId: 'athletic-club', teamName: 'Athletic Club', played: 4, won: 2, drawn: 0, lost: 2, goalsFor: 5, goalsAgainst: 5, goalDifference: 0, points: 6 },
  { teamId: 'qa-team', teamName: 'QA FC', played: 4, won: 1, drawn: 1, lost: 2, goalsFor: 4, goalsAgainst: 7, goalDifference: -3, points: 4, isPlayer: true }
];

const players = Array.from({ length: 18 }, (_, index) => ({
  id: `p-${index + 1}`,
  name: `QA Player ${index + 1}`,
  number: index + 1,
  age: 24,
  position: index === 0 ? 'GK' : 'CM',
  overall: 70,
  pace: 60,
  shooting: 60,
  passing: 60,
  defense: 60,
  physical: 60,
  salary: 10000,
}));

const badAvellanedaSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Avellaneda sentinel</title><rect width="20" height="20" fill="#5db6e8"/><text x="2" y="12" font-size="5">AV</text></svg>'
);

const server = await createServer({
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  logLevel: 'error',
});

await server.listen();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});

await context.addInitScript(({ badAvellanedaSvg }) => {
  localStorage.setItem('pcgaffer_active_edition', 'competicion_2025_26');
  localStorage.setItem('pcgaffer_edition_assets_competicion_2025_26', JSON.stringify({
    version: 2,
    savedAt: Date.now(),
    assets: [{
      id: 'racing-club',
      teamKey: 'racing-club',
      teamId: 'racing-club',
      teamName: 'Racing Club',
      assetType: 'crest',
      variant: 'official',
      downloadUrl: badAvellanedaSvg,
      status: 'active'
    }]
  }));
}, { badAvellanedaSvg });

const page = await context.newPage();

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 10000 });

  await page.evaluate(async ({ leagueTable, players }) => {
    window.__pcfGame.dispatch({
      type: 'LOAD_SAVE',
      payload: {
        loaded: true,
        gameStarted: true,
        currentScreen: 'office',
        gameMode: 'career',
        teamId: 'qa-team',
        team: { id: 'qa-team', name: 'QA FC', budget: 1000000, players },
        leagueId: 'laliga',
        playerLeagueId: 'laliga',
        currentSeason: 2025,
        currentWeek: 1,
        money: 1000000,
        formation: '4-3-3',
        tactic: 'balanced',
        lineup: {},
        convocados: [],
        fixtures: [],
        leagueTable,
        settings: { cityMode3D: false },
        _cityBypass: true,
      }
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    window.__pcfGame.dispatch({ type: 'SET_OFFICE_TAB', payload: 'competitions' });
    await new Promise(resolve => setTimeout(resolve, 500));
  }, { leagueTable, players });

  await page.waitForSelector('.league-table-v2 .table-row', { timeout: 15000 });
  await page.waitForTimeout(400);

  const result = await page.evaluate((badAvellanedaSvg) => {
    const rows = [...document.querySelectorAll('.league-table-v2 .table-body .table-row')].map(row => ({
      text: row.innerText,
      imgAlt: row.querySelector('img.team-crest')?.getAttribute('alt') || null,
      imgSrc: row.querySelector('img.team-crest')?.getAttribute('src') || null,
      svgLabel: row.querySelector('svg.team-crest')?.getAttribute('aria-label') || null,
    }));
    const stateRacingRow = window.__pcfGame?.state?.leagueTable?.find(row => row.teamId === 'racing-club' || row.teamName?.includes('Racing'));
    return {
      rows,
      stateRacingRow,
      bodyText: document.body.innerText,
      usedBadAvellanedaAsset: rows.some(row => row.imgSrc === badAvellanedaSvg),
      badAvellanedaSvg
    };
  }, badAvellanedaSvg);

  const racingRows = result.rows.filter(row => /Racing/.test(row.text));

  assert(result.stateRacingRow?.teamName === 'Real Racing Club', 'Loaded Spanish league table was not migrated to Real Racing Club', result);
  assert(racingRows.length >= 1, 'Racing row not visible in league table', result);
  assert(racingRows.every(row => row.text.includes('Real Racing Club')), 'Spanish league table still displays Racing Club instead of Real Racing Club', result);
  assert(!result.bodyText.split('\n').some(line => line.trim() === 'Racing Club'), 'Page body still contains the ambiguous Racing Club label as a standalone team name', result);
  assert(!result.usedBadAvellanedaAsset, 'Spanish Racing row used the cached Avellaneda crest asset', result);

  console.log(JSON.stringify({ ok: true, racingRows, stateRacingRow: result.stateRacingRow }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
