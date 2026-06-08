import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

const PORT = Number(process.env.PORT || 5198);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=seasonend-preseason-mobile-layout`;

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
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 10000 });

  await page.evaluate(async () => {
    await import('/src/components/SeasonEnd/SeasonEnd.jsx');

    const longOpponents = [
      'Aalborg Boldspilklub Historico',
      'Borussia Monchengladbach Reservas',
      'Club Deportivo Universidad Nacional',
      'Ferencvarosi Torna Club Internacional',
      'Real Club Deportivo de la Coruna',
    ];

    const root = document.createElement('div');
    root.className = 'season-end season-end--preseason';
    root.innerHTML = `
      <div class="season-end__modal season-end__modal--preseason preseason-page">
        <div class="preseason-page__hero">
          <div class="preseason-page__eyebrow">
            <svg width="18" height="18" viewBox="0 0 24 24"></svg>
            <span>Planificacion de pretemporada</span>
          </div>
          <div class="preseason-page__title-row">
            <div>
              <h1>Temporada 2028</h1>
              <p>Selecciona una gira completa de 5 partidos o salta directamente al inicio de liga.</p>
            </div>
            <div class="preseason-page__team-card">
              <span>Equipo</span>
              <strong>Aalborg Boldspilklub de Contrarreloj Internacional</strong>
              <small>78 REP</small>
            </div>
          </div>
        </div>
        <div class="preseason-options">
          ${Array.from({ length: 3 }, (_, cardIndex) => `
            <div class="preseason-card${cardIndex === 0 ? ' selected' : ''}">
              <div class="card-header">
                <div class="tour-icon"></div>
                <div>
                  <span class="tour-kicker">Gira internacional</span>
                  <h3>Ruta compacta ${cardIndex + 1}</h3>
                </div>
              </div>
              <p class="card-description">Cinco amistosos con rivales variados y nombres largos para detectar desbordes horizontales.</p>
              <div class="tour-metrics">
                <span><strong>72-79</strong> OVR rivales</span>
                <span><strong>Controlada</strong> dificultad</span>
                <span><strong>EUR 1.2M</strong> taquilla</span>
              </div>
              <div class="matches-preview">
                <ul>
                  ${longOpponents.map((name, i) => `
                    <li>
                      <span class="match-location">${i % 2 ? 'Casa' : 'Fuera'}</span>
                      <span class="opponent-name">${name}</span>
                      <span class="opponent-ovr difficulty--medium">${72 + i} OVR</span>
                      ${i === 0 ? '<span class="presentation-badge">Presentacion</span>' : ''}
                    </li>`).join('')}
                </ul>
              </div>
            </div>`).join('')}
        </div>
        <div class="preseason-actions">
          <button class="btn-back">Volver</button>
          <button class="btn-skip">Saltar pretemporada</button>
          <button class="btn-confirm">Comenzar Pretemporada</button>
        </div>
      </div>`;
    document.body.appendChild(root);
  });

  await page.waitForSelector('.season-end--preseason .preseason-actions', { timeout: 10000 });
  await page.waitForTimeout(150);

  const before = await page.evaluate(() => {
    const root = document.querySelector('.season-end--preseason');
    const modal = document.querySelector('.season-end__modal--preseason.preseason-page');
    const team = document.querySelector('.preseason-page__team-card');
    const confirm = document.querySelector('.preseason-actions .btn-confirm');
    const actions = document.querySelector('.preseason-actions');
    const elements = [...root.querySelectorAll('*')].map((el) => {
      const r = el.getBoundingClientRect();
      return { className: el.className?.toString() || el.tagName, left: r.left, right: r.right, width: r.width };
    });
    const overflowers = elements.filter((item) => item.right > innerWidth + 1 || item.left < -1);
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    return {
      innerWidth,
      innerHeight,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      modalScrollWidth: modal.scrollWidth,
      modalClientWidth: modal.clientWidth,
      root: rect(root),
      modal: rect(modal),
      team: rect(team),
      actions: rect(actions),
      confirm: rect(confirm),
      overflowers,
    };
  });

  assert(before.bodyScrollWidth <= before.innerWidth + 1, 'Body has horizontal overflow on 390px mobile', before);
  assert(before.docScrollWidth <= before.innerWidth + 1, 'Document has horizontal overflow on 390px mobile', before);
  assert(before.modalScrollWidth <= before.modalClientWidth + 1, 'SeasonEnd preseason modal has internal horizontal overflow', before);
  assert(before.modal.left >= -1 && before.modal.right <= before.innerWidth + 1, 'Preseason modal is clipped outside viewport', before);
  assert(before.team.left >= 0 && before.team.right <= before.innerWidth, 'Team card is clipped outside viewport', before);
  assert(before.confirm.left >= 0 && before.confirm.right <= before.innerWidth && before.confirm.bottom <= before.innerHeight, 'Primary preseason CTA is not reachable in the viewport', before);
  assert(before.overflowers.length === 0, 'Preseason descendants overflow the mobile viewport', before);

  await page.evaluate(() => {
    const root = document.querySelector('.season-end--preseason');
    root.scrollTop = root.scrollHeight;
  });
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => {
    const confirm = document.querySelector('.preseason-actions .btn-confirm');
    const team = document.querySelector('.preseason-page__team-card');
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height };
    };
    return {
      innerWidth,
      innerHeight,
      bodyScrollWidth: document.body.scrollWidth,
      docScrollWidth: document.documentElement.scrollWidth,
      team: rect(team),
      confirm: rect(confirm),
    };
  });

  assert(after.bodyScrollWidth <= after.innerWidth + 1 && after.docScrollWidth <= after.innerWidth + 1, 'Horizontal overflow appears after scrolling preseason page', after);
  assert(after.confirm.left >= 0 && after.confirm.right <= after.innerWidth && after.confirm.bottom <= after.innerHeight, 'Primary preseason CTA leaves the viewport after scrolling', after);

  console.log(JSON.stringify({ ok: true, before, after }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
