#!/usr/bin/env node
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 5207);
const BASE_URL = process.env.PCG_QA_BASE_URL || `http://127.0.0.1:${PORT}/?qa=i18n-main-glory-${Date.now()}`;
const OUT_DIR = path.join(ROOT, 'artifacts/qa-i18n-main-glory-20260603');
fs.mkdirSync(OUT_DIR, { recursive: true });

const EN_FORBIDDEN = [
  'Base de datos', 'Cambiar temporada', 'Temporada histórica', 'Temporada actual',
  'Se aplicará', 'Camino a la Gloria', 'Modo Mundial', 'Próximamente',
  'Crea tu club', 'Sin partida activa', 'Nuevo proyecto', 'Iniciar Camino',
  'Ver vitrina', 'Ascensos', 'Cartas únicas', 'Meta final', 'cartas desbloqueadas',
  'Las cartas desbloqueadas', 'Volver', 'Vitrina permanente', 'Club propio'
];

const ES_EXPECTED = [
  'Base de datos global', 'Cambiar temporada', 'Temporada',
  'Camino a la Gloria', 'Modo Mundial'
];

const norm = (s) => String(s || '').toLocaleLowerCase('es-ES');
const includesText = (haystack, needle) => norm(haystack).includes(norm(needle));

function startServer() {
  if (process.env.PCG_QA_BASE_URL) return null;
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });
  child.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`));
  return child;
}

async function waitForServer() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE_URL, { cache: 'no-store' });
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server not ready at ${BASE_URL}`);
}

function assert(cond, message, details) {
  if (!cond) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

async function setupPage(browser, lang, viewportName, viewport) {
  const context = await browser.newContext({
    ...viewport,
    locale: lang === 'en' ? 'en-US' : 'es-ES',
  });
  await context.addInitScript((lng) => {
    localStorage.setItem('language', lng);
    localStorage.setItem('pcfutbol-theme', 'dark');
  }, lang);
  const page = await context.newPage();
  const messages = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') messages.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));
  await page.goto(BASE_URL, { waitUntil: 'commit', timeout: 60000 });
  await page.waitForSelector('.main-menu', { timeout: 45000 });
  await page.waitForFunction(() => window.__pcfAuth?.loginAsGuest, null, { timeout: 30000 });
  await page.evaluate(async () => {
    window.__pcfAuth.loginAsGuest();
  });
  await page.waitForSelector('.main-menu__database-selector', { timeout: 15000 });
  await page.waitForTimeout(250);
  return { context, page, messages, lang, viewportName };
}

async function captureFlow(browser, lang, viewportName, viewport) {
  const qa = await setupPage(browser, lang, viewportName, viewport);
  const { page, context, messages } = qa;
  const prefix = `${lang}-${viewportName}`;

  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText,
  }));
  assert(metrics.scrollWidth <= metrics.width + 2, `${prefix}: horizontal overflow on main menu`, metrics);

  if (lang === 'en') {
    const hits = EN_FORBIDDEN.filter(term => includesText(metrics.bodyText, term));
    assert(hits.length === 0, `${prefix}: Spanish text still visible on authenticated main menu`, { hits, text: metrics.bodyText });
    for (const required of ['Global database', 'Change season', 'season', 'Road to Glory', 'World Cup Mode', 'Coming soon']) {
      assert(includesText(metrics.bodyText, required), `${prefix}: expected English copy missing on main menu: ${required}`, metrics.bodyText);
    }
  } else {
    for (const required of ES_EXPECTED) {
      assert(includesText(metrics.bodyText, required), `${prefix}: expected Spanish copy missing on main menu: ${required}`, metrics.bodyText);
    }
  }

  await page.screenshot({ path: path.join(OUT_DIR, `${prefix}-main-menu.png`), fullPage: true });

  const gloryText = lang === 'en' ? 'Road to Glory' : 'Camino a la Gloria';
  await page.getByText(gloryText, { exact: true }).click();
  await page.waitForSelector('.glory-menu', { timeout: 20000 });
  await page.waitForTimeout(300);
  const gloryMetrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText,
  }));
  assert(gloryMetrics.scrollWidth <= gloryMetrics.width + 2, `${prefix}: horizontal overflow on glory menu`, gloryMetrics);
  if (lang === 'en') {
    const hits = EN_FORBIDDEN.filter(term => includesText(gloryMetrics.bodyText, term));
    assert(hits.length === 0, `${prefix}: Spanish text still visible on Glory menu`, { hits, text: gloryMetrics.bodyText });
    for (const required of ['Create your club', 'No active save', 'Start Road', 'Showcase']) {
      assert(includesText(gloryMetrics.bodyText, required), `${prefix}: expected English copy missing on Glory menu: ${required}`, gloryMetrics.bodyText);
    }
  } else {
    for (const required of ['Crea tu club', 'Sin partida activa', 'Iniciar Camino', 'Ver vitrina']) {
      assert(includesText(gloryMetrics.bodyText, required), `${prefix}: expected Spanish copy missing on Glory menu: ${required}`, gloryMetrics.bodyText);
    }
  }
  await page.screenshot({ path: path.join(OUT_DIR, `${prefix}-glory-menu.png`), fullPage: true });

  const actionableMessages = messages.filter(m =>
    !m.includes('auth/unauthorized-domain')
    && !m.includes('current domain is not authorized')
    && !m.includes('Missing or insufficient permissions')
    && !m.includes('Error loading glory data')
  );
  assert(actionableMessages.length === 0, `${prefix}: console warnings/errors`, messages);
  await context.close();

  return {
    prefix,
    mainTextSample: metrics.bodyText.slice(0, 500),
    gloryTextSample: gloryMetrics.bodyText.slice(0, 700),
    screenshots: [`${prefix}-main-menu.png`, `${prefix}-glory-menu.png`],
    messages,
  };
}

const server = startServer();
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const desktop = { viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 };
  const mobile = devices['Pixel 7'];
  const results = [];
  for (const lang of ['en', 'es']) {
    results.push(await captureFlow(browser, lang, 'desktop', desktop));
    results.push(await captureFlow(browser, lang, 'mobile', mobile));
  }
  await browser.close();
  browser = null;
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));
  console.log(`QA i18n main/glory passed. Artifacts: ${OUT_DIR}`);
} catch (error) {
  console.error(`QA i18n main/glory failed: ${error.message}`);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
} finally {
  if (browser) {
    try { await browser.close(); } catch {}
  }
  if (server) {
    try { server.kill('SIGTERM'); } catch {}
  }
}
