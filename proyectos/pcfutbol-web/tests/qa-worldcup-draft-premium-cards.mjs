import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.QA_URL || 'http://127.0.0.1:4202/?qa=worldcup-draft-premium-cards';
const outDir = path.resolve(process.env.QA_OUT_DIR || 'tmp/qa-worldcup-draft-premium-cards');
fs.mkdirSync(outDir, { recursive: true });

async function openPicker(page) {
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
  // The setup must load its database (Firestore or bundled fallback) without
  // leaving the red "No se pudo cargar la base del draft" banner up and the
  // start button disabled — that was the preprod regression this guards against.
  const setup = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((b) => /EMPEZAR DRAFT/i.test(b.innerText || ''));
    return {
      hasError: Boolean(document.querySelector('.worldcup-draft__error'))
        || /No se pudo cargar la base del draft/i.test(document.body.innerText || ''),
      startDisabled: !button || button.disabled,
    };
  });
  if (setup.hasError) throw new Error('setup muestra el error "No se pudo cargar la base del draft"');
  if (setup.startDisabled) throw new Error('el botón EMPEZAR DRAFT sigue deshabilitado tras cargar');
  await page.getByRole('button', { name: /EMPEZAR DRAFT/i }).click();
  await page.waitForSelector('[data-draft-slot]', { timeout: 25000 });
  await page.evaluate(() => document.querySelector('[data-draft-slot="ST"]')?.click() || document.querySelector('[data-draft-slot]')?.click());
  await page.waitForSelector('[data-draft-card-picker][data-replacement-mode="false"]', { timeout: 25000 });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const consoleMessages = [];
const pageErrors = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) consoleMessages.push(`${msg.type()}: ${msg.text()}`);
});
page.on('pageerror', (err) => pageErrors.push(err.message));

await openPicker(page);
consoleMessages.length = 0;
pageErrors.length = 0;
await page.screenshot({ path: path.join(outDir, 'mobile-rest.png'), fullPage: false });

const before = await page.locator('[data-draft-featured-card] .worldcup-draft__feature-name').first().innerText();
const activeDotBefore = await page.locator('.worldcup-draft__picker-dot.is-on').count();
const box = await page.locator('[data-draft-featured-card]').first().boundingBox();
if (!box) throw new Error('No se encontró la carta premium');

await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.42, { steps: 10 });
await page.screenshot({ path: path.join(outDir, 'mobile-drag.png'), fullPage: false });
await page.mouse.up();
await page.waitForTimeout(450);

const after = await page.locator('[data-draft-featured-card] .worldcup-draft__feature-name').first().innerText();
await page.screenshot({ path: path.join(outDir, 'mobile-after-swipe.png'), fullPage: false });

const metrics = await page.evaluate(() => {
  const card = document.querySelector('[data-draft-featured-card]');
  const dot = document.querySelector('.worldcup-draft__picker-dot.is-on');
  const styles = card ? getComputedStyle(card) : null;
  const flagLayer = document.querySelector('.worldcup-draft__feature-flag-css');
  const flagStyles = flagLayer ? getComputedStyle(flagLayer) : null;
  const flagScrim = flagLayer ? getComputedStyle(flagLayer, '::after') : null;
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasPicker: Boolean(document.querySelector('[data-draft-card-picker]')),
    hasPremiumCard: Boolean(card),
    hasFlagCss: Boolean(flagLayer) && (flagStyles.backgroundImage !== 'none' || flagStyles.backgroundColor !== 'rgba(0, 0, 0, 0)'),
    // The flag is muted (general opacity < 1) and carries a bottom-to-top
    // gradient overlay so the lower text stays legible.
    flagOpacity: flagLayer ? Number(flagStyles.opacity) : 1,
    hasFlagScrim: Boolean(flagScrim) && /gradient/.test(flagScrim.backgroundImage || ''),
    hasLegend: /LEYENDA/i.test(card?.innerText || ''),
    hasStyleTag: Boolean(document.querySelector('.worldcup-draft__feature-style-tag')),
    hasChemButton: /Sin nueva química|País|Estilo/i.test(document.querySelector('[data-chem-preview]')?.innerText || ''),
    hasSelect: /Elegir/i.test(document.querySelector('[data-draft-select-active]')?.innerText || ''),
    dotCount: document.querySelectorAll('.worldcup-draft__picker-dot').length,
    activeDotCount: document.querySelectorAll('.worldcup-draft__picker-dot.is-on').length,
    activeDotBg: dot ? getComputedStyle(dot).backgroundColor : '',
    transform: styles?.transform || '',
    hasBareBlackFlagGlyph: document.body.innerText.includes('🏴'),
    body: document.body.innerText.slice(0, 900),
  };
});

await browser.close();

const failed = [];
if (!metrics.hasPicker || !metrics.hasPremiumCard) failed.push('falta selector/carta premium');
if (!metrics.hasFlagCss) failed.push('falta bandera CSS en la carta');
if (!metrics.hasFlagScrim) failed.push('falta la capa de degradado inferior sobre la bandera');
if (!(metrics.flagOpacity < 1)) failed.push(`la bandera no tiene opacidad general (<1): ${metrics.flagOpacity}`);
if (!metrics.hasStyleTag || !metrics.hasChemButton || !metrics.hasSelect) failed.push('faltan tag, química o botón Elegir');
if (metrics.dotCount !== 5 || activeDotBefore !== 1 || metrics.activeDotCount !== 1) failed.push(`dots inválidos: ${metrics.dotCount}/${activeDotBefore}/${metrics.activeDotCount}`);
if (metrics.activeDotBg !== 'rgb(34, 197, 94)') failed.push(`dot activo no es #22c55e: ${metrics.activeDotBg}`);
if (before === after) failed.push(`el swipe no cambió de carta: ${before}`);
if (metrics.hasBareBlackFlagGlyph) failed.push('aparece glifo de bandera negra en el picker');
if (metrics.scrollWidth > metrics.clientWidth + 2) failed.push(`overflow horizontal ${metrics.scrollWidth}/${metrics.clientWidth}`);
if (pageErrors.length) failed.push(`page errors: ${pageErrors.join(' | ')}`);
const severeConsole = consoleMessages.filter((msg) => !msg.includes('React DevTools') && !msg.includes('authorized'));
if (severeConsole.length) failed.push(`console: ${severeConsole.join(' | ')}`);

console.log(JSON.stringify({ outDir, before, after, metrics, failed }, null, 2));
if (failed.length) process.exit(1);
