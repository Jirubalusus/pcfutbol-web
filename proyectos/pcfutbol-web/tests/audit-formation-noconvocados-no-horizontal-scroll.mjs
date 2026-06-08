import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

const PORT = Number(process.env.PORT || 5195);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=formation-noconvocados-no-horizontal-scroll`;

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

const positions = ['GK', 'RB', 'CB', 'CB', 'LB', 'CM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'MC', 'MCO', 'DC', 'MCO', 'MC', 'DC', 'MCO'];
const names = [
  'Portero Titular', 'Lateral Derecho', 'Central Uno', 'Central Dos', 'Lateral Izquierdo',
  'Medio Centro Uno', 'Medio Centro Dos', 'Mediapunta', 'Extremo Derecho', 'Extremo Izquierdo', 'Delantero Centro',
  'Fabián Ruiz', 'Álex Alegría', 'Álvaro Cejudo', 'Carlos García', 'Chuli', 'Nombre Muy Largo No Convocado Para Probar Elipsis', 'Otro Jugador Largo'
];
const players = names.map((name, index) => ({
  id: `p-${index + 1}`,
  name,
  number: index + 1,
  age: 24,
  position: positions[index] || 'MC',
  overall: 61 + (index % 23),
  pace: 60,
  shooting: 60,
  passing: 60,
  defense: 60,
  physical: 60,
}));

const lineupSlots = ['GK', 'RB', 'CB1', 'CB2', 'LB', 'CM1', 'CDM', 'CM2', 'RW', 'ST', 'LW'];
const lineup = Object.fromEntries(lineupSlots.map((slot, index) => [slot, players[index].name]));
const convocados = players.slice(11, 13).map(p => p.name);

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
const page = await context.newPage();

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 10000 });

  await page.evaluate(async ({ players, lineup, convocados }) => {
    const team = {
      id: 'qa-team',
      name: 'QA FC',
      budget: 1000000,
      players,
    };
    window.__pcfGame.dispatch({
      type: 'LOAD_SAVE',
      payload: {
        loaded: true,
        gameStarted: true,
        currentScreen: 'office',
        gameMode: 'career',
        teamId: team.id,
        team,
        leagueId: 'laliga',
        playerLeagueId: 'laliga',
        currentSeason: 2025,
        currentWeek: 1,
        money: team.budget,
        formation: '4-3-3',
        tactic: 'balanced',
        lineup,
        convocados,
        fixtures: [],
        leagueTable: [{ teamId: team.id, teamName: team.name, played: 0, points: 0 }],
        settings: { cityMode3D: false },
        _cityBypass: true,
      }
    });
    await new Promise(resolve => setTimeout(resolve, 150));
    window.__pcfGame.dispatch({ type: 'SET_OFFICE_TAB', payload: 'formation' });
    await new Promise(resolve => setTimeout(resolve, 350));
  }, { players, lineup, convocados });

  try {
    await page.waitForSelector('.pcf-table--noconvocados .table-body--scroll .table-row.noconvocados', { timeout: 15000 });
  } catch (waitError) {
    const debug = await page.evaluate(() => ({
      href: location.href,
      state: window.__pcfGame?.state,
      text: document.body.innerText.slice(0, 1200),
      classes: [...document.querySelectorAll('[class]')].slice(0, 80).map(el => el.className),
      noConvCount: document.querySelectorAll('.table-row.noconvocados').length,
      formationExists: !!document.querySelector('.pcf-formation'),
      officeExists: !!document.querySelector('.office'),
    }));
    waitError.details = debug;
    throw waitError;
  }
  await page.waitForTimeout(150);

  const before = await page.evaluate(() => {
    const table = document.querySelector('.pcf-table--noconvocados');
    const body = document.querySelector('.pcf-table--noconvocados .table-body--scroll');
    const rows = [...document.querySelectorAll('.pcf-table--noconvocados .table-row.noconvocados')];
    const bodyStyle = getComputedStyle(body);
    const tableRect = table.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const rowMetrics = rows.map(row => {
      const rect = row.getBoundingClientRect();
      return {
        text: row.innerText,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        clientWidth: row.clientWidth,
        scrollWidth: row.scrollWidth,
      };
    });
    return {
      viewportWidth: innerWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      tableClientWidth: table.clientWidth,
      tableScrollWidth: table.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyOverflowX: bodyStyle.overflowX,
      bodyOverflowY: bodyStyle.overflowY,
      bodyScrollLeft: body.scrollLeft,
      tableLeft: tableRect.left,
      tableRight: tableRect.right,
      bodyLeft: bodyRect.left,
      bodyRight: bodyRect.right,
      rows: rowMetrics,
    };
  });

  await page.mouse.wheel(700, 0);
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => ({
    docScrollLeft: document.documentElement.scrollLeft,
    windowScrollX: window.scrollX,
    noConvocadosScrollLeft: document.querySelector('.pcf-table--noconvocados .table-body--scroll')?.scrollLeft ?? null,
  }));

  const overflowingRows = before.rows.filter(row => row.scrollWidth > row.clientWidth + 1 || row.right > before.bodyRight + 1 || row.left < before.bodyLeft - 1);

  assert(before.bodyOverflowX === 'hidden', 'No convocados body must not expose horizontal scrolling', { before, after });
  assert(before.docScrollWidth <= before.viewportWidth + 1 && before.bodyScrollWidth <= before.viewportWidth + 1, 'Document has horizontal overflow on Formation mobile screen', { before, after });
  assert(before.tableScrollWidth <= before.tableClientWidth + 1, 'No convocados table is wider than its viewport', { before, after });
  assert(before.bodyScrollWidth <= before.bodyClientWidth + 1, 'No convocados list content is horizontally wider than the scroll body', { before, after });
  assert(overflowingRows.length === 0, 'One or more no-convocados rows overflow horizontally', { overflowingRows, before, after });
  assert(after.windowScrollX === 0 && after.docScrollLeft === 0 && after.noConvocadosScrollLeft === 0, 'Horizontal gesture moved the document/list', { before, after });

  console.log(JSON.stringify({ ok: true, before, after }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
