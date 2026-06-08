import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:5173';
const out = new URL('../dogfood-output/mobile-direct/', import.meta.url);
await fs.mkdir(new URL('screenshots/', out), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'], locale: 'es-ES', timezoneId: 'Europe/Madrid' });
const page = await context.newPage();
const consoleMessages = [];
page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', err => consoleMessages.push({ type: 'pageerror', text: err.message }));
const issues = [];
const flow = [];
const sleep = ms => page.waitForTimeout(ms);

async function waitApp() { await page.waitForFunction(() => window.__pcfGame && window.__pcfGame.state.loaded, null, { timeout: 60000 }); }
async function setScreen(screen) { await page.evaluate(s => window.__pcfGame.dispatch({ type:'SET_SCREEN', payload:s }), screen); await sleep(2000); }
async function capture(name) {
  await sleep(600);
  const path = new URL(`screenshots/${name}.png`, out).pathname;
  await page.screenshot({ path, fullPage: true });
  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const all = [...document.querySelectorAll('body *')];
    return {
      screen: window.__pcfGame?.state?.currentScreen,
      url: location.href,
      text: document.body.innerText.slice(0, 3000),
      width: innerWidth,
      height: innerHeight,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 1,
      offscreen: all.map(el => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width < 1 || r.height < 1 || cs.display === 'none' || cs.visibility === 'hidden') return null;
        if (r.left < -2 || r.right > innerWidth + 2) return { tag:el.tagName, cls:String(el.className).slice(0,100), text:el.textContent.trim().slice(0,70), left:Math.round(r.left), right:Math.round(r.right), w:Math.round(r.width) };
        return null;
      }).filter(Boolean).slice(0,40),
      smallTargets: [...document.querySelectorAll('button,a,[role="button"],input,select')].map(el => {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width < 40 || r.height < 40)) return { tag:el.tagName, cls:String(el.className).slice(0,80), text:el.textContent.trim().slice(0,70), w:Math.round(r.width), h:Math.round(r.height) };
        return null;
      }).filter(Boolean).slice(0,40)
    };
  });
  flow.push({ name, path, ...data });
  if (data.overflowX) issues.push({ severity:'High', category:'Visual', title:`Overflow horizontal en ${name}`, evidence:path, details:data.offscreen });
  return data;
}
async function clickFirst(selectors, label) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    const n = await loc.count().catch(()=>0);
    if (n) { try { await loc.click({ timeout: 7000 }); await sleep(1800); return true; } catch(e) { issues.push({ severity:'Medium', category:'Functional', title:`Click falló ${label}`, selector, error:e.message }); } }
  }
  issues.push({ severity:'Medium', category:'Functional', title:`No se encontró ${label}`, selectors });
  return false;
}
async function clickText(regex, label) {
  const loc = page.locator('button:visible,a:visible,[role="button"]:visible').filter({ hasText: regex }).first();
  if (await loc.count().catch(()=>0)) { try { await loc.click({ timeout:7000 }); await sleep(1600); return true; } catch(e) { issues.push({ severity:'Medium', category:'Functional', title:`Click texto falló ${label}`, error:e.message }); } }
  issues.push({ severity:'Low', category:'Functional', title:`No se encontró acción ${label}` });
  return false;
}

await page.goto(baseURL, { waitUntil:'domcontentloaded', timeout:45000 });
await waitApp();
await capture('01-main-menu-logged-out');

// Auth modal flow
await clickText(/Iniciar Sesión/i, 'abrir login');
await capture('02-auth-login');
await clickText(/No tengo|Crear|cuenta/i, 'registro');
await capture('03-auth-register');
await capture('04-auth-register-stable');

// Settings from logged out menu
await page.reload({ waitUntil:'domcontentloaded', timeout:45000 }).catch(()=>{}); await waitApp();
await clickFirst(['button[title*="Opc"]', '.main-menu__btn--icon'], 'ajustes');
await capture('05-settings');

// Direct game flows: real mobile team selection path (country → division → team → office)
await setScreen('team_selection');
await capture('06-team-selection');
await clickFirst(['.map-selection__country-card', 'button:has-text("Spain")', 'button:has-text("España")'], 'primer país en selección');
await capture('07-team-selection-country');
await clickFirst(['.map-selection__division-card', 'button:has-text("LaLiga")', 'button:has-text("League")'], 'primera liga en selección');
await capture('08-team-selection-division');
await clickFirst(['.team-row', 'button:has-text("Nova")', 'button:has-text("FC")'], 'primer equipo en selección');
await capture('09-team-selection-team-details');
await clickFirst(['.btn-start', 'button:has-text("START WITH")', 'button:has-text("EMPEZAR")', 'button:has-text("INICIAR")'], 'empezar con equipo');
await capture('10-office-or-preseason');
await clickFirst(['.preseason-actions .btn-skip', 'button:has-text("Saltar pretemporada")', 'button:has-text("Skip")'], 'saltar pretemporada');
await page.waitForFunction(() => window.__pcfGame?.state?.currentScreen === 'office' && !/CARGANDO OFICINA/i.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
await capture('11-office');

for (const [idx, re] of [/INICIO/i, /PLANTILLA/i, /COMPET/i, /MÍS|MIS/i].entries()) {
  await clickText(re, `office ${re}`);
  await capture(`12-office-tab-${idx+1}`);
}

await setScreen('contrarreloj_setup');
await capture('20-contrarreloj-setup');
await setScreen('promanager_setup');
await capture('21-promanager-setup');
await setScreen('glory_setup');
await capture('22-glory-setup');
await setScreen('ranking');
await capture('23-ranking');

for (const f of flow) {
  if (f.smallTargets.length) issues.push({ severity:'Low', category:'Accessibility', title:`Targets táctiles pequeños en ${f.name}`, evidence:f.path, details:f.smallTargets });
  if (/undefined|NaN|\[object Object\]/.test(f.text)) issues.push({ severity:'Medium', category:'Content', title:`Texto técnico visible en ${f.name}`, evidence:f.path, excerpt:f.text.match(/.{0,80}(undefined|NaN|\[object Object\]).{0,80}/)?.[0] });
}
const errors = consoleMessages.filter(m => ['error','pageerror'].includes(m.type) && !/favicon|manifest|Failed to load resource/i.test(m.text));
if (errors.length) issues.push({ severity:'High', category:'Console', title:'Errores JS durante E2E móvil', details: errors.slice(0,50) });
const report = { generatedAt:new Date().toISOString(), baseURL, flow, consoleMessages, issues };
await fs.writeFile(new URL('audit.json', out), JSON.stringify(report, null, 2));
await fs.writeFile(new URL('report.md', out), `# Mobile Direct E2E audit\n\nPantallas: ${flow.length}\nIssues: ${issues.length}\n\n` + issues.map((x,i)=>`## ${i+1}. ${x.title}\n- Severidad: ${x.severity}\n- Categoría: ${x.category}\n- Evidencia: ${x.evidence || ''}\n\n\`\`\`json\n${JSON.stringify(x.details || x.error || x.excerpt || x.selectors || '', null, 2)}\n\`\`\`\n`).join('\n'));
console.log(JSON.stringify({flow:flow.map(f=>({name:f.name,screen:f.screen,overflowX:f.overflowX,small:f.smallTargets.length,text:f.text.slice(0,80)})), issues:issues.length, errors:errors.length, out:out.pathname}, null, 2));
await browser.close();
