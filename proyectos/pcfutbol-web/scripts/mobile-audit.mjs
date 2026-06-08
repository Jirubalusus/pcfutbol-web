import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const outDir = new URL('../dogfood-output/mobile-audit/', import.meta.url);
await fs.mkdir(new URL('screenshots/', outDir), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 13'],
  locale: 'es-ES',
  timezoneId: 'Europe/Madrid',
});
const page = await context.newPage();
const issues = [];
const consoleMessages = [];
page.on('console', msg => {
  const text = msg.text();
  consoleMessages.push({ type: msg.type(), text });
});
page.on('pageerror', err => {
  consoleMessages.push({ type: 'pageerror', text: err.message });
});

async function shot(name) {
  const file = new URL(`screenshots/${name}.png`, outDir).pathname;
  await page.screenshot({ path: file, fullPage: true });
  return file;
}
async function auditPage(name, path = '/') {
  console.log(`NAV ${name} ${path}`);
  await page.goto(`${baseURL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);
  const screenshot = await shot(name);
  const title = await page.title().catch(() => '');
  const bodyText = (await page.locator('body').innerText({ timeout: 5000 }).catch(e => `ERR:${e.message}`)).slice(0, 2500);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > doc.clientWidth + 1;
    const els = [...document.querySelectorAll('body *')];
    const offscreen = els.map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || cs.display === 'none') return null;
      if (r.left < -2 || r.right > window.innerWidth + 2) return {
        tag: el.tagName, cls: el.className?.toString().slice(0,120), text: el.textContent?.trim().slice(0,80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width)
      };
      return null;
    }).filter(Boolean).slice(0,20);
    const tinyButtons = [...document.querySelectorAll('button,a,[role="button"],input,select')].map(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40)) return { tag: el.tagName, cls: el.className?.toString().slice(0,100), text: el.textContent?.trim().slice(0,80), w: Math.round(r.width), h: Math.round(r.height) };
      return null;
    }).filter(Boolean).slice(0,20);
    return { url: location.href, width: window.innerWidth, height: window.innerHeight, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowX, offscreen, tinyButtons };
  });
  return { name, path, title, bodyText, screenshot, metrics };
}

const pages = [];
pages.push(await auditPage('home', '/'));

// Exercise visible nav/actions roughly end-to-end.
const links = await page.locator('a,button,[role="button"]').evaluateAll(nodes => nodes.map((n,i)=>({i, text:n.textContent.trim().replace(/\s+/g,' ').slice(0,80), href:n.href || '', aria:n.getAttribute('aria-label') || '', cls:n.className?.toString().slice(0,80)})).filter(x=>x.text||x.aria||x.href).slice(0,80));
console.log('ACTIONS', JSON.stringify(links, null, 2));

// Try common user-flow buttons/links by text.
const candidates = [/jugar/i,/nueva/i,/continuar/i,/manager/i,/equipo/i,/editor/i,/edici/i,/pack/i,/ajustes/i,/config/i,/login/i,/entrar/i,/comenzar/i];
let actionIndex = 0;
for (const re of candidates) {
  const loc = page.locator('button, a, [role="button"]').filter({ hasText: re }).first();
  if (await loc.count().catch(()=>0)) {
    try {
      console.log('CLICK', re.toString());
      await loc.click({ timeout: 5000 });
      await page.waitForTimeout(1800);
      pages.push(await auditPage(`after-click-${++actionIndex}`, new URL(page.url()).pathname + new URL(page.url()).search));
    } catch (e) {
      issues.push({ severity:'Medium', category:'Functional', title:`No se pudo pulsar ${re}`, error:e.message });
    }
  }
}

// Discover internal routes from anchors and audit top-level ones.
const internal = [...new Set(await page.locator('a[href]').evaluateAll(as => as.map(a => new URL(a.href).pathname).filter(p => p.startsWith('/') && p !== '/')))].slice(0, 12);
for (const p of internal) {
  try { pages.push(await auditPage(`route-${p.replaceAll('/','_') || 'root'}`, p)); } catch(e) { issues.push({ severity:'High', category:'Functional', title:`Ruta ${p} falla`, error:e.message }); }
}

for (const p of pages) {
  if (p.metrics.overflowX) issues.push({ severity:'High', category:'Visual', title:`Overflow horizontal en móvil: ${p.name}`, page:p.metrics.url, evidence:p.screenshot, details:p.metrics });
  if (p.metrics.tinyButtons.length) issues.push({ severity:'Low', category:'UX/Accessibility', title:`Targets táctiles pequeños: ${p.name}`, page:p.metrics.url, evidence:p.screenshot, details:p.metrics.tinyButtons });
  if (/ERR:|error|undefined|null/i.test(p.bodyText.slice(0,500))) issues.push({ severity:'Medium', category:'Visual/Functional', title:`Texto sospechoso/error visible: ${p.name}`, page:p.metrics.url, evidence:p.screenshot, excerpt:p.bodyText.slice(0,500) });
}
const severeConsole = consoleMessages.filter(m => ['error','pageerror'].includes(m.type) && !/favicon/i.test(m.text));
if (severeConsole.length) issues.push({ severity:'High', category:'Console', title:'Errores JS en flujo móvil', details: severeConsole.slice(0,30) });

const report = { baseURL, generatedAt: new Date().toISOString(), pages, links, consoleMessages, issues };
await fs.writeFile(new URL('audit.json', outDir), JSON.stringify(report, null, 2));
await fs.writeFile(new URL('report.md', outDir), `# Mobile audit\n\nIssues: ${issues.length}\n\n` + issues.map((x,i)=>`## ${i+1}. ${x.title}\n- Severity: ${x.severity}\n- Category: ${x.category}\n- Page: ${x.page || ''}\n- Evidence: ${x.evidence || ''}\n\n\`\`\`json\n${JSON.stringify(x.details || x.error || x.excerpt || '', null, 2)}\n\`\`\`\n`).join('\n'));
console.log(JSON.stringify({pages: pages.length, issues: issues.length, severeConsole: severeConsole.length, outDir: outDir.pathname}, null, 2));
await browser.close();
