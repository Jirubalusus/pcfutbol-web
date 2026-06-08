import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
const out = new URL('../dogfood-output/mobile-viewport/', import.meta.url);
await fs.mkdir(new URL('screenshots/', out), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForFunction(() => window.__pcfGame?.state?.loaded, null, { timeout: 60000 });
for (const screen of ['main_menu','team_selection','contrarreloj_setup','promanager_setup','glory_setup','ranking']) {
  await page.evaluate(s => window.__pcfGame.dispatch({ type:'SET_SCREEN', payload:s }), screen);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: new URL(`screenshots/${screen}.png`, out).pathname, fullPage: false });
}
console.log(out.pathname);
await browser.close();
