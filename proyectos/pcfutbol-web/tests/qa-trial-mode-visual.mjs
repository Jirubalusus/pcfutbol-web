import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:5176';
const outDir = process.env.QA_OUT_DIR || path.join(process.cwd(), 'artifacts', 'qa-trial-mode-20260603');
fs.mkdirSync(outDir, { recursive: true });

const cases = [
  { lang: 'en', name: 'desktop', viewport: { width: 1365, height: 900 } },
  { lang: 'en', name: 'mobile', viewport: { width: 393, height: 852 }, isMobile: true },
  { lang: 'es', name: 'desktop', viewport: { width: 1365, height: 900 } },
  { lang: 'es', name: 'mobile', viewport: { width: 393, height: 852 }, isMobile: true },
];

const englishForbidden = [
  'BASE DE DATOS ACTIVA',
  'Base actual del juego',
  'Cambia el año/base de datos',
  'Planificacion de pretemporada',
  'Planificación de pretemporada',
  'Elige una gira',
  'Saltar pretemporada',
  'OVR rivales',
  'dificultad',
  'Casa\n',
  'Fuera\n',
  'Tour de Rodaje',
  'Gira de Prestigio',
  'Preparacion premium',
  'Preparación premium',
  'Maxima taquilla',
  'Máxima taquilla',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function clickButtonContaining(page, patterns, label) {
  const found = await page.locator('button').evaluateAll((buttons, rawPatterns) => {
    const regexes = rawPatterns.map((p) => new RegExp(p, 'i'));
    const button = buttons.find((b) => regexes.some((re) => re.test(b.innerText || b.textContent || '')) && !b.disabled);
    if (!button) return false;
    button.scrollIntoView({ block: 'center', inline: 'center' });
    button.click();
    return true;
  }, patterns);
  assert(found, `Could not click ${label}`);
}

async function checkNoEnglishSpanishLeak(page, stage) {
  const text = await page.locator('body').innerText();
  const leaks = englishForbidden.filter((term) => text.includes(term));
  assert(leaks.length === 0, `English ${stage} still contains Spanish copy: ${leaks.join(', ')}`);
}

async function checkTrialBannerTopPlacement(page, tag) {
  const placement = await page.evaluate(() => {
    const banner = document.querySelector('.trial-banner');
    const bannerRect = banner?.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const selectors = [
      '.mobile-nav',
      '.mobile-nav__actions',
      '.mobile-nav__tabs',
      '.office__advance-btn',
      '.office__sim-btn',
    ];
    const controls = selectors.flatMap((selector) => (
      Array.from(document.querySelectorAll(selector)).map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = style.display !== 'none'
          && style.visibility !== 'hidden'
          && style.opacity !== '0'
          && rect.width > 0
          && rect.height > 0;
        return {
          selector,
          visible,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      })
    ));

    const trialBannerRules = Array.from(document.styleSheets).flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules || []);
      } catch {
        return [];
      }
    }).filter((rule) => rule.selectorText?.split(',').some((selector) => selector.trim() === '.trial-banner'));

    if (!banner || !bannerRect) {
      return { viewport, banner: null, controls, bottomDeclarations: [], computedTop: null, computedBottom: null, computedPosition: null, hero: null, overlapsHero: false };
    }

    const bannerBox = {
      top: bannerRect.top,
      right: bannerRect.right,
      bottom: bannerRect.bottom,
      left: bannerRect.left,
      width: bannerRect.width,
      height: bannerRect.height,
    };
    const bottomControls = controls.filter((control) => control.visible && control.top > viewport.height * 0.45);
    const overlaps = bottomControls.filter((control) => !(
      bannerBox.right <= control.left
      || bannerBox.left >= control.right
      || bannerBox.bottom <= control.top
      || bannerBox.top >= control.bottom
    ));
    const hero = document.querySelector('.office__hero');
    const heroRect = hero?.getBoundingClientRect();
    const heroBox = heroRect ? {
      top: heroRect.top,
      right: heroRect.right,
      bottom: heroRect.bottom,
      left: heroRect.left,
      width: heroRect.width,
      height: heroRect.height,
    } : null;
    const overlapsHero = !!heroBox && !(
      bannerBox.right <= heroBox.left
      || bannerBox.left >= heroBox.right
      || bannerBox.bottom <= heroBox.top
      || bannerBox.top >= heroBox.bottom
    );
    const style = window.getComputedStyle(banner);

    return {
      viewport,
      banner: bannerBox,
      hero: heroBox,
      bottomControls,
      overlaps,
      overlapsHero,
      bottomDeclarations: trialBannerRules
        .map((rule) => rule.style?.bottom)
        .filter(Boolean),
      computedTop: style.top,
      computedBottom: style.bottom,
      computedPosition: style.position,
    };
  });

  assert(placement.banner, `${tag}: trial banner not rendered for placement check`);
  assert(placement.bottomDeclarations.length === 0, `${tag}: trial banner CSS must not declare bottom positioning (${placement.bottomDeclarations.join(', ')})`);
  assert(placement.computedBottom === 'auto', `${tag}: trial banner must not use computed bottom positioning (${placement.computedBottom})`);
  assert(placement.computedPosition !== 'fixed', `${tag}: trial banner must be in document flow, not fixed`);
  assert(!placement.overlapsHero, `${tag}: trial banner overlaps office hero/welcome card`);
  assert(placement.banner.top <= placement.viewport.height * 0.35, `${tag}: trial banner is not near the top (${placement.banner.top}px)`);
  assert(placement.banner.bottom < placement.viewport.height * 0.35, `${tag}: trial banner is too low (${placement.banner.bottom}px of ${placement.viewport.height}px)`);
  assert(placement.overlaps.length === 0, `${tag}: trial banner overlaps bottom controls: ${placement.overlaps.map((item) => item.selector).join(', ')}`);
  for (const control of placement.bottomControls) {
    assert(placement.banner.bottom + 4 < control.top, `${tag}: trial banner is too close to bottom control ${control.selector}`);
  }
}

async function runCase(browser, cfg) {
  const context = await browser.newContext({
    viewport: cfg.viewport,
    isMobile: !!cfg.isMobile,
    deviceScaleFactor: cfg.isMobile ? 2 : 1,
    serviceWorkers: 'block',
  });
  await context.addInitScript((lang) => {
    localStorage.clear();
    localStorage.setItem('language', lang);
  }, cfg.lang);

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));

  const tag = `${cfg.lang}-${cfg.name}`;
  await page.goto(`${baseUrl}/?v=production-hardening-20260603&qa=trial-mode-${tag}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button', { timeout: 20000 });
  await page.waitForTimeout(750);

  const mainText = await page.locator('body').innerText();
  if (cfg.lang === 'en') {
    assert(/Play now/i.test(mainText), 'English main menu missing Play now');
    assert(/Try a Career without logging in/i.test(mainText), 'English main menu missing trial subtitle');
    assert(/Log in \/ Create account/i.test(mainText), 'English main menu missing secondary auth CTA');
    await checkNoEnglishSpanishLeak(page, 'main menu');
  } else {
    assert(/Jugar ahora/i.test(mainText), 'Spanish main menu missing Jugar ahora');
    assert(/Prueba una Carrera sin iniciar sesión/i.test(mainText), 'Spanish main menu missing trial subtitle');
  }
  await page.screenshot({ path: path.join(outDir, `${tag}-01-main.png`), fullPage: true });

  await clickButtonContaining(page, cfg.lang === 'en' ? ['Play now'] : ['Jugar ahora'], 'Play now');
  await page.waitForFunction(() => /TEAM SELECTION|SELECCIÓN DE EQUIPO|Selección de equipo/i.test(document.body.innerText), null, { timeout: 30000 });
  if (cfg.lang === 'en') await checkNoEnglishSpanishLeak(page, 'team selection step 1');
  await page.screenshot({ path: path.join(outDir, `${tag}-02-team-selection.png`), fullPage: true });

  await clickButtonContaining(page, ['Spain', 'España'], 'Spain country');
  await page.waitForFunction(() => /LaLiga Hypermotion/i.test(document.body.innerText), null, { timeout: 20000 });
  await clickButtonContaining(page, ['LaLiga Hypermotion'], 'LaLiga Hypermotion');
  await page.waitForFunction(() => /RC Deportivo de La Coruña/i.test(document.body.innerText), null, { timeout: 20000 });
  await clickButtonContaining(page, ['RC Deportivo de La Coruña'], 'RC Deportivo');
  await clickButtonContaining(page, cfg.lang === 'en' ? ['START WITH RC DEPORTIVO'] : ['EMPEZAR CON RC DEPORTIVO'], 'start with selected team');
  await page.waitForSelector('.preseason-modal-overlay', { timeout: 20000 });
  await page.waitForTimeout(500);
  if (cfg.lang === 'en') await checkNoEnglishSpanishLeak(page, 'preseason modal');
  await page.screenshot({ path: path.join(outDir, `${tag}-03-preseason.png`), fullPage: true });

  await page.locator('.btn-skip').click();
  await page.waitForFunction(() => document.querySelector('.office') || /Office|Despacho/i.test(document.body.innerText), null, { timeout: 45000 });
  await page.waitForSelector('.trial-banner', { timeout: 20000 });
  if (cfg.lang === 'en') {
    const officeText = await page.locator('body').innerText();
    assert(/Trial mode: this game is not saved in the cloud/i.test(officeText), 'English office missing trial banner copy');
    await checkNoEnglishSpanishLeak(page, 'office');
  } else {
    const officeText = await page.locator('body').innerText();
    assert(/Modo prueba: esta partida no está guardada en la nube/i.test(officeText), 'Spanish office missing trial banner copy');
  }
  const metrics = await page.evaluate(() => ({
    bodyOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bannerVisible: !!document.querySelector('.trial-banner'),
    authHookExposed: !!window.__pcfAuth,
    user: window.firebase?.auth?.currentUser || null,
  }));
  assert(metrics.bodyOverflowX <= 1, `${tag}: horizontal overflow ${metrics.bodyOverflowX}px`);
  assert(metrics.bannerVisible, `${tag}: trial banner not visible`);
  await checkTrialBannerTopPlacement(page, tag);
  await page.screenshot({ path: path.join(outDir, `${tag}-04-office-banner.png`), fullPage: true });

  await page.locator('.trial-banner__cta').click();
  await page.waitForFunction(() => /save this game|guardar esta partida|Inicia sesión|Log in/i.test(document.body.innerText), null, { timeout: 20000 });
  await page.waitForSelector('.auth__card', { timeout: 20000 });
  await page.waitForFunction(() => {
    const card = document.querySelector('.auth__card');
    if (!card) return false;
    const style = getComputedStyle(card);
    const rect = card.getBoundingClientRect();
    return style.opacity === '1' && rect.width > 300 && rect.height > 300;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.locator('.auth__card').scrollIntoViewIfNeeded();
  const authText = await page.locator('body').innerText();
  if (cfg.lang === 'en') {
    assert(/Log in to save this game/i.test(authText), 'English auth missing save-progress intent title');
    await checkNoEnglishSpanishLeak(page, 'auth intent');
  } else {
    assert(/Inicia sesión para guardar esta partida/i.test(authText), 'Spanish auth missing save-progress intent title');
  }
  await page.screenshot({ path: path.join(outDir, `${tag}-05-auth-intent.png`), fullPage: true });

  const actionableConsoleErrors = consoleErrors.filter((msg) => !/favicon|manifest/i.test(msg));
  assert(pageErrors.length === 0, `${tag}: page errors: ${pageErrors.join('\n')}`);
  assert(actionableConsoleErrors.length === 0, `${tag}: console errors: ${actionableConsoleErrors.join('\n')}`);

  await context.close();
  return { tag, screenshots: 5, consoleErrors: actionableConsoleErrors.length, pageErrors: pageErrors.length };
}

const browser = await chromium.launch({ headless: true });
try {
  const results = [];
  for (const cfg of cases) results.push(await runCase(browser, cfg));
  console.log(JSON.stringify({ ok: true, outDir, results }, null, 2));
} finally {
  await browser.close();
}
