import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
const messages = [];
page.on('console', msg => { if (['error'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`); });
page.on('pageerror', err => messages.push(`pageerror: ${err.message}`));
await page.goto('https://pcgaffer-preprod.web.app/?qa=granada-live-verify-20260604', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForSelector('text=PC GAFFER', { timeout: 60000 });
await page.getByRole('button', { name: /Free Career/i }).first().click({ force: true });
await page.getByRole('button', { name: /^Spain/i }).first().click({ force: true });
await page.getByRole('button', { name: /LaLiga Hypermotion/i }).first().click({ force: true });
await page.getByRole('button', { name: /Granada CF/i }).first().click({ force: true });
await page.getByRole('button', { name: /START WITH GRANADA CF/i }).click({ force: true });
await page.getByText('Warm-up tour').first().click({ force: true });
await page.getByRole('button', { name: /Start Season/i }).click({ force: true });
await page.waitForFunction(() => document.body.innerText.includes('Welcome') || document.body.innerText.includes('Bienvenido'), null, { timeout: 20000 });
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Competitions' || b.innerText.trim() === 'Comp.');
  if (btn) ['pointerdown','mousedown','mouseup','click'].forEach(type => btn.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window})));
});
await page.waitForSelector('text=/Second Iberian|Segunda Ibérica|Segunda Iberica/', { timeout: 20000 });
const text = await page.locator('body').innerText();
await page.screenshot({ path: '/tmp/pcgaffer-live-granada-segunda.png', fullPage: true });
const result = {
  hasSecond: /Second Iberian|Segunda Ib[eé]rica/.test(text),
  hasYourLeagueSecond: /Your league\s*·\s*Second Iberian|Tu liga\s*-\s*Segunda Ib[eé]rica/.test(text),
  hasGranada: /Granada CF/.test(text),
  hasPromotion: /Direct Promotion|Ascenso directo|Promotion Playoff|Playoff de ascenso/.test(text),
  hasRelegation: /Relegation|Descenso/.test(text),
  noNoData: !/No data available|No hay datos disponibles/.test(text),
  messages,
  excerpt: text.slice(0, 1800)
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
