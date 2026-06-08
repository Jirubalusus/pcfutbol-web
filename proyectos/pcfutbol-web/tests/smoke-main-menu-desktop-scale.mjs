// Smoke: capture the unauthenticated main menu at desktop + laptop + mobile
// sizes and assert mobile has no horizontal overflow. Run against `vite preview`.
//   BASE_URL=http://127.0.0.1:4173 node tests/smoke-main-menu-desktop-scale.mjs
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outDir = new URL('../dogfood-output/smoke-main-menu-desktop-scale/', import.meta.url);
await fs.mkdir(outDir, { recursive: true });

const viewports = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080 },
  { name: 'laptop-1365x768', width: 1365, height: 768 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto(`${baseURL}/?v=smoke-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.main-menu__content', { timeout: 30000 });
    await page.waitForTimeout(800); // let entrance animation settle

    const metrics = await page.evaluate(() => {
      const content = document.querySelector('.main-menu__content');
      const wheel = document.querySelector('.main-menu__season-wheel');
      const hero = document.querySelector('.mode-card-full--hero');
      // The primary unauthenticated CTA = the login/create-account button.
      const login = document.querySelector('.main-menu__btn--login-secondary');
      const loginRect = login ? login.getBoundingClientRect() : null;
      return {
        docScrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        scrollH: Math.round(document.querySelector('.main-menu').scrollHeight),
        contentW: content ? Math.round(content.getBoundingClientRect().width) : null,
        wheelW: wheel ? Math.round(wheel.getBoundingClientRect().width) : null,
        heroCardW: hero ? Math.round(hero.getBoundingClientRect().width) : null,
        heroCardVisible: hero ? hero.getBoundingClientRect().width > 0 : false,
        loginBottom: loginRect ? Math.round(loginRect.bottom) : null,
        loginAboveFold: loginRect ? loginRect.bottom <= window.innerHeight : null,
      };
    });

    await page.screenshot({ path: new URL(`${vp.name}.png`, outDir).pathname, fullPage: false });
    results.push({ ...vp, ...metrics });

    if (vp.name.startsWith('mobile')) {
      assert.ok(metrics.docScrollW <= metrics.innerW + 1,
        `Mobile horizontal overflow: scrollWidth ${metrics.docScrollW} > innerWidth ${metrics.innerW}`);
    }
    assert.ok(metrics.heroCardVisible, `${vp.name}: featured card not visible`);
    await context.close();
  }

  await fs.writeFile(new URL('report.json', outDir), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, out: outDir.pathname, results }, null, 2));
} finally {
  await browser.close();
}
