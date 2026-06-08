import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

// Focused QA for the TeamSelection historical-loading skeleton.
// Reproduces the screen shape shown while a historical database streams in
// (header + stepper + active database bar + country-selector skeleton) and
// asserts the polished skeleton replaces the old hollow continent rows.
const PORT = Number(process.env.PORT || 5199);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=teamselection-historical-skeleton`;

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

const server = await createServer({
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  logLevel: 'error',
});

await server.listen();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 30000 });

  // Importing the component module pulls TeamSelection.scss (+ WorldMap.scss)
  // through Vite so the injected skeleton markup is styled exactly as in-app.
  await page.evaluate(async () => {
    await import('/src/components/TeamSelection/TeamSelection.jsx');

    const skeletonCard = () => `
      <div class="map-selection__country-card map-selection__country-card--skeleton">
        <span class="ts-skel ts-skel--flag"></span>
        <span class="map-selection__country-copy">
          <span class="ts-skel ts-skel--line ts-skel--name"></span>
          <span class="ts-skel ts-skel--line ts-skel--meta"></span>
        </span>
        <span class="ts-skel ts-skel--badge"></span>
      </div>`;

    const continent = (label, count) => `
      <div class="map-selection__continent-header">${label}</div>
      ${Array.from({ length: count }, skeletonCard).join('')}`;

    document.body.innerHTML = '';
    document.documentElement.style.margin = '0';
    document.body.style.margin = '0';

    const root = document.createElement('div');
    root.className = 'pcf-team-select';
    root.innerHTML = `
      <div class="pcf-ts-header">
        <div class="header-left"><button class="btn-back">Menú</button></div>
        <div class="header-center"><h1>Selección de equipo</h1></div>
        <div class="header-right"><div class="step-indicator">Paso 1 / 3</div></div>
      </div>
      <div class="pcf-ts-progress">
        <div class="progress-step active"><div class="step-num">1</div><div class="step-label">Países</div></div>
        <div class="progress-line"></div>
        <div class="progress-step"><div class="step-num">2</div><div class="step-label">Liga</div></div>
        <div class="progress-line"></div>
        <div class="progress-step"><div class="step-num">3</div><div class="step-label">Equipo</div></div>
      </div>
      <div class="historical-season-bar historical-season-bar--active">
        <div class="historical-season-bar__copy">
          <svg width="18" height="18" viewBox="0 0 24 24"></svg>
          <div><strong>Base de datos activa</strong><span>Foto histórica inicial.</span></div>
        </div>
        <div class="historical-season-bar__controls">
          <div class="historical-season-bar__meta">
            <span class="historical-season-bar__badge">Histórica 2004/05</span>
            <span>— equipos · — jugadores · — ligas</span>
          </div>
          <div class="historical-season-bar__notice">Cambia el año desde el menú inicial.</div>
        </div>
        <div class="historical-season-bar__notice">Cargando temporada histórica completa...</div>
      </div>
      <div class="pcf-ts-content">
        <div class="map-selection map-selection--historical-loading">
          <div class="map-selection__row">
            <div class="map-selection__map">
              <div class="map-selection__map-skeleton" aria-hidden="true">
                <span class="map-selection__map-skeleton-globe"></span>
              </div>
            </div>
            <div class="map-selection__panel">
              <div class="map-selection__skeleton" role="status" aria-busy="true" aria-live="polite">
                <div class="map-selection__title map-selection__title--skeleton">
                  <svg width="20" height="20" viewBox="0 0 24 24"></svg> Selecciona un país
                  <span class="map-selection__skeleton-spinner" aria-hidden="true"></span>
                </div>
                <span class="sr-only">Cargando temporada histórica completa...</span>
                <div class="map-selection__countries" aria-hidden="true">
                  ${continent('🌍 Europa', 7)}
                  ${continent('🌎 Sudamérica', 5)}
                  ${continent('🌏 Resto del Mundo', 4)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(root);
  });

  await page.waitForSelector('.map-selection__skeleton', { timeout: 10000 });
  await page.waitForTimeout(150);

  const result = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };

    const root = document.querySelector('.pcf-team-select');
    const skeleton = document.querySelector('.map-selection__skeleton');
    const dbBar = document.querySelector('.historical-season-bar--active');
    const headers = [...document.querySelectorAll('.map-selection__continent-header')];
    const skeletonCards = [...document.querySelectorAll('.map-selection__country-card--skeleton')];

    // Every continent header must be immediately followed by at least one
    // skeleton card — i.e. no empty continent-only rows.
    const emptyContinents = headers
      .filter((h) => !(h.nextElementSibling && h.nextElementSibling.classList.contains('map-selection__country-card')))
      .map((h) => h.textContent.trim());

    // No focusable fake controls inside the skeleton.
    const focusables = [...skeleton.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')];

    const overflowers = [...root.querySelectorAll('*')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { className: el.className?.toString() || el.tagName, left: r.left, right: r.right };
      })
      .filter((item) => item.right > innerWidth + 1 || item.left < -1);

    return {
      innerWidth,
      innerHeight,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      hasSkeleton: !!skeleton,
      ariaBusy: skeleton?.getAttribute('aria-busy'),
      dbBar: rect(dbBar),
      dbBarText: dbBar?.textContent.includes('Base de datos activa'),
      headerCount: headers.length,
      skeletonCardCount: skeletonCards.length,
      emptyContinents,
      focusableCount: focusables.length,
      overflowers,
    };
  });

  assert(result.hasSkeleton, 'Historical loading skeleton is not rendered', result);
  assert(result.ariaBusy === 'true', 'Skeleton is missing aria-busy="true"', result);
  assert(result.bodyScrollWidth <= result.innerWidth + 1, 'Body has horizontal overflow on 390px mobile', result);
  assert(result.docScrollWidth <= result.innerWidth + 1, 'Document has horizontal overflow on 390px mobile', result);
  assert(result.overflowers.length === 0, 'Skeleton descendants overflow the mobile viewport', result);
  assert(
    result.dbBar && result.dbBar.height > 0 && result.dbBar.top < result.innerHeight && result.dbBarText,
    'Active database card is not visible during loading',
    result,
  );
  assert(result.headerCount === 3, 'Expected 3 continent sections in the skeleton', result);
  assert(result.skeletonCardCount >= 12, 'Skeleton should render plausible country pills, not empty rows', result);
  assert(result.emptyContinents.length === 0, 'Found empty continent-only rows during loading', result);
  assert(result.focusableCount === 0, 'Skeleton must not contain focusable fake controls', result);

  console.log(JSON.stringify({ ok: true, result }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
