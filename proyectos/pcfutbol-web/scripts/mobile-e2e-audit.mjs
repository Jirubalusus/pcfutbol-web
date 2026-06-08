import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = new URL('../dogfood-output/mobile-e2e/', import.meta.url);
await fs.mkdir(new URL('screenshots/', out), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();
const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));

const flow = [];
const issues = [];
const sleep = ms => page.waitForTimeout(ms);
async function waitApp() {
  await page.waitForFunction(() => window.__pcfAuth && window.__pcfGame && window.__pcfGame.state.loaded, null, { timeout: 60000 });
}
async function capture(name) {
  await sleep(800);
  const path = new URL(`screenshots/${name}.png`, out).pathname;
  await page.screenshot({ path, fullPage: true });
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const visible = [...document.querySelectorAll('body *')].filter(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    return {
      url: location.href,
      screen: window.__pcfGame?.state?.currentScreen,
      gameStarted: window.__pcfGame?.state?.gameStarted,
      text: document.body.innerText.slice(0, 2500),
      width: innerWidth,
      height: innerHeight,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
      clippedFixed: visible.map(el => {
        const r = el.getBoundingClientRect();
        if (r.left < -2 || r.right > innerWidth + 2) return { tag: el.tagName, cls: String(el.className).slice(0,120), text: el.textContent.trim().slice(0,80), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) };
        return null;
      }).filter(Boolean).slice(0,25),
      smallTargets: [...document.querySelectorAll('button,a,[role="button"],input,select')].map(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width < 40 || r.height < 40)) return { tag: el.tagName, cls: String(el.className).slice(0,80), text: el.textContent.trim().slice(0,80), w: Math.round(r.width), h: Math.round(r.height) };
        return null;
      }).filter(Boolean).slice(0,25),
    };
  });
  flow.push({ name, path, ...data });
  if (data.overflowX) issues.push({ severity:'High', category:'Visual', title:`Overflow horizontal en ${name}`, evidence:path, details:data.clippedFixed });
  return data;
}
async function safeClickByText(regex, label) {
  const loc = page.locator('button,a,[role="button"]').filter({ hasText: regex }).first();
  const n = await loc.count().catch(() => 0);
  if (!n) { issues.push({ severity:'Medium', category:'Functional', title:`No encuentro acción: ${label}` }); return false; }
  try { await loc.click({ timeout: 7000 }); await sleep(1200); return true; }
  catch (e) { issues.push({ severity:'High', category:'Functional', title:`No se puede pulsar: ${label}`, error:e.message }); return false; }
}
async function safeClickSelector(selector, label) {
  const loc = page.locator(selector).first();
  const n = await loc.count().catch(()=>0);
  if (!n) { issues.push({ severity:'Medium', category:'Functional', title:`No encuentro selector: ${label} (${selector})` }); return false; }
  try { await loc.click({ timeout: 7000 }); await sleep(1200); return true; }
  catch (e) { issues.push({ severity:'High', category:'Functional', title:`No se puede pulsar selector: ${label}`, error:e.message }); return false; }
}
async function goMain() {
  await page.evaluate(() => {
    window.__pcfGame?.dispatch({ type: 'SET_SCREEN', payload: 'main_menu' });
  });
  await sleep(1000);
}

await page.goto(baseURL, { waitUntil:'domcontentloaded', timeout:45000 });
await waitApp();
await capture('01-guest-home');

await page.evaluate(() => window.__pcfAuth.loginAsGuest());
await sleep(1000);
await capture('02-auth-main-menu');

await safeClickSelector('button[title*="Opc"], button:has(svg)', 'ajustes');
await capture('03-settings-modal');
await page.keyboard.press('Escape').catch(()=>{});
await page.locator('button').filter({ hasText: /Cerrar|Volver|×|Guardar/i }).first().click().catch(()=>{});
await sleep(800);

// Edition pack flow
await goMain();
await safeClickSelector('button[title*="Edici"], button[title*="edition" i]', 'editor/edición');
await capture('04-edition-modal');

// Main career: select team -> office
await goMain();
await safeClickByText(/Carrera|Jugar|Partida|Nueva/i, 'modo carrera');
await capture('05-team-selection');
// pick first visible team/card/button that is not back/filter
await safeClickSelector('.team-card, .team-selection__team, button[class*="team"], button:has-text("Real"), button:has-text("FC")', 'primer equipo');
await capture('06-after-team-click');
await safeClickByText(/Confirmar|Seleccionar|Empezar|Comenzar|Continuar|Iniciar/i, 'confirmar equipo');
await capture('07-office');

// Probe office tabs/buttons
const officeButtons = await page.locator('button,a,[role="button"]').evaluateAll(nodes => nodes.map((n,i)=>({i, text:n.textContent.trim().replace(/\s+/g,' ').slice(0,80), title:n.getAttribute('title')||'', cls:String(n.className).slice(0,100)})).filter(x=>x.text||x.title).slice(0,60));
for (const [idx, re] of [/Plantilla|Equipo|Alineaci/i, /Calendario|Partido|Jornada/i, /Mercado|Fichajes/i, /Mensajes|Buzón/i, /Estadio|Finanzas/i].entries()) {
  await safeClickByText(re, `office tab ${re}`);
  await capture(`08-office-tab-${idx+1}`);
}

// Contrarreloj setup
await goMain();
await safeClickByText(/Contrarreloj/i, 'contrarreloj');
await capture('09-contrarreloj-setup');

// Pro manager setup
await goMain();
await safeClickByText(/Profesional|Pro Manager|Mánager/i, 'pro manager');
await capture('10-promanager-setup');

// Glory setup
await goMain();
await safeClickByText(/Gloria/i, 'glory');
await capture('11-glory-setup');

for (const f of flow) {
  if (f.smallTargets.length) issues.push({ severity:'Low', category:'Accesibilidad', title:`Targets táctiles pequeños en ${f.name}`, evidence:f.path, details:f.smallTargets });
  if (/undefined|NaN|\[object Object\]/.test(f.text)) issues.push({ severity:'Medium', category:'Visual/Contenido', title:`Texto técnico visible en ${f.name}`, evidence:f.path, excerpt:f.text.match(/.{0,80}(undefined|NaN|\[object Object\]).{0,80}/)?.[0] });
}
const errors = consoleMessages.filter(m => ['error','pageerror'].includes(m.type) && !/favicon|manifest/i.test(m.text));
if (errors.length) issues.push({ severity:'High', category:'Console', title:'Errores JS durante E2E móvil', details: errors.slice(0,40) });
const report = { baseURL, generatedAt: new Date().toISOString(), flow, officeButtons, consoleMessages, issues };
await fs.writeFile(new URL('audit.json', out), JSON.stringify(report, null, 2));
await fs.writeFile(new URL('report.md', out), `# Mobile E2E audit\n\nPantallas: ${flow.length}\nIssues: ${issues.length}\n\n` + issues.map((x,i)=>`## ${i+1}. ${x.title}\n- Severidad: ${x.severity}\n- Categoría: ${x.category}\n- Evidencia: ${x.evidence || ''}\n\n\`\`\`json\n${JSON.stringify(x.details || x.error || x.excerpt || '', null, 2)}\n\`\`\`\n`).join('\n'));
console.log(JSON.stringify({flow:flow.map(f=>({name:f.name,screen:f.screen,overflowX:f.overflowX,smallTargets:f.smallTargets.length,text:f.text.slice(0,60)})), issues: issues.length, errors: errors.length, out: out.pathname}, null, 2));
await browser.close();
