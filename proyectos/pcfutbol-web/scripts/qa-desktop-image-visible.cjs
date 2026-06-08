const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve('artifacts/qa-desktop-image-visible-local-20260604');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { name: 'desktop-1365x768', width: 1365, height: 768, isMobile: false },
    { name: 'desktop-1440x900', width: 1440, height: 900, isMobile: false },
    { name: 'mobile-390x844', width: 390, height: 844, isMobile: true },
  ];
  const results = [];
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile });
    const errors = [];
    page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) errors.push(`${msg.type()}: ${msg.text()}`); });
    page.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    await page.goto('http://127.0.0.1:5178/?qa=desktop-image-visible-local-20260604c', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.mode-card-full', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(5000);
    const metrics = await page.evaluate(() => {
      const active = Array.from(document.querySelectorAll('.mode-card-full')).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
      const body = active?.querySelector('.mode-card-full__body');
      const media = active?.querySelector('.mode-card-full__media img');
      const card = active?.getBoundingClientRect();
      const b = body?.getBoundingClientRect();
      const cs = body ? getComputedStyle(body) : null;
      const cardCs = active ? getComputedStyle(active) : null;
      return {
        title: document.title,
        viewport: { w: innerWidth, h: innerHeight },
        docScrollWidth: document.documentElement.scrollWidth,
        activeCard: card ? { x: Math.round(card.x), y: Math.round(card.y), w: Math.round(card.width), h: Math.round(card.height) } : null,
        bodyPanel: b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null,
        imageSrc: media?.src || null,
        bodyCoversPctOfCardWidth: card && b ? Math.round((b.width / card.width) * 100) : null,
        computed: cs && cardCs ? {
          bodyWidth: cs.width,
          bodyAlignSelf: cs.alignSelf,
          bodyPosition: cs.position,
          cardWidth: cardCs.width,
          cardFlexBasis: cardCs.flexBasis,
          cardTransform: cardCs.transform,
          cardClass: active.className,
          stylesheets: Array.from(document.styleSheets).map(sheet => sheet.href || 'inline').slice(0, 12),
        } : null,
      };
    });
    const file = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    results.push({ viewport: vp.name, file, metrics, errors });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
