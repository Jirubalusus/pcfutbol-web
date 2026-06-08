import { chromium, devices } from 'playwright';
import { createServer } from 'vite';

const PORT = Number(process.env.PORT || 5194);
const BASE_URL = `http://127.0.0.1:${PORT}/?qa=preseason-single-scroll`;

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
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 10000 });
  await page.evaluate(async () => {
    window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: 'team_selection' });
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
  await page.waitForSelector('.pcf-team-select', { timeout: 15000 });

  await page.evaluate(() => {
    document.documentElement.classList.add('preseason-modal-open');
    document.body.classList.add('preseason-modal-open');
    const overlay = document.createElement('div');
    overlay.className = 'preseason-modal-overlay';
    overlay.innerHTML = `
      <div class="preseason-modal preseason-page">
        <div class="preseason-page__hero"><h1>Planificacion de pretemporada</h1></div>
        <div class="preseason-options">
          ${Array.from({ length: 3 }, (_, cardIndex) => `
            <div class="preseason-card">
              <div class="card-header"><h3>Gira ${cardIndex + 1}</h3></div>
              <p class="card-description">Contenido alto para forzar scroll de una sola pagina.</p>
              <div class="tour-metrics"><span><strong>72-79</strong> OVR rivales</span></div>
              <div class="matches-preview"><ul>
                ${Array.from({ length: 5 }, (_, i) => `<li><span class="match-location">Fuera</span><span class="opponent-name">Rival ${i + 1}</span><span class="opponent-ovr">${72 + i} OVR</span></li>`).join('')}
              </ul></div>
            </div>`).join('')}
        </div>
        <div class="preseason-actions">
          <button class="btn-back">Volver</button>
          <button class="btn-skip">Saltar pretemporada</button>
          <button class="btn-confirm">Comenzar Pretemporada</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  });

  await page.waitForSelector('.preseason-modal-overlay .preseason-actions', { timeout: 10000 });
  await page.waitForTimeout(100);

  const before = await page.evaluate(() => {
    const overlay = document.querySelector('.preseason-modal-overlay');
    const modal = document.querySelector('.preseason-modal');
    const actions = document.querySelector('.preseason-actions');
    const overlayStyle = getComputedStyle(overlay);
    const modalStyle = getComputedStyle(modal);
    const actionsStyle = getComputedStyle(actions);
    return {
      innerHeight,
      bodyScrollHeight: document.body.scrollHeight,
      bodyClientHeight: document.body.clientHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      docClientHeight: document.documentElement.clientHeight,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      docOverflowY: getComputedStyle(document.documentElement).overflowY,
      overlayOverflowY: overlayStyle.overflowY,
      overlayScrollHeight: overlay.scrollHeight,
      overlayClientHeight: overlay.clientHeight,
      overlayTop: overlay.getBoundingClientRect().top,
      overlayBottom: overlay.getBoundingClientRect().bottom,
      modalOverflowY: modalStyle.overflowY,
      modalScrollHeight: modal.scrollHeight,
      modalClientHeight: modal.clientHeight,
      actionsPosition: actionsStyle.position,
      actionsBottom: actions.getBoundingClientRect().bottom,
    };
  });

  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => ({
    bodyScrollTop: document.body.scrollTop,
    docScrollTop: document.documentElement.scrollTop,
    overlayScrollTop: document.querySelector('.preseason-modal-overlay').scrollTop,
    modalScrollTop: document.querySelector('.preseason-modal').scrollTop,
  }));

  assert(before.bodyOverflowY === 'hidden' && before.docOverflowY === 'hidden', 'Background document must be locked while preseason modal is open', { before });
  assert(before.overlayOverflowY === 'auto' || before.overlayOverflowY === 'scroll', 'Overlay must be the only vertical scroll container', { before });
  assert(before.modalOverflowY === 'visible', 'Modal content must not create a nested scrollbar', { before });
  assert(before.overlayScrollHeight > before.overlayClientHeight, 'Overlay should own the needed scroll area', { before });
  assert(before.modalScrollHeight <= before.modalClientHeight + 1 || before.modalOverflowY === 'visible', 'Modal should not be independently scrollable', { before });
  assert(after.bodyScrollTop === 0 && after.docScrollTop === 0, 'Background page scrolled behind modal', { before, after });
  assert(after.overlayScrollTop > 0, 'Overlay did not scroll', { before, after });
  assert(after.modalScrollTop === 0, 'Nested modal scrolled; double scroll is back', { before, after });

  console.log(JSON.stringify({ ok: true, before, after }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
