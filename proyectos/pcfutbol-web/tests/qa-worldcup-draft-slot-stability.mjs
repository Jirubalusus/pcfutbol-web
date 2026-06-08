import { chromium, devices } from 'playwright';

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:4202/?qa=worldcup-draft-slot-stability';

async function openDraftBoard(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const k of await caches.keys()) await caches.delete(k);
    localStorage.setItem('language', 'es');
  }).catch(() => {});
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=MUNDIAL DRAFT', { timeout: 25000 });
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const activeWorldCup = () => [...document.querySelectorAll('button')]
      .find((button) => /MUNDIAL DRAFT/i.test(button.innerText || '') && /active/.test(String(button.className || '')));
    const next = [...document.querySelectorAll('button')]
      .find((button) => /^Siguiente$/i.test((button.innerText || '').trim()));
    for (let i = 0; i < 6 && !activeWorldCup(); i += 1) {
      next?.click();
      await wait(220);
    }
    (activeWorldCup() || [...document.querySelectorAll('button')].find((b) => /MUNDIAL DRAFT/i.test(b.innerText || '')))?.click();
  });
  await page.waitForSelector('text=EMPEZAR DRAFT', { timeout: 25000 });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find((b) => /EMPEZAR DRAFT/i.test(b.innerText || ''));
    return button && !button.disabled;
  }, null, { timeout: 60000 });
  await page.getByRole('button', { name: /EMPEZAR DRAFT/i }).click();
  await page.waitForSelector('[data-draft-slot]', { timeout: 25000 });
}

function center(rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

async function ringMetrics(page, slot) {
  const ring = slot.locator('.worldcup-draft__slot-badge');
  const box = await ring.boundingBox();
  if (!box) throw new Error('No se encontró un aro visible del Mundial Draft');
  const details = await slot.evaluate((element) => {
    const slotRect = element.getBoundingClientRect();
    const badge = element.querySelector('.worldcup-draft__slot-badge');
    const badgeRect = badge?.getBoundingClientRect();
    const slotStyle = getComputedStyle(element);
    const badgeStyle = badge ? getComputedStyle(badge) : null;
    return {
      slot: {
        left: slotRect.left,
        top: slotRect.top,
        width: slotRect.width,
        height: slotRect.height,
        transform: slotStyle.transform,
      },
      badge: badgeRect ? {
        left: badgeRect.left,
        top: badgeRect.top,
        width: badgeRect.width,
        height: badgeRect.height,
        transform: badgeStyle?.transform || '',
        animationName: badgeStyle?.animationName || '',
      } : null,
    };
  });
  return { box, center: center(box), details };
}

async function forcePseudo(page, slot, forcedPseudoClasses) {
  const marker = `slot-stability-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await slot.evaluate((element, value) => element.setAttribute('data-qa-force-active', value), marker);
  const client = await page.context().newCDPSession(page);
  const { root } = await client.send('DOM.getDocument');
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: `[data-qa-force-active="${marker}"]`,
  });
  await client.send('CSS.enable');
  await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses });
  return async () => {
    await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }).catch(() => {});
    await client.detach().catch(() => {});
    await slot.evaluate((element) => element.removeAttribute('data-qa-force-active')).catch(() => {});
  };
}

function delta(before, after) {
  return {
    dx: Math.abs(after.center.x - before.center.x),
    dy: Math.abs(after.center.y - before.center.y),
  };
}

async function assertSlotStableOnTouch(page, label, index = 0) {
  const slot = page.locator(`[data-draft-slot="${label}"][data-slot-filled="false"]`).nth(index);
  await slot.waitFor({ state: 'visible', timeout: 10000 });
  await slot.scrollIntoViewIfNeeded();
  await page.waitForTimeout(60);

  const before = await ringMetrics(page, slot);
  const releaseActive = await forcePseudo(page, slot, ['active']);
  await page.waitForTimeout(60);
  const forcedActive = await ringMetrics(page, slot);
  await releaseActive();

  await slot.tap({ timeout: 10000 });
  await page.waitForSelector('[data-draft-card-picker]', { timeout: 25000 });
  await page.waitForTimeout(180);
  const afterPicker = await ringMetrics(page, slot);
  await page.getByRole('button', { name: /cerrar selector/i }).click();
  await page.waitForSelector('[data-draft-card-picker]', { state: 'detached', timeout: 10000 });

  return {
    label,
    index,
    before,
    forcedActive,
    afterPicker,
    activeDelta: delta(before, forcedActive),
    pickerDelta: delta(before, afterPicker),
  };
}

const pageErrors = [];
const browser = await chromium.launch({ headless: true });

const mobile = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const mobilePage = await mobile.newPage();
mobilePage.on('pageerror', (err) => pageErrors.push(err.message));
await openDraftBoard(mobilePage);

const slotResults = [];
for (const target of [
  { label: 'LB' },
  { label: 'CB', index: 0 },
  { label: 'CB', index: 1 },
  { label: 'RB' },
  { label: 'GK' },
]) {
  slotResults.push(await assertSlotStableOnTouch(mobilePage, target.label, target.index || 0));
}

await mobilePage.screenshot({ path: 'tmp/worldcup-draft-slot-stability-mobile.png', fullPage: true });
const mobileMetrics = await mobilePage.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
await mobile.close();
await browser.close();

const failed = [];
for (const result of slotResults) {
  const name = `${result.label}${result.label === 'CB' ? `[${result.index}]` : ''}`;
  if (result.activeDelta.dx > 1 || result.activeDelta.dy > 1) {
    failed.push(`${name}: centro durante :active se movió ${result.activeDelta.dx.toFixed(2)}px/${result.activeDelta.dy.toFixed(2)}px`);
  }
  if (result.pickerDelta.dx > 1 || result.pickerDelta.dy > 1) {
    failed.push(`${name}: centro tras abrir picker se movió ${result.pickerDelta.dx.toFixed(2)}px/${result.pickerDelta.dy.toFixed(2)}px`);
  }
}
if (mobileMetrics.scrollWidth > mobileMetrics.clientWidth + 2) failed.push(`overflow horizontal móvil ${mobileMetrics.scrollWidth}/${mobileMetrics.clientWidth}`);
if (pageErrors.length) failed.push(`page errors: ${pageErrors.join(' | ')}`);

console.log(JSON.stringify({ slotResults, mobileMetrics, screenshot: 'tmp/worldcup-draft-slot-stability-mobile.png', failed }, null, 2));
if (failed.length) process.exit(1);
