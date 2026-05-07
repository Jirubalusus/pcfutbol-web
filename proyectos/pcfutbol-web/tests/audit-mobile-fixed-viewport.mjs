import { chromium, devices } from 'playwright';

const BASE_URL = process.env.QA_URL || 'http://127.0.0.1:5176/?qa=mobile-fixed-viewport';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 393, height: 852 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

function assert(condition, message, details = {}) {
  if (!condition) {
    const err = new Error(message);
    err.details = details;
    throw err;
  }
}

async function measure(selector) {
  return page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: r.top,
      bottom: r.bottom,
      height: r.height,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop,
      position: cs.position,
      overflowY: cs.overflowY,
      transform: cs.transform,
      filter: cs.filter,
      animationName: cs.animationName,
    };
  }, selector);
}

async function boot() {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!window.__pcfGame, null, { timeout: 10000 });
}

try {
  await boot();

  // Main menu must be a rigid viewport shell with no bottom strip/scroll.
  await page.waitForSelector('.main-menu', { timeout: 10000 });
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(100);
  const menuMetrics = await page.evaluate(() => ({
    innerHeight,
    bodyScrollTop: document.body.scrollTop,
    docScrollTop: document.documentElement.scrollTop,
    bodySH: document.body.scrollHeight,
    bodyCH: document.body.clientHeight,
    docSH: document.documentElement.scrollHeight,
    docCH: document.documentElement.clientHeight,
  }));
  const menu = await measure('.main-menu');
  assert(Math.abs(menu.top) < 1 && Math.abs(menu.bottom - menuMetrics.innerHeight) < 1, 'Main menu does not cover the mobile viewport', { menu, menuMetrics });
  assert(menu.overflowY === 'hidden', 'Main menu mobile overflow must be hidden', { menu });
  assert(menuMetrics.bodySH <= menuMetrics.bodyCH + 1 && menuMetrics.docSH <= menuMetrics.docCH + 1, 'Main menu creates document scroll', { menuMetrics });

  // Internal office screens use body scroll, but fixed bottom controls must remain pinned to the viewport.
  await page.evaluate(async () => {
    window.__pcfGame.dispatch({ type: 'SET_SCREEN', payload: 'office' });
    await new Promise(r => setTimeout(r, 250));
  });
  await page.waitForSelector('.office .mobile-nav', { timeout: 10000 });
  const squadTab = page.locator('.mobile-nav__tab').filter({ hasText: /Squad|Plantilla/i }).first();
  if (await squadTab.count()) await squadTab.click();
  await page.waitForTimeout(250);

  const navBefore = await measure('.mobile-nav');
  const appBefore = await measure('.app-screen-transition');
  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight;
    document.documentElement.scrollTop = document.documentElement.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(150);
  const navAfter = await measure('.mobile-nav');
  const appAfter = await measure('.app-screen-transition');
  const officeMetrics = await page.evaluate(() => ({
    innerHeight,
    bodyScrollTop: document.body.scrollTop,
    bodySH: document.body.scrollHeight,
    bodyCH: document.body.clientHeight,
  }));

  assert(appAfter.transform === 'none' && appAfter.filter === 'none', 'Mobile screen wrapper must not create a fixed-position containing block', { appBefore, appAfter });
  assert(Math.abs(navBefore.bottom - officeMetrics.innerHeight) < 1, 'Mobile nav not initially pinned to viewport bottom', { navBefore, officeMetrics });
  assert(Math.abs(navAfter.bottom - officeMetrics.innerHeight) < 1, 'Mobile nav moved while scrolling; this creates the blank lower zone', { navAfter, officeMetrics });
  assert(Math.abs(navAfter.top - navBefore.top) < 1, 'Mobile nav top changed while body scrolled', { navBefore, navAfter, officeMetrics });

  console.log(JSON.stringify({
    ok: true,
    mainMenu: { bodyScrollHeight: menuMetrics.bodySH, viewport: menuMetrics.innerHeight, menuOverflowY: menu.overflowY },
    office: { bodyScrollTop: officeMetrics.bodyScrollTop, navBottom: navAfter.bottom, viewport: officeMetrics.innerHeight, screenAnimation: appAfter.animationName },
  }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ ok: false, message: err.message, details: err.details || null }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
