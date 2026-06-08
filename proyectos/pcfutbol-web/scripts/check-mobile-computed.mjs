import { chromium, devices } from 'playwright';
const browser = await chromium.launch({ headless:true });
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
await page.goto('http://127.0.0.1:5173', { waitUntil:'domcontentloaded' });
await page.waitForFunction(() => window.__pcfGame?.state?.loaded, null, { timeout: 60000 });
for (const screen of ['contrarreloj_setup','ranking','promanager_setup']) {
  await page.evaluate(s => window.__pcfGame.dispatch({ type:'SET_SCREEN', payload:s }), screen);
  await page.waitForTimeout(1000);
  const vals = await page.$$eval('button', els => els.slice(0,5).map(e => ({cls:e.className, text:e.innerText, rect:e.getBoundingClientRect().toJSON(), min:getComputedStyle(e).minHeight, pad:getComputedStyle(e).padding, css:getComputedStyle(e).cssText})));
  console.log(screen, JSON.stringify(vals, null, 2));
}
await browser.close();
