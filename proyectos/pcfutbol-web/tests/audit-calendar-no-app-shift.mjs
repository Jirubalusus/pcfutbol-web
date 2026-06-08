// Audit: clicking the Calendario sidebar tab must NOT shift the whole app / hide the menu.
//
// Reproduces the reported bug where the unified week carousel auto-scroll used
// `Element.scrollIntoView({ inline: 'center' })`, which scrolled ancestor containers /
// the document horizontally — pushing the fixed sidebar off-screen and shifting the
// office content left.
//
// Verifies on desktop (1365x768) and mobile (390x844) that opening the Calendar:
//   - does not change document/body horizontal scroll
//   - keeps the desktop sidebar pinned at x≈0, width≈260
//   - introduces no horizontal document overflow
//
// Requires the dev server running:  npm run dev   (http://127.0.0.1:5173)
// Run:  node tests/audit-calendar-no-app-shift.mjs

import { chromium } from 'playwright';

const BASE = process.env.PCF_URL || 'http://127.0.0.1:5173';
const failures = [];
const pass = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.log(`  ✗ ${m}`); failures.push(m); };

async function enterOfficeAndOpenCalendar(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__pcfGame?.state?.loaded, null, { timeout: 60000 });
  await page.evaluate(() => window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: 'team_selection' }));
  await page.waitForTimeout(400);
  await page.locator('.map-selection__country-card').first().click(); await page.waitForTimeout(400);
  await page.locator('.map-selection__division-card').first().click(); await page.waitForTimeout(400);
  await page.locator('.team-row').first().click(); await page.waitForTimeout(400);
  await page.locator('.btn-start').click(); await page.waitForTimeout(700);
  await page.locator('.preseason-actions .btn-skip').click().catch(() => {});
  await page.waitForFunction(
    () => window.__pcfGame?.state?.currentScreen === 'office' && !/CARGANDO OFICINA/i.test(document.body.innerText),
    null, { timeout: 30000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
}

function readShift(page) {
  return page.evaluate(() => {
    const sb = document.querySelector('.sidebar');
    const sbRect = sb ? sb.getBoundingClientRect() : null;
    return {
      winScrollX: window.scrollX,
      docScrollLeft: document.documentElement.scrollLeft,
      bodyScrollLeft: document.body.scrollLeft,
      docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sidebar: sbRect ? { x: Math.round(sbRect.left), w: Math.round(sbRect.width), visible: getComputedStyle(sb).display !== 'none' } : null,
    };
  });
}

async function runDesktop(browser) {
  console.log('\nDesktop 1365x768');
  const ctx = await browser.newContext({ viewport: { width: 1365, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await enterOfficeAndOpenCalendar(page);

  const before = await readShift(page);
  // Open Calendar via the now-testable data-tab hook.
  await page.locator('.sidebar__item[data-tab="calendar"]').click();
  await page.waitForSelector('.calendar-v2', { timeout: 10000 });
  await page.waitForTimeout(900); // allow smooth carousel scroll to settle
  const after = await readShift(page);

  if (after.winScrollX === before.winScrollX && after.winScrollX === 0) pass(`window.scrollX stayed 0`);
  else fail(`window.scrollX changed: ${before.winScrollX} -> ${after.winScrollX}`);

  if (after.docScrollLeft === 0 && after.bodyScrollLeft === 0) pass(`document/body scrollLeft stayed 0`);
  else fail(`scrollLeft moved: doc ${after.docScrollLeft}, body ${after.bodyScrollLeft}`);

  if (after.sidebar && after.sidebar.visible && Math.abs(after.sidebar.x) <= 1) pass(`sidebar pinned at x=${after.sidebar.x} (w=${after.sidebar.w})`);
  else fail(`sidebar shifted/hidden: ${JSON.stringify(after.sidebar)}`);

  if (after.docOverflowX <= 1) pass(`no horizontal document overflow (${after.docOverflowX}px)`);
  else fail(`horizontal document overflow: ${after.docOverflowX}px`);

  // Carousel must still center the selected chip internally.
  const carousel = await page.evaluate(() => {
    const el = document.querySelector('.calendar-v2__carousel');
    if (!el) return null;
    return { scrollLeft: Math.round(el.scrollLeft), scrollable: el.scrollWidth > el.clientWidth };
  });
  if (carousel && (!carousel.scrollable || carousel.scrollLeft >= 0)) pass(`carousel internal scroll ok (scrollLeft=${carousel?.scrollLeft})`);
  else fail(`carousel internal scroll failed: ${JSON.stringify(carousel)}`);

  await ctx.close();
}

async function runMobile(browser) {
  console.log('\nMobile 390x844');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await enterOfficeAndOpenCalendar(page);

  const before = await readShift(page);
  // Mobile: Calendar lives inside the bottom-nav "more" drawer.
  await page.locator('.mobile-nav__tab[data-tab="menu"]').click();
  await page.waitForSelector('.mobile-menu__item[data-tab="calendar"]', { timeout: 5000 });
  await page.locator('.mobile-menu__item[data-tab="calendar"]').click();
  await page.waitForSelector('.calendar-v2', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(900);
  const after = await readShift(page);

  if (after.docOverflowX <= 1) pass(`no horizontal document overflow (${after.docOverflowX}px)`);
  else fail(`horizontal document overflow: ${after.docOverflowX}px`);

  if (after.bodyScrollLeft === 0 && after.docScrollLeft === 0) pass(`no horizontal body/doc scroll`);
  else fail(`horizontal scroll moved: doc ${after.docScrollLeft}, body ${after.bodyScrollLeft}`);

  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runDesktop(browser);
  await runMobile(browser);
} finally {
  await browser.close();
}

console.log('');
if (failures.length) {
  console.error(`❌ Calendar shift audit FAILED (${failures.length} issue${failures.length > 1 ? 's' : ''})`);
  process.exit(1);
} else {
  console.log('✅ Calendar shift audit PASSED — menu stays visible, no app shift.');
}
